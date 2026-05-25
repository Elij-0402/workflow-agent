import type { LLMProvider } from "@/lib/llm-config";

export function resolveStructuredObjectMode(
  provider: LLMProvider,
): "auto" | "json" {
  return provider === "deepseek" ? "json" : "auto";
}
