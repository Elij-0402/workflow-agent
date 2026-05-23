import { z } from "zod";

export const PerChunkExtractSchema = z.object({
  setting: z
    .string()
    .describe("此片段中体现的世界/时代/背景，1-2 句中文")
    .default(""),
  locations: z
    .array(
      z.object({
        name: z.string().min(1),
        importance: z.enum(["low", "medium", "high"]).default("medium"),
        note: z.string().default(""),
      })
    )
    .default([]),
  rules: z
    .array(z.string().min(1))
    .describe("此片段体现的世界规则/设定，最多 3 条")
    .default([]),
  characters: z
    .array(
      z.object({
        name: z.string().min(1),
        aliases: z.array(z.string()).default([]),
        traits: z.array(z.string()).default([]),
        role_hint: z
          .enum(["protagonist", "antagonist", "supporting", "unknown"])
          .default("unknown"),
        description: z.string().default(""),
        appearance_weight: z
          .number()
          .int()
          .min(1)
          .max(10)
          .describe("此角色在该片段中的戏份权重 1-10")
          .default(1),
      })
    )
    .default([]),
  relationships: z
    .array(
      z.object({
        from: z.string().min(1),
        to: z.string().min(1),
        type: z.string().min(1),
        description: z.string().default(""),
      })
    )
    .default([]),
  events: z
    .array(
      z.object({
        description: z.string().min(1),
        importance: z.number().int().min(1).max(10),
      })
    )
    .default([]),
  themes: z.array(z.string()).default([]),
  conflicts: z.array(z.string()).default([]),
  viewpoint_hint: z.string().default(""),
  pacing_hint: z.string().default(""),
});
export type PerChunkExtract = z.infer<typeof PerChunkExtractSchema>;

export type Chunk = {
  index: number;
  chapterStart: number;
  chapterEnd: number;
  chapterTitleStart: string;
  chapterTitleEnd: string;
  startChar: number;
  endChar: number;
  text: string;
  charCount: number;
};

export type SpikeConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  concurrency: number;
  chunkChars: number;
  novelPath: string;
  compare: boolean;
  dryRun: boolean;
  outDir: string;
};

export type ChunkResult = {
  chunk: Chunk;
  extract: PerChunkExtract;
  promptTokens: number;
  completionTokens: number;
  durationMs: number;
};

export type Metrics = {
  novelPath: string;
  novelChars: number;
  novelChapters: number;
  chunks: number;
  chunkChars: number;
  model: string;
  baseUrl: string;
  concurrency: number;
  wallClockMs: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  estimatedCostUsd: number;
  estimatedCostCny: number;
  perChunkMs: number[];
  failedChunks: number[];
  startedAt: string;
  finishedAt: string;
};

export type Verdict = {
  status: "PASS" | "FAIL" | "DEFER";
  wallClockOk: boolean;
  costOk: boolean;
  schemaOk: boolean;
  qualityOk: boolean | "skipped";
  reasons: string[];
};

// Pricing per 1M tokens, USD. Best-effort; user should verify before treating numbers as gospel.
// DeepSeek-chat: $0.27 input / $1.10 output (V3.2 cache-cold, late 2025).
// DeepSeek-reasoner: $0.55 / $2.19. OpenAI gpt-4o: $2.50 / $10.
// Override via SPIKE_PRICE_IN_PER_M / SPIKE_PRICE_OUT_PER_M env vars.
export const DEFAULT_PRICE_TABLE: Record<
  string,
  { inPerM: number; outPerM: number }
> = {
  "deepseek-chat": { inPerM: 0.27, outPerM: 1.1 },
  "deepseek-reasoner": { inPerM: 0.55, outPerM: 2.19 },
  "gpt-4o": { inPerM: 2.5, outPerM: 10 },
  "gpt-4o-mini": { inPerM: 0.15, outPerM: 0.6 },
};
