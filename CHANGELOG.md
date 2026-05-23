# 变更记录

本仓库自 **2026-05-24** 起对 `main` 分支历史做了线性化与里程碑合并；完整旧 SHA 对照见 [docs/GIT_HISTORY.md](docs/GIT_HISTORY.md)，机器导出见 [docs/_git-export-pre-rewrite.txt](docs/_git-export-pre-rewrite.txt)。旧历史完整快照：`git log archive/history-pre-rewrite-2026-05-24`。

## Unreleased

（无）

---

## 0.3.x — 创作简报与扩展分析（2026-05-21 ~ 2026-05-24）

- **Atelier Terminal** 深色主题重塑工作台与 Studio 界面，统一字体变量与组件视觉语言。
- **扩展四维度分析**（文笔 / 情绪弧 / 节奏图 / 悬念网格）与 `migration 0006` 的 `creative_briefs` 表。
- **创作简报（Creative Brief）**：四栏指令（人设 / 剧情 / 风格 / 保留规则），`/studio` 编辑与 SSE 流式大纲预览、逐章迭代生成。
- **多会话对比** `/compare`：跨项目维度并排、AI 洞察、剪贴板与导出。
- **设计系统页** `/design-system`、中文化 UI 文案、会话软归档（`0005`）。
- **Prompt / Schema 版本化**，便于后续提示词演进与兼容。
- **项目中心化应用壳**：双书概览、侧栏与路由整理，修复双书工作台入口。

---

## 0.2.x — 双书蓝图工作台（2026-05-20 ~ 2026-05-21）

- **双书模式**（`sessions.mode=dual`）：两本小说 upload、自动切章、`chapters` 表持久化（`migration 0004`）。
- **章节 brief → 全书 synthesis → 结构化 blueprint**，Zod 强校验与 confirm 门禁。
- **蓝图工作台 UI**：章节树、候选片段、蓝图编辑器、流水线与 variant 三层 diff（meta / structure / paragraph LCS）。
- **API**：章节解析、chapter/book 分析、blueprint PATCH/confirm、legacy 单书路径 409 门禁、`generate-v2`。
- **批量分析前 cost estimate** 模态框；上传模式选择与 dashboard / sessions 路由串联。
- 设计文档、样本目录与测试结构清理；README 升至 v0.2 说明。

---

## 0.1.x — 基础闭环（2026-05-18 ~ 2026-05-20）

- **邮箱密码认证**、Supabase RLS、侧边栏应用壳。
- **BYOK**：单用户 `llm_config`、AES-GCM 加密存储 API Key，三维度分析（世界观 / 人物 / 叙事）与流式变体生成。
- **GitHub Actions** CI 与 `node:test` 单元测试基线。
- **大文件上传**修复（浏览器直传 Storage）、移动端导航与页面标题。
- **安全加固**：SSRF 防护、RLS 作用域下载、不可信小说文本隔离、分析结果 schema 校验、重复分析/生成确认以防 BYOK 超支。
