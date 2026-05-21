import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CreativeBriefSchema,
  PersonaDirectiveSchema,
  PlotDirectiveSchema,
  RetentionRuleSchema,
  StyleDirectiveSchema,
} from "./creative-brief";

test("PersonaDirectiveSchema accepts a modify directive", () => {
  const ok = PersonaDirectiveSchema.safeParse({
    id: "p1",
    character_name: "李雷",
    change_type: "modify",
    fields: { gender: "女", motivation: "复仇 → 求和" },
  });
  assert.equal(ok.success, true);
});

test("PersonaDirectiveSchema rejects unknown change_type", () => {
  const bad = PersonaDirectiveSchema.safeParse({
    id: "p1",
    character_name: "李雷",
    change_type: "rebirth",
    fields: {},
  });
  assert.equal(bad.success, false);
});

test("PlotDirectiveSchema accepts insert_after with new_beat", () => {
  const ok = PlotDirectiveSchema.safeParse({
    id: "pl1",
    target_beat_id: "beat-3",
    action: "insert_after",
    new_beat: { title: "突如其来的访客", order: 4 },
  });
  assert.equal(ok.success, true);
});

test("StyleDirectiveSchema applies defaults", () => {
  const parsed = StyleDirectiveSchema.safeParse({});
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.tone, "keep");
    assert.equal(parsed.data.extra_instructions, "");
  }
});

test("StyleDirectiveSchema caps extra_instructions at 800", () => {
  const bad = StyleDirectiveSchema.safeParse({ extra_instructions: "x".repeat(801) });
  assert.equal(bad.success, false);
});

test("RetentionRuleSchema accepts empty target_ids meaning whole section", () => {
  const ok = RetentionRuleSchema.safeParse({
    id: "r1",
    section: "characters",
    target_ids: [],
    strictness: "must_keep",
  });
  assert.equal(ok.success, true);
});

test("CreativeBriefSchema applies array defaults", () => {
  const parsed = CreativeBriefSchema.safeParse({ title: "测试" });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.deepEqual(parsed.data.persona_directives, []);
    assert.deepEqual(parsed.data.plot_directives, []);
    assert.deepEqual(parsed.data.retention_rules, []);
    assert.equal(parsed.data.style_directives.tone, "keep");
  }
});

test("CreativeBriefSchema rejects empty title", () => {
  const bad = CreativeBriefSchema.safeParse({ title: "" });
  assert.equal(bad.success, false);
});
