import { z } from "zod";

export const BlueprintSourceSchema = z.object({
  book_id: z.string().uuid(),
  chapter_id: z.string().uuid().nullable(),
});
export type BlueprintSource = z.infer<typeof BlueprintSourceSchema>;

const baseItem = {
  id: z.string(),
  notes: z.string().default(""),
  sources: z.array(BlueprintSourceSchema).default([]),
};

export const BlueprintSchema = z.object({
  characters: z
    .array(
      z.object({
        ...baseItem,
        name: z.string(),
        role: z.string(),
        traits: z.array(z.string()).default([]),
        description: z.string(),
      })
    )
    .default([]),
  relationships: z
    .array(
      z.object({
        ...baseItem,
        from: z.string(),
        to: z.string(),
        type: z.string(),
        description: z.string(),
      })
    )
    .default([]),
  world_rules: z
    .array(
      z.object({
        ...baseItem,
        rule: z.string(),
        description: z.string(),
      })
    )
    .default([]),
  conflicts: z
    .array(
      z.object({
        ...baseItem,
        title: z.string(),
        description: z.string(),
      })
    )
    .default([]),
  plot_beats: z
    .array(
      z.object({
        ...baseItem,
        title: z.string(),
        description: z.string(),
        order: z.number().int(),
      })
    )
    .default([]),
  viewpoint: z
    .object({
      mode: z.string(),
      pacing: z.string(),
      notes: z.string().default(""),
    })
    .default({ mode: "", pacing: "", notes: "" }),
  themes: z
    .array(
      z.object({
        ...baseItem,
        theme: z.string(),
      })
    )
    .default([]),
});
export type Blueprint = z.infer<typeof BlueprintSchema>;
export type BlueprintSection = keyof Blueprint;
export type BlueprintStatus = "draft" | "confirmed";

export function emptyBlueprint(): Blueprint {
  return BlueprintSchema.parse({});
}

export type ReadyToConfirm =
  | { ok: true }
  | { ok: false; missing: string[] };

const ARRAY_SECTIONS_REQUIRING_AT_LEAST_ONE = [
  "characters",
  "relationships",
  "world_rules",
  "conflicts",
  "plot_beats",
  "themes",
] as const satisfies readonly Exclude<BlueprintSection, "viewpoint">[];

export function blueprintReadyToConfirm(bp: Blueprint): ReadyToConfirm {
  const missing: string[] = [];
  for (const key of ARRAY_SECTIONS_REQUIRING_AT_LEAST_ONE) {
    if (bp[key].length === 0) missing.push(key);
  }
  if (!bp.viewpoint.mode.trim()) missing.push("viewpoint.mode");
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}
