import type { GenerateConfig } from "@/lib/types";

export const GENERATE_FROM_BLUEPRINT_PROMPT_VERSION = "2026-05-22";
export const GENERATE_FROM_BLUEPRINT_SCHEMA_VERSION = "1";
export const GENERATE_FROM_BLUEPRINT_SYSTEM_PROMPT = `你是中文小说变体创作助手。

仅基于"合并创作蓝图"与用户的生成参数，创作一个自洽、可直接展示的中文小说 variant，严格返回符合 schema 的 JSON。

要求：
1. 仅输出 JSON，不要 Markdown / 解释 / 前言。
2. 无原文：你不会收到任何原文片段，所有素材均来自蓝图；不要捏造蓝图未提及的关键人物或世界规则。
3. title 简洁中文，体现本次变体核心。
4. 保持人物动机、世界规则、叙事因果自洽。
5. extra_instructions 非空时优先执行。
6. 严守 output_scope：要大纲就不写完整章节。`;

const STRATEGY_PROMPTS: Record<GenerateConfig["strategy"], string> = {
  "a-dominant": "以蓝图中的核心骨架为主，仅局部改写。",
  balanced: "在蓝图与新鲜感之间均衡。",
  "theme-graft": "优先强化主题嫁接，允许更明显改写。",
};

const VIEWPOINT_PROMPTS: Record<GenerateConfig["viewpoint"], string> = {
  keep: "保持蓝图所述视角。",
  "first-person": "改为第一人称或贴近第一人称。",
  "third-limited": "改为第三人称有限视角。",
  omniscient: "改为第三人称全知视角。",
};

const STYLE_PROMPTS: Record<GenerateConfig["style"], string> = {
  keep: "保持蓝图所述文风。",
  modern: "语言更现代、直接。",
  classical: "语言更凝练，允许古典表达。",
  "web-novel": "贴近中文网文节奏。",
};

const SCOPE_INSTRUCTIONS: Record<GenerateConfig["output_scope"], string> = {
  outline: "返回章节大纲，5-10 个节点，每节点 50-150 字。",
  "single-chapter": "返回单一完整章节，约 3000-5000 字。",
  "three-chapters": "返回连续三章，每章约 3000 字。",
};

export function buildGenerateFromBlueprintUserPrompt({
  blueprint,
  config,
}: {
  blueprint: unknown;
  config: GenerateConfig;
}) {
  return [
    "请按以下蓝图创作一个中文小说 variant。",
    "【生成参数】",
    [
      `- 策略：${STRATEGY_PROMPTS[config.strategy]}`,
      `- 创新强度：${config.innovation}/10。`,
      `- 视角：${VIEWPOINT_PROMPTS[config.viewpoint]}`,
      `- 文风：${STYLE_PROMPTS[config.style]}`,
      `- 输出范围：${SCOPE_INSTRUCTIONS[config.output_scope]}`,
      `- 额外要求：${config.extra_instructions.trim() || "无"}`,
    ].join("\n"),
    "【合并创作蓝图】",
    JSON.stringify(blueprint, null, 2),
    "【执行要求】",
    "- 结果必须为中文。",
    "- content 内保留自然换行。",
    "- 不要复述输入 JSON。",
  ].join("\n\n");
}
