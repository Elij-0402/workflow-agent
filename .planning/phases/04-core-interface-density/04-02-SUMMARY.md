---
phase: 04-core-interface-density
plan: 02
subsystem: ui
tags: [sessions, project-card, overview, collapsible, typography, density]

requires:
  - phase: 04-core-interface-density
    plan: "01"
    provides: "Workbench density patterns and type-* scale"
provides:
  - Merged /sessions hero with collapsed metrics
  - Full-width project list without rules sidebar
  - Denser project cards and ≤2-panel overview first screen
affects:
  - 04-03
  - verify-work WB-02

tech-stack:
  added: []
  patterns:
    - "Collapsible defaultOpen=false for non-primary sections"
    - "Single-line next-action on project cards"
    - "Overview CTA via ProjectOverviewHeader only"

key-files:
  created:
    - src/app/(app)/sessions/sessions-metrics-collapsible.tsx
  modified:
    - src/app/(app)/sessions/page.tsx
    - src/app/(app)/sessions/SessionsClient.tsx
    - src/components/sessions/project-card.tsx
    - src/components/projects/project-overview-page.tsx
    - src/lib/projects/overview.ts

key-decisions:
  - "Metrics live in client Collapsible child; page imports SessionsMetricsCollapsible"
  - "Removed duplicate overview 下一步 panel; header CTA is sole primary action"
  - "Recent-events aside removed with rules sidebar per D-09/D-10"

patterns-established:
  - "List hint: one surface-subtle type-caption banner instead of rules aside"
  - "Stage badges map 待确认蓝图/可生成/进行中 to locked/flash/info tokens"

requirements-completed: [WB-02]

duration: 25min
completed: 2026-05-26
---

# Phase 4 Plan 02: Sessions List + Overview Density Summary

**Merged /sessions hero, collapsed metrics, full-width dual-book list, and overview capped at two first-screen panels with 进入工作台 / 确认蓝图 CTAs.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-05-26T12:00:00Z
- **Completed:** 2026-05-26T12:25:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Single hero `surface-panel` on `/sessions` with three quick-entry links; metrics in `Collapsible` default closed
- `SessionsClient` full-width: no 本页规则 sidebar; single-book section collapsed by default; one list hint
- `ProjectCard` one-line next action + semantic stage pills; overview grid ≤2 panels above fold; overview SSOT labels aligned

## Task Commits

1. **Task 1: Sessions page hero merge + metrics collapse** - `33c64ed` (feat)
2. **Task 2: SessionsClient — full-width list + single-book Collapsible** - `4a88d75` (feat)
3. **Task 3: Project cards + overview panel budget** - `5398474` (feat)

**Plan metadata:** `77fc73a` (docs)

## Files Created/Modified

- `src/app/(app)/sessions/sessions-metrics-collapsible.tsx` - Client collapsible metrics grid
- `src/app/(app)/sessions/page.tsx` - Merged hero, space-y-10, type-* typography
- `src/app/(app)/sessions/SessionsClient.tsx` - Full-width list, hint, single-book Collapsible
- `src/components/sessions/project-card.tsx` - Scan-friendly card layout and semantic badges
- `src/components/projects/project-overview-page.tsx` - ≤2 first-screen panels; type-* below fold
- `src/lib/projects/overview.ts` - 进入工作台 / 确认蓝图 next-action labels

## Decisions Made

- Extracted metrics into `sessions-metrics-collapsible.tsx` so the RSC page stays server-rendered while using Radix Collapsible
- Dropped the redundant overview 下一步 `surface-panel` because `ProjectOverviewHeader` already exposes the primary CTA

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Verification

- `rg` acceptance: no `xl:grid-cols-[1.5fr` / `1.55fr`, no `本页规则`, no `text-[Npx]` in touched UI files
- `npm test` — 197/197 pass
- `npm test -- src/lib/sessions/dashboard.test.ts` — pass (via full suite)

## Next Phase Readiness

- WB-02 list/overview density complete; ready for 04-03 workbench CTA consistency
- `deriveSessionDashboard`, `loadSessionDashboard`, dual redirect unchanged

## Self-Check: PASSED

- FOUND: src/app/(app)/sessions/sessions-metrics-collapsible.tsx
- FOUND: src/app/(app)/sessions/page.tsx
- FOUND: src/app/(app)/sessions/SessionsClient.tsx
- FOUND: src/components/sessions/project-card.tsx
- FOUND: src/components/projects/project-overview-page.tsx
- FOUND: src/lib/projects/overview.ts
- FOUND: commit 33c64ed
- FOUND: commit 4a88d75
- FOUND: commit 5398474

---
*Phase: 04-core-interface-density*
*Completed: 2026-05-26*
