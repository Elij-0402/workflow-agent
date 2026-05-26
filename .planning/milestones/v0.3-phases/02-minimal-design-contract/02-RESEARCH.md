# Phase 2: 极简设计契约 — Research

**Researched:** 2026-05-26  
**Confidence:** HIGH (codebase-verified), MEDIUM (migration sequencing)

## Summary

Phase 2 不重构页面，而是把 `02-CONTEXT.md` 中 D-01–D-25 落实为 **CSS/token 单一事实来源** + **`02-UI-SPEC.md` 书面契约** + **`/design-system` 对照页**。现有 `globals.css` 已具备 Atelier 暗色、`surface-*`、`eyebrow-label`/`mono-label-*`；缺口为 spacing scale 变量、`--info`/`--warning`、`.app-page` 留白、`data-label` 误用 primary、圆角 6px 与 `--radius-md` 5px 漂移，以及 `(app)` 路由 50+ 处 `text-[Npx]`（Phase 4 清零，本阶段只定规则与 globals 收敛）。

**Primary recommendation:** Plan 02-01 先改 `globals.css` + `theme-tokens.ts` 并写 UI-SPEC 骨架；Plan 02-02 定稿 SPEC 全文章节并逐节对齐 `design-system-client.tsx`（16 SECTIONS）。

## Standard Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Styling | Tailwind 3 + `@layer components` in `globals.css` | [VERIFIED: codebase] |
| Tokens | CSS `:root` HSL + `src/lib/theme-tokens.ts` | 注释要求双向同步 |
| Components | shadcn/ui `src/components/ui/*` | CTA 以 `Button` variants 为准 |
| Reference UI | `/design-system` | 非导航；dev 验收页 |

## Current Token Inventory

### globals.css `:root` (verified)

- 语义色：`background`, `card`, `primary`, `destructive`, `flash`, `locked`, `blocked`
- 半径：`--radius` 0.35rem；`--radius-md: 5px`；utilities 使用 `rounded-[6px]` — **漂移** [VERIFIED: globals.css:111-116]
- 动效：`--duration-*`, `--easing-*`
- **缺失：** `--space-*`, `--info`, `--warning`

### Component utilities (verified)

```css
.app-page { gap-7 }  /* 28px — CONTEXT 要求 gap-10~12 */
.surface-panel { rounded-[6px] border ... bg-card; shadow implicit none }
.data-label { text-primary/80 }  /* CONTEXT D-13: 应 muted */
```

### Arbitrary typography debt [VERIFIED: rg]

| File | `text-[Npx]` count |
|------|-------------------|
| workbench-client.tsx | 41 |
| design-system-client.tsx | 39 |
| settings-form.tsx | 17 |
| sessions/page.tsx | 6 |
| 其他 (app) | &lt;13 each |

**Phase 2 policy:** 禁止新增；globals 内 `text-[10.5px]` 收敛为已有 `.eyebrow-label` / 新 `.type-*` 类；P0 路由迁移清单写入 UI-SPEC §Migration，执行在 Phase 4。

## Design Decisions (from CONTEXT — do not re-litigate)

| ID | Locked choice |
|----|----------------|
| D-01–D-04 | dark-only；`color-scheme: dark`；浅色仅 SPEC 附录 |
| D-05–D-09 | 8px grid；`app-page` gap↑；禁新任意 min-h/w；panel 上限 1+1 |
| D-10–D-13 | 五级字号语义；禁新 `text-[Npx]`；display 用 serif italic |
| D-14–D-17 | 扁平 border；overlay-only shadow；radius-md 5px |
| D-18–D-21 | 60/30/10；primary=单 CTA；`--info`/`--warning` |
| D-22–D-25 | SPEC → globals → design-system 顺序 |

## Proposed Token Additions (02-01 draft)

### Spacing scale (D-09)

```css
--space-1: 0.5rem;   /* 8px */
--space-2: 1rem;     /* 16px */
--space-3: 1.5rem;   /* 24px */
--space-4: 2rem;     /* 32px */
--space-5: 2.5rem;   /* 40px */
--space-6: 3rem;     /* 48px */
```

Map Tailwind: `gap-10` = 40px (`--space-5`), `gap-12` = 48px (`--space-6`). UI-SPEC 表与 design-system `#spacing` 同表。

### Semantic status (D-20)

- `--info`: 建议 `200 70% 55%` 级冷青（替换 workbench sky）— 02-01 在 SPEC 定 HSL 后写入 globals
- `--warning`: 建议 `38 90% 55%` 级琥珀（替换硬编码 amber）— 同上

Add to `COLOR_TOKENS` + design-system `#color` 展示行。

### Typography utilities (D-10)

| Class | Target | Maps from |
|-------|--------|-----------|
| `.type-display` | 20–22px serif | `chinese-display` + text-xl |
| `.type-title` | 16–18px sans semibold | — |
| `.type-body` | 14px sans | default body |
| `.type-caption` | 12–13px muted | — |
| `.type-mono-label` | 10–11px mono muted | replace `data-label` primary |

## design-system Alignment Map

| SECTION id | UI-SPEC section | 02-02 action |
|------------|-----------------|--------------|
| principles | § Principles | 更新克制/留白文案 |
| color | § Color roles + 60/30/10 | 加 info/warning swatches |
| type | § Typography ladder | 五级示例，禁 arbitrary px |
| spacing | § Spacing scale | 新 `--space-*` 表 |
| surface | § Surfaces | panel/subtle/locked 用途 |
| button | § CTA hierarchy | default vs outline |
| overlay | § Shadows | 仅 Dialog/Sheet |

## Pitfalls

1. **只改组件不改 token** — 违反 D-25；任何新 utility 必须三处同步。
2. **改 `.app-page` gap 导致布局回归** — 02-01 后跑 `npm test`；视觉在 design-system 抽查即可。
3. **误启 light theme** — 禁止 `light` class 与第二套 `:root` 直到新里程碑。
4. **workbench 大改** — 本阶段零 `(app)` 业务组件重构（CONTEXT 边界）。

## Phase Split Validation

| Plan | Wave | Delivers | REQ coverage |
|------|------|----------|--------------|
| 02-01 | 1 | Token/CSS + UI-SPEC 骨架 + 原则 | AUD-03 (书面 dark), IA-01 (draft tokens) |
| 02-02 | 2 | UI-SPEC 定稿 + design-system 对齐清单 | AUD-03, IA-01 (complete) |

## Sources

- [VERIFIED: codebase] `src/app/globals.css`, `src/lib/theme-tokens.ts`, `design-system-client.tsx`
- [VERIFIED: planning] `02-CONTEXT.md`, `01-AUDIT-BACKLOG.md` Top 15
- [CITED: ROADMAP.md] Phase 2 success criteria

---

## RESEARCH COMPLETE
