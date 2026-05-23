# `src/components/workbench/` — 双书工作台

dual-mode (`sessions.mode='dual'`) 专属 UI。父级 `src/components/CLAUDE.md` 有 UI 通用约定，此文件聚焦工作台的状态流和闸门。

## 路由入口

dual 现在有两层入口：

- `src/app/(app)/sessions/[id]/page.tsx` 是项目概览页入口，负责聚合进度、关键结果和模块导航
- `src/app/(app)/sessions/[id]/workbench/page.tsx` 是深工作台入口，负责执行章节分析、蓝图编辑与生成

从概览页进入 workbench 是 dual 的标准路径；single 仍停留在根页的 legacy 三件套，不会落到本目录。

## 状态流

1. **章节树**（`chapter-tree.tsx` + `chapter-card.tsx`）按两本书展示已解析章节；勾选要分析的章节即把它们加入候选集——**没有独立的「选择器」组件**，勾选逻辑就在这两个组件里
2. **批量章节分析**：client-orchestrated（无 worker），并发上限 **3**（`src/app/(app)/sessions/[id]/workbench/chapter-batch.ts:18` 的 `opts.concurrency ?? 3`）
3. 章节分析跑完 → 触发 `/api/analyze/book` 做综合 → 写入 blueprint draft
4. **Blueprint 编辑**（`blueprint-editor.tsx` + `blueprint-cards.tsx`）改动 → `/api/blueprint` PATCH（服务端 `BlueprintSchema.parse` 闸门）
5. **状态机**：`draft` → `confirmed` 走 `/api/blueprint/confirm`（反向走 `/unconfirm`）
6. **变体生成**：只有 `confirmed` 才允许调 `/api/generate-v2`（服务端会再验一次）
7. **对比展示**复用 `src/components/sessions/` 的 `variant-comparison.tsx` + `variant-diff-{meta,structure,paragraphs}.tsx`（不在本目录）

## 成本闸门

每次批量调用（章节批分析、book 综合、生成）**必须先弹** `cost-estimate-modal.tsx`，调 `@/lib/cost/estimate:estimateCost` 算 token 预估，用户确认才发请求。

## 本目录文件清单

主干 8 件：`chapter-tree` `chapter-card` `blueprint-cards` `blueprint-editor` `cost-estimate-modal` `filter-bar` `generate-drawer` `pipeline-bar`。

辅助 4 件：

- `batch-tracker` —— 批量章节分析进度跟踪（concurrency=3 跑批时显示每章状态）
- `hint-banner` —— 工作台上下文提示横幅，文案派生自 `src/lib/workbench/derive-hint.ts`
- `onboarding-card` —— 首次进入工作台的引导卡片

`PipelineBar` 仅在蓝图（compare）与生成（generate）步骤显示；analysis 步骤用 `WorkflowStageBar` + `HintBanner`。

如果新增交互组件：dual 专属 → 这里；single 也能用 → 放 `src/components/sessions/`。

## Diff 在哪

UI 在 `src/components/sessions/variant-diff-*.tsx`，逻辑在 `src/lib/diff/variant-diff.ts`（三层：meta / structure / paragraph LCS，normalize 空白 + 标点后再比对）。本目录不要重复实现 diff。
