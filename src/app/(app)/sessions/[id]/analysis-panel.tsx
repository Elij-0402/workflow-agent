"use client";

import { AnalysisAccordionPanel } from "./analysis-accordion-panel";
import type { LegacyAnalysisDimension, SessionStatus } from "@/lib/types";

type AnalysisRecord = {
  dimension: LegacyAnalysisDimension;
  result: unknown;
};

type PanelProps = {
  sessionId: string;
  analyses: AnalysisRecord[];
  llmConfigured: boolean;
  sessionStatus: SessionStatus;
};

export function AnalysisPanel(props: PanelProps) {
  return <AnalysisAccordionPanel variant="legacy" {...props} />;
}
