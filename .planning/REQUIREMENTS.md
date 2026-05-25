# Requirements: NovelFusion AI — UX 收敛里程碑

**Defined:** 2026-05-26  
**Core Value:** 双书蓝图主路径顺畅且令人愿意每天用

## v1 Requirements

本里程碑 v1 = 体验收敛（功能不预先删除，先审计后分层）。

### 审计与治理

- [x] **AUD-01**: 产出全站功能矩阵（路由 × 用户目标 × 频率 × 与双书主路径关系）
- [x] **AUD-02**: 完成六柱 UI 审计（`01-UI-REVIEW.md`，P0 Overall 14/24）与分级 backlog（`01-AUDIT-BACKLOG.md` Top 15）
- [x] **AUD-03**: 基于审计输出决定明/暗色、密度与组件层级原则（设计决策记录）

### 视觉与信息架构

- [x] **IA-01**: 确立「极度克制、大留白、低信息密度」的 UI 规范（间距、字号阶梯、色彩、边框/阴影策略）
- [ ] **IA-02**: 主导航与全局壳层以双书蓝图为默认英雄旅程（新用户 30 秒内知下一步）
- [ ] **IA-03**: 次要能力（Studio、对比、单书、资料库）默认折叠或二级入口，高级用户仍可直达

### 核心界面

- [ ] **WB-01**: 双书工作台：减少同屏面板数，分析/蓝图/生成阶段视觉分段清晰
- [ ] **WB-02**: 会话列表与项目概览：列表可读、状态一眼可辨，无仪表盘噪声
- [ ] **WB-03**: 关键操作（confirm 蓝图、生成、批量分析）具备一致的主按钮层级与反馈

### 质量与成功标准

- [ ] **QLT-01**: 现有 188+ 单元测试保持通过；变更不破坏 generate-v2 / blueprint confirm 闭环
- [ ] **QLT-02**: 所有者主观验收：愿意每天打开使用
- [ ] **QLT-03**: 外观达到成熟 SaaS 水准（克制、留白、一致），功能清单相对 v0.3 不缩减

## v2 Requirements

### 可选收敛（审计后决定）

- **CNV-01**: 合并或隐藏 legacy `/api/generate` 单书入口（仅 UI 层引导至主路径）
- **CNV-02**: 统一 legacy 三维度与扩展四维度为单一「分析完成」状态模型
- **CNV-03**: 拆分 500+ 行组件为可维护子模块（工程债，非用户可见功能）

## Out of Scope

| Feature | Reason |
|---------|--------|
| 新 LLM 维度或新 API 主线 | 本里程碑只做体验，不加产品面 |
| 未审计即大规模删路由/表 | 违反「先审计后减法」决策 |
| 技术栈迁移 | 保持 Next.js + Supabase + Shadcn |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUD-01 | Phase 1 | Complete |
| AUD-02 | Phase 1 | Complete |
| AUD-03 | Phase 2 | Complete |
| IA-01 | Phase 2 | Complete |
| IA-02 | Phase 3 | Pending |
| IA-03 | Phase 3 | Pending |
| WB-01 | Phase 4 | Pending |
| WB-02 | Phase 4 | Pending |
| WB-03 | Phase 4 | Pending |
| QLT-01 | Phase 5 | Pending |
| QLT-02 | Phase 5 | Pending |
| QLT-03 | Phase 5 | Pending |

**Coverage:**

- v1 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0

---
*Requirements defined: 2026-05-26*  
*Last updated: 2026-05-26 after gsd-new-project*
