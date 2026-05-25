import { test } from "node:test";
import assert from "node:assert/strict";

import {
  EmotionArcResultSchema,
  PacingMapResultSchema,
  ProseCraftResultSchema,
  SuspenseGridResultSchema,
} from "@/lib/types";

test("ProseCraftResultSchema accepts valid shape", () => {
  const ok = ProseCraftResultSchema.safeParse({
    sentence_length: {
      short_pct: 0.3,
      medium_pct: 0.5,
      long_pct: 0.2,
      average: 18,
    },
    rhetoric_density: {
      metaphor: 5,
      parallelism: 3,
      personification: 2,
      irony: 1,
      hyperbole: 1,
    },
    sensory_mix: {
      visual: 0.5,
      auditory: 0.2,
      tactile: 0.1,
      olfactory_gustatory: 0.1,
      interoceptive: 0.1,
    },
    mode_balance: {
      dialogue_pct: 0.3,
      description_pct: 0.4,
      action_pct: 0.2,
      introspection_pct: 0.1,
    },
    signature_techniques: ["白描", "蒙太奇"],
    summary: "克制平实，偶有冷峻意象。",
  });
  assert.equal(ok.success, true);
});

test("ProseCraftResultSchema rejects out-of-range pct", () => {
  const bad = ProseCraftResultSchema.safeParse({
    sentence_length: {
      short_pct: 1.5,
      medium_pct: 0.5,
      long_pct: 0.2,
      average: 18,
    },
    rhetoric_density: {
      metaphor: 5,
      parallelism: 3,
      personification: 2,
      irony: 1,
      hyperbole: 1,
    },
    sensory_mix: {
      visual: 0.5,
      auditory: 0.2,
      tactile: 0.1,
      olfactory_gustatory: 0.1,
      interoceptive: 0.1,
    },
    mode_balance: {
      dialogue_pct: 0.3,
      description_pct: 0.4,
      action_pct: 0.2,
      introspection_pct: 0.1,
    },
    signature_techniques: [],
    summary: "x",
  });
  assert.equal(bad.success, false);
});

test("EmotionArcResultSchema accepts valid chapters and peaks", () => {
  const ok = EmotionArcResultSchema.safeParse({
    chapters: [
      { index: 0, valence: 0.2, intensity: 0.5, dominant_emotion: "希望" },
      { index: 1, valence: -0.7, intensity: 0.9, dominant_emotion: "悲" },
    ],
    peaks: [{ index: 1, kind: "low", description: "母亲去世" }],
    summary: "由扬转抑。",
  });
  assert.equal(ok.success, true);
});

test("EmotionArcResultSchema rejects valence out of range", () => {
  const bad = EmotionArcResultSchema.safeParse({
    chapters: [{ index: 0, valence: 2, intensity: 0.5, dominant_emotion: "x" }],
    peaks: [],
    summary: "x",
  });
  assert.equal(bad.success, false);
});

test("PacingMapResultSchema accepts valid tempo enum", () => {
  const ok = PacingMapResultSchema.safeParse({
    chapters: [
      {
        index: 0,
        action_pct: 0.1,
        dialogue_pct: 0.3,
        description_pct: 0.5,
        introspection_pct: 0.1,
        tempo: "slow",
      },
    ],
    tempo_shifts: [],
    summary: "前缓。",
  });
  assert.equal(ok.success, true);
});

test("PacingMapResultSchema rejects unknown tempo", () => {
  const bad = PacingMapResultSchema.safeParse({
    chapters: [
      {
        index: 0,
        action_pct: 0.1,
        dialogue_pct: 0.3,
        description_pct: 0.5,
        introspection_pct: 0.1,
        tempo: "snail",
      },
    ],
    tempo_shifts: [],
    summary: "x",
  });
  assert.equal(bad.success, false);
});

test("SuspenseGridResultSchema accepts payoff null for unresolved", () => {
  const ok = SuspenseGridResultSchema.safeParse({
    threads: [
      {
        id: "t1",
        label: "神秘信件",
        setup_chapter: 0,
        payoff_chapter: null,
        strength: 7,
        kind: "mystery",
      },
    ],
    unresolved: ["t1"],
    summary: "1 条未解。",
  });
  assert.equal(ok.success, true);
});

test("SuspenseGridResultSchema rejects unknown kind", () => {
  const bad = SuspenseGridResultSchema.safeParse({
    threads: [
      {
        id: "t1",
        label: "x",
        setup_chapter: 0,
        payoff_chapter: 5,
        strength: 5,
        kind: "easter_egg",
      },
    ],
    unresolved: [],
    summary: "x",
  });
  assert.equal(bad.success, false);
});
