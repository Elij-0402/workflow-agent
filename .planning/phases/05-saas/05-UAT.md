---
status: in_progress
phase: 05-saas
source: 04-UAT.md, 03-HUMAN-UAT.md, 05-CONTEXT.md
started: 2026-05-26T12:00:00.000Z
updated: 2026-05-26T12:00:00.000Z
---

## Current Test

[awaiting owner walkthrough — Tests 1–11]

## Tests

### 1. Sessions list first screen density
expected: Single hero + collapsed metrics; no rules sidebar; single-book Collapsible closed by default
result: pending

### 2. Project card scanability
expected: Each dual-book card shows title, one muted next-step line, semantic status badge; clicking card/next goes to sensible nextHref (workbench or overview)
result: pending

### 3. Project overview panel budget
expected: On /sessions/[id]?view=overview — at most 2 surface-panels above the fold; primary CTA reads 进入工作台 or 确认蓝图
result: pending

### 4. Workbench step segmentation
expected: On workbench — analysis / compare / generate feel like distinct steps with space-y-10; analysis capability panel collapsed by default; no 680px min-height compare wall
result: pending

### 5. Confirm blueprint gating
expected: 「确认蓝图」button disabled with caption when blueprint incomplete; enabled default variant only when ready
result: pending

### 6. Generate before confirm blocked
expected: Trying to generate when blueprint not confirmed shows toast「请先确认蓝图 — 前往对比蓝图步骤」and routes attention to compare step
result: pending

### 7. CTA copy consistency
expected: Workbench and overview use same verbs — 确认蓝图, 生成新版本, 批量分析, 进入工作台 — no divergent labels on same action
result: pending

### 8. Shell regression + navigation noise
expected: Global nav highlights 项目 only; 新建 → `/upload?mode=dual`; dual session default lands on workbench; 更多工具 collapsed by default; no duplicate primary nav noise
result: pending

### 9. 30 秒内理解双书主路径
expected: 从 `/sessions` 开始，不打开文档，30 秒内能说明下一步是「新建双书」或「打开已有项目进工作台」；壳层 header、侧栏 primary、列表 CTA 一致
result: pending

### 10. 移动端 Sheet IA
expected: 窄视口或真机：Sheet 内为 AppNav 单一来源；展开「更多工具」可直达次级链接；不与双书 CTA 同级竞争
result: pending

### 11. Tier A grep + Tier B 四路由抽查
expected: `.\scripts\tier-a-grep.ps1` 退出码 0（overview px 仅 baseline 债务）；`/studio`、`/compare`、`/library`、`/settings` 各 5 分钟内记录「符合 SPEC / 遗留密布局 / 可接受债务」；#13/#14 标 deferred-v2  acceptable
result: pending

## Summary

total: 11
passed: 0
issues: 0
pending: 11
skipped: 0
blocked: 0

owner_daily_use_signoff: [pending]
known_acceptable: []

## Gaps

[none until walkthrough]
