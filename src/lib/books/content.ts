import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";
import type { LLMProvider } from "@/lib/llm-config";
import { cleanNovelText } from "@/lib/text/clean";
import { decodeNovelBuffer } from "@/lib/text/decode";
import { sanitizeStorageFilename } from "@/lib/upload/shared";

export const INLINE_CLEANED_CONTENT_CHAR_LIMIT = 1_000_000;

export type IngestStage =
  | "raw_uploaded"
  | "download_raw"
  | "decode"
  | "clean"
  | "upload_cleaned"
  | "write_book"
  | "write_chapters"
  | "ready";

export type IngestStatus =
  | "raw_uploaded"
  | "processing"
  | "ready"
  | "ready_with_warnings"
  | "failed_needs_attention";

export type IngestIssueSeverity = "info" | "warning" | "error";

export type IngestIssue = {
  code: string;
  message: string;
  severity: IngestIssueSeverity;
  count?: number;
  sample?: string;
};

export type ContentProfile =
  | "normal"
  | "noisy"
  | "duplicated"
  | "adult"
  | "mixed";
export type ChapterGateStatus =
  | "pass"
  | "retryable"
  | "fallback_only"
  | "blocked";
export type AnalysisMode = "chaptered" | "block-fallback";
export type ContentRiskTag =
  | "adult_explicit"
  | "sexual_coercion_risk"
  | "graphic_violence"
  | "abuse_or_incest_risk";
export type ProviderCompatibilityStatus =
  | "supported"
  | "risky"
  | "incompatible";

export type IngestErrorReport = {
  stage:
    | Exclude<IngestStage, "raw_uploaded" | "processing" | "ready">
    | "download_raw";
  code: string;
  message: string;
  retryable: boolean;
  details?: string;
};

export type IngestReport = {
  status: IngestStatus;
  stage: IngestStage;
  content_source?: "inline" | "storage" | "raw-fallback";
  raw_source?: {
    preserved: boolean;
    storage_path?: string | null;
  };
  analysis_mode?: AnalysisMode;
  decoder?: {
    encoding: string;
    confidence: number;
    warnings: string[];
    signals: Record<string, number>;
  };
  cleaning?: {
    quality_score: number;
    summary: Record<string, number>;
    issue_count: number;
  };
  chapter_detection?: {
    strategy: "regex" | "length-chunk";
    quality: "high" | "medium" | "low";
    chapter_count: number;
    warnings: string[];
    short_chapter_ratio?: number;
    duplicate_title_ratio?: number;
    adjacent_duplicate_ratio?: number;
    repeated_fragment_ratio?: number;
    coverage_ratio?: number;
    title_sequence_breaks?: number;
  };
  chapter_gate?: {
    status: ChapterGateStatus;
    reasons: string[];
  };
  content_profile?: ContentProfile;
  content_risk_tags?: ContentRiskTag[];
  provider_compatibility?: Partial<
    Record<
      LLMProvider | "default",
      { status: ProviderCompatibilityStatus; reason?: string }
    >
  >;
  dedupe_summary?: {
    repeated_short_line_count: number;
    duplicate_title_count: number;
    adjacent_duplicate_count: number;
    repeated_fragment_count: number;
  };
  analysis_view?: {
    transform_counts: Record<string, number>;
    issue_count: number;
  };
  issues?: IngestIssue[];
  errors?: IngestErrorReport[];
  updated_at?: string;
};

export type BookIngestMetadata = {
  encoding?: string;
  decoder_confidence?: number;
  cleaned_content_mode?: "inline" | "storage" | "raw-fallback";
  cleaned_storage_path?: string | null;
  analysis_mode?: AnalysisMode;
  ingest_status?: IngestStatus;
  ingest_report?: IngestReport;
  content_profile?: ContentProfile;
  content_risk_tags?: ContentRiskTag[];
  chapter_detection_quality?: "high" | "medium" | "low";
  chapter_detection_strategy?: "regex" | "length-chunk";
  quality_score?: number;
  provider_compatibility?: IngestReport["provider_compatibility"];
  dedupe_summary?: IngestReport["dedupe_summary"];
  issues?: IngestIssue[];
};

type BookContentRecord = {
  cleaned_content: string | null;
  metadata?: Record<string, unknown> | null;
  storage_path?: string | null;
};

const READY_INGEST_STATUSES = new Set<IngestStatus>([
  "ready",
  "ready_with_warnings",
]);
const COMPATIBLE_ANALYSIS_MODES = new Set<AnalysisMode>([
  "chaptered",
  "block-fallback",
]);

export function getBookIngestMetadata(
  metadata?: Record<string, unknown> | null,
): BookIngestMetadata {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }

  return metadata as BookIngestMetadata;
}

export function getBookIngestStatus(
  metadata?: Record<string, unknown> | null,
): IngestStatus {
  return getBookIngestMetadata(metadata).ingest_status ?? "raw_uploaded";
}

export function isBookIngestReady(metadata?: Record<string, unknown> | null) {
  return READY_INGEST_STATUSES.has(getBookIngestStatus(metadata));
}

export function getBookAnalysisMode(
  metadata?: Record<string, unknown> | null,
): AnalysisMode {
  const value = getBookIngestMetadata(metadata).analysis_mode;
  return value && COMPATIBLE_ANALYSIS_MODES.has(value) ? value : "chaptered";
}

export function getBookContentProfile(
  metadata?: Record<string, unknown> | null,
): ContentProfile {
  return getBookIngestMetadata(metadata).content_profile ?? "normal";
}

export function getBookContentRiskTags(
  metadata?: Record<string, unknown> | null,
): ContentRiskTag[] {
  const tags = getBookIngestMetadata(metadata).content_risk_tags;
  return Array.isArray(tags) ? tags : [];
}

export function getBookChapterGate(metadata?: Record<string, unknown> | null) {
  const report = getBookIngestMetadata(metadata).ingest_report;
  return (
    report?.chapter_gate ?? {
      status: "pass" as ChapterGateStatus,
      reasons: [] as string[],
    }
  );
}

export function getBookProviderCompatibility(
  metadata?: Record<string, unknown> | null,
  provider?: LLMProvider,
) {
  const compatibility = getBookIngestMetadata(metadata).provider_compatibility;
  if (!compatibility) {
    return { status: "supported" as ProviderCompatibilityStatus, reason: null };
  }
  if (provider && compatibility[provider]) {
    return {
      status: compatibility[provider]?.status ?? "supported",
      reason: compatibility[provider]?.reason ?? null,
    };
  }
  if (compatibility.default) {
    return {
      status: compatibility.default.status,
      reason: compatibility.default.reason ?? null,
    };
  }
  return { status: "supported" as ProviderCompatibilityStatus, reason: null };
}

export function getBookAnalysisBlockingReason(
  metadata?: Record<string, unknown> | null,
) {
  const gate = getBookChapterGate(metadata);
  if (gate.status === "blocked") {
    return gate.reasons[0] ?? "当前文本结构风险较高，请先修复导入体检。";
  }
  return null;
}

function getCleanedStoragePath(metadata?: Record<string, unknown> | null) {
  const value = getBookIngestMetadata(metadata).cleaned_storage_path;
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizeNovelStoragePath(storagePath?: string | null) {
  if (!storagePath) return null;
  return storagePath.startsWith("novels/")
    ? storagePath.slice("novels/".length)
    : storagePath;
}

async function downloadText(
  supabase: SupabaseClient<Database>,
  storageObjectPath: string,
  mode: "cleaned" | "raw",
) {
  const { data, error } = await supabase.storage
    .from("novels")
    .download(storageObjectPath);
  if (error || !data) return null;

  if (mode === "cleaned") {
    return await data.text();
  }

  const bytes = new Uint8Array(await data.arrayBuffer());
  return cleanNovelText(decodeNovelBuffer(bytes).text).cleaned;
}

export function shouldInlineCleanedContent(cleanedContent: string) {
  return cleanedContent.length <= INLINE_CLEANED_CONTENT_CHAR_LIMIT;
}

export function buildCleanedStorageObjectPath(
  userId: string,
  sessionId: string,
  filename: string,
) {
  const normalized = sanitizeStorageFilename(filename).replace(/\.[^.]+$/, "");
  return `${userId}/${sessionId}/cleaned/${normalized || "novel"}-cleaned.txt`;
}

export async function resolveBookCleanedContentSource(
  supabase: SupabaseClient<Database>,
  book: BookContentRecord,
) {
  if (book.cleaned_content?.trim()) {
    return {
      content: book.cleaned_content,
      source: "inline" as const,
    };
  }

  const cleanedStoragePath = getCleanedStoragePath(book.metadata);
  if (cleanedStoragePath) {
    const cleaned = await downloadText(supabase, cleanedStoragePath, "cleaned");
    if (cleaned?.trim()) {
      return {
        content: cleaned,
        source: "storage" as const,
      };
    }
  }

  const rawStoragePath = normalizeNovelStoragePath(book.storage_path);
  if (!rawStoragePath) {
    return null;
  }

  const content = await downloadText(supabase, rawStoragePath, "raw");
  if (!content?.trim()) {
    return null;
  }

  return {
    content,
    source: "raw-fallback" as const,
  };
}

export async function resolveBookCleanedContent(
  supabase: SupabaseClient<Database>,
  book: BookContentRecord,
) {
  const resolved = await resolveBookCleanedContentSource(supabase, book);
  return resolved?.content ?? null;
}

export const resolveBookAnalysisView = resolveBookCleanedContent;
export const resolveBookAnalysisViewSource = resolveBookCleanedContentSource;
