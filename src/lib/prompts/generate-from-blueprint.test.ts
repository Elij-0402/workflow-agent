import { test } from "node:test";
import assert from "node:assert/strict";

import {
  GENERATE_FROM_BLUEPRINT_SYSTEM_PROMPT,
  buildGenerateFromBlueprintUserPrompt,
} from "./generate-from-blueprint";
import { NOVEL_DELIMITER_BEGIN } from "./safety";

test("system prompt forbids raw novel reference and forces JSON", () => {
  assert.ok(/无原文/.test(GENERATE_FROM_BLUEPRINT_SYSTEM_PROMPT));
  assert.ok(/JSON/i.test(GENERATE_FROM_BLUEPRINT_SYSTEM_PROMPT));
});

test("user prompt embeds blueprint json + config block, no novel excerpt wrapper", () => {
  const prompt = buildGenerateFromBlueprintUserPrompt({
    blueprint: { characters: [{ name: "甲" }] },
    config: {
      strategy: "balanced",
      innovation: 5,
      viewpoint: "keep",
      style: "keep",
      output_scope: "single-chapter",
      extra_instructions: "",
    },
  });
  assert.ok(prompt.includes('"name": "甲"'));
  assert.ok(prompt.includes("variant"));
  assert.ok(prompt.includes("生成参数"));
  // generate-from-blueprint never receives raw novel text → no untrusted wrapper
  assert.ok(!prompt.includes(NOVEL_DELIMITER_BEGIN));
});

test("extra_instructions when blank renders as 无", () => {
  const prompt = buildGenerateFromBlueprintUserPrompt({
    blueprint: {},
    config: {
      strategy: "balanced",
      innovation: 5,
      viewpoint: "keep",
      style: "keep",
      output_scope: "outline",
      extra_instructions: "",
    },
  });
  assert.ok(prompt.includes("额外要求：无"));
});

test("extra_instructions trimmed and rendered when provided", () => {
  const prompt = buildGenerateFromBlueprintUserPrompt({
    blueprint: {},
    config: {
      strategy: "a-dominant",
      innovation: 7,
      viewpoint: "first-person",
      style: "classical",
      output_scope: "three-chapters",
      extra_instructions: "  保留古风称谓  ",
    },
  });
  assert.ok(prompt.includes("额外要求：保留古风称谓"));
});
