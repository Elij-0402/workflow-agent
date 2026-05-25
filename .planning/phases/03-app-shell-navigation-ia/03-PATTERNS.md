# Phase 3: 应用壳与导航 IA - Pattern Map

**Mapped:** 2026-05-26
**Files analyzed:** 12
**Analogs found:** 11 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/app-nav.tsx` | component | event-driven | `src/components/app-nav.tsx` (refactor in place) | exact |
| `src/components/sidebar.tsx` | component | request-response | `src/components/mobile-nav.tsx` | exact |
| `src/components/mobile-nav.tsx` | component | request-response | `src/components/sidebar.tsx` | exact |
| `src/components/contextual-shell-title.tsx` | component | event-driven | `src/components/app-nav.tsx` + `(app)/layout.tsx` header | role-match |
| `src/components/ui/collapsible.tsx` | component (ui primitive) | event-driven | `src/components/ui/sheet.tsx` | role-match |
| `src/app/(app)/layout.tsx` | route/layout | request-response | `src/app/(app)/layout.tsx` | exact |
| `src/app/(app)/sessions/page.tsx` | route/page | request-response | `src/app/(app)/sessions/page.tsx` + `task-mode-page.tsx` CTAs | exact |
| `src/app/(app)/sessions/[id]/page.tsx` | route/page | request-response (redirect) | `src/app/(app)/sessions/[id]/page.tsx` | exact |
| `src/app/(app)/create/page.tsx` | route/page | request-response | `src/app/(app)/create/page.tsx` | exact |
| `src/components/create/task-mode-page.tsx` | component | request-response | `src/components/create/task-mode-page.tsx` + `hint-banner.tsx` | exact |
| `src/app/(app)/upload/page.tsx` | route/page | request-response | `src/app/(app)/upload/page.tsx` | exact |
| `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx` | component (client) | request-response | `workbench-client.tsx` PageHeader actions | exact |

## Pattern Assignments

### `src/components/app-nav.tsx` (component, event-driven)

**Analog:** `src/components/app-nav.tsx` (current implementation — refactor, do not duplicate nav arrays elsewhere)

**Imports pattern** (lines 1-13):

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderKanban,
  GitCompare,
  LibraryBig,
  Settings,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
```

**Nav item + footer split** (lines 21-32, 52-61):

```typescript
const NAV_ITEMS: NavItem[] = [
  { href: "/sessions", label: "项目", icon: FolderKanban },
  // ... secondary moves into Collapsible per D-02
];

const FOOTER_ITEMS: NavItem[] = [
  { href: "/settings", label: "设置", icon: Settings },
];

export const APP_NAV_ITEMS: NavItem[] = [...NAV_ITEMS, ...FOOTER_ITEMS];
```

**Active state + left 2px bar** (lines 76-99) — keep bar; fix icon color per D-05:

```typescript
const active =
  pathname === href ||
  pathname.startsWith(`${href}/`) ||
  (href === "/sessions" && pathname === "/");
// ...
<span
  className={cn(
    "absolute bottom-2 left-0 top-2 w-[2px] transition-all",
    active ? "bg-primary" : "bg-transparent group-hover:bg-primary/30",
  )}
/>
```

**Icon color fix** (replace lines 105-107 — violation today):

```typescript
<Icon
  className={cn(
    "h-4 w-4 shrink-0 transition-colors",
    active
      ? "text-foreground"
      : "text-muted-foreground/70 group-hover:text-foreground",
  )}
/>
```

**Typography migration** (line 111): replace `text-[13px]` with `type-body` on label span (D-22).

**Collapsible secondary group** — no in-repo analog yet; compose after adding `ui/collapsible.tsx` (see below). Mirror `MobileNav` `onNavigate` callback on every `Link` inside secondary rows.

**Secondary NavLink variant** — new `variant: "primary" | "secondary"` on internal `NavLink`: secondary uses `pl-4`, `text-muted-foreground`, no primary on icons (D-02, D-16).

---

### `src/components/sidebar.tsx` (component, request-response)

**Analog:** `src/components/mobile-nav.tsx` (CTA stack + `AppNav` embedding)

**Shell structure** (lines 9-48):

```typescript
export function Sidebar() {
  return (
    <aside className="hidden w-[264px] shrink-0 flex-col border-r border-border/80 bg-card/70 backdrop-blur md:flex">
      <Link href="/sessions" className="group relative flex h-20 items-center ...">
        {/* logo — D-19: subtitle → type-caption, copy 「双书蓝图工作台」 */}
      </Link>
      <div className="px-5 pt-5">
        {/* D-06 primary + D-07 secondary — copy mobile-nav Button stack */}
      </div>
      {/* D-18: DELETE surface-subtle「当前主线」block (lines 37-44) */}
      <div className="flex-1 px-3 py-5">
        <AppNav />
      </div>
    </aside>
  );
}
```

**Primary CTA pattern** — from `mobile-nav.tsx` (lines 42-52), retarget href/copy:

```typescript
<Button asChild className="h-10 w-full justify-center gap-2">
  <Link href="/upload?mode=dual">
    <Plus className="h-4 w-4" aria-hidden />
    新建双书项目
  </Link>
</Button>
```

**Secondary CTA** — from `task-mode-page.tsx` (lines 83-89):

```typescript
<Button asChild variant="outline" className="mt-3 h-10 w-full justify-center">
  <Link href="/upload?mode=single">单书项目</Link>
</Button>
```

**Remove** lines 37-44 `surface-subtle` panel entirely (D-18).

---

### `src/components/mobile-nav.tsx` (component, request-response)

**Analog:** `src/components/sidebar.tsx` + existing `Sheet` usage

**Sheet + controlled open** (lines 18-22, 56):

```typescript
export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* ... */}
      <AppNav onNavigate={() => setOpen(false)} />
```

**CTA parity** (lines 42-52): mirror sidebar dual stack; change `/create` → `/upload?mode=dual` + outline single link; `onClick={() => setOpen(false)}` on both links.

**Do not** duplicate `NAV_ITEMS` here — import only `AppNav` (D-04).

---

### `src/components/contextual-shell-title.tsx` (component, event-driven) — NEW

**Analog:** `src/components/app-nav.tsx` (`usePathname`) + `(app)/layout.tsx` header eyebrow (lines 32-37)

**Client module skeleton** (copy from `app-nav.tsx`):

```typescript
"use client";

import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
```

**Pathname → title** — replace static header copy in `layout.tsx`:

```typescript
// layout.tsx lines 32-37 (today — remove after extraction)
<div className="hidden text-right md:block">
  <p className="mono-label-sm">工作台</p>
  <p className="text-[12px] text-muted-foreground">
    项目优先 · 中文界面
  </p>
</div>
```

**New pattern** — map prefixes (D-20); use `type-mono-label` + `type-caption` from `globals.css` (lines 147-154):

```typescript
export function ContextualShellTitle() {
  const pathname = usePathname();
  const title = resolveShellTitle(pathname);
  const showSessionsHint =
    pathname === "/sessions" || pathname === "/";

  return (
    <div className="hidden text-right md:block">
      <p className="type-mono-label">{title}</p>
      {showSessionsHint ? (
        <p className="type-caption mt-0.5">
          下一步：打开项目或新建双书
        </p>
      ) : null}
    </div>
  );
}
```

**Reference typography usage:** `src/app/(app)/design-system/design-system-client.tsx` (lines 304-308).

---

### `src/components/ui/collapsible.tsx` (ui primitive) — NEW via shadcn

**Analog:** `src/components/ui/sheet.tsx` (Radix + `cn` + forwardRef pattern)

**Install** (do not hand-roll):

```bash
npx shadcn@latest add collapsible
```

**Radix wrapper pattern** (from `sheet.tsx` lines 1-10):

```typescript
"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
```

**Usage in `AppNav`** — controlled state, default closed (D-15); no localStorage (contrast `use-tab-state.ts` which persists — do not use for collapsible v1).

---

### `src/app/(app)/layout.tsx` (route/layout, request-response)

**Analog:** `src/app/(app)/layout.tsx`

**Auth gate + redirect** (lines 14-16):

```typescript
const { user } = await safeGetUser(supabase, "app-layout");
if (!user) redirect("/login");
```

**Shell grid composition** (lines 26-44):

```typescript
<div className="app-shell-grid min-h-screen">
  <Sidebar />
  <div className="flex min-w-0 flex-1 flex-col">
    <header className="sticky top-0 z-30 flex h-16 items-center ...">
      <MobileNav />
      <div className="ml-auto flex items-center gap-3">
        <ContextualShellTitle />
        <UserMenu email={user.email ?? "anonymous"} />
      </div>
    </header>
    <main id="main-content" ...>{children}</main>
  </div>
</div>
```

Import `ContextualShellTitle` as client child inside server layout (same pattern as `MobileNav` / `Sidebar`).

---

### `src/app/(app)/sessions/page.tsx` (route/page, request-response)

**Analog:** `src/app/(app)/sessions/page.tsx` + `src/components/create/task-mode-page.tsx`

**PageHeader + primary CTA** (lines 27-35) — retarget only `action` and empty state:

```typescript
<PageHeader
  label="项目总览"
  title="把创作流水线放到台面上"
  description="..."
  action={
    <Button asChild>
      <Link href="/upload?mode=dual">新建双书项目</Link>
    </Button>
  }
/>
```

**Empty state dual CTA** (lines 114-122):

```typescript
<Button asChild>
  <Link href="/upload?mode=dual">新建双书项目</Link>
</Button>
<Button asChild variant="outline">
  <Link href="/upload?mode=single">进入单书兼容流程</Link>
</Button>
```

**Keep** `LinkCard` grid (lines 64-78) — already aligned with D-06/D-07 paths.

---

### `src/app/(app)/sessions/[id]/page.tsx` (route/page, request-response / redirect)

**Analog:** same file + `src/app/(app)/dashboard/page.tsx` (minimal redirect)

**Existing dual branch + legacy redirect** (lines 58-62):

```typescript
if (sessionMode?.mode === "dual") {
  const legacyTarget = getDualWorkbenchRedirect(query);
  if (legacyTarget) {
    redirect(`/sessions/${id}/workbench${legacyTarget}`);
  }
  // D-10: add unconditional redirect here BEFORE loadDualSessionPageData / ProjectOverviewPage
  redirect(`/sessions/${id}/workbench`);
}
```

**Legacy helper** — keep unchanged (lines 233-248):

```typescript
function getDualWorkbenchRedirect(query: { step?: string; panel?: string }) {
  if (query.panel === "results") return "?step=generate";
  if (
    query.step === "upload" ||
    query.step === "analysis" ||
    query.step === "compare" ||
    query.step === "generate"
  ) {
    return `?step=${query.step}`;
  }
  return null;
}
```

**Single mode** — leave lines 94+ path intact (D-12).

**List clicks** — do not change `deriveSessionDashboard` / `ProjectCard`; already sets `nextHref` to workbench for dual (`src/lib/sessions/dashboard.ts` lines 69-77).

---

### `src/app/(app)/create/page.tsx` (route/page, request-response)

**Analog:** `src/app/(app)/create/page.tsx` (thin RSC wrapper)

```typescript
import { TaskModePage } from "@/components/create/task-mode-page";

export default function CreateTaskPage() {
  return <TaskModePage />;
}
```

D-24 strip can live in `TaskModePage` or a small wrapper component imported here — prefer extending `TaskModePage` to avoid extra route files.

---

### `src/components/create/task-mode-page.tsx` (component, request-response)

**Analog:** `src/components/create/task-mode-page.tsx` + `src/components/workbench/hint-banner.tsx`

**Compatibility strip** (D-24) — insert above grid, after `PageHeader`:

```typescript
<section className="surface-subtle p-5">
  <p className="type-mono-label">推荐主路径</p>
  <p className="type-body mt-2">
    双书项目请从「新建双书项目」进入参考书导入与工作台。
  </p>
  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
    <Button asChild>
      <Link href="/upload?mode=dual">新建双书项目</Link>
    </Button>
    <p className="type-caption">
      当前页为任务模式选择（高级/兼容入口）。
    </p>
  </div>
</section>
```

**Existing dual primary** (lines 54-58) — already points at `/upload?mode=dual`; align copy with D-06 verb.

**Hint banner minimal pattern** (`hint-banner.tsx` lines 6-13):

```typescript
<div className="surface-subtle flex items-center px-4 py-2" role="status" aria-live="polite">
  <p className="type-caption">{/* message */}</p>
</div>
```

---

### `src/app/(app)/upload/page.tsx` (route/page, request-response)

**Analog:** `src/app/(app)/upload/page.tsx`

**PageHeader copy only** (lines 34-49) — D-25; do **not** change `resolveUploadRoute` / selector redirect (lines 23-27):

```typescript
if (route.kind === "selector") {
  redirect("/create");
}
```

Align dual `title` / `description` verbs with「新建双书项目」/「参考书」; keep `showDual` branch structure.

---

### `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx` (component, request-response)

**Analog:** `workbench-client.tsx` PageHeader `action` (lines 633-647)

**D-11 项目概览 link** — add ghost/sm button beside or instead of contextual back when on workbench:

```typescript
action={
  <div className="flex flex-wrap gap-2">
    <Button asChild variant="ghost" size="sm">
      <Link href={`/sessions/${props.session.id}`}>项目概览</Link>
    </Button>
    <Button asChild variant="outline" size="sm">
      <Link href="/sessions">返回任务列表</Link>
    </Button>
  </div>
}
```

**Existing session deep link** (lines 681-685) — same `Link href={\`/sessions/${props.session.id}\`}` pattern for upload-blocked state.

---

## Shared Patterns

### Client shell components (`"use client"`)

**Source:** `app-nav.tsx`, `sidebar.tsx`, `mobile-nav.tsx`, `mobile-nav.tsx` Sheet  
**Apply to:** All new/modified shell components including `contextual-shell-title.tsx`

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
```

### Primary / outline CTA stack

**Source:** `sidebar.tsx` (29-34) + `task-mode-page.tsx` (83-89)  
**Apply to:** `sidebar.tsx`, `mobile-nav.tsx`, `sessions/page.tsx` empty state + PageHeader

```typescript
<Button asChild className="h-10 w-full justify-center gap-2">
  <Link href="/upload?mode=dual">新建双书项目</Link>
</Button>
<Button asChild variant="outline" className="...">
  <Link href="/upload?mode=single">单书项目</Link>
</Button>
```

### Server `redirect()` in RSC pages

**Source:** `(app)/layout.tsx` (16), `sessions/[id]/page.tsx` (61), `dashboard/page.tsx` (4)  
**Apply to:** Dual default landing only — fixed paths, never user-controlled target

```typescript
import { notFound, redirect } from "next/navigation";
// after auth + mode check:
redirect(`/sessions/${id}/workbench`);
```

### Typography utilities (Phase 2 UI-SPEC)

**Source:** `src/app/globals.css` (lines 143-154)  
**Apply to:** All shell copy changes — no new `text-[Npx]` in nav/sidebar/header

```css
.type-body { @apply text-sm text-foreground; }
.type-caption { @apply text-xs text-muted-foreground; }
.type-mono-label { /* mono uppercase label */ }
```

### `PageHeader` composition

**Source:** `src/components/page-header.tsx`  
**Apply to:** `sessions/page.tsx`, `upload/page.tsx`, `workbench-client.tsx` (actions only)

```typescript
<PageHeader
  label="..."
  title="..."
  description="..."
  action={<Button asChild>...</Button>}
/>
```

### Nav IA single source

**Source:** `app-nav.tsx` exports  
**Apply to:** Desktop + mobile — **never** fork nav arrays in `mobile-nav.tsx`

```typescript
export const APP_NAV_ITEMS: NavItem[] = [...];
export function AppNav({ onNavigate, className }: AppNavProps) { ... }
```

### List row navigation (no change in Phase 3)

**Source:** `src/components/sessions/project-card.tsx` (line 50), `src/lib/sessions/dashboard.ts` (`nextHref`)  
**Apply to:** Verify regression only after redirect change

```typescript
const href = session.nextHref || `/sessions/${session.id}`;
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/components/ui/collapsible.tsx` | ui primitive | event-driven | Not in repo yet — generate via `npx shadcn@latest add collapsible`; follow `sheet.tsx` Radix wrapper conventions after install |

*Note: After CLI install, collapsible has a shadcn canonical analog; until then, planner should treat RESEARCH.md Pattern 1 + shadcn docs as source of truth.*

---

## Metadata

**Analog search scope:** `src/components/` (app-nav, sidebar, mobile-nav, page-header, create/, workbench/), `src/app/(app)/` (layout, sessions, create, upload, dashboard), `src/components/ui/`, `src/lib/sessions/dashboard.ts`, `src/app/globals.css`, `design-system-client.tsx`  
**Files scanned:** ~18  
**Pattern extraction date:** 2026-05-26

## PATTERN MAPPING COMPLETE

**Phase:** 3 - 应用壳与导航 IA  
**Files classified:** 12  
**Analogs found:** 11 / 12

### Coverage
- Files with exact analog: 9
- Files with role-match analog: 2 (`contextual-shell-title.tsx`, `ui/collapsible.tsx` pre-install)
- Files with no analog: 0 (collapsible resolved by shadcn CLI + sheet pattern)

### Key Patterns Identified
- Shell CTAs use `Button asChild` + `Link`; primary → `/upload?mode=dual`, secondary outline → `/upload?mode=single`.
- Nav IA lives only in `app-nav.tsx`; active row uses 2px `bg-primary` bar; icons must not use `text-primary` when inactive.
- Dual default landing extends existing `getDualWorkbenchRedirect` then `redirect()` to workbench; list routing stays in `deriveSessionDashboard`.
- Header context is a small `usePathname` client component with `type-mono-label` / `type-caption`; server `layout.tsx` composes it like `MobileNav`.
- Secondary nav uses new shadcn `Collapsible` with `useState(false)` and no localStorage (unlike `use-tab-state.ts`).

### File Created
`.planning/phases/03-app-shell-navigation-ia/03-PATTERNS.md`

### Ready for Planning
Pattern mapping complete. Planner can now reference analog patterns in PLAN.md files.
