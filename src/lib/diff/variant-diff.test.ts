import { test } from "node:test";
import assert from "node:assert/strict";

import { diffMeta, diffParagraphs, diffStructure, splitParagraphs } from "./variant-diff";

test("splitParagraphs splits on blank lines and trims", () => {
  const out = splitParagraphs("一段。\n\n二段。\n  \n三段。");
  assert.deepEqual(out, ["一段。", "二段。", "三段。"]);
});

test("splitParagraphs filters empty trailing chunks", () => {
  const out = splitParagraphs("\n\n仅一段。\n\n  \n\n");
  assert.deepEqual(out, ["仅一段。"]);
});

test("diffMeta marks per-field differences", () => {
  const d = diffMeta(
    { title: "A", wordCount: 100, chapters: 1, config: { strategy: "balanced" } },
    { title: "B", wordCount: 100, chapters: 2, config: { strategy: "a-dominant" } },
  );
  assert.equal(d.title.same, false);
  assert.equal(d.wordCount.same, true);
  assert.equal(d.chapters.same, false);
  assert.equal(d["config.strategy"].same, false);
});

test("diffStructure detects added/removed chapter titles", () => {
  const d = diffStructure(["序", "一", "二"], ["序", "一", "番外", "二"]);
  assert.deepEqual(d.added, ["番外"]);
  assert.deepEqual(d.removed, []);
  assert.deepEqual(d.common, ["序", "一", "二"]);
});

test("diffParagraphs identifies removed/added paragraphs via LCS", () => {
  const a = ["共同 1", "仅 A", "共同 2"];
  const b = ["共同 1", "仅 B", "共同 2", "尾段"];
  const d = diffParagraphs(a, b);
  assert.ok(d.aOnly.some((p) => p.paragraph === "仅 A"));
  assert.ok(d.bOnly.some((p) => p.paragraph === "仅 B"));
  assert.ok(d.bOnly.some((p) => p.paragraph === "尾段"));
  assert.equal(d.aOnly.length, 1);
  assert.equal(d.bOnly.length, 2);
});

test("diffParagraphs ignores whitespace/punctuation differences via normalize", () => {
  const a = ["他说：今天天气很好。"];
  const b = ["他说: 今天 天气 很好"];
  const d = diffParagraphs(a, b);
  assert.equal(d.aOnly.length, 0);
  assert.equal(d.bOnly.length, 0);
});
