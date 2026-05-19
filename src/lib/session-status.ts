import type { SessionStatus } from "@/lib/types";

export function shouldEnterAnalyzingStatus(status: SessionStatus) {
  return status === "uploaded";
}

export function shouldEnterGeneratingStatus(status: SessionStatus) {
  return status === "analyzed";
}

export function getSessionStatusAfterAnalysis(params: {
  analysisCount: number;
  totalAnalyses: number;
  variantCount: number;
}): SessionStatus {
  const { analysisCount, totalAnalyses, variantCount } = params;

  if (analysisCount >= totalAnalyses) {
    return variantCount > 0 ? "done" : "analyzed";
  }

  return "analyzing";
}

export function getSessionStatusAfterGenerateSuccess(): SessionStatus {
  return "done";
}

export function getSessionStatusAfterGenerateFailure(finalVariantCount: number): SessionStatus {
  return finalVariantCount > 0 ? "done" : "analyzed";
}
