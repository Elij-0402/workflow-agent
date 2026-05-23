import { decrypt, maskApiKey } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/server";

import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: config } = await supabase
    .from("llm_config")
    .select(
      "id, base_url, api_key_encrypted, model, temperature, max_tokens, updated_at"
    )
    .maybeSingle();

  let maskedApiKey: string | null = null;
  if (config?.api_key_encrypted) {
    try {
      maskedApiKey = maskApiKey(await decrypt(config.api_key_encrypted));
    } catch {
      maskedApiKey = "已保存";
    }
  }

  const status = config
    ? ({ kind: "saved", updatedAt: config.updated_at } as const)
    : ({ kind: "unconfigured" } as const);

  return (
    <SettingsForm
      initialConfig={
        config
          ? {
              base_url: config.base_url,
              model: config.model,
              temperature: config.temperature,
              max_tokens: config.max_tokens,
            }
          : null
      }
      maskedApiKey={maskedApiKey}
      status={status}
    />
  );
}
