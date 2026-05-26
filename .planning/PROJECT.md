# NovelFusion AI

## What This Is

面向创作者与编辑的多源小说分析与变体生成平台（brownfield，**v0.3 UX 收敛已交付**）。用户上传原著（含双书模式），经章节级分析与结构化蓝图，再生成可控变体；Studio、对比、扩展分析等能力保留，但通过审计分层与壳层 IA 让**双书蓝图**成为默认、克制、留白充足的日常主路径。

## Core Value

**双书蓝图主路径必须顺畅且令人愿意每天用**：两本上传 → 章节分析 → 编辑并确认蓝图 → 生成变体；整条链路在视觉与交互上清晰、安静、可预期。

## Current Milestone: v0.4 UX Foundation

**Goal:** 在 v0.3 UX 收敛基础上，将双书蓝图主路径从「功能可用」推到「商业 SaaS 级精品体验」，让用户每天愿意打开。

**Target features:**

- 信息架构与导航深化（⌘K 命令面板、统一新建 CTA、深化壳层）
- 工作台分步重构（拆 workbench-client 巨型组件、每步独立路由、URL 即状态）
- 蓝图编辑器重做（卡片列表 + inline 编辑 + 节点级键盘快捷键）
- Studio 生成与 Diff 重做（语义化简报、流式双栏、Diff 染色直渲）
- 设计 Token 收尾与视觉打磨（字号违规清零、统一状态色、过渡动画、骨架态）

**风格基线**：现代深色极简（Linear / Vercel 风）；保持 Next.js 15 + Supabase + Shadcn/Tailwind 栈不变；砍单书入口、Compare/Library 推到 v0.5+。

## Requirements

### Validated

- ✓ 邮箱密码认证与 Supabase RLS — v0.1
- ✓ BYOK（OpenAI-compatible）与加密存储 API Key — v0.1
- ✓ 单书上传、三维度分析、流式变体生成 — v0.1
- ✓ 双书模式、章节切分与持久化、chapter/book 分析 — v0.2
- ✓ 结构化 blueprint（Zod）、confirm 门禁、generate-v2、三层 variant diff — v0.2
- ✓ 创作简报四栏、Studio SSE 大纲与逐章迭代 — v0.3
- ✓ 扩展四维度分析（文笔 / 情绪弧 / 节奏 / 悬念网格）— v0.3
- ✓ 多会话对比（≤6）、资料库、会话软归档 — v0.3
- ✓ 全站功能矩阵与六柱 UI 审计（AUD-01/02/03）— v0.3 UX
- ✓ dark-only UI-SPEC 与 design-system 对齐（IA-01）— v0.3 UX
- ✓ 双书优先壳层与折叠「更多工具」IA（IA-02/03）— v0.3 UX
- ✓ 工作台分段、会话列表密度、全站 CTA SSOT（WB-01/02/03）— v0.3 UX
- ✓ QLT 验收：197 tests、所有者 UAT、SaaS 观感抽查（QLT-01/02/03）— v0.3 UX

### Active

<!-- v0.4 UX Foundation 需求集由 REQUIREMENTS.md 定义，将由 Phase 1–5 实施 -->

- [ ] v0.4 UX Foundation requirements — see `.planning/REQUIREMENTS.md`

### Deferred (v2)

- CNV-01–03：legacy API 收敛、维度统一、大组件拆分（见 `05-VERIFICATION.md` known debt）

### Out of Scope

- 本里程碑内**默认不新增** LLM 维度、新 API 形态或第四条产品主线 — 先审计再改 scope
- 不做「为减复杂度而立即删除」Studio / 对比 / 单书 — 用户选择先审计（决策 3=4）；删减仅作为审计后的可选结论
- 不替换技术栈（仍 Next.js 15 + Supabase + Shadcn/Tailwind）— 在现有栈上收敛 UI

## Context

**v0.3 UX 收敛（shipped 2026-05-25）：**

- 5 phases、11 plans、31 tasks；197 单元测试全绿
- 归档：`.planning/milestones/v0.3-ROADMAP.md`、`v0.3-REQUIREMENTS.md`
- 所有者 UAT 11/11 通过；Top 15 backlog 已 disposition

**代码库现状：**

- 三条产品形态（单书 / 双书 / Studio）保留；主导航与壳层引导双书主路径
- 技术债：legacy generate、维度状态模型、500+ 行组件（CNV-01–03，v2）

## Constraints

- **Tech stack**：Next.js 15 App Router、TypeScript strict、Supabase、Shadcn + Tailwind — 不重写框架
- **Compatibility**：保持现有 API 与 DB 迁移兼容；UI 改动以组件与布局为主
- **Scope process**：功能删减须以审计输出为依据
- **Core path**：任何全局 IA 调整不得破坏双书蓝图 confirm → generate-v2 闭环

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 主路径 = 双书蓝图工作台 | 用户明确选择 | ✓ Validated v0.3 UX |
| 先审计后做减法 | 避免误砍模块 | ✓ Validated Phase 1 |
| 美学 = 极度克制留白 + dark-only | 用户反馈 | ✓ Validated Phase 2 |
| 成功 = 日用性 + 成熟 SaaS 观感 | QLT-02 UAT | ✓ Validated Phase 5 |
| GSD 5-phase 里程碑 | ROADMAP 执行 | ✓ Shipped 2026-05-25 |

## Evolution

本文件在阶段转换与里程碑边界更新。

**After each milestone**（`/gsd-complete-milestone`）：

1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-26 after v0.4 UX Foundation milestone start*
