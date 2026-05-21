import { test } from "node:test";
import assert from "node:assert/strict";

import { BlueprintSchema, blueprintReadyToConfirm, emptyBlueprint } from "./schema";

test("emptyBlueprint passes BlueprintSchema", () => {
  const parsed = BlueprintSchema.safeParse(emptyBlueprint());
  assert.equal(parsed.success, true);
});

test("BlueprintSchema rejects unknown viewpoint shape", () => {
  const bad = { ...emptyBlueprint(), viewpoint: { wrong: "x" } };
  assert.equal(BlueprintSchema.safeParse(bad).success, false);
});

test("blueprintReadyToConfirm returns false when any array section is empty", () => {
  const result = blueprintReadyToConfirm(emptyBlueprint());
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.missing.includes("characters"));
    assert.ok(result.missing.includes("viewpoint.mode"));
  }
});

test("blueprintReadyToConfirm returns true when minimal valid", () => {
  const bp = emptyBlueprint();
  bp.characters.push({
    id: "1",
    name: "A",
    role: "protagonist",
    traits: [],
    description: "x",
    notes: "",
    sources: [],
  });
  bp.relationships.push({
    id: "1",
    from: "A",
    to: "B",
    type: "ally",
    description: "x",
    notes: "",
    sources: [],
  });
  bp.world_rules.push({ id: "1", rule: "r", description: "x", notes: "", sources: [] });
  bp.conflicts.push({ id: "1", title: "c", description: "x", notes: "", sources: [] });
  bp.plot_beats.push({
    id: "1",
    title: "p",
    description: "x",
    order: 1,
    notes: "",
    sources: [],
  });
  bp.themes.push({ id: "1", theme: "love", notes: "", sources: [] });
  bp.viewpoint = { mode: "third-limited", pacing: "even", notes: "" };
  const result = blueprintReadyToConfirm(bp);
  assert.equal(result.ok, true);
});
