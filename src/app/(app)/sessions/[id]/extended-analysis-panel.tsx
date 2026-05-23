"use client";

import { AnalysisAccordionPanel } from "./analysis-accordion-panel";
import type { ExtendedAnalysisDimension } from "@/lib/types";

type AnalysisRecord = {
  dimension: ExtendedAnalysisDimension;
  result: unknown;
};

type Props = {
  bookId: string;
  analyses: AnalysisRecord[];
  llmConfigured: boolean;
  disabled?: boolean;
};

export function ExtendedAnalysisPanel(props: Props) {
  return <AnalysisAccordionPanel variant="extended" {...props} />;
}
