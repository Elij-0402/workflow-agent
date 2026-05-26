import { z } from "zod";

// ----------------------------------------------------------------------------
// Persona directives — 人设改造
// ----------------------------------------------------------------------------
export const PersonaDirectiveSchema = z.object({
  id: z.string().min(1),
  character_name: z
    .string()
    .min(1)
    .describe("目标角色名（蓝图人物 name，或自定义新角色）"),
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
  target_beat_id: z
    .string()
    .optional()
    .describe("蓝图 plot_beat id；新插入留空"),
  action: z.enum([
    "keep",
    "replace",
    "delete",
    "insert_before",
    "insert_after",
    "reorder",
  ]),
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
    .enum([
      "keep",
      "lyrical",
      "plain",
      "humorous",
      "ironic",
      "noir",
      "classical",
    ])
    .default("keep"),
  rhythm: z.enum(["keep", "slow", "moderate", "fast"]).default("keep"),
  dialogue_ratio: z
    .enum(["keep", "more_dialogue", "less_dialogue"])
    .default("keep"),
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
  target_ids: z
    .array(z.string())
    .default([])
    .describe("蓝图节点 id 列表；空数组=整段"),
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

export const CreativeBriefStatusSchema = z.enum([
  "draft",
  "active",
  "archived",
]);
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

/**
 * 健壮解包器：安全解析数据库中 JSONB 格式的 CreativeBrief 数据。
 * 即使数据库中存有历史脏数据、模型格式生成偏差或新老字段不匹配，该函数也会执行优雅降级与属性防抖清洗，
 * 绝不对外抛出校验异常，力保前端页面正常渲染和交互。
 */
export function parseSafeBriefRow(row: any): CreativeBrief {
  if (!row || typeof row !== "object") {
    return {
      title: "未命名简报",
      persona_directives: [],
      plot_directives: [],
      style_directives: {
        tone: "keep",
        rhythm: "keep",
        dialogue_ratio: "keep",
        sensory_density: "keep",
        prose_register: "keep",
        extra_instructions: "",
      },
      retention_rules: [],
    };
  }

  const parsed = CreativeBriefSchema.safeParse({
    title: row.title,
    persona_directives: row.persona_directives,
    plot_directives: row.plot_directives,
    style_directives: row.style_directives,
    retention_rules: row.retention_rules,
  });

  if (parsed.success) {
    return {
      ...parsed.data,
      title: parsed.data.title.trim(),
    };
  }

  // 1. 人设改造降级处理
  const rawPersona = Array.isArray(row.persona_directives) ? row.persona_directives : [];
  const safePersona = rawPersona
    .filter((x: any) => x && typeof x === "object" && typeof x.character_name === "string" && x.character_name.trim())
    .map((x: any) => ({
      id: typeof x.id === "string" && x.id ? x.id : crypto.randomUUID(),
      character_name: x.character_name.trim(),
      change_type: ["replace", "modify", "add", "remove"].includes(x.change_type) ? x.change_type : "modify",
      fields: x.fields && typeof x.fields === "object" ? {
        gender: typeof x.fields.gender === "string" ? x.fields.gender : undefined,
        age: typeof x.fields.age === "string" ? x.fields.age : undefined,
        personality: typeof x.fields.personality === "string" ? x.fields.personality : undefined,
        motivation: typeof x.fields.motivation === "string" ? x.fields.motivation : undefined,
        background: typeof x.fields.background === "string" ? x.fields.background : undefined,
        note: typeof x.fields.note === "string" ? x.fields.note : undefined,
      } : {},
    }));

  // 2. 情节调整降级处理
  const rawPlot = Array.isArray(row.plot_directives) ? row.plot_directives : [];
  const safePlot = rawPlot
    .filter((x: any) => x && typeof x === "object")
    .map((x: any) => ({
      id: typeof x.id === "string" && x.id ? x.id : crypto.randomUUID(),
      target_beat_id: typeof x.target_beat_id === "string" ? x.target_beat_id : undefined,
      action: ["keep", "replace", "delete", "insert_before", "insert_after", "reorder"].includes(x.action) ? x.action : "keep",
      new_beat: x.new_beat && typeof x.new_beat === "object" ? {
        title: typeof x.new_beat.title === "string" ? x.new_beat.title : undefined,
        description: typeof x.new_beat.description === "string" ? x.new_beat.description : undefined,
        order: typeof x.new_beat.order === "number" ? x.new_beat.order : undefined,
      } : undefined,
      note: typeof x.note === "string" ? x.note : undefined,
    }));

  // 3. 文风微调降级处理
  const s = row.style_directives && typeof row.style_directives === "object" ? row.style_directives : {};
  const safeStyle = {
    tone: ["keep", "lyrical", "plain", "humorous", "ironic", "noir", "classical"].includes(s.tone) ? s.tone : "keep",
    rhythm: ["keep", "slow", "moderate", "fast"].includes(s.rhythm) ? s.rhythm : "keep",
    dialogue_ratio: ["keep", "more_dialogue", "less_dialogue"].includes(s.dialogue_ratio) ? s.dialogue_ratio : "keep",
    sensory_density: ["keep", "sparse", "rich"].includes(s.sensory_density) ? s.sensory_density : "keep",
    prose_register: ["keep", "modern", "web_novel", "literary", "classical_chinese"].includes(s.prose_register) ? s.prose_register : "keep",
    extra_instructions: typeof s.extra_instructions === "string" ? s.extra_instructions.slice(0, 800) : "",
  };

  // 4. 保留规则降级处理
  const rawRetention = Array.isArray(row.retention_rules) ? row.retention_rules : [];
  const safeRetention = rawRetention
    .filter((x: any) => x && typeof x === "object")
    .map((x: any) => ({
      id: typeof x.id === "string" && x.id ? x.id : crypto.randomUUID(),
      section: ["characters", "relationships", "world_rules", "conflicts", "plot_beats", "themes"].includes(x.section) ? x.section : "plot_beats",
      target_ids: Array.isArray(x.target_ids) ? x.target_ids.filter((id: any) => typeof id === "string") : [],
      strictness: ["must_keep", "prefer_keep", "flexible"].includes(x.strictness) ? x.strictness : "must_keep",
      note: typeof x.note === "string" ? x.note : undefined,
    }));

  return {
    title: typeof row.title === "string" && row.title.trim() ? row.title.trim() : "未命名简报",
    persona_directives: safePersona,
    plot_directives: safePlot,
    style_directives: safeStyle,
    retention_rules: safeRetention,
  };
}

