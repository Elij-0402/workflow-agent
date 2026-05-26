# Phase 4: 核心界面密度重构 - Pattern Map

**Mapped:** 2026-05-26
**Files analyzed:** 11
**Analogs found:** 10 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx` | component (client) | request-response | `workbench-client.tsx` (refactor in place) | exact |
| `src/components/workbench/pipeline-bar.tsx` | component | transform | `pipeline-bar.tsx` + `derive-hint.ts` glyph semantics | exact |
| `workbench-client.tsx` → `AnalysisCapabilityPanel` | component (inline) | request-response | `src/components/app-nav.tsx` Collapsible + `hint-banner.tsx` | role-match |
| `src/app/(app)/sessions/[id]/analysis-accordion-panel.tsx` | component | CRUD / event-driven | `analysis-accordion-panel.tsx` + `AnalysisCapabilityPanel` collapse | exact |
| `src/app/(app)/sessions/SessionsClient.tsx` | component | request-response | `SessionsClient.tsx` + `app-nav.tsx` Collapsible | exact |
| `src/app/(app)/sessions/page.tsx` | route/page | request-response | `sessions/page.tsx` + `hint-banner.tsx` | exact |
| `src/app/(app)/sessions/[id]/workbench/loading.tsx` | route/loading | request-response | `workbench/loading.tsx` + `page-loading-shell.tsx` | exact |
| `src/components/workbench/hint-banner.tsx` | component | event-driven | `hint-banner.tsx` + Phase 3 `03-PATTERNS.md` | exact |
| `src/components/workbench/blueprint-editor.tsx` | component | CRUD | `blueprint-editor.tsx` confirm CTA | exact |
| `src/components/sessions/project-card.tsx` | component | request-response | `project-card.tsx` + `dashboard.ts` | exact |
| `src/components/projects/project-overview-page.tsx` | component | request-response | `project-overview-page.tsx` + workbench PageHeader CTAs | exact |

## Pattern Assignments

### `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx` (component, request-response)

**Analog:** `workbench-client.tsx` (in-place density refactor; preserve `FlowStep`, APIs, redirects)

**Imports / composition** (lines 1-50, 657-662):

```typescript
"use client";

import { PageHeader } from "@/components/page-header";
import { WorkflowStageBar } from "@/components/workflow-stage-bar";
import { BatchTracker } from "@/components/workbench/batch-tracker";
import { BlueprintEditor } from "@/components/workbench/blueprint-editor";
import { HintBanner } from "@/components/workbench/hint-banner";
import { PipelineBar } from "@/components/workbench/pipeline-bar";
import { deriveHint } from "@/lib/workbench/derive-hint";
```

**PageHeader + 概览链（Phase 3 已落地，本阶段仅抛光）** (lines 633-654):

```typescript
<PageHeader
  label="任务"
  title={props.session.name}
  description={/* dual-book copy */}
  action={
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/sessions/${props.session.id}?view=overview`}>
          项目概览
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href="/sessions">返回任务列表</Link>
      </Button>
    </div>
  }
/>
```

**Step shell — 收敛为 `space-y-10` + 单层 footer action bar** (lines 706-747, 750-815):

- 每步 `section` 外层：`className="space-y-10"`（替换多处 `space-y-5`；对齐 D-17 / 02-UI-SPEC）。
- 分析步：保留 `PipelineBar`（若分析步也展示进度，可置于 `StepIntro` 下）、`HintBanner`、`BatchTracker`、`analysisGrid`；**单一**底部 `surface-panel` footer（lines 734-746）承载主 CTA「前往对比」；批量主按钮留在 `analysisGrid` 内，勿再叠第二层全宽 panel。
- 对比步：**删除** `min-h-[680px]` 包裹（line 772），改为 `flex min-h-0 flex-1 flex-col` 容器；`BlueprintEditor` 已带 `min-h-0 flex-1`（见 blueprint-editor analog）。
- 生成步：主 CTA 在 panel 内 `Button`（lines 847-853）；装饰性 `text-primary` caption（856-858）→ `type-caption text-muted-foreground` 或 `text-warning`/`text-info` token。

**StepIntro — 动作导向单行标题（D-05）** (lines 1006-1022):

```typescript
function StepIntro({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-2">
      <h2 className="type-title">{/* 例：「拆解章节」非「第 2 步 · …」 */}</h2>
      <p className="type-body max-w-3xl text-muted-foreground">{description}</p>
    </div>
  );
}
```

迁移：`text-[22px]` → `type-title`；`text-[13px]` → `type-body`；标题 copy 见 CONTEXT D-05 示例。

**AnalysisCapabilityPanel → Collapsible 默认关闭（D-02）** — 见下方独立 assignment；调用处 (712-715) 改为 Collapsible 包裹，**默认 `open={false}`**，勿用 `useState` 默认 true。

**Compare footer vs BlueprintEditor** (800-814): footer 只保留「前往生成」；「确认蓝图」仅在 `BlueprintEditor` 顶栏（D-12），避免重复说明。

**EmptySlot 步骤编号** (1296-1324): 保留 `surface-panel` + 居中 + 主 `Button asChild`；字号迁移到 `type-title` / `type-body`；图标 `text-primary/60` → `text-muted-foreground`（D-15）。

**CollapsedChaptersBar** (1327-1367): 保持 `surface-panel` 可点击条；`text-primary` on「回看分析 →」→ `text-muted-foreground` 或 `group-hover:text-foreground`（非 Button 不用 primary）。

---

### `AnalysisCapabilityPanel` (inline in `workbench-client.tsx`) (component, request-response)

**Analog:** `src/components/app-nav.tsx` Collapsible (lines 68-96) + collapsed summary from `hint-banner.tsx`

**Phase 3 Collapsible — controlled, default closed** (`app-nav.tsx`):

```typescript
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const [moreOpen, setMoreOpen] = useState(false);

<Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
  <CollapsibleTrigger className="group flex w-full ...">
    <ChevronRight className={cn("h-4 w-4 ...", moreOpen && "rotate-90")} />
    <span className="type-mono-label truncate">更多工具</span>
  </CollapsibleTrigger>
  <CollapsibleContent className="flex flex-col gap-0.5 pl-4">
    {/* secondary content */}
  </CollapsibleContent>
</Collapsible>
```

**Target refactor** (replace lines 1025-1124):

- 折叠态首屏：仅 `eyebrow-label` + `type-title` 一行摘要 + `type-caption`（`guide.shortSummary`）；**禁止** 默认展示 `lg:grid-cols-3` 三列 `InfoListCard`。
- 展开态：`CollapsibleContent` 内 **单列** `space-y-4` 堆叠 `InfoListCard` / 流程说明（D-02：禁止 3 列 12px 密集格）。
- 删除手写 `expanded` + `Button onClick={onToggle}`；用 `useState(false)` + Radix Collapsible。
- `StageLine` / `InfoListCard` 内 `text-primary/80` → `text-muted-foreground` 或 `font-mono type-caption`（D-15、D-18）。

**Collapsed hint copy** (`hint-banner.tsx` lines 6-13):

```typescript
<div className="surface-subtle flex items-center px-4 py-2" role="status" aria-live="polite">
  <p className="type-caption">{hint.text}</p>
</div>
```

---

### `src/components/workbench/pipeline-bar.tsx` (component, transform)

**Analog:** `pipeline-bar.tsx` + semantic colors from `globals.css` (`text-flash`, `text-info`)

**Core step glyph loop** (lines 22-56):

```typescript
const steps = [
  { no: "1", label: "分析素材", done: analysisDone },
  { no: "2", label: "编辑蓝图", done: blueprintConfirmed },
  { no: "3", label: "生成变体", done: hasVariants },
];
// ...
const glyphColor = s.done
  ? "text-flash"
  : isCurrent
    ? "text-foreground"  // was text-primary — D-15/D-18
    : "text-muted-foreground/55";
// separator: text-muted-foreground/40 — not text-primary/30
```

**Typography** (line 31): `text-[12px]` → `type-caption` on container; step labels use `type-caption` + `text-foreground` / `text-muted-foreground`.

---

### `src/app/(app)/sessions/[id]/analysis-accordion-panel.tsx` (component, CRUD)

**Analog:** Same file (dimension rows) + workbench `AnalysisCapabilityPanel` density rules

**Per-dimension row expand** (lines 388-410) — keep `Button variant="ghost"` 展开/收起；迁移标题 `text-[15px]` → `type-body font-medium`；状态 `text-primary animate-pulse` → `text-info` 或 `text-foreground` + pulse（D-15）。

**Legacy panel header** (lines 285-323): 主 CTA「一键分析三项」保持 `Button` default；装饰性 `text-[12px] text-primary` hints (297-301) → `type-caption text-warning` 或 `text-muted-foreground`.

**Extended panel** (507-518): 删除重复 display 标题或收成 `type-title` 单行；`text-primary/85` token labels → `type-caption text-muted-foreground`.

*Note:* 双书 workbench 主路径不渲染此文件；本 phase 若触及，以 typography/token 迁移为主，不改 API。

---

### `src/app/(app)/sessions/SessionsClient.tsx` (component, request-response)

**Analog:** `SessionsClient.tsx` + `app-nav.tsx` Collapsible for single-book section (D-09)

**Layout — 去掉右侧双 panel，列表全宽** (lines 134-280):

- 删除 `xl:grid-cols-[1.55fr_.85fr]` 与整个 `<aside>`（lines 234-279「动态」「本页规则」）— D-10。
- 主列 `space-y-10`；双书 `SessionSection` 保持；单书区包在 Collapsible：

```typescript
<Collapsible defaultOpen={false}>
  <CollapsibleTrigger className="flex w-full items-center gap-2 ...">
    <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
    <span className="type-title">单书兼容项目</span>
    <span className="type-caption text-muted-foreground">({grouped.single.length})</span>
  </CollapsibleTrigger>
  <CollapsibleContent>
    <SessionSection title="单书兼容" subdued ... />
  </CollapsibleContent>
</Collapsible>
```

**SessionSection header** (315-327): `text-[18px]` → `type-title`；description → `type-body text-muted-foreground`.

**Bulk selection bar** (142-199): 保留 `surface-panel`；`text-[13px]` → `type-body`.

**List cards:** 继续 `ProjectCard` + `deriveSessionDashboard`（不 fork `nextHref`）。

**情境 hint（替代侧栏规则）** — 在 `SessionsClient` 顶部或 `page.tsx` 一次：

```typescript
<div className="surface-subtle px-4 py-2" role="status">
  <p className="type-caption">优先处理待确认蓝图与可生成项目；卡片上的「下一步」即推荐动作。</p>
</div>
```

---

### `src/app/(app)/sessions/page.tsx` (route/page, request-response)

**Analog:** `sessions/page.tsx` + merged hero pattern from `task-mode-page.tsx` (`03-PATTERNS.md`)

**Merge 主状态 + 快速入口（D-07）** — 替换 lines 38-81 双列双 `surface-panel`:

```typescript
<section className="space-y-10">
  <div className="surface-panel p-6 space-y-6">
    <div>
      <p className="eyebrow-label">项目总览</p>
      <h2 className="type-display mt-3">{summary?.activeProjectCount ?? 0} 个项目正在推进</h2>
      <p className="type-body mt-3 max-w-2xl text-muted-foreground">...</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      <LinkCard href="/upload?mode=dual" ... />
      <LinkCard href="/upload?mode=single" ... />
      <LinkCard href="/library" ... />
    </div>
  </div>
</section>
```

**Metrics — 默认折叠或一行 caption（D-08）** (lines 83-100):

- 优先 `Collapsible` + `type-caption` 行内统计：`活跃 N · 待确认蓝图 M · …`；
- 或保留 4 卡但包在 `Collapsible defaultOpen={false}`；
- **删除** `FolderKanban className="text-primary"` (line 61) 类装饰图标 primary。

**MetricCard / LinkCard typography** (130-160): `text-[28px]` → `type-display`；`text-[14px]`/`text-[12px]` → `type-body` / `type-caption`.

**PageHeader** (27-35): 保持不变（Phase 3 CTA 已对齐 `/upload?mode=dual`）。

---

### `src/app/(app)/sessions/[id]/workbench/loading.tsx` (route/loading)

**Analog:** `loading.tsx` + `page-loading-shell.tsx` (D-14 batch analysis skeleton)

**Current** (lines 1-5):

```typescript
import { PageLoadingShell } from "@/components/page-loading-shell";

export default function WorkbenchLoading() {
  return <PageLoadingShell cards={2} titleWidth="w-64" />;
}
```

**Enhancement:** 对齐 workbench 布局 — `cards={1}` + 宽 footer skeleton 或 `SkeletonList rows={2}` 模拟 `BatchTracker`；勿阻塞 RSC 数据路径。

---

### `src/components/workbench/hint-banner.tsx` (component)

**Analog:** `hint-banner.tsx` + `03-PATTERNS.md` HintBanner minimal pattern

**Token fix (D-15)** (lines 6-14):

```typescript
<p className="type-caption text-muted-foreground">{hint.text}</p>
```

移除 `text-primary/90`；文案 SSOT 仍来自 `deriveHint`.

---

### `src/components/workbench/blueprint-editor.tsx` (component, CRUD)

**Analog:** `blueprint-editor.tsx` confirm + generate CTAs (D-12, D-13)

**Confirm blueprint** (lines 115-134, 201-204):

```typescript
async function confirm() {
  const ready = blueprintReadyToConfirm(bp);
  if (!ready.ok) {
    toast.error(`蓝图缺少：${ready.missing.join(", ")}`);
    return;
  }
  // POST /api/blueprint/confirm
}

<Button
  size="sm"
  variant="default"
  disabled={!blueprintReadyToConfirm(bp).ok}
  onClick={() => void confirm()}
>
  确认蓝图
</Button>
```

- 文案锁定「确认蓝图」；`variant="default"` 仅 ready；否则 `disabled` + adjacent `type-caption` 列出 missing（workbench footer 不再重复）。
- **生成新版本** (196-199): 文案统一；`status === "confirmed"` 才显示；与 `GenerateDrawer` 阻断 toast 共用 copy（D-13）。

**Status badge** (184-189): `text-primary/85` draft → `text-muted-foreground`；confirmed 保持 `text-flash`.

---

### `src/components/sessions/project-card.tsx` (component, request-response)

**Analog:** `project-card.tsx` + `src/lib/sessions/dashboard.ts` (`nextHref`, `stageLabel`)

**Navigation** (line 50):

```typescript
const href = session.nextHref || `/sessions/${session.id}`;
```

**一眼可读（D-09）** — 压缩「下一步」块 (111-119):

```typescript
<p className="type-caption">下一步</p>
<p className="type-body font-medium">{session.nextActionLabel}</p>
<p className="type-caption">{session.lastActivityLabel}</p>
```

**Decorative primary removal (D-15)** (69-73, 148-150):

- `modeTone === "primary"` on `mono-label-sm` → 用 `text-foreground` + border accent，不用 `text-primary` 装饰；
- `StagePill` primary variant：边框 `border-border` + `text-foreground`，语义状态用 `text-flash` / `text-info` / `text-locked`（若 stage 映射）。

**Dual card emphasis** (57-59): 保留 `border-primary/25 bg-primary/5` 作为双书唯一 primary 面（可点击区仍是 Link + Button primary  elsewhere）。

---

### `src/components/projects/project-overview-page.tsx` (component, request-response)

**Analog:** `project-overview-page.tsx` + workbench CTA verbs (D-11)

**Panel budget ≤2:** 合并 lines 48-68 右侧双 panel 为单一「下一步」`surface-panel`；`EditorialRecommendationPanel` 可折叠或降为 caption 列表。

**Primary CTA** (60-65) — 改用 shadcn `Button asChild` + `Link`，与 workbench 一致：

```typescript
<Button asChild>
  <Link href={overview.nextAction.href}>{overview.nextAction.label}</Link>
</Button>
```

Labels from `deriveProjectOverview`: 「进入工作台」「确认蓝图」等 — 对齐 D-11/D-12。

**Typography:** `text-[20px]`/`text-[13px]` → `type-title` / `type-body` / `type-caption` throughout.

---

## Shared Patterns

### Collapsible (Phase 3 — default closed, no localStorage)

**Source:** `src/components/app-nav.tsx` (lines 55-96), `src/components/ui/collapsible.tsx`  
**Apply to:** `AnalysisCapabilityPanel`, `SessionsClient` 单书区, `sessions/page.tsx` 指标区

```typescript
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const [open, setOpen] = useState(false);

<Collapsible open={open} onOpenChange={setOpen}>
  <CollapsibleTrigger>...</CollapsibleTrigger>
  <CollapsibleContent>...</CollapsibleContent>
</Collapsible>
```

### Typography utilities (02-UI-SPEC)

**Source:** `src/app/globals.css` (lines 135-154), `design-system-client.tsx` (304-308)  
**Apply to:** All Phase 4 touched routes — **零新增** `text-[Npx]`

```css
.type-display { @apply chinese-display text-xl text-foreground; }
.type-title { @apply text-lg font-semibold text-foreground; }
.type-body { @apply text-sm text-foreground; }
.type-caption { @apply text-xs text-muted-foreground; }
```

### Step spacing and panel budget

**Source:** `design-system-client.tsx` spacing token `space-y-10` (48px)  
**Apply to:** workbench steps, sessions page sections

- 步间 `space-y-10`；同一步内最多 **2** 层 `surface-panel`（含 footer action bar）（D-17）。
- Footer action bar 模式（workbench lines 682-702, 734-746, 800-814）:

```typescript
<div className="surface-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
  <p className="type-body text-muted-foreground">{statusCopy}</p>
  <Button disabled={!ready}>{primaryLabel}</Button>
</div>
```

### Primary CTA hierarchy (WB-03)

**Source:** `blueprint-editor.tsx` (202-204), workbench generate (847-853)  
**Apply to:** workbench, overview, list hints

| Action | Variant | When enabled |
|--------|---------|--------------|
| 确认蓝图 | `default` | `blueprintReadyToConfirm(bp).ok` |
| 前往对比 / 前往生成 | `default` | step gate flags |
| 批量分析 / 再生成一版 | `default` | in-step primary only |
| 次要 | `outline` / `ghost` | 所有其它 |

装饰性 copy **禁止** `text-primary`；状态用 `text-flash`, `text-info`, `text-warning`, `text-destructive`（D-15, backlog #47).

### Hint / 情境说明

**Source:** `hint-banner.tsx`, `derive-hint.ts`, `deriveSessionDashboard`  
**Apply to:** workbench analysis step, sessions list (once)

- Workbench: `<HintBanner hint={deriveHint(...)} />` 保持 SSOT。
- Sessions: 单次 `surface-subtle` + `type-caption`，不常驻侧栏规则 panel。

### List routing SSOT (no change)

**Source:** `src/lib/sessions/dashboard.ts` (lines 69-104), `project-card.tsx` (line 50)  
**Apply to:** 验证 Phase 4 未破坏 `nextHref` / dual workbench 链

```typescript
nextHref: `/sessions/${seed.id}/workbench`,
// ...
const href = session.nextHref || `/sessions/${session.id}`;
```

### Shell title polish only (Phase 3)

**Source:** `src/components/contextual-shell-title.tsx` (lines 15-22)  
**Apply to:** workbench 间距微调 only — **不** 移动 dual redirect（`sessions/[id]/page.tsx`）

```typescript
<p className="type-mono-label">{title}</p>
<p className="type-caption mt-0.5">...</p>
```

### Route-level loading

**Source:** `workbench/loading.tsx`, `page-loading-shell.tsx`  
**Apply to:** 批量分析进行中 + navigation（D-14）

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| *(none for Phase 4 core files)* | — | — | Collapsible installed in Phase 3; all targets have in-repo analogs |

*Optional extract:* `analysis-step.tsx` / `compare-step.tsx` split from `workbench-client.tsx` — follow same file's step `section` blocks (lines 664-881); no new pattern.

---

## Metadata

**Analog search scope:** `src/app/(app)/sessions/**`, `src/components/workbench/**`, `src/components/sessions/**`, `src/components/projects/**`, `src/components/app-nav.tsx`, `src/components/ui/collapsible.tsx`, `src/lib/sessions/dashboard.ts`, `src/lib/workbench/derive-hint.ts`, `src/app/globals.css`, `.planning/phases/03-app-shell-navigation-ia/03-PATTERNS.md`  
**Files scanned:** ~22  
**Pattern extraction date:** 2026-05-26
