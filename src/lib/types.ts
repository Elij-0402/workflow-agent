import { z } from "zod";
import type { LLMConfig, LLMProvider } from "@/lib/llm-config";

// ============================================================================
// Domain
// ============================================================================
export type SessionStatus =
  | "draft"
  | "uploaded"
  | "analyzing"
  | "analyzed"
  | "generating"
  | "done";

export type AnalysisDimension =
  | "worldview"
  | "characters"
  | "narrative"
  | "chapter_brief"
  | "book_synthesis";

export const LEGACY_ANALYSIS_DIMENSIONS = [
  "worldview",
  "characters",
  "narrative",
] as const satisfies readonly AnalysisDimension[];

export type LegacyAnalysisDimension = (typeof LEGACY_ANALYSIS_DIMENSIONS)[number];

export type AnalysisScope = "book" | "chapter";

export const ANALYSIS_DIMENSIONS = LEGACY_ANALYSIS_DIMENSIONS;

export const DIMENSION_LABELS: Record<AnalysisDimension, string> = {
  worldview: "世界观",
  characters: "人物",
  narrative: "叙事",
  chapter_brief: "章节抽取",
  book_synthesis: "整书汇总",
};

export type SessionMode = "single" | "dual";

// ============================================================================
// Analysis result schemas (LLM 必须返回该结构)
// ============================================================================
export const WorldviewResultSchema = z.object({
  type: z.string().describe("世界类型：现代/架空/科幻/奇幻/历史/末日 等"),
  setting: z.string().describe("时代背景与技术水平摘要"),
  locations: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        importance: z.enum(["low", "medium", "high"]),
      })
    )
    .describe("主要地理场景"),
  power_system: z.string().describe("权力/魔法/科技体系简述").optional(),
  rules: z.array(z.string()).describe("核心世界法则").default([]),
  summary: z.string().describe("一段话总结整体世界观"),
});
export type WorldviewResult = z.infer<typeof WorldviewResultSchema>;

export const CharactersResultSchema = z.object({
  characters: z.array(
    z.object({
      name: z.string(),
      role: z.enum(["protagonist", "antagonist", "supporting"]),
      traits: z.array(z.string()),
      background: z.string(),
      description: z.string(),
    })
  ),
  relationships: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      type: z.string().describe("盟友/对立/爱情/亲情/师徒 等"),
      description: z.string(),
    })
  ),
  summary: z.string(),
});
export type CharactersResult = z.infer<typeof CharactersResultSchema>;

export const NarrativeResultSchema = z.object({
  structure: z
    .string()
    .describe("情节结构类型：英雄之旅/三幕式/起承转合/非线性"),
  viewpoint: z.string().describe("叙事视角：第一/第三有限/全知/混合"),
  pacing: z.string().describe("节奏特点描述"),
  themes: z.array(z.string()).describe("主题与母题"),
  turning_points: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      impact: z.number().min(1).max(10),
    })
  ),
  conflicts: z
    .array(z.string())
    .describe("核心冲突：人vs人 / 人vs自然 / 人vs社会 / 人vs自我"),
  summary: z.string(),
});
export type NarrativeResult = z.infer<typeof NarrativeResultSchema>;

export const ChapterBriefResultSchema = z.object({
  summary: z.string(),
  scenes: z
    .array(
      z.object({
        place: z.string(),
        time: z.string().optional(),
        description: z.string(),
      })
    )
    .default([]),
  characters_appeared: z
    .array(
      z.object({
        name: z.string(),
        action: z.string(),
      })
    )
    .default([]),
  events: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        is_turning_point: z.boolean().default(false),
      })
    )
    .default([]),
  conflicts: z.array(z.string()).default([]),
  viewpoint: z.string().optional(),
  themes_hints: z.array(z.string()).default([]),
  blueprint_candidates: z
    .array(
      z.object({
        section: z.enum([
          "characters",
          "relationships",
          "world_rules",
          "conflicts",
          "plot_beats",
          "viewpoint",
          "themes",
        ]),
        title: z.string(),
        payload: z.unknown(),
      })
    )
    .default([]),
});
export type ChapterBriefResult = z.infer<typeof ChapterBriefResultSchema>;

export const BookSynthesisResultSchema = z.object({
  characters: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      traits: z.array(z.string()).default([]),
      description: z.string(),
    })
  ),
  relationships: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      type: z.string(),
      description: z.string(),
    })
  ),
  world_rules: z.array(
    z.object({
      rule: z.string(),
      description: z.string(),
    })
  ),
  conflicts: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    })
  ),
  plot_beats: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      order: z.number().int(),
    })
  ),
  viewpoint: z.object({
    mode: z.string(),
    pacing: z.string(),
  }),
  themes: z.array(z.string()),
});
export type BookSynthesisResult = z.infer<typeof BookSynthesisResultSchema>;

// ============================================================================
// Generate variant
// ============================================================================
export const GenerateConfigSchema = z.object({
  strategy: z
    .enum(["a-dominant", "balanced", "theme-graft"])
    .default("balanced"),
  innovation: z.number().int().min(1).max(10).default(5),
  viewpoint: z
    .enum(["keep", "first-person", "third-limited", "omniscient"])
    .default("keep"),
  style: z
    .enum(["keep", "modern", "classical", "web-novel"])
    .default("keep"),
  output_scope: z
    .enum(["single-chapter", "outline", "three-chapters"])
    .default("single-chapter"),
  extra_instructions: z.string().max(800).default(""),
});
export type GenerateConfig = z.infer<typeof GenerateConfigSchema>;

export const VariantResultSchema = z.object({
  title: z.string().default(""),
  content: z.string().min(1),
});
export type VariantResult = z.infer<typeof VariantResultSchema>;

export type GenerateAnalyses = {
  worldview: WorldviewResult;
  characters: CharactersResult;
  narrative: NarrativeResult;
};

// ============================================================================
// Supabase Database types (minimal, hand-rolled — replace with generated types later)
// ============================================================================
export type Database = {
  public: {
    Tables: {
      llm_config: {
        Row: LLMConfig;
        Insert: Omit<LLMConfig, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<LLMConfig, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          status: SessionStatus;
          mode: SessionMode;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string;
          status?: SessionStatus;
          mode?: SessionMode;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          name: string;
          status: SessionStatus;
          mode: SessionMode;
          updated_at: string;
        }>;
        Relationships: [];
      };
      books: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          title: string;
          storage_path: string;
          position: number;
          word_count: number | null;
          chapter_count: number | null;
          metadata: Record<string, unknown>;
          cleaned_content: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          title: string;
          storage_path: string;
          position?: number;
          word_count?: number | null;
          chapter_count?: number | null;
          metadata?: Record<string, unknown>;
          cleaned_content?: string | null;
          created_at?: string;
        };
        Update: Partial<{
          title: string;
          position: number;
          word_count: number | null;
          chapter_count: number | null;
          metadata: Record<string, unknown>;
          cleaned_content: string | null;
        }>;
        Relationships: [];
      };
      chapters: {
        Row: {
          id: string;
          book_id: string;
          user_id: string;
          index: number;
          title: string;
          start_char: number;
          end_char: number;
          source: "regex" | "length-chunk" | "manual";
          created_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          user_id: string;
          index: number;
          title: string;
          start_char: number;
          end_char: number;
          source: "regex" | "length-chunk" | "manual";
          created_at?: string;
        };
        Update: Partial<{
          index: number;
          title: string;
          start_char: number;
          end_char: number;
          source: "regex" | "length-chunk" | "manual";
        }>;
        Relationships: [];
      };
      analyses: {
        Row: {
          id: string;
          book_id: string;
          user_id: string;
          dimension: AnalysisDimension;
          scope: AnalysisScope;
          chapter_id: string | null;
          result: unknown;
          llm_config_id: string | null;
          prompt_tokens: number | null;
          completion_tokens: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          user_id: string;
          dimension: AnalysisDimension;
          scope?: AnalysisScope;
          chapter_id?: string | null;
          result: unknown;
          llm_config_id?: string | null;
          prompt_tokens?: number | null;
          completion_tokens?: number | null;
          created_at?: string;
        };
        Update: Partial<{
          result: unknown;
          prompt_tokens: number | null;
          completion_tokens: number | null;
        }>;
        Relationships: [];
      };
      variants: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          title: string;
          config: GenerateConfig;
          content: string;
          word_count: number | null;
          llm_config_id: string | null;
          blueprint_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          title?: string;
          config: GenerateConfig;
          content: string;
          word_count?: number | null;
          llm_config_id?: string | null;
          blueprint_id?: string | null;
          created_at?: string;
        };
        Update: Partial<{
          title: string;
          content: string;
          word_count: number | null;
        }>;
        Relationships: [];
      };
      blueprints: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          status: "draft" | "confirmed";
          sections: unknown;
          confirmed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          status?: "draft" | "confirmed";
          sections?: unknown;
          confirmed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          status: "draft" | "confirmed";
          sections: unknown;
          confirmed_at: string | null;
          updated_at: string;
        }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
export type BookRow = Database["public"]["Tables"]["books"]["Row"];
export type ChapterRow = Database["public"]["Tables"]["chapters"]["Row"];
export type AnalysisRow = Database["public"]["Tables"]["analyses"]["Row"];
export type VariantRow = Database["public"]["Tables"]["variants"]["Row"];
export type BlueprintRow = Database["public"]["Tables"]["blueprints"]["Row"];
