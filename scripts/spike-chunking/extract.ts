import { generateObject } from "ai";
import type { createOpenAI } from "@ai-sdk/openai";

import { EXTRACT_SYSTEM_PROMPT } from "./prompts";
import {
  PerChunkExtractSchema,
  type Chunk,
  type ChunkResult,
} from "./types";

type OpenAIClient = ReturnType<typeof createOpenAI>;

const MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [1_500, 4_000, 10_000];

export async function extractChunk(args: {
  openai: OpenAIClient;
  model: string;
  chunk: Chunk;
}): Promise<ChunkResult> {
  const { openai, model, chunk } = args;
  const startedAt = Date.now();

  const userPrompt = buildUserPrompt(chunk);

  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const result = await generateObject({
        model: openai(model),
        schema: PerChunkExtractSchema,
        system: EXTRACT_SYSTEM_PROMPT,
        prompt: userPrompt,
        temperature: 0.2,
        maxTokens: 4096,
      });

      return {
        chunk,
        extract: result.object,
        promptTokens: Number.isFinite(result.usage.promptTokens)
          ? result.usage.promptTokens
          : 0,
        completionTokens: Number.isFinite(result.usage.completionTokens)
          ? result.usage.completionTokens
          : 0,
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS - 1) {
        await sleep(RETRY_BACKOFF_MS[attempt]);
      }
    }
  }

  throw new Error(
    `extractChunk failed after ${MAX_ATTEMPTS} attempts for chunk #${chunk.index} (chapters ${chunk.chapterStart}-${chunk.chapterEnd}): ${stringifyError(lastError)}`
  );
}

export async function runWithConcurrency<T, R>(args: {
  items: T[];
  concurrency: number;
  worker: (item: T, index: number) => Promise<R>;
  onProgress?: (done: number, total: number) => void;
}): Promise<R[]> {
  const { items, concurrency, worker, onProgress } = args;
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  let completed = 0;

  async function pickNext(): Promise<void> {
    const i = nextIndex++;
    if (i >= items.length) return;
    results[i] = await worker(items[i], i);
    completed++;
    onProgress?.(completed, items.length);
    await pickNext();
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => pickNext()
  );
  await Promise.all(workers);
  return results;
}

function buildUserPrompt(chunk: Chunk): string {
  const header =
    chunk.chapterStart > 0
      ? `# 片段：第 ${chunk.chapterStart}-${chunk.chapterEnd} 章\n# 起始章节标题：${chunk.chapterTitleStart}\n# 末尾章节标题：${chunk.chapterTitleEnd}\n\n`
      : `# 片段 #${chunk.index + 1}（无章节标记）\n\n`;
  return `${header}${chunk.text}`;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
