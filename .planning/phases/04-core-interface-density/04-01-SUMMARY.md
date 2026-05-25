---
phase: 04-core-interface-density
plan: 01
subsystem: ui
tags: [workbench, collapsible, density, shadcn, nextjs]

requires:
  - phase: 03-app-shell-navigation-ia
    provides: Collapsible nav pattern, dual redirect, 项目概览 link
provides:
  - WB-01 workbench density slice (collapsible analysis guide, step action bars, action titles)
  - Workbench-shaped route loading skeleton
  - Muted PipelineBar separators
affects:
  - 04-02-sessions-list-density
  - 04-03-token-sweep

tech-stack:
  added: []
  patterns:
    - "StepActionBar sticky footer without surface-panel wrapper"
    - "AnalysisCapabilityPanel Collapsible default closed, single-column expanded"

key-files:
  created: []
  modified:
    - src/app/(app)/sessions/[id]/workbench/workbench-client.tsx
    - src/app/(app)/sessions/[id]/workbench/loading.tsx
    - src/components/workbench/pipeline-bar.tsx

key-decisions:
  - "Analysis guide uses surface-subtle Collapsible (not default-open surface-panel grid)"
  - "Compare footer hint defers blueprint confirm copy to BlueprintEditor only"

patterns-established:
  - "Action-oriented StepIntro single-line titles per FlowStep"
  - "space-y-10 between major workbench step sections"

requirements-completed: [WB-01]

duration: 12min
completed: 2026-05-26
---

# Phase 4 Plan 01: Workbench Density Summary

**Workbench three-step density: collapsible analysis guide, sticky StepActionBar footers, action titles, no 680px compare min-height, workbench loading skeleton**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-26T12:00:00Z
- **Completed:** 2026-05-26T12:12:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Analysis step: `PipelineBar`, `拆解章节` title, `Collapsible` capability panel (default closed, single-column expanded), `StepActionBar` footer without extra `surface-panel`
- Compare/generate: removed `min-h-[680px]`, titles `整理融合蓝图` / `生成变体`, unified `生成新版本` CTA, semantic `text-warning`/`text-info` on upload status
- `loading.tsx`: workbench-shaped skeleton (header, stage bar, dual chapter columns, `space-y-10`)
- `PipelineBar`: separators `text-muted-foreground/30` (no decorative primary)

## Task Commits

1. **Task 1: Analysis step — Collapsible capability + single action bar** — `07ba903` (feat)
2. **Task 2: Compare + generate steps — layout + StepIntro + tokens** — `07ba903`, `d8311f1` (feat)
3. **Task 3: Workbench loading skeleton** — `6775f3a` (feat)

**Plan metadata:** `5360034` (docs)

## Files Created/Modified

- `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx` — density layout, Collapsible analysis guide, StepActionBar, type-* migration on touched blocks
- `src/components/workbench/pipeline-bar.tsx` — muted separators, `type-caption`
- `src/app/(app)/sessions/[id]/workbench/loading.tsx` — structured skeleton replacing generic `PageLoadingShell`

## Decisions Made

- Collapsed analysis guide uses `surface-subtle` + Radix `Collapsible` (aligned with Phase 3 app-nav pattern)
- Compare step footer no longer repeats blueprint-ready messaging (confirm stays in `BlueprintEditor`)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for 04-02 (sessions list / overview density) or 04-03 token sweep
- ChapterTree still hosts per-book batch buttons (plan scoped `workbench-client.tsx` only); footer batch-only CTA can be a follow-up if product wants stricter single-CTA

## Self-Check: PASSED

- FOUND: `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx`
- FOUND: `src/app/(app)/sessions/[id]/workbench/loading.tsx`
- FOUND: `src/components/workbench/pipeline-bar.tsx`
- FOUND commits: `07ba903`, `d8311f1`, `6775f3a`
- `npm test`: 192/192 pass

---
*Phase: 04-core-interface-density*
*Completed: 2026-05-26*
