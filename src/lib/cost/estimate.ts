export function estimateChapterBatchCost(opts: {
  chapterCount: number;
  avgCharsPerChapter: number;
  pricePer1kInputTokens?: number;
  pricePer1kOutputTokens?: number;
  approxTokensPerChar?: number;
}) {
  const tokensPerChar = opts.approxTokensPerChar ?? 0.6;
  const inputTokens =
    opts.chapterCount * opts.avgCharsPerChapter * tokensPerChar;
  const outputTokens = opts.chapterCount * 600;
  const inputPrice = opts.pricePer1kInputTokens ?? 0.002;
  const outputPrice = opts.pricePer1kOutputTokens ?? 0.006;
  const cny =
    (inputTokens / 1000) * inputPrice + (outputTokens / 1000) * outputPrice;
  return {
    calls: opts.chapterCount,
    estimatedInputTokens: Math.round(inputTokens),
    estimatedOutputTokens: Math.round(outputTokens),
    estimatedCNY: Math.round(cny * 100) / 100,
  };
}
