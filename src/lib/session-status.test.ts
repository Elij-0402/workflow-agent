import test from "node:test";
import assert from "node:assert/strict";

import {
  getSessionStatusAfterAnalysis,
  getSessionStatusAfterGenerateFailure,
  getSessionStatusAfterGenerateSuccess,
  shouldEnterAnalyzingStatus,
  shouldEnterGeneratingStatus,
} from "./session-status.ts";

test("starts analyzing only from uploaded status", () => {
  assert.equal(shouldEnterAnalyzingStatus("uploaded"), true);
  assert.equal(shouldEnterAnalyzingStatus("analyzed"), false);
  assert.equal(shouldEnterAnalyzingStatus("done"), false);
});

test("marks session analyzed after all analyses complete with no variants", () => {
  assert.equal(
    getSessionStatusAfterAnalysis({
      analysisCount: 3,
      totalAnalyses: 3,
      variantCount: 0,
    }),
    "analyzed",
  );
});

test("keeps session done after re-analysis when variants already exist", () => {
  assert.equal(
    getSessionStatusAfterAnalysis({
      analysisCount: 3,
      totalAnalyses: 3,
      variantCount: 2,
    }),
    "done",
  );
});

test("keeps partial analysis sessions in analyzing state", () => {
  assert.equal(
    getSessionStatusAfterAnalysis({
      analysisCount: 2,
      totalAnalyses: 3,
      variantCount: 0,
    }),
    "analyzing",
  );
});

test("starts generating only from analyzed status", () => {
  assert.equal(shouldEnterGeneratingStatus("analyzed"), true);
  assert.equal(shouldEnterGeneratingStatus("done"), false);
});

test("maps generate success and failure rollback to the correct state", () => {
  assert.equal(getSessionStatusAfterGenerateSuccess(), "done");
  assert.equal(getSessionStatusAfterGenerateFailure(0), "analyzed");
  assert.equal(getSessionStatusAfterGenerateFailure(1), "done");
});
