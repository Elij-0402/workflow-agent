---
phase: 05-saas
plan: 01
subsystem: testing
tags: [playwright, smoke, qlt-01, tier-a-grep]

requires:
  - phase: 04-core-interface-density
    provides: StepIntro titles and CTA_COPY SSOT for workbench generate flow
provides:
  - smoke.spec.ts aligned to Phase 4 UI selectors
  - 05-SMOKE.md manual e2e runbook
  - scripts/tier-a-grep.ps1 Tier A visual gate
affects: [05-02, milestone-qlt-01]

tech-stack:
  added: []
  patterns: ["drawer-based generate flow in e2e", "Tier A grep allowlist for overview px debt"]

key-files:
  created:
    - .planning/phases/05-saas/05-SMOKE.md
    - scripts/tier-a-grep.ps1
  modified:
    - tests/e2e/smoke.spec.ts

key-decisions:
  - "Use dialog-scoped second click for 生成新版本 submit (GenerateDrawer Sheet)"
  - "tier-a-grep uses Select-String for Windows portability (no rg dependency)"

patterns-established:
  - "E2E step headings match StepIntro SSOT: 拆解章节 / 整理融合蓝图 / 生成变体"

requirements-completed: [QLT-01]

duration: 25min
completed: 2026-05-26
---

# Phase 05 Plan 01 Summary

**QLT-01 工程安全网：197 项单元测试全绿，smoke e2e selector 对齐 Phase 4 工作台与 drawer 生成流，并产出手动冒烟手册与 Tier A grep。**

## Performance

- **Duration:** ~25 min
- **Tasks:** 4 (Task 4 upload-branches: skipped — no env run)
- **Tests:** 197 pass, 0 fail (`npm test`)

## Accomplishments

- D-01 硬性门禁：`npm run type-check` + `npm test` 全绿（197 tests）
- D-02 `smoke.spec.ts` 标题/CTA 对齐 Phase 4；移除「生成新小说」「再生成一版」；drawer 内二次提交「生成新版本」
- D-03 `05-SMOKE.md` 记录 test:e2e 前置、超时与 Last successful run 表
- D-11 `scripts/tier-a-grep.ps1`：主路径无新 `text-[Npx]`；overview 页 4 处记为 baseline 债务

## Task Commits

1. **Task 1: Hard gate baseline** — baseline verified (no src change)
2. **Task 2: Align smoke.spec.ts** — `test(05-01): align smoke e2e to Phase 4 workbench UI`
3. **Task 3: 05-SMOKE.md + tier-a-grep** — `docs(05-01): add smoke runbook and Tier A grep script`

## Files Created/Modified

- `tests/e2e/smoke.spec.ts` — Phase 4 headings + generate drawer flow
- `.planning/phases/05-saas/05-SMOKE.md` — manual e2e SSOT
- `scripts/tier-a-grep.ps1` — Tier A px/primary scan

## Deviations from Plan

- **upload-branches e2e:** skipped (no local LLM e2e run this session)
- **tier-a-grep:** uses `Select-String` instead of `rg` for Windows shells without ripgrep on PATH

## Self-Check: PASSED

- [x] `npm run type-check` exit 0
- [x] `npm test` — 197 pass
- [x] Legacy strings absent in smoke.spec.ts
- [x] `05-SMOKE.md` and `tier-a-grep.ps1` exist
