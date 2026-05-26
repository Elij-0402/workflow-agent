# Roadmap: NovelFusion AI — v0.4 UX Foundation

## Milestones

- ✅ **v0.3 UX 收敛** — Phases 1–5 (shipped 2026-05-25, archived: [milestones/v0.3-ROADMAP.md](milestones/v0.3-ROADMAP.md))
- 🚧 **v0.4 UX Foundation** — Phases 1–5 (active, started 2026-05-26)

## Overview

在 v0.3 UX 收敛之上，把双书蓝图主路径从「功能可用」推到「商业 SaaS 级精品体验」。五个阶段沿着 ARCHITECTURE.md 的 6-wave 依赖图压缩为 5 个交付节奏：URL-as-state 基础 → workbench 多路由拆分 → ⌘K palette + inline 蓝图编辑 → Studio 流式双栏 + CJK diff + 语义化简报 → token 收尾与验收。整条关键路径串行（Phase 1 → 2 → 3 → 4 → 5），Phase 4 内部 Wave 5/6 可并行。不引入 framer-motion / zustand / useChat / Tiptap / 虚拟列表（见 REQUIREMENTS.md `## Out of Scope`）。

## Phases

- [ ] **Phase 1: 01-foundation-url-state** — URL-as-state foundation + palette/nuqs/debounce primitives + bundle baseline
- [ ] **Phase 2: 02-workbench-multi-route** — workbench-client.tsx (1,403 LOC) → 4 step routes (≤320 LOC each) + 单书入口下线
- [ ] **Phase 3: 03-palette-and-inline-editor** — ⌘K 命令面板 + 蓝图卡片 textarea inline 编辑（IME-safe + ConflictGate）
- [ ] **Phase 4: 04-streaming-diff-semantic-brief** — Studio 流式双栏 + CJK inline diff + 文风 panel 语义控件（DF-03 首条迁移）
- [ ] **Phase 5: 05-polish-and-verify** — 99 `text-[Npx]` 清零 + WCAG + reduced-motion + UAT 重跑 + UI Review ≥21/24

## Phase Details

### Phase 1: 01-foundation-url-state

**Goal**: 在不引入任何用户可见行为变化的前提下，把 v0.4 后续所有 wave 需要的基础原件落位：⌘K 入口可见、`nuqs` URL-state 接管现有 3+ 个 ad-hoc 解析器、`useDebouncedCallback` 可用、bundle baseline 捕获。

**Mode:** mvp
**Depends on**: Nothing (foundation wave)
**UI hint**: yes
**Requirements**: FND-01, FND-02, FND-03
**Success Criteria** (what must be TRUE):

  1. User can see a「⌘K」kbd 提示出现在 `(app)` sidebar（按钮 stub 只是占位；点击 / 快捷键的实际 palette 在 Phase 3 才接通）
  2. 访问 `/sessions/[id]/workbench`、`/compare`、其他带 query 的 `(app)` 路由时，浏览器 URL 仍稳定可分享 — 但内部已由 `nuqs` 类型化解析器读出（`wb-diff-tab` 等 3+ 个 ad-hoc resolver 已替换，无 hydration mismatch 警告）
  3. 任一 PR 在 CI 中能输出 `@next/bundle-analyzer` 对 `app/(app)/sessions/[id]/workbench` chunk 的 gzip baseline 数字（后续 phase 用此作 +50 KB regression 门禁）
  4. `npm run type-check && npm test` 全绿；`npm run build` 无 hydration warning

**Plans**: TBD

**Risks (PITFALLS.md)**:
- Pitfall 7 (Critical, Phase 1+5): `useSearchParams` / `next-themes` SSR/CSR mismatch — `nuqs` 必须使用 `parseAsStringLiteral([...]).withDefault(x)` 服务端 + 客户端两侧默认值对齐
- Pitfall 1 (Critical, Phase 1+3 部分): palette 占位组件需用 `<CommandDialog>` 包裹（Radix Dialog + cmdk），不能裸 `<Command>` — 即便 Phase 1 只是 stub，结构必须正确以避免 Phase 3 拆轮子
- Pitfall 18 (Cross-phase, High): bundle baseline 必须在本阶段建立，否则后续 phase 没有对照基准

**Research flag**: standard patterns — `--research-phase` not required (`nuqs` + shadcn install + types extract 都是机械操作)

---

### Phase 2: 02-workbench-multi-route

**Goal**: 把 1,403 行的 `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx` 沿 `FlowStep` discriminated union 拆成 4 个独立路由 + 共享壳层；每个 step 拥有自己的 `loading.tsx`、slice loader、`useBlueprintGate()` / `useGenerateBlock()` 已先以 no-route-change PR 抽离；并把 `mode='single'` 入口硬下线（v0.3 决策 Q6: <50 rows）。本阶段是整个里程碑风险最高的重构，必须在不退化 v0.3 11/11 UAT 的前提下完成。

**Mode:** mvp
**Depends on**: Phase 1 (需要 `nuqs` adapter + 类型 extract 已落位)
**UI hint**: yes
**Requirements**: WBS-01, WBS-02, WBS-03, WBS-04, WBS-05, WBS-06
**Success Criteria** (what must be TRUE):

  1. User can deep-link to any of `/sessions/[id]/workbench/{upload|analyze|blueprint|generate}` 并落在正确 step；浏览器后退按钮在 step 之间稳定移动（不跳到 sessions 列表）
  2. 每个 step 路由首屏渲染自己的 shape-matched `loading.tsx` skeleton — 无 spinner、无 hydration 后 layout shift（DevTools Slow 3G throttle 下肉眼可验证）
  3. 11/11 v0.3 owner UAT 场景在 Phase 2 build 上全部重跑通过（confirm-gate、generate-block toast 等关键路径来自 `CTA_COPY` + 新 `STEP_HEADINGS` SSOT，未在新路由文件中硬编码 Chinese 字符串）
  4. `wc -l src/components/workbench/{upload,analyze,blueprint,generate}-step-client.tsx` 每个 ≤ 320 LOC；`workbench-client.tsx` 已从仓库删除；`tests/e2e/smoke.spec.ts` 在重构后绿
  5. 访问 `/upload?mode=single` 返回 301 → `/upload?mode=dual`；DB 中现存 `sessions.mode='single'` 行仍可只读访问（不主动 prompt 升级）

**Plans**: TBD

**Risks (PITFALLS.md)**:
- Pitfall 4 (Critical): confirm-gate / generate-block 静默回归 — `useBlueprintGate()` + `useGenerateBlock()` 必须在拆路由之前以独立 PR 抽出；每抽完一个路由跑一次 11/11 UAT
- Pitfall 5 (High): 跨路由本地状态丢失 — 拆分前先审计 `workbench-client.tsx` 每个 `useState` 应归属 server / URL / sessionStorage 哪一层；不引入 zustand
- Pitfall 6 (High): URL 参数与 v0.3 `?view=overview`、`?step=` 兼容性 — 旧链接通过 middleware 301 重写；不要让 query 名重叠
- Pitfall 7 (High): hydration mismatch — 每个 step page 必须是 RSC，client island 包裹在 `<Suspense>` 中
- Pitfall 17 (High): 单书移除遗留 — 移除 UI 前 grep `mode === 'single'`、`?mode=single` 全部清理；API 层先保留 `mode` 字段以便回滚（v0.4.x 再清）
- Pitfall 19 (Critical): Playwright selector drift — 所有新字符串走 `CTA_COPY` + `STEP_HEADINGS` SSOT；`npm run test:e2e` 在 phase 末尾必须绿

**Research flag**: standard patterns — `--research-phase` not required (ARCHITECTURE.md Decision 2 + 7 已经把 line-by-line 拆分 map 写到 `workbench-client.tsx` 的具体行号)

---

### Phase 3: 03-palette-and-inline-editor

**Goal**: 同时交付两个最贴近"日常打开"体验的功能：(a) ⌘K 命令面板 — 在 `(app)/layout.tsx` 单实例挂载，提供路由跳转与最近 5 个会话；(b) 蓝图卡片 inline 编辑 — Shadcn `<Textarea>` + 400 ms 防抖 + IME 守卫 + 409 ConflictGate + 两模式键盘（j/k/d/a 列表 vs Tab/Enter/Esc 编辑）。两条功能线共享 IME composition 守卫与键盘 hook scope 设计，因此放同一阶段。

**Mode:** mvp
**Depends on**: Phase 2 (需要新的 4 个 step 路由已就位，palette 才能列出它们；blueprint 步骤 client 已落位才能挂 inline editor)
**UI hint**: yes
**Requirements**: PAL-01, PAL-02, PAL-03, PAL-04, IBE-01, IBE-02, IBE-03, IBE-04, IBE-05
**Success Criteria** (what must be TRUE):

  1. User 在任意 `(app)` 路由按 `⌘K` (mac) / `Ctrl+K` (win/linux) 可打开 palette；模糊搜索可定位所有 `(app)` 路由 + 最近 5 个会话；Esc 关闭后焦点回到触发元素；侵入 Pinyin/Bopomofo IME 组合输入时 palette 不被触发（`event.nativeEvent.isComposing` + `keyCode === 229` 双重门禁）
  2. User 在 blueprint card 任意字段点入 inline 编辑，连续输入 10 个字符 — 浏览器 Network 面板显示 **恰好 1 次** PATCH `/api/blueprint`（单元测试覆盖；这条同时回归 v0.3 已知的 every-keystroke save bug）
  3. User 用 Pinyin 输入「小说」 — 候选窗口不闪烁、不被 re-render 拆掉；`compositionend` 触发显式 flush；Supabase 中保存的不是中间态「x/xi/xia」垃圾
  4. 另一标签页修改蓝图后，当前 tab 再次 PATCH 收到 409 — ConflictGate 弹出「已在其他窗口编辑」 + 单击刷新；服务端在 409 body 中返回当前 `updated_at`，无需额外 GET 往返
  5. User 在列表模式按 `j`/`k` 切卡片、`d` 删除、`a` 新增；进入编辑模式后 `Tab`/`Enter`/`Esc` 接管；任意 input/textarea focus 时单字母快捷键全部禁用（`react-hotkeys-hook` scopes）；`?` 打开键盘帮助 dialog

**Plans**: TBD

**Risks (PITFALLS.md)**:
- Pitfall 8 (Critical) — CJK IME composition 吞输入：选用 native `<textarea>`（**不是** Tiptap / contentEditable）；自定义 keydown 全部用 `if (e.nativeEvent.isComposing || e.keyCode === 229) return;` 守卫；防抖 flush 在 `compositionend` 后触发
- Pitfall 1 (Critical) — palette 焦点 trap 泄漏：必须用 `<CommandDialog>`（Radix Dialog + cmdk）；在 `(app)/layout.tsx` 挂载一次，不在 step 子路由里
- Pitfall 2 (High) — ⌘K 与浏览器 / IME 冲突：`metaKey||ctrlKey && key==='k' && !isComposing && keyCode!==229`；不要绑 `/`（与中文标点 IME 冲突）
- Pitfall 5 (Critical Phase 1+3) — palette mount 位置：必须 `src/app/(app)/layout.tsx`，不是 root layout；测试 `/login` 路由按 ⌘K 应无反应
- Pitfall 6 (High) — every-keystroke PATCH 泄漏：`useBlueprintSave` 是唯一网络入口；防抖包在最外层 API 调用上而非 onChange；单元测试 type-10-chars-assert-1-PATCH
- Pitfall 9 (High) — 草稿丢失：编辑期保存 sessionStorage 草稿，键 `sessionId + cardId + userId`，下次挂载恢复
- Pitfall 10 (High) — 乐观更新 race：客户端 `bpUpdatedAt` 为编辑会话内权威值；只在 `props.blueprintId` 变化时从 props sync

**Research flag**: **yes** — Phase 3 likely needs `/gsd-plan-phase --research-phase`. 三个细节面：(1) `<textarea>` + `useDebouncedCallback` + IME 守卫 + 草稿持久化 + autosize 集成，(2) `react-hotkeys-hook` 两模式 scope 与 palette / inline-edit 互斥，(3) 409 ConflictGate UX 与 `/api/blueprint` response shape 验证

**Pre-phase verification gate** (per SUMMARY.md Open Question 1): 在 plan-phase 之前确认 `src/lib/schemas/blueprint.ts` 全部字段是 plain-text 固定形（无 rich content），否则 inline-editor 决策回到 Tiptap 重审

---

### Phase 4: 04-streaming-diff-semantic-brief

**Goal**: Studio 生成阶段从 JSON 一次性响应升级为流式双栏体验（左：蓝图 + 源章节 read-only；右：SSE 实时输出 + cost-tag + stop）；diff 在原有三层段落 LCS 之上增加字 / 词级 inline diff，CJK 经 `Intl.Segmenter` 分词；文风 panel 替换为语义化控件（tone / pacing / sensory_density / prose_register），其余 Persona/Plot/Constraints 三 panel 在 v0.4 维持 freeform。本阶段 Wave 5（streaming）与 Wave 6（diff）可并行；CRB 在文风 panel 单 panel 范围内落地。

**Mode:** mvp
**Depends on**: Phase 3 (需要 inline 编辑稳定的蓝图作为流式左栏 read-only 源；Phase 3 的 IME / 防抖 hook 在文风 panel freeform fallback 处复用)
**UI hint**: yes
**Requirements**: STR-01, STR-02, STR-03, STR-04, STR-05, DIF-01, DIF-02, DIF-03, DIF-04, CRB-01, CRB-02, CRB-03
**Success Criteria** (what must be TRUE):

  1. User 在 generate step 点「生成新版本」— 右栏出现实时打字效果（token 逐块到达）、cost-tag 估算实时更新、stop 按钮可见；点 stop 后 Network 面板的 EventSource 在 ~200 ms 内关闭，所有 input 重新可用（AbortController 完整 teardown）
  2. User 向上滚动阅读旧内容时右栏 **不** 自动跟随尾部；点击「跟随最新」恢复 auto-scroll；用户滚动意图持久化直至显式恢复
  3. User 切换到「prose」diff tab — 一篇 10k 中文字符的章节在 p95 ≤ 200 ms 内完成首屏（Playwright timing 验证）；只有真正变化的段落进入 LCS 字级 diff，其余段落 `content-visibility: auto` 跳过 layout
  4. User 在文风 panel 选择 `tone=克制冷峻` + `pacing=缓` + `sensory_density=低` + `prose_register=文白杂糅` — 提交后服务端 prompt 中可见 4 个确定性 fragment（无 raw temperature / top-p 暴露）；Persona / Plot / Constraints 三 panel 仍 freeform
  5. axe-core 在 dark mode 下扫描 diff 高亮（insert / delete / equal） — WCAG AA 4.5:1 全部通过；`/api/generate-v2` 与流式版本共享同一 `runGeneration(blueprintId, config, emit?)` 核心，无 branch 重复

**Plans**: TBD

**Risks (PITFALLS.md)**:
- Pitfall 13 (Critical) — CJK diff 性能悬崖：`Intl.Segmenter("zh", { granularity: "word" })` 先分词再 `diffWords`，**永远不用** `\s+` 分割；server 预计算 LCS；客户端只渲染；> 50 ms 走 Web Worker；只 changed 段落进字级
- Pitfall 11 (High) — 流式双栏 layout thrash：grid（不是 flex-stretch）固定容器高；两栏独立 overflow-y；React 更新走 `requestAnimationFrame` 节流；目标 30fps 不是 60
- Pitfall 12 (Medium) — cost meter 与 abort UX：cost 显示估算 + tooltip 注明「最终以服务端为准」；abort 后再 fetch 一次最终 cost；abort 按钮仅在 streaming 期可见
- Pitfall 16 (High, 与 Phase 5 共担) — dark-mode diff 配色 WCAG：insert `bg-emerald-900/40 text-emerald-200`、delete `bg-red-900/40 text-red-200 line-through`；本阶段先选色，Phase 5 axe-core 重扫
- Pitfall 18 (High, cross-phase) — bundle regression：`diff@9` + `Intl.Segmenter`（runtime native，无包）总计应 < 15 KB gzipped；`next/dynamic` 拆 streaming-panel 与 prose diff

**Research flag**: **yes** — Phase 4 likely needs `/gsd-plan-phase --research-phase`. 三个细节面：(1) `Intl.Segmenter` 在部署目标 Browserslist 的实际支持矩阵 + 段落级 fallback，(2) AbortController 通过 custom SSE → fetch signal 的端到端传播 verification，(3) `runGeneration(blueprintId, config, emit?)` 重构是否能干净抽取（ARCHITECTURE Open Q2）— 否则 JSON 与 SSE 双路径并存推迟到 v0.5

**Pre-phase verification gate** (per SUMMARY.md Open Question 3): 确认 `/api/blueprint` 409 response body 包含当前 `updated_at`（影响 Phase 3 ConflictGate；本阶段 streaming pre-step 同步验证）

---

### Phase 5: 05-polish-and-verify

**Goal**: 把 v0.4 整体推到「商业 SaaS 级精品」结案：99 个 `text-[Npx]` 违规清零并替换为 `.type-*` 语义类、装饰性 `text-primary` 移除、150 ms `ease-out` 过渡基线 + `prefers-reduced-motion` 守门、`next-themes` 完全移除（dark-only post-v0.3），并以 11/11 owner UAT 重跑 + Playwright smoke + 生产 build smoke + `gsd-ui-auditor` 六柱重审 ≥ 21/24 作为里程碑出门门禁。

**Mode:** mvp
**Depends on**: Phase 4 (所有 feature 已落位，本阶段不引入新功能；只做 token / motion / a11y / 验收)
**UI hint**: yes
**Requirements**: POL-01, POL-02, POL-03, POL-04, POL-05, POL-06
**Success Criteria** (what must be TRUE):

  1. `grep -rn 'text-\[' src/` 返回 0；所有原 99 处违规已替换为 `.type-*` 语义工具类；`npm run build && npm run start` 在生产模式下肉眼回扫无未样式化文本（Tailwind purge 守门）
  2. 操作系统切换到 `prefers-reduced-motion: reduce` — 所有 hover/focus/state-change 过渡禁用、有等价非动画状态线索；正常模式下过渡 ≤ 150 ms `ease-out`
  3. `package.json` 已删除 `next-themes`；`grep -r 'next-themes' src/` 返回 0；`npm run build` 无 hydration warning
  4. 11/11 v0.3 owner UAT 场景在 v0.4 终态 build 上全部重跑通过；Playwright smoke 全绿；`npm run build && npm run start` 不报错且双书 confirm → generate-v2 流程手动冒烟成功
  5. `gsd-ui-auditor` 重新六柱评分 ≥ 21/24（v0.3 baseline 14/24），单柱不低于 3/4；axe-core 在主路径 dark mode 下无 color-contrast 违规

**Plans**: TBD

**Risks (PITFALLS.md)**:
- Pitfall 15 (High) — Tailwind purge 动态类：替换时严禁 `text-${size}` 模板字面量；用 `const sizeMap = { sm: 'text-sm', ... } as const`；`npm run build && npm run start` 验证
- Pitfall 16 (High) — dark-mode WCAG：所有 status color（success/warning/error/info）+ 新 diff 配色 axe-core 扫一遍；`theme-tokens.ts` 显式 dark 值，不依赖 Tailwind 默认
- Pitfall 20 (Medium) — motion 基线 jank：reduced-motion CSS `@media` 全局兜底；focus ring 应即时（无过渡）；动画只用于真正的 state change，不用于 route transition
- Pitfall 7 (High, 与 Phase 1+2 共担收尾) — `next-themes` 移除最终触发：移除后 `npm run build` 必须无 hydration warning
- Pitfall 14 (Medium) — skeleton flash：在 fast connection 下 skeleton 不应闪一帧即消失；route-level `loading.tsx` 已在 Phase 2 落位，本阶段只验证延迟感知
- Pitfall 18 (High) — bundle 总账：本阶段最终对比 Phase 1 baseline；`app/(app)/sessions/[id]/workbench` chunk 增长 ≤ 50 KB gzipped 为门禁；若超，必走 `next/dynamic`

**Research flag**: standard patterns — `--research-phase` not required (token codemod + axe-core + bundle analyzer 都是 tooling-driven)

**Cross-cutting constraints**:

- 硬性门禁：每个 plan task 结束前 `npm run type-check && npm test`
- 所有者本人签署 POL-05；REQUIREMENTS 复选框由里程碑流程勾选

## Progress

**Execution Order:** 1 → 2 → 3 → 4 → 5（Phase 4 内部 Wave 5/6 可并行）

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. 01-foundation-url-state | v0.4 | 0/0 | Not started | — |
| 2. 02-workbench-multi-route | v0.4 | 0/0 | Not started | — |
| 3. 03-palette-and-inline-editor | v0.4 | 0/0 | Not started | — |
| 4. 04-streaming-diff-semantic-brief | v0.4 | 0/0 | Not started | — |
| 5. 05-polish-and-verify | v0.4 | 0/0 | Not started | — |

---

### Archived: v0.3 UX 收敛

<details>
<summary>✅ v0.3 UX 收敛 (Phases 1–5) — SHIPPED 2026-05-25</summary>

- [x] **Phase 1: 体验审计与功能矩阵** — 2/2 plans (2026-05-25)
- [x] **Phase 2: 极简设计契约** — 2/2 plans (2026-05-26)
- [x] **Phase 3: 应用壳与导航 IA** — 2/2 plans (2026-05-26)
- [x] **Phase 4: 核心界面密度重构** — 3/3 plans (2026-05-25)
- [x] **Phase 5: 验收与 SaaS 级打磨** — 2/2 plans (2026-05-25)

Full phase details: [milestones/v0.3-ROADMAP.md](milestones/v0.3-ROADMAP.md)

</details>
