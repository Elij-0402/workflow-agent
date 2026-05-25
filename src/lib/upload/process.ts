import type { SupabaseClient } from "@supabase/supabase-js";

import {
  type AnalysisMode,
  type BookIngestMetadata,
  type ChapterGateStatus,
  type ContentProfile,
  type ContentRiskTag,
  type IngestErrorReport,
  type IngestIssue,
  type IngestReport,
  type ProviderCompatibilityStatus,
  buildCleanedStorageObjectPath,
  shouldInlineCleanedContent,
} from "@/lib/books/content";
import { buildChapterPlan } from "@/lib/text/chapters";
import { cleanNovelText } from "@/lib/text/clean";
import { decodeNovelBuffer } from "@/lib/text/decode";
import type { Database } from "@/lib/types";

type ProcessUploadedNovelParams = {
  supabase: SupabaseClient<Database>;
  userId: string;
  sessionId: string;
  storageObjectPath: string;
  safeFilename: string;
};

type ProcessUploadedNovelSuccess = {
  ok: true;
  cleanedContent: string;
  cleanedContentMode: "inline" | "storage" | "raw-fallback";
  cleanedStoragePath: string | null;
  wordCount: number;
  chapterCount: number;
  chapters: ReturnType<typeof buildChapterPlan>["chapters"];
  metadata: BookIngestMetadata;
  report: IngestReport;
  issues: IngestIssue[];
};

type ProcessUploadedNovelFailure = {
  ok: false;
  metadata: BookIngestMetadata;
  report: IngestReport;
  userMessage: string;
};

type ProcessUploadedNovelResult =
  | ProcessUploadedNovelSuccess
  | ProcessUploadedNovelFailure;

function nowIso() {
  return new Date().toISOString();
}

function buildFailureReport(
  error: IngestErrorReport,
  overrides?: Partial<IngestReport>,
): ProcessUploadedNovelFailure {
  const report: IngestReport = {
    status: "failed_needs_attention",
    stage: error.stage,
    errors: [error],
    issues: [],
    updated_at: nowIso(),
    ...overrides,
  };

  return {
    ok: false,
    metadata: {
      ingest_status: "failed_needs_attention",
      ingest_report: report,
    },
    report,
    userMessage:
      "原始文件已导入，但文本处理未完成，请在项目页查看导入体检并重试。",
  };
}

function toErrorReport(input: {
  stage: IngestErrorReport["stage"];
  code: string;
  message: string;
  details?: string;
  retryable?: boolean;
}): IngestErrorReport {
  return {
    stage: input.stage,
    code: input.code,
    message: input.message,
    retryable: input.retryable ?? true,
    details: input.details,
  };
}

function buildProviderCompatibility(
  tags: ContentRiskTag[],
): IngestReport["provider_compatibility"] {
  const hasAdult = tags.includes("adult_explicit");
  const hasGraphicViolence = tags.includes("graphic_violence");
  const hasSevereSexualRisk =
    tags.includes("sexual_coercion_risk") ||
    tags.includes("abuse_or_incest_risk");

  const defaultStatus: ProviderCompatibilityStatus = hasSevereSexualRisk
    ? "risky"
    : hasAdult || hasGraphicViolence
      ? "risky"
      : "supported";

  return {
    default: {
      status: defaultStatus,
      reason:
        defaultStatus === "supported"
          ? "未检测到需要额外模型分流的高风险题材标签。"
          : "正文包含敏感题材，分析前应检查当前模型供应商的内容兼容性。",
    },
    openai: {
      status: hasSevereSexualRisk ? "incompatible" : defaultStatus,
      reason: hasSevereSexualRisk
        ? "检测到高风险性内容标签，建议切换到更兼容的模型供应商。"
        : hasAdult || hasGraphicViolence
          ? "正文包含敏感题材，建议确认模型兼容性后再分析。"
          : "兼容。",
    },
    deepseek: {
      status: defaultStatus,
      reason:
        defaultStatus === "supported"
          ? "兼容。"
          : "正文包含敏感题材，建议先验证当前模型是否可稳定处理。",
    },
    custom: {
      status: defaultStatus,
      reason:
        defaultStatus === "supported"
          ? "兼容性未知，按当前内容风险看可直接尝试。"
          : "自定义兼容端点能力未知，建议先小样本验证。",
    },
  };
}

function deriveContentProfile(input: {
  issues: IngestIssue[];
  repeatedShortLineCount: number;
  duplicateTitleCount: number;
  tags: ContentRiskTag[];
}): ContentProfile {
  const noisy = input.issues.some((issue) =>
    [
      "high-confidence-noise-removed",
      "suspicious-noise-line",
      "decoder-warning",
    ].includes(issue.code),
  );
  const duplicated =
    input.repeatedShortLineCount > 0 || input.duplicateTitleCount > 0;
  const adult = input.tags.length > 0;
  const active = [noisy, duplicated, adult].filter(Boolean).length;
  if (active >= 2) return "mixed";
  if (adult) return "adult";
  if (duplicated) return "duplicated";
  if (noisy) return "noisy";
  return "normal";
}

function buildChapterGate(input: {
  decoderConfidence: number;
  chapterPlan: ReturnType<typeof buildChapterPlan>;
  suspiciousNoiseLines: number;
  repeatedShortLineCount: number;
}) {
  const reasons: string[] = [];
  const shortRatio =
    input.chapterPlan.chapters.length === 0
      ? 0
      : input.chapterPlan.report.shortChapterCount /
        input.chapterPlan.chapters.length;
  const duplicateTitleRatio =
    input.chapterPlan.chapters.length === 0
      ? 0
      : input.chapterPlan.report.duplicateTitleCount /
        input.chapterPlan.chapters.length;
  const adjacentDuplicateRatio =
    input.chapterPlan.chapters.length === 0
      ? 0
      : input.chapterPlan.report.adjacentDuplicateCount /
        input.chapterPlan.chapters.length;
  const repeatedFragmentRatio =
    input.chapterPlan.chapters.length === 0
      ? 0
      : input.chapterPlan.report.repeatedFragmentCount /
        input.chapterPlan.chapters.length;

  let status: ChapterGateStatus = "pass";
  let analysisMode: AnalysisMode = "chaptered";

  if (input.decoderConfidence < 0.45) {
    status = "blocked";
    reasons.push("编码置信度过低，当前文本可能仍含严重乱码。");
  }

  if (
    input.chapterPlan.report.strategy === "length-chunk" ||
    input.chapterPlan.report.quality === "low"
  ) {
    status = status === "blocked" ? status : "fallback_only";
    analysisMode = "block-fallback";
    reasons.push("章节结构不稳定，已切换为大块分段分析。");
  } else if (
    input.chapterPlan.report.quality === "medium" ||
    duplicateTitleRatio >= 0.02 ||
    adjacentDuplicateRatio > 0 ||
    repeatedFragmentRatio >= 0.06 ||
    shortRatio >= 0.18
  ) {
    status = "retryable";
    reasons.push("章节结构存在可修复异常，建议先自动重切再逐章分析。");
  }

  if (input.suspiciousNoiseLines >= 8) {
    reasons.push("文本残留较多站点尾注或推广内容。");
  }

  if (input.repeatedShortLineCount > 0) {
    reasons.push("检测到重复短标题或短片段。");
  }

  return {
    status,
    analysisMode,
    reasons: [...new Set(reasons)],
    metrics: {
      shortRatio,
      duplicateTitleRatio,
      adjacentDuplicateRatio,
      repeatedFragmentRatio,
      coverageRatio: input.chapterPlan.report.coverageRatio,
      titleSequenceBreaks: input.chapterPlan.report.titleSequenceBreakCount,
    },
  };
}

export async function processUploadedNovel(
  params: ProcessUploadedNovelParams,
): Promise<ProcessUploadedNovelResult> {
  const { supabase, userId, sessionId, storageObjectPath, safeFilename } =
    params;
  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from("novels")
    .download(storageObjectPath);

  if (downloadError || !fileBlob) {
    return buildFailureReport(
      toErrorReport({
        stage: "download_raw",
        code: downloadError?.name ?? "storage-download-failed",
        message: "读取原始文件失败。",
        details: downloadError?.message,
      }),
    );
  }

  const bytes = new Uint8Array(await fileBlob.arrayBuffer());
  const decoded = decodeNovelBuffer(bytes);
  const cleaned = cleanNovelText(decoded.text);

  if (!cleaned.cleaned) {
    return buildFailureReport(
      toErrorReport({
        stage: "clean",
        code: "empty-cleaned-content",
        message: "清洗后的正文为空。",
        retryable: false,
      }),
      {
        decoder: {
          encoding: decoded.encoding,
          confidence: decoded.confidence,
          warnings: decoded.warnings,
          signals: decoded.decoderSignals,
        },
      },
    );
  }

  let analysisView = cleaned.cleaned;
  let activeCleanResult = cleaned;
  let chapterPlan = buildChapterPlan(cleaned.cleaned, {
    fallbackChunkChars: 5000,
  });
  let chapterGate = buildChapterGate({
    decoderConfidence: decoded.confidence,
    chapterPlan,
    suspiciousNoiseLines: cleaned.transformSummary.suspiciousNoiseLines ?? 0,
    repeatedShortLineCount: cleaned.dedupeSummary.repeatedShortLineCount,
  });

  if (chapterGate.status === "retryable") {
    const retried = cleanNovelText(decoded.text, {
      aggressiveChapterCleanup: true,
    });
    const retriedPlan = buildChapterPlan(retried.cleaned, {
      fallbackChunkChars: 12000,
    });
    const retriedGate = buildChapterGate({
      decoderConfidence: decoded.confidence,
      chapterPlan: retriedPlan,
      suspiciousNoiseLines: retried.transformSummary.suspiciousNoiseLines ?? 0,
      repeatedShortLineCount: retried.dedupeSummary.repeatedShortLineCount,
    });

    if (
      retriedGate.status === "pass" ||
      (retriedGate.status === "fallback_only" &&
        retriedPlan.chapters.length < chapterPlan.chapters.length)
    ) {
      analysisView = retried.cleaned;
      activeCleanResult = retried;
      chapterPlan = retriedPlan;
      chapterGate = {
        ...retriedGate,
        reasons: [
          ...retriedGate.reasons,
          "已应用更严格的去重与标题清洗策略。",
        ] as string[],
      };
    }
  }

  if (chapterGate.status === "retryable") {
    chapterGate = {
      ...chapterGate,
      status: "fallback_only",
      analysisMode: "block-fallback",
      reasons: [
        ...chapterGate.reasons,
        "自动重切后仍存在结构污染，已改用大块分段分析。",
      ],
    };
    chapterPlan = buildChapterPlan(analysisView, {
      fallbackChunkChars: 12000,
    });
  }

  const reportIssues: IngestIssue[] = [
    ...activeCleanResult.issues,
    ...decoded.warnings.map((warning) => ({
      code: "decoder-warning",
      message: warning,
      severity: "warning" as const,
    })),
    ...chapterPlan.report.warnings.map((warning) => ({
      code: "chapter-detection-warning",
      message: warning,
      severity:
        chapterGate.status === "blocked" ||
        chapterGate.status === "fallback_only"
          ? ("error" as const)
          : ("warning" as const),
    })),
  ];

  if (chapterGate.status !== "pass") {
    reportIssues.push({
      code: "chapter-gate-warning",
      message:
        chapterGate.status === "fallback_only"
          ? "章节结构不稳定，已自动切换为大块分段分析。"
          : chapterGate.status === "blocked"
            ? "当前文本结构风险过高，暂不开放分析。"
            : "章节结构存在异常，建议自动重切后再分析。",
      severity: chapterGate.status === "blocked" ? "error" : "warning",
    });
  }

  const inlineCleanedContent = shouldInlineCleanedContent(analysisView);
  let cleanedContentMode: "inline" | "storage" | "raw-fallback" =
    inlineCleanedContent ? "inline" : "storage";
  let cleanedStoragePath = inlineCleanedContent
    ? null
    : buildCleanedStorageObjectPath(userId, sessionId, safeFilename);

  if (cleanedStoragePath) {
    const cleanedBytes = new TextEncoder().encode(analysisView);
    const { error: cleanedUploadError } = await supabase.storage
      .from("novels")
      .upload(cleanedStoragePath, cleanedBytes, {
        contentType: "text/plain; charset=utf-8",
        upsert: true,
      });

    if (cleanedUploadError) {
      cleanedContentMode = "raw-fallback";
      cleanedStoragePath = null;
      reportIssues.push({
        code: "cleaned-storage-upload-failed",
        message: "清洗文本存储失败，已回退为运行时从原文重建。",
        severity: "warning",
      });
    }
  }

  const warningsPresent =
    decoded.confidence < 0.72 ||
    reportIssues.some(
      (issue) => issue.severity === "warning" || issue.severity === "error",
    );
  const providerCompatibility = buildProviderCompatibility(
    activeCleanResult.contentRiskTags,
  );
  const contentProfile = deriveContentProfile({
    issues: reportIssues,
    repeatedShortLineCount:
      activeCleanResult.dedupeSummary.repeatedShortLineCount,
    duplicateTitleCount: chapterPlan.report.duplicateTitleCount,
    tags: activeCleanResult.contentRiskTags,
  });
  const ingestStatus = warningsPresent ? "ready_with_warnings" : "ready";
  const report: IngestReport = {
    status: ingestStatus,
    stage: "ready",
    content_source: cleanedContentMode,
    raw_source: {
      preserved: true,
      storage_path: `novels/${storageObjectPath}`,
    },
    analysis_mode: chapterGate.analysisMode,
    decoder: {
      encoding: decoded.encoding,
      confidence: decoded.confidence,
      warnings: decoded.warnings,
      signals: decoded.decoderSignals,
    },
    cleaning: {
      quality_score: activeCleanResult.qualityScore,
      summary: activeCleanResult.transformSummary,
      issue_count: activeCleanResult.issues.length,
    },
    chapter_detection: {
      strategy: chapterPlan.report.strategy,
      quality: chapterPlan.report.quality,
      chapter_count: chapterPlan.chapters.length,
      warnings: chapterPlan.report.warnings,
      short_chapter_ratio: chapterGate.metrics.shortRatio,
      duplicate_title_ratio: chapterGate.metrics.duplicateTitleRatio,
      adjacent_duplicate_ratio: chapterGate.metrics.adjacentDuplicateRatio,
      repeated_fragment_ratio: chapterGate.metrics.repeatedFragmentRatio,
      coverage_ratio: chapterGate.metrics.coverageRatio,
      title_sequence_breaks: chapterGate.metrics.titleSequenceBreaks,
    },
    chapter_gate: {
      status: chapterGate.status,
      reasons: chapterGate.reasons,
    },
    content_profile: contentProfile,
    content_risk_tags: activeCleanResult.contentRiskTags,
    provider_compatibility: providerCompatibility,
    dedupe_summary: {
      repeated_short_line_count:
        activeCleanResult.dedupeSummary.repeatedShortLineCount,
      duplicate_title_count: chapterPlan.report.duplicateTitleCount,
      adjacent_duplicate_count: chapterPlan.report.adjacentDuplicateCount,
      repeated_fragment_count: chapterPlan.report.repeatedFragmentCount,
    },
    analysis_view: {
      transform_counts: activeCleanResult.transformSummary,
      issue_count: reportIssues.length,
    },
    issues: reportIssues,
    errors: [],
    updated_at: nowIso(),
  };

  return {
    ok: true,
    cleanedContent: analysisView,
    cleanedContentMode,
    cleanedStoragePath,
    wordCount: activeCleanResult.wordCount,
    chapterCount: chapterPlan.chapters.length,
    chapters: chapterPlan.chapters,
    issues: reportIssues,
    report,
    metadata: {
      encoding: decoded.encoding,
      decoder_confidence: decoded.confidence,
      cleaned_content_mode: cleanedContentMode,
      cleaned_storage_path: cleanedStoragePath,
      analysis_mode: chapterGate.analysisMode,
      ingest_status: ingestStatus,
      ingest_report: report,
      content_profile: contentProfile,
      content_risk_tags: activeCleanResult.contentRiskTags,
      chapter_detection_quality: chapterPlan.report.quality,
      chapter_detection_strategy: chapterPlan.report.strategy,
      quality_score: activeCleanResult.qualityScore,
      provider_compatibility: providerCompatibility,
      dedupe_summary: report.dedupe_summary,
      issues: reportIssues,
    },
  };
}
