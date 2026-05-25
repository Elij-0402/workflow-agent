# NovelFusion AI

## What This Is

面向创作者与编辑的多源小说分析与变体生成平台（brownfield，当前代码约 v0.3）。用户上传原著（含双书模式），经章节级分析与结构化蓝图，再生成可控变体；并附带创作简报 Studio、扩展分析维度与会话对比等能力。

本里程碑不追求「再加功能」，而是在**保留既有能力**的前提下，通过审计与重设计，把产品做成**极度克制、留白充足、简洁可用**的日常工具。

## Core Value

**双书蓝图主路径必须顺畅且令人愿意每天用**：两本上传 → 章节分析 → 编辑并确认蓝图 → 生成变体；整条链路在视觉与交互上清晰、安静、可预期。

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
- ✓ 单元测试基线（197 tests passing）— 工程健康
- ✓ UX 收敛里程碑 Phase 1–5：审计、UI-SPEC、壳层 IA、工作台密度、QLT 验收 — 2026-05-26

### Active

（UX 里程碑规划项已在 Phase 1–5 交付；QLT 复选框待 `/gsd-complete-milestone` 统一勾选。）

### Deferred (v2)

- CNV-01–03：legacy API 收敛、维度统一、大组件拆分（见 `05-VERIFICATION.md` known debt）

### Out of Scope

- 本里程碑内**默认不新增** LLM 维度、新 API 形态或第四条产品主线 — 先审计再改 scope
- 不做「为减复杂度而立即删除」Studio / 对比 / 单书 — 用户选择先审计（决策 3=4）；删减仅作为审计后的可选结论
- 不替换技术栈（仍 Next.js 15 + Supabase + Shadcn/Tailwind）— 在现有栈上收敛 UI

## Context

**用户反馈（2026-05-26）：**

- 对前端视觉效果与功能交互布局**整体不满意**，不是单点问题
- 期望美学：**极度克制、留白、简洁**（拒绝当前偏密、偏「仪表盘堆叠」的感受）
- 主路径选择：**双书蓝图**（非单书、非 Studio 优先）
- 复杂度策略：**先审计**（功能矩阵 + UI review），再决定是否隐藏/分层/下线
- 成功标准：**每天愿意用** + **功能不砍但看起来像成熟 SaaS**

**代码库现状（`.planning/codebase/`）：**

- 三条并行产品形态（单书 / 双书 / Studio）+ 对比与扩展分析，导航 4+1
- 多套 API（generate vs generate-v2）、多套分析维度，组件体量偏大（500–800 行级）
- v0.3 已做 Atelier Terminal 深色主题统一，但统一主题 ≠ 信息架构清晰

## Constraints

- **Tech stack**：Next.js 15 App Router、TypeScript strict、Supabase、Shadcn + Tailwind — 不重写框架
- **Compatibility**：保持现有 API 与 DB 迁移兼容；UI 改动以组件与布局为主
- **Scope process**：功能删减须以 UX-01 审计输出为依据，不得在未审计前大规模删路由
- **Core path**：任何全局 IA 调整不得破坏双书蓝图 confirm → generate-v2 闭环

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 主路径 = 双书蓝图工作台 | 用户明确选择 1=2 | Validated Phase 3–5 |
| 先审计后做减法 | 用户选择 3=4，避免误砍仍有价值的模块 | Validated Phase 1 |
| 美学目标 = 极度克制留白简洁 | dark-only UI-SPEC | Validated Phase 2 |
| 明/暗色 | 审计后锁定 dark-only | Validated Phase 2 |
| 成功 = 日用性 + 成熟 SaaS 观感 | 05-UAT owner signoff | Validated Phase 5 |
| GSD 规划层 | ROADMAP + 5 phases complete | Complete 2026-05-26 |

## Evolution

本文件在阶段转换与里程碑边界更新。

**After each phase transition**（`/gsd-transition`）：

1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone**（`/gsd-complete-milestone`）：

1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-26 after Phase 5 completion*
