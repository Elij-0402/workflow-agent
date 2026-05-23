import assert from "node:assert/strict";
import test from "node:test";

import { resolveStructuredObjectMode } from "./structured-output";

test("resolveStructuredObjectMode uses json mode for DeepSeek", () => {
  assert.equal(resolveStructuredObjectMode("deepseek"), "json");
});

test("resolveStructuredObjectMode keeps auto mode for non-DeepSeek providers", () => {
  assert.equal(resolveStructuredObjectMode("openai"), "auto");
  assert.equal(resolveStructuredObjectMode("custom"), "auto");
});
