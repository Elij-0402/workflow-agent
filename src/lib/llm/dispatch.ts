import "server-only";

import { createOpenAI } from "@ai-sdk/openai";
import type { SupabaseClient } from "@supabase/supabase-js";

import { decrypt } from "@/lib/crypto";
import {
  LLM_BASE_URL_FORMAT_MESSAGE,
  LLM_CONFIG_REQUIRED_MESSAGE,
  LLM_SAVED_API_KEY_DECRYPT_FAILED_MESSAGE,
  validateCompatibleBaseUrl,
} from "@/lib/llm-config";
import type { Database } from "@/lib/types";

export async function getUserLLMClient(supabase: SupabaseClient<Database>) {
  const { data: config, error } = await supabase
    .from("llm_config")
    .select(
      "id, user_id, base_url, api_key_encrypted, model, temperature, max_tokens",
    )
    .maybeSingle();

  if (error) {
    throw new Error("读取模型配置失败。");
  }

  if (!config) {
    throw new Error(LLM_CONFIG_REQUIRED_MESSAGE);
  }

  const compatibility = validateCompatibleBaseUrl(config.base_url);
  if (!compatibility.ok) {
    throw new Error(
      compatibility.message === LLM_BASE_URL_FORMAT_MESSAGE
        ? LLM_CONFIG_REQUIRED_MESSAGE
        : compatibility.message,
    );
  }

  let apiKey: string;
  try {
    apiKey = await decrypt(config.api_key_encrypted);
  } catch {
    throw new Error(LLM_SAVED_API_KEY_DECRYPT_FAILED_MESSAGE);
  }

  const openai = createOpenAI({
    apiKey,
    baseURL: config.base_url,
    compatibility:
      compatibility.provider === "openai" ? "strict" : "compatible",
    name: compatibility.provider,
  });

  return {
    openai,
    model: config.model,
    provider: compatibility.provider,
    userId: config.user_id,
    configId: config.id,
    temperature: config.temperature,
    maxTokens: config.max_tokens,
  };
}
