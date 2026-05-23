import type { ZodTypeAny } from "zod";

import {
  CharactersResultSchema,
  NarrativeResultSchema,
  WorldviewResultSchema,
  type AnalysisDimension,
} from "@/lib/types";
import { SYSTEM_PROMPT as CHARACTERS_PROMPT } from "./characters";
import { SYSTEM_PROMPT as NARRATIVE_PROMPT } from "./narrative";
import { SYSTEM_PROMPT as WORLDVIEW_PROMPT } from "./worldview";

export const ANALYSIS_TEXT_CHAR_LIMIT = 80_000;

export const ANALYSIS_DIMENSION_CONFIG: Record<
  AnalysisDimension,
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
