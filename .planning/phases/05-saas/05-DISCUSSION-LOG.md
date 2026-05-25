# Phase 5: 验收与 SaaS 级打磨 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 5-验收与 SaaS 级打磨
**Areas discussed:** 自动化回归深度, UAT 日用性标准, 视觉一致性范围, Phase 3 UAT 遗留, Backlog 收尾, 05-01/05-02 拆分
**Delegation:** 用户要求「全部讨论、你来选择」— 以下均为 Claude 推荐项。

---

## 自动化回归深度（QLT-01）

| Option | Description | Selected |
|--------|-------------|----------|
| 仅 npm test，e2e 完全手动 | 最快，ROADMAP 冒烟无自动化锚点 | |
| npm test 硬门禁 + smoke.spec SSOT + 书面 05-SMOKE | 已有 e2e 覆盖 generate-v2，CI 不阻塞 | ✓ |
| 新增第二条完整 UI e2e + CI blocking | 成本高、需密钥管线 | |
| 只测 API 不测生成 UI | 弱于现有 smoke | |

**User's choice:** Claude 推荐（第二行）
**Notes:** `smoke.spec.ts` 已含「生成新版本」与阅读全文；05-01 修 selector 漂移即可。

---

## 「愿意每天用」UAT（QLT-02）

| Option | Description | Selected |
|--------|-------------|----------|
| 全新短清单（5 条） | 忽略 Phase 4 投资 | |
| 04 的 8 条 + 03 的 3 条合并为 11 条 | 完整回归 + IA 人工项 | ✓ |
| 二元通过且零 known-acceptable | 过严，阻塞里程碑 | |
| 二元通过，允许 ≤3 条 known-acceptable | 务实，对齐次要页债务 | ✓ |

**User's choice:** Claude 推荐（合并 11 条 + ≤3 known-acceptable + 所有者签署）
**Notes:** studio/compare/settings 不满意不否决 QLT-02。

---

## 视觉一致性抽查（QLT-03）

| Option | Description | Selected |
|--------|-------------|----------|
| 仅主路径 Tier A | 聚焦混搭风险 | ✓ |
| 主路径 + 次要页全修 #13/#14 | scope creep | |
| 全站重跑 ui-auditor | 重复 Phase 1 | |
| Tier A grep + Tier B 5 分钟扫视登记 | 可执行、可验证 | ✓ |

**User's choice:** Claude 推荐
**Notes:** #13/#14 标 deferred-v2，写入 VERIFICATION known debt。

---

## Phase 3 人工 UAT 遗留

| Option | Description | Selected |
|--------|-------------|----------|
| 单独补跑 03-HUMAN-UAT | 第三轮人工 | |
| 并入 05-UAT，通过后回填 03 为 complete | 避免重复 | ✓ |
| 宣称 Phase 4 已覆盖，直接删 03 UAT | 证据弱 | |

**User's choice:** Claude 推荐（并入 + 回填）

---

## Backlog 收尾 vs 债务

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 5 修完 Top 15 剩余项 | 超 scope | |
| 主路径 verified，其余 disposition 表 | 对齐里程碑定义 | ✓ |
| 全部标 wontfix | 丢失 traceability | |

**User's choice:** Claude 推荐（disposition 表）

---

## 计划拆分（05-01 / 05-02）

| Option | Description | Selected |
|--------|-------------|----------|
| 并行：UAT 与测试同时进行 | 可能测到未绿构建 | |
| 先 05-01 自动化，再 05-02 UAT/视觉 | 清晰门禁 | ✓ |
| 单 plan 不分 wave | ROADMAP 已写 2 plans | |

**User's choice:** Claude 推荐（先自动化后人工）

---

## Claude's Discretion

- smoke selector 修补、grep 脚本形式、是否跑 `upload-branches.spec.ts`
- known-acceptable 实际条数（0–3）由所有者 UAT 时决定

## Deferred Ideas

- CNV-01–03、studio/compare/settings 大修、全站 ui-auditor 复跑 — 见 CONTEXT.md `<deferred>`
