# Git 历史映射表（改写前 → 改写后）

> **历史改写日期**：2026-05-24  
> **备份 tag**：`archive/history-pre-rewrite-2026-05-24`（80 条提交完整保留）  
> **机器导出**：[`_git-export-pre-rewrite.txt`](./_git-export-pre-rewrite.txt)

| 原 SHA | 日期 | 原 message | 版本里程碑 | 改写后归属 | 中文说明 |
|--------|------|------------|------------|------------|----------|
| c94a819 | 2026-05-18 | initial | v0.1 | dacad07 | 初始化 Next.js + Supabase 项目骨架与基础配置 |
| fcc8103 | 2026-05-18 | initial1 | v0.1 | dacad07 | 补充初始依赖、路由与 UI 脚手架 |
| 96adde8 | 2026-05-19 | feat: implement server-side AES-GCM… | v0.1 | 5ce7233 | 服务端 AES-GCM 加密与 LLM 配置 Zod schema |
| 0be3cf0 | 2026-05-19 | 新增功能：添加变体列表组件和上传表单… | v0.1 | 5ce7233 | 变体列表、上传表单、侧边栏与状态点组件 |
| df8a653 | 2026-05-19 | Add baseline CI workflow | v0.1 | 454449c | 添加 GitHub Actions 工作流基线 |
| 239e401 | 2026-05-19 | Fix CI test runner for TypeScript tests | v0.1 | 454449c | 修复 CI 中 TypeScript 单元测试运行方式 |
| fbe9e02 | 2026-05-19 | Merge pull request #1… | v0.1 | 454449c | 合并 CI bootstrap 分支（展平进里程碑） |
| 64e1238 | 2026-05-19 | 1 | v0.1 | c038420 | 补充 `.gitignore` 忽略规则（2 行） |
| 968a35a | 2026-05-19 | Fix Vercel upload flow for large novel files | v0.1 | c038420 | 修复大体积小说 Vercel/Storage 上传链路 |
| 01ab4bc | 2026-05-19 | 新增功能：更新移动端导航并添加页面标题组件 | v0.1 | c038420 | 移动端导航与页面标题组件 |
| 0050ce3 | 2026-05-20 | 1 | v0.1 | a3e9701 | 删除临时 `.agents/skills` 与 OpenSpec 技能目录 |
| b6b7517 | 2026-05-20 | docs: sync CLAUDE.md to actual v0.1 state | v0.1 | a3e9701 | 将 CLAUDE.md 同步至 v0.1 实际功能状态 |
| 809219c | 2026-05-20 | spike: approach B chunking + map-reduce aggregation | v0.1 | a3e9701 | 大文本分块 map-reduce 原型（后于清理阶段删除） |
| 6f4bec1 | 2026-05-20 | fix(security,reliability): SSRF guard… | v0.1 | a3e9701 | SSRF 防护、RLS 下载、分析回滚、路由 maxDuration |
| 6eebdb2 | 2026-05-20 | fix(safety): delimit untrusted novel content… | v0.1 | a3e9701 | 不可信小说文本定界与存储结果 schema 校验 |
| 90b40a8 | 2026-05-20 | feat(ux): confirm before re-analyze… | v0.1 | a3e9701 | 重复分析/生成前确认，防止 BYOK 超额消耗 |
| 3fe3dca | 2026-05-20 | test: add coverage for crypto + SSRF… | v0.1 | a3e9701 | crypto/SSRF 单测与孤儿测试套件接入 |
| 5df2f7f | 2026-05-20 | Merge pull request #2… | v0.1 | a3e9701 | 合并 featuredev 安全与体验分支 |
| 51f941a | 2026-05-20 | 1 | v0.1 | a3e9701 | 调整 AGENTS.md、删除旧版 v0.1/v0.2 计划文档 |
| 2f35fab | 2026-05-20 | 1 | v0.1 | a3e9701 | 误提交 e2e 截图、大文本样本与 Playwright 配置（后续清理） |
| 8681054 | 2026-05-20 | Merge branch 'featuredev' into main | v0.1 | a3e9701 | 合并 featuredev 至 main（展平） |
| a032574 | 2026-05-20 | docs: add multi-book chapter comparison… | v0.2 | a3936a9 | 双书章节对比 + 蓝图工作台设计文档 |
| 0601f9b | 2026-05-20 | docs: add implementation plan… | v0.2 | a3936a9 | 蓝图工作台实现计划 |
| 4990604 | 2026-05-20 | feat(upload): sanitizeStorageFilename… | v0.2 | f6defba | Storage 对象键文件名消毒 |
| ab91f32 | 2026-05-20 | fix(navigation): drop redundant router.refresh()… | v0.2 | f6defba | 导航后移除多余 `router.refresh()` |
| db192fa | 2026-05-20 | chore(gitignore): ignore .artifacts/… | v0.2 | f6defba | gitignore 忽略 `.artifacts/`、`.superpowers/` |
| d145071 | 2026-05-20 | feat(db): migration 0004… | v0.2 | f6defba | migration 0004：双书、章节、蓝图 schema |
| b8d7b9a | 2026-05-20 | feat(types): extend Database types… | v0.2 | f6defba | `sessions.mode`、`books.position`、`chapters` 类型 |
| 976e043 | 2026-05-20 | feat(types): chapter_brief / book_synthesis… | v0.2 | f6defba | 双书分析维度与 blueprint/variant 类型扩展 |
| d7069a1 | 2026-05-20 | feat(chapters): extract detection… | v0.2 | f6defba | 章节检测正则、弱信号与长度分块回退 |
| 11d8014 | 2026-05-20 | feat(upload): mode/position params… | v0.2 | f6defba | 上传 mode/position 与章节表持久化 |
| df32061 | 2026-05-20 | feat(prompts): chapter-brief + book-synthesis… | v0.2 | 8634e01 | 章节 brief、全书 synthesis、蓝图生成提示词 |
| 31cf43f | 2026-05-20 | feat(blueprint): Zod schema + emptyBlueprint… | v0.2 | 8634e01 | 蓝图 Zod schema 与候选合并逻辑 |
| c6b9ebf | 2026-05-20 | feat(api): backend routes for dual workbench… | v0.2 | 8634e01 | 双书工作台 API 与 legacy 模式 409 门禁 |
| 4514671 | 2026-05-20 | feat(diff): three-layer variant diff… | v0.2 | 0fcffb0 | 三层 variant diff 与章节批量费用估算 |
| 51a3231 | 2026-05-20 | feat(workbench): dual-mode session detail page… | v0.2 | 0fcffb0 | 双书工作台页面与 variant 对比 UI |
| bd8409e | 2026-05-20 | feat(upload): mode picker + dual second-book slot | v0.2 | 853ca16 | 上传模式选择与第二本书占位 |
| a8963ff | 2026-05-20 | feat(wireup): sessions list mode badge… | v0.2 | 853ca16 | sessions 模式徽章、dashboard 双书路由 |
| 82c3a40 | 2026-05-20 | docs: v0.2.1 stabilization sprint design | v0.2.1 | 204e322 | v0.2.1 稳定化冲刺设计文档 |
| 6966dd9 | 2026-05-21 | 1 | v0.2.1 | 204e322 | 删除过时设计文档、e2e 截图与 agents 插件配置 |
| 56aff92 | 2026-05-21 | chore: prune obsolete v0.2 design docs… | v0.2.1 | 204e322 | 清理过时 v0.2 设计文档与 e2e 产物 |
| 043dce4 | 2026-05-21 | docs: design for project cleanup sprint | v0.2.1 | 204e322 | 项目清理冲刺设计 |
| f5df5db | 2026-05-21 | chore: untrack test novels… | v0.2.1 | 204e322 | 测试小说移至 gitignore 的 `samples/` |
| 0bfae63 | 2026-05-21 | chore: remove spike-chunking prototype… | v0.2.1 | 204e322 | 删除分块 spike，保留 e2e smoke fixture |
| 6fdb95e | 2026-05-21 | docs: collapse AGENTS.md to pointer… | v0.2.1 | 204e322 | AGENTS.md 折叠为指向 CLAUDE.md |
| 5c89e69 | 2026-05-21 | docs: update README to v0.2… | v0.2.1 | 204e322 | README 升至 v0.2，修正 CLAUDE eslint 说明 |
| 395e45b | 2026-05-21 | chore(test): glob src/**/*.test.ts… | v0.2.1 | c5fc128 | 单测 glob 与 Playwright 依赖去重 |
| ab393e9 | 2026-05-21 | Merge branch 'main' of … | v0.2.1 | c5fc128 | 同步远程 main（展平） |
| 2f129c4 | 2026-05-21 | feat(ui): redesign UI to "Atelier Terminal"… | v0.3 | c5fc128 | Atelier Terminal 深色主题 UI 重塑 |
| a05b4d4 | 2026-05-21 | chore: add auto-claude entries to .gitignore | v0.3 | c5fc128 | gitignore 增加 auto-claude 相关路径 |
| b12205e | 2026-05-21 | 1 | v0.3 | c5fc128 | 添加 `_bmad` 工作流配置与脚本（后已删除） |
| b5c3312 | 2026-05-21 | 1 | v0.3 | c5fc128 | 删除 `_bmad` 配置（与上条净效果为零） |
| bfd8888 | 2026-05-21 | Refactor BlueprintEditor… | v0.3 | c5fc128 | 重构 BlueprintEditor 及相关组件结构 |
| 64ba500 | 2026-05-21 | chore: apply prettier baseline | v0.3 | c5fc128 | 全库 Prettier 格式化基线 |
| 47902b7 | 2026-05-21 | chore: add boris-style PostToolUse format hook | v0.3 | c5fc128 | PostToolUse 自动格式化钩子 |
| a8d997f | 2026-05-21 | 1 | v0.3 | 6d74303 | 添加 `.claude/settings.json` 本地配置 |
| 6b1a2c7 | 2026-05-21 | feat: 添加反思钩子和相关配置… | v0.3 | 6d74303 | 反思钩子与错误记录配置 |
| 94e2b49 | 2026-05-21 | 新增功能：扩展小说写作分析维度 | v0.3 | 6d74303 | 扩展四维度分析与 migration 0006 简报层 |
| 9e2a9f6 | 2026-05-22 | feat: 添加格式化脚本… | v0.3 | 6d74303 | `npm run format` 脚本与 Prettier 插件配置 |
| f10144a | 2026-05-22 | feat: enhance variant comparison… | v0.3 | 6d74303 | variant 对比 Tab 与 localStorage |
| 1368df3 | 2026-05-22 | Refactor code structure… | v0.3 | 6d74303 | 代码结构重构以提升可读性 |
| 819253e | 2026-05-22 | 1 | v0.3 | 6d74303 | 精简 AGENTS.md 重复段落（删除 7 行） |
| 3161a2d | 2026-05-22 | feat: localize text in OutlineStreamer… | v0.3 | 6d74303 | 组件中文化、EmptyState、toast 错误处理 |
| 6f70a54 | 2026-05-22 | feat: add design system page… | v0.3 | 9fac3cb | `/design-system` 设计系统参考页 |
| 2701f3f | 2026-05-22 | feat: 更新 CLAUDE.md 文档… | v0.3 | 9fac3cb | CLAUDE.md 补充 V0.3 路由与简报说明 |
| d0c7336 | 2026-05-22 | feat: add Worldview comparison component… | v0.3 | bb58876 | 世界观对比组件与工具函数 |
| 8fd1329 | 2026-05-22 | feat(compare): add AI insights, clipboard, and export | v0.3 | bb58876 | 多会话对比 AI 洞察、剪贴板与导出 |
| 1bcd9d6 | 2026-05-22 | feat: enhance sidebar with new project creation… | v0.3 | cb7c0fe | 侧栏新建项目按钮与无障碍改进 |
| fcba54f | 2026-05-22 | refactor: remove unused components… | v0.3 | 0c121a5 | 移除未使用组件并统一 UI |
| 2742009 | 2026-05-23 | feat: add prompt versioning and schema versioning… | v0.3 | 0c121a5 | 各维度 Prompt/Schema 版本字段 |
| 110587d | 2026-05-23 | Add NovelFusion project architecture spec | v0.3+ | 0c121a5 | 项目架构规格文档 |
| 19dc739 | 2026-05-23 | Add project-centric app shell plan | v0.3+ | 0c121a5 | 项目中心化应用壳实现计划 |
| 3c20976 | 2026-05-23 | feat: add project overview derivation | v0.3+ | 0c121a5 | 项目概览数据派生逻辑 |
| b94e99a | 2026-05-23 | feat: add dual project overview page | v0.3+ | 0c121a5 | 双书项目概览页 |
| 86643b2 | 2026-05-23 | fix: restore dual workbench routing | v0.3+ | 0c121a5 | 修复双书工作台路由回归 |
| f9c558c | 2026-05-23 | 1 | v0.3+ | 0c121a5 | 添加 `.codex/agents` 多角色 TOML（后未保留于树） |
| 80c5f70 | 2026-05-23 | Merge branch 'codex/project-centric-app-shell' | v0.3+ | 0c121a5 | 合并项目中心化壳分支 |
| 2ca9497 | 2026-05-24 | feat: update project components with Chinese translations… | v0.3+ | b92f13a | 项目组件中文化与功能补全 |
| 21ae5be | 2026-05-24 | feat: implement project-centric app shell and UI overhaul | v0.3+ | b92f13a | 项目中心化应用壳与 UI 大改 |
| 807cfd9 | 2026-05-24 | chore: update .gitignore and remove temporary log files | v0.3+ | b92f13a | 更新 gitignore 并删除临时日志 |

## 改写后里程碑提交（message → SHA）

| 改写后 message | SHA |
|----------------|-----|
| chore: 初始化 NovelFusion AI 仓库 | dacad07 |
| feat: 认证、BYOK 加密与单书分析生成闭环 | 5ce7233 |
| ci: 添加 GitHub Actions 与 TypeScript 单元测试 | 454449c |
| fix: 大文件上传与导航体验 | c038420 |
| fix(security): SSRF、RLS 与不可信文本隔离 | a3e9701 |
| docs: 多书蓝图工作台设计与实现计划 | a3936a9 |
| feat(db): 双书模式 schema 与章节解析 | f6defba |
| feat(api): 蓝图工作台后端与 legacy 门禁 | 8634e01 |
| feat(workbench): 双书工作台 UI 与 variant diff | 0fcffb0 |
| feat(wireup): 上传模式选择与 dashboard 路由 | 853ca16 |
| chore: 清理设计文档、样本目录与测试结构 | 204e322 |
| feat(ui): Atelier Terminal 主题重塑 | c5fc128 |
| feat: V0.3 扩展分析维度与创作简报 | 6d74303 |
| feat(compare): 多会话对比与导出 | 9fac3cb |
| feat: 本地化、设计系统页与文档同步 | bb58876 |
| feat: Prompt/Schema 版本化 | cb7c0fe |
| feat: 项目中心化应用壳与双书概览 | 0c121a5 |
| chore: gitignore 与临时日志清理 | b92f13a |

## 推荐工作流

1. `npm run format`（或 `npm run format:check`）整理代码  
2. `git add` 后使用 Conventional Commits 中文主题（≥10 字）  
3. 本地启用提交模板与钩子（见 [CONTRIBUTING.md](../CONTRIBUTING.md)）
