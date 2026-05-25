# NovelFusion AI — Shell & Navigation UI Specification

**Status:** Approved — 2026-05-26  
**Phase:** 03-app-shell-navigation-ia  
**Requirements:** IA-02, IA-03  
**Upstream:** `.planning/phases/02-minimal-design-contract/02-UI-SPEC.md` (tokens, typography, CTA rules)

---

## § Scope

Phase 3 applies the global design contract to **app shell only**: sidebar, header, `AppNav`, mobile sheet, global CTAs, dual workbench redirect. Does **not** change workbench panel density (Phase 4).

---

## § Navigation hierarchy (IA-02 / IA-03)

| Tier | Items | Visual |
|------|-------|--------|
| **Primary** | 项目 `/sessions` | Full nav row; active = 2px left bar + `text-foreground` |
| **Secondary (collapsed)** | 创作台, 对比, 资料库 | Inside **「更多工具」** group; default **collapsed**; `text-muted-foreground` + `pl-4` indent |
| **Footer** | 设置 | Dashed top border; separate from 更多工具 |

**MUST:** Non-active nav icons use `text-muted-foreground` — **never** `text-primary` (02-UI-SPEC § Color).

**MUST NOT:** Four equal-weight top-level nav items (pre-Phase-3 pattern).

---

## § Global CTAs (shell)

| Control | Variant | Target | Copy |
|---------|---------|--------|------|
| Sidebar / mobile primary | `Button` default (primary) | `/upload?mode=dual` | 新建双书项目 |
| Sidebar / mobile secondary | `outline` or ghost `Link` | `/upload?mode=single` | 单书项目 |
| `/sessions` PageHeader primary | same as above | `/upload?mode=dual` | 新建双书项目 |

**MUST:** Exactly **one** primary Button per sidebar/mobile shell (02-UI-SPEC 一屏一焦点).

**MUST NOT:** Shell primary → `/create`.

---

## § Shell copy & chrome

| Location | Content | Utility |
|----------|---------|---------|
| Logo subtitle | 双书蓝图工作台 | `type-caption` muted |
| Header title | `ContextualShellTitle` from pathname | `type-mono-label` or caption |
| `/sessions` only | 下一步：打开项目或新建双书 | `type-caption` muted, one line |
| Removed | sidebar「当前主线」`surface-subtle` block | — |

**MUST NOT:** New `text-[Npx]` in shell components.

---

## § Collapsible「更多工具」

- Component: shadcn `Collapsible` (or equivalent) inside `AppNav`
- Group label: **更多工具** — `type-mono-label`
- Default: **closed**; no localStorage in v1
- Children: `/studio`, `/compare`, `/library` — vertical list, indent 1 level

Mobile: Sheet mirrors desktop structure (not flattened).

---

## § Routing behavior (dual hero path)

| Session mode | Default entry from list | `/sessions/[id]` |
|--------------|-------------------------|------------------|
| dual | `/sessions/[id]/workbench` | redirect → workbench if no legacy query |
| single | `/sessions/[id]` | no redirect |

**Context link:** At least one **项目概览** link from workbench shell back to `/sessions/[id]` (exact placement: planner discretion).

---

## § `/create` compatibility strip

On `TaskModePage` / `/create`: `surface-subtle` or PageHeader description — dual primary path → `/upload?mode=dual`; current flow labeled 高级/兼容 secondary.

---

## § Alignment checklist (Phase 3)

- [ ] Primary nav = 1 item + collapsible secondary (not 4 peers)
- [ ] Single shell primary CTA → dual upload
- [ ] dual sessions default to workbench
- [ ] No decorative `text-primary` on inactive nav icons
- [ ] Logo/subtitle + contextual header; no sidebar 主线 panel
- [ ] Mobile parity with desktop IA

---

## Decision traceability (03-CONTEXT)

| ID | SPEC section |
|----|----------------|
| D-01–D-05 | § Navigation hierarchy |
| D-06–D-09 | § Global CTAs |
| D-10–D-13 | § Routing behavior |
| D-14–D-17 | § Collapsible |
| D-18–D-22 | § Shell copy |
| D-23–D-25 | § Global CTAs + `/create` |

---

*Consumes 02-UI-SPEC tokens; Phase 4 consumes this for workbench only where shell meets workbench.*
