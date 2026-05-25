import { detectChapters, type ChapterMeta } from "./chapters";
export type { ChapterMeta } from "./chapters";
import type { ContentRiskTag } from "@/lib/books/content";

const LEADING_BOM_RE = /^﻿+/;
const FULL_WIDTH_SPACE_RE = /　/g;
const NON_BREAKING_SPACE_RE = / /g;
const THREE_PLUS_NEWLINES_RE = /\n{3,}/g;
const BLANK_SPACE_BEFORE_NEWLINE_RE = /[ \t]+\n/g;
const MULTI_SPACE_RE = /[ \t]{2,}/g;
const ZERO_WIDTH_RE = /[\u200B-\u200D\uFEFF]/g;
const HIGH_CONFIDENCE_NOISE_PATTERNS = [
  /^(?:更多(?:精彩|txt)?小说.*)$/u,
  /^(?:本书来自|本作品来自|小说下载尽在|免费电子书下载).*/u,
  /^(?:请记住本站域名|手机用户请到|备用网址|访问.*最新章节).*/u,
  /^(?:-{3,}|={3,}|_{3,}|【.*收藏.*】)$/u,
];
const SUSPICIOUS_NOISE_PATTERNS = [
  /(?:www\.|http:\/\/|https:\/\/)/iu,
  /(?:QQ群|q群|微信公众号|VX|微信搜)/u,
  /(?:收藏本站|广告合作|最新章节请访问)/u,
];

export type CleanTextResult = {
  cleaned: string;
  wordCount: number;
  chapters: ChapterMeta[];
  issues: Array<{
    code: string;
    message: string;
    severity: "info" | "warning" | "error";
    count?: number;
    sample?: string;
  }>;
  transformSummary: Record<string, number>;
  qualityScore: number;
  contentRiskTags: ContentRiskTag[];
  dedupeSummary: {
    repeatedShortLineCount: number;
  };
};

type CleanTextOptions = {
  aggressiveChapterCleanup?: boolean;
};

const ADULT_EXPLICIT_PATTERNS = [
  /(?:性交|做爱|交媾|肉棒|阴茎|阴道|乳房|胸部|下体|呻吟|插入|抽插)/u,
];
const SEXUAL_COERCION_PATTERNS = [/(?:强奸|迷奸|下药|轮奸|奸淫|被迫献身)/u];
const GRAPHIC_VIOLENCE_PATTERNS = [
  /(?:开膛|斩首|碎尸|血肉模糊|肠子|爆头|凌迟)/u,
];
const ABUSE_OR_INCEST_PATTERNS = [
  /(?:乱伦|父女|母子|兄妹|姐弟).{0,12}(?:做爱|性交|奸|侵犯)/u,
];

function normalizeText(input: string) {
  const beforeLineBreaks = (input.match(/\r\n?/g) ?? []).length;
  const beforeFullWidthSpaces = (input.match(FULL_WIDTH_SPACE_RE) ?? []).length;
  const beforeNbsp = (input.match(NON_BREAKING_SPACE_RE) ?? []).length;
  const beforeZeroWidth = (input.match(ZERO_WIDTH_RE) ?? []).length;

  const cleaned = input
    .replace(LEADING_BOM_RE, "")
    .replace(/\r\n?/g, "\n")
    .replace(FULL_WIDTH_SPACE_RE, " ")
    .replace(NON_BREAKING_SPACE_RE, " ")
    .replace(ZERO_WIDTH_RE, "")
    .replace(BLANK_SPACE_BEFORE_NEWLINE_RE, "\n")
    .replace(MULTI_SPACE_RE, " ")
    .replace(THREE_PLUS_NEWLINES_RE, "\n\n")
    .trim();

  return {
    cleaned,
    summary: {
      normalizedLineBreaks: beforeLineBreaks,
      replacedFullWidthSpaces: beforeFullWidthSpaces,
      replacedNbsp: beforeNbsp,
      removedZeroWidthChars: beforeZeroWidth,
      collapsedBlankLineGroups: Math.max(
        0,
        (input.match(THREE_PLUS_NEWLINES_RE) ?? []).length,
      ),
    },
  };
}

function stripHighConfidenceNoise(text: string) {
  const lines = text.split("\n");
  const kept: string[] = [];
  const issues: CleanTextResult["issues"] = [];
  let removedNoiseLines = 0;
  let suspiciousNoiseLines = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      kept.push(line);
      continue;
    }

    const highConfidencePattern = HIGH_CONFIDENCE_NOISE_PATTERNS.find(
      (pattern) => pattern.test(trimmed),
    );
    if (highConfidencePattern) {
      removedNoiseLines += 1;
      continue;
    }

    const suspiciousPattern = SUSPICIOUS_NOISE_PATTERNS.find((pattern) =>
      pattern.test(trimmed),
    );
    if (suspiciousPattern) {
      suspiciousNoiseLines += 1;
      issues.push({
        code: "suspicious-noise-line",
        message: "检测到疑似广告、站点尾注或推广内容。",
        severity: "warning",
        sample: trimmed.slice(0, 80),
      });
    }

    kept.push(line);
  }

  if (removedNoiseLines > 0) {
    issues.unshift({
      code: "high-confidence-noise-removed",
      message: "已自动移除高置信广告或下载尾注。",
      severity: "info",
      count: removedNoiseLines,
    });
  }

  return {
    cleaned: kept.join("\n").trim(),
    issues,
    summary: {
      removedNoiseLines,
      suspiciousNoiseLines,
    },
  };
}

function dedupeRepeatedShortLines(text: string, options: CleanTextOptions) {
  const lines = text.split("\n");
  const kept: string[] = [];
  let previousNonEmptyKey: string | null = null;
  let repeatedShortLineCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      kept.push(line);
      continue;
    }

    const normalizedKey = trimmed
      .replace(/[【\[(（].{0,18}[】\])）]\s*$/u, "")
      .replace(/\s+/g, "")
      .toLowerCase();
    const looksLikeHeading =
      /^第[\d一二三四五六七八九十百千零〇两\s]+[章卷回节折部篇]/u.test(
        trimmed,
      ) || /^chapter\s+\d+/iu.test(trimmed);
    const shortEnough =
      trimmed.length <= (options.aggressiveChapterCleanup ? 80 : 48);

    if (
      shortEnough &&
      previousNonEmptyKey === normalizedKey &&
      (looksLikeHeading || options.aggressiveChapterCleanup)
    ) {
      repeatedShortLineCount += 1;
      continue;
    }

    kept.push(line);
    previousNonEmptyKey = normalizedKey;
  }

  return {
    cleaned: kept.join("\n").trim(),
    summary: {
      repeatedShortLineCount,
    },
  };
}

function detectContentRiskTags(text: string): ContentRiskTag[] {
  const tags = new Set<ContentRiskTag>();
  if (ADULT_EXPLICIT_PATTERNS.some((pattern) => pattern.test(text))) {
    tags.add("adult_explicit");
  }
  if (SEXUAL_COERCION_PATTERNS.some((pattern) => pattern.test(text))) {
    tags.add("sexual_coercion_risk");
  }
  if (GRAPHIC_VIOLENCE_PATTERNS.some((pattern) => pattern.test(text))) {
    tags.add("graphic_violence");
  }
  if (ABUSE_OR_INCEST_PATTERNS.some((pattern) => pattern.test(text))) {
    tags.add("abuse_or_incest_risk");
  }
  return [...tags];
}

function scoreTextQuality(input: {
  cleaned: string;
  issues: CleanTextResult["issues"];
  summary: Record<string, number>;
}) {
  let score = 100;
  score -= Math.min((input.summary.suspiciousNoiseLines ?? 0) * 6, 18);
  score -= Math.min((input.summary.removedNoiseLines ?? 0) * 2, 10);
  score -= Math.min((input.summary.repeatedShortLineCount ?? 0) * 2, 14);
  score -= Math.min(
    input.issues.filter((issue) => issue.severity === "warning").length * 4,
    16,
  );
  if (input.cleaned.length < 1_000) {
    score -= 8;
  }

  return Math.max(0, Math.min(100, score));
}

export function countWords(text: string) {
  const compact = text.replace(/\s+/g, "");
  if (compact.length === 0) return 0;

  const cjkMatches = compact.match(/[\p{Script=Han}]/gu) ?? [];
  const latinMatches =
    compact.match(/[A-Za-z0-9]+(?:['_-][A-Za-z0-9]+)*/g) ?? [];

  return cjkMatches.length + latinMatches.length;
}

export function cleanNovelText(
  input: string,
  options: CleanTextOptions = {},
): CleanTextResult {
  const normalized = normalizeText(input);
  const denoised = stripHighConfidenceNoise(normalized.cleaned);
  const deduped = dedupeRepeatedShortLines(denoised.cleaned, options);
  const cleaned = deduped.cleaned;
  const transformSummary = {
    ...normalized.summary,
    ...denoised.summary,
    ...deduped.summary,
  };
  const issues = denoised.issues;
  const contentRiskTags = detectContentRiskTags(cleaned);
  const qualityScore = scoreTextQuality({
    cleaned,
    issues,
    summary: transformSummary,
  });

  return {
    cleaned,
    wordCount: countWords(cleaned),
    chapters: detectChapters(cleaned),
    issues,
    transformSummary,
    qualityScore,
    contentRiskTags,
    dedupeSummary: {
      repeatedShortLineCount: deduped.summary.repeatedShortLineCount,
    },
  };
}
