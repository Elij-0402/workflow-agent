# Roadmap: NovelFusion AI — UX 收敛

## Overview

在保留 v0.3 全部能力的前提下，通过审计 → 设计契约 → 壳层与导航 → 双书工作台与会话界面 → 验收打磨，把产品收敛为**极度克制、留白充足、双书蓝图为主路径**的日常工具。不预先删功能；明/暗与密度在 Phase 1–2 审计后定稿。

## Phases

- [ ] **Phase 1: 体验审计与功能矩阵** — 摸清现状与优先级
- [ ] **Phase 2: 极简设计契约** — UI-SPEC 与视觉决策
- [ ] **Phase 3: 应用壳与导航 IA** — 双书英雄旅程
- [ ] **Phase 4: 核心界面密度重构** — 工作台与会话
- [ ] **Phase 5: 验收与 SaaS 级打磨** — 测试、日用性、一致性

## Phase Details

### Phase 1: 体验审计与功能矩阵

**Goal**: 用证据回答「复杂在哪、先改哪」；为设计决策提供输入  
**Mode:** mvp  
**Depends on**: Nothing  
**UI hint**: no  
**Requirements**: AUD-01, AUD-02  
**Success Criteria** (what must be TRUE):

  1. 存在一份功能矩阵，覆盖所有 `(app)` 路由与 API 主路径，并标注与双书蓝图的关系（主/次/边缘）
  2. 存在 `UI-REVIEW.md`（或等价审计产物），问题按严重度分级且每条可对应到文件/路由
  3. 团队（你）认可审计结论足以支撑 Phase 2 的设计决策（含明/暗、密度）

**Plans**: 2 plans
Plans:
**Wave 1**

- [x] 01-01-PLAN.md — 路由/API 枚举、AUD-01 功能矩阵七列、Mermaid 主路径与附图旅程

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 01-02-PLAN.md — P0 gsd-ui-auditor 六柱评分、P1/P2 走查、轻量浏览器冒烟、backlog + Top 15

### Phase 2: 极简设计契约

**Goal**: 将「极度克制、大留白」落实为可执行的 UI-SPEC（审计后再锁定明/暗）  
**Mode:** mvp  
**Depends on**: Phase 1  
**UI hint**: yes  
**Requirements**: AUD-03, IA-01  
**Success Criteria** (what must be TRUE):

  1. `UI-SPEC.md` 定义间距尺度、字号阶梯、色彩角色、边框/阴影/卡片策略
  2. 明/暗色策略有书面决策（含理由），与审计发现一致
  3. 设计系统页或 token 与 SPEC 对齐，可作为实现单一事实来源

**Plans**: 2 plans

Plans:

- [ ] 02-01: 从审计提炼设计原则与 token 草案
- [ ] 02-02: 撰写并评审 UI-SPEC.md

### Phase 3: 应用壳与导航 IA

**Goal**: 全局壳层引导用户进入双书蓝图主路径；次要能力降级为二级入口  
**Mode:** mvp  
**Depends on**: Phase 2  
**UI hint**: yes  
**Requirements**: IA-02, IA-03  
**Success Criteria** (what must be TRUE):

  1. 新用户从登录后 30 秒内能理解「双书项目 → 工作台」的下一步（无需读文档）
  2. 主导航视觉噪音显著低于当前（更少项、更留白、层级清晰）
  3. Studio / 对比 / 资料库 / 单书仍可访问，但不在主路径上与双书竞争注意力

**Plans**: 2 plans

Plans:

- [ ] 03-01: 重构 sidebar/header 信息架构与文案
- [ ] 03-02: 实现次要入口分层（折叠、二级菜单或情境入口）

### Phase 4: 核心界面密度重构

**Goal**: 双书工作台与会话列表达到克制、可读、操作层级一致  
**Mode:** mvp  
**Depends on**: Phase 3  
**UI hint**: yes  
**Requirements**: WB-01, WB-02, WB-03  
**Success Criteria** (what must be TRUE):

  1. 工作台默认同屏核心任务明确（分析 / 蓝图 / 生成），非当前阶段信息默认收起
  2. 会话列表与项目概览扫读成本明显降低（状态、模式、下一步操作可一眼识别）
  3. confirm 蓝图、生成、批量分析等关键 CTA 在全站层级与反馈一致

**Plans**: 3 plans

Plans:

- [ ] 04-01: 工作台布局分段与面板收敛
- [ ] 04-02: 会话/项目列表与概览页留白重构
- [ ] 04-03: 主 CTA 与状态反馈统一

### Phase 5: 验收与 SaaS 级打磨

**Goal**: 工程安全网 + 主观成功标准（愿意每天用、看起来像成熟 SaaS）  
**Mode:** mvp  
**Depends on**: Phase 4  
**UI hint**: yes  
**Requirements**: QLT-01, QLT-02, QLT-03  
**Success Criteria** (what must be TRUE):

  1. `npm test` 全绿；双书 blueprint confirm → generate-v2 手动冒烟通过
  2. 所有者确认：愿意每天打开使用（UAT 记录）
  3. 视觉一致性抽查通过：无「旧密布局」与「新留白布局」在同一主路径并存

**Plans**: 2 plans

Plans:

- [ ] 05-01: 自动化回归 + 主路径 e2e/冒烟
- [ ] 05-02: UAT 与视觉一致性收尾

## Progress

**Execution Order:** 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. 体验审计与功能矩阵 | 1/2 | In progress | 2026-05-26 |
| 2. 极简设计契约 | 0/2 | Not started | - |
| 3. 应用壳与导航 IA | 0/2 | Not started | - |
| 4. 核心界面密度重构 | 0/3 | Not started | - |
| 5. 验收与 SaaS 级打磨 | 0/2 | Not started | - |
