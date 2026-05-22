"use server";

import { createClient } from "@/lib/supabase/server";
import { expandToChapters } from "@/lib/text/chapters";
import { cleanNovelText } from "@/lib/text/clean";
import { decodeNovelBuffer } from "@/lib/text/decode";

import {
  buildStorageObjectPath,
  getSessionName,
  sanitizeFilename,
  validateUploadFile,
} from "./shared";

type InitNovelUploadInput = {
  filename: string;
  size: number;
  contentType: string;
  mode?: "single" | "dual";
  sessionId?: string;
  position?: 0 | 1;
};

type FinalizeNovelUploadInput = {
  sessionId: string;
  storageObjectPath: string;
  filename: string;
  size: number;
  contentType: string;
  position?: 0 | 1;
};

export async function initNovelUpload(input: InitNovelUploadInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "请先登录。" };
  }

  const fileError = validateUploadFile({
    name: input.filename,
    size: input.size,
    type: input.contentType,
  });

  if (fileError) {
    return { error: fileError };
  }

  const safeFilename = sanitizeFilename(input.filename);
  const sessionName = getSessionName(safeFilename);
  const requestedMode = input.mode ?? "single";

  if (requestedMode === "dual" && input.sessionId) {
    const { data: existingSession, error: existingErr } = await supabase
      .from("sessions")
      .select("id, mode")
      .eq("id", input.sessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingErr || !existingSession || existingSession.mode !== "dual") {
      return { error: "未找到目标双书任务。" };
    }

    const position = input.position ?? 1;
    const { data: positionBusy } = await supabase
      .from("books")
      .select("id")
      .eq("session_id", input.sessionId)
      .eq("position", position)
      .maybeSingle();

    if (positionBusy) {
      return { error: "该位置已有书，请删除后再上传。" };
    }

    return {
      ok: true as const,
      sessionId: input.sessionId,
      storageObjectPath: buildStorageObjectPath(
        user.id,
        input.sessionId,
        safeFilename,
      ),
      position,
    };
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      name: sessionName,
      status: "draft",
      mode: requestedMode,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return { error: "创建分析会话失败，请稍后再试。" };
  }

  return {
    ok: true as const,
    sessionId: session.id,
    storageObjectPath: buildStorageObjectPath(
      user.id,
      session.id,
      safeFilename,
    ),
    position: 0 as const,
  };
}

export async function finalizeNovelUpload(input: FinalizeNovelUploadInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "请先登录。" };
  }

  const fileError = validateUploadFile({
    name: input.filename,
    size: input.size,
    type: input.contentType,
  });

  if (fileError) {
    return { error: fileError };
  }

  if (!input.sessionId) {
    return { error: "上传会话无效，请重新开始。" };
  }

  const safeFilename = sanitizeFilename(input.filename);
  const expectedPath = buildStorageObjectPath(
    user.id,
    input.sessionId,
    safeFilename,
  );

  if (input.storageObjectPath !== expectedPath) {
    return { error: "上传路径校验失败，请重新开始。" };
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, status, mode")
    .eq("id", input.sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (sessionError || !session) {
    return { error: "上传会话不存在，请重新开始。" };
  }

  const position = input.position ?? 0;
  const sessionName = getSessionName(safeFilename);

  // In dual mode the books table can hold both slots; find the row at this position.
  const { data: existingBook, error: existingBookError } = await supabase
    .from("books")
    .select("id")
    .eq("session_id", session.id)
    .eq("user_id", user.id)
    .eq("position", position)
    .maybeSingle();

  if (existingBookError) {
    return { error: "读取上传记录失败，请稍后重试。" };
  }

  if (
    session.status === "uploaded" &&
    existingBook &&
    session.mode === "single"
  ) {
    return {
      ok: true as const,
      message: "小说已上传。",
      redirectTo: `/sessions/${session.id}`,
    };
  }

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from("novels")
    .download(input.storageObjectPath);

  if (downloadError || !fileBlob) {
    return { error: "原始文件已上传，但读取失败。请稍后重试。" };
  }

  const bytes = new Uint8Array(await fileBlob.arrayBuffer());
  const decoded = decodeNovelBuffer(bytes);
  const cleaned = cleanNovelText(decoded.text);

  if (!cleaned.cleaned) {
    return { error: "原始文件已上传，但解析后为空。请检查文本内容后重试。" };
  }

  const chapters = expandToChapters(cleaned.cleaned, {
    fallbackChunkChars: 5000,
  });

  const bookInsertPayload = {
    session_id: session.id,
    user_id: user.id,
    title: sessionName,
    storage_path: `novels/${input.storageObjectPath}`,
    position,
    word_count: cleaned.wordCount,
    chapter_count: chapters.length,
    metadata: {
      encoding: decoded.encoding,
    },
    cleaned_content: cleaned.cleaned,
  };

  const bookUpdatePayload = {
    title: sessionName,
    word_count: cleaned.wordCount,
    chapter_count: chapters.length,
    metadata: {
      encoding: decoded.encoding,
    },
    cleaned_content: cleaned.cleaned,
  };

  let bookId: string;
  if (existingBook) {
    const { error: updateBookError } = await supabase
      .from("books")
      .update(bookUpdatePayload)
      .eq("id", existingBook.id)
      .eq("user_id", user.id);

    if (updateBookError) {
      return { error: "原始文件已上传，但写入书籍内容失败。请稍后重试。" };
    }
    bookId = existingBook.id;
  } else {
    const { data: inserted, error: insertBookError } = await supabase
      .from("books")
      .insert(bookInsertPayload)
      .select("id")
      .single();

    if (insertBookError || !inserted) {
      return { error: "原始文件已上传，但写入书籍内容失败。请稍后重试。" };
    }
    bookId = inserted.id;
  }

  // Replace any existing chapter rows (covers re-upload + dual re-parse).
  await supabase
    .from("chapters")
    .delete()
    .eq("book_id", bookId)
    .eq("user_id", user.id);

  const { error: chaptersInsertError } = await supabase.from("chapters").insert(
    chapters.map((c) => ({
      book_id: bookId,
      user_id: user.id,
      index: c.index,
      title: c.title,
      start_char: c.startChar,
      end_char: c.endChar,
      source: c.source,
    })),
  );

  if (chaptersInsertError) {
    return { error: "原始文件已上传，但章节切分写入失败。请稍后重试。" };
  }

  const sessionUpdatePayload: { status: "uploaded"; name?: string } = {
    status: "uploaded",
  };
  if (session.mode === "single") {
    sessionUpdatePayload.name = sessionName;
  }

  const { error: sessionUpdateError } = await supabase
    .from("sessions")
    .update(sessionUpdatePayload)
    .eq("id", session.id)
    .eq("user_id", user.id);

  if (sessionUpdateError) {
    return { error: "原始文件已上传，但更新会话状态失败。请稍后重试。" };
  }

  const redirectTo = `/sessions/${session.id}`;

  return {
    ok: true as const,
    message: "小说已上传。",
    redirectTo,
  };
}
