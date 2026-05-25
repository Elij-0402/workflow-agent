# Phase 4: 核心界面密度重构 - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段交付**双书工作台与会话列表/概览的密度收敛**，使主路径达到「一屏一焦点、大留白、阶段分段清晰」；统一 confirm 蓝图、生成、批量分析等关键 CTA 层级与反馈。

必须产出（对齐 ROADMAP / WB-01、WB-02、WB-03）：

1. **工作台**（`/sessions/[id]/workbench`）：分析 / 对比蓝图 / 生成 三步视觉分段；非当前阶段信息默认收起；消除 P0 同屏 6+ 重量级区域（backlog #1–2）
2. **会话列表与项目概览**（`/sessions`、`/sessions/[id]?view=overview`）：降低首屏 panel 与指标噪声；状态与下一步可扫读（backlog #6、#8）
3. **主 CTA 一致性**：confirm 蓝图、生成、批量分析在全站同一 variant/文案/禁用规则；消除装饰性 `text-primary` 与任意 `text-[Npx]`（backlog #9–11）

**不在本阶段：** 全局壳层/主导航（Phase 3 已完成）、明/暗策略或 token 新定义（消费 `02-UI-SPEC.md`）、legacy API 收敛（CNV-01）、settings/studio/compare 独立页大改（仅 workbench 内术语对齐 backlog #59）、组件拆至 &lt;500 行/file（工程债可渐进，非本阶段硬性 gate）。

**须遵守：** `02-UI-SPEC.md`（dark-only、一屏一焦点、禁止新增任意 px）、`03-UI-SPEC.md`（壳层已锁定，不得回退 dual redirect 与 CTA）。
</domain>

<decisions>
## Implementation Decisions

### 工作台三步分段（WB-01）
- **D-01:** 保留 `FlowStep` = `upload` | `analysis` | `compare` | `generate` 与 `WorkflowStageBar`；每步 **首屏仅 1 个主 CTA**（02-UI-SPEC），次要操作 `outline`/`ghost`。
- **D-02:** **分析步**默认视图 = `PipelineBar` + 章节树/批量区 + **单一**底部主操作条；`AnalysisCapabilityPanel` **默认折叠**（Collapsible），展开后 **单列**摘要，禁止 3 列 12px 密集格（backlog #36）。
- **D-03:** **对比步**移除或大幅降低 `min-h-[680px]` 硬编码；蓝图区用 flex + `min-h-0`，章节条可折叠（`CollapsedChaptersBar` 保持）；页脚 panel **合并**为一条 action bar，不与 `BlueprintEditor` 重复说明（backlog #7、#51）。
- **D-04:** **生成步**变体列表 + `GenerateDrawer`；空态对齐 `EmptySlot` 步骤编号模式（backlog #55）；上传步维持现有 health 提示，状态色改用 `--info`/`--warning`/`--destructive` token（backlog #47）。
- **D-05:** `StepIntro` 标题 **动作导向、单行优先**（如「拆解章节」「整理融合蓝图」「生成变体」），禁止两行技术术语标题（backlog #5）。
- **D-06:** 顶栏「项目概览」链（Phase 3）保留；本阶段仅抛光间距与 `type-*` 工具类，不移动 redirect 逻辑。

### 会话列表与概览（WB-02）
- **D-07:** `/sessions` 首屏 **合并**「主状态」与「快速入口」为 **单一** hero panel 或上下两段 `space-y-10`，删除重复 `surface-panel` 层叠（backlog #6、#51）。
- **D-08:** 指标区（4 MetricCard）**默认折叠**或收成 **一行 3–4 个 caption 统计**，首屏以项目列表为主；图标 **禁止** 装饰性 `text-primary`（backlog #49）。
- **D-09:** `SessionsClient` 双书/单书分区：单书区 **默认折叠**（Collapsible，文案「单书兼容项目」）；双书卡片强化 `deriveSessionDashboard` 的 `nextHref` 与状态徽章（mode、蓝图状态、分析进度）。
- **D-10:** 列表项 **一眼可读**：主标题 + 一行 muted 下一步 + 语义状态色（`flash`/`info`/`locked`）；移除侧栏「本页规则」常驻 panel，改为 **情境 hint**（`HintBanner` 或 caption，仅列表页一次）（backlog #8）。
- **D-11:** 项目概览页（`ProjectOverviewPage`）panel 数 ≤2，主 CTA 与 workbench 动词一致（「进入工作台」「确认蓝图」）。

### 主 CTA 与反馈统一（WB-03）
- **D-12:** **确认蓝图**：全站唯一文案「确认蓝图」；`variant="default"` 仅当 `blueprintReadyToConfirm`；否则 disabled + caption 说明（workbench + 概览一致）。
- **D-13:** **生成新版本**：主 CTA 文案统一；打开 `GenerateDrawer` 前若蓝图未 confirmed → 阻断 toast + 链至 compare 步（现有逻辑保留，统一 copy）。
- **D-14:** **批量分析**：主按钮在分析步 footer；进行中显示 `BatchTracker` + route-level loading（新增 `workbench/loading.tsx` skeleton）（backlog #53）。
- **D-15:** 装饰性 `text-primary` **清零**于 workbench + sessions 路由；`primary` 仅用于可点击主 Button（02-UI-SPEC § Color）。
- **D-16:** 全 phase 触及的 `(app)/sessions/**` 文件 **禁止新增** `text-[Npx]`；存量迁移到 `type-display`/`type-title`/`type-body`/`type-caption`（backlog #9、#45）。

### 排版与间距（消费 02-UI-SPEC）
- **D-17:** 步骤间大段分隔 `space-y-10`（40px）；panel 内 `p-5`/`p-6` 对齐 SPEC；同一步内最多 **2** 层 `surface-panel`（含 footer bar）。
- **D-18:** `PipelineBar` 保留三步 glyph；**非当前** 步 label 保持 muted，**禁止** 装饰性 primary 分隔符外溢。

### Claude's Discretion
- `workbench-client.tsx` 是否拆分为 `analysis-step.tsx` / `compare-step.tsx` 等子模块由 planner/executor 决定，以 **行为不变** 为前提。
- `AnalysisCapabilityPanel` 折叠默认态 vs 完全移入 Sheet：优先 Collapsible 默认 closed（与 Phase 3「更多工具」一致）。
- 概览链放置（header vs PipelineBar）在 D-06 范围内微调。

### Folded Todos
（无 — `/gsd-progress --next --auto` 从 Phase 3 完成态进入，无 open todos）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 设计契约
- `.planning/phases/02-minimal-design-contract/02-UI-SPEC.md` — token、排版、一屏一焦点、禁止任意 px
- `.planning/phases/03-app-shell-navigation-ia/03-UI-SPEC.md` — 壳层 IA；Phase 4 不得破坏
- `.planning/phases/03-app-shell-navigation-ia/03-CONTEXT.md` — D-10 dual redirect、概览链

### 审计与需求
- `.planning/phases/01-ux-audit-matrix/01-AUDIT-BACKLOG.md` — P0 #1–2、P1 #5–12、sessions/workbench 行
- `.planning/phases/01-ux-audit-matrix/01-UI-REVIEW.md` — 六柱评分依据
- `.planning/REQUIREMENTS.md` — WB-01、WB-02、WB-03
- `.planning/ROADMAP.md` — Phase 4 成功标准

### 实现锚点
- `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx` — 主密度债务
- `src/app/(app)/sessions/SessionsClient.tsx` — 列表三栏/分区
- `src/app/(app)/sessions/page.tsx` — 首屏双 panel
- `src/lib/sessions/dashboard.ts` — `deriveSessionDashboard`、nextHref
- `src/lib/workbench/derive-hint.ts` — 步骤提示 SSOT
- `src/components/workbench/pipeline-bar.tsx` — 三步进度条

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `WorkflowStageBar` / `PipelineBar` / `HintBanner` / `BatchTracker` / `BlueprintEditor` / `GenerateDrawer` — 保留，收敛布局与 token
- `Collapsible`（Phase 3 `app-nav`）— 复用于能力面板、单书列表区、指标折叠
- `type-*` utilities（`globals.css`）— 替换 workbench 任意 px
- `deriveHint` + `deriveSessionDashboard` — 列表/工作台「下一步」文案 SSOT

### Established Patterns
- `surface-panel` + `PageHeader` + `StepIntro` — 减少层数而非删除组件
- dual `redirect` 至 workbench（`sessions/[id]/page.tsx`）— 不修改
- 语义色：`flash`/`locked`/`info`/`destructive` — 替换 amber/sky 硬编码

### Integration Points
- Blueprint confirm → `BlueprintEditor` status API（不变）
- generate-v2 闭环（不变）
- `npm test` 须保持全绿（QLT-01 预检）

</code_context>

<specifics>
## Specific Ideas

- 用户里程碑目标：**极度克制、留白、双书主路径** — Phase 4 是审计 P0 密度问题的**主战场**（workbench 1361 行、10× panel）。
- `--auto` 推进：本 CONTEXT 由 Claude 按 Phase 1–3 锁定决策代填（等同 Phase 3「全讨论你来选」）。

</specifics>

<deferred>
## Deferred Ideas

- **settings 长表单分段**（backlog #14）— Phase 5 或 backlog
- **studio/compare 独立页密度**（backlog #13）— 非 WB 范围，Phase 5 QLT-03 抽查
- **workbench 拆文件 &lt;500 行** — 工程债；若 04-01 自然拆分则接受，不作 phase gate
- **CNV-01 legacy generate API** — v2 可选收敛

### Reviewed Todos (not folded)
（无）

</deferred>

---

*Phase: 04-核心界面密度重构*
*Context gathered: 2026-05-26*
