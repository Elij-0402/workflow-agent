import type { GenerateConfig } from "@/lib/types";

export const STRATEGY_OPTIONS: Array<{
  value: GenerateConfig["strategy"];
  label: string;
  description: string;
}> = [
  {
    value: "a-dominant",
    label: "原作主导",
    description: "保留原作骨架，变化更克制。",
  },
  {
    value: "balanced",
    label: "均衡改写",
    description: "平衡原作逻辑与新鲜感。",
  },
  {
    value: "theme-graft",
    label: "主题嫁接",
    description: "允许更明显的主题与桥段变化。",
  },
];

export const VIEWPOINT_OPTIONS: Array<{
  value: GenerateConfig["viewpoint"];
  label: string;
}> = [
  { value: "keep", label: "保持原视角" },
  { value: "first-person", label: "第一人称" },
  { value: "third-limited", label: "第三人称有限" },
  { value: "omniscient", label: "第三人称全知" },
];

export const STYLE_OPTIONS: Array<{
  value: GenerateConfig["style"];
  label: string;
}> = [
  { value: "keep", label: "保持原文风" },
  { value: "modern", label: "现代直白" },
  { value: "classical", label: "凝练古典" },
  { value: "web-novel", label: "网文节奏" },
];

export const OUTPUT_SCOPE_OPTIONS: Array<{
  value: GenerateConfig["output_scope"];
  label: string;
  description: string;
  hint: string;
}> = [
  {
    value: "single-chapter",
    label: "单章",
    description: "单一完整章节，适合直接看成稿。",
    hint: "单章成稿",
  },
  {
    value: "outline",
    label: "大纲",
    description: "先看结构与节点，不直接展开正文。",
    hint: "结构大纲",
  },
  {
    value: "three-chapters",
    label: "三章连写",
    description: "连续三章，适合观察节奏延展。",
    hint: "三章连写",
  },
];

export const STRATEGY_LABELS: Record<GenerateConfig["strategy"], string> = {
  "a-dominant": "原作主导",
  balanced: "均衡改写",
  "theme-graft": "主题嫁接",
};

export const VIEWPOINT_LABELS: Record<GenerateConfig["viewpoint"], string> = {
  keep: "原视角",
  "first-person": "第一人称",
  "third-limited": "第三有限",
  omniscient: "第三全知",
};

export const STYLE_LABELS: Record<GenerateConfig["style"], string> = {
  keep: "原文风",
  modern: "现代",
  classical: "古典",
  "web-novel": "网文",
};

export type VariantScope = "outline" | "chapter" | "full";

export const VARIANT_SCOPE_LABELS: Record<VariantScope, string> = {
  outline: "大纲",
  chapter: "章节",
  full: "全书",
};

export function formatVariantScopeLabel(
  scope: VariantScope | null | undefined,
  chapterIndex?: number | null,
) {
  if (scope === "chapter" && chapterIndex) {
    return `章节 · 第 ${chapterIndex} 章`;
  }
  if (scope && scope in VARIANT_SCOPE_LABELS) {
    return VARIANT_SCOPE_LABELS[scope as VariantScope];
  }
  return null;
}

export const OUTPUT_SCOPE_LABELS: Record<GenerateConfig["output_scope"], string> = {
  "single-chapter": "单章",
  outline: "大纲",
  "three-chapters": "三章",
};

