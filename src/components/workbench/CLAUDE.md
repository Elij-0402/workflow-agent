# `src/components/workbench/` — 双书工作台

dual-mode (`sessions.mode='dual'`) 专属 UI。父级 `src/components/CLAUDE.md` 有 UI 通用约定，此文件聚焦工作台的状态流和闸门。

## 路由入口

`src/app/(app)/sessions/[id]/page.tsx` 服务端检测 `mode='dual'` 时 `redirect('/sessions/${id}/workbench')`。dual 永远走这里，**不会回退到 legacy single-mode 三件套**。

## 状态流

1. **章节树**（`chapter-tree.tsx` + `chapter-card.tsx`）按两本书展示已解析章节 → 候选选择器收集要分析的章节
2. **批量章节分析**：client-orchestrated（无 worker），并发上限 **3**（`src/app/(app)/sessions/[id]/workbench/chapter-batch.ts:18` 的 `opts.concurrency ?? 3`）
3. 章节分析跑完 → 触发 `/api/analyze/book` 做综合 → 写入 blueprint draft
4. **Blueprint 编辑**（`blueprint-editor.tsx` + `blueprint-cards.tsx`）改动 → `/api/blueprint` PATCH（服务端 `BlueprintSchema.parse` 闸门）
5. **状态机**：`draft` → `confirmed` 走 `/api/blueprint/confirm`（反向走 `/unconfirm`）
6. **变体生成**：只有 `confirmed` 才允许调 `/api/generate-v2`（服务端会再验一次）
7. **对比展示**复用 `src/components/sessions/` 的 `variant-comparison.tsx` + `variant-diff-{meta,structure,paragraphs}.tsx`（不在本目录）

## 成本闸门

每次批量调用（章节批分析、book 综合、生成）**必须先弹** `cost-estimate-modal.tsx`，调 `@/lib/cost/estimate:estimateCost` 算 token 预估，用户确认才发请求。

## 本目录文件清单

`chapter-tree` `chapter-card` `blueprint-cards` `blueprint-editor` `cost-estimate-modal` `filter-bar` `generate-drawer` `pipeline-bar`。

如果新增交互组件：dual 专属 → 这里；single 也能用 → 放 `src/components/sessions/`。

## Diff 在哪

UI 在 `src/components/sessions/variant-diff-*.tsx`，逻辑在 `src/lib/diff/variant-diff.ts`（三层：meta / structure / paragraph LCS，normalize 空白 + 标点后再比对）。本目录不要重复实现 diff。
