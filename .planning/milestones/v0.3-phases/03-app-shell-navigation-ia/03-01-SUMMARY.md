---
phase: 03-app-shell-navigation-ia
plan: 01
subsystem: ui
tags: [nextjs, shell, navigation, dual-upload, redirect]

requires:
  - phase: 02-minimal-design-contract
    provides: type-caption, type-mono-label typography utilities
provides:
  - shell-title pathname contract for contextual header
  - dual-first sidebar/mobile CTAs to /upload?mode=dual
  - ContextualShellTitle in app layout header
  - dual session default workbench redirect with overview bypass
affects:
  - 03-02-app-nav-collapsible
  - phase-4-workbench-density

tech-stack:
  added: []
  patterns:
    - "Pure shell-title module consumed by client header component"
    - "Server redirect for dual default landing; ?view=overview for ProjectOverviewPage"

key-files:
  created:
    - src/lib/shell/shell-title.ts
    - src/lib/shell/shell-title.test.ts
    - src/components/contextual-shell-title.tsx
  modified:
    - src/components/sidebar.tsx
    - src/components/mobile-nav.tsx
    - src/app/(app)/layout.tsx
    - src/app/(app)/sessions/page.tsx
    - src/app/(app)/sessions/[id]/page.tsx
    - src/app/(app)/sessions/[id]/workbench/workbench-client.tsx

key-decisions:
  - "Overview bypass uses ?view=overview so 项目概览 link does not loop with default workbench redirect"

patterns-established:
  - "Shell CTAs: primary dual upload, secondary single upload; no /create in shell"
  - "Header title from resolveShellTitle(pathname); sessions list hint via shouldShowSessionsNextHint"

requirements-completed: [IA-02]

duration: 25min
completed: 2026-05-26
---

# Phase 3 Plan 01: Shell dual-first slice Summary

**Dual-first global shell: contextual header, dual upload CTAs, dual default workbench redirect, and overview back-link.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-05-26T00:00:00Z
- **Completed:** 2026-05-26T00:25:00Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Pathname → shell title contract with node:test coverage (11 behaviors)
- Sidebar and mobile nav align primary CTA to `/upload?mode=dual`; removed「当前主线」noise
- Dual sessions without legacy query redirect to workbench; sessions list CTAs synced
- Workbench PageHeader adds「项目概览」back to overview

## Task Commits

Each task was committed atomically:

1. **Task 1: Shell title contract (RED → GREEN)** - `d0a94f5` (test), `ec7043d` (feat)
2. **Task 2: Sidebar / mobile CTAs + contextual header** - `3bfa82d` (feat)
3. **Task 3: Sessions CTAs + dual redirect + 项目概览** - `64f069d` (feat)

**Plan metadata:** `7b89818` (docs: complete shell dual-first plan)

## Files Created/Modified

- `src/lib/shell/shell-title.ts` - Pure pathname title + sessions hint gate
- `src/lib/shell/shell-title.test.ts` - Contract tests
- `src/components/contextual-shell-title.tsx` - Client header chrome
- `src/components/sidebar.tsx` - Dual primary + single secondary CTAs
- `src/components/mobile-nav.tsx` - Mirrored CTA stack
- `src/app/(app)/layout.tsx` - ContextualShellTitle in header
- `src/app/(app)/sessions/page.tsx` - List/empty CTAs to dual upload
- `src/app/(app)/sessions/[id]/page.tsx` - Dual default workbench redirect
- `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx` - 项目概览 link

## Decisions Made

- Used `?view=overview` on overview links so default workbench redirect does not block D-11 back-navigation (Rule 2 correctness fix)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Overview bypass query for dual redirect**
- **Found during:** Task 3 (dual redirect)
- **Issue:** Unconditional `redirect` to workbench would make「项目概览」→ `/sessions/[id]` loop back to workbench
- **Fix:** Redirect only when `view !== "overview"`; workbench link uses `?view=overview`
- **Files modified:** `src/app/(app)/sessions/[id]/page.tsx`, `workbench-client.tsx`
- **Verification:** `npm test` pass; redirect pattern preserved in dual branch
- **Committed in:** `64f069d`

---

**Total deviations:** 1 auto-fixed (Rule 2)
**Impact on plan:** Required for D-11 overview reachability; no scope creep.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for 03-02: AppNav Collapsible「更多工具」+ mobile parity + /create compatibility strip
- IA-03 remains for plan 03-02

## Self-Check: PASSED

- FOUND: src/lib/shell/shell-title.ts
- FOUND: src/lib/shell/shell-title.test.ts
- FOUND: src/components/contextual-shell-title.tsx
- FOUND: d0a94f5
- FOUND: ec7043d
- FOUND: 3bfa82d
- FOUND: 64f069d

---
*Phase: 03-app-shell-navigation-ia*
*Completed: 2026-05-26*
