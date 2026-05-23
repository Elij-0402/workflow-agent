"use server";

import { ZodError } from "zod";

import { decrypt, encrypt } from "@/lib/crypto";
import { LLMError, type LLMClientError } from "@/lib/llm/errors";
import {
  LLM_SAVED_API_KEY_DECRYPT_FAILED_MESSAGE,
  normalizeModelsPayload,
  parseLLMConfigFormData,
  validateCompatibleBaseUrl,
} from "@/lib/llm-config";
import { createClient } from "@/lib/supabase/server";

type ActionFailure = { error: LLMClientError };
type SaveConfigResult = ActionFailure | { ok: true; message: string };
type ProbeResult = ActionFailure | { ok: true; reachable: boolean; supportsModels: boolean; message: string };
type FetchModelsResult =
  | ActionFailure
  | {
      ok: true;
      models: string[];
      reachable: boolean;
      supportsModels: boolean;
      message: string;
    };

function clientError(
  code: LLMClientError["code"],
  userMessage: string,
  opts?: Partial<LLMClientError>,
): LLMClientError {
  return {
    code,
    userMessage,
    retryable: opts?.retryable ?? false,
    action: opts?.action,
    providerStatus: opts?.providerStatus,
  };
}

async function updateConnectionStatus(
  configId: string,
  next: {
    last_connection_status: "unverified" | "ok" | "error";
    last_connection_error: string | null;
    last_validated_at?: string | null;
    last_connection_ok_at?: string | null;
  },
) {
  const supabase = await createClient();
  await supabase.from("llm_config").update(next).eq("id", configId);
}

async function resolveApiKey(supabase: Awaited<ReturnType<typeof createClient>>, typedKey: string) {
  if (typedKey) return typedKey;

  const { data: existing } = await supabase
    .from("llm_config")
    .select("api_key_encrypted")
    .maybeSingle();
  if (!existing?.api_key_encrypted) {
    throw new LLMError(clientError("llm_api_key_invalid", "请先填写 API Key。"), 400);
  }
  try {
    return await decrypt(existing.api_key_encrypted);
  } catch {
    throw new LLMError(
      clientError("llm_api_key_unreadable", LLM_SAVED_API_KEY_DECRYPT_FAILED_MESSAGE, {
        action: "open_settings",
      }),
      409,
    );
  }
}

function buildChatProbePayload(model: string) {
  return {
    model,
    messages: [{ role: "user", content: "ping" }],
    max_tokens: 1,
    temperature: 0,
  };
}

async function fetchJsonWithTimeout(url: string, init: RequestInit, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

async function probeEndpoint(opts: { baseUrl: string; apiKey: string; model?: string }) {
  const authHeaders = {
    Authorization: `Bearer ${opts.apiKey}`,
    Accept: "application/json",
  };
  const normalizedBaseUrl = opts.baseUrl.replace(/\/+$/, "");
  const modelsUrl = `${normalizedBaseUrl}/models`;

  try {
    const res = await fetchJsonWithTimeout(modelsUrl, { headers: authHeaders });
    if (res.status === 401 || res.status === 403) {
      throw new LLMError(
        clientError("llm_api_key_invalid", "鉴权失败，请检查 API Key。", {
          providerStatus: res.status,
          action: "open_settings",
        }),
        401,
      );
    }
    if (res.status === 404) {
      if (!opts.model) {
        return {
          reachable: false,
          supportsModels: false,
          models: [],
          message: "该接口未提供 /models，可直接手动输入模型名并保存。",
        };
      }

      const probeRes = await fetchJsonWithTimeout(`${normalizedBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildChatProbePayload(opts.model)),
      });

      if (probeRes.status === 401 || probeRes.status === 403) {
        throw new LLMError(
          clientError("llm_api_key_invalid", "鉴权失败，请检查 API Key。", {
            providerStatus: probeRes.status,
            action: "open_settings",
          }),
          401,
        );
      }
      if (!probeRes.ok) {
        throw new LLMError(
          clientError(
            "llm_connection_failed",
            `接口可访问，但模型探测失败（${probeRes.status}）。可直接保存后在实际调用中验证。`,
            {
              retryable: true,
              providerStatus: probeRes.status,
            },
          ),
          502,
        );
      }

      return {
        reachable: true,
        supportsModels: false,
        models: [],
        message: "接口已连通，但未提供 /models。可继续使用手动输入模型名。",
      };
    }

    if (!res.ok) {
      throw new LLMError(
        clientError("llm_connection_failed", `服务端返回 ${res.status}，请稍后再试。`, {
          retryable: res.status >= 500,
          providerStatus: res.status,
        }),
        502,
      );
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new LLMError(
        clientError("llm_provider_response_invalid", "返回内容不是合法 JSON。", {
          retryable: false,
        }),
        502,
      );
    }

    const models = normalizeModelsPayload(json);
    if (models.length === 0) {
      return {
        reachable: true,
        supportsModels: true,
        models: [],
        message: "接口已连通，但未返回可识别的模型列表。可改为手动输入模型名。",
      };
    }

    return {
      reachable: true,
      supportsModels: true,
      models,
      message: `已获取 ${models.length} 个模型`,
    };
  } catch (error) {
    if (error instanceof LLMError) throw error;
    throw new LLMError(
      clientError("llm_connection_failed", "无法连接到该接口，请检查 Base URL。", {
        retryable: true,
      }),
      502,
    );
  }
}

export async function saveLLMConfig(formData: FormData): Promise<SaveConfigResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: clientError("auth_required", "请先登录。") };
  }

  const { data: existing, error: existingError } = await supabase
    .from("llm_config")
    .select("id, api_key_encrypted, base_url, model")
    .maybeSingle();

  if (existingError) {
    return { error: clientError("internal_error", "读取现有配置失败，请稍后再试。", { retryable: true }) };
  }

  let parsed;
  try {
    parsed = parseLLMConfigFormData(formData, {
      allowEmptyApiKey: Boolean(existing?.api_key_encrypted),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        error: clientError("bad_request", error.issues[0]?.message ?? "配置填写不完整。"),
      };
    }
    return { error: clientError("bad_request", "配置填写不完整。") };
  }

  const compatibility = validateCompatibleBaseUrl(parsed.base_url);
  if (!compatibility.ok) {
    return { error: clientError("llm_config_invalid", compatibility.message, { action: "open_settings" }) };
  }

  const encryptedApiKey = parsed.api_key
    ? await encrypt(parsed.api_key)
    : existing?.api_key_encrypted;

  if (!encryptedApiKey) {
    return { error: clientError("llm_api_key_invalid", "请填写 API Key。") };
  }

  const connectionChanged =
    !existing ||
    parsed.base_url !== existing.base_url ||
    parsed.model !== existing.model ||
    Boolean(parsed.api_key);

  const payload = {
    provider: compatibility.provider,
    base_url: parsed.base_url,
    api_key_encrypted: encryptedApiKey,
    model: parsed.model,
    temperature: parsed.temperature,
    max_tokens: parsed.max_tokens,
  };

  const query = existing
    ? supabase
        .from("llm_config")
        .update(
          connectionChanged
            ? {
                ...payload,
                last_connection_status: "unverified",
                last_connection_error: null,
                last_validated_at: null,
              }
            : payload,
        )
        .eq("id", existing.id)
    : supabase.from("llm_config").insert({
        user_id: user.id,
        ...payload,
        last_validated_at: null,
        last_connection_ok_at: null,
        last_connection_error: null,
        last_connection_status: "unverified",
        encryption_version: 1,
      });

  const { error } = await query;
  if (error) {
    return { error: clientError("persistence_failed", "保存失败，请检查配置后重试。") };
  }

  return { ok: true, message: "LLM 配置已保存。" };
}

export async function testLLMConnection(formData: FormData): Promise<ProbeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: clientError("auth_required", "请先登录。") };
  }

  const baseUrl = String(formData.get("base_url") ?? "").trim();
  const typedKey = String(formData.get("api_key") ?? "");
  const model = String(formData.get("model") ?? "").trim();

  const compatibility = validateCompatibleBaseUrl(baseUrl);
  if (!compatibility.ok) {
    return { error: clientError("llm_config_invalid", compatibility.message, { action: "open_settings" }) };
  }

  try {
    const apiKey = await resolveApiKey(supabase, typedKey);
    const result = await probeEndpoint({ baseUrl, apiKey, model: model || undefined });
    const { data: existing } = await supabase.from("llm_config").select("id").maybeSingle();
    if (existing?.id) {
      await updateConnectionStatus(existing.id, {
        last_connection_status: result.reachable ? "ok" : "error",
        last_connection_error: result.reachable ? null : result.message,
        last_validated_at: new Date().toISOString(),
        last_connection_ok_at: result.reachable ? new Date().toISOString() : undefined,
      });
    }
    return {
      ok: true as const,
      reachable: result.reachable,
      supportsModels: result.supportsModels,
      message: result.message,
    };
  } catch (error) {
    const client = error instanceof LLMError ? error.toClientError() : clientError("llm_connection_failed", "无法连接到该接口，请检查 Base URL。", { retryable: true });
    const { data: existing } = await supabase.from("llm_config").select("id").maybeSingle();
    if (existing?.id) {
      await updateConnectionStatus(existing.id, {
        last_connection_status: "error",
        last_connection_error: client.userMessage,
        last_validated_at: new Date().toISOString(),
      });
    }
    return { error: client };
  }
}

export async function fetchAvailableModels(formData: FormData): Promise<FetchModelsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: clientError("auth_required", "请先登录。") };
  }

  const baseUrl = String(formData.get("base_url") ?? "").trim();
  const typedKey = String(formData.get("api_key") ?? "");
  const model = String(formData.get("model") ?? "").trim();

  if (!baseUrl) {
    return { error: clientError("bad_request", "请先填写 Base URL。") };
  }

  const compatibility = validateCompatibleBaseUrl(baseUrl);
  if (!compatibility.ok) {
    return { error: clientError("llm_config_invalid", compatibility.message, { action: "open_settings" }) };
  }

  try {
    const apiKey = await resolveApiKey(supabase, typedKey);
    const result = await probeEndpoint({ baseUrl, apiKey, model: model || undefined });
    const { data: existing } = await supabase.from("llm_config").select("id").maybeSingle();
    if (existing?.id) {
      await updateConnectionStatus(existing.id, {
        last_connection_status: result.reachable ? "ok" : "error",
        last_connection_error: result.reachable ? null : result.message,
        last_validated_at: new Date().toISOString(),
        last_connection_ok_at: result.reachable ? new Date().toISOString() : undefined,
      });
    }
    if (!result.supportsModels || result.models.length === 0) {
      return {
        ok: true as const,
        models: [],
        reachable: result.reachable,
        supportsModels: result.supportsModels,
        message: result.message,
      };
    }
    return {
      ok: true as const,
      models: result.models,
      reachable: result.reachable,
      supportsModels: result.supportsModels,
      message: result.message,
    };
  } catch (error) {
    const client =
      error instanceof LLMError
        ? error.toClientError()
        : clientError("llm_connection_failed", "无法连接到该接口，请检查 Base URL。", {
            retryable: true,
          });
    return { error: client };
  }
}
