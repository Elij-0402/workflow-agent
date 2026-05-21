import { z } from "zod";

// ----------------------------------------------------------------------------
// Persona directives — 人设改造
// ----------------------------------------------------------------------------
export const PersonaDirectiveSchema = z.object({
  id: z.string().min(1),
  character_name: z.string().min(1).describe("目标角色名（蓝图人物 name，或自定义新角色）"),
  change_type: z.enum(["replace", "modify", "add", "remove"]),
  fields: z
    .object({
      gender: z.string().optional(),
      age: z.string().optional(),
      personality: z.string().optional(),
      motivation: z.string().optional(),
      background: z.string().optional(),
      note: z.string().optional(),
    })
    .default({}),
});
export type PersonaDirective = z.infer<typeof PersonaDirectiveSchema>;

// ----------------------------------------------------------------------------
// Plot directives — 情节调整
// ----------------------------------------------------------------------------
export const PlotDirectiveSchema = z.object({
  id: z.string().min(1),
  target_beat_id: z.string().optional().describe("蓝图 plot_beat id；新插入留空"),
  action: z.enum(["keep", "replace", "delete", "insert_before", "insert_after", "reorder"]),
  new_beat: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      order: z.number().int().optional(),
    })
    .optional(),
  note: z.string().optional(),
});
export type PlotDirective = z.infer<typeof PlotDirectiveSchema>;

// ----------------------------------------------------------------------------
// Style directives — 文风
// ----------------------------------------------------------------------------
export const StyleDirectiveSchema = z.object({
  tone: z
    .enum(["keep", "lyrical", "plain", "humorous", "ironic", "noir", "classical"])
    .default("keep"),
  rhythm: z.enum(["keep", "slow", "moderate", "fast"]).default("keep"),
  dialogue_ratio: z.enum(["keep", "more_dialogue", "less_dialogue"]).default("keep"),
  sensory_density: z.enum(["keep", "sparse", "rich"]).default("keep"),
  prose_register: z
    .enum(["keep", "modern", "web_novel", "literary", "classical_chinese"])
    .default("keep"),
  extra_instructions: z.string().max(800).default(""),
});
export type StyleDirective = z.infer<typeof StyleDirectiveSchema>;

// ----------------------------------------------------------------------------
// Retention rules — 哪些蓝图节点必保 / 偏保 / 可改
// ----------------------------------------------------------------------------
export const RetentionRuleSchema = z.object({
  id: z.string().min(1),
  section: z.enum([
    "characters",
    "relationships",
    "world_rules",
    "conflicts",
    "plot_beats",
    "themes",
  ]),
  target_ids: z.array(z.string()).default([]).describe("蓝图节点 id 列表；空数组=整段"),
  strictness: z.enum(["must_keep", "prefer_keep", "flexible"]),
  note: z.string().optional(),
});
export type RetentionRule = z.infer<typeof RetentionRuleSchema>;

// ----------------------------------------------------------------------------
// Top-level CreativeBrief
// ----------------------------------------------------------------------------
export const CreativeBriefSchema = z.object({
  title: z.string().min(1).max(100).default("未命名简报"),
  persona_directives: z.array(PersonaDirectiveSchema).default([]),
  plot_directives: z.array(PlotDirectiveSchema).default([]),
  style_directives: StyleDirectiveSchema.default({
    tone: "keep",
    rhythm: "keep",
    dialogue_ratio: "keep",
    sensory_density: "keep",
    prose_register: "keep",
    extra_instructions: "",
  }),
  retention_rules: z.array(RetentionRuleSchema).default([]),
});
export type CreativeBrief = z.infer<typeof CreativeBriefSchema>;

export const CreativeBriefStatusSchema = z.enum(["draft", "active", "archived"]);
export type CreativeBriefStatus = z.infer<typeof CreativeBriefStatusSchema>;

export type CreativeBriefRow = {
  id: string;
  user_id: string;
  session_id: string;
  title: string;
  persona_directives: PersonaDirective[];
  plot_directives: PlotDirective[];
  style_directives: StyleDirective;
  retention_rules: RetentionRule[];
  status: CreativeBriefStatus;
  created_at: string;
  updated_at: string;
};
