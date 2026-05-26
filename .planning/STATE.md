---
gsd_state_version: 1.0
milestone: v0.4
milestone_name: UX Foundation
status: planning
last_updated: "2026-05-26T08:11:36.598Z"
last_activity: 2026-05-26
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-26)

**Core value:** 双书蓝图主路径顺畅且令人愿意每天用
**Current focus:** Phase 1 — 01-foundation-url-state (URL-as-state + palette/nuqs/debounce primitives + bundle baseline)

## Current Position

Phase: 1 — 01-foundation-url-state
Plan: — (awaiting `/gsd-plan-phase 1`)
Status: Roadmap created; awaiting Phase 1 plan
Last activity: 2026-05-26 — v0.4 ROADMAP.md created (5 phases, 36 v1 requirements mapped)

## Performance Metrics

**Velocity (v0.3, historical):**

- Total plans completed: 15 (across 5 phases)
- Average duration: 23min
- Total execution time: 71min

**By Phase (v0.3):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-ux-audit-matrix | 2/2 | 46min | 23min |
| 02-minimal-design-contract | 2/2 | 35min | 18min |
| 03-app-shell-navigation-ia | 2/2 | 43min | 22min |
| 04 | 3/3 | — | — |
| 05 | 2/2 | — | — |

**Recent (v0.4):** Roadmap created 2026-05-26; no plans started.

## Accumulated Context

### Decisions (carried forward + v0.4)

- 主路径 = 双书蓝图；先审计后减法；**dark-only 已写入 Approved `02-UI-SPEC.md`**（v0.3 AUD-03、IA-01 完成）
- **v0.3 IA 已锁定：** 主导航仅突出「项目」+ 折叠「更多工具」；全局新建→`/upload?mode=dual`；dual 默认 redirect workbench
- 功能矩阵与旅程嵌入 `01-FEATURE-MATRIX.md`（v0.3 AUD-01 完成）
- P0 UI Overall 14/24（v0.3 baseline）；v0.4 POL-06 目标 ≥ 21/24，单柱不低于 3/4
- [v0.4 Phase 1+]: `nuqs` (URL state) + `cmdk` (palette primitive) + `diff@9` (CJK diff) — 三个 new deps；framer-motion / zustand / useChat / Tiptap / 虚拟列表全部 out of scope
- [v0.4 Phase 1+]: bundle baseline 在 Phase 1 通过 `@next/bundle-analyzer` 捕获；后续 phase +50 KB gzipped 为 regression 门禁
- [v0.4 Phase 2]: workbench 重构按 `FlowStep` 拆 4 路由；`useBlueprintGate()` + `useGenerateBlock()` 必须先以独立 PR 抽出再拆路由
- [v0.4 Phase 2]: 单书入口硬下线（Q6: <50 rows）；`/upload?mode=single` → 301 → `?mode=dual`；DB 历史行保留只读
- [v0.4 Phase 3]: inline editor 用 native `<textarea>`（非 Tiptap/contentEditable），IME composition 通过 `isComposing` + `keyCode===229` 双重门禁；防抖 flush 在 `compositionend` 后
- [v0.4 Phase 3]: palette 用 `<CommandDialog>`（Radix Dialog + cmdk）单实例挂载在 `(app)/layout.tsx`，不在 root layout
- [v0.4 Phase 4]: 流式继续用现有 custom SSE（`consumeSseStream` + `sseResponse`），**不**引入 `useChat` / `@ai-sdk/react`
- [v0.4 Phase 4]: CJK diff 走 `Intl.Segmenter("zh", { granularity: "word" })` + 段落 `content-visibility: auto`，**不**用 react-window
- [v0.4 Phase 4]: 文风 panel 首条迁移 DF-03 语义控件；Persona/Plot/Constraints 三 panel 在 v0.4 保持 freeform
- [v0.4 Phase 5]: 99 处 `text-[Npx]` 替换严禁动态类（Tailwind purge 门禁）；用 `const sizeMap = {...} as const` 字面量映射

### Pending Todos

- Confirm `src/lib/schemas/blueprint.ts` 全部字段 plain-text 固定形（Phase 3 pre-gate; SUMMARY Open Q1）
- Confirm `/api/blueprint` 409 response body 包含当前 `updated_at`（Phase 3/4 pre-gate; SUMMARY Open Q3）
- Verify `Intl.Segmenter` 在部署目标 Browserslist 支持矩阵（Phase 4 pre-gate; SUMMARY § Gaps）
- Capture bundle analyzer baseline 数字（Phase 1 plan output）

### Blockers/Concerns

None blocking; three pre-phase verification gates documented above will be checked during Phase 3 / Phase 4 plan-phase.

## Deferred Items

Items acknowledged and deferred at v0.3 milestone close on 2026-05-26 (carried forward):

| Category | Item | Status |
|----------|------|--------|
| verification | v0.3 Phase 03: 03-VERIFICATION.md human_needed | Covered by Phase 5 owner UAT (11/11); formal status not re-run |

- v2 可选收敛（CNV-01–03：legacy API、维度统一、大组件拆分）— 见 v0.3 `05-VERIFICATION.md`
- v0.4 v2 backlog（PAL-X, DIF-X, CRB-X, WBS-X, STR-X）— 见 REQUIREMENTS.md `## v2 Requirements`

## Operator Next Steps

- Run `/gsd-plan-phase 1` to create plans for Phase 1 (01-foundation-url-state)
