import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  ANALYSIS_CAPABILITY_GUIDE,
  buildBookAnalysisSummary,
  getCandidateSectionLabel,
  getChapterSourceLabel,
} from "./analysis-display";

test("analysis capability guide keeps Chinese-facing product copy", () => {
  assert.match(ANALYSIS_CAPABILITY_GUIDE.shortSummary, /创作拆解/);
  assert.equal(ANALYSIS_CAPABILITY_GUIDE.suitable.length, 5);
  assert.equal(ANALYSIS_CAPABILITY_GUIDE.processStages[0], "先分别拆解每本参考书");
});

test("chapter source and candidate labels are translated for UI", () => {
  assert.equal(getChapterSourceLabel("regex"), "规则识别");
  assert.equal(getChapterSourceLabel("length-chunk"), "分段切分");
  assert.equal(getCandidateSectionLabel("plot_beats"), "情节节点");
  assert.equal(getCandidateSectionLabel("relationships"), "关系");
});

test("book analysis summary explains fallback and risk in Chinese", () => {
  const chaptered = buildBookAnalysisSummary({
    title: "示例小说",
    chapterCount: 282,
    analyzedCount: 12,
    analysisMode: "chaptered",
    gateStatus: "pass",
    compatibilityStatus: "supported",
  });
  const fallback = buildBookAnalysisSummary({
    title: "异常小说",
    chapterCount: 180,
    analyzedCount: 0,
    analysisMode: "block-fallback",
    gateStatus: "fallback_only",
    compatibilityStatus: "supported",
  });
  const blocked = buildBookAnalysisSummary({
    title: "阻断小说",
    chapterCount: 30,
    analyzedCount: 0,
    analysisMode: "chaptered",
    gateStatus: "blocked",
    compatibilityStatus: "incompatible",
  });

  assert.match(chaptered, /282 章逐章拆解/);
  assert.match(chaptered, /已完成 12 章/);
  assert.match(fallback, /自动降级为分段分析/);
  assert.match(blocked, /不建议直接分析/);
});
