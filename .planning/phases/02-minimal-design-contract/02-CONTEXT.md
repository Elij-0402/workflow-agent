# Phase 2: 极简设计契约 - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段交付**可执行的设计契约**，不重构页面布局或导航（Phase 3–4）。

必须产出：

1. `UI-SPEC.md`：间距尺度、字号阶梯、色彩角色、边框/阴影/卡片策略（IA-01、AUD-03）
2. 书面明/暗色决策及理由，与 Phase 1 审计一致
3. `globals.css` / `theme-tokens.ts` / `/design-system` 与 SPEC 对齐，作为实现单一事实来源

**不在本阶段：** sidebar/IA、workbench 面板拆分、路由行为变更、浅色主题完整实现。
</domain>

<decisions>
## Implementation Decisions

### 明/暗色策略（AUD-03）
- **D-01:** 本里程碑 **锁定深色唯一（dark-only）**；不新增浅色主题或 `prefers-color-scheme` 双套 token。
- **D-02:** **理由（写入 UI-SPEC）：** (1) v0.3 已全站 Atelier 暗底，`globals.css` 仅 `:root` 暗色；(2) P0 审计在现有暗色上评密度/层级，非「缺浅色」；(3) 双主题使 Phase 3–4 工作量翻倍且易与 backlog 的任意色/面板问题叠加。
- **D-03:** UI-SPEC 须含 **「未来浅色」附录**：仅记录扩展点（第二套 CSS 变量命名约定），**不排进本里程碑计划**；若日后需要，单独立项。
- **D-04:** 保持 `html { color-scheme: dark; }`；禁止在未更新 SPEC 的情况下引入 `light` class 切换。

### 间距与留白尺度
- **D-05:** 采用 **8px 基准栅格**；页面级纵向节奏：`app-page` 主列 `gap` 从 `gap-7`（28px）提升到 **`gap-10`～`gap-12`（40–48px）**（以 SPEC 定稿 token 名为准）。
- **D-06:** 区块间优先 **留白分隔**；同级内容默认 `space-y-6`（24px），大段分隔 `space-y-10`（40px）；禁止新增 `gap-4` 密堆多 panel（对齐 backlog #2、#7）。
- **D-07:** **禁止** 产品路由（`(app)/**`）新增任意 `min-h-[Npx]` / `min-w-[Npx]`；现有项在 Phase 4 重构时按 SPEC 替换为 flex/`min-h-0` 或 spacing token。例外：`loading` 骨架、design-system 演示区。
- **D-08:** **同屏 `surface-panel` 上限：1 个主面板 + 最多 1 个 `surface-subtle` 辅助区**（工作台每步计为 1 个「步骤壳」）；其余信息用折叠、抽屉或页内分隔线，不叠第三层 panel（直接回应 P0 #1–2）。
- **D-09:** 在 `globals.css` 增加 **spacing scale CSS 变量**（如 `--space-1`…`--space-8` 映射 8px 倍数），UI-SPEC 与 design-system「间距」节展示同一表。

### 字号阶梯与任意 px
- **D-10:** 产品 UI **五级语义字号**（名称写入 UI-SPEC，实现映射 Tailwind 扩展或 `@apply` 工具类）：
  - `display` — 页面唯一主标题（≈20–22px，Instrument Serif / chinese-display）
  - `title` — 区块标题（≈16–18px，semibold）
  - `body` — 正文（14px，sans）
  - `caption` — 辅助说明（12–13px，muted-foreground）
  - `mono-label` — 眉标/数据标签（10–11px mono，**禁止** `text-primary` 装饰）
- **D-11:** **`(app)/**` 路由禁止新增 `text-[Npx]`**；迁移策略：P0 文件（sessions、workbench）在 Phase 4 前必须清零；`globals.css` 内现有 `text-[10.5px]` 等 utility 在 Phase 2 收敛为命名 class（如 `.eyebrow-label` 已存在则 SPEC 引用类名而非 px）。
- **D-12:** 同级标题 **统一 sans semibold**；`font-display italic` 仅用于 `display` 级页面标题，禁止与区块 `title` 混用（回应 UI-REVIEW 标题 font 混用）。
- **D-13:** `data-label` 默认 **`text-muted-foreground`**，非 primary；primary 色不得用于非交互序号/装饰（回应 backlog #11）。

### 卡片 / 边框 / 阴影
- **D-14:** **扁平优先**：默认 **1px `border-border/90` + `bg-card`**，**不使用** 投影堆叠；保留 `.surface-panel` / `.surface-subtle` / `.surface-locked` 三个 utility 名称，在 UI-SPEC 重定义用途而非新增第四类「重卡片」。
- **D-15:** **阴影策略：** 仅 overlay（Dialog/Sheet/Dropdown）允许轻微 shadow；内容区 panel **shadow-none**。
- **D-16:** 圆角统一 **`--radius-md`（5px）** 为 panel 默认；禁止页面级 `rounded-[6px]` 与 token 漂移（`globals` 与 SPEC 同步为 5px 或统一改 token）。
- **D-17:** 步骤内 **页脚操作区** 不再单独包一层 `surface-panel`；改为 sticky footer 条或顶栏 PipelineBar 附属操作区（SPEC 给模式图，Phase 4 实现）。

### 主色与 CTA / 状态色
- **D-18:** **60/30/10 书面规则：** 背景+正文 ≥85% 视觉权重；`muted` 结构 ≤10%；**`primary` 仅用于每视口最多 1 个主 CTA Button**（及等效 `<Button variant="default">`）。
- **D-19:** 次级操作：`outline` / `ghost`；破坏性：`destructive`；链接式文字：`text-foreground` + underline，**不用** `text-primary`。
- **D-20:** 新增语义 token **`--info`**（进行中/提示）与 **`--warning`**（非阻断注意），替换 workbench 硬编码 amber/sky；在 `theme-tokens.ts` 与 design-system 色板展示。
- **D-21:** `flash` / `--locked` / `--blocked` 保留用于蓝图锁定态；与 CTA primary 不得同色竞争。

### SPEC 与 design-system 落地顺序
- **D-22:** **单一事实来源顺序：** (1) 撰写并评审 **`02-UI-SPEC.md`**（原则 + 上列全部 MUST/禁止项）；(2) 更新 **`globals.css` + `theme-tokens.ts`**；(3) 同步 **`/design-system`** 各节与 SPEC 一致，作为验收对照页。
- **D-23:** Plan **02-01** = 从 `01-AUDIT-BACKLOG.md` Top 15 提炼原则 + token 草案（可改 CSS，但以 SPEC 章节标题为纲）；(4) Plan **02-02** = 定稿 UI-SPEC + design-system 对齐检查清单。
- **D-24:** `/design-system` 保持 **非导航、dev 参考**；SPEC 要求 production 仍无 guard 记为 P3，本阶段可在 design-system 页脚注明「实现标准页，非用户功能」。
- **D-25:** 下游 planner 禁止「只改组件不改 token」的局部补丁；任何新 utility 须同时出现在 UI-SPEC + globals + design-system 三节之一。

### Claude's Discretion
- 用户授权「六区全讨论且由 Claude 拍板」——上列决策按 Phase 1 证据 + PROJECT 约束取**推荐默认**（深色延续、留白加大、禁任意 px、压 panel 层数、CTA 语义化）。
- spacing 精确 class 名（`gap-10` vs token）与 `--info` HSL 具体值留给 02-01 草案，但不得违背 D-05–D-21 的禁止项。
- 浅色主题、legacy API 收敛、大组件拆分仍属 deferred / v2。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目意图与需求
- `.planning/PROJECT.md` — 美学目标、明/暗审计后再定、双书主路径
- `.planning/REQUIREMENTS.md` — AUD-03、IA-01 及 traceability
- `.planning/ROADMAP.md` — Phase 2 goal、success criteria、02-01 / 02-02 plans

### Phase 1 审计输入（本阶段直接消费）
- `.planning/phases/01-ux-audit-matrix/01-AUDIT-BACKLOG.md` — Top 15、P0 密度与 CTA 问题
- `.planning/phases/01-ux-audit-matrix/01-UI-REVIEW.md` — 六柱 14/24、任意字号与 panel 证据
- `.planning/phases/01-ux-audit-matrix/01-FEATURE-MATRIX.md` — 主路径范围边界
- `.planning/phases/01-ux-audit-matrix/01-CONTEXT.md` — Phase 1 边界（明/暗推迟至本阶段）

### Token 与参考实现
- `src/app/globals.css` — CSS 变量与 `.surface-*`、`.app-page` 定义
- `src/lib/theme-tokens.ts` — TS 侧色板，须与 globals 同步
- `src/app/(app)/design-system/design-system-client.tsx` — 验收展示页结构
- `src/app/(app)/design-system/page.tsx` — 设计系统路由

### 主路径实现锚点（SPEC 须写清约束，Phase 4 才改代码）
- `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx` — P0 密度与任意 px 重灾区
- `src/app/(app)/sessions/page.tsx` — 列表首屏 panel 密度
- `src/components/ui/button.tsx` — CTA 变体基准

### 代码库惯例
- `.planning/codebase/CONVENTIONS.md` — Tailwind / 组件命名
- `.planning/codebase/CONCERNS.md` — design-system 暴露、双 API 债

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `globals.css` 已有 `.app-page`、`.surface-panel` / `.surface-subtle` / `.surface-locked`、`.eyebrow-label` / `.mono-label-*` — Phase 2 收敛语义而非推倒重来。
- `theme-tokens.ts` + `COLOR_TOKENS` 已供 design-system 色板渲染 — 扩展 `--info`/`--warning` 的展示位。
- `/design-system` 已有 16 个 SECTION（原则、颜色、字体、间距、层级…）— 与 UI-SPEC 章节一一映射即可。

### Established Patterns
- 全站深色 Atelier（靛蓝 primary、冷灰底）；`components.json` + shadcn，无第三方 UI registry。
- 问题模式：`text-[Npx]`、`surface-panel` 重复、装饰性 `text-primary` — SPEC 以禁止项+迁移清单回应。

### Integration Points
- Phase 2 产物：`02-UI-SPEC.md`（本目录）+ 可选 token PR 在 02-01；Phase 3 消费 SPEC 改 `app-nav` / `sidebar`；Phase 4 消费 SPEC 改 workbench 布局。
- `npm test` 基线须在 token 变更后保持绿（QLT-01）。

</code_context>

<specifics>
## Specific Ideas

- 用户：**「都需要讨论，你来为我作选择」** — 六区全部采用 Claude 推荐默认（与 Phase 1 相同委托模式）。
- 决策修辞对齐：**极度克制、大留白**；用规则减少同屏信息，而非删功能。
- 审计 Top 3 直接映射：分析步单焦点（D-08）、CTA 语义色（D-18–D-21）、字号阶梯（D-10–D-12）。

</specifics>

<deferred>
## Deferred Ideas

- **完整浅色主题** — 里程碑外；SPEC 仅附录扩展点（D-03）。
- **导航 IA / dual 默认进 workbench** — Phase 3（backlog P0 #3–4）。
- **workbench 组件拆分与 panel 重构** — Phase 4；本阶段只定规则。
- **legacy `/api/generate`、CNV-*** — v2 / P3。
- **`/design-system` 生产环境 guard** — P3，本阶段不实施。

</deferred>

---

*Phase: 2-极简设计契约*
*Context gathered: 2026-05-26*
