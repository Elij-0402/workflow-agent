# `src/components/` — UI 约定

父级 `D:\workflow-agent\CLAUDE.md` 是项目全局上下文，此文件锁定 UI 层的样式与组织。

## 主题 · 靛蓝暗色 / Linear 风格

- **仅暗色**，由 `<html className="dark">` 在 `src/app/layout.tsx` 强制——不要引入 light variant 或主题切换
- 颜色 token 单源：`src/lib/theme-tokens.ts`（与 `src/app/globals.css` 同步）
- `/design-system` 为开发参考页，不在 `app-nav` 中展示

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

new-york style / neutral base / `cssVariables: true`。新的基础组件放 `src/components/ui/`，aliases 在根 `components.json`。Toaster 主题在 `src/components/ui/sonner.tsx` 统一配置。

## 子目录划分

- `ui/` — shadcn 原语（button / card / dialog / form / scroll-area / select / sheet / sonner / table / tabs / textarea / toggle / toggle-group / skeleton …）。**只放可复用基础件**。
- `sessions/` — 单 session 视图与变体相关：`analysis-detail.tsx`（聚合 entry）+ `analysis-detail/` 子目录按维度拆分的 panel、`generate-panel`、`generate-form` / `generate-form-fields`、`project-card`、`variant-card`、`variant-list`、`variant-comparison`、`variant-diff-*`。**`variant-comparison` 和 `variant-diff-*` 也被 workbench 复用**。
- `workbench/` — dual-mode 专属（章节树、blueprint 编辑、pipeline 状态条、cost 估算 modal 等）。详见 `workbench/CLAUDE.md`。
- `creative-brief/` — V0.3 简报 UI：`brief-editor`、`outline-streamer`。
- `charts/` — 分析维度可视化（`radar-panel`、`emotion-arc-chart`、`pacing-stack-chart`、`suspense-grid-chart`）。基于 `recharts`。
- `upload/` — `upload-form`、`dual-upload-form`、`use-novel-upload` hook。
- 顶层 chrome（`app-nav`、`sidebar`、`user-menu`、`mobile-nav`、`page-header`、`workflow-stage-bar`、`meta-row`、`empty-state`）= shell 件。单页交互组件归到业务子目录。

## 语言

- 用户可见文案（按钮、错误、说明）：**中文**
- 代码标识符 / 注释 / commit message：**英文**

## 不写注释

参考根 CLAUDE.md：默认不加注释。命名能表达意图就别写「这里做什么」，只有 **WHY 非显然**（隐藏约束、绕过特定 bug 的 workaround、反直觉行为）才加一行短注释。
