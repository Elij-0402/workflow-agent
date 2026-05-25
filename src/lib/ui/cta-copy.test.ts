import { strict as assert } from "node:assert";
import { test } from "node:test";

import { CTA_COPY } from "./cta-copy";

test("CTA_COPY confirm blueprint label", () => {
  assert.equal(CTA_COPY.confirmBlueprint, "确认蓝图");
});

test("CTA_COPY generate new version label", () => {
  assert.equal(CTA_COPY.generateNewVersion, "生成新版本");
});

test("CTA_COPY batch analysis label", () => {
  assert.equal(CTA_COPY.batchAnalysis, "批量分析");
});

test("CTA_COPY enter workbench label", () => {
  assert.equal(CTA_COPY.enterWorkbench, "进入工作台");
});

test("CTA_COPY blueprint blocked toast mentions confirm blueprint", () => {
  assert.match(CTA_COPY.blueprintBlockedToast, /请先确认蓝图/);
  assert.equal(
    CTA_COPY.blueprintBlockedToast,
    "请先确认蓝图 — 前往对比蓝图步骤",
  );
});
