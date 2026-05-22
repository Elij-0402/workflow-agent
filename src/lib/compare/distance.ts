import {
  CharactersResultSchema,
  EmotionArcResultSchema,
  NarrativeResultSchema,
  PacingMapResultSchema,
  ProseCraftResultSchema,
  SuspenseGridResultSchema,
  WorldviewResultSchema,
  type AnalysisDimension,
} from "@/lib/types";
import type { z } from "zod";

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const toScore = (x: number) => Math.round(clamp01(x) * 100);

function parseAll<T>(schema: z.ZodType<T>, results: unknown[]): T[] {
  const out: T[] = [];
  for (const r of results) {
    const parsed = schema.safeParse(r);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

function pairwiseMean(
  items: number[][],
  pair: (a: number[], b: number[]) => number,
): number {
  if (items.length < 2) return 0;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      sum += pair(items[i], items[j]);
      n++;
    }
  }
  return n === 0 ? 0 : sum / n;
}

function pairwiseMeanT<T>(items: T[], pair: (a: T, b: T) => number): number {
  if (items.length < 2) return 0;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      sum += pair(items[i], items[j]);
      n++;
    }
  }
  return n === 0 ? 0 : sum / n;
}

function jaccardDistance(a: string[], b: string[]): number {
  const A = new Set(a.map((s) => s.trim().toLowerCase()).filter(Boolean));
  const B = new Set(b.map((s) => s.trim().toLowerCase()).filter(Boolean));
  if (A.size === 0 && B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : 1 - inter / union;
}

function cosineDistance(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  const sim = dot / (Math.sqrt(na) * Math.sqrt(nb));
  return clamp01(1 - sim);
}

export function worldviewDistance(results: unknown[]): number | null {
  const parsed = parseAll(WorldviewResultSchema, results);
  if (parsed.length < 2) return null;
  const rules = parsed.map((p) => p.rules ?? []);
  const typeMatchPenalty = pairwiseMeanT(
    parsed.map((p) => p.type?.trim().toLowerCase() ?? ""),
    (a, b) => (a && b && a === b ? 0 : 1),
  );
  const rulesDist = pairwiseMeanT(rules, jaccardDistance);
  return toScore(0.6 * rulesDist + 0.4 * typeMatchPenalty);
}

export function charactersDistance(results: unknown[]): number | null {
  const parsed = parseAll(CharactersResultSchema, results);
  if (parsed.length < 2) return null;
  const dists = parsed.map((p) => {
    const total = p.characters.length || 1;
    const counts = { protagonist: 0, antagonist: 0, supporting: 0 };
    for (const c of p.characters) counts[c.role]++;
    return [
      counts.protagonist / total,
      counts.antagonist / total,
      counts.supporting / total,
    ];
  });
  const distVec = pairwiseMean(dists, cosineDistance);
  const sizes = parsed.map((p) => p.characters.length);
  const maxSize = Math.max(...sizes, 1);
  const sizeDiff = pairwiseMeanT(sizes, (a, b) => Math.abs(a - b) / maxSize);
  return toScore(0.65 * distVec + 0.35 * sizeDiff);
}

export function narrativeDistance(results: unknown[]): number | null {
  const parsed = parseAll(NarrativeResultSchema, results);
  if (parsed.length < 2) return null;
  const themesDist = pairwiseMeanT(
    parsed.map((p) => p.themes ?? []),
    jaccardDistance,
  );
  const impactMeans = parsed.map((p) => {
    const tps = p.turning_points ?? [];
    if (tps.length === 0) return 0;
    return tps.reduce((s, t) => s + t.impact, 0) / tps.length / 10;
  });
  const impactDiff = pairwiseMeanT(impactMeans, (a, b) => Math.abs(a - b));
  const structureMatch = pairwiseMeanT(
    parsed.map((p) => p.structure?.trim().toLowerCase() ?? ""),
    (a, b) => (a && b && a === b ? 0 : 1),
  );
  return toScore(0.5 * themesDist + 0.3 * impactDiff + 0.2 * structureMatch);
}

export function proseCraftDistance(results: unknown[]): number | null {
  const parsed = parseAll(ProseCraftResultSchema, results);
  if (parsed.length < 2) return null;
  const vecs = parsed.map((p) => [
    p.sentence_length.short_pct,
    p.sentence_length.medium_pct,
    p.sentence_length.long_pct,
    p.rhetoric_density.metaphor / 10,
    p.rhetoric_density.parallelism / 10,
    p.rhetoric_density.personification / 10,
    p.rhetoric_density.irony / 10,
    p.rhetoric_density.hyperbole / 10,
    p.sensory_mix.visual,
    p.sensory_mix.auditory,
    p.sensory_mix.tactile,
    p.sensory_mix.olfactory_gustatory,
    p.sensory_mix.interoceptive,
    p.mode_balance.dialogue_pct,
    p.mode_balance.description_pct,
    p.mode_balance.action_pct,
    p.mode_balance.introspection_pct,
  ]);
  return toScore(pairwiseMean(vecs, cosineDistance));
}

function alignByIndex<T extends { index: number }>(
  a: T[],
  b: T[],
): Array<[T, T]> {
  const mapA = new Map<number, T>(a.map((x) => [x.index, x]));
  const out: Array<[T, T]> = [];
  for (const y of b) {
    const x = mapA.get(y.index);
    if (x) out.push([x, y]);
  }
  return out;
}

export function emotionArcDistance(results: unknown[]): number | null {
  const parsed = parseAll(EmotionArcResultSchema, results);
  if (parsed.length < 2) return null;
  const pairs = parsed.map((p) => p.chapters);
  const dist = pairwiseMeanT(pairs, (a, b) => {
    const aligned = alignByIndex(a, b);
    if (aligned.length === 0) return 0;
    const sumValence = aligned.reduce(
      (s, [x, y]) => s + Math.abs(x.valence - y.valence),
      0,
    );
    const sumIntensity = aligned.reduce(
      (s, [x, y]) => s + Math.abs(x.intensity - y.intensity),
      0,
    );
    return (
      (sumValence / aligned.length / 2 + sumIntensity / aligned.length) / 2
    );
  });
  return toScore(dist);
}

export function pacingMapDistance(results: unknown[]): number | null {
  const parsed = parseAll(PacingMapResultSchema, results);
  if (parsed.length < 2) return null;
  const pairs = parsed.map((p) => p.chapters);
  const dist = pairwiseMeanT(pairs, (a, b) => {
    const aligned = alignByIndex(a, b);
    if (aligned.length === 0) return 0;
    let acc = 0;
    for (const [x, y] of aligned) {
      const va = [
        x.action_pct,
        x.dialogue_pct,
        x.description_pct,
        x.introspection_pct,
      ];
      const vb = [
        y.action_pct,
        y.dialogue_pct,
        y.description_pct,
        y.introspection_pct,
      ];
      acc += cosineDistance(va, vb);
    }
    return acc / aligned.length;
  });
  return toScore(dist);
}

export function suspenseGridDistance(results: unknown[]): number | null {
  const parsed = parseAll(SuspenseGridResultSchema, results);
  if (parsed.length < 2) return null;
  const stats = parsed.map((p) => {
    const threads = p.threads ?? [];
    const count = threads.length;
    const unresolvedRatio =
      count === 0 ? 0 : (p.unresolved?.length ?? 0) / count;
    const avgStrength =
      count === 0
        ? 0
        : threads.reduce((s, t) => s + t.strength, 0) / count / 10;
    return { count, unresolvedRatio, avgStrength };
  });
  const maxCount = Math.max(...stats.map((s) => s.count), 1);
  const countDiff = pairwiseMeanT(
    stats,
    (a, b) => Math.abs(a.count - b.count) / maxCount,
  );
  const unresolvedDiff = pairwiseMeanT(stats, (a, b) =>
    Math.abs(a.unresolvedRatio - b.unresolvedRatio),
  );
  const strengthDiff = pairwiseMeanT(stats, (a, b) =>
    Math.abs(a.avgStrength - b.avgStrength),
  );
  return toScore(0.4 * countDiff + 0.3 * unresolvedDiff + 0.3 * strengthDiff);
}

const DIMENSION_DISTANCE: Partial<
  Record<AnalysisDimension, (results: unknown[]) => number | null>
> = {
  worldview: worldviewDistance,
  characters: charactersDistance,
  narrative: narrativeDistance,
  prose_craft: proseCraftDistance,
  emotion_arc: emotionArcDistance,
  pacing_map: pacingMapDistance,
  suspense_grid: suspenseGridDistance,
};

export function distanceFor(
  dimension: AnalysisDimension,
  results: unknown[],
): number | null {
  const fn = DIMENSION_DISTANCE[dimension];
  if (!fn) return null;
  return fn(results);
}

export function distanceBand(
  score: number | null,
): "none" | "low" | "mid" | "high" {
  if (score === null) return "none";
  if (score >= 60) return "high";
  if (score >= 30) return "mid";
  return "low";
}
