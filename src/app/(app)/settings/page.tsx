import { decrypt, maskApiKey } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/server";

import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: config } = await supabase
    .from("llm_config")
    .select(
      "id, base_url, api_key_encrypted, model, temperature, max_tokens, updated_at, last_validated_at, last_connection_ok_at, last_connection_error, last_connection_status",
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

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: usageRows } = config
    ? await supabase
        .from("llm_usage_events")
        .select("success, estimated_cost_cny")
        .eq("llm_config_id", config.id)
        .gte("created_at", since)
    : { data: [] };

  const usageSummary = {
    calls: usageRows?.length ?? 0,
    failures: (usageRows ?? []).filter((row) => row.success === false).length,
    estimatedCostCNY: Math.round(
      ((usageRows ?? []).reduce((sum, row) => sum + Number(row.estimated_cost_cny ?? 0), 0) *
        100) /
        100,
    ),
  };

  const status = !config
    ? ({ kind: "unconfigured" } as const)
    : config.last_connection_status === "ok"
      ? ({
          kind: "ok",
          updatedAt: config.updated_at,
          lastValidatedAt: config.last_validated_at,
          lastConnectionOkAt: config.last_connection_ok_at,
        } as const)
      : config.last_connection_status === "error"
        ? ({
            kind: "error",
            updatedAt: config.updated_at,
            lastValidatedAt: config.last_validated_at,
            detail: config.last_connection_error ?? "最近一次验证失败",
          } as const)
        : ({
            kind: "unverified",
            updatedAt: config.updated_at,
          } as const);

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
      usageSummary={usageSummary}
    />
  );
}
