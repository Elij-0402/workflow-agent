---
phase: 03-app-shell-navigation-ia
plan: 02
subsystem: ui
tags: [nextjs, navigation, collapsible, radix, ia]

requires:
  - phase: 03-app-shell-navigation-ia
    plan: 01
    provides: dual-first shell CTAs, contextual header, workbench redirect
provides:
  - shadcn Collapsible secondary nav group 更多工具
  - PRIMARY/SECONDARY/FOOTER nav exports as IA SSOT
  - /create 推荐主路径 strip aligned with dual upload CTA
  - /upload dual PageHeader copy with 双书/参考书 verbs
affects:
  - phase-4-workbench-density

tech-stack:
  added: ["@radix-ui/react-collapsible"]
  patterns:
    - "AppNav owns two-tier IA; mobile and sidebar render AppNav only"
    - "Primary active only on /sessions and /; secondary never text-primary on icons"

key-files:
  created:
    - src/components/ui/collapsible.tsx
  modified:
    - src/components/app-nav.tsx
    - src/components/create/task-mode-page.tsx
    - src/app/(app)/upload/page.tsx
    - package.json
    - package-lock.json

key-decisions:
  - "Collapsible 更多工具 defaults closed with useState(false); no localStorage (D-15)"
  - "Primary 项目 active only pathname === /sessions or /; not workbench child routes (D-20)"

patterns-established:
  - "NavLink variant primary|secondary controls active scope and icon color"
  - "Shell nav: one primary row + collapsed secondary + dashed footer settings"

requirements-completed: [IA-02, IA-03]

duration: 18min
completed: 2026-05-26
---

# Phase 3 Plan 02: Collapsible IA + copy alignment Summary

**shadcn Collapsible「更多工具」分组、主导航仅突出项目、/create 推荐主路径条与 /upload 双书文案闭环。**

## Performance

- **Duration:** 18 min
- **Started:** 2026-05-26T18:57:00Z
- **Completed:** 2026-05-26T19:15:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Installed `@radix-ui/react-collapsible` via shadcn CLI; refactored `AppNav` with PRIMARY + collapsible SECONDARY + FOOTER
- Removed flat four-item nav; inactive nav icons no longer use `text-primary` (D-05)
- Mobile nav verified: `AppNav` only, no duplicate nav arrays; Sheet mirrors collapsible IA
- `/create` compatibility strip with 推荐主路径 and 新建双书项目 → `/upload?mode=dual`
- `/upload` dual hero title/description aligned with 双书/参考书 and workbench-first path; routing unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Collapsible primitive + AppNav IA refactor** - `5ef5e78` (feat)
2. **Task 2: Mobile parity + shell nav regression gates** - `1e296f9` (chore, verify-only)
3. **Task 3: /create 提示条 + /upload 文案对齐** - `ab97528` (feat)

**Plan metadata:** `b7dcbe4` (docs: complete collapsible IA plan)

## Files Created/Modified

- `src/components/ui/collapsible.tsx` - Radix collapsible primitive from shadcn
- `src/components/app-nav.tsx` - Two-tier IA with 更多工具 Collapsible
- `src/components/create/task-mode-page.tsx` - 推荐主路径 strip above mode cards
- `src/app/(app)/upload/page.tsx` - Dual PageHeader copy only
- `package.json`, `package-lock.json` - `@radix-ui/react-collapsible` dependency

## Decisions Made

- Collapsible default closed in memory only (no localStorage per D-15)
- Primary「项目」active scope limited to `/sessions` and `/` per D-20 / RESEARCH A1

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 03 IA-02/IA-03 navigation and copy requirements satisfied
- Phase 4 can consume shell IA; workbench density migration remains deferred

## Self-Check: PASSED

- FOUND: src/components/ui/collapsible.tsx
- FOUND: src/components/app-nav.tsx
- FOUND: src/components/create/task-mode-page.tsx
- FOUND: src/app/(app)/upload/page.tsx
- FOUND: 5ef5e78
- FOUND: 1e296f9
- FOUND: ab97528
- npm test: 192/192 pass

---
*Phase: 03-app-shell-navigation-ia*
*Completed: 2026-05-26*
