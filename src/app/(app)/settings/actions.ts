"use server";

import { ZodError } from "zod";

import { encrypt } from "@/lib/crypto";
import { parseLLMConfigFormData } from "@/lib/llm-config";
import { createClient } from "@/lib/supabase/server";

export async function saveLLMConfig(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "请先登录。" };
  }

  const { data: existing, error: existingError } = await supabase
    .from("llm_config")
    .select("id, api_key_encrypted")
    .maybeSingle();

  if (existingError) {
    return { error: "读取现有配置失败，请稍后再试。" };
  }

  let parsed;
  try {
    parsed = parseLLMConfigFormData(formData, {
      allowEmptyApiKey: Boolean(existing?.api_key_encrypted),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return { error: error.issues[0]?.message ?? "配置填写不完整。" };
    }
    return { error: "配置填写不完整。" };
  }

  const encryptedApiKey = parsed.api_key
    ? await encrypt(parsed.api_key)
    : existing?.api_key_encrypted;

  if (!encryptedApiKey) {
    return { error: "请填写 API Key。" };
  }

  const payload = {
    provider: parsed.provider,
    base_url: parsed.base_url,
    api_key_encrypted: encryptedApiKey,
    model: parsed.model,
    temperature: parsed.temperature,
    max_tokens: parsed.max_tokens,
  };

  const query = existing
    ? supabase.from("llm_config").update(payload).eq("id", existing.id)
    : supabase.from("llm_config").insert({
        user_id: user.id,
        ...payload,
      });

  const { error } = await query;
  if (error) {
    return { error: "保存失败，请检查配置后重试。" };
  }

  return { ok: true, message: "LLM 配置已保存。" };
}
