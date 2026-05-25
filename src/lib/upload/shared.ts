export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export const ALLOWED_FILE_EXTENSIONS = [".txt"];

export const ALLOWED_MIME_TYPES = [
  "text/plain",
  "text/markdown",
  "application/octet-stream",
  "",
];

export type UploadFileMeta = {
  name: string;
  size: number;
  type: string;
};

export function sanitizeFilename(filename: string) {
  return filename
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeStorageFilename(filename: string) {
  const normalized = sanitizeFilename(filename).normalize("NFKD");
  const match = normalized.match(/(\.[^.]+)$/);
  const extension = match?.[1]?.toLowerCase() ?? "";
  const stem = extension ? normalized.slice(0, -extension.length) : normalized;
  const asciiStem = stem
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_\-.]+|[_\-.]+$/g, "");

  return `${asciiStem || "novel"}${extension}`;
}

export function getSessionName(filename: string) {
  return filename.replace(/\.[^.]+$/, "").trim() || "未命名小说";
}

export function isAllowedUploadFile({
  name,
  type,
}: Pick<UploadFileMeta, "name" | "type">) {
  const lower = name.toLowerCase();
  return (
    ALLOWED_FILE_EXTENSIONS.some((ext) => lower.endsWith(ext)) &&
    ALLOWED_MIME_TYPES.includes(type)
  );
}

export function validateUploadFile(file: UploadFileMeta) {
  if (!file.name.trim()) {
    return "请选择要上传的小说文件。";
  }

  if (!isAllowedUploadFile(file)) {
    return "当前仅支持上传 .txt 文本文件。";
  }

  if (file.size === 0) {
    return "文件内容为空，请重新选择。";
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return "文件不能超过 50MB。";
  }

  return null;
}

export function buildStorageObjectPath(
  userId: string,
  sessionId: string,
  filename: string,
) {
  return `${userId}/${sessionId}/${sanitizeStorageFilename(filename)}`;
}
