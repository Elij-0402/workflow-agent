import { test } from "node:test";
import assert from "node:assert/strict";

import {
  charactersDistance,
  distanceBand,
  distanceFor,
  emotionArcDistance,
  narrativeDistance,
  pacingMapDistance,
  proseCraftDistance,
  suspenseGridDistance,
  worldviewDistance,
} from "./distance";

const worldview = (over?: Partial<{ type: string; rules: string[] }>) => ({
  type: "架空",
  setting: "中世纪",
  locations: [],
  rules: ["天命可逆", "魔法消耗寿命"],
  summary: "x",
  ...over,
});

const characters = (
  over?: Partial<{
    characters: Array<{ role: "protagonist" | "antagonist" | "supporting" }>;
  }>,
) => ({
  characters: [
    {
      name: "A",
      role: "protagonist" as const,
      traits: [],
      background: "",
      description: "",
    },
    {
      name: "B",
      role: "supporting" as const,
      traits: [],
      background: "",
      description: "",
    },
  ],
  relationships: [],
  summary: "x",
  ...over,
});

const narrative = (
  over?: Partial<{
    themes: string[];
    turning_points: Array<{ impact: number }>;
  }>,
) => ({
  structure: "三幕式",
  viewpoint: "第三",
  pacing: "中",
  themes: ["成长", "羁绊"],
  turning_points: [
    { title: "t1", description: "d", impact: 5 },
    { title: "t2", description: "d", impact: 8 },
  ],
  conflicts: [],
  summary: "x",
  ...over,
});

const proseCraft = () => ({
  sentence_length: {
    short_pct: 0.3,
    medium_pct: 0.5,
    long_pct: 0.2,
    average: 18,
  },
  rhetoric_density: {
    metaphor: 5,
    parallelism: 3,
    personification: 4,
    irony: 2,
    hyperbole: 3,
  },
  sensory_mix: {
    visual: 0.4,
    auditory: 0.2,
    tactile: 0.15,
    olfactory_gustatory: 0.1,
    interoceptive: 0.15,
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

const emotionArc = (valenceShift = 0) => ({
  chapters: [
    {
      index: 1,
      valence: 0.2 + valenceShift,
      intensity: 0.5,
      dominant_emotion: "喜",
    },
    {
      index: 2,
      valence: -0.1 + valenceShift,
      intensity: 0.4,
      dominant_emotion: "哀",
    },
    {
      index: 3,
      valence: 0.6 + valenceShift,
      intensity: 0.7,
      dominant_emotion: "喜",
    },
  ],
  peaks: [],
  summary: "x",
});

const pacingMap = (over?: { action: number }) => ({
  chapters: [
    {
      index: 1,
      action_pct: over?.action ?? 0.4,
      dialogue_pct: 0.3,
      description_pct: 0.2,
      introspection_pct: 0.1,
      tempo: "moderate" as const,
    },
  ],
  tempo_shifts: [],
  summary: "x",
});

const suspense = (threadCount = 3, unresolvedCount = 1) => ({
  threads: Array.from({ length: threadCount }, (_, i) => ({
    id: `t${i}`,
    label: `线索 ${i}`,
    setup_chapter: i,
    payoff_chapter: i + 5,
    strength: 5,
    kind: "foreshadow" as const,
  })),
  unresolved: Array.from({ length: unresolvedCount }, (_, i) => `t${i}`),
  summary: "x",
});

test("returns null with fewer than 2 valid books", () => {
  assert.equal(worldviewDistance([]), null);
  assert.equal(worldviewDistance([worldview()]), null);
  assert.equal(charactersDistance([characters(), null, "bad"]), null);
});

test("identical inputs yield 0", () => {
  assert.equal(worldviewDistance([worldview(), worldview()]), 0);
  assert.equal(charactersDistance([characters(), characters()]), 0);
  assert.equal(narrativeDistance([narrative(), narrative()]), 0);
  assert.equal(proseCraftDistance([proseCraft(), proseCraft()]), 0);
  assert.equal(emotionArcDistance([emotionArc(), emotionArc()]), 0);
  assert.equal(pacingMapDistance([pacingMap(), pacingMap()]), 0);
  assert.equal(suspenseGridDistance([suspense(), suspense()]), 0);
});

test("different inputs yield > 0 and <= 100", () => {
  const w = worldviewDistance([
    worldview({ type: "现代", rules: ["a", "b"] }),
    worldview({ type: "架空", rules: ["c"] }),
  ]);
  assert.ok(
    w !== null && w > 0 && w <= 100,
    `worldview distance out of range: ${w}`,
  );

  const c = charactersDistance([
    characters({
      characters: [
        {
          name: "A",
          role: "protagonist",
          traits: [],
          background: "",
          description: "",
        },
      ],
    }),
    characters({
      characters: [
        {
          name: "X",
          role: "antagonist",
          traits: [],
          background: "",
          description: "",
        },
        {
          name: "Y",
          role: "antagonist",
          traits: [],
          background: "",
          description: "",
        },
        {
          name: "Z",
          role: "supporting",
          traits: [],
          background: "",
          description: "",
        },
      ],
    }),
  ]);
  assert.ok(
    c !== null && c > 0 && c <= 100,
    `chars distance out of range: ${c}`,
  );

  const n = narrativeDistance([
    narrative({
      themes: ["x"],
      turning_points: [{ title: "t", description: "d", impact: 1 }],
    }),
    narrative({
      themes: ["y"],
      turning_points: [{ title: "t", description: "d", impact: 10 }],
    }),
  ]);
  assert.ok(
    n !== null && n > 0 && n <= 100,
    `narrative distance out of range: ${n}`,
  );

  const e = emotionArcDistance([emotionArc(), emotionArc(0.3)]);
  assert.ok(
    e !== null && e > 0 && e <= 100,
    `emotion distance out of range: ${e}`,
  );

  const p = pacingMapDistance([
    pacingMap({ action: 0.1 }),
    pacingMap({ action: 0.9 }),
  ]);
  assert.ok(
    p !== null && p > 0 && p <= 100,
    `pacing distance out of range: ${p}`,
  );

  const s = suspenseGridDistance([suspense(3, 1), suspense(8, 6)]);
  assert.ok(
    s !== null && s > 0 && s <= 100,
    `suspense distance out of range: ${s}`,
  );
});

test("distanceFor dispatches by dimension", () => {
  assert.equal(distanceFor("worldview", [worldview(), worldview()]), 0);
  assert.equal(distanceFor("chapter_brief", [{}, {}]), null);
  assert.equal(distanceFor("book_synthesis", [{}, {}]), null);
});

test("distanceBand thresholds", () => {
  assert.equal(distanceBand(null), "none");
  assert.equal(distanceBand(0), "low");
  assert.equal(distanceBand(29), "low");
  assert.equal(distanceBand(30), "mid");
  assert.equal(distanceBand(59), "mid");
  assert.equal(distanceBand(60), "high");
  assert.equal(distanceBand(100), "high");
});

test("tolerates malformed input", () => {
  assert.doesNotThrow(() =>
    worldviewDistance([
      worldview(),
      null,
      undefined,
      { rules: "not array" },
      worldview(),
    ]),
  );
});
