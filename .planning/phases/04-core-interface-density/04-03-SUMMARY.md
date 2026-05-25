---
phase: 04-core-interface-density
plan: 03
subsystem: ui
tags: [cta-copy, workbench, wb-03, typography, sonner]

requires:
  - phase: 04-core-interface-density
    plan: "01"
    provides: workbench layout density and step chrome
provides:
  - CTA_COPY SSOT for confirm / generate / batch / enter-workbench labels
  - blueprintReadyToConfirm-gated confirm button with type-caption missing list
  - generate-before-confirm toast and muted caption on workbench generate step
  - decorative text-primary purge on phase-touched sessions/workbench routes
affects:
  - 04-core-interface-density verification and UAT WB-03

tech-stack:
  added: []
  patterns:
    - "src/lib/ui/cta-copy.ts as single source for WB-03 button and toast strings"
    - "node:test contract on CTA_COPY literals"

key-files:
  created:
    - src/lib/ui/cta-copy.ts
    - src/lib/ui/cta-copy.test.ts
  modified:
    - src/components/workbench/blueprint-editor.tsx
    - src/components/workbench/generate-drawer.tsx
    - src/components/workbench/hint-banner.tsx
    - src/components/workbench/chapter-tree.tsx
    - src/components/workbench/pipeline-bar.tsx
    - src/components/workbench/batch-tracker.tsx
    - src/components/sessions/generate-panel.tsx
    - src/app/(app)/sessions/[id]/workbench/workbench-client.tsx

key-decisions:
  - "Blueprint confirm uses disabled + adjacent caption from ready.missing instead of toast-only UX"
  - "Generate gate shows CTA_COPY.blueprintBlockedToast and routes to compare step via navigateToStep/openGenerateDrawer"

patterns-established:
  - "Import CTA_COPY for any new sessions/workbench primary CTA or blocked-generate copy"

requirements-completed: [WB-03]

duration: 25min
completed: 2026-05-26
---

# Phase 4 Plan 03: CTA SSOT & Primary Hierarchy Summary

**WB-03 CTA copy SSOT with blueprint confirm gating, generate/batch label parity, and decorative primary removal on touched sessions/workbench routes.**

## Performance

- **Duration:** 25 min
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Added `CTA_COPY` module and node:test contract for confirm / generate / batch / enter-workbench and blocked-generate strings.
- Wired `BlueprintEditor` confirm button to `blueprintReadyToConfirm` (disabled + missing caption); draft badge uses muted foreground.
- Unified generate and batch labels across workbench, drawers, and panels; toast `请先确认蓝图 — 前往对比蓝图步骤` when opening generate before confirm.
- Cleared decorative `text-primary` and migrated `text-[Npx]` to `type-*` utilities on phase-touched workbench and session files.

## Task Commits

1. **Task 1: CTA_COPY SSOT + blueprint confirm wiring** — `9f072a3` (feat)
2. **Task 2: Generate gate + batch primary + drawer parity** — `8f7c31e` (feat)
3. **Task 3: Decorative primary purge + typography gate** — `0619673` (feat)

**Plan metadata:** `fe39387` (docs)

## Files Created/Modified

- `src/lib/ui/cta-copy.ts` — WB-03 label and toast constants
- `src/lib/ui/cta-copy.test.ts` — literal contract tests
- `src/components/workbench/blueprint-editor.tsx` — confirm/generate CTA + ready gate
- `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx` — generate drawer gate, batch failure toast, typography
- `src/components/workbench/generate-drawer.tsx`, `generate-panel.tsx`, `chapter-tree.tsx`, `hint-banner.tsx`, `pipeline-bar.tsx`, `batch-tracker.tsx` — CTA copy and muted/semantic color

## Decisions Made

- Generate blocked UX navigates to compare step after toast so users land on the confirm-blueprint viewport.
- Batch failure toast uses SSOT string instead of dynamic failure count message (aligns with 04-UI-SPEC).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Verification

- `npm test` — 197 tests, 0 failures
- `npm test -- src/lib/ui/cta-copy.test.ts` — pass (via full suite)
- Grep: no `text-[Npx]` in touched workbench-client / blueprint-editor / chapter-tree / generate-drawer
- Grep: no decorative `text-primary` on touched workbench chrome files listed above

## User Setup Required

None

## Next Phase Readiness

WB-03 copy and gating are locked; ready for phase verification (`/gsd-verify-work`) and any remaining 04 plans.

## Self-Check: PASSED

- FOUND: src/lib/ui/cta-copy.ts
- FOUND: src/lib/ui/cta-copy.test.ts
- FOUND: src/components/workbench/blueprint-editor.tsx
- FOUND: 9f072a3, 8f7c31e, 0619673

---
*Phase: 04-core-interface-density*
*Completed: 2026-05-26*
