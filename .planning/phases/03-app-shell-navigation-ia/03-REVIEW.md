---
phase: 03-app-shell-navigation-ia
reviewed: 2026-05-26T20:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - src/lib/shell/shell-title.ts
  - src/components/contextual-shell-title.tsx
  - src/components/sidebar.tsx
  - src/components/mobile-nav.tsx
  - src/app/(app)/layout.tsx
  - src/app/(app)/sessions/page.tsx
  - src/app/(app)/sessions/[id]/page.tsx
  - src/app/(app)/sessions/[id]/workbench/workbench-client.tsx
  - src/components/ui/collapsible.tsx
  - src/components/app-nav.tsx
  - src/components/create/task-mode-page.tsx
  - src/app/(app)/upload/page.tsx
findings:
  critical: 3
  warning: 2
  info: 1
  total: 6
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-05-26T20:00:00Z  
**Depth:** standard  
**Files Reviewed:** 12  
**Status:** issues_found

## Summary

Phase 03 实现了双书优先壳层、Collapsible「更多工具」IA，以及 dual session 默认跳转 workbench（`view=overview` 绕过）。Shell CTA、`/upload?mode=dual` 链路与 AppNav 两层结构整体一致，重定向目标均为应用内固定路径，未发现开放重定向或硬编码密钥。

主要风险集中在 **dual 默认重定向契约未在所有「回到概览/体检」链路上统一追加 `?view=overview`**：部分链接仍指向 `/sessions/[id]`，服务端会再次 `redirect` 到 workbench，导致概览页、导入体检与模块导航「概览」入口不可达或行为与文案不符。`workbench-client.tsx` 中「项目概览」已正确使用 query，但同文件「查看体检问题」及项目模块导航、overview 下一步 CTA 仍缺失。

## Critical Issues

### CR-01: 工作台「查看体检问题」未带 overview 绕过，无法到达概览体检

**File:** `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx:688-692`  
**Issue:** `uploadSummary.hasBlocked` 时按钮文案为「查看体检问题」，但 `href` 为 `/sessions/${id}`（无 `view=overview`）。对 dual session，`page.tsx` 会在 `view !== "overview"` 时 `redirect` 到 workbench，用户无法进入带 `ImportHealthPanel` 的 `ProjectOverviewPage`。  
**Fix:**

```tsx
<Link href={`/sessions/${props.session.id}?view=overview`}>
  {uploadSummary.actionLabel}
</Link>
```

### CR-02: 项目模块导航「概览」在 dual 默认重定向下失效

**File:** `src/components/projects/project-module-nav.tsx:6`（由 phase 03 重定向契约触发；该文件未改但行为回归）  
**Issue:** `概览` 链接为 `/sessions/${sessionId}`。Phase 03 后 dual 访问该路径会立即重定向到 workbench；从工作台或其它模块点击「概览」无法稳定停留在项目概览页。在已带 `?view=overview` 的概览页上点击「概览」还会去掉 query 并再次被重定向。  
**Fix:**

```tsx
{ key: "概览", href: (sessionId: string) => `/sessions/${sessionId}?view=overview` },
```

### CR-03: 概览「查看项目体检」下一步链回 workbench 而非概览

**File:** `src/lib/projects/overview.ts:87-90`（由 phase 03 重定向契约触发）  
**Issue:** `readyBookCount < 2` 时 `nextAction` 为「查看项目体检」，`href` 为 `/sessions/${sessionId}`。用户已在概览上下文时期望查看体检，点击后丢失 `view=overview` 并被重定向到 workbench。  
**Fix:**

```ts
href: `/sessions/${input.sessionId}?view=overview`,
```

## Warnings

### WR-01: 未知路径的壳层标题默认为「工作台」

**File:** `src/lib/shell/shell-title.ts:29`  
**Issue:** 未匹配任何前缀时 `resolveShellTitle` 返回「工作台」。若未来增加非 workbench 路由（如 `/design-system`），页眉会显示错误语境。  
**Fix:** 将默认改为中性文案（如「NovelFusion」或「应用」），或增加显式 fallback 映射表项。

### WR-02: legacy query 重定向优先于 `view=overview` 检查

**File:** `src/app/(app)/sessions/[id]/page.tsx:59-67`  
**Issue:** `getDualWorkbenchRedirect` 在 `view !== "overview"` 判断之前执行。若同时出现 `view=overview` 与已识别的 legacy `step`/`panel`（例如书签旧链接），会进入 workbench 而非概览。边界场景，但会破坏「概览优先」语义。  
**Fix:** 在 legacy 分支前增加：`if (query.view === "overview")` 则跳过 `getDualWorkbenchRedirect` 的 redirect（或合并判断顺序）。

## Info

### IN-01: `APP_NAV_ITEMS` 导出未见消费方

**File:** `src/components/app-nav.tsx:44-48`  
**Issue:** 导出 `APP_NAV_ITEMS` 作为 IA SSOT，但仓库内仅 `PRIMARY_NAV_ITEM` / `SECONDARY_NAV_ITEMS` 被 `AppNav` 使用，存在 dead export。  
**Fix:** 删除未使用导出，或在测试/文档中引用以保持 SSOT 单一来源。

---

_Reviewed: 2026-05-26T20:00:00Z_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_
