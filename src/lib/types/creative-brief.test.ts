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
  const bad = StyleDirectiveSchema.safeParse({
    extra_instructions: "x".repeat(801),
  });
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

import { parseSafeBriefRow } from "./creative-brief";

test("parseSafeBriefRow handles valid input correctly without changes", () => {
  const input = {
    title: " 完美简报 ",
    persona_directives: [
      { id: "p1", character_name: "李雷", change_type: "modify", fields: { gender: "男" } },
    ],
    plot_directives: [],
    style_directives: { tone: "lyrical", extra_instructions: "测试" },
    retention_rules: [],
  };

  const output = parseSafeBriefRow(input);
  assert.equal(output.title, "完美简报");
  assert.equal(output.persona_directives.length, 1);
  assert.equal(output.persona_directives[0].character_name, "李雷");
  assert.equal(output.style_directives.tone, "lyrical");
  assert.equal(output.style_directives.extra_instructions, "测试");
});

test("parseSafeBriefRow handles null or non-object input elegantly", () => {
  const output = parseSafeBriefRow(null);
  assert.equal(output.title, "未命名简报");
  assert.deepEqual(output.persona_directives, []);
  assert.equal(output.style_directives.tone, "keep");
});

test("parseSafeBriefRow degrades gracefully on corrupted fields and array elements", () => {
  const input = {
    title: "", // empty title should degrade
    persona_directives: [
      { id: "p1", character_name: "" }, // invalid: character_name empty
      { id: "p2", character_name: "韩梅梅", change_type: "invalid_type" }, // invalid type degrades to modify
    ],
    plot_directives: "not-an-array", // invalid: should degrade to []
    style_directives: {
      tone: "super-humorous", // invalid tone: degrades to keep
      extra_instructions: "a".repeat(900), // exceeds 800: should be sliced
    },
    retention_rules: [
      { id: "r1", section: "invalid-section", strictness: "must_keep" }, // invalid section degrades to plot_beats
    ],
  };

  const output = parseSafeBriefRow(input);
  assert.equal(output.title, "未命名简报");
  assert.equal(output.persona_directives.length, 1);
  assert.equal(output.persona_directives[0].character_name, "韩梅梅");
  assert.equal(output.persona_directives[0].change_type, "modify");
  assert.deepEqual(output.plot_directives, []);
  assert.equal(output.style_directives.tone, "keep");
  assert.equal(output.style_directives.extra_instructions.length, 800);
  assert.equal(output.retention_rules.length, 1);
  assert.equal(output.retention_rules[0].section, "plot_beats");
});

