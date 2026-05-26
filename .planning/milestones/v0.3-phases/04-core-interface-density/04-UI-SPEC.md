---
phase: 4
slug: core-interface-density
status: draft
shadcn_initialized: true
preset: new-york · neutral · cssVariables · lucide
created: 2026-05-26
---

# Phase 4 — Core Interface Density UI Contract

**Status:** draft — pending gsd-ui-checker  
**Phase:** 04-core-interface-density  
**Requirements:** WB-01, WB-02, WB-03  
**Upstream (tokens & shell — MUST NOT redefine):**
- `.planning/phases/02-minimal-design-contract/02-UI-SPEC.md` — spacing, typography utilities, color roles, 60/30/10, dark-only
- `.planning/phases/03-app-shell-navigation-ia/03-UI-SPEC.md` — nav IA, shell CTAs, dual redirect, collapsible「更多工具」
- `.planning/phases/04-core-interface-density/04-CONTEXT.md` — implementation decisions D-01–D-18

**Audit source:** `.planning/phases/01-ux-audit-matrix/01-AUDIT-BACKLOG.md` (workbench/sessions rows #1–2, #5–12, #36, #47–55)

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (initialized) |
| Preset | new-york, neutral, cssVariables, lucide (`components.json`) |
| Component library | Radix via shadcn |
| Icon library | lucide-react |
| Font | Per `globals.css` / 02-UI-SPEC (`chinese-display` on display only) |

**Phase 4 rule:** Consume existing tokens and utilities only. **MUST NOT** add `:root` colors, new `--space-*`, or new `type-*` tiers in this phase.

---

## Global tokens (reference only — 02-UI-SPEC)

| Dimension | Phase 4 usage |
|-----------|----------------|
| Spacing scale | `--space-1`…`--space-6`; Tailwind `space-y-10` / `gap-10` for major breaks; `space-y-6` within a step block |
| Typography | `.type-display`, `.type-title`, `.type-body`, `.type-caption`, `.type-mono-label` only on `(app)/sessions/**` and workbench |
| Color | Semantic: `flash`, `info`, `warning`, `destructive`, `locked`, `blocked`; `primary` **only** on clickable primary `Button` |
| Surfaces | `surface-panel`, `surface-subtle`, `surface-locked`; panel `shadow-none`, `rounded-[var(--radius-md)]` |

---

## § Scope & boundary

| In scope | Out of scope |
|----------|--------------|
| `/sessions/[id]/workbench` — upload / analysis / compare / generate density | Global shell, `AppNav`, sidebar (03-UI-SPEC) |
| `/sessions`, `/sessions/[id]?view=overview`, `ProjectOverviewPage` | Token redefinition, light theme |
| CTA copy/variant parity for confirm / generate / batch on sessions routes | settings/studio/compare standalone pages (except workbench compare terminology) |
| Collapsed panels, hero merge, `text-[Npx]` migration on touched files | CNV-01 API convergence; mandatory &lt;500 lines/file gate |

**MUST NOT:** Change dual `redirect` to workbench (03-CONTEXT D-10). **MUST NOT:** Reintroduce four peer nav items or shell primary → `/create`.

---

## § WB-01 — Workbench three-step layout

### Flow model

| `FlowStep` | User-facing stage | StepIntro title (MUST, single line) | Primary CTA (one per viewport) |
|------------|-------------------|-------------------------------------|--------------------------------|
| `upload` | 上传 | 上传双书素材 | 继续分析（或等价动词，沿用现有 health 逻辑） |
| `analysis` | 分析 | 拆解章节 | 批量分析（footer 主按钮；进行中 → tracker 态） |
| `compare` | 对比蓝图 | 整理融合蓝图 | 确认蓝图 |
| `generate` | 生成 | 生成变体 | 生成新版本 |

**MUST:** Keep `WorkflowStageBar` + `PipelineBar` (`upload` → `analysis` → `compare` → `generate`).  
**MUST:** Each active step shows **exactly one** `Button variant="default"` primary CTA in the first viewport (02-UI-SPEC 一屏一焦点). Secondary actions: `outline` or `ghost` only.

### Vertical rhythm (spacing — application of 02)

| Zone | Rule |
|------|------|
| Between major step sections | `space-y-10` (40px) |
| Inside a step content column | `space-y-6` (24px) max between sibling blocks |
| Panel padding | `p-5` or `p-6` on `surface-panel` |
| Per-step `surface-panel` budget | **≤ 2** including merged footer action bar (not a third wrapped panel) |
| Step footer | Single sticky/action bar; **MUST NOT** nest inside an extra `surface-panel` (02-UI-SPEC § Surfaces) |

**MUST NOT:** `min-h-[680px]`, `min-h-[220px]`, `min-h-[260px]` or other arbitrary min-heights on workbench routes. Use `flex`, `min-h-0`, and spacing scale.

### Analysis step (`analysis`)

| Element | Default state | Layout |
|---------|---------------|--------|
| `StepIntro` | Visible | `type-title` heading; caption via `deriveHint` / `type-caption` |
| `PipelineBar` | Visible | Current step foreground; non-current labels `text-muted-foreground` |
| Chapter tree + batch zone | Visible | Primary work area |
| `AnalysisCapabilityPanel` | **Collapsed (closed)** | `Collapsible`; label e.g. 分析能力摘要; expanded = **single column** summary, `type-body` + `type-caption` — **MUST NOT** 3-column 12px grid |
| Footer action bar | Visible | One bar: batch primary + secondary outline actions |

**Backlog:** #1 (6+ regions), #36 (capability panel density), #53 (loading).

### Compare step (`compare`)

| Element | Rule |
|---------|------|
| Blueprint editor region | `flex` + `min-h-0`; no fixed 680px min-height |
| `CollapsedChaptersBar` | Keep; collapsible chapter strip |
| Footer | **Merged** single action bar; no duplicate explanatory panel beside `BlueprintEditor` |
| Primary CTA | 确认蓝图 — see § WB-03 |

**Backlog:** #7, #51 (footer duplication).

### Generate step (`generate`)

| Element | Rule |
|---------|------|
| Variant list + `GenerateDrawer` | Unchanged behavior; density via spacing |
| Empty result | `EmptySlot` with step number pattern (match upload step) |
| Primary CTA | 生成新版本 — opens drawer when blueprint confirmed |

**Backlog:** #55 (empty state).

### Upload step (`upload`)

| Element | Rule |
|---------|------|
| Health / status strip | `--info`, `--warning`, `--destructive` tokens — **MUST NOT** amber/sky hardcode |
| Copy | Action-oriented; no two-line technical titles |

**Backlog:** #47, #5.

### Workbench chrome

| Element | Rule |
|---------|------|
| 项目概览 link | **MUST** remain (Phase 3); polish spacing/`type-*` only |
| `PipelineBar` separators | Muted only; **MUST NOT** decorative `text-primary` on inactive step glyphs |
| Route loading | Add `workbench/loading.tsx` skeleton for long batch operations |

**Backlog:** #12, #11.

### Typography (workbench files only)

| MUST | MUST NOT |
|------|----------|
| Replace all touched `text-[Npx]` with `type-display` / `type-title` / `type-body` / `type-caption` / `type-mono-label` | New arbitrary `text-[Npx]` in `(app)/sessions/**` |
| `data-label` → `text-muted-foreground` | `text-primary` except on primary `Button` |
| Step titles: `type-title`, one line | Two-line technical jargon titles |

**Backlog:** #9, #45, #11.

---

## § WB-02 — Sessions list & project overview

### `/sessions` — hero & first screen

| Before (audit) | After (contract) |
|----------------|------------------|
| Two stacked `surface-panel` (主状态 + 快速入口) | **One** hero block OR two segments in **one** parent with `space-y-10` between segments — not duplicate full panels |
| 4× `MetricCard` dominant | Metrics **collapsed by default** (`Collapsible`) **or** one row of 3–4 `type-caption` stats; **list is the hero** |
| Side「本页规则」panel | **Removed**; replace with single contextual `HintBanner` or one `type-caption` hint at top |
| Decorative `text-primary` on icons | `text-muted-foreground` |

**PageHeader primary (shell-aligned):** 新建双书项目 → `/upload?mode=dual` (03-UI-SPEC; backlog #3 resolved in Phase 3 — do not regress).

**Backlog:** #6, #8, #49, #51.

### `SessionsClient` — list layout

| Zone | Rule |
|------|------|
| 双书项目 | Primary grid; card = title (`type-title`) + one `type-caption` muted next step from `deriveSessionDashboard` + semantic badge (`flash` / `info` / `locked`) |
| 单书兼容项目 | **Collapsed by default**; `Collapsible` label: 单书兼容项目 |
| Layout | **MUST NOT** three-column layout with sidebar rivaling main grid; main column ≥70% width on `lg+` |
| `nextHref` | Prominent link/button on card using dashboard SSOT |

**Backlog:** #8 (三栏), #6.

### Project overview (`/sessions/[id]` overview view)

| Rule | Value |
|------|-------|
| `surface-panel` count | **≤ 2** |
| Dominant CTA | 进入工作台 → workbench; secondary 确认蓝图 when applicable |
| Copy verbs | Match workbench (确认蓝图, 生成新版本) |

**Backlog:** #4 (partially Phase 3 redirect); overview density #6.

---

## § WB-03 — Primary CTA hierarchy & feedback

### Global CTA table (sessions + workbench)

| Action | Copy (MUST, exact) | Variant | Enabled when | Disabled / blocked UX |
|--------|-------------------|---------|--------------|------------------------|
| Confirm blueprint | 确认蓝图 | `default` | `blueprintReadyToConfirm` | `disabled` + `type-caption` reason |
| Generate new version | 生成新版本 | `default` on generate step | Blueprint confirmed | Toast: blueprint not confirmed + link to compare step |
| Batch analysis | 批量分析 | `default` on analysis footer | Step = analysis, not batch-running | Show `BatchTracker` + disable duplicate submit |
| Enter workbench | 进入工作台 | `default` on overview | Always for dual active session | — |
| New dual project | 新建双书项目 | `default` on `/sessions` header | Always | Per 03-UI-SPEC |

**MUST:** Same copy on workbench and overview for confirm / generate.  
**MUST NOT:** Decorative `text-primary` on labels, icons, or static text in `(app)/sessions/**` routes touched this phase.

### Destructive & secondary

| Action | Confirmation |
|--------|----------------|
| Delete session / archive | Existing dialog; `destructive` button; no copy change in Phase 4 unless already inconsistent |
| Cancel batch | `outline` or `ghost`; no primary variant |

### Empty & error copy (phase routes)

| Element | Copy |
|---------|------|
| Sessions empty — heading | 还没有项目 |
| Sessions empty — body | 从双书上传开始，系统会引导你完成分析、蓝图与生成。 |
| Sessions empty — primary CTA | 新建双书项目 → `/upload?mode=dual` |
| Workbench generate empty — heading | 还没有变体 |
| Workbench generate empty — body | 确认蓝图后，在此生成新版本。 |
| Batch failure toast | 批量分析失败 — 请检查章节后重试。（附重试或返回分析步，backlog #53） |
| Blueprint not confirmed (generate block) | 请先确认蓝图 — 前往对比蓝图步骤 |

---

## Spacing scale (phase application)

Uses 02-UI-SPEC tokens only. Phase 4 **additions** are layout rules, not new px values:

| Context | Tailwind / token |
|---------|------------------|
| Workbench step stack | `space-y-10` between StepIntro, main, footer |
| Sessions page sections | `space-y-10` between hero and list |
| Within hero / card | `space-y-6`, `gap-6` |
| Panel internal | `p-5` or `p-6` |
| Compact inline (icons) | `gap-2` (8px) |

**Exceptions:** Touch targets on icon-only controls remain ≥44px per platform accessibility (not a new spacing token).

**MUST NOT:** `gap-4` dense stacks of multiple `surface-panel` on `/sessions` first screen.

---

## Typography (phase application)

| Role | Utility (from 02) | Phase 4 placement |
|------|-------------------|-------------------|
| Workbench step title | `type-title` | `StepIntro` — one line |
| Page / list title | `type-display` or `type-title` | `/sessions` hero title once per view |
| Body | `type-body` | Editor hints, descriptions |
| Next step / status | `type-caption` + semantic color class | Card subtitle, disabled CTA reason |
| Eyebrow / step index | `type-mono-label` | Pipeline labels; **muted only** |

**Weights:** 400 body, 600 semibold titles — per 02-UI-SPEC (no new weights).

**Line height:** body 1.5, headings 1.2 — unchanged from 02.

---

## Color (phase application)

| Role | Phase 4 rule |
|------|----------------|
| Dominant (60%) | Page `background` + body text — unchanged |
| Secondary (30%) | `surface-panel`, cards, muted labels |
| Accent (10%) | **Reserved for:** primary `Button` default variant only on the single focal CTA per viewport |
| Status | Upload/analysis/compare/generate status chips use `--info`, `--warning`, `--destructive`, `flash`, `locked` — not Tailwind amber/sky |

**Accent MUST NOT appear on:** static headings, `PipelineBar` inactive steps, metric icons, capability panel labels, list card icons.

---

## Component inventory (reuse — no new design system)

| Component | Phase 4 duty |
|-----------|----------------|
| `WorkflowStageBar` / `PipelineBar` | Step progress; muted inactive |
| `StepIntro` | Single-line action titles |
| `Collapsible` | Capability panel, metrics, 单书区 |
| `HintBanner` | `/sessions` contextual hint (replaces rules sidebar) |
| `BatchTracker` | Analysis step in-progress |
| `BlueprintEditor` / `CollapsedChaptersBar` | Compare step; flex layout |
| `GenerateDrawer` | Generate step |
| `EmptySlot` | Upload + generate empty parity |
| `PageHeader` | Sessions + overview |
| `Button` / `Link` | CTA hierarchy per § WB-03 |
| `deriveHint` / `deriveSessionDashboard` | Copy SSOT for hints and next step |

---

## Registry safety

| Registry | Blocks / components | Safety Gate |
|----------|---------------------|-------------|
| shadcn official | `Button`, `Collapsible`, `Sheet` (if used), existing ui/* | not required |
| Third-party | none declared | — |

---

## Backlog traceability

| Backlog # | WB | UI-SPEC section |
|-----------|-----|-----------------|
| 1, 2 | WB-01 | § WB-01 analysis density, panel budget |
| 5 | WB-01 | StepIntro titles |
| 7, 51 | WB-01 | Compare flex, merged footer |
| 9, 45 | WB-01, WB-03 | Typography migration |
| 11 | WB-03 | No decorative primary |
| 12, 53 | WB-01, WB-03 | loading.tsx, batch feedback |
| 36 | WB-01 | Capability panel collapsed + single column |
| 47 | WB-01 | Upload semantic colors |
| 55 | WB-01 | Generate EmptySlot |
| 6, 8, 49 | WB-02 | Hero merge, metrics collapse, list layout |
| 3, 4 | — | Addressed Phase 3; Phase 4 must not regress |

---

## Alignment checklist (Phase 4)

- [ ] Workbench: one primary CTA per active step viewport
- [ ] Workbench: ≤2 `surface-panel` per step; capability panel default collapsed
- [ ] Workbench: no `text-[Npx]` added; touched files migrated to `type-*`
- [ ] Workbench: no arbitrary min-heights; compare uses flex + `min-h-0`
- [ ] Workbench: `workbench/loading.tsx` present for batch wait
- [ ] Sessions: single hero pattern; metrics collapsed or caption row
- [ ] Sessions: 单书区 default collapsed; no three-column rules sidebar
- [ ] CTAs: 确认蓝图 / 生成新版本 / 批量分析 copy and variant rules consistent
- [ ] No decorative `text-primary` on sessions/workbench routes
- [ ] Shell / redirect behavior unchanged from 03-UI-SPEC

---

## Checker sign-off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending

---

## Decision traceability (04-CONTEXT)

| ID | SPEC section |
|----|----------------|
| D-01–D-06 | § WB-01 |
| D-07–D-11 | § WB-02 |
| D-12–D-16 | § WB-03 |
| D-17–D-18 | Spacing / Typography application |

---

*Consumes 02-UI-SPEC tokens; respects 03-UI-SPEC shell. Does not redefine global design tokens.*
