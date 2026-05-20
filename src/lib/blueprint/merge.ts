import { randomUUID } from "node:crypto";

import {
  BlueprintSchema,
  type Blueprint,
  type BlueprintSection,
  type BlueprintSource,
} from "./schema";

export type Candidate = {
  section: BlueprintSection;
  title: string;
  payload: Record<string, unknown>;
  source: BlueprintSource;
};

function identityKey(
  section: BlueprintSection,
  item: Record<string, unknown>
): string {
  switch (section) {
    case "characters":
      return String(item.name ?? "");
    case "themes":
      return String(item.theme ?? item.name ?? item.title ?? "");
    case "relationships":
      return `${item.from}→${item.to}:${item.type}`;
    case "world_rules":
      return String(item.rule ?? "");
    case "conflicts":
    case "plot_beats":
      return String(item.title ?? "");
    case "viewpoint":
      return "viewpoint";
    default:
      return JSON.stringify(item);
  }
}

function dedupSources(sources: BlueprintSource[]): BlueprintSource[] {
  const seen = new Set<string>();
  const out: BlueprintSource[] = [];
  for (const s of sources) {
    const key = `${s.book_id}:${s.chapter_id ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

export function applyCandidate(bp: Blueprint, c: Candidate): Blueprint {
  if (c.section === "viewpoint") {
    const payload = c.payload as { mode?: string; pacing?: string };
    return BlueprintSchema.parse({
      ...bp,
      viewpoint: {
        mode: payload.mode ?? bp.viewpoint.mode,
        pacing: payload.pacing ?? bp.viewpoint.pacing,
        notes: bp.viewpoint.notes,
      },
    });
  }

  const arr = bp[c.section] as Array<Record<string, unknown> & { sources?: BlueprintSource[] }>;
  const key = identityKey(c.section, c.payload);
  const existingIdx = arr.findIndex((it) => identityKey(c.section, it) === key);

  if (existingIdx >= 0) {
    const existing = arr[existingIdx];
    const mergedSources = dedupSources([...(existing.sources ?? []), c.source]);
    const nextArr = [...arr];
    nextArr[existingIdx] = { ...existing, sources: mergedSources };
    return BlueprintSchema.parse({ ...bp, [c.section]: nextArr });
  }

  const newItem = {
    id: randomUUID(),
    notes: "",
    sources: [c.source],
    ...c.payload,
  };
  return BlueprintSchema.parse({ ...bp, [c.section]: [...arr, newItem] });
}

export function mergeSections(bp: Blueprint, patch: Partial<Blueprint>): Blueprint {
  return BlueprintSchema.parse({ ...bp, ...patch });
}
