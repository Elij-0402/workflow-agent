"use server";

import { createClient } from "@/lib/supabase/server";
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
};

type FinalizeNovelUploadInput = {
  sessionId: string;
  storageObjectPath: string;
  filename: string;
  size: number;
  contentType: string;
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

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      name: sessionName,
      status: "draft",
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return { error: "创建分析会话失败，请稍后再试。" };
  }

  return {
    ok: true as const,
    sessionId: session.id,
    storageObjectPath: buildStorageObjectPath(user.id, session.id, safeFilename),
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
  const expectedPath = buildStorageObjectPath(user.id, input.sessionId, safeFilename);

  if (input.storageObjectPath !== expectedPath) {
    return { error: "上传路径校验失败，请重新开始。" };
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, status")
    .eq("id", input.sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (sessionError || !session) {
    return { error: "上传会话不存在，请重新开始。" };
  }

  const sessionName = getSessionName(safeFilename);

  const { data: existingBook, error: existingBookError } = await supabase
    .from("books")
    .select("id")
    .eq("session_id", session.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingBookError) {
    return { error: "读取上传记录失败，请稍后重试。" };
  }

  if (session.status === "uploaded" && existingBook) {
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

  const bookInsertPayload = {
    session_id: session.id,
    user_id: user.id,
    title: sessionName,
    storage_path: `novels/${input.storageObjectPath}`,
    word_count: cleaned.wordCount,
    chapter_count: cleaned.chapters.length,
    metadata: {
      encoding: decoded.encoding,
      chapters: cleaned.chapters,
    },
    cleaned_content: cleaned.cleaned,
  };

  const bookUpdatePayload = {
    title: sessionName,
    word_count: cleaned.wordCount,
    chapter_count: cleaned.chapters.length,
    metadata: {
      encoding: decoded.encoding,
      chapters: cleaned.chapters,
    },
    cleaned_content: cleaned.cleaned,
  };

  if (existingBook) {
    const { error: updateBookError } = await supabase
      .from("books")
      .update(bookUpdatePayload)
      .eq("id", existingBook.id)
      .eq("user_id", user.id);

    if (updateBookError) {
      return { error: "原始文件已上传，但写入书籍内容失败。请稍后重试。" };
    }
  } else {
    const { error: insertBookError } = await supabase.from("books").insert(bookInsertPayload);

    if (insertBookError) {
      return { error: "原始文件已上传，但写入书籍内容失败。请稍后重试。" };
    }
  }

  const { error: sessionUpdateError } = await supabase
    .from("sessions")
    .update({
      name: sessionName,
      status: "uploaded",
    })
    .eq("id", session.id)
    .eq("user_id", user.id);

  if (sessionUpdateError) {
    return { error: "原始文件已上传，但更新会话状态失败。请稍后重试。" };
  }

  return {
    ok: true as const,
    message: "小说已上传。",
    redirectTo: `/sessions/${session.id}`,
  };
}
