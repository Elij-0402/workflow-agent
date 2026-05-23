import test from "node:test";
import assert from "node:assert/strict";

import { toBlueprintSaveResult } from "./save-result";

test("toBlueprintSaveResult returns id and updated_at for blueprint responses", () => {
  assert.deepEqual(
    toBlueprintSaveResult({ id: "bp-1", updated_at: "2026-05-23T12:00:00.000Z" }),
    {
      ok: true,
      id: "bp-1",
      updated_at: "2026-05-23T12:00:00.000Z",
    },
  );
});

test("toBlueprintSaveResult rejects incomplete upsert results", () => {
  assert.throws(() => toBlueprintSaveResult({ id: null, updated_at: "x" }));
  assert.throws(() => toBlueprintSaveResult({ id: "bp-1", updated_at: null }));
});
