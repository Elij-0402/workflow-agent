# Phase 3: 应用壳与导航 IA - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段交付**全局壳层与导航信息架构**，使用户登录后 30 秒内理解「双书项目 → 工作台」的下一步；次要能力降级为二级入口，**不删除**任何路由或 API。

必须产出（对齐 ROADMAP / IA-02、IA-03）：

1. 重构 `sidebar` / `header` / `app-nav` / `mobile-nav` 的层级、文案与视觉权重
2. 全局「新建」CTA 与双书主路径对齐（消费审计 P0 #3、#15）
3. dual 会话默认进入工作台（消费审计 P0 #4）
4. Studio / 对比 / 资料库 / 设置的可达但非竞争式分层

**不在本阶段：** workbench 面板密度与 `text-[Npx]` 迁移（Phase 4）、token/SPEC 新规则（Phase 2 已锁定）、`/design-system` 生产 guard（P3）、legacy API 收敛（v2）。

**须遵守：** `02-UI-SPEC.md`（dark-only、nav 不用装饰性 primary、壳层间距克制）。
</domain>

<decisions>
## Implementation Decisions

### 主导航结构（IA-02 / IA-03）
- **D-01:** 主导航 **仅一层突出「项目」**（`/sessions`）— 与创作台/对比/资料库 **不同视觉层级**，不得四项同级并列。
- **D-02:** 次要三项收入 **「更多工具」可折叠区**（`创作台` `/studio`、`对比` `/compare`、`资料库` `/library`），**默认折叠**；展开后样式为 `text-muted-foreground` + 缩进，无 primary 图标色（对齐 UI-SPEC CTA/装饰规则）。
- **D-03:** **设置** 保持现有页脚分隔区（`FOOTER_ITEMS`），不与「更多工具」混排。
- **D-04:** `app-nav.tsx` 为 IA 单一事实来源；`mobile-nav` Sheet **镜像** 相同两级结构（非简化掉次要项）。
- **D-05:** 活跃态仍用左侧 2px 条 + `text-foreground`；**非活跃** 导航图标 **禁止** `text-primary`（回应 backlog #11 在 nav 上的外溢）。

### 全局「新建」CTA（审计 #3、#15）
- **D-06:** Sidebar 与 MobileNav 的 **唯一 primary Button** → `/upload?mode=dual`，文案 **「新建双书项目」**（动词 + 路径明确）。
- **D-07:** 其下增加 **secondary**（`Button variant="outline"` 或 `Link` ghost）：**「单书项目」** → `/upload?mode=single`（与矩阵「单书兼容」一致；**不**用全局 primary 链 `/create`）。
- **D-08:** `/sessions` 页 `PageHeader` 的 `action` primary 与空态主按钮 **同步** 为 D-06（替换当前 `/create`）。
- **D-09:** `/create` **不再** 作为壳层 primary 目标；保留路由供任务模式页与深链，入口仅通过 D-07 或页内说明。

### dual 项目默认落点（审计 #4）
- **D-10:** `sessions.mode === "dual"` 且 **无** legacy workbench query 时：`/sessions/[id]` **服务端 redirect** → `/sessions/[id]/workbench`（保留现有 `getDualWorkbenchRedirect` 对旧 URL 的兼容）。
- **D-11:** **项目概览**（现 `ProjectOverviewPage`）仍保留在 `/sessions/[id]`，通过 **情境入口** 可达：工作台顶栏或 Pipeline 区 **「项目概览」** 链回概览（Phase 3 至少提供一处明确链接；详细布局 Phase 4 可抛光）。
- **D-12:** 单书会话 **不** redirect，维持 `/sessions/[id]` 详情页行为。
- **D-13:** 从项目列表点击进入：dual → workbench；single → 详情（与 D-10–D-12 一致）。

### 次要能力分层实现（03-02）
- **D-14:** 实现载体 = **`AppNav` 内 Collapsible**（优先 shadcn `Collapsible` 或等效，与现有 `Sheet` 移动壳一致）；**不** 新增第四条产品主线路由。
- **D-15:** 折叠区 **默认 collapsed**；v1 **不** 做 localStorage 记忆（减少状态债；若用户反馈再 v2）。
- **D-16:** 次要项在折叠区内 **垂直列表、左缩进 1 级**；组标题文案 **「更多工具」**（`mono-label` 或 `type-mono-label`）。
- **D-17:** 独立 `/compare`、`/studio` 页 **不** 改功能，仅降低发现频率；用户仍可通过折叠区或书签直达。

### 壳层引导文案（IA-02「30 秒懂下一步」）
- **D-18:** **移除** sidebar 内 `surface-subtle`「当前主线」说明块（减少壳层噪声与多余 panel）。
- **D-19:** Logo 区副标题改为 **「双书蓝图工作台」**（11px muted，一句道破主路径）。
- **D-20:** Header 右侧静态「工作台 / 项目优先」眉标 → **`ContextualShellTitle`**（按 pathname 映射：项目、工作台、创作台、对比、资料库、设置等）。
- **D-21:** **仅** 在 `/sessions` 列表页：header 附一行 muted 提示 **「下一步：打开项目或新建双书」**；其他路由不重复该句（避免噪音）。
- **D-22:** 壳层文案迁移：导航与 CTA 禁用新增 `text-[Npx]`，改用 `type-caption` / `type-body`（与 UI-SPEC § Typography）。

### 单书与 `/create` 在 IA 中的位置
- **D-23:** **无** 顶栏「单书」项；单书仅在项目列表分区与 D-07 次级入口出现。
- **D-24:** `/create`（`TaskModePage`）页顶增加 **主路径提示条**（`surface-subtle` 或 PageHeader 描述）：推荐 **双书** → `/upload?mode=dual` primary；当前创建流为 **高级/兼容** secondary 说明（不写实现方案，plan 定组件）。
- **D-25:** `/upload` 页 hero 文案与 D-06 动词一致（「双书」「参考书」），与 sessions 快速入口卡片对齐（回应 backlog #15）。

### Claude's Discretion
- 用户授权 **「六区全讨论，你来选」** — 上列决策按 Phase 1 P0 backlog、Phase 2 UI-SPEC、PROJECT 主路径约束取 **推荐默认**（与 Phase 2 相同委托模式）。
- Collapsible 动画时长、`ContextualShellTitle` 路径映射表、概览链 exact 放置（header vs workbench 内）由 planner/executor 在 03-01/03-02 细化，不得违背 D-01–D-25。
- Sidebar 宽度（264px）可微调以适配折叠标题，本阶段 **不** 改 `app-shell-grid` 整体布局架构。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求与路线图
- `.planning/PROJECT.md` — 双书主路径、先审计后减法、30 秒下一步
- `.planning/REQUIREMENTS.md` — IA-02、IA-03
- `.planning/ROADMAP.md` — Phase 3 goal、success criteria、03-01 / 03-02 plans

### Phase 2 设计契约（本阶段硬约束）
- `.planning/phases/02-minimal-design-contract/02-UI-SPEC.md` — dark-only、typography、primary 仅单 CTA、nav 装饰色
- `.planning/phases/02-minimal-design-contract/02-CONTEXT.md` — Phase 3 消费边界、禁 workbench 大改

### Phase 1 审计输入
- `.planning/phases/01-ux-audit-matrix/01-AUDIT-BACKLOG.md` — P0 #3–4、#15，导航竞争注意力
- `.planning/phases/01-ux-audit-matrix/01-FEATURE-MATRIX.md` — APP_NAV_ITEMS、客观信号、Mermaid 主路径
- `.planning/phases/01-ux-audit-matrix/01-CONTEXT.md` — 主/次/边缘标注标准

### 壳层实现锚点（本阶段主要改动面）
- `src/components/app-nav.tsx` — NAV_ITEMS 分层与折叠
- `src/components/sidebar.tsx` — CTA、移除主线块、logo 文案
- `src/components/mobile-nav.tsx` — 与 desktop IA  parity
- `src/app/(app)/layout.tsx` — header 情境标题
- `src/app/(app)/sessions/page.tsx` — 页头/空态 CTA 对齐 dual upload
- `src/app/(app)/sessions/[id]/page.tsx` — dual redirect 至 workbench
- `src/app/(app)/create/page.tsx` — 主/次路径提示（经 TaskModePage 或包装）

### 代码库惯例
- `.planning/codebase/STRUCTURE.md` — `(app)` 路由树
- `.planning/codebase/CONVENTIONS.md` — 组件命名、client 后缀

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AppNav` + `APP_NAV_ITEMS` 导出：mobile 与 desktop 共用，改一处即可双端一致。
- `Sidebar` / `MobileNav` 已有 primary `Button asChild` + `Link` 模式 — 仅改 `href` 与层级结构。
- `PageHeader` on `/sessions` — 已有双书/单书 `LinkCard` 快速入口，与 D-06–D-08 一致，需统一 primary 按钮目标。
- `getDualWorkbenchRedirect` in `sessions/[id]/page.tsx` — 保留 legacy query 兼容后再加 D-10 redirect。

### Established Patterns
- 路由组 `(app)/layout.tsx`：`app-shell-grid` + sticky header + `Sidebar` hidden md+。
- Nav active 检测：`pathname.startsWith(href)`；`/sessions` 含 `/` 根重定向。
- 矩阵已记录：四级顶栏与 sidebar CTA 竞争 — Phase 3 用 **层级 + 折叠** 解决，非删路由。

### Integration Points
- Plan **03-01**：`app-nav` / `sidebar` / `layout` header / `sessions/page` CTA / dual redirect。
- Plan **03-02**：Collapsible 次要区 + mobile parity + `/create` 提示条。
- Phase 4 消费：workbench 内「概览」链、列表密度；本阶段只保证 **默认落点** 与 **壳层 IA**。

</code_context>

<specifics>
## Specific Ideas

- 用户：**「全讨论，你来选」** — 六区全部采用 Claude 推荐默认。
- 决策修辞：**极度克制** — 主导航项从 4 个同级降为 1 突出 + 折叠次要；去掉 sidebar 说明 panel。
- 直接映射审计 Top 15：**#3** CTA→dual upload、**#4** dual→workbench、**#15** upload 文案链对齐。

</specifics>

<deferred>
## Deferred Ideas

- **workbench 分析步单焦点、panel 层数、任意 px** — Phase 4（backlog #1–2、#9）。
- **sessions 列表首屏双 panel / 三栏布局** — Phase 4（backlog #6、#8）。
- **PipelineBar 内概览链的视觉抛光** — Phase 4 可与 WB-01 一并做。
- **折叠区展开状态 localStorage** — v2 可选。
- **`/design-system` 生产 guard** — P3。
- **legacy `/api/generate` 收敛** — v2 CNV-01。

</deferred>

---

*Phase: 3-应用壳与导航 IA*
*Context gathered: 2026-05-26*
