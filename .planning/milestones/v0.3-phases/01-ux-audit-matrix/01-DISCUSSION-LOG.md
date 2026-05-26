# Phase 1: 体验审计与功能矩阵 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 1-体验审计与功能矩阵
**Areas discussed:** 功能矩阵粒度, 主/次/边缘标准, UI审计范围, 审计执行方式, 严重度与交付物, 用户旅程图深度
**Mode:** User delegated all decisions ("你来帮我作决定吧")

---

## 功能矩阵粒度与列

| Option | Description | Selected |
|--------|-------------|----------|
| 路由-only 清单 | 最快，不满足 AUD-01 完整意图 | |
| 路由 × 目标 × 频率 × 双书关系 × 关键依赖 | 满足 ROADMAP，可支撑 Phase 2–3 | ✓ |
| 每个 API 文件独立一行 | 过细，维护成本高 | |

**User's choice:** 委托 Claude — 选完整矩阵 + 流程型 upload 行
**Notes:** 产物 `01-FEATURE-MATRIX.md`

---

## 主/次/边缘标注标准

| Option | Description | Selected |
|--------|-------------|----------|
| 仅主观（按 PROJECT 主路径） | 快但 Phase 3 易争论 | |
| 主观 + 客观信号列（导航层级、步数） | 可审计、可排序 | ✓ |
| 仅量化（无产品判断） | 不适合 brownfield | |

**User's choice:** 委托 Claude — 混合标准，主路径严格对齐双书 workbench 链

---

## UI 审计覆盖范围

| Option | Description | Selected |
|--------|-------------|----------|
| 全站所有路由六柱全量 | 工时大，边际收益递减 | |
| P0 主路径全量 + P1 次要 + P2 spot-check | 对齐 AUD-02 与资源 | ✓ |
| 仅 workbench 一页 | 不足以支撑 Phase 2 | |

**User's choice:** 委托 Claude — 分层覆盖；design-system 附录不计分

---

## 审计执行方式

| Option | Description | Selected |
|--------|-------------|----------|
| 纯静态代码 | 缺真实布局/交互证据 | |
| 纯浏览器走查 | 慢，难覆盖 API 债 | |
| 清单自动化 + 静态 + P0 浏览器冒烟 | 证据充分、可并行 | ✓ |

**User's choice:** 委托 Claude — Top 15 摘要签字，非逐条 UAT

---

## 严重度与 backlog 格式

| Option | Description | Selected |
|--------|-------------|----------|
| 仅 UI-REVIEW 单文件 | 缺可执行排序 | |
| gsd-ui-review 六柱 + 独立 P0–P3 backlog | 满足 success criteria 2 | ✓ |
| 自定义 rubric 替代六柱 | 与工具链不一致 | |

**User's choice:** 委托 Claude — 三件套：`01-FEATURE-MATRIX.md`, `01-UI-REVIEW.md`, `01-AUDIT-BACKLOG.md`

---

## 用户旅程图深度

| Option | Description | Selected |
|--------|-------------|----------|
| 仅双书主图 | 满足最小 AUD 输入 | ✓ |
| 三条产品线同等深度 | 超出 Phase 1 边界 | |
| 无旅程图 | 不满足 plan 01-01 | |

**User's choice:** 委托 Claude — 1 主图 + 2 简线（单书、Studio）

---

## Claude's Discretion

全部六个灰区由 Claude 按 PROJECT/ROADMAP 推荐默认锁定；用户未逐题作答。

## Deferred Ideas

见 CONTEXT.md `<deferred>` — legacy API 合并、design-system 门禁、明/暗决策延后。
