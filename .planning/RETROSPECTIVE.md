# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v0.3 — UX 收敛

**Shipped:** 2026-05-25
**Phases:** 5 | **Plans:** 11

### What Was Built

- 全站功能矩阵与六柱 UI 审计，为减法决策提供证据
- dark-only UI-SPEC 与 design-system token 对齐
- 双书优先壳层、折叠「更多工具」、工作台三阶段密度与 CTA SSOT
- QLT 工程网（197 tests）+ 所有者 11 场景 UAT

### What Worked

- 「先审计后减法」避免误删 Studio/对比/单书
- Phase 4 wave 2 并行（04-02 + 04-03）保持测试绿
- CTA_COPY / smoke.spec SSOT 降低回归成本

### What Was Inefficient

- Phase 3 `human_needed` 验证状态未在 Phase 5 前正式关闭（靠 UAT 覆盖）
- 无里程碑级 `/gsd-audit-milestone` 产物（依赖 phase 级 VERIFICATION）

### Patterns Established

- 主路径 = `/upload?mode=dual` → workbench；次要能力在 Collapsible「更多工具」
- Plan 级 `npm test` 硬门禁；05-SMOKE.md 为手动冒烟 SSOT

### Key Lessons

1. 主观 ROADMAP 成功标准应在 Phase 末 UAT 一次性签署，避免 `human_needed` 悬挂
2. D-25：QLT 复选框在里程碑关闭时统一勾选，保持 REQUIREMENTS 与 VERIFICATION 一致

### Cost Observations

- 11 plans，平均约 23min/plan（见 STATE Performance Metrics）
- 并行 wave 2 缩短 Phase 4 墙钟时间

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Key Change |
|-----------|--------|------------|
| v0.3 UX | 5 | 首次完整 GSD UX 里程碑：审计 → SPEC → IA → 密度 → QLT |

### Cumulative Quality

| Milestone | Tests | Notes |
|-----------|-------|-------|
| v0.3 UX | 197 | generate-v2 / blueprint confirm 冒烟通过 |

### Top Lessons (Verified Across Milestones)

1. 双书主路径决策一旦锁定，后续 phase 应只强化而非重新竞争 IA
2. 工程测试全绿是 UX 里程碑的硬性门禁，先于主观 UAT
