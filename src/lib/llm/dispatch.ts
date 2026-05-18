import "server-only";

import { createOpenAI } from "@ai-sdk/openai";
import type { SupabaseClient } from "@supabase/supabase-js";

import { decrypt } from "@/lib/crypto";
import type { Database } from "@/lib/types";

export async function getUserLLMClient(supabase: SupabaseClient<Database>) {
  const { data: config, error } = await supabase
    .from("llm_config")
    .select(
      "id, provider, base_url, api_key_encrypted, model, temperature, max_tokens"
    )
    .maybeSingle();

  if (error) {
    throw new Error("读取模型配置失败。");
  }

  if (!config) {
    throw new Error("请先在设置页保存模型配置。");
  }

  const apiKey = await decrypt(config.api_key_encrypted);
  const openai = createOpenAI({
    apiKey,
    baseURL: config.base_url,
    compatibility: config.provider === "openai" ? "strict" : "compatible",
    name: config.provider,
  });

  return {
    openai,
    model: config.model,
    configId: config.id,
    temperature: config.temperature,
    maxTokens: config.max_tokens,
  };
}
