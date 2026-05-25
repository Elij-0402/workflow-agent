# Phase 3: 应用壳与导航 IA — Research

**Researched:** 2026-05-26  
**Domain:** Next.js 15 App Router shell (sidebar/header/mobile nav), information architecture, server redirects  
**Confidence:** HIGH (codebase + locked CONTEXT/UI-SPEC); MEDIUM (Collapsible install version pin)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### 主导航结构（IA-02 / IA-03）
- **D-01:** 主导航 **仅一层突出「项目」**（`/sessions`）— 与创作台/对比/资料库 **不同视觉层级**，不得四项同级并列。
- **D-02:** 次要三项收入 **「更多工具」可折叠区**（`创作台` `/studio`、`对比` `/compare`、`资料库` `/library`），**默认折叠**；展开后样式为 `text-muted-foreground` + 缩进，无 primary 图标色（对齐 UI-SPEC CTA/装饰规则）。
- **D-03:** **设置** 保持现有页脚分隔区（`FOOTER_ITEMS`），不与「更多工具」混排。
- **D-04:** `app-nav.tsx` 为 IA 单一事实来源；`mobile-nav` Sheet **镜像** 相同两级结构（非简化掉次要项）。
- **D-05:** 活跃态仍用左侧 2px 条 + `text-foreground`；**非活跃** 导航图标 **禁止** `text-primary`（回应 backlog #11 在 nav 上的外溢）。

#### 全局「新建」CTA（审计 #3、#15）
- **D-06:** Sidebar 与 MobileNav 的 **唯一 primary Button** → `/upload?mode=dual`，文案 **「新建双书项目」**（动词 + 路径明确）。
- **D-07:** 其下增加 **secondary**（`Button variant="outline"` 或 `Link` ghost）：**「单书项目」** → `/upload?mode=single`（与矩阵「单书兼容」一致；**不**用全局 primary 链 `/create`）。
- **D-08:** `/sessions` 页 `PageHeader` 的 `action` primary 与空态主按钮 **同步** 为 D-06（替换当前 `/create`）。
- **D-09:** `/create` **不再** 作为壳层 primary 目标；保留路由供任务模式页与深链，入口仅通过 D-07 或页内说明。

#### dual 项目默认落点（审计 #4）
- **D-10:** `sessions.mode === "dual"` 且 **无** legacy workbench query 时：`/sessions/[id]` **服务端 redirect** → `/sessions/[id]/workbench`（保留现有 `getDualWorkbenchRedirect` 对旧 URL 的兼容）。
- **D-11:** **项目概览**（现 `ProjectOverviewPage`）仍保留在 `/sessions/[id]`，通过 **情境入口** 可达：工作台顶栏或 Pipeline 区 **「项目概览」** 链回概览（Phase 3 至少提供一处明确链接；详细布局 Phase 4 可抛光）。
- **D-12:** 单书会话 **不** redirect，维持 `/sessions/[id]` 详情页行为。
- **D-13:** 从项目列表点击进入：dual → workbench；single → 详情（与 D-10–D-12 一致）。

#### 次要能力分层实现（03-02）
- **D-14:** 实现载体 = **`AppNav` 内 Collapsible**（优先 shadcn `Collapsible` 或等效，与现有 `Sheet` 移动壳一致）；**不** 新增第四条产品主线路由。
- **D-15:** 折叠区 **默认 collapsed**；v1 **不** 做 localStorage 记忆（减少状态债；若用户反馈再 v2）。
- **D-16:** 次要项在折叠区内 **垂直列表、左缩进 1 级**；组标题文案 **「更多工具」**（`mono-label` 或 `type-mono-label`）。
- **D-17:** 独立 `/compare`、`/studio` 页 **不** 改功能，仅降低发现频率；用户仍可通过折叠区或书签直达。

#### 壳层引导文案（IA-02「30 秒懂下一步」）
- **D-18:** **移除** sidebar 内 `surface-subtle`「当前主线」说明块（减少壳层噪声与多余 panel）。
- **D-19:** Logo 区副标题改为 **「双书蓝图工作台」**（11px muted，一句道破主路径）。
- **D-20:** Header 右侧静态「工作台 / 项目优先」眉标 → **`ContextualShellTitle`**（按 pathname 映射：项目、工作台、创作台、对比、资料库、设置等）。
- **D-21:** **仅** 在 `/sessions` 列表页：header 附一行 muted 提示 **「下一步：打开项目或新建双书」**；其他路由不重复该句（避免噪音）。
- **D-22:** 壳层文案迁移：导航与 CTA 禁用新增 `text-[Npx]`，改用 `type-caption` / `type-body`（与 UI-SPEC § Typography）。

#### 单书与 `/create` 在 IA 中的位置
- **D-23:** **无** 顶栏「单书」项；单书仅在项目列表分区与 D-07 次级入口出现。
- **D-24:** `/create`（`TaskModePage`）页顶增加 **主路径提示条**（`surface-subtle` 或 PageHeader 描述）：推荐 **双书** → `/upload?mode=dual` primary；当前创建流为 **高级/兼容** secondary 说明（不写实现方案，plan 定组件）。
- **D-25:** `/upload` 页 hero 文案与 D-06 动词一致（「双书」「参考书」），与 sessions 快速入口卡片对齐（回应 backlog #15）。

### Claude's Discretion
- 用户授权 **「六区全讨论，你来选」** — 上列决策按 Phase 1 P0 backlog、Phase 2 UI-SPEC、PROJECT 主路径约束取 **推荐默认**（与 Phase 2 相同委托模式）。
- Collapsible 动画时长、`ContextualShellTitle` 路径映射表、概览链 exact 放置（header vs workbench 内）由 planner/executor 在 03-01/03-02 细化，不得违背 D-01–D-25。
- Sidebar 宽度（264px）可微调以适配折叠标题，本阶段 **不** 改 `app-shell-grid` 整体布局架构。

### Deferred Ideas (OUT OF SCOPE)
- **workbench 分析步单焦点、panel 层数、任意 px** — Phase 4（backlog #1–2、#9）。
- **sessions 列表首屏双 panel / 三栏布局** — Phase 4（backlog #6、#8）。
- **PipelineBar 内概览链的视觉抛光** — Phase 4 可与 WB-01 一并做。
- **折叠区展开状态 localStorage** — v2 可选。
- **`/design-system` 生产 guard** — P3。
- **legacy `/api/generate` 收敛** — v2 CNV-01。
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IA-02 | 主导航与全局壳层以双书蓝图为默认英雄旅程（新用户 30 秒内知下一步） | D-06–D-09 CTA 对齐 dual upload；D-10 dual→workbench；D-18–D-21 壳层文案与情境 header；`deriveSessionDashboard` 已导向 workbench |
| IA-03 | 次要能力默认折叠或二级入口，高级用户仍可直达 | D-01–D-02 Collapsible「更多工具」；D-14–D-17；路由保留，仅 IA 降权 |
</phase_requirements>

## Summary

Phase 3 is a **focused shell refactor** on existing Next.js 15 + shadcn/Radix components—no new product routes, no workbench density work. Today’s shell exposes four equal-weight nav items (`app-nav.tsx`), primary CTAs to `/create`, a noisy sidebar「当前主线」panel, and dual sessions that land on `ProjectOverviewPage` instead of workbench unless legacy query params are present. Locked CONTEXT decisions prescribe a **single-source IA** in `AppNav` (primary「项目」+ collapsed「更多工具」+ footer 设置), **one shell primary CTA** to `/upload?mode=dual`, and a **server redirect** for dual `/sessions/[id]` when no legacy workbench query.

The codebase already implements **list click routing** for dual projects via `deriveSessionDashboard` → `nextHref` pointing at `/sessions/[id]/workbench` (with step query when needed); the main gap is **direct URL/bookmark** hits to `/sessions/[id]` and **shell discovery** (nav + CTAs + copy). Adding shadcn `Collapsible` is the only new dependency; typography utilities (`type-caption`, `type-mono-label`) already exist in `globals.css` from Phase 2.

**Primary recommendation:** Implement 03-01 as IA + CTA + redirect + header chrome; 03-02 as Collapsible secondary group + mobile parity + `/create` compatibility strip—keep all route changes inside existing files listed in CONTEXT canonical refs.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Nav hierarchy & labels | Browser (client `AppNav`) | — | `usePathname` active state; shared by sidebar + mobile Sheet |
| Global shell CTAs | Browser (`Sidebar`, `MobileNav`) | — | Client `Link`/`Button`; must mirror structure |
| Contextual header title & `/sessions` hint | Browser (`ContextualShellTitle` in header) | Frontend server (`layout.tsx` composition) | Pathname-gated copy requires client component in sticky header |
| dual default landing | API/Backend (Server Component `sessions/[id]/page.tsx`) | — | `redirect()` after Supabase mode check; preserves legacy query mapping |
| List row deep links | API/Backend (`deriveSessionDashboard`) | Browser (`ProjectCard`) | Already server-derived `nextHref`; verify no regression |
| 项目概览 back-link | Browser (`workbench-client` header) | — | Phase 3 minimum one explicit link; Phase 4 may polish PipelineBar |
| Secondary route pages (`/studio`, etc.) | Browser (page content) | — | **Out of scope** for functional change per D-17 |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | ^15.1.0 [VERIFIED: package.json] | App Router, `redirect()` in RSC | Project stack; dual landing is server-side |
| React | ^19.0.0 [VERIFIED: package.json] | Client nav, Collapsible state | Matches existing shell components |
| @radix-ui/react-dialog | ^1.1.15 [VERIFIED: package.json] | Mobile `Sheet` | Already used by `mobile-nav.tsx` |
| @radix-ui/react-collapsible | 1.1.12 [VERIFIED: npm registry] |「更多工具」折叠组 | Official shadcn pattern; slopcheck `[OK]` |
| lucide-react | ^0.468.0 [VERIFIED: package.json] | Nav icons, chevron on collapsible trigger | Consistent with existing nav |
| Tailwind + CVA | existing [VERIFIED: package.json] | `type-*` utilities, nav variants | Phase 2 UI-SPEC locked |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui Collapsible | new-york style [CITED: ui.shadcn.com] | Accessible expand/collapse | D-14; add with `npx shadcn@latest add collapsible` |
| `cn()` from `@/lib/utils` | — | Conditional nav classes | Existing pattern in `app-nav.tsx` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn Collapsible | Manual `useState` + `aria-expanded` | Violates D-14; more a11y work |
| Client redirect for dual | Server `redirect()` only | Server is correct for bookmarked `/sessions/[id]`; client list already uses `nextHref` |
| Separate mobile nav tree | Single `AppNav` export | Violates D-04; duplicate IA risk |

**Installation:**

```bash
npx shadcn@latest add collapsible
```

**Version verification:** Run `npm view @radix-ui/react-collapsible version` before plan execution; slopcheck reported `[OK]` for package name on npm (install subprocess failed in research environment only).

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| @radix-ui/react-collapsible | npm | Mature (Radix) | High (Radix monorepo) | github.com/radix-ui/primitives | OK | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none  
**Packages flagged as suspicious [SUS]:** none  

*No other new packages required for Phase 3.*

## Project Constraints (from .cursor/rules/)

No `.cursor/rules/` directory found in the workspace. Follow `.planning/phases/02-minimal-design-contract/02-UI-SPEC.md` as hard constraint: dark-only, one primary CTA per shell viewport, no decorative `text-primary` on inactive nav, no new `text-[Npx]` in `(app)` shell files.

## Architecture Patterns

### System Architecture Diagram

```text
[Login] → /sessions (list)
            │
            ├─ Shell: Sidebar/MobileNav
            │     ├─ Primary CTA → /upload?mode=dual
            │     ├─ Secondary CTA → /upload?mode=single
            │     └─ AppNav
            │           ├─ 项目 (/sessions)  ← tier 1
            │           ├─ [更多工具] collapsed
            │           │     ├─ /studio
            │           │     ├─ /compare
            │           │     └─ /library
            │           └─ 设置 (/settings) footer
            │
            ├─ Click dual project card → nextHref → /sessions/[id]/workbench(?step)
            │
            └─ Direct /sessions/[id] (dual, no legacy query)
                  └─ Server redirect → /sessions/[id]/workbench
                        └─ Optional link 「项目概览」→ /sessions/[id] (overview page)
```

### Recommended Project Structure

```text
src/components/
├── app-nav.tsx              # IA SSOT: PRIMARY + SECONDARY + FOOTER exports
├── sidebar.tsx              # Logo, CTAs, <AppNav />
├── mobile-nav.tsx           # Sheet mirrors sidebar CTAs + <AppNav />
├── contextual-shell-title.tsx  # NEW (client): pathname → title + /sessions hint
src/app/(app)/
├── layout.tsx               # Compose ContextualShellTitle in header
├── sessions/page.tsx        # PageHeader + empty state CTAs → dual upload
├── sessions/[id]/page.tsx   # dual redirect after legacy query check
└── create/page.tsx          # TaskModePage wrapper + compatibility strip (03-02)
```

### Pattern 1: IA single source in `AppNav`

**What:** Split exports: `PRIMARY_NAV_ITEM`, `SECONDARY_NAV_ITEMS`, `FOOTER_ITEMS`; render primary row, then `Collapsible` (default `open={false}`) for secondary, then dashed footer.

**When to use:** All desktop and mobile navigation (D-01, D-04).

**Example:**

```tsx
// Source: https://ui.shadcn.com/docs/components/collapsible
"use client";

import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function AppNav() {
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <nav aria-label="主导航">
      <NavLink item={PRIMARY_NAV_ITEM} variant="primary" />
      <Collapsible open={toolsOpen} onOpenChange={setToolsOpen}>
        <CollapsibleTrigger className="type-mono-label w-full px-3 py-2 text-muted-foreground">
          更多工具
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col gap-0.5 pl-4">
          {SECONDARY_NAV_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} variant="secondary" />
          ))}
        </CollapsibleContent>
      </Collapsible>
      {/* FOOTER_ITEMS unchanged */}
    </nav>
  );
}
```

### Pattern 2: Nav active styling without decorative primary on icons

**What:** Active row: left 2px `bg-primary` bar + `text-foreground`. Icons: **always** `text-muted-foreground` when inactive; when active use `text-foreground` only—**never** `text-primary` on icons (D-05, 02-UI-SPEC).

**Current violation:** `app-nav.tsx` lines 105–107 set `active ? "text-primary"` on icons—must change.

### Pattern 3: dual server redirect (D-10)

**What:** After `getDualWorkbenchRedirect(query)` handles legacy deep links, if dual and no legacy target, unconditionally redirect to workbench.

**When to use:** `sessions/[id]/page.tsx` only; single mode unchanged (D-12).

**Example:**

```tsx
// Source: https://nextjs.org/docs/app/api-reference/functions/redirect
if (sessionMode?.mode === "dual") {
  const legacyTarget = getDualWorkbenchRedirect(query);
  if (legacyTarget) {
    redirect(`/sessions/${id}/workbench${legacyTarget}`);
  }
  redirect(`/sessions/${id}/workbench`);
}
```

### Pattern 4: `ContextualShellTitle` (D-20, D-21)

**What:** Small client component used in `(app)/layout.tsx` header; `usePathname()` maps prefixes to labels; when `pathname === "/sessions"` (or `/`), render second line `type-caption` with 下一步 hint.

**Recommended mapping (planner may adjust):**

| Path prefix | Title |
|-------------|-------|
| `/sessions` (exact, not `[id]`) | 项目 |
| `/sessions/*/workbench` | 工作台 |
| `/studio` | 创作台 |
| `/compare` | 对比 |
| `/library` | 资料库 |
| `/settings` | 设置 |
| `/upload` | 导入参考书 |
| `/create` | 创建项目 |

### Pattern 5: Shell CTA stack in Sidebar / MobileNav

**What:** Vertical stack: one `Button` default → `/upload?mode=dual` (新建双书项目); below, `Button variant="outline"` or ghost `Link` → `/upload?mode=single` (单书项目). Remove `/create` from shell (D-06–D-07).

### Anti-Patterns to Avoid

- **Duplicating nav arrays in `mobile-nav.tsx`:** Breaks D-04; only import from `app-nav.tsx`.
- **Client-side-only dual redirect:** Bookmarks to `/sessions/[id]` would still show overview (audit P0 #4).
- **Four top-level nav items without collapsible:** Violates IA-03 and pre-Phase-3 matrix finding.
- **Keeping「当前主线」panel:** Violates D-18 and increases shell noise.
- **Using `text-primary` on inactive nav icons:** Violates D-05 and 02-UI-SPEC § Color.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accessible expand/collapse | Custom div toggle | shadcn `Collapsible` + Radix | Focus, `aria-expanded`, keyboard |
| Pathname-based header labels | Inline logic in layout RSC | `ContextualShellTitle` client module | `layout.tsx` is server; pathname needs client |
| Dual deep-link preservation | New redirect middleware | Existing `getDualWorkbenchRedirect` + server `redirect` | Already encodes `?step=` / `?panel=results` compat |
| Dashboard next-action URLs | Recompute in `ProjectCard` | `deriveSessionDashboard` in `dashboard.ts` | Tested in `dashboard.test.ts`; dual already → workbench |

**Key insight:** Phase 3 is rearranging **existing** shell and redirect wiring—not inventing navigation or session routing subsystems.

## Common Pitfalls

### Pitfall 1: Active state on `/sessions` subtree

**What goes wrong:** `/sessions/[id]` or workbench marks「项目」inactive or double-active.  
**Why it happens:** `pathname.startsWith("/sessions")` is too broad or too narrow.  
**How to avoid:** Keep special case `(href === "/sessions" && pathname === "/")`; for primary item use `pathname === "/sessions" || pathname.startsWith("/sessions/")` only if product wants「项目」active on all session routes—**UI-SPEC implies contextual header handles workbench**; recommend primary nav active for `/sessions` list only and when pathname is exactly `/sessions`, not on `[id]` routes (planner confirm with D-20 mapping).  
**Warning signs:** Two nav rows show active 2px bars.

### Pitfall 2: Collapsible open state on mobile Sheet remount

**What goes wrong:** Sheet opens with「更多工具」expanded, breaking D-15.  
**Why it happens:** Lifting `open` state above Sheet or persisting incorrectly.  
**How to avoid:** Initialize `useState(false)` inside `AppNav`; remount resets—acceptable for v1 (no localStorage per D-15).

### Pitfall 3: Redirect loop or skipping legacy URLs

**What goes wrong:** Old bookmarks with `?step=analysis` land on overview or wrong step.  
**Why it happens:** Replacing redirect block instead of extending it.  
**How to avoid:** Run legacy branch **before** default workbench redirect; keep `getDualWorkbenchRedirect` unchanged.

### Pitfall 4: Typography regression in shell

**What goes wrong:** New `text-[11px]` / `text-[13px]` in nav labels.  
**Why it happens:** Copy-paste from old sidebar.  
**How to avoid:** Map logo subtitle → `type-caption`; nav labels → `type-body`; group label → `type-mono-label` (D-22).

### Pitfall 5: Breaking QLT-01

**What goes wrong:** Unit tests pass but E2E flows break on create/upload.  
**Why it happens:** Changing `/upload` selector redirect (`resolveUploadRoute` → `/create`) unintentionally.  
**How to avoid:** Do not change `resolveUploadRoute`; only shell links and copy (D-25 is copy-only on upload page).

## Code Examples

### Fix nav icon color (D-05)

```tsx
// Source: 03-UI-SPEC.md § Navigation hierarchy
<Icon
  className={cn(
    "h-4 w-4 shrink-0",
    active ? "text-foreground" : "text-muted-foreground/70 group-hover:text-foreground",
  )}
/>
```

### Sessions page primary CTA (D-08)

```tsx
// Source: 03-CONTEXT.md D-06
<Button asChild>
  <Link href="/upload?mode=dual">新建双书项目</Link>
</Button>
```

### Workbench 项目概览 link (D-11 — recommended placement)

```tsx
// Source: workbench-client.tsx PageHeader action area (planner discretion)
<Button asChild variant="ghost" size="sm">
  <Link href={`/sessions/${sessionId}`}>项目概览</Link>
</Button>
```

Place beside existing「返回任务列表」or replace when on workbench-only context.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 4 equal `NAV_ITEMS` | 1 primary + collapsible secondary | Phase 3 (locked) | IA-03 satisfaction |
| Shell CTA → `/create` | → `/upload?mode=dual` | Phase 3 (audit #3) | Aligns with dual hero path |
| dual `/sessions/[id]` → overview | → workbench redirect | Phase 3 (audit #4) | Removes extra hop |
| Static header eyebrow | `ContextualShellTitle` | Phase 3 (D-20) | IA-02 30s comprehension |

**Deprecated/outdated:**
- Sidebar「当前主线」`surface-subtle` block: remove per D-18.
- `text-primary` on inactive nav icons: forbidden per Phase 2 UI-SPEC.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Primary nav「项目」should not stay active on `/sessions/[id]/workbench` (only list route) | Pitfall 1 | Wrong active highlight; user may prefer parent active—confirm in plan if ambiguous |
| A2 | `@radix-ui/react-collapsible` installs cleanly via shadcn CLI on Windows dev env | Standard Stack | Wave 0 add component step if CLI fails |
| A3 | `uploadSummary.actionLabel` link on upload step is insufficient for D-11「项目概览」label | Pattern 4 | Need explicit labeled link in PageHeader |

## Open Questions

1. **Collapsible trigger affordance**
   - What we know: D-16 requires group label「更多工具」; shadcn supports chevron on trigger.
   - What's unclear: Icon-only vs full-width button row.
   - Recommendation: Full-width `CollapsibleTrigger` with `ChevronRight` rotation + `type-mono-label` (planner task, low risk).

2. **Primary nav active scope for `/sessions/*`**
   - What we know: D-20 gives contextual titles for workbench vs 项目 list.
   - What's unclear: Whether「项目」nav row stays active on child routes.
   - Recommendation: Active only on `/sessions` exact match and `/` redirect target; workbench uses header title「工作台」(assumption A1).

3. **`/upload` hero copy delta for D-25**
   - What we know: Dual mode title already「创建双书融合任务」; description mentions概览 then workbench.
   - What's unclear: Exact string parity with「新建双书项目」.
   - Recommendation: Light copy edit in `upload/page.tsx` only—align verbs, no route logic change.

## Environment Availability

**Step 2.6:** SKIPPED — phase is code/UI only; requires existing Node/npm dev environment (already used for NovelFusion). No new external services.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `npm run dev`, tests | ✓ (assumed) | — | — |
| shadcn CLI | Add Collapsible | ✓ (npx) | — | Manual Radix copy from docs |

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (shell only) | Existing `safeGetUser` in layout unchanged |
| V3 Session Management | no | — |
| V4 Access Control | no new endpoints | — |
| V5 Input Validation | no | — |
| V6 Cryptography | no | — |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Open redirect via `redirect()` | Spoofing | Only redirect to fixed paths `/sessions/${id}/workbench`—never user-controlled path |
| XSS via nav labels | Tampering | Static Chinese labels from code, not user input |
| Leaking session id in nav | Information disclosure | No change to URL patterns; existing auth gates remain |

Shell changes do not alter auth boundaries; dual redirect must keep `user_id` check before redirect (existing `notFound()` path).

## Sources

### Primary (HIGH confidence)
- Codebase: `src/components/app-nav.tsx`, `sidebar.tsx`, `mobile-nav.tsx`, `(app)/layout.tsx`, `sessions/page.tsx`, `sessions/[id]/page.tsx`, `lib/sessions/dashboard.ts`
- `.planning/phases/03-app-shell-navigation-ia/03-CONTEXT.md`, `03-UI-SPEC.md`
- `.planning/phases/02-minimal-design-contract/02-UI-SPEC.md`
- [shadcn Collapsible](https://ui.shadcn.com/docs/components/collapsible) — API and controlled state
- [Next.js redirect](https://nextjs.org/docs/app/api-reference/functions/redirect) — server redirect in RSC

### Secondary (MEDIUM confidence)
- `.planning/phases/01-ux-audit-matrix/01-AUDIT-BACKLOG.md` — P0 #3, #4, #15
- `.planning/phases/01-ux-audit-matrix/01-FEATURE-MATRIX.md` — APP_NAV_ITEMS competition
- slopcheck `[OK]` for `@radix-ui/react-collapsible`

### Tertiary (LOW confidence)
- None blocking planning

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — matches package.json + shadcn docs
- Architecture: HIGH — locked CONTEXT + existing code paths traced
- Pitfalls: HIGH — derived from current implementation gaps

**Research date:** 2026-05-26  
**Valid until:** 2026-06-26 (stable shell patterns)

## RESEARCH COMPLETE

**Phase:** 3 - 应用壳与导航 IA  
**Confidence:** HIGH

### Key Findings
- Shell IA must be centralized in `app-nav.tsx` with shadcn `Collapsible` for「更多工具」; no Collapsible component exists yet—add via shadcn CLI.
- Biggest user-facing gaps: flat four-item nav, `/create` shell CTAs, sidebar noise panel, and dual `/sessions/[id]` rendering overview instead of default workbench redirect.
- List clicks for dual projects already use `deriveSessionDashboard` → workbench `nextHref` (tests exist); redirect + shell CTAs are the critical path fixes.
- Active nav icons incorrectly use `text-primary`; must align with D-05 and 02-UI-SPEC.
- `nyquist_validation` is false—no Validation Architecture section; manual UI-SPEC checklist drives phase verification.

### File Created
`.planning/phases/03-app-shell-navigation-ia/03-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard stack | HIGH | package.json + official shadcn/Radix |
| Architecture | HIGH | CONTEXT locked; code traced |
| Pitfalls | HIGH | Concrete line-level violations found |

### Open Questions
- Primary nav active state on `/sessions/*` child routes (assumption A1).
- Collapsible trigger visual (chevron vs text-only).

### Ready for Planning
Research complete. Planner can create 03-01 / 03-02 PLAN.md files.
