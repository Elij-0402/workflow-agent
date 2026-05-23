import test from "node:test";
import assert from "node:assert/strict";

import {
  buildStorageObjectPath,
  getSessionName,
  sanitizeFilename,
  validateUploadFile,
} from "./shared";

test("sanitizeFilename removes illegal path characters", () => {
  assert.equal(sanitizeFilename('  a:/b*?"<>|.txt  '), "a__b______.txt");
});

test("getSessionName strips file extension", () => {
  assert.equal(getSessionName("novel.txt"), "novel");
  assert.equal(getSessionName(".txt"), "未命名小说");
});

test("validateUploadFile rejects invalid files", () => {
  assert.equal(
    validateUploadFile({ name: "novel.pdf", size: 100, type: "application/pdf" }),
    "当前仅支持上传 .txt 文本文件。"
  );
  assert.equal(
    validateUploadFile({ name: "novel.txt", size: 0, type: "text/plain" }),
    "文件内容为空，请重新选择。"
  );
});

test("buildStorageObjectPath uses sanitized filename", () => {
  assert.equal(
    buildStorageObjectPath("user-1", "session-1", 'my:novel?.txt'),
    "user-1/session-1/my_novel_.txt"
  );
});
