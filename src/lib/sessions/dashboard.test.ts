import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveDashboardSummary,
  deriveSessionDashboard,
  type SessionDashboardSeed,
} from "./dashboard";

function makeSeed(
  overrides: Partial<SessionDashboardSeed> = {},
): SessionDashboardSeed {
  return {
    id: "session-1",
    name: "影婚改写计划",
    status: "draft",
    mode: "dual",
    archived_at: null,
    created_at: "2026-05-23T00:00:00.000Z",
    updated_at: "2026-05-23T01:00:00.000Z",
    bookCount: 2,
    chapterCount: 40,
    analyzedBookCount: 2,
    blueprintStatus: "confirmed",
    activeBriefCount: 1,
    variantCount: 2,
    lastActivityLabel: "蓝图已确认",
    ...overrides,
  };
}

test("deriveSessionDashboard marks incomplete dual project as waiting for sources", () => {
  const result = deriveSessionDashboard(
    makeSeed({
      mode: "dual",
      bookCount: 1,
      analyzedBookCount: 0,
      blueprintStatus: null,
      activeBriefCount: 0,
      variantCount: 0,
      lastActivityLabel: null,
    }),
  );

  assert.equal(result.modeLabel, "双书项目");
  assert.equal(result.stageLabel, "待补素材");
  assert.equal(result.nextActionLabel, "补齐参考书");
  assert.equal(result.nextHref, "/upload?sessionId=session-1&position=1");
  assert.equal(result.progressLabel, "已导入 1 / 2 本参考书");
  assert.equal(result.lastActivityLabel, "等待导入第二本参考书");
});

test("deriveSessionDashboard marks analyzed dual project as waiting for blueprint", () => {
  const result = deriveSessionDashboard(
    makeSeed({
      blueprintStatus: "draft",
      activeBriefCount: 0,
      variantCount: 0,
      lastActivityLabel: "整书分析完成",
    }),
  );

  assert.equal(result.stageLabel, "待确认蓝图");
  assert.equal(result.nextActionLabel, "进入蓝图工作台");
  assert.equal(result.nextHref, "/sessions/session-1/workbench");
  assert.equal(result.progressLabel, "2 本整书分析已完成");
});

test("deriveSessionDashboard marks confirmed dual project without variants as ready to generate", () => {
  const result = deriveSessionDashboard(
    makeSeed({
      blueprintStatus: "confirmed",
      activeBriefCount: 0,
      variantCount: 0,
      lastActivityLabel: "蓝图已确认",
    }),
  );

  assert.equal(result.stageLabel, "可生成");
  assert.equal(result.nextActionLabel, "进入结果实验室");
  assert.equal(result.nextHref, "/sessions/session-1/workbench?step=generate");
});

test("deriveSessionDashboard keeps single-book projects in compatibility language", () => {
  const result = deriveSessionDashboard(
    makeSeed({
      mode: "single",
      bookCount: 1,
      analyzedBookCount: 0,
      blueprintStatus: null,
      activeBriefCount: 0,
      variantCount: 0,
      status: "uploaded",
      chapterCount: 12,
      lastActivityLabel: null,
    }),
  );

  assert.equal(result.modeLabel, "单书兼容");
  assert.equal(result.stageLabel, "进行中");
  assert.equal(result.nextActionLabel, "继续分析");
  assert.equal(result.nextHref, "/sessions/session-1");
  assert.equal(result.progressLabel, "单书流程 · 12 章");
});

test("deriveDashboardSummary totals project KPIs from per-project dashboards", () => {
  const result = deriveDashboardSummary([
    deriveSessionDashboard(
      makeSeed({
        id: "dual-ready",
        blueprintStatus: "draft",
        variantCount: 0,
      }),
    ),
    deriveSessionDashboard(
      makeSeed({
        id: "dual-variants",
        variantCount: 3,
      }),
    ),
    deriveSessionDashboard(
      makeSeed({
        id: "single",
        mode: "single",
        blueprintStatus: null,
        variantCount: 0,
        activeBriefCount: 0,
      }),
    ),
  ]);

  assert.deepEqual(result, {
    activeProjectCount: 3,
    waitingBlueprintCount: 1,
    activeBriefCount: 2,
    generatedVariantCount: 3,
  });
});
