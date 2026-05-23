import { test } from "node:test";
import assert from "node:assert/strict";

import { CreativeBriefSchema } from "@/lib/types/creative-brief";
import { composeBriefIntoPrompt, detectBriefConflicts } from "./brief-compose";

function buildBrief(
  overrides: Partial<{
    persona: unknown[];
    plot: unknown[];
    style: unknown;
    retention: unknown[];
  }> = {},
) {
  return CreativeBriefSchema.parse({
    title: "测试简报",
    persona_directives: overrides.persona ?? [],
    plot_directives: overrides.plot ?? [],
    style_directives: overrides.style ?? {},
    retention_rules: overrides.retention ?? [],
  });
}

test("composeBriefIntoPrompt returns empty string when nothing is overridden", () => {
  const brief = buildBrief();
  assert.equal(composeBriefIntoPrompt(brief), "");
});

test("composeBriefIntoPrompt includes persona section", () => {
  const brief = buildBrief({
    persona: [
      {
        id: "p1",
        character_name: "李雷",
        change_type: "modify",
        fields: { gender: "女", motivation: "复仇 → 救赎" },
      },
    ],
  });
  const out = composeBriefIntoPrompt(brief);
  assert.ok(out.includes("【创意简报】"));
  assert.ok(out.includes("【人设改造】"));
  assert.ok(out.includes("李雷"));
  assert.ok(out.includes("gender=女"));
});

test("composeBriefIntoPrompt skips style section when all are keep", () => {
  const brief = buildBrief();
  assert.ok(!composeBriefIntoPrompt(brief).includes("【文风调整】"));
});

test("composeBriefIntoPrompt emits style section when any override exists", () => {
  const brief = buildBrief({ style: { tone: "noir" } });
  const out = composeBriefIntoPrompt(brief);
  assert.ok(out.includes("【文风调整】"));
  assert.ok(out.includes("黑色、阴郁"));
});

test("composeBriefIntoPrompt emits style section when extra_instructions is non-empty", () => {
  const brief = buildBrief({ style: { extra_instructions: "多用比喻" } });
  const out = composeBriefIntoPrompt(brief);
  assert.ok(out.includes("【文风调整】"));
  assert.ok(out.includes("多用比喻"));
});

test("detectBriefConflicts flags must_keep + delete on same plot_beat", () => {
  const brief = buildBrief({
    plot: [{ id: "pl1", target_beat_id: "beat-3", action: "delete" }],
    retention: [
      { id: "r1", section: "plot_beats", target_ids: ["beat-3"], strictness: "must_keep" },
    ],
  });
  const conflicts = detectBriefConflicts(brief);
  assert.equal(conflicts.length, 1);
  assert.ok(conflicts[0].includes("beat-3"));
});

test("detectBriefConflicts flags must_keep character + remove", () => {
  const brief = buildBrief({
    persona: [{ id: "p1", character_name: "李雷", change_type: "remove", fields: {} }],
    retention: [{ id: "r1", section: "characters", target_ids: ["李雷"], strictness: "must_keep" }],
  });
  const conflicts = detectBriefConflicts(brief);
  assert.equal(conflicts.length, 1);
  assert.ok(conflicts[0].includes("李雷"));
});

test("detectBriefConflicts returns empty when no conflict", () => {
  const brief = buildBrief({
    plot: [{ id: "pl1", target_beat_id: "beat-3", action: "replace" }],
    retention: [
      { id: "r1", section: "plot_beats", target_ids: ["beat-7"], strictness: "must_keep" },
    ],
  });
  assert.deepEqual(detectBriefConflicts(brief), []);
});
