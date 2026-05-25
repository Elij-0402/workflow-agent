/** Shared CTA copy for sessions routes and workbench (WB-03 SSOT). */
export const CTA_COPY = {
  confirmBlueprint: "确认蓝图",
  generateNewVersion: "生成新版本",
  batchAnalysis: "批量分析",
  enterWorkbench: "进入工作台",
  blueprintBlockedToast: "请先确认蓝图 — 前往对比蓝图步骤",
  blueprintBlockedCaption: "请先确认蓝图 — 前往对比蓝图步骤",
  batchFailureToast: "批量分析失败 — 请检查章节后重试。",
  generateQuotaConfirm: (variantCount: number) =>
    `生成新版本将消耗 BYOK 配额。已有 ${variantCount} 个版本，继续？`,
} as const;
