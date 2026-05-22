# `src/components/` — UI 约定

父级 `D:\workflow-agent\CLAUDE.md` 是项目全局上下文，此文件锁定 UI 层的样式与组织。

## 主题 · Atelier Terminal

- **仅暗色**，由 `<html className="dark">` 在 `src/app/layout.tsx` 强制——不要引入 light variant 或主题切换
- 颜色走 Tailwind 的 `--background` / `--foreground` 等 CSS 变量（shadcn `cssVariables: true`）

## 字体（CSS 变量，不要硬编码字体族）

| Tailwind 类     | 变量              | Google Font      |
| --------------- | ----------------- | ---------------- |
| `font-sans`     | `--font-sans`     | Inter Tight      |
| `font-mono`     | `--font-mono`     | JetBrains Mono   |
| `font-display`  | `--font-display`  | Instrument Serif |
| `font-zh-serif` | `--font-zh-serif` | Noto Serif SC    |
| `font-zh-sans`  | `--font-zh-sans`  | Noto Sans SC     |

新组件用 `font-sans` / `font-mono` / `font-display`，不要写 `font-family: 'Inter Tight'`。

## Shadcn 配置

new-york style / neutral base / `cssVariables: true`。新的基础组件放 `src/components/ui/`，aliases 在根 `components.json`。Toaster 在 `src/app/layout.tsx` 是自定义主题——新增全局 UI chrome 要 match 它的 mono + border 风格。

## 子目录划分

- `ui/` — shadcn 原语（button / card / dialog / form / scroll-area / select / sheet / sonner / table / tabs / textarea / toggle / toggle-group / skeleton …）。**只放可复用基础件**。
- `sessions/` — 单 session 视图与变体相关：`analysis-detail.tsx`（聚合 entry）+ `analysis-detail/` 子目录按维度拆分的 panel（`worldview-panel` / `characters-panel` / `narrative-panel` / `prose-craft-panel` / `emotion-arc-panel` / `pacing-map-panel` / `suspense-grid-panel` + 共享 `shared.tsx`）、`generate-panel`、`generate-form-fields`、`project-card`、`variant-card`、`variant-list`、`variant-comparison`、`variant-diff-*`（meta / structure / paragraphs 三层）。**`variant-comparison` 和 `variant-diff-*` 也被 workbench 复用**。
- `workbench/` — dual-mode 专属（章节树、blueprint 编辑、pipeline 状态条、cost 估算 modal 等）。详见 `workbench/CLAUDE.md`。
- `creative-brief/` — V0.3 简报 UI：`brief-editor`（4 个 directive 标签页 + 冲突检测）、`outline-streamer`（解析 `/api/generate/preview` 的 SSE，渲染 outline 流）。
- `charts/` — 分析维度可视化：`radar-panel`（legacy 3-dim 雷达）、`emotion-arc-chart`、`pacing-stack-chart`、`suspense-grid-chart`（V0.3 extended dimensions 的图表）。基于 `recharts`。
- `dashboard/` — 仪表盘可视化：`token-trend-chart`。
- `upload/` — `upload-form` (single) / `dual-upload-form` (dual)。
- 顶层 chrome（`app-nav`、`sidebar`、`user-menu`、`mobile-nav`、`page-header`、`status-dot`、`workflow-stage-bar`、`meta-row`、`empty-state`、`progress-note`）= shell 件。单页交互组件不要写到顶层，归到 `sessions/` / `workbench/` / `creative-brief/` 等业务子目录。

## 语言

- 用户可见文案（按钮、错误、说明）：**中文**
- 代码标识符 / 注释 / commit message：**英文**

## 不写注释

参考根 CLAUDE.md：默认不加注释。命名能表达意图就别写「这里做什么」，只有 **WHY 非显然**（隐藏约束、绕过特定 bug 的 workaround、反直觉行为）才加一行短注释。
