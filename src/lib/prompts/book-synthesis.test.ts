import { test } from "node:test";
import assert from "node:assert/strict";

import {
  BOOK_SYNTHESIS_BRIEFS_LIMIT,
  BOOK_SYNTHESIS_SYSTEM_PROMPT,
  buildBookSynthesisUserPrompt,
  pickBriefsForSynthesis,
  type BriefEntry,
} from "./book-synthesis";
import { NOVEL_DELIMITER_BEGIN } from "./safety";

test("BOOK_SYNTHESIS_BRIEFS_LIMIT is 200", () => {
  assert.equal(BOOK_SYNTHESIS_BRIEFS_LIMIT, 200);
});

test("pickBriefsForSynthesis: passthrough when count ≤ limit", () => {
  const briefs: BriefEntry[] = Array.from({ length: 50 }, (_, i) => ({
    index: i + 1,
    brief: { events: [] },
  }));
  const picked = pickBriefsForSynthesis(briefs);
  assert.equal(picked.length, 50);
});

test("pickBriefsForSynthesis: keeps head/tail and forces turning-point chapters", () => {
  const briefs: BriefEntry[] = Array.from({ length: 500 }, (_, i) => ({
    index: i + 1,
    brief: {
      events:
        i === 250
          ? [{ title: "x", description: "y", is_turning_point: true }]
          : [],
    },
  }));
  const picked = pickBriefsForSynthesis(briefs);
  assert.ok(picked.length <= 201, `picked.length=${picked.length} should be ≤ 201`);
  assert.ok(picked.some((p) => p.index === 1), "missing head");
  assert.ok(picked.some((p) => p.index === 500), "missing tail");
  assert.ok(picked.some((p) => p.index === 251), "missing turning point");
  // indices sorted ascending
  const indices = picked.map((p) => p.index);
  const sorted = [...indices].sort((a, b) => a - b);
  assert.deepEqual(indices, sorted);
});

test("buildBookSynthesisUserPrompt embeds briefs as JSON, no novel delimiters", () => {
  const briefs: BriefEntry[] = [{ index: 1, brief: { summary: "x", events: [] } }];
  const prompt = buildBookSynthesisUserPrompt({ bookTitle: "TestBook", briefs });
  assert.ok(prompt.includes("TestBook"));
  assert.ok(prompt.includes('"summary": "x"'));
  // book-synthesis consumes only structured briefs, not raw novel text — no untrusted wrapper.
  assert.ok(!prompt.includes(NOVEL_DELIMITER_BEGIN));
});

test("system prompt forces JSON only", () => {
  assert.ok(/JSON/.test(BOOK_SYNTHESIS_SYSTEM_PROMPT));
});
