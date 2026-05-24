import {
  getBookAnalysisMode,
  getBookChapterGate,
  getBookContentProfile,
  getBookIngestMetadata,
  getBookProviderCompatibility,
  type AnalysisMode,
  type ChapterGateStatus,
  type ContentProfile,
  type ProviderCompatibilityStatus,
} from "@/lib/books/content";

type UploadBookLike = {
  title: string;
  word_count: number | null;
  chapter_count: number | null;
  metadata?: Record<string, unknown> | null;
};

type UploadTone = "normal" | "warning" | "blocked" | "fallback";

export type UploadBookDisplay = {
  title: string;
  analysisMode: AnalysisMode;
  gateStatus: ChapterGateStatus;
  compatibilityStatus: ProviderCompatibilityStatus;
  contentProfile: ContentProfile;
  canAnalyze: boolean;
  needsAttention: boolean;
  tone: UploadTone;
  analysisMethodLabel: string;
  analysisMethodHint: string;
  accessLabel: string;
  accessHint: string;
  contentTypeLabel: string;
  modelFitLabel: string;
  healthHeadline: string;
  healthDetail: string;
  chapterWarning: string | null;
};

export type UploadStepSummary = {
  description: string;
  footerText: string;
  actionLabel: string;
  canEnterAnalysis: boolean;
  hasWarnings: boolean;
  hasBlocked: boolean;
};

function mapContentProfileLabel(profile: ContentProfile) {
  switch (profile) {
    case "adult":
      return "敏感题材";
    case "mixed":
      return "复杂文本";
    case "duplicated":
      return "重复内容较多";
    case "noisy":
      return "杂讯较多";
    case "normal":
    default:
      return "常规文本";
  }
}

function mapCompatibilityLabel(status: ProviderCompatibilityStatus) {
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

function buildChapterWarning(book: UploadBookLike) {
  const metadata = getBookIngestMetadata(book.metadata);
  const report = metadata.ingest_report;
  const chapterCount = book.chapter_count ?? 0;
  const duplicateTitleRatio = report?.chapter_detection?.duplicate_title_ratio ?? 0;
  const repeatedFragmentRatio = report?.chapter_detection?.repeated_fragment_ratio ?? 0;
  const shortChapterRatio = report?.chapter_detection?.short_chapter_ratio ?? 0;
  const avgCharsPerChapter =
    book.word_count && chapterCount > 0 ? Math.round(book.word_count / chapterCount) : null;

  if (duplicateTitleRatio >= 0.02) {
    return "检测到重复标题，后续可能自动改为分段分析";
  }

  if (repeatedFragmentRatio >= 0.06) {
    return "检测到重复片段，建议先抽查切章结果";
  }

  if (chapterCount >= 1500 || (avgCharsPerChapter !== null && chapterCount >= 300 && avgCharsPerChapter <= 1800)) {
    return "章节数量偏多，建议抽查切章结果";
  }

  if (shortChapterRatio >= 0.18) {
    return "短章节比例偏高，建议先抽查切章结果";
  }

  return null;
}

function deriveTone(input: {
  gateStatus: ChapterGateStatus;
  compatibilityStatus: ProviderCompatibilityStatus;
  chapterWarning: string | null;
}) {
  if (input.gateStatus === "blocked" || input.compatibilityStatus === "incompatible") {
    return "blocked" as const;
  }
  if (input.gateStatus === "fallback_only") {
    return "fallback" as const;
  }
  if (
    input.gateStatus === "retryable" ||
    input.compatibilityStatus === "risky" ||
    input.chapterWarning
  ) {
    return "warning" as const;
  }
  return "normal" as const;
}

export function deriveUploadBookDisplay(book: UploadBookLike): UploadBookDisplay {
  const analysisMode = getBookAnalysisMode(book.metadata);
  const gate = getBookChapterGate(book.metadata);
  const compatibility = getBookProviderCompatibility(book.metadata);
  const contentProfile = getBookContentProfile(book.metadata);
  const chapterWarning = buildChapterWarning(book);
  const tone = deriveTone({
    gateStatus: gate.status,
    compatibilityStatus: compatibility.status,
    chapterWarning,
  });
  const canAnalyze = gate.status !== "blocked" && compatibility.status !== "incompatible";
  const needsAttention = tone !== "normal";

  const analysisMethodLabel = analysisMode === "block-fallback" ? "分段分析" : "标准逐章";
  const analysisMethodHint =
    analysisMode === "block-fallback"
      ? "章节结构不稳，将按较大文本片段进入分析"
      : "章节结构稳定，将按章节进入分析";

  let accessLabel = "可直接分析";
  let accessHint = "已通过文本体检，可进入下一步";
  if (gate.status === "retryable") {
    accessLabel = "建议复查后分析";
    accessHint = "建议先抽查切章结果，再进入下一步";
  } else if (gate.status === "fallback_only") {
    accessLabel = "将自动转为分段分析";
    accessHint = "系统会自动降级，降低切章错误的影响";
  } else if (gate.status === "blocked" || compatibility.status === "incompatible") {
    accessLabel = "暂不可分析";
    accessHint = "需先处理文本问题，再继续后续流程";
  }

  let healthHeadline = "文本体检正常，可直接进入分析";
  let healthDetail = `章节结构稳定，${mapCompatibilityLabel(compatibility.status)}`;

  if (gate.status === "blocked" || compatibility.status === "incompatible") {
    healthHeadline = "当前文本暂不可进入分析";
    healthDetail =
      gate.reasons[0] ??
      compatibility.reason ??
      "请先处理乱码、重复切章或结构污染问题";
  } else if (gate.status === "fallback_only") {
    healthHeadline = "章节结构不稳定，将自动改用分段分析";
    healthDetail = "这样能降低切章错误对后续分析的影响";
  } else if (gate.status === "retryable" || compatibility.status === "risky" || chapterWarning) {
    healthHeadline = chapterWarning ?? "检测到文本体检告警，建议先复查后分析";
    healthDetail =
      compatibility.status === "risky"
        ? "文本可继续分析，但建议先确认模型设置是否合适"
        : "系统仍可继续分析，但可能影响逐章分析质量";
  }

  return {
    title: book.title,
    analysisMode,
    gateStatus: gate.status,
    compatibilityStatus: compatibility.status,
    contentProfile,
    canAnalyze,
    needsAttention,
    tone,
    analysisMethodLabel,
    analysisMethodHint,
    accessLabel,
    accessHint,
    contentTypeLabel: mapContentProfileLabel(contentProfile),
    modelFitLabel: mapCompatibilityLabel(compatibility.status),
    healthHeadline,
    healthDetail,
    chapterWarning,
  };
}

export function deriveUploadStepSummary(books: UploadBookLike[]): UploadStepSummary {
  if (books.length < 2) {
    return {
      description: "还需要补齐两本参考小说。",
      footerText: "还缺 1 本参考小说。补齐后才会开放分析步骤。",
      actionLabel: "开始分析",
      canEnterAnalysis: false,
      hasWarnings: false,
      hasBlocked: false,
    };
  }

  const displays = books.map(deriveUploadBookDisplay);
  const blockedCount = displays.filter((item) => !item.canAnalyze).length;
  const warningCount = displays.filter((item) => item.needsAttention && item.canAnalyze).length;

  if (blockedCount > 0) {
    return {
      description: "参考小说已上传，但需先处理文本问题",
      footerText: "暂时无法开始分析，请先处理文本问题。",
      actionLabel: "查看体检问题",
      canEnterAnalysis: false,
      hasWarnings: false,
      hasBlocked: true,
    };
  }

  if (warningCount > 0) {
    return {
      description: `两本参考小说已上传，${warningCount} 本需留意体检告警`,
      footerText: "已可开始分析，但建议先检查带告警的参考书。",
      actionLabel: "继续分析",
      canEnterAnalysis: true,
      hasWarnings: true,
      hasBlocked: false,
    };
  }

  return {
    description: "两本参考小说已上传并通过体检",
    footerText: "两本参考小说均已完成体检，可以开始分析。",
    actionLabel: "开始分析",
    canEnterAnalysis: true,
    hasWarnings: false,
    hasBlocked: false,
  };
}
