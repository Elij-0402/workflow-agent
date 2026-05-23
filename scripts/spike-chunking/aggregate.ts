import { generateObject } from "ai";
import type { createOpenAI } from "@ai-sdk/openai";

import {
  CharactersResultSchema,
  NarrativeResultSchema,
  WorldviewResultSchema,
  type CharactersResult,
  type NarrativeResult,
  type WorldviewResult,
} from "../../src/lib/types";

import {
  CHARACTERS_SUMMARY_SYSTEM_PROMPT,
  NARRATIVE_SUMMARY_SYSTEM_PROMPT,
  WORLDVIEW_SUMMARY_SYSTEM_PROMPT,
} from "./prompts";
import type { ChunkResult, PerChunkExtract } from "./types";

type OpenAIClient = ReturnType<typeof createOpenAI>;

export type SummaryUsage = {
  promptTokens: number;
  completionTokens: number;
  durationMs: number;
};

export type AggregateResult = {
  worldview: WorldviewResult;
  characters: CharactersResult;
  narrative: NarrativeResult;
  evidence: {
    worldview: WorldviewEvidence;
    characters: CharactersEvidence;
    narrative: NarrativeEvidence;
  };
  summaryUsage: {
    worldview: SummaryUsage;
    characters: SummaryUsage;
    narrative: SummaryUsage;
  };
};

// ---------------------------------------------------------------------------
// Evidence types — what each merge produces, before the summary LLM call.
// ---------------------------------------------------------------------------

export type WorldviewEvidence = {
  settings: string[];
  locations: Array<{
    name: string;
    importanceVotes: { low: number; medium: number; high: number };
    notes: string[];
  }>;
  rules: string[];
};

export type CharactersEvidence = {
  characters: Array<{
    canonicalName: string;
    aliases: string[];
    traitsByCount: Record<string, number>;
    roleHintVotes: Record<string, number>;
    descriptions: string[];
    appearanceWeightTotal: number;
    chunkAppearances: number;
  }>;
  relationships: Array<{
    from: string;
    to: string;
    type: string;
    description: string;
  }>;
};

export type NarrativeEvidence = {
  events: Array<{
    description: string;
    importance: number;
    chunkIndex: number;
    chapterStart: number;
    chapterEnd: number;
  }>;
  themesByCount: Record<string, number>;
  conflictsByCount: Record<string, number>;
  viewpointHints: string[];
  pacingHints: string[];
};

// ---------------------------------------------------------------------------
// Public entry point.
// ---------------------------------------------------------------------------

export async function aggregateAndSummarize(args: {
  openai: OpenAIClient;
  model: string;
  chunks: ChunkResult[];
}): Promise<AggregateResult> {
  const { openai, model, chunks } = args;
  const extracts = chunks.map((c) => c.extract);

  const worldviewEvidence = mergeWorldviewEvidence(chunks);
  const charactersEvidence = mergeCharactersEvidence(chunks);
  const narrativeEvidence = mergeNarrativeEvidence(chunks);

  const [worldview, characters, narrative] = await Promise.all([
    summarizeWorldview(openai, model, worldviewEvidence),
    summarizeCharacters(openai, model, charactersEvidence),
    summarizeNarrative(openai, model, narrativeEvidence),
  ]);

  void extracts; // not used directly but kept for clarity / potential future use

  return {
    worldview: worldview.result,
    characters: characters.result,
    narrative: narrative.result,
    evidence: {
      worldview: worldviewEvidence,
      characters: charactersEvidence,
      narrative: narrativeEvidence,
    },
    summaryUsage: {
      worldview: worldview.usage,
      characters: characters.usage,
      narrative: narrative.usage,
    },
  };
}

// ---------------------------------------------------------------------------
// Deterministic merge — no LLM, just dedupe + count.
// ---------------------------------------------------------------------------

function mergeWorldviewEvidence(chunks: ChunkResult[]): WorldviewEvidence {
  const settings: string[] = [];
  const locationsMap = new Map<string, WorldviewEvidence["locations"][number]>();
  const rulesSet = new Set<string>();

  for (const { extract } of chunks) {
    if (extract.setting.trim()) settings.push(extract.setting.trim());

    for (const loc of extract.locations) {
      const key = normalizeName(loc.name);
      if (!key) continue;
      const entry = locationsMap.get(key) ?? {
        name: loc.name.trim(),
        importanceVotes: { low: 0, medium: 0, high: 0 },
        notes: [] as string[],
      };
      entry.importanceVotes[loc.importance] += 1;
      if (loc.note.trim()) entry.notes.push(loc.note.trim());
      locationsMap.set(key, entry);
    }

    for (const rule of extract.rules) {
      const trimmed = rule.trim();
      if (trimmed) rulesSet.add(trimmed);
    }
  }

  return {
    settings,
    locations: [...locationsMap.values()].sort(
      (a, b) =>
        importanceScore(b.importanceVotes) - importanceScore(a.importanceVotes)
    ),
    rules: [...rulesSet],
  };
}

function importanceScore(votes: { low: number; medium: number; high: number }) {
  return votes.high * 3 + votes.medium * 2 + votes.low;
}

function mergeCharactersEvidence(chunks: ChunkResult[]): CharactersEvidence {
  const merged: CharactersEvidence["characters"] = [];
  const relationships: CharactersEvidence["relationships"] = [];
  const seenRelKeys = new Set<string>();

  for (const { extract } of chunks) {
    for (const char of extract.characters) {
      const canonical = findOrCreateCharacter(merged, char);
      canonical.appearanceWeightTotal += char.appearance_weight;
      canonical.chunkAppearances += 1;
      for (const t of char.traits) {
        const trait = t.trim();
        if (!trait) continue;
        canonical.traitsByCount[trait] =
          (canonical.traitsByCount[trait] ?? 0) + 1;
      }
      canonical.roleHintVotes[char.role_hint] =
        (canonical.roleHintVotes[char.role_hint] ?? 0) + 1;
      if (char.description.trim()) {
        canonical.descriptions.push(char.description.trim());
      }
      for (const alias of char.aliases) {
        const a = alias.trim();
        if (a && !canonical.aliases.includes(a)) canonical.aliases.push(a);
      }
    }

    for (const rel of extract.relationships) {
      const fromKey = normalizeName(rel.from);
      const toKey = normalizeName(rel.to);
      const typeKey = rel.type.trim();
      const key = `${fromKey}|${toKey}|${typeKey}`;
      if (seenRelKeys.has(key)) continue;
      seenRelKeys.add(key);
      relationships.push({
        from: rel.from.trim(),
        to: rel.to.trim(),
        type: typeKey,
        description: rel.description.trim(),
      });
    }
  }

  merged.sort((a, b) => b.appearanceWeightTotal - a.appearanceWeightTotal);
  return { characters: merged, relationships };
}

function findOrCreateCharacter(
  merged: CharactersEvidence["characters"],
  candidate: PerChunkExtract["characters"][number]
) {
  const candidateName = normalizeName(candidate.name);
  const candidateAliases = new Set(
    candidate.aliases.map((a) => normalizeName(a)).filter(Boolean)
  );

  for (const m of merged) {
    if (normalizeName(m.canonicalName) === candidateName) return m;
    if (candidateAliases.has(normalizeName(m.canonicalName))) return m;
    const mAliases = m.aliases.map((a) => normalizeName(a));
    if (mAliases.includes(candidateName)) return m;
    for (const a of candidateAliases) {
      if (mAliases.includes(a)) return m;
    }
  }

  const fresh: CharactersEvidence["characters"][number] = {
    canonicalName: candidate.name.trim(),
    aliases: candidate.aliases.map((a) => a.trim()).filter(Boolean),
    traitsByCount: {},
    roleHintVotes: {},
    descriptions: [],
    appearanceWeightTotal: 0,
    chunkAppearances: 0,
  };
  merged.push(fresh);
  return fresh;
}

function mergeNarrativeEvidence(chunks: ChunkResult[]): NarrativeEvidence {
  const events: NarrativeEvidence["events"] = [];
  const themes: Record<string, number> = {};
  const conflicts: Record<string, number> = {};
  const viewpointHints: string[] = [];
  const pacingHints: string[] = [];

  for (const cr of chunks) {
    for (const e of cr.extract.events) {
      events.push({
        description: e.description.trim(),
        importance: e.importance,
        chunkIndex: cr.chunk.index,
        chapterStart: cr.chunk.chapterStart,
        chapterEnd: cr.chunk.chapterEnd,
      });
    }
    for (const t of cr.extract.themes) {
      const key = t.trim();
      if (key) themes[key] = (themes[key] ?? 0) + 1;
    }
    for (const c of cr.extract.conflicts) {
      const key = c.trim();
      if (key) conflicts[key] = (conflicts[key] ?? 0) + 1;
    }
    if (cr.extract.viewpoint_hint.trim()) {
      viewpointHints.push(cr.extract.viewpoint_hint.trim());
    }
    if (cr.extract.pacing_hint.trim()) {
      pacingHints.push(cr.extract.pacing_hint.trim());
    }
  }

  return {
    events,
    themesByCount: themes,
    conflictsByCount: conflicts,
    viewpointHints,
    pacingHints,
  };
}

function normalizeName(name: string): string {
  return name.replace(/\s+/g, "").toLowerCase();
}

// ---------------------------------------------------------------------------
// Three summary LLM calls (one per final dimension schema).
// ---------------------------------------------------------------------------

async function summarizeWorldview(
  openai: OpenAIClient,
  model: string,
  evidence: WorldviewEvidence
) {
  const started = Date.now();
  const result = await generateObject({
    model: openai(model),
    schema: WorldviewResultSchema,
    system: WORLDVIEW_SUMMARY_SYSTEM_PROMPT,
    prompt: `以下是聚合证据，请生成最终 WorldviewResult（严格匹配 schema）：\n\n${JSON.stringify(
      condenseWorldview(evidence),
      null,
      2
    )}`,
    temperature: 0.2,
    maxTokens: 2048,
  });
  return {
    result: result.object,
    usage: {
      promptTokens: result.usage.promptTokens ?? 0,
      completionTokens: result.usage.completionTokens ?? 0,
      durationMs: Date.now() - started,
    },
  };
}

async function summarizeCharacters(
  openai: OpenAIClient,
  model: string,
  evidence: CharactersEvidence
) {
  const started = Date.now();
  const result = await generateObject({
    model: openai(model),
    schema: CharactersResultSchema,
    system: CHARACTERS_SUMMARY_SYSTEM_PROMPT,
    prompt: `以下是聚合证据，请生成最终 CharactersResult（严格匹配 schema）：\n\n${JSON.stringify(
      condenseCharacters(evidence),
      null,
      2
    )}`,
    temperature: 0.2,
    maxTokens: 3072,
  });
  return {
    result: result.object,
    usage: {
      promptTokens: result.usage.promptTokens ?? 0,
      completionTokens: result.usage.completionTokens ?? 0,
      durationMs: Date.now() - started,
    },
  };
}

async function summarizeNarrative(
  openai: OpenAIClient,
  model: string,
  evidence: NarrativeEvidence
) {
  const started = Date.now();
  const result = await generateObject({
    model: openai(model),
    schema: NarrativeResultSchema,
    system: NARRATIVE_SUMMARY_SYSTEM_PROMPT,
    prompt: `以下是聚合证据，请生成最终 NarrativeResult（严格匹配 schema）：\n\n${JSON.stringify(
      condenseNarrative(evidence),
      null,
      2
    )}`,
    temperature: 0.2,
    maxTokens: 2048,
  });
  return {
    result: result.object,
    usage: {
      promptTokens: result.usage.promptTokens ?? 0,
      completionTokens: result.usage.completionTokens ?? 0,
      durationMs: Date.now() - started,
    },
  };
}

// ---------------------------------------------------------------------------
// Condense evidence before sending to the summary call — keep input tokens small.
// ---------------------------------------------------------------------------

function condenseWorldview(e: WorldviewEvidence) {
  return {
    setting_candidates: e.settings.slice(0, 20),
    locations: e.locations.slice(0, 20).map((l) => ({
      name: l.name,
      importance_score: importanceScore(l.importanceVotes),
      importance_votes: l.importanceVotes,
      sample_notes: l.notes.slice(0, 3),
    })),
    rules: e.rules.slice(0, 30),
  };
}

function condenseCharacters(e: CharactersEvidence) {
  return {
    characters: e.characters.slice(0, 25).map((c) => ({
      name: c.canonicalName,
      aliases: c.aliases,
      appearance_weight_total: c.appearanceWeightTotal,
      chunk_appearances: c.chunkAppearances,
      top_traits: Object.entries(c.traitsByCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([t, count]) => ({ trait: t, count })),
      role_hint_votes: c.roleHintVotes,
      sample_descriptions: c.descriptions.slice(0, 3),
    })),
    relationships: e.relationships.slice(0, 40),
  };
}

function condenseNarrative(e: NarrativeEvidence) {
  return {
    top_events: [...e.events]
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 30)
      .map((ev) => ({
        description: ev.description,
        importance: ev.importance,
        at_chapters: `${ev.chapterStart}-${ev.chapterEnd}`,
      })),
    themes: Object.entries(e.themesByCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([theme, count]) => ({ theme, count })),
    conflicts: Object.entries(e.conflictsByCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([conflict, count]) => ({ conflict, count })),
    viewpoint_hints: e.viewpointHints.slice(0, 10),
    pacing_hints: e.pacingHints.slice(0, 10),
  };
}
