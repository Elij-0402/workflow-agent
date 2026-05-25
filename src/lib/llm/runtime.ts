import { createHash } from "node:crypto";

import { generateObject, streamObject } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";

import { getUserLLMClient } from "@/lib/llm/dispatch";
import {
  LLMError,
  type LLMClientError,
  asLLMClientError,
} from "@/lib/llm/errors";
import { estimateUsageCostCNY, normalizeUsage } from "@/lib/llm/pricing";
import { resolveStructuredObjectMode } from "@/lib/llm/structured-output";
import type { Database } from "@/lib/types";

const DEFAULT_TIMEOUT_MS = 60_000;

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([a], [b]) => a.localeCompare(b),
  );
  return `{${entries
    .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`)
    .join(",")}}`;
}

function createCacheKey(parts: Record<string, unknown>) {
  return createHash("sha256").update(stableStringify(parts)).digest("hex");
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new LLMError(
          {
            code: "llm_timeout",
            userMessage: "模型响应超时，请稍后重试。",
            retryable: true,
            action: "retry",
          },
          504,
        ),
      );
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function updateConfigHealth(
  supabase: SupabaseClient<Database>,
  configId: string,
  health: {
    status: "ok" | "error";
    errorMessage?: string | null;
  },
) {
  const payload =
    health.status === "ok"
      ? {
          last_validated_at: new Date().toISOString(),
          last_connection_ok_at: new Date().toISOString(),
          last_connection_status: "ok" as const,
          last_connection_error: null,
        }
      : {
          last_validated_at: new Date().toISOString(),
          last_connection_status: "error" as const,
          last_connection_error:
            health.errorMessage?.slice(0, 240) ?? "未知错误",
        };

  await supabase.from("llm_config").update(payload).eq("id", configId);
}

async function logUsageEvent(
  supabase: SupabaseClient<Database>,
  event: Database["public"]["Tables"]["llm_usage_events"]["Insert"],
) {
  await supabase.from("llm_usage_events").insert(event);
}

export async function runLLMObject<TSchema extends z.ZodTypeAny>({
  supabase,
  route,
  operation,
  system,
  prompt,
  schema,
  promptVersion,
  schemaVersion,
  maxTokens,
  temperature,
  cacheSeed,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: {
  supabase: SupabaseClient<Database>;
  route: string;
  operation: string;
  system: string;
  prompt: string;
  schema: TSchema;
  promptVersion: string;
  schemaVersion: string;
  maxTokens?: number;
  temperature?: number;
  cacheSeed?: Record<string, unknown>;
  timeoutMs?: number;
}) {
  const llm = await getUserLLMClient(supabase);
  const resolvedMaxTokens = Math.min(maxTokens ?? llm.maxTokens, llm.maxTokens);
  const cacheKey = createCacheKey({
    userId: llm.userId,
    configId: llm.configId,
    route,
    operation,
    model: llm.model,
    promptVersion,
    schemaVersion,
    maxTokens: resolvedMaxTokens,
    temperature: temperature ?? llm.temperature,
    cacheSeed: cacheSeed ?? { prompt },
  });

  try {
    const result = await withTimeout(
      generateObject({
        model: llm.openai(llm.model),
        mode: resolveStructuredObjectMode(llm.provider),
        schema,
        system,
        prompt,
        temperature: temperature ?? llm.temperature,
        maxTokens: resolvedMaxTokens,
      }),
      timeoutMs,
    );

    const usage = normalizeUsage(result.usage);
    const estimatedCostCNY = estimateUsageCostCNY(usage);

    await updateConfigHealth(supabase, llm.configId, { status: "ok" });
    await logUsageEvent(supabase, {
      user_id: llm.userId,
      llm_config_id: llm.configId,
      route,
      operation,
      provider: llm.provider,
      model: llm.model,
      prompt_version: promptVersion,
      schema_version: schemaVersion,
      cache_key: cacheKey,
      prompt_tokens: usage.promptTokens,
      completion_tokens: usage.completionTokens,
      total_tokens: usage.totalTokens,
      estimated_cost_cny: estimatedCostCNY,
      success: true,
    });

    return {
      llm,
      object: result.object,
      usage,
      cacheKey,
      estimatedCostCNY,
    };
  } catch (error) {
    const clientError = asLLMClientError(error, {
      code: "llm_request_failed",
      userMessage: "模型调用失败，请稍后重试。",
      retryable: true,
      action: "retry",
    });

    await updateConfigHealth(supabase, llm.configId, {
      status: "error",
      errorMessage: clientError.userMessage,
    });
    await logUsageEvent(supabase, {
      user_id: llm.userId,
      llm_config_id: llm.configId,
      route,
      operation,
      provider: llm.provider,
      model: llm.model,
      prompt_version: promptVersion,
      schema_version: schemaVersion,
      cache_key: cacheKey,
      prompt_tokens: null,
      completion_tokens: null,
      total_tokens: null,
      estimated_cost_cny: null,
      success: false,
      error_code: clientError.code,
    });

    throw new LLMError(
      clientError,
      clientError.code === "llm_timeout" ? 504 : 502,
    );
  }
}

export async function streamLLMObject<TSchema extends z.ZodTypeAny>({
  supabase,
  route,
  operation,
  system,
  prompt,
  schema,
  promptVersion,
  schemaVersion,
  maxTokens,
  temperature,
  cacheSeed,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: {
  supabase: SupabaseClient<Database>;
  route: string;
  operation: string;
  system: string;
  prompt: string;
  schema: TSchema;
  promptVersion: string;
  schemaVersion: string;
  maxTokens?: number;
  temperature?: number;
  cacheSeed?: Record<string, unknown>;
  timeoutMs?: number;
}) {
  const llm = await getUserLLMClient(supabase);
  const resolvedMaxTokens = Math.min(maxTokens ?? llm.maxTokens, llm.maxTokens);
  const cacheKey = createCacheKey({
    userId: llm.userId,
    configId: llm.configId,
    route,
    operation,
    model: llm.model,
    promptVersion,
    schemaVersion,
    maxTokens: resolvedMaxTokens,
    temperature: temperature ?? llm.temperature,
    cacheSeed: cacheSeed ?? { prompt },
  });

  const result = streamObject({
    model: llm.openai(llm.model),
    mode: resolveStructuredObjectMode(llm.provider),
    schema,
    system,
    prompt,
    temperature: temperature ?? llm.temperature,
    maxTokens: resolvedMaxTokens,
  });

  return {
    llm,
    cacheKey,
    partialObjectStream: result.partialObjectStream,
    finalize: async () => {
      try {
        const object = await withTimeout(result.object, timeoutMs);
        const usage = normalizeUsage(await result.usage);
        const estimatedCostCNY = estimateUsageCostCNY(usage);

        await updateConfigHealth(supabase, llm.configId, { status: "ok" });
        await logUsageEvent(supabase, {
          user_id: llm.userId,
          llm_config_id: llm.configId,
          route,
          operation,
          provider: llm.provider,
          model: llm.model,
          prompt_version: promptVersion,
          schema_version: schemaVersion,
          cache_key: cacheKey,
          prompt_tokens: usage.promptTokens,
          completion_tokens: usage.completionTokens,
          total_tokens: usage.totalTokens,
          estimated_cost_cny: estimatedCostCNY,
          success: true,
        });

        return {
          llm,
          object,
          usage,
          cacheKey,
          estimatedCostCNY,
        };
      } catch (error) {
        const clientError = asLLMClientError(error, {
          code: "llm_request_failed",
          userMessage: "模型调用失败，请稍后重试。",
          retryable: true,
          action: "retry",
        });

        await updateConfigHealth(supabase, llm.configId, {
          status: "error",
          errorMessage: clientError.userMessage,
        });
        await logUsageEvent(supabase, {
          user_id: llm.userId,
          llm_config_id: llm.configId,
          route,
          operation,
          provider: llm.provider,
          model: llm.model,
          prompt_version: promptVersion,
          schema_version: schemaVersion,
          cache_key: cacheKey,
          prompt_tokens: null,
          completion_tokens: null,
          total_tokens: null,
          estimated_cost_cny: null,
          success: false,
          error_code: clientError.code,
        });

        throw new LLMError(
          clientError,
          clientError.code === "llm_timeout" ? 504 : 502,
        );
      }
    },
  };
}
