import { test } from "node:test";
import assert from "node:assert/strict";

import { NOVEL_DELIMITER_BEGIN } from "./safety";
import {
  buildChapterBriefUserPrompt,
  CHAPTER_BRIEF_SYSTEM_PROMPT,
  CHAPTER_TEXT_CHAR_LIMIT,
} from "./chapter-brief";

test("CHAPTER_TEXT_CHAR_LIMIT is 12000", () => {
  assert.equal(CHAPTER_TEXT_CHAR_LIMIT, 12_000);
});

test("buildChapterBriefUserPrompt wraps untrusted text and includes chapter title", () => {
  const prompt = buildChapterBriefUserPrompt({
    chapterTitle: "第一章 起",
    chapterText: "甲乙丙丁。",
  });
  assert.ok(prompt.includes("第一章 起"));
  assert.ok(prompt.includes("甲乙丙丁。"));
  assert.ok(prompt.includes(NOVEL_DELIMITER_BEGIN));
});

test("buildChapterBriefUserPrompt truncates beyond CHAPTER_TEXT_CHAR_LIMIT", () => {
  const long = "字".repeat(15_000);
  const prompt = buildChapterBriefUserPrompt({
    chapterTitle: "X",
    chapterText: long,
  });
  // truncated body + ~200 chars of wrapper/header
  assert.ok(prompt.length < CHAPTER_TEXT_CHAR_LIMIT + 500);
  assert.ok(!prompt.includes("字".repeat(CHAPTER_TEXT_CHAR_LIMIT + 1)));
});

test("system prompt mentions JSON schema return", () => {
  assert.ok(/JSON/i.test(CHAPTER_BRIEF_SYSTEM_PROMPT));
});
