"use server";

import { createClient } from "@/lib/supabase/server";
import { getBookIngestMetadata } from "@/lib/books/content";

import {
  buildStorageObjectPath,
  getSessionName,
  sanitizeFilename,
  validateUploadFile,
} from "./shared";
import { processUploadedNovel } from "./process";

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

function isValidDualPosition(position: unknown): position is 0 | 1 {
  return position === 0 || position === 1;
}

function logIngestFailure(context: {
  sessionId: string;
  storageObjectPath: string;
  report: unknown;
}) {
  console.error("[upload.ingest.failure]", context);
}

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
    const requestedPosition = input.position ?? 1;
    if (!isValidDualPosition(requestedPosition)) {
      return { error: "当前任务最多支持 2 本参考小说。" };
    }

    const { data: existingSession, error: existingErr } = await supabase
      .from("sessions")
      .select("id, mode")
      .eq("id", input.sessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingErr || !existingSession || existingSession.mode !== "dual") {
      return { error: "未找到目标双书任务。" };
    }

    const { data: occupiedBooks } = await supabase
      .from("books")
      .select("id, position")
      .eq("session_id", input.sessionId);

    if ((occupiedBooks?.length ?? 0) >= 2) {
      return { error: "当前任务最多支持 2 本参考小说。" };
    }

    if (occupiedBooks?.some((book) => book.position === requestedPosition)) {
      return { error: "该参考书位置已有文件，请删除后再上传。" };
    }

    return {
      ok: true as const,
      sessionId: input.sessionId,
      storageObjectPath: buildStorageObjectPath(
        user.id,
        input.sessionId,
        safeFilename,
      ),
      position: requestedPosition,
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
  if (session.mode === "dual" && !isValidDualPosition(position)) {
    return { error: "当前任务最多支持 2 本参考小说。" };
  }
  const sessionName = getSessionName(safeFilename);

  // In dual mode the books table can hold both slots; find the row at this position.
  const { data: existingBook, error: existingBookError } = await supabase
    .from("books")
    .select("id, metadata")
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
    session.mode === "single" &&
    getBookIngestMetadata(existingBook.metadata).ingest_status !==
      "failed_needs_attention"
  ) {
    return {
      ok: true as const,
      message: "小说已上传。",
      redirectTo: `/sessions/${session.id}`,
    };
  }

  const bookInsertPayload = {
    session_id: session.id,
    user_id: user.id,
    title: sessionName,
    storage_path: `novels/${input.storageObjectPath}`,
    position,
    word_count: null,
    chapter_count: null,
    metadata: {
      ingest_status: "processing",
      ingest_report: {
        status: "processing",
        stage: "raw_uploaded",
        updated_at: new Date().toISOString(),
      },
    },
    cleaned_content: null,
  };

  const bookUpdatePayload = {
    title: sessionName,
    word_count: null,
    chapter_count: null,
    metadata: {
      ingest_status: "processing",
      ingest_report: {
        status: "processing",
        stage: "raw_uploaded",
        updated_at: new Date().toISOString(),
      },
    },
    cleaned_content: null,
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

  const processResult = await processUploadedNovel({
    supabase,
    userId: user.id,
    sessionId: session.id,
    storageObjectPath: input.storageObjectPath,
    safeFilename,
  });

  if (!processResult.ok) {
    const { error: failedBookUpdateError } = await supabase
      .from("books")
      .update({
        metadata: processResult.metadata,
        cleaned_content: null,
        word_count: null,
        chapter_count: null,
      })
      .eq("id", bookId)
      .eq("user_id", user.id);

    if (failedBookUpdateError) {
      return { error: "原始文件已导入，但写入导入体检失败。请稍后重试。" };
    }

    logIngestFailure({
      sessionId: session.id,
      storageObjectPath: input.storageObjectPath,
      report: processResult.report,
    });

    return {
      ok: true as const,
      message: processResult.userMessage,
      warnings: [processResult.userMessage],
      redirectTo: `/sessions/${session.id}`,
    };
  }

  const { error: processedBookUpdateError } = await supabase
    .from("books")
    .update({
      title: sessionName,
      word_count: processResult.wordCount,
      chapter_count: processResult.chapterCount,
      metadata: processResult.metadata,
      cleaned_content:
        processResult.cleanedContentMode === "inline"
          ? processResult.cleanedContent
          : null,
    })
    .eq("id", bookId)
    .eq("user_id", user.id);

  if (processedBookUpdateError) {
    return { error: "原始文件已导入，但写入书籍内容失败。请稍后重试。" };
  }

  await supabase
    .from("chapters")
    .delete()
    .eq("book_id", bookId)
    .eq("user_id", user.id);

  const { error: chaptersInsertError } = await supabase.from("chapters").insert(
    processResult.chapters.map((chapter) => ({
      book_id: bookId,
      user_id: user.id,
      index: chapter.index,
      title: chapter.title,
      start_char: chapter.startChar,
      end_char: chapter.endChar,
      source: chapter.source,
    })),
  );

  if (chaptersInsertError) {
    const chapterWarningReport = {
      ...processResult.report,
      status: "ready_with_warnings" as const,
      stage: "write_chapters" as const,
      errors: [
        {
          stage: "write_chapters" as const,
          code: chaptersInsertError.code ?? "chapter-insert-failed",
          message: "章节切分写入失败。",
          retryable: true,
          details: chaptersInsertError.message,
        },
      ],
      issues: [
        ...(processResult.report.issues ?? []),
        {
          code: "chapter-write-warning",
          message: "章节写入失败，当前会回退为运行时从原文读取。",
          severity: "warning" as const,
        },
      ],
      updated_at: new Date().toISOString(),
    };

    await supabase
      .from("books")
      .update({
        metadata: {
          ...processResult.metadata,
          ingest_status: "ready_with_warnings",
          ingest_report: chapterWarningReport,
          issues: chapterWarningReport.issues,
        },
      })
      .eq("id", bookId)
      .eq("user_id", user.id);

    logIngestFailure({
      sessionId: session.id,
      storageObjectPath: input.storageObjectPath,
      report: chapterWarningReport,
    });

    return {
      ok: true as const,
      message:
        "原始文件已导入，但章节写入未完成。你可以先查看项目体检，再决定是否重试。",
      warnings: ["章节写入未完成，项目已保留原文。"],
      redirectTo: `/sessions/${session.id}`,
    };
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
  const warnings = (processResult.report.issues ?? [])
    .filter((issue) => issue.severity !== "info")
    .map((issue) => issue.message);

  return {
    ok: true as const,
    message:
      warnings.length > 0
        ? "原始文件已导入，文本处理已完成，但有少量告警可在项目页查看。"
        : "小说已上传。",
    warnings,
    redirectTo,
  };
}
