import { z } from "zod";

export const LLMProviderSchema = z.enum([
  "openai",
  "deepseek",
  "custom",
]);
export type LLMProvider = z.infer<typeof LLMProviderSchema>;

export const LLM_CONFIG_REQUIRED_MESSAGE = "请先在设置页完成兼容模型配置。";
export const LLM_BASE_URL_FORMAT_MESSAGE = "Base URL 格式错误。";
export const LLM_INCOMPATIBLE_BASE_URL_MESSAGE =
  "该 Base URL 不属于 OpenAI-compatible 接口，请改用兼容端点。";
export const LLM_SAVED_API_KEY_DECRYPT_FAILED_MESSAGE =
  "已保存的 API Key 无法解密，请重新填写。";

export const LLMConfigFormSchema = z.object({
  base_url: z.string().trim().url("Base URL 格式错误"),
  api_key: z.string().min(1, "请填写 API Key"),
  model: z.string().trim().min(1, "请选择模型"),
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().int().min(256).max(200000).default(4096),
});

export const LLMConfigUpdateFormSchema = LLMConfigFormSchema.extend({
  api_key: z.string(),
});

export type LLMConfigForm = z.infer<typeof LLMConfigFormSchema>;
export type LLMConfigUpdateForm = z.infer<typeof LLMConfigUpdateFormSchema>;

export type LLMConfig = {
  id: string;
  user_id: string;
  provider: LLMProvider;
  base_url: string;
  api_key_encrypted: string;
  model: string;
  temperature: number;
  max_tokens: number;
  created_at: string;
  updated_at: string;
};

export type LegacyPresetMigrationCandidate = {
  id: string;
  is_default: boolean;
  created_at: string;
};

export function selectLegacyPresetForMigration(
  presets: LegacyPresetMigrationCandidate[]
) {
  if (presets.length === 0) return null;

  return [...presets].sort((a, b) => {
    if (a.is_default !== b.is_default) {
      return a.is_default ? -1 : 1;
    }
    return (
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  })[0];
}

export function parseLLMConfigFormData(
  formData: FormData,
  options?: { allowEmptyApiKey?: boolean }
) {
  const schema = options?.allowEmptyApiKey
    ? LLMConfigUpdateFormSchema
    : LLMConfigFormSchema;

  return schema.parse({
    base_url: String(formData.get("base_url") ?? "").trim(),
    api_key: String(formData.get("api_key") ?? ""),
    model: String(formData.get("model") ?? "").trim(),
    temperature: Number(formData.get("temperature") ?? 0.7),
    max_tokens: Number(formData.get("max_tokens") ?? 4096),
  });
}

export function deriveProvider(baseUrl: string): LLMProvider {
  let host: string;
  try {
    host = new URL(baseUrl).hostname.toLowerCase();
  } catch {
    return "custom";
  }
  if (host === "api.openai.com") return "openai";
  if (host === "api.deepseek.com") return "deepseek";
  return "custom";
}

export function validateCompatibleBaseUrl(baseUrl: string) {
  let host: string;
  try {
    host = new URL(baseUrl).hostname.toLowerCase();
  } catch {
    return {
      ok: false as const,
      message: LLM_BASE_URL_FORMAT_MESSAGE,
    };
  }

  if (host === "api.anthropic.com") {
    return {
      ok: false as const,
      message: LLM_INCOMPATIBLE_BASE_URL_MESSAGE,
    };
  }

  return {
    ok: true as const,
    provider: deriveProvider(baseUrl),
  };
}

export function isUserFixableLLMConfigMessage(message: string) {
  return (
    message === LLM_CONFIG_REQUIRED_MESSAGE ||
    message === LLM_INCOMPATIBLE_BASE_URL_MESSAGE ||
    message === LLM_SAVED_API_KEY_DECRYPT_FAILED_MESSAGE
  );
}

export function normalizeModelsPayload(payload: unknown): string[] {
  const raw = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown })?.data)
      ? ((payload as { data: unknown[] }).data)
      : Array.isArray((payload as { models?: unknown })?.models)
        ? ((payload as { models: unknown[] }).models)
        : [];
  const ids = raw
    .map((m) => {
      if (typeof m === "string") return m;
      const candidate = (m as { id?: unknown })?.id;
      return typeof candidate === "string" ? candidate : null;
    })
    .filter((s): s is string => typeof s === "string" && s.length > 0);
  return Array.from(new Set(ids))
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 100);
}
