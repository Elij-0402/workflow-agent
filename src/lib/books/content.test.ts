import assert from "node:assert/strict";
import test from "node:test";

import {
  getBookAnalysisBlockingReason,
  getBookAnalysisMode,
  getBookChapterGate,
  getBookProviderCompatibility,
} from "./content";

test("content helpers derive analysis mode and chapter gate from metadata", () => {
  const metadata = {
    analysis_mode: "block-fallback",
    ingest_report: {
      chapter_gate: {
        status: "fallback_only",
        reasons: ["章节结构不稳定，已切换为大块分段分析。"],
      },
    },
  };

  assert.equal(getBookAnalysisMode(metadata), "block-fallback");
  assert.equal(getBookChapterGate(metadata).status, "fallback_only");
  assert.equal(getBookAnalysisBlockingReason(metadata), null);
});

test("content helpers surface provider incompatibility and blocked gate reason", () => {
  const metadata = {
    ingest_report: {
      chapter_gate: {
        status: "blocked",
        reasons: ["编码置信度过低，当前文本可能仍含严重乱码。"],
      },
    },
    provider_compatibility: {
      openai: {
        status: "incompatible",
        reason: "检测到高风险性内容标签，建议切换到更兼容的模型供应商。",
      },
    },
  };

  assert.equal(
    getBookProviderCompatibility(metadata, "openai").status,
    "incompatible",
  );
  assert.match(getBookAnalysisBlockingReason(metadata) ?? "", /编码置信度过低/);
});
