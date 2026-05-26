# Phase 4: 核心界面密度重构 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 4-核心界面密度重构
**Areas discussed:** 工作台三步分段, 会话列表首屏, 主 CTA 统一, 排版 token 迁移
**Delegation:** `/gsd-progress --next --auto` — 由 Claude 按审计 backlog + Phase 2/3 锁定契约选定推荐项（无交互讨论）。

---

## 工作台三步分段

| Option | Description | Selected |
|--------|-------------|----------|
| 保持分析步全展开 6+ 区域 | 现状 P0 blocker | |
| 默认折叠能力面板 + 单焦点 footer CTA | backlog #1、02-UI-SPEC 一屏一焦点 | ✓ |
| 移除 PipelineBar，仅 StageBar | 损失阶段上下文 | |

**User's choice:** Claude 推荐（折叠 + 单 CTA）
**Notes:** compare 步去掉 min-h-[680px]；StepIntro 动作导向标题。

---

## 会话列表首屏

| Option | Description | Selected |
|--------|-------------|----------|
| 保留双 panel + 4 指标卡首屏 | 现状 P1 密度 | |
| 合并 hero + 折叠指标 + 折叠单书区 | WB-02、留白 | ✓ |
| 删除指标区 | 信息损失过大 | |

**User's choice:** Claude 推荐
**Notes:** 移除常驻「本页规则」侧栏 panel。

---

## 主 CTA 统一

| Option | Description | Selected |
|--------|-------------|----------|
| 各步自定义动词与 variant | 现状不一致 | |
| 确认蓝图 / 生成新版本 / 批量分析 全站统一 | WB-03 | ✓ |

**User's choice:** Claude 推荐
**Notes:** 装饰性 text-primary 清零；语义 token 替换硬编码色。

---

## 排版 token 迁移

| Option | Description | Selected |
|--------|-------------|----------|
| 保留 text-[Npx] | 违反 02-UI-SPEC | |
| 本 phase 触及文件全部 type-* | backlog #9 | ✓ |
| 仅 workbench 迁移，列表延后 | 主路径不一致 | |

**User's choice:** Claude 推荐（sessions + workbench 一并）

---

*Auto-advanced via `/gsd-progress --next --auto` after Phase 3 complete.*
