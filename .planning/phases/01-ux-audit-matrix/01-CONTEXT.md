# Phase 1: 体验审计与功能矩阵 - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段只交付**审计证据**，不修改产品 UI 或路由。必须产出：

1. 全站功能矩阵（AUD-01）
2. 六柱 UI 审计报告（AUD-02，`01-UI-REVIEW.md`）
3. 按严重度排序、可对应到文件/路由的执行 backlog（支撑 Phase 2–5 优先级）

明/暗色、密度 token、导航 IA 重构均**不在本阶段决策**——仅收集输入。
</domain>

<decisions>
## Implementation Decisions

### 功能矩阵粒度与列（AUD-01）
- **D-01:** 矩阵粒度 = **用户可感知入口 + 关键服务端路径**，不单列每个 API 文件一行。
- **D-02:** 必填列：`路由/入口` | `用户目标（一句话）` | `与双书主路径关系（主/次/边缘）` | `估计使用频率（高/中/低，基于导航与产品形态推断）` | `关键依赖（API/Server Action，逗号分隔）` | `备注（legacy 面、模式 gate 等）`
- **D-03:** 将 **upload/create 流程** 作为一行「流程型入口」，在依赖列列出 `src/lib/upload/actions.ts` 及相关 API，不拆成多行重复。
- **D-04:** 产物文件名：`01-FEATURE-MATRIX.md`（放在本 phase 目录）。

### 主 / 次 / 边缘标注标准
- **D-05:** **主路径** 仅指 ROADMAP/PROJECT 已锁定的双书英雄旅程：`/sessions` → `/sessions/[id]`（dual）→ `/sessions/[id]/workbench` → blueprint confirm → generate-v2；同行流程上的 `/create`、`/upload` 标为 **主路径支撑**。
- **D-06:** **次要** = 仍是一等公民导航或常见支线（`/studio`、`/compare`、`/library`、`/settings`、单书会话详情与分析面板）。
- **D-07:** **边缘** = 非日常路径（`/design-system`、`/dashboard` 若仅重定向、`/sessions/archived`、legacy `/api/generate` 单书引导等）。
- **D-08:** 每行须附 **客观信号** 列（导航层级：sidebar 顶栏 vs 情境入口；从登录到该功能的步数区间），与主观分类并列，避免 Phase 3 争论。

### UI 审计覆盖范围（AUD-02）
- **D-09:** **P0（全量六柱）** 仅针对双书主路径页面：`/sessions`、`/sessions/[id]`（dual）、`/sessions/[id]/workbench`。
- **D-10:** **P1（六柱抽样 + 密度/层级重点）** 次要导航页各 1 次完整走查：`/studio`、`/compare`、`/library`、`/settings`。
- **D-11:** **P2（清单式 spot-check）** 其余 `(app)` 路由：`/create`、`/upload`、`/sessions/archived`、`/studio/new`、`/studio/[briefId]` 等——记录明显违规，不强制每柱长篇。
- **D-12:** `/design-system` 单独 **附录**：标注为参考页，**不计入**产品 UX 达标评分，但记录「应对齐 token 的参考源」与「对普通用户不应成为主路径」的风险（见 CONCERNS.md）。
- **D-13:** 执行 `/gsd-ui-review` 时以 P0 为评分基准；P1/P2 发现合并进 backlog，不拉低 P0 pillar 均分。

### 审计执行方式
- **D-14:** **三层证据**：(1) 自动化清单（路由/API 枚举自 `src/app`）；(2) 静态代码走查（组件行数、同屏面板数、导航定义）；(3) **浏览器冒烟**仅 P0 主路径（登录 → 现有项目 → workbench 可见态；无 LLM 也可截空态/骨架）。
- **D-15:** 不要求所有者逐页签字；交付时提供 **Top 15 backlog** 摘要 + 完整矩阵/review 供抽查。Phase 1 完成门槛 = 你认可「足以支撑 Phase 2」而非逐条 UAT。

### 严重度与 backlog 格式
- **D-16:** UI 审计 **pillar 评分** 沿用 `gsd-ui-review` 默认 1–4 六柱结构，写入 `01-UI-REVIEW.md`。
- **D-17:** 可执行项使用 **四级 backlog**：`P0` 阻断主路径日用 / 误导下一步；`P1` 视觉不一致或密度违背「克制留白」；`P2` 次要页面抛光；`P3` 记录但不进本里程碑（进 Deferred）。
- **D-18:** 每条 backlog **必须** 含：`severity` | `route/file` | `pillar或类别` | `现象` | `建议方向（不写实现方案）`。
- **D-19:** 三件套交付：`01-FEATURE-MATRIX.md`、`01-UI-REVIEW.md`、`01-AUDIT-BACKLOG.md`（中文正文，技术路径英文）。

### 用户旅程图（plan 01-01）
- **D-20:** **主图 1 张**：双书蓝图端到端（上传 → 章节/书分析 → 蓝图编辑/confirm → generate-v2 → 结果查看），标注当前痛点占位（来自审计，非臆测）。
- **D-21:** **附图 2 条简线**：单书会话流、Studio 简报流——各 ≤8 步，标明与主路径的 **竞争注意力** 点（导航并列），不展开六柱评分。
- **D-22:** 旅程图格式：Mermaid `flowchart` 嵌入 `01-FEATURE-MATRIX.md` 或同级 `01-USER-JOURNEYS.md`（ planner 二选一，优先矩阵文件内一节避免文件碎片化）。

### Claude's Discretion
- 矩阵中「频率」列允许用代码结构 + 导航位置推断，无需真实遥测。
- P1 页面若与 P0 同类问题重复，backlog 可合并为一条并列出受影响路由。
- 静态审计可先于浏览器冒烟并行，由 executor 在 plan 中拆 wave。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目意图与范围
- `.planning/PROJECT.md` — 主路径、先审计后减法、美学目标、成功标准
- `.planning/REQUIREMENTS.md` — AUD-01、AUD-02 及 traceability
- `.planning/ROADMAP.md` — Phase 1 goal、success criteria、plan 01-01 / 01-02

### 代码库事实（审计输入）
- `.planning/codebase/STRUCTURE.md` — 路由与目录布局
- `.planning/codebase/ARCHITECTURE.md` — 三条产品形态与数据流
- `.planning/codebase/CONCERNS.md` — 已知 tech debt（双 API、大组件、design-system 暴露）
- `.planning/codebase/CONVENTIONS.md` — 文件命名与 UI 组织习惯

### UI 审计方法论
- `.cursor/get-shit-done/workflows/ui-review.md` — 六柱审计流程（plan 01-02 执行时 Read）
- `.cursor/get-shit-done/references/ui-brand.md` — 品牌/视觉评判参考（若存在）

### 实现锚点（矩阵与走查必引）
- `src/components/app-nav.tsx` — 主导航 IA
- `src/components/sidebar.tsx` — 壳层与「当前主线」文案
- `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx` — 双书工作台主 UI
- `src/app/api/generate-v2/route.ts` — 主路径生成入口
- `src/app/api/generate/route.ts` — legacy 单书生成（标为边缘/技术债）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/app-nav.tsx` + `sidebar.tsx`：IA 与导航层级的单一事实来源，矩阵「客观信号」列直接引用。
- 已有 `.planning/codebase/*` 地图：避免重复全库 map，审计增量聚焦 UI/路由 delta。
- `npm test` 基线（188+）：审计阶段只跑回归确认无破坏，不新增功能测试。

### Established Patterns
- 路由组 `(app)` / `(auth)`；会话中心 `sessions` + `mode=dual` gate workbench。
- 并行 API 面（`generate` vs `generate-v2`，`analyze` vs `analyze/extended`）须在矩阵「备注」列显式标注。
- 中文 UI、Atelier Terminal 深色主题已统一——审计评「密度/层级」而非「是否深色」。

### Integration Points
- 审计产物仅写入 `.planning/phases/01-ux-audit-matrix/`，不修改 `src/`（本 phase）。
- Plan 01-02 应 dispatch `gsd-ui-reviewer` / `gsd-ui-auditor` 子代理读 P0/P1 文件列表。
- Phase 2 消费：`01-AUDIT-BACKLOG.md` 中 P0/P1 → UI-SPEC 与 token 决策输入。

</code_context>

<specifics>
## Specific Ideas

- 用户授权「你来决定」——以上决策按 PROJECT 已锁定约束取**推荐默认**（完整矩阵 + 主路径优先审计 + 三件套交付）。
- 审计修辞对齐用户原话：**极度克制、大留白**；拒绝把「功能多」本身当缺陷，缺陷定义为 **主路径认知负担** 与 **视觉密度**。
- 单书与 Studio 保留在矩阵与简线图中，但 **不得** 在 Phase 1 结论中建议删除（先审计后减法）。

</specifics>

<deferred>
## Deferred Ideas

- 合并 legacy `/api/generate` 与扩展维度统一 — 属 v2 CNV-*，审计中仅记录，不在本 phase 实施。
- `/design-system` 生产环境限制 — 安全/运维项，记入 backlog P3 或 Phase 5，不在 Phase 1 改代码。
- 明/暗色最终决策 — Phase 2（AUD-03）。

</deferred>

---

*Phase: 1-体验审计与功能矩阵*
*Context gathered: 2026-05-26*
