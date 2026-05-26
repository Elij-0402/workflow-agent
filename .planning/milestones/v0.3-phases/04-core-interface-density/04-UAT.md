---
status: complete
phase: 04-core-interface-density
source: 04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md
started: 2026-05-26T22:35:00.000Z
updated: 2026-05-26T23:00:00.000Z
---

## Current Test

[testing complete]

## Tests

### 1. Sessions list first screen density
expected: Single hero + collapsed metrics; no rules sidebar; single-book Collapsible closed by default
result: pass

### 2. Project card scanability
expected: Each dual-book card shows title, one muted next-step line, semantic status badge; clicking card/next goes to sensible nextHref (workbench or overview)
result: pass

### 3. Project overview panel budget
expected: On /sessions/[id]?view=overview — at most 2 surface-panels above the fold; primary CTA reads 进入工作台 or 确认蓝图
result: pass

### 4. Workbench step segmentation
expected: On workbench — analysis / compare / generate feel like distinct steps with space-y-10; analysis capability panel collapsed by default; no 680px min-height compare wall
result: pass

### 5. Confirm blueprint gating
expected: 「确认蓝图」button disabled with caption when blueprint incomplete; enabled default variant only when ready
result: pass

### 6. Generate before confirm blocked
expected: Trying to generate when blueprint not confirmed shows toast「请先确认蓝图 — 前往对比蓝图步骤」and routes attention to compare step
result: pass

### 7. CTA copy consistency
expected: Workbench and overview use same verbs — 确认蓝图, 生成新版本, 批量分析, 进入工作台 — no divergent labels on same action
result: pass

### 8. Shell regression (Phase 3)
expected: Global nav still highlights 项目; 新建 goes to /upload?mode=dual; dual session default lands on workbench not overview loop
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]
