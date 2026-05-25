# Phase 5: 验收与 SaaS 级打磨 - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段交付**里程碑收尾验收**：工程回归安全网（QLT-01）、所有者主观日用性验收（QLT-02）、主路径视觉一致性收尾（QLT-03）。在 Phase 1–4 已锁定的审计、UI-SPEC、壳层 IA、工作台密度之上，证明「愿意每天用 + 看起来像成熟 SaaS」，**不新增**路由、API 或产品能力。

必须产出（对齐 ROADMAP / QLT-01–03）：

1. **`npm test` 全绿**；双书 **confirm → generate-v2** 闭环有可重复验证（自动化和/或书面冒烟）
2. **所有者 UAT 记录**（结构化场景 + 二元「愿意每天用」结论）
3. **视觉一致性抽查**通过：主路径无「旧密布局」与「新留白布局」并存；次要页债务有书面处置

**不在本阶段：** 新 LLM 维度、legacy API 收敛（CNV-01–03）、大规模删路由、workbench 行数拆分至 &lt;500（工程债 v2）、studio/compare/settings **大改**（仅抽查与登记）。

**须遵守：** `02-UI-SPEC.md`、`03-UI-SPEC.md`、`04-UI-SPEC.md` / `04-CONTEXT.md`；不得回退 Phase 3 redirect 与 Phase 4 CTA SSOT。
</domain>

<decisions>
## Implementation Decisions

### 自动化回归深度（QLT-01）
- **D-01:** **硬性门禁** = `npm run type-check` + `npm test`（全量 `src/**/*.test.ts`）；每个 plan task 结束前须复跑。
- **D-02:** **主路径 e2e** 以现有 `tests/e2e/smoke.spec.ts` 为 SSOT：已覆盖 login → dual upload → workbench 分析 → blueprint patch/confirm（API）→ UI「生成新版本」→ 阅读全文；05-01 **不重复造轮**，仅修复因 Phase 4 文案/布局导致的 selector 漂移。
- **D-03:** **CI 策略：** 默认 PR/本地门禁以单元测试为主；Playwright **不**作为无密钥 CI 的 blocking job。在 `05-01` 产出 **`05-SMOKE.md`**（或 PLAN 内等价章节）：列明运行 `npm run test:e2e` 的前置（`.env`、`configureLlm`、超时 15min），供所有者/发布前手动执行；ROADMAP SC#1「手动冒烟通过」= 该脚本最近一次成功 + 日期记录。
- **D-04:** 若 smoke 失败仅因 LLM/网络，区分 **产品回归** vs **环境**；产品问题必须修，环境记录在 VERIFICATION 而不算 phase complete。
- **D-05:** 可选加固：为 `cta-copy`、shell redirect、`deriveSessionDashboard` 等 Phase 4 触点补 **仅当** `npm test` 发现缺口时增加测试——不追求覆盖率数字。

### 「愿意每天用」UAT（QLT-02）
- **D-06:** UAT 文档 **`05-UAT.md`**，结构对齐 `04-UAT.md`（frontmatter + Tests + Summary）。
- **D-07:** **场景集** = Phase 4 全部 **8** 项 **保留**（回归壳层 + 密度 + CTA）+ Phase 3 `03-HUMAN-UAT.md` **3** 项合并为 **3** 条追加（30 秒懂主路径、导航噪音、移动 Sheet IA）→ 共 **11** 条；与 Phase 4 重复处（如 shell regression）合并为一条，避免重复劳动。
- **D-08:** **通过标准：** 11 条中 **0 blocker**；允许最多 **3** 条标 `known-acceptable`（须链到 backlog ID + 一句理由）。**QLT-02 二元通过** = 所有者在 Summary 签署「愿意每天打开使用」**且** blocker=0。
- **D-09:** 「愿意每天用」**不**要求 studio/compare/settings 达到主路径同等愉悦度；次要模块不满意记入 `known-acceptable` 或 deferred，**不**否决里程碑。
- **D-10:** 验收执行人 = **所有者本人** walkthrough（非仅代理自述）；代理可准备脚本与截图清单，结论须所有者确认。

### 视觉一致性抽查（QLT-03）
- **D-11:** **Tier A（必过）** 主路径：`/sessions`、`/sessions/[id]/workbench`、`/upload?mode=dual`、dual 默认 redirect 链；标准 = 无第二套「仪表盘堆叠」首屏（≤2 层 `surface-panel` 于首屏焦点区）、无装饰性 `text-primary`、无新增 `text-[Npx]`（grep 门禁可写入 plan）。
- **D-12:** **Tier B（抽查登记）** `/studio`、`/compare`、`/library`、`/settings`：各 **1** 次快速扫视（5 分钟内/路由），记录「符合 SPEC / 遗留密布局 / 可接受债务」；**不**在 Phase 5 做结构性改版。
- **D-13:** 审计 backlog **#13 studio/compare**、**#14 settings** → **接受债务**，写入 `05-VERIFICATION.md` 的 known debt 表 + `REQUIREMENTS` traceability 备注；v2（CNV-*）再处理。
- **D-14:** **不**再跑全量 gsd-ui-auditor（Phase 1 已有基线）；用 **Tier A grep + 所有者 Tier B 笔记** 满足 QLT-03。若 Tier A grep 失败则必须修。
- **D-15:** Phase 4 已 defer 的 settings/studio 密度 **不**拉回 in-scope；仅验证主路径无「一半新一半旧」的**同一 URL** 内混搭。

### Phase 3 人工 UAT 遗留
- **D-16:** `03-HUMAN-UAT.md` **不**单独补跑第三轮；其 3 项 **并入** `05-UAT.md`（D-07）。
- **D-17:** Phase 5 UAT 全部通过后，由 executor 将 `03-HUMAN-UAT.md` status 更新为 **complete**（回填 result），并 note「covered by 05-UAT §3.x」。
- **D-18:** `03-VERIFICATION.md` 若仍 open：在 05-02 以「Phase 5 回归覆盖 IA SC」一条 cross-reference 关闭或标 superseded。

### Backlog 收尾 vs 债务
- **D-19:** P0/P1 主路径项（#1–12 中 sessions/workbench 相关）视为 Phase 4 **已处理**；Phase 5 仅 **验证** 不回滚。
- **D-20:** P2 及 Tier B 项 **不**修代码，除非修复成本 &lt;30min 且零行为变更（文案/token 一行级）。
- **D-21:** Top 15 中未关闭项须在 `05-VERIFICATION.md` 有 ** disposition** 列：`fixed-in-p4` | `verified-in-p5` | `deferred-v2`。

### 计划拆分与门禁（05-01 / 05-02）
- **D-22:** **05-01（先）** 自动化：test 全绿、smoke selector 对齐、`05-SMOKE.md`、可选 grep 脚本（`text-[Npx]` on Tier A routes）、`05-01-SUMMARY` 记录最后 green 的 test 计数。
- **D-23:** **05-02（后，依赖 05-01）** 人工：`05-UAT.md` 执行与签署、`05-VERIFICATION.md`（QLT-01–03 逐条）、Tier B 抽查表、更新 `03-HUMAN-UAT`。
- **D-24:** Phase 5 **complete** 条件 = D-01 绿 + D-03 冒烟记录 + D-08 签署 + D-11 Tier A 通过 + D-21 disposition 表齐全。
- **D-25:** 里程碑完成后 **不**自动勾选 REQUIREMENTS 复选框——由 `/gsd-complete-milestone` 或人工根据 VERIFICATION 统一勾选 QLT-*。

### Claude's Discretion
- smoke 与 UAT 的具体 selector 修补、grep 脚本实现方式由 planner/executor 决定。
- `known-acceptable` 的 3 条上限可由所有者在 UAT 时缩减为 0–3。
- 是否在 05-01 增加 `upload-branches.spec.ts` 回归由 executor 视时间决定（非硬性）。

### Folded Todos
（无）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求与路线图
- `.planning/REQUIREMENTS.md` — QLT-01、QLT-02、QLT-03
- `.planning/ROADMAP.md` — Phase 5 成功标准
- `.planning/PROJECT.md` — 日用性 + SaaS 观感核心值

### 设计契约（验收对照）
- `.planning/phases/02-minimal-design-contract/02-UI-SPEC.md` — dark-only、一屏一焦点、禁止任意 px
- `.planning/phases/03-app-shell-navigation-ia/03-UI-SPEC.md` — 壳层 IA
- `.planning/phases/03-app-shell-navigation-ia/03-CONTEXT.md` — dual redirect、CTA
- `.planning/phases/04-core-interface-density/04-UI-SPEC.md` — Phase 4 工作台/会话约束
- `.planning/phases/04-core-interface-density/04-CONTEXT.md` — D-01–D-18
- `.planning/phases/04-core-interface-density/04-UAT.md` — 8 项回归基线（须保留）

### 审计与债务登记
- `.planning/phases/01-ux-audit-matrix/01-AUDIT-BACKLOG.md` — Top 15 + #13/#14 disposition
- `.planning/phases/01-ux-audit-matrix/01-UI-REVIEW.md` — 六柱依据
- `.planning/phases/03-app-shell-navigation-ia/03-HUMAN-UAT.md` — 3 项待并入 05-UAT
- `.planning/phases/03-app-shell-navigation-ia/03-VERIFICATION.md` — IA 验证状态

### 测试与冒烟
- `.planning/codebase/TESTING.md` — test/e2e 命令与组织
- `tests/e2e/smoke.spec.ts` — 主路径 e2e SSOT
- `tests/e2e/upload-branches.spec.ts` — 上传分支（可选回归）
- `tests/e2e/helpers/auth.ts` — login / configureLlm
- `package.json` — `test`、`test:e2e` scripts

### 实现锚点（Tier A grep / 抽查）
- `src/app/(app)/sessions/page.tsx`
- `src/app/(app)/sessions/SessionsClient.tsx`
- `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx`
- `src/app/(app)/upload/page.tsx`
- `src/lib/ui/cta-copy.ts` — CTA SSOT

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tests/e2e/smoke.spec.ts` — 已含 generate-v2 UI 点击与 blueprint confirm API
- `04-UAT.md` — 8 场景模板可直接扩展为 `05-UAT.md`
- `src/lib/ui/cta-copy.test.ts` — CTA 一致性已有单元覆盖

### Established Patterns
- 单元测试 co-located `*.test.ts`；无 Jest，Node test runner + tsx
- E2E 依赖 `.env` + Supabase service role + LLM 配置（非无密钥 CI 友好）
- Phase 完成产物：`VERIFICATION.md` + `UAT.md` + plan SUMMARY

### Integration Points
- ROADMAP SC#1 同时要求 `npm test` 与手动冒烟 — 用 D-01 + D-03 拆分职责
- STATE.md QLT 仍为 Pending — 本 phase VERIFICATION 通过后由里程碑流程勾选

</code_context>

<specifics>
## Specific Ideas

- 用户授权：**全部讨论区由 Claude 选推荐项**（等同 Phase 4 `--auto` 讨论）。
- 核心取舍：**主路径证明完毕即可里程碑完成**；studio/compare/settings 登记债务而不扩 scope。
- smoke.spec 已比 ROADMAP 字面「手动冒烟」更完整 — Phase 5 重点是 **稳定、记录、门禁**，而非新写 e2e。

</specifics>

<deferred>
## Deferred Ideas

- **CNV-01–03**（legacy API、维度统一、大组件拆分）— v2，本 phase 仅文档引用
- **studio/compare/settings 密度大修**（backlog #13、#14）— v2；Tier B 只登记
- **全站 gsd-ui-auditor 复跑** — 非本 phase；用 Tier A/B 抽查替代
- **`/design-system` 生产 guard**（P3）— 仍不在本里程碑

</deferred>

---

*Phase: 05-验收与 SaaS 级打磨*
*Context gathered: 2026-05-26*
