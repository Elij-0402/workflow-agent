"use server";

import { ZodError } from "zod";

import { decrypt, encrypt } from "@/lib/crypto";
import {
  LLM_SAVED_API_KEY_DECRYPT_FAILED_MESSAGE,
  normalizeModelsPayload,
  parseLLMConfigFormData,
  validateCompatibleBaseUrl,
} from "@/lib/llm-config";
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

  const compatibility = validateCompatibleBaseUrl(parsed.base_url);
  if (!compatibility.ok) {
    return { error: compatibility.message };
  }

  const encryptedApiKey = parsed.api_key
    ? await encrypt(parsed.api_key)
    : existing?.api_key_encrypted;

  if (!encryptedApiKey) {
    return { error: "请填写 API Key。" };
  }

  const payload = {
    provider: compatibility.provider,
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

export async function fetchAvailableModels(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "请先登录。" };
  }

  const baseUrl = String(formData.get("base_url") ?? "").trim();
  const typedKey = String(formData.get("api_key") ?? "");

  if (!baseUrl) {
    return { error: "请先填写 Base URL。" };
  }

  const compatibility = validateCompatibleBaseUrl(baseUrl);
  if (!compatibility.ok) {
    return { error: compatibility.message };
  }

  let apiKey = typedKey;
  if (!apiKey) {
    const { data: existing } = await supabase
      .from("llm_config")
      .select("api_key_encrypted")
      .maybeSingle();
    if (!existing?.api_key_encrypted) {
      return { error: "请先填写 API Key。" };
    }
    try {
      apiKey = await decrypt(existing.api_key_encrypted);
    } catch {
      return { error: LLM_SAVED_API_KEY_DECRYPT_FAILED_MESSAGE };
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  const url = baseUrl.replace(/\/+$/, "") + "/models";

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });
  } catch {
    clearTimeout(timer);
    return { error: "无法连接到该接口，请检查 Base URL。" };
  }
  clearTimeout(timer);

  if (res.status === 401 || res.status === 403) {
    return { error: "鉴权失败，请检查 API Key。" };
  }
  if (res.status === 404) {
    return { error: "该 Base URL 未提供 /models 接口。" };
  }
  if (!res.ok) {
    return { error: `服务端返回 ${res.status}，请稍后再试。` };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { error: "返回内容不是合法 JSON。" };
  }

  const models = normalizeModelsPayload(json);
  if (models.length === 0) {
    return { error: "未找到可用模型" };
  }

  return { ok: true as const, models };
}
