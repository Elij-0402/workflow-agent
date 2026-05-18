import test from "node:test";
import assert from "node:assert/strict";

import {
  LLMConfigFormSchema,
  selectLegacyPresetForMigration,
} from "./llm-config.ts";

test("accepts a single persisted llm config form", () => {
  const result = LLMConfigFormSchema.parse({
    provider: "openai",
    base_url: "https://api.openai.com/v1",
    api_key: "sk-example",
    model: "gpt-4o-mini",
    temperature: 0.7,
    max_tokens: 4096,
  });

  assert.equal(result.provider, "openai");
  assert.equal(result.model, "gpt-4o-mini");
});

test("prefers the default legacy preset during migration", () => {
  const chosen = selectLegacyPresetForMigration([
    {
      id: "older",
      is_default: false,
      created_at: "2024-01-02T00:00:00.000Z",
    },
    {
      id: "default",
      is_default: true,
      created_at: "2024-01-03T00:00:00.000Z",
    },
  ]);

  assert.equal(chosen?.id, "default");
});

test("falls back to the oldest legacy preset when no default exists", () => {
  const chosen = selectLegacyPresetForMigration([
    {
      id: "newer",
      is_default: false,
      created_at: "2024-01-03T00:00:00.000Z",
    },
    {
      id: "older",
      is_default: false,
      created_at: "2024-01-02T00:00:00.000Z",
    },
  ]);

  assert.equal(chosen?.id, "older");
});
