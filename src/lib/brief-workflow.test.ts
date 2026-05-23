import test from "node:test";
import assert from "node:assert/strict";

import {
  validateConfirmedBlueprintForBrief,
  validateOutlineVariantForBrief,
  validatePreviousChapterVariantForBrief,
} from "./brief-workflow";

test("validateConfirmedBlueprintForBrief accepts confirmed blueprint in same session", () => {
  assert.deepEqual(
    validateConfirmedBlueprintForBrief({
      brief: { session_id: "session-1" },
      blueprint: { session_id: "session-1", status: "confirmed" },
    }),
    { ok: true },
  );
});

test("validateConfirmedBlueprintForBrief rejects mismatched or unlocked blueprint", () => {
  assert.deepEqual(
    validateConfirmedBlueprintForBrief({
      brief: { session_id: "session-1" },
      blueprint: { session_id: "session-2", status: "confirmed" },
    }),
    { ok: false, status: 409, message: "简报和蓝图不属于同一项目。" },
  );
  assert.deepEqual(
    validateConfirmedBlueprintForBrief({
      brief: { session_id: "session-1" },
      blueprint: { session_id: "session-1", status: "draft" },
    }),
    { ok: false, status: 409, message: "请先在工作台确认蓝图。" },
  );
});

test("validateOutlineVariantForBrief requires the same brief chain", () => {
  assert.deepEqual(
    validateOutlineVariantForBrief({
      brief: { id: "brief-1", session_id: "session-1" },
      outlineVariant: {
        session_id: "session-1",
        scope: "outline",
        brief_id: "brief-1",
      },
    }),
    { ok: true },
  );
  assert.deepEqual(
    validateOutlineVariantForBrief({
      brief: { id: "brief-1", session_id: "session-1" },
      outlineVariant: {
        session_id: "session-1",
        scope: "outline",
        brief_id: "brief-2",
      },
    }),
    { ok: false, status: 409, message: "大纲不属于当前简报链。" },
  );
});

test("validatePreviousChapterVariantForBrief enforces session, brief, scope, and chapter", () => {
  assert.deepEqual(
    validatePreviousChapterVariantForBrief({
      brief: { id: "brief-1", session_id: "session-1" },
      chapterIndex: 3,
      previousVariant: {
        session_id: "session-1",
        scope: "chapter",
        brief_id: "brief-1",
        chapter_index: 3,
      },
    }),
    { ok: true },
  );
  assert.deepEqual(
    validatePreviousChapterVariantForBrief({
      brief: { id: "brief-1", session_id: "session-1" },
      chapterIndex: 3,
      previousVariant: {
        session_id: "session-2",
        scope: "chapter",
        brief_id: "brief-1",
        chapter_index: 3,
      },
    }),
    { ok: false, status: 409, message: "上一版和当前简报不属于同一项目。" },
  );
  assert.deepEqual(
    validatePreviousChapterVariantForBrief({
      brief: { id: "brief-1", session_id: "session-1" },
      chapterIndex: 3,
      previousVariant: {
        session_id: "session-1",
        scope: "outline",
        brief_id: "brief-1",
        chapter_index: 3,
      },
    }),
    { ok: false, status: 409, message: "上一版必须是章节稿。" },
  );
  assert.deepEqual(
    validatePreviousChapterVariantForBrief({
      brief: { id: "brief-1", session_id: "session-1" },
      chapterIndex: 3,
      previousVariant: {
        session_id: "session-1",
        scope: "chapter",
        brief_id: "brief-2",
        chapter_index: 3,
      },
    }),
    { ok: false, status: 409, message: "上一版不属于当前简报链。" },
  );
  assert.deepEqual(
    validatePreviousChapterVariantForBrief({
      brief: { id: "brief-1", session_id: "session-1" },
      chapterIndex: 3,
      previousVariant: {
        session_id: "session-1",
        scope: "chapter",
        brief_id: "brief-1",
        chapter_index: 4,
      },
    }),
    { ok: false, status: 409, message: "上一版不属于当前章节。" },
  );
});
