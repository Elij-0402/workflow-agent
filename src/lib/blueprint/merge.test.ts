import { test } from "node:test";
import assert from "node:assert/strict";

import { applyCandidate, mergeSections } from "./merge";
import { emptyBlueprint } from "./schema";

const BOOK_A = "00000000-0000-0000-0000-000000000001";
const CHAPTER_X = "00000000-0000-0000-0000-000000000002";
const CHAPTER_Y = "00000000-0000-0000-0000-000000000003";

test("applyCandidate inserts into characters section with source", () => {
  const bp = emptyBlueprint();
  const next = applyCandidate(bp, {
    section: "characters",
    title: "甲",
    payload: { name: "甲", role: "protagonist", traits: [], description: "" },
    source: { book_id: BOOK_A, chapter_id: CHAPTER_X },
  });
  assert.equal(next.characters.length, 1);
  assert.equal(next.characters[0].name, "甲");
  assert.equal(next.characters[0].sources.length, 1);
  assert.equal(next.characters[0].sources[0].chapter_id, CHAPTER_X);
});

test("applyCandidate merges source when item with same identity already exists", () => {
  const bp = emptyBlueprint();
  const src1 = { book_id: BOOK_A, chapter_id: CHAPTER_X };
  const src2 = { book_id: BOOK_A, chapter_id: CHAPTER_Y };
  const once = applyCandidate(bp, {
    section: "characters",
    title: "甲",
    payload: { name: "甲", role: "protagonist", description: "" },
    source: src1,
  });
  const twice = applyCandidate(once, {
    section: "characters",
    title: "甲",
    payload: { name: "甲", role: "protagonist", description: "" },
    source: src2,
  });
  assert.equal(twice.characters.length, 1);
  assert.equal(twice.characters[0].sources.length, 2);
});

test("applyCandidate dedupes identical sources", () => {
  const bp = emptyBlueprint();
  const src = { book_id: BOOK_A, chapter_id: CHAPTER_X };
  const once = applyCandidate(bp, {
    section: "themes",
    title: "love",
    payload: { theme: "love" },
    source: src,
  });
  const twice = applyCandidate(once, {
    section: "themes",
    title: "love",
    payload: { theme: "love" },
    source: src,
  });
  assert.equal(twice.themes.length, 1);
  assert.equal(twice.themes[0].sources.length, 1);
});

test("applyCandidate to viewpoint overwrites mode/pacing partially", () => {
  const bp = emptyBlueprint();
  const next = applyCandidate(bp, {
    section: "viewpoint",
    title: "viewpoint",
    payload: { mode: "third-limited" },
    source: { book_id: BOOK_A, chapter_id: null },
  });
  assert.equal(next.viewpoint.mode, "third-limited");
  assert.equal(next.viewpoint.pacing, "");
});

test("mergeSections only overwrites listed keys", () => {
  const bp = emptyBlueprint();
  bp.themes.push({ id: "1", theme: "love", notes: "", sources: [] });
  const merged = mergeSections(bp, {
    conflicts: [{ id: "x", title: "war", description: "y", notes: "", sources: [] }],
  });
  assert.equal(merged.themes.length, 1);
  assert.equal(merged.conflicts.length, 1);
});
