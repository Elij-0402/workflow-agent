const DEFAULT_PRICES_CNY_PER_1K = {
  input: 0.002,
  output: 0.006,
};

export type LLMUsage = {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
};

export function normalizeUsage(usage: {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}): LLMUsage {
  const promptTokens = Number.isFinite(usage.promptTokens)
    ? Number(usage.promptTokens)
    : null;
  const completionTokens = Number.isFinite(usage.completionTokens)
    ? Number(usage.completionTokens)
    : null;
  const totalTokens = Number.isFinite(usage.totalTokens)
    ? Number(usage.totalTokens)
    : promptTokens !== null || completionTokens !== null
      ? (promptTokens ?? 0) + (completionTokens ?? 0)
      : null;

  return { promptTokens, completionTokens, totalTokens };
}

export function estimateUsageCostCNY(usage: LLMUsage) {
  if (usage.promptTokens === null && usage.completionTokens === null)
    return null;
  const input =
    ((usage.promptTokens ?? 0) / 1000) * DEFAULT_PRICES_CNY_PER_1K.input;
  const output =
    ((usage.completionTokens ?? 0) / 1000) * DEFAULT_PRICES_CNY_PER_1K.output;
  return Math.round((input + output) * 10000) / 10000;
}
