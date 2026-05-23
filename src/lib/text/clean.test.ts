import test from "node:test";
import assert from "node:assert/strict";
import iconv from "iconv-lite";

import { decodeNovelBuffer } from "./decode.ts";
import { cleanNovelText } from "./clean.ts";

test("decodes utf-8 text", () => {
  const input = new TextEncoder().encode("第一章 开端\n这里是内容");
  const result = decodeNovelBuffer(input);

  assert.equal(result.encoding, "utf-8");
  assert.equal(result.text, "第一章 开端\n这里是内容");
});

test("decodes gb18030 text when utf-8 has too many replacements", () => {
  const input = iconv.encode("第一章 风起\n江湖夜雨", "gb18030");
  const result = decodeNovelBuffer(input);

  assert.equal(result.encoding, "gb18030");
  assert.match(result.text, /江湖夜雨/);
});

test("cleans empty text safely", () => {
  const result = cleanNovelText("");

  assert.equal(result.cleaned, "");
  assert.equal(result.wordCount, 0);
  assert.deepEqual(result.chapters, []);
});

test("splits chinese and english chapter headings", () => {
  const result = cleanNovelText(`
第一章 风起
正文一段

第二章 夜行
正文二段

Chapter 3 Finale
ending
`);

  assert.equal(result.chapters.length, 3);
  assert.equal(result.chapters[0]?.title, "第一章 风起");
  assert.equal(result.chapters[1]?.title, "第二章 夜行");
  assert.equal(result.chapters[2]?.title, "Chapter 3 Finale");
  assert.ok(result.chapters[0]!.endChar <= result.chapters[1]!.startChar);
});

test("handles large text without damaging content", () => {
  const largeText = `${"第一章 起".repeat(2)}\n${"江湖".repeat(50000)}`;
  const result = cleanNovelText(largeText);

  assert.ok(result.cleaned.length > 100000);
  assert.ok(result.wordCount > 50000);
});
