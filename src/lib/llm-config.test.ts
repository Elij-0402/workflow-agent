import test from "node:test";
import assert from "node:assert/strict";

import {
  LLMConfigFormSchema,
  deriveProvider,
  LLM_INCOMPATIBLE_BASE_URL_MESSAGE,
  normalizeModelsPayload,
  selectLegacyPresetForMigration,
  validateCompatibleBaseUrl,
} from "./llm-config.ts";

test("accepts a single persisted llm config form", () => {
  const result = LLMConfigFormSchema.parse({
    base_url: "https://api.openai.com/v1",
    api_key: "sk-example",
    model: "gpt-4o-mini",
    temperature: 0.7,
    max_tokens: 4096,
  });

  assert.equal(result.base_url, "https://api.openai.com/v1");
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

test("deriveProvider maps known hostnames", () => {
  assert.equal(deriveProvider("https://api.openai.com/v1"), "openai");
  assert.equal(deriveProvider("https://api.deepseek.com"), "deepseek");
});

test("deriveProvider falls back to custom for unknown hosts and bad input", () => {
  assert.equal(deriveProvider("https://my-proxy.example.com/v1"), "custom");
  assert.equal(deriveProvider("not a url"), "custom");
});

test("deriveProvider rejects subdomain spoofing", () => {
  assert.equal(deriveProvider("https://api.openai.com.evil.tld"), "custom");
  assert.equal(deriveProvider("https://evil.api.openai.com"), "custom");
});

test("validateCompatibleBaseUrl rejects Anthropic native endpoints", () => {
  const result = validateCompatibleBaseUrl("https://api.anthropic.com");

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.message, LLM_INCOMPATIBLE_BASE_URL_MESSAGE);
  }
});

test("validateCompatibleBaseUrl keeps custom OpenAI-compatible gateways", () => {
  const result = validateCompatibleBaseUrl("https://my-proxy.example.com/v1");

  assert.deepEqual(result, {
    ok: true,
    provider: "custom",
  });
});

test("normalizeModelsPayload handles the OpenAI shape with sort and dedupe", () => {
  const result = normalizeModelsPayload({
    data: [{ id: "b" }, { id: "a" }, { id: "a" }, { id: "c" }],
  });
  assert.deepEqual(result, ["a", "b", "c"]);
});

test("normalizeModelsPayload handles a bare array of strings", () => {
  assert.deepEqual(normalizeModelsPayload(["y", "x"]), ["x", "y"]);
});

test("normalizeModelsPayload handles the { models: [...] } shape", () => {
  assert.deepEqual(normalizeModelsPayload({ models: ["m"] }), ["m"]);
});

test("normalizeModelsPayload returns empty array for garbage input", () => {
  assert.deepEqual(normalizeModelsPayload(null), []);
  assert.deepEqual(normalizeModelsPayload({ foo: "bar" }), []);
  assert.deepEqual(normalizeModelsPayload({ data: "not an array" }), []);
  assert.deepEqual(normalizeModelsPayload({ data: [{ name: "no id" }] }), []);
});

test("normalizeModelsPayload caps the list at 100 entries", () => {
  const big = Array.from({ length: 200 }, (_, i) => ({
    id: `model-${String(i).padStart(3, "0")}`,
  }));
  const result = normalizeModelsPayload({ data: big });
  assert.equal(result.length, 100);
});
