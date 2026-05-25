# Phase 1: 审计 Backlog

**Synthesized:** 2026-05-26  
**Dedupe key:** `lower(route)|pillar|normalize(现象)`  
**Source:** `01-UI-REVIEW.md`（Overall P0 **14/24**）、`01-FEATURE-MATRIX.md`、`CONCERNS.md`

---

## Top 15（摘要）

| # | severity | route/file | 现象（一句话） |
|---|----------|------------|----------------|
| 1 | P0 | `/sessions/[id]/workbench` · `workbench-client.tsx:699-739` | 分析步同屏 6+ 重量级区域，主 CTA 被淹没 |
| 2 | P0 | `/sessions/[id]/workbench` · `workbench-client.tsx`（全文） | 1361 行 + 10× `surface-panel`，密度违背克制留白 |
| 3 | P0 | `/sessions` · `page.tsx:30-34` | 页头「新建项目」指向 `/create`，与双书主路径分裂 |
| 4 | P0 | `/sessions/[id]` · `page.tsx:58-91` | dual 默认不进工作台，英雄旅程多一跳 |
| 5 | P1 | `/sessions/[id]/workbench` · `workbench-client.tsx:701-704` | 分析步 StepIntro 标题过长、术语重 |
| 6 | P1 | `/sessions` · `page.tsx:38-100` | 列表前 2 大面板 + 4 指标卡，首屏密度过高 |
| 7 | P1 | `/sessions/[id]/workbench` · `workbench-client.tsx:765-792` | compare 步 `min-h-[680px]` 挤压垂直层级 |
| 8 | P1 | `/sessions` · `SessionsClient.tsx:134-279` | 列表三栏布局，侧栏与主网格权重接近 |
| 9 | P1 | `/sessions/[id]/workbench` · `workbench-client.tsx`（41× `text-[…]`） | P0 任意字号 50+ 处，无统一阶梯 |
| 10 | P1 | `/sessions/[id]/workbench` · `workbench-client.tsx:1224-1230` | 上传状态条硬编码 amber/sky，非语义 token |
| 11 | P1 | `/sessions/[id]/workbench` · `workbench-client.tsx:849+` | `text-primary` 装饰滥用，削弱主 CTA |
| 12 | P1 | `/sessions/[id]/workbench` · `workbench/page.tsx` | 无 route-level loading/skeleton，长批量无结构反馈 |
| 13 | P1 | `` `/studio`, `/compare` `` | 次要导航页 `surface-panel` + 任意字号与 P0 重复（合并候选） |
| 14 | P1 | `/settings` · `settings-form.tsx` | 541 行长表单无分段，首屏滚动负担重 |
| 15 | P2 | `/upload` | 双书上传入口与 `/sessions` CTA 文案未对齐 |

---

## 完整 Backlog

| severity | route/file | pillar或类别 | 现象 | 建议方向 |
|----------|------------|--------------|------|----------|
| P0 | `/sessions/[id]/workbench` · `workbench-client.tsx:699-739,1028-1116` | Visuals | BLOCKER：分析步垂直堆叠 StepIntro、能力面板、双栏章节树、页脚 panel，无单一焦点 | 默认折叠 `AnalysisCapabilityPanel` 或移入抽屉；首屏仅进度 + 单一主 CTA |
| P0 | `/sessions/[id]/workbench` · `workbench-client.tsx` | Spacing | BLOCKER：1361 行、10 处 `surface-panel`，每步重复页脚面板 | 拆分组件、减少同屏 panel；目标 ≤500 行/模块 |
| P0 | `/sessions` · `page.tsx:30-34,64-67` | Copywriting | 页头 primary 链 `/create`，与「双书项目」快速入口矛盾 | 页头 primary 指向 `/upload?mode=dual` 或显式双书/单书分支 |
| P0 | `/sessions/[id]` · `page.tsx:58-91` | Experience | dual 无 legacy query 时渲染概览而非工作台 | 默认 redirect `/sessions/[id]/workbench` 或概览唯一 dominant CTA |
| P1 | `/sessions` · `page.tsx:112-121` | Copywriting | 空态主按钮指向 `/create`，双书非优先 | 空态 primary 改为双书上传 |
| P1 | `/sessions/[id]/workbench` · `workbench-client.tsx:701-704` | Copywriting | 第 2 步标题两行 + 技术术语，扫描成本高 | 缩短为动作导向标题（如「拆解章节」） |
| P1 | `/sessions` · `page.tsx:38-100` | Visuals | 首屏 2 面板 + 4 MetricCard，留白不足 | 合并指标区或折叠「快速入口」 |
| P1 | `/sessions/[id]/workbench` · `workbench-client.tsx:765-792,1339-1359` | Visuals | compare 步蓝图区 `min-h-[680px]` 与 PipelineBar 争空间 | 响应式 min-height 或分栏折叠章节条 |
| P1 | `/sessions` · `SessionsClient.tsx:134-279` | Visuals | 双栏 + 动态侧栏 +「本页规则」三面板 | 侧栏默认折叠或情境显示 |
| P1 | `/sessions/[id]/workbench` · `workbench-client.tsx` | Typography | 41 处任意 `text-[Npx]`，10+ 离散字号 | 对齐 design-system 字号 token，禁止任意 px |
| P1 | `/sessions` · `page.tsx`, `SessionsClient.tsx`, `[id]/page.tsx` | Typography | P0 其余文件共 9+ 处任意字号；标题 font 混用 | 统一 PageHeader / 正文层级 |
| P1 | `/sessions/[id]/workbench` · `workbench-client.tsx:1047-1065` | Typography | `AnalysisCapabilityPanel` 折叠仍 3 列密集 12/13px | 改为单列摘要 +「展开详情」 |
| P1 | `/sessions/[id]/workbench` · `workbench-client.tsx:1224-1230` | Color | 硬编码 amber/sky 状态条 | 改用 `destructive`/`info` 语义 token |
| P1 | `/sessions/[id]/workbench` · `workbench-client.tsx`（9 处 primary） | Color | 装饰性 `text-primary` 削弱 CTA | accent 仅用于可点击主操作 |
| P1 | `/sessions` · `page.tsx:61`, `SessionsClient.tsx:243,265` | Color | 图标装饰性 primary | 改为 `text-muted-foreground` |
| P1 | `/sessions/[id]/workbench` · `workbench-client.tsx:765,1173,1184,1299` | Spacing | 任意 `min-h-[680px]`/`220px`/`260px` | 改用 spacing scale 或 `min-h-0` + flex |
| P1 | `/sessions` · `page.tsx:38-137` | Spacing | 4× `surface-panel` + 密集 `gap-4` | 减少 panel 层数，增大区块间距 |
| P1 | `/sessions` · `SessionsClient.tsx:140-221` | Spacing | 双书/单书两段 `space-y-8` 节奏偏紧 | 增加分段留白或折叠单书区 |
| P1 | `/sessions/[id]/workbench` · `workbench/page.tsx`, `workbench-client.tsx:343-367` | Experience | 无 loading.tsx / 全局 skeleton | 添加 route loading 与章节批量骨架 |
| P1 | `/sessions` · `SessionsClient.tsx:418-420` | Experience | 批量失败 Toast 无重试指引 | Toast 附「重试」或跳转步骤 |
| P1 | `/sessions/[id]/workbench` · `workbench-client.tsx:861-864` | Experience | 生成步空结果无步骤编号，与 upload 不一致 | 对齐 `EmptySlot` 模式 |
| P1 | `/studio` · `studio/page.tsx` | Spacing | 简报列表 + panel 堆叠，CTA 不突出 | 首屏单一「新建简报」主按钮 |
| P1 | `/studio/new` · `studio/new/page.tsx` | Visuals | 多步表单与列表页权重未分层 | 步骤条或侧栏进度 |
| P1 | `/compare` · `compare/page.tsx`, `CompareClient.tsx` | Visuals | 选择器与对比区同屏权重接近 | 选定会话后折叠选择 UI |
| P1 | `/compare` · `compare/page.tsx` | Copywriting | 与 workbench「对比」步术语不一致 | 统一「对比蓝图」文案 |
| P1 | `/library` · `library/page.tsx` | Visuals | 继承 `SessionsClient` 三栏 archived 密度 | 归档视图简化侧栏 |
| P1 | `/library` · `library/page.tsx:42-47` | Typography | `text-[20px]`/`text-[13px]` 与全站标题不一致 | 使用 PageHeader token |
| P1 | `/library` · `library/page.tsx` | Experience | 恢复项目后无 deep-link 回 workbench | 恢复 CTA 链至 `/sessions/[id]/workbench` |
| P1 | `/settings` · `settings-form.tsx` | Spacing | 541 行长表单无 Tab/分段 | Accordion 分组 LLM/用量/安全 |
| P1 | `/settings` · `settings/page.tsx` | Experience | 连接失败态缺重试 CTA | 显式「重新验证」+ 帮助链接 |
| P1 | `/settings` · `settings-form.tsx` | Color | 状态徽章与主色混用 | ok/error 仅用语义色 |
| P2 | `/create` · `create/page.tsx` | IA | 与双书主路径并列，无「双书优先」提示 | 入口页标注主/次路径或默认 dual |
| P2 | `/upload` · `upload/page.tsx` | Copywriting | 英雄起点与 `/sessions` CTA 未对齐 | 与 P0 项 #3 一并改文案链 |
| P2 | `/upload` · `workbench upload 步` | Color | 上传进度视觉与 workbench amber/sky 不一致 | 统一语义状态色 |
| P2 | `/studio/[briefId]` | Spacing | 与 `studio/new` 同 `surface-panel` 密度 | 简报编辑区拆分 panel |
| P2 | `/sessions/archived` | IA | redirect 至 `/library`，书签旧 URL | 保留 redirect 或 301 说明页 |
| P2 | `/compare` · `workbench compare 步` | Spacing | 与独立 `/compare` 页重复密度问题 | 合并治理（`affected_routes`: `/compare`, workbench） |

*备注：P1 合并行 #13 对应完整表多行 studio/compare typography+spacing，dedupe 时保留 `affected_routes`。*

---

## Deferred (P3 — 本里程碑不实施)

| severity | route/file | pillar或类别 | 现象 | 建议方向 |
|----------|------------|--------------|------|----------|
| P3 | `/design-system` · `design-system/page.tsx` | Security | 生产环境无 `NODE_ENV` guard，登录用户可访问 | dev-only 路由守卫或移出 `(app)` |
| P3 | API · `/api/generate` | Tech debt | legacy 单书生成与 `generate-v2` 并存（CNV-01） |  deprecation 矩阵 / 收敛入口 |
| P3 | `src/lib/types.ts` | Tech debt | 单体 types ~700 行 | 按域拆分 schema 模块 |
| P3 | `README.md` / `CONTRIBUTING.md` | Docs | 缺失 `.env.example` | 补 sanitized 示例文件 |

---

## 交叉引用

- **P0 workbench 主路径：** 上表 ≥5 条含 `/sessions/[id]/workbench`（#1–2、#5、#7、#9–12 等），满足矩阵交叉要求。
- **UI 评分：** `01-UI-REVIEW.md` Overall **14/24**（仅 P0）；附录 `/design-system` 不计分。
- **功能矩阵：** `01-FEATURE-MATRIX.md` 主路径 Mermaid 与上表 route 对齐。
