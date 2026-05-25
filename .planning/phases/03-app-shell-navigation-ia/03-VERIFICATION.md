---
phase: 03-app-shell-navigation-ia
verified: 2026-05-26T19:10:00Z
status: human_needed
score: 13/15
overrides_applied: 0
human_verification:
  - test: "登录后从 /sessions（或首页重定向）开始计时，不打开文档，在 30 秒内回答：下一步是「新建双书」还是「打开已有项目进工作台」。"
    expected: "能明确说出双书主路径；壳层 header 提示「下一步：打开项目或新建双书」、侧栏 primary「新建双书项目」、列表页 CTA 一致。"
    why_human: "ROADMAP 成功标准 #1 为认知/时间约束，grep 无法验证用户理解速度。"
  - test: "对比 Phase 3 前截图或记忆，浏览桌面侧栏与 header：主导航项数量、留白、层级是否明显更清晰。"
    expected: "仅「项目」一层突出；创作台/对比/资料库在默认收起的「更多工具」内；无「当前主线」噪声块。"
    why_human: "成功标准 #2「显著低于当前」需主观前后对比，代码只能证明结构而非感知降幅。"
  - test: "移动端打开 Sheet：展开「更多工具」，点击创作台/对比/资料库，确认与桌面同一 IA。"
    expected: "Sheet 内为 AppNav 单一来源；次级项可直达且不与双书 CTA 同级竞争。"
    why_human: "折叠交互与触摸目标体验需实机确认。"
---

# Phase 3: 应用壳与导航 IA Verification Report

**Phase Goal:** 全局壳层引导用户进入双书蓝图主路径；次要能力降级为二级入口  
**Verified:** 2026-05-26T19:10:00Z  
**Status:** human_needed  
**Re-verification:** No — initial verification

**MVP note:** ROADMAP `Goal` 为叙述句；Plan 01/02 目标为用户故事格式。下列 User Flow Coverage 按 Plan 推导的「30 秒内知下一步」验收对齐 `verify-mvp-mode.md`。

## User Flow Coverage

User story（Plan 01/02）: *As a 登录用户, I want to 从全局壳层与项目列表直接进入双书上传与工作台, so that 30 秒内知道下一步而无需读文档。*

| Step | Expected | Evidence | Status |
|------|----------|----------|--------|
| 登录后进入壳层 | 侧栏 primary「新建双书项目」→ `/upload?mode=dual` | `src/components/sidebar.tsx` L29-33; `mobile-nav.tsx` L43-51 | ✓ |
| 识别主路径文案 | Logo 副标题「双书蓝图工作台」；无「当前主线」块 | `sidebar.tsx` L22-24; repo 无「当前主线」 | ✓ |
| 列表页知下一步 | Header「下一步：打开项目或新建双书」；列表 CTA 对齐 | `contextual-shell-title.tsx` L18-21; `sessions/page.tsx` L31-34, L117 | ✓ |
| 打开 dual 项目 | 无 legacy query 时进 workbench | `sessions/[id]/page.tsx` L59-66 `redirect(.../workbench)` | ✓ |
| 工作台回概览 | 「项目概览」→ `?view=overview` | `workbench-client.tsx` L645-648 | ✓ |
| 次要工具不抢注意力 | studio/compare/library 在「更多工具」默认收起 | `app-nav.tsx` L57, L68-95 `useState(false)` | ✓ |
| 兼容入口仍可达 | `/create` 推荐主路径条；`/upload?mode=dual` 标题一致 | `task-mode-page.tsx` L16-28; `upload/page.tsx` L40-47 | ✓ |
| 30 秒内理解下一步 | 用户能在无文档下完成认知 | 壳层提示存在但**未**实测用户耗时 | ? 需人工 |

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Sidebar/MobileNav 唯一 primary CTA「新建双书项目」→ `/upload?mode=dual` | ✓ VERIFIED | `sidebar.tsx` L29-33; `mobile-nav.tsx` L48-51 |
| 2 | Sidebar 无「当前主线」块；Logo 副标题「双书蓝图工作台」 | ✓ VERIFIED | `sidebar.tsx` L22-24; 全库无「当前主线」 |
| 3 | Header `ContextualShellTitle`；`/sessions` 显示下一步提示 | ✓ VERIFIED | `layout.tsx` L33; `contextual-shell-title.tsx`; `shell-title.test.ts` |
| 4 | dual 会话无 legacy query 时 redirect 至 workbench | ✓ VERIFIED | `sessions/[id]/page.tsx` L59-66 |
| 5 | 工作台 PageHeader「项目概览」链回 `/sessions/[id]?view=overview` | ✓ VERIFIED | `workbench-client.tsx` L645-648 |
| 6 | 主导航仅「项目」突出；次要项在「更多工具」且默认收起 | ✓ VERIFIED | `app-nav.tsx` PRIMARY + Collapsible `useState(false)` |
| 7 | Mobile Sheet 镜像 desktop（`AppNav` 唯一来源） | ✓ VERIFIED | `mobile-nav.tsx` L65 `<AppNav onNavigate=...>` |
| 8 | 非活跃 nav 图标无 `text-primary` | ✓ VERIFIED | `app-nav.tsx` L152-159 仅 foreground/muted |
| 9 | `/create` 推荐主路径条；`/upload` dual 文案与 CTA 动词一致 | ✓ VERIFIED | `task-mode-page.tsx` L18-27; `upload/page.tsx` L40-47 |
| 10 | Studio/对比/资料库/单书仍可访问且不抢主路径 | ✓ VERIFIED | `SECONDARY_NAV_ITEMS` + `/upload?mode=single` outline |
| 11 | `npm test` 全绿 | ✓ VERIFIED | `npm test` → 192/192 pass（含 `shell-title.test.ts`） |
| 12 | IA-02：壳层默认双书英雄旅程 | ✓ VERIFIED | 上列 CTA + 提示 + redirect 闭环 |
| 13 | IA-03：次要能力折叠/二级入口 | ✓ VERIFIED | Collapsible「更多工具」+ 单书 secondary |
| 14 | ROADMAP SC：主导航视觉噪音显著降低 | ? UNCERTAIN | 结构已收敛（1 primary + 折叠 3 项）；**降幅需人工对比** |
| 15 | ROADMAP SC：30 秒内理解双书→工作台下一步 | ? UNCERTAIN | UI 提示已接线；**认知时间需人工** |

**Score:** 13/15 truths verified programmatically (2 roadmap cognitive criteria deferred to human)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `src/lib/shell/shell-title.ts` | pathname → title + hint gate | ✓ VERIFIED | Exports `resolveShellTitle`, `shouldShowSessionsNextHint`; 35 lines substantive |
| `src/lib/shell/shell-title.test.ts` | 11 behaviors | ✓ VERIFIED | 4 tests, all pass |
| `src/components/contextual-shell-title.tsx` | Header chrome | ✓ VERIFIED | Wired in `layout.tsx` |
| `src/components/sidebar.tsx` | dual primary + single secondary | ✓ VERIFIED | `/upload?mode=dual` primary |
| `src/components/app-nav.tsx` | IA SSOT + 更多工具 | ✓ VERIFIED | 166 lines; Collapsible + exports |
| `src/components/ui/collapsible.tsx` | Radix primitive | ✓ VERIFIED | shadcn-generated 11 lines |
| `src/app/(app)/sessions/[id]/page.tsx` | dual workbench redirect | ✓ VERIFIED | `getDualWorkbenchRedirect` + default redirect |
| `src/components/create/task-mode-page.tsx` | /create compatibility strip | ✓ VERIFIED | 「推荐主路径」+ dual link |
| `src/app/(app)/upload/page.tsx` | dual hero copy | ✓ VERIFIED | 「新建双书项目」title when dual |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `layout.tsx` | `contextual-shell-title.tsx` | header | ✓ WIRED | `ContextualShellTitle` import L3, render L33 |
| `sidebar.tsx` | `/upload?mode=dual` | Button asChild Link | ✓ WIRED | L29-33 |
| `sessions/[id]/page.tsx` | `/sessions/[id]/workbench` | redirect | ✓ WIRED | L65-66 |
| `app-nav.tsx` | `collapsible.tsx` | CollapsibleTrigger/Content | ✓ WIRED | L15-19, L68-95 |
| `mobile-nav.tsx` | `app-nav.tsx` | `<AppNav />` | ✓ WIRED | L65; no duplicate NAV_ITEMS |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `ContextualShellTitle` | `pathname` | `usePathname()` | Yes — drives title/hint | ✓ FLOWING |
| `sessions/[id]/page.tsx` | `sessionMode.mode` | Supabase `sessions` select | Yes — gates redirect | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Shell title contract | `npm test -- src/lib/shell/shell-title.test.ts` | pass (included in full suite) | ✓ PASS |
| Full regression | `npm test` | 192 pass, 0 fail | ✓ PASS |

### Probe Execution

Step 7c: SKIPPED — no phase-declared probes; not a migration/tooling phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| IA-02 | 03-01, 03-02 | 主导航与壳层以双书为默认英雄旅程 | ✓ SATISFIED | dual CTAs, contextual header, redirect, sessions copy |
| IA-03 | 03-02 | 次要能力折叠/二级，高级用户可直达 | ✓ SATISFIED |「更多工具」Collapsible + secondary hrefs + `/create` strip |

No orphaned requirement IDs for Phase 3.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | — | — | Phase-touched shell/nav files: no TBD/FIXME/TODO blockers |

### Human Verification Required

### 1. 30 秒下一步认知

**Test:** 登录后从 `/sessions`（或首页重定向）开始计时，不打开文档，在 30 秒内回答：下一步是「新建双书」还是「打开已有项目进工作台」。  
**Expected:** 能明确说出双书主路径；壳层 header 提示、侧栏 primary、列表 CTA 一致可发现。  
**Why human:** ROADMAP 成功标准 #1 为认知/时间约束。

### 2. 导航视觉噪音对比

**Test:** 对比 Phase 3 前基线，浏览桌面侧栏与 header。  
**Expected:** 仅「项目」一层突出；次要项在默认收起的「更多工具」；无「当前主线」块。  
**Why human:** 成功标准 #2 的「显著降低」需主观前后对比。

### 3. 移动端 IA parity

**Test:** 打开 Mobile Sheet，展开「更多工具」，访问创作台/对比/资料库。  
**Expected:** 与桌面同一 `AppNav` 结构；次级入口可达且不抢双书 CTA。  
**Why human:** 折叠与触摸体验需实机确认。

### Gaps Summary

无代码级 BLOCKER。实现与 PLAN `must_haves`、IA-02/IA-03 及双书主路径接线一致；`npm test` 全绿。  
状态为 **human_needed**：ROADMAP 两条认知/感知成功标准（30 秒理解、噪音显著降低）无法仅凭静态分析闭合。完成上述人工项后，若无回归，可将 status 更新为 `passed`。

---

_Verified: 2026-05-26T19:10:00Z_  
_Verifier: Claude (gsd-verifier)_
