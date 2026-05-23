import type { AnalysisDimension } from "@/lib/types";

import { CharactersPanel } from "./characters-panel";
import { EmotionArcPanel } from "./emotion-arc-panel";
import { NarrativePanel } from "./narrative-panel";
import { PacingMapPanel } from "./pacing-map-panel";
import { ProseCraftPanel } from "./prose-craft-panel";
import { InvalidResultNotice } from "./shared";
import { SuspenseGridPanel } from "./suspense-grid-panel";
import { WorldviewPanel } from "./worldview-panel";

type AnalysisDetailProps = {
  dimension: AnalysisDimension;
  result: unknown;
};

export function AnalysisDetail({ dimension, result }: AnalysisDetailProps) {
  switch (dimension) {
    case "worldview":
      return <WorldviewPanel result={result} />;
    case "characters":
      return <CharactersPanel result={result} />;
    case "narrative":
      return <NarrativePanel result={result} />;
    case "prose_craft":
      return <ProseCraftPanel result={result} />;
    case "emotion_arc":
      return <EmotionArcPanel result={result} />;
    case "pacing_map":
      return <PacingMapPanel result={result} />;
    case "suspense_grid":
      return <SuspenseGridPanel result={result} />;
    case "chapter_brief":
    case "book_synthesis":
    default:
      return <InvalidResultNotice />;
  }
}
