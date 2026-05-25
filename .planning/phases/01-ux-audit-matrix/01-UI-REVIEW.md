# Phase 1 — UI Review

**Audited:** 2026-05-26
**Scoring scope:** P0 only (dual-book main path). P1/P2 findings are backlog feed only.
**Baseline:** Abstract 6-pillar standards (no UI-SPEC)
**Screenshots:** not captured (Task 2 will add browser smoke)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | 中文文案整体清晰，但主路径 CTA 与双书入口不一致 |
| 2. Visuals | 2/4 | 工作台分析步同屏竞争面板过多，缺少单一视觉焦点 |
| 3. Color | 2/4 | `text-primary` 在装饰性元素上过度使用；工作台含硬编码 amber/sky |
| 4. Typography | 2/4 | P0 内 ≥10 种任意 `text-[Npx]`，无统一字号阶梯 |
| 5. Spacing | 2/4 | `workbench-client` 10× `surface-panel` + 多处任意 `min-h-[…]` |
| 6. Experience Design | 3/4 | 确认/批量/Toast 较完整；缺骨架态，dual 默认不进工作台 |

**Overall: 14/24** *(P0 files only; excludes `/design-system`, `/studio`, `/compare`, `/library`, `/settings`)*

---

## Top 3 Priority Fixes

1. **收敛工作台「分析」步的信息层级** — 用户进入主路径第 2 步时，同屏堆叠能力说明面板、双栏章节树、提示条与页脚 CTA，下一步动作被淹没 — 将 `AnalysisCapabilityPanel` 默认折叠或移至侧栏/抽屉，分析步首屏只保留章节进度 + 单一主 CTA（`workbench-client.tsx:699-739`, `1028-1116`）。
2. **对齐 `/sessions` 页头主按钮与双书主路径** — 页头「新建项目」指向 `/create`，而快速入口强调 `/upload?mode=dual`，主路径认知分裂 — 页头 primary 应链向双书上传或明确标注「双书/单书」分支（`page.tsx:31-34` vs `page.tsx:64-67`）。
3. **dual 会话默认落到工作台** — `mode=dual` 且无 legacy query 时渲染 `ProjectOverviewPage` 而非工作台，英雄旅程多一跳 — 默认 `redirect` 至 `/sessions/[id]/workbench` 或在概览页提供唯一 dominant「进入工作台」CTA（`[id]/page.tsx:58-91`）。

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

- **WARNING** — 页头主 CTA「新建项目」链向 `/create`，与文案「双书项目是主路线」及快速入口「双书项目」(`/upload?mode=dual`) 不一致，新用户易走错入口。`src/app/(app)/sessions/page.tsx:30-34`, `src/app/(app)/sessions/page.tsx:64-67`
- **WARNING** — 空态主按钮「开始新项目」同样指向 `/create`，次要按钮才是单书上传；双书空态应优先 `/upload?mode=dual` 以匹配主路径。`src/app/(app)/sessions/page.tsx:112-121`
- **WARNING** — 工作台分析步 `StepIntro` 标题长达两行且含技术术语（「拆解两本参考小说的结构、人物与叙事素材」），扫描成本高。`src/app/(app)/sessions/[id]/workbench/workbench-client.tsx:701-704`
- **WARNING** —  destructive 确认文案合格（含撤销说明），但批量失败回退仅 Toast「操作失败。」，未指明重试入口。`src/app/(app)/sessions/SessionsClient.tsx:107-108`, `src/app/(app)/sessions/SessionsClient.tsx:418-420`

### Pillar 2: Visuals (2/4)

- **BLOCKER** — 工作台 `analysis` 步垂直堆叠：`StepIntro` → 可展开的 `AnalysisCapabilityPanel`（内含 3 列卡片 + 2 子面板）→ `HintBanner` → 可选 `BatchTracker` → **双栏** `ChapterTree` → 页脚 `surface-panel`，同一步至少 6 个重量级区域，无单一 focal point。`src/app/(app)/sessions/[id]/workbench/workbench-client.tsx:699-739`, `1028-1116`, `556-628`
- **WARNING** — `/sessions` 首屏在列表出现前已渲染 2 个大面板 + 4 指标卡，信息密度高于 PROJECT「极度克制、大留白」目标。`src/app/(app)/sessions/page.tsx:38-100`
- **WARNING** — `compare` 步 `BlueprintEditor` 容器强制 `min-h-[680px]`，小视口下蓝图编辑区与折叠章节条、PipelineBar 争抢垂直空间，层级扁平。`src/app/(app)/sessions/[id]/workbench/workbench-client.tsx:765-792`, `1339-1359`
- **WARNING** — `SessionsClient` 列表态为双栏布局（项目网格 + 动态侧栏 +「本页规则」第三面板），侧栏与主列表视觉权重接近。`src/app/(app)/sessions/SessionsClient.tsx:134-279`

### Pillar 3: Color (2/4)

- **WARNING** — `workbench-client.tsx` 内 `text-primary` / `text-primary/NN` 共 9 处，多用于序号、装饰 mono、链接式「回看分析」，accent 未限定在可点击主操作上，削弱 CTA 对比度。`849`, `1158`, `1192`, `1233`, `1263`, `1301`, `1353`, `1358` 等（`src/app/(app)/sessions/[id]/workbench/workbench-client.tsx`）
- **WARNING** — 上传卡片状态条使用硬编码 `border-amber-400/35 bg-amber-500/8` 与 `border-sky-400/30 bg-sky-500/8`，未走语义 token，与全站 Atelier 色系一致性难保证。`src/app/(app)/sessions/[id]/workbench/workbench-client.tsx:1224-1230`
- **WARNING** — `/sessions` 列表页图标装饰性使用 `text-primary`（文件夹、时钟、警告图标），与主按钮未形成 60/30/10 分布。`src/app/(app)/sessions/page.tsx:61`, `src/app/(app)/sessions/SessionsClient.tsx:243`, `265`

### Pillar 4: Typography (2/4)

- **WARNING** — P0 五文件共使用任意字号类 `text-[…]` **50+** 次；`workbench-client.tsx`  alone **41** 处。离散字号包括 10.5、11、12、13、13.5、14、16、18、20、22、24、26、28px 等，超过抽象标准「≤4 种字号」阈值。`src/app/(app)/sessions/page.tsx:43-156`, `SessionsClient.tsx:143-325`, `[id]/page.tsx:165-180`, `workbench-client.tsx`（全文）
- **WARNING** — 同级标题混用 `font-semibold` 与 `font-display italic`（单书详情「项目总览」），P0 内无一致标题体系。`src/app/(app)/sessions/[id]/page.tsx:165-175` vs `src/app/(app)/sessions/page.tsx:43-44`
- **WARNING** — `AnalysisCapabilityPanel` 折叠态仍展示 3 列密集列表，正文多为 `text-[12px]`/`text-[13px]`，长文可读性弱。`src/app/(app)/sessions/[id]/workbench/workbench-client.tsx:1047-1065`

### Pillar 5: Spacing (2/4)

- **BLOCKER** — `workbench-client.tsx` **1361 行**；**10** 处 `surface-panel`（675, 727, 793, 827, 862, 1028, 1173, 1184, 1299, 1342），分析/对比/生成每步重复页脚面板模式，违背克制留白。`src/app/(app)/sessions/[id]/workbench/workbench-client.tsx`（静态计数 2026-05-26）
- **WARNING** — 任意最小高度：`min-h-[680px]`（蓝图区）、`min-h-[220px]`（上传卡 ×2）、`min-h-[260px]`（空槽），非 spacing scale 值。`765`, `1173`, `1184`, `1299`
- **WARNING** — `/sessions` 单页 4 个 `surface-panel`（主状态、快速入口、4×MetricCard 各一），栅格 `gap-4` 密集且无区块呼吸留白。`src/app/(app)/sessions/page.tsx:38-137`
- **WARNING** — `SessionsClient` 主/次路线区块 `space-y-8` 堆叠双书与单书两段，长列表页垂直节奏偏紧。`src/app/(app)/sessions/SessionsClient.tsx:140-221`

### Pillar 6: Experience Design (3/4)

- **WARNING** — dual 会话默认不进入工作台：仅 legacy `?step=` / `?panel=results` 才 redirect，否则渲染 `ProjectOverviewPage`，主路径多一步导航。`src/app/(app)/sessions/[id]/page.tsx:58-91`, `233-247`
- **WARNING** — 工作台无 route-level `loading.tsx` / skeleton；章节分析仅 `chapterStatus` 局部态 + `useTransition` refresh，长批量时页面结构不暗示进行中。`src/app/(app)/sessions/[id]/workbench/workbench-client.tsx:343-367`, `workbench/page.tsx:39-54`（无 loading 导出）
- **WARNING** — 破坏性操作有 `ConfirmDialog` 与 `disabled={pending}`（良好）。`src/app/(app)/sessions/SessionsClient.tsx:393-459`
- **WARNING** — 批量分析具备 `BatchTracker`、中止/重试/关闭（良好）。`src/app/(app)/sessions/[id]/workbench/workbench-client.tsx:710-724`, `490-508`
- **WARNING** — 生成步空结果有文案引导，但无插图/步骤编号，与 upload 步 `EmptySlot` 体验不一致。`src/app/(app)/sessions/[id]/workbench/workbench-client.tsx:861-864` vs `1289-1316`

---

## Files Audited

| # | Path | Notes |
|---|------|-------|
| 1 | `src/app/(app)/sessions/page.tsx` | P0 — 项目列表 |
| 2 | `src/app/(app)/sessions/SessionsClient.tsx` | P0 — 列表客户端 |
| 3 | `src/app/(app)/sessions/[id]/page.tsx` | P0 — dual 概览 / 单书详情 |
| 4 | `src/app/(app)/sessions/[id]/workbench/page.tsx` | P0 — 工作台 RSC 壳 |
| 5 | `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx` | P0 — 双书英雄 UI（1361 行） |

**Out of scoring scope (backlog feed only):** `/studio`, `/compare`, `/library`, `/settings`, `/design-system`, `/create`, `/upload`, 及 `src/components/**` 子组件（`ChapterTree`, `BlueprintEditor`, `ProjectOverviewPage` 等）。

**Registry audit:** `components.json` 存在；无 `UI-SPEC.md` 第三方 registry 表 — 跳过 registry safety 段。

---

## Severity mapping (for backlog)

| Review 标签 | 含义 | 映射到 `01-AUDIT-BACKLOG.md` |
|-------------|------|------------------------------|
| **BLOCKER** | 主路径任务完成受阻，或 pillar 严重不达标 | **`P0`** — 必须在 Phase 2–3 前处理（如工作台分析步密度、`surface-panel` 过载） |
| **WARNING** | 质量降级但不阻断流程 | **P0 路由上的 WARNING → `P1`**（视觉/密度/文案不一致） |
| WARNING on P1 路由（studio/compare/library/settings） | 本 review 未计分，由后续 spot-check 填入 | **`P1`** 或合并多路由一行（D-21） |
| WARNING on P2 路由（create/upload/archived） | 清单式记录 | **`P2`** |
| 附录 / 安全 / 技术债（如 `/design-system` 生产暴露） | 不在六柱均分 | **`P3` / Deferred**（见 CONCERNS.md） |

**Dedupe 建议：** `lower(route)|pillar|normalize(现象)` — 例如 workbench 密度与 typography 任意字号可拆两条 backlog，勿合并丢失 traceability。

---

*Phase 1 UI audit — static code review; browser smoke pending Task 2.*
