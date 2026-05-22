import type { ZodTypeAny } from "zod";

import {
  CharactersResultSchema,
  EmotionArcResultSchema,
  NarrativeResultSchema,
  PacingMapResultSchema,
  ProseCraftResultSchema,
  SuspenseGridResultSchema,
  WorldviewResultSchema,
  type ExtendedAnalysisDimension,
  type LegacyAnalysisDimension,
} from "@/lib/types";
import { SYSTEM_PROMPT as CHARACTERS_PROMPT } from "./characters";
import {
  COMPARE_INSIGHTS_SYSTEM_PROMPT,
  CompareInsightsResultSchema,
} from "./compare-insights";
import { SYSTEM_PROMPT as EMOTION_ARC_PROMPT } from "./emotion-arc";
import { SYSTEM_PROMPT as NARRATIVE_PROMPT } from "./narrative";
import { SYSTEM_PROMPT as PACING_MAP_PROMPT } from "./pacing-map";
import { SYSTEM_PROMPT as PROSE_CRAFT_PROMPT } from "./prose-craft";
import { SYSTEM_PROMPT as SUSPENSE_GRID_PROMPT } from "./suspense-grid";
import { SYSTEM_PROMPT as WORLDVIEW_PROMPT } from "./worldview";

export const ANALYSIS_TEXT_CHAR_LIMIT = 80_000;

export const ANALYSIS_DIMENSION_CONFIG: Record<
  LegacyAnalysisDimension,
  {
    systemPrompt: string;
    schema: ZodTypeAny;
  }
> = {
  worldview: {
    systemPrompt: WORLDVIEW_PROMPT,
    schema: WorldviewResultSchema,
  },
  characters: {
    systemPrompt: CHARACTERS_PROMPT,
    schema: CharactersResultSchema,
  },
  narrative: {
    systemPrompt: NARRATIVE_PROMPT,
    schema: NarrativeResultSchema,
  },
};

export const EXTENDED_ANALYSIS_DIMENSION_CONFIG: Record<
  ExtendedAnalysisDimension,
  {
    systemPrompt: string;
    schema: ZodTypeAny;
  }
> = {
  prose_craft: {
    systemPrompt: PROSE_CRAFT_PROMPT,
    schema: ProseCraftResultSchema,
  },
  emotion_arc: {
    systemPrompt: EMOTION_ARC_PROMPT,
    schema: EmotionArcResultSchema,
  },
  pacing_map: {
    systemPrompt: PACING_MAP_PROMPT,
    schema: PacingMapResultSchema,
  },
  suspense_grid: {
    systemPrompt: SUSPENSE_GRID_PROMPT,
    schema: SuspenseGridResultSchema,
  },
};

export const COMPARE_INSIGHTS_CONFIG = {
  systemPrompt: COMPARE_INSIGHTS_SYSTEM_PROMPT,
  schema: CompareInsightsResultSchema,
} as const;
