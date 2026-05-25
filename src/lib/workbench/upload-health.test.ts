import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveUploadBookDisplay,
  deriveUploadStepSummary,
} from "./upload-health";

test("deriveUploadBookDisplay returns direct-analysis labels for healthy books", () => {
  const result = deriveUploadBookDisplay({
    title: "示例小说",
    word_count: 320000,
    chapter_count: 36,
    metadata: {
      analysis_mode: "chaptered",
      content_profile: "normal",
      ingest_report: {
        chapter_gate: { status: "pass", reasons: [] },
      },
      provider_compatibility: {
        default: { status: "supported" },
      },
    },
  });

  assert.equal(result.analysisMethodLabel, "标准逐章");
  assert.equal(result.accessLabel, "可直接分析");
  assert.equal(result.healthHeadline, "文本体检正常，可直接进入分析");
  assert.equal(result.chapterWarning, null);
});

test("deriveUploadBookDisplay marks suspicious chapter counts as warnings", () => {
  const result = deriveUploadBookDisplay({
    title: "切章异常小说",
    word_count: 5295024,
    chapter_count: 3984,
    metadata: {
      analysis_mode: "chaptered",
      content_profile: "normal",
      ingest_report: {
        chapter_gate: { status: "pass", reasons: [] },
      },
      provider_compatibility: {
        default: { status: "supported" },
      },
    },
  });

  assert.equal(result.accessLabel, "可直接分析");
  assert.equal(result.needsAttention, true);
  assert.match(result.healthHeadline, /章节数量偏多/);
});

test("deriveUploadBookDisplay exposes blocked and fallback states in Chinese", () => {
  const blocked = deriveUploadBookDisplay({
    title: "乱码小说",
    word_count: 100000,
    chapter_count: 12,
    metadata: {
      analysis_mode: "chaptered",
      content_profile: "noisy",
      ingest_report: {
        chapter_gate: {
          status: "blocked",
          reasons: ["编码置信度过低，当前文本可能仍含严重乱码。"],
        },
      },
      provider_compatibility: {
        default: { status: "supported" },
      },
    },
  });
  const fallback = deriveUploadBookDisplay({
    title: "结构污染小说",
    word_count: 200000,
    chapter_count: 240,
    metadata: {
      analysis_mode: "block-fallback",
      content_profile: "mixed",
      ingest_report: {
        chapter_gate: {
          status: "fallback_only",
          reasons: ["章节结构不稳定，已切换为大块分段分析。"],
        },
      },
      provider_compatibility: {
        default: { status: "supported" },
      },
    },
  });

  assert.equal(blocked.accessLabel, "暂不可分析");
  assert.equal(blocked.canAnalyze, false);
  assert.equal(fallback.analysisMethodLabel, "分段分析");
  assert.equal(fallback.accessLabel, "将自动转为分段分析");
});

test("deriveUploadStepSummary returns description and action by overall state", () => {
  const warningSummary = deriveUploadStepSummary([
    {
      title: "正常书",
      word_count: 300000,
      chapter_count: 30,
      metadata: {
        analysis_mode: "chaptered",
        content_profile: "normal",
        ingest_report: { chapter_gate: { status: "pass", reasons: [] } },
        provider_compatibility: { default: { status: "supported" } },
      },
    },
    {
      title: "告警书",
      word_count: 5295024,
      chapter_count: 3984,
      metadata: {
        analysis_mode: "chaptered",
        content_profile: "normal",
        ingest_report: { chapter_gate: { status: "pass", reasons: [] } },
        provider_compatibility: { default: { status: "supported" } },
      },
    },
  ]);
  const blockedSummary = deriveUploadStepSummary([
    {
      title: "正常书",
      word_count: 300000,
      chapter_count: 30,
      metadata: {
        analysis_mode: "chaptered",
        content_profile: "normal",
        ingest_report: { chapter_gate: { status: "pass", reasons: [] } },
        provider_compatibility: { default: { status: "supported" } },
      },
    },
    {
      title: "阻断书",
      word_count: 200000,
      chapter_count: 12,
      metadata: {
        analysis_mode: "chaptered",
        content_profile: "noisy",
        ingest_report: {
          chapter_gate: {
            status: "blocked",
            reasons: ["需要先处理文本问题。"],
          },
        },
        provider_compatibility: { default: { status: "supported" } },
      },
    },
  ]);

  assert.equal(
    warningSummary.description,
    "两本参考小说已上传，1 本需留意体检告警",
  );
  assert.equal(warningSummary.actionLabel, "继续分析");
  assert.equal(warningSummary.canEnterAnalysis, true);
  assert.equal(
    blockedSummary.description,
    "参考小说已上传，但需先处理文本问题",
  );
  assert.equal(blockedSummary.actionLabel, "查看体检问题");
  assert.equal(blockedSummary.canEnterAnalysis, false);
});
