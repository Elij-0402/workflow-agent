import type {
  AnalysisMode,
  ChapterGateStatus,
  ProviderCompatibilityStatus,
} from "@/lib/books/content";

export type AnalysisCapabilityGuide = {
  title: string;
  shortSummary: string;
  positioning: string;
  suitable: string[];
  partial: string[];
  reviewNeeded: string[];
  trustNotes: string[];
  reviewScenarios: string[];
  processStages: [string, string];
};

export const ANALYSIS_CAPABILITY_GUIDE: AnalysisCapabilityGuide = {
  title: "分析能力说明",
  shortSummary:
    "本功能更适合做创作拆解、结构整理和融合准备，不等同于文学研究式全维度精读。",
  positioning:
    "批量分析会先逐章或逐片段抽取结构化素材，再汇总成整书画像，用于后续对比与融合蓝图整理。",
  suitable: [
    "人物关系",
    "世界规则",
    "章节事件与冲突",
    "主题线索",
    "情节结构与关键节点",
  ],
  partial: ["文风特征", "情绪推进", "节奏变化", "伏笔与回收"],
  reviewNeeded: [
    "深层隐喻",
    "复杂反讽",
    "多层叙述诡计",
    "极长篇跨卷伏线的精确归纳",
  ],
  trustNotes: [
    "本功能适合大规模整理结构信息，不承诺每章结论都完全准确。",
    "章节标题异常、切章质量不稳、长篇跨卷回收、隐性人物关系，都会影响准确度。",
    "建议把自动结果视为高效初稿，而不是最终定论。",
  ],
  reviewScenarios: [
    "章节数异常偏多",
    "自动切章质量存疑",
    "重要主线转折章",
    "人物关系密集章",
    "关键世界观揭示章",
  ],
  processStages: ["先分别拆解每本参考书", "再进入双书对比与融合整理"],
};

export function getChapterSourceLabel(
  source: "regex" | "length-chunk" | "manual",
) {
  switch (source) {
    case "length-chunk":
      return "分段切分";
    case "manual":
      return "人工整理";
    case "regex":
    default:
      return "规则识别";
  }
}

export function getCandidateSectionLabel(section: string) {
  switch (section) {
    case "characters":
      return "人物";
    case "relationships":
      return "关系";
    case "world_rules":
      return "世界规则";
    case "conflicts":
      return "冲突";
    case "plot_beats":
      return "情节节点";
    case "themes":
      return "主题";
    default:
      return section;
  }
}

export function getAnalysisModeLabel(mode: AnalysisMode) {
  return mode === "block-fallback" ? "分段分析" : "逐章分析";
}

export function getGateStatusLabel(status: ChapterGateStatus) {
  switch (status) {
    case "retryable":
      return "建议复查后分析";
    case "fallback_only":
      return "将自动转为分段分析";
    case "blocked":
      return "暂不可分析";
    case "pass":
    default:
      return "可直接分析";
  }
}

export function getCompatibilityLabel(status: ProviderCompatibilityStatus) {
  switch (status) {
    case "risky":
      return "建议先确认模型设置";
    case "incompatible":
      return "当前模型不建议处理";
    case "supported":
    default:
      return "当前模型可处理";
  }
}

export function buildBookAnalysisSummary(input: {
  title: string;
  chapterCount: number;
  analyzedCount: number;
  analysisMode: AnalysisMode;
  gateStatus: ChapterGateStatus;
  compatibilityStatus: ProviderCompatibilityStatus;
}) {
  const basis =
    input.analysisMode === "block-fallback"
      ? `本书将按 ${input.chapterCount} 个片段逐段拆解，适合提取人物、事件、冲突和主题线索。`
      : `本书将按 ${input.chapterCount} 章逐章拆解，适合提取人物、事件、冲突和主题线索。`;

  if (
    input.gateStatus === "blocked" ||
    input.compatibilityStatus === "incompatible"
  ) {
    return `当前不建议直接分析《${input.title}》，请先处理体检或模型适配问题。`;
  }

  if (input.gateStatus === "fallback_only") {
    return `${basis} 系统会自动降级为分段分析，以降低切章误差的影响。`;
  }

  if (
    input.gateStatus === "retryable" ||
    input.compatibilityStatus === "risky"
  ) {
    return `${basis} 建议先抽查关键章节，再决定是否批量分析。`;
  }

  if (input.analyzedCount > 0) {
    return `${basis} 当前已完成 ${input.analyzedCount} ${input.analysisMode === "block-fallback" ? "个片段" : "章"}的基础拆解。`;
  }

  return basis;
}
