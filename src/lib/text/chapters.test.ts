import { test } from "node:test";
import assert from "node:assert/strict";

import { detectChapters, expandToChapters } from "./chapters";

test("detectChapters: 序章/楔子/番外 are recognized", () => {
  const text = [
    "楔子",
    "白雪覆盖荒原。",
    "",
    "第一章 风起",
    "马蹄如雷。",
    "",
    "番外：旧友",
    "他记得那座山。",
  ].join("\n");

  const chapters = detectChapters(text);
  const titles = chapters.map((c) => c.title);
  assert.deepEqual(titles, ["楔子", "第一章 风起", "番外：旧友"]);
});

test("detectChapters: 第X节/折/部/篇 variants", () => {
  const text = ["第一节 开端", "...", "第二折 中段", "...", "第三部 终章", "..."].join("\n");

  const chapters = detectChapters(text);
  assert.equal(chapters.length, 3);
});

test("detectChapters: 正文 N variant", () => {
  const text = ["正文 1", "...", "正文 2", "..."].join("\n");
  const chapters = detectChapters(text);
  assert.equal(chapters.length, 2);
});

test("detectChapters: numeric-only weak signal accepted when ≥3 in a row with blank surroundings", () => {
  const text = ["001 启程", "...", "", "002 风雪", "...", "", "003 抵达", "..."].join("\n");
  const chapters = detectChapters(text);
  assert.equal(chapters.length, 3);
  assert.equal(chapters[0].title, "001 启程");
});

test("detectChapters: numeric-only weak signal rejected when only 2 occurrences", () => {
  const text = [
    "正文开篇。",
    "",
    "1 行将就木的老人开口。",
    "他抬头。",
    "",
    "999 是个不存在的章节号但被怀疑触发。",
    "再来一段。",
  ].join("\n");
  const chapters = detectChapters(text);
  assert.equal(chapters.length, 0);
});

test("expandToChapters: falls back to length chunks when no chapters detected", () => {
  const text = "甲".repeat(13000);
  const chunks = expandToChapters(text, { fallbackChunkChars: 5000 });
  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].source, "length-chunk");
  assert.equal(chunks[0].title, "块 #1");
  assert.equal(chunks[0].startChar, 0);
  assert.equal(chunks[0].endChar, 5000);
  assert.equal(chunks[2].endChar, 13000);
});

test("expandToChapters: uses regex result when chapters detected", () => {
  const text = ["第一章 起", "甲".repeat(100), "第二章 承", "甲".repeat(100)].join("\n");
  const chunks = expandToChapters(text, { fallbackChunkChars: 5000 });
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].source, "regex");
});

test("expandToChapters: never empty — single block fallback when text is 1 line", () => {
  const text = "短文一句话。";
  const chunks = expandToChapters(text, { fallbackChunkChars: 5000 });
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].title, "块 #1");
  assert.equal(chunks[0].source, "length-chunk");
});

test("expandToChapters: empty input still yields one block", () => {
  const chunks = expandToChapters("", { fallbackChunkChars: 5000 });
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].source, "length-chunk");
  assert.equal(chunks[0].endChar, 0);
});
