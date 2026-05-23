import { z } from "zod";

export const LLMProviderSchema = z.enum([
  "openai",
  "deepseek",
  "anthropic",
  "custom",
]);
export type LLMProvider = z.infer<typeof LLMProviderSchema>;

export const LLMConfigFormSchema = z.object({
  provider: LLMProviderSchema,
  base_url: z.string().trim().url("Base URL 格式错误"),
  api_key: z.string().min(1, "请填写 API Key"),
  model: z.string().trim().min(1, "请填写模型 ID"),
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
    provider: String(formData.get("provider") ?? "openai"),
    base_url: String(formData.get("base_url") ?? "").trim(),
    api_key: String(formData.get("api_key") ?? ""),
    model: String(formData.get("model") ?? "").trim(),
    temperature: Number(formData.get("temperature") ?? 0.7),
    max_tokens: Number(formData.get("max_tokens") ?? 4096),
  });
}
