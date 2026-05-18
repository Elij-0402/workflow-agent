import type { GenerateAnalyses, GenerateConfig } from "@/lib/types";

export const GENERATE_SYSTEM_PROMPT = `你是一名中文小说变体创作助手。

请基于结构化分析结果与原文片段，生成一个自洽、可读、可直接展示的中文小说变体，并严格返回符合 schema 的 JSON。

要求：
1. 只输出 JSON，不要输出解释、前言、Markdown 或代码块。
2. title 使用简洁中文标题，优先体现这次变体的核心变化。
3. content 直接输出正文或大纲内容，不要解释你的创作过程。
4. 严格遵守输出范围要求：如果要求大纲，就不要写完整章节。
5. 保持人物动机、世界规则、叙事因果基本自洽。
6. extra_instructions 非空时必须优先执行。`;

export const GENERATE_TITLE_FALLBACK = "未命名变体";
export const GENERATE_TEXT_CHAR_LIMIT = 20_000;

const STRATEGY_PROMPTS: Record<GenerateConfig["strategy"], string> = {
  "a-dominant": "以保留原作核心骨架为主，只在局部做较明显改写。",
  balanced: "在原作逻辑与新鲜感之间保持均衡。",
  "theme-graft": "优先强化主题嫁接与新角度，允许更明显的改写。",
};

const VIEWPOINT_PROMPTS: Record<GenerateConfig["viewpoint"], string> = {
  keep: "保持原作主要叙事视角。",
  "first-person": "改为第一人称或显著贴近第一人称表达。",
  "third-limited": "改为第三人称有限视角。",
  omniscient: "改为第三人称全知或更宽视角。",
};

const STYLE_PROMPTS: Record<GenerateConfig["style"], string> = {
  keep: "尽量保持原作文风与语言气质。",
  modern: "语言更现代、清晰、直接。",
  classical: "语言更凝练，允许适度古典表达。",
  "web-novel": "更贴近中文网文节奏与段落感。",
};

export const OUTPUT_SCOPE_CONFIG: Record<
  GenerateConfig["output_scope"],
  {
    maxTokens: number;
    promptInstruction: string;
    uiHint: string;
  }
> = {
  outline: {
    maxTokens: 2048,
    promptInstruction: "返回章节大纲，给出 5-10 个连续节点，每个节点 50-150 字。",
    uiHint: "5-10 个节点，每节点 50-150 字",
  },
  "single-chapter": {
    maxTokens: 4096,
    promptInstruction: "返回单一完整章节，目标长度约 3000-5000 字。",
    uiHint: "单一完整章节，约 3000-5000 字",
  },
  "three-chapters": {
    maxTokens: 8192,
    promptInstruction: "返回连续三章，目标每章约 3000 字。",
    uiHint: "连续三章，每章约 3000 字",
  },
};

export function scopeToMaxTokens(scope: GenerateConfig["output_scope"]) {
  return OUTPUT_SCOPE_CONFIG[scope].maxTokens;
}

function buildConfigBlock(config: GenerateConfig) {
  const scope = OUTPUT_SCOPE_CONFIG[config.output_scope];

  return [
    `- 变体策略：${STRATEGY_PROMPTS[config.strategy]}`,
    `- 创新强度：${config.innovation}/10，数值越高，允许越明显的结构与桥段变化，但仍要保持可读性。`,
    `- 视角要求：${VIEWPOINT_PROMPTS[config.viewpoint]}`,
    `- 文风要求：${STYLE_PROMPTS[config.style]}`,
    `- 输出范围：${scope.promptInstruction}`,
    `- 额外要求：${config.extra_instructions.trim() || "无"}`,
  ].join("\n");
}

export function buildGenerateUserPrompt({
  analyses,
  config,
  excerpt,
}: {
  analyses: GenerateAnalyses;
  config: GenerateConfig;
  excerpt: string;
}) {
  return [
    "请根据以下资料创作一个中文小说变体。",
    "【生成配置】",
    buildConfigBlock(config),
    "【世界观分析】",
    JSON.stringify(analyses.worldview, null, 2),
    "【人物分析】",
    JSON.stringify(analyses.characters, null, 2),
    "【叙事分析】",
    JSON.stringify(analyses.narrative, null, 2),
    `【原书片段（前 ${excerpt.length.toLocaleString("zh-CN")} 字符）】`,
    excerpt.trim() || "无可用原文片段。",
    "【执行要求】\n- 结果必须是中文。\n- content 内保留自然换行。\n- 不要复述输入 JSON。\n- 不要输出 schema 之外的字段。",
  ].join("\n\n");
}
