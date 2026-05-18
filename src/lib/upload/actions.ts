"use server";

import { createClient } from "@/lib/supabase/server";
import { cleanNovelText } from "@/lib/text/clean";
import { decodeNovelBuffer } from "@/lib/text/decode";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_FILE_EXTENSIONS = [".txt"];
const ALLOWED_MIME_TYPES = [
  "text/plain",
  "text/markdown",
  "application/octet-stream",
  "",
];

function sanitizeFilename(filename: string) {
  return filename
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
}

function getSessionName(filename: string) {
  return filename.replace(/\.[^.]+$/, "").trim() || "未命名小说";
}

function isAllowedFile(file: File) {
  const lower = file.name.toLowerCase();
  return (
    ALLOWED_FILE_EXTENSIONS.some((ext) => lower.endsWith(ext)) &&
    ALLOWED_MIME_TYPES.includes(file.type)
  );
}

export async function uploadNovel(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "请先登录。" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "请选择要上传的小说文件。" };
  }

  if (!isAllowedFile(file)) {
    return { error: "当前仅支持上传 .txt 文本文件。" };
  }

  if (file.size === 0) {
    return { error: "文件内容为空，请重新选择。" };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "文件不能超过 50MB。" };
  }

  const safeFilename = sanitizeFilename(file.name);
  const sessionName = getSessionName(safeFilename);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const decoded = decodeNovelBuffer(bytes);
  const cleaned = cleanNovelText(decoded.text);

  if (!cleaned.cleaned) {
    return { error: "文件解析后为空，请检查文本内容。" };
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      name: sessionName,
      status: "uploaded",
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return { error: "创建分析会话失败，请稍后再试。" };
  }

  const storageObjectPath = `${user.id}/${session.id}/${safeFilename}`;

  const { error: bookError } = await supabase.from("books").insert({
    session_id: session.id,
    user_id: user.id,
    title: sessionName,
    storage_path: `novels/${storageObjectPath}`,
    word_count: cleaned.wordCount,
    chapter_count: cleaned.chapters.length,
    metadata: {
      encoding: decoded.encoding,
      chapters: cleaned.chapters,
    },
    cleaned_content: cleaned.cleaned,
  });

  if (bookError) {
    await supabase.from("sessions").delete().eq("id", session.id);
    return { error: "保存书籍内容失败，请稍后再试。" };
  }

  const { error: uploadError } = await supabase.storage
    .from("novels")
    .upload(storageObjectPath, bytes, {
      contentType: file.type || "text/plain",
      upsert: false,
    });

  if (uploadError) {
    await supabase.from("sessions").delete().eq("id", session.id);
    return { error: "上传原始文件失败，请稍后再试。" };
  }

  return {
    ok: true as const,
    message: "小说已上传。",
    redirectTo: `/sessions/${session.id}`,
  };
}
