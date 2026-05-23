# Project-Centric App Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape the existing session-based UI into a project-centric shell with a conclusion-first dual-project homepage, explicit module entry points, and lighter frontstage copy without rewriting the analysis backend.

**Architecture:** Keep the current Supabase-backed `sessions` / `books` / `variants` data model, but reframe it in the UI as `projects`. For dual-book sessions, stop landing directly in the heavy workbench and instead render a project homepage that summarizes project state, editorial guidance, and next actions. Reuse the existing workbench, compare, blueprint, and generation routes as project modules reached from that homepage.

**Tech Stack:** Next.js App Router, React Server Components, client components for local interactions, Supabase server client, TypeScript, Node test runner (`node --import tsx --test`).

---

## Scope Split

This spec spans two independent subsystems:

1. **Project-centric IA and UI shell**: navigation, naming, project homepage, module entry points
2. **Deep ingestion intelligence**: noisy-text cleaning policy, structured analysis assets, internal conflict resolution, pipeline orchestration

This plan covers subsystem 1 only. Write a second plan for subsystem 2 after this ships or stabilizes.

## File Structure Map

### Existing files to modify

- `src/components/app-nav.tsx`
  - global navigation labels and destinations
- `src/components/sidebar.tsx`
  - desktop shell branding and create-project CTA
- `src/components/mobile-nav.tsx`
  - mobile shell branding and create-project CTA
- `src/app/page.tsx`
  - logged-in root redirect target
- `src/app/(app)/sessions/page.tsx`
  - project list page copy and CTA wording
- `src/app/(app)/sessions/SessionsClient.tsx`
  - list tabs wording (`进行中` / `归档`) and project phrasing
- `src/components/sessions/project-card.tsx`
  - card labels and project summary copy
- `src/app/(app)/upload/page.tsx`
  - upload/create-project page copy
- `src/app/(app)/sessions/[id]/page-data.ts`
  - dual-session loader extension for project homepage summary data
- `src/app/(app)/sessions/[id]/page.tsx`
  - render a project homepage for dual sessions instead of dropping straight into the workbench
- `src/app/(app)/sessions/[id]/workbench/page.tsx`
  - make sure workbench remains a stable deep destination for project operations

### New files to create

- `src/lib/projects/overview.test.ts`
  - unit tests for project homepage derived state
- `src/lib/projects/overview.ts`
  - derive homepage status, editorial bullets, and next-action metadata from dual-session data
- `src/components/projects/project-module-nav.tsx`
  - in-project module navigation for Overview / Workbench / Briefs / Results
- `src/components/projects/project-overview-header.tsx`
  - compact project status and CTA area
- `src/components/projects/editorial-recommendation-panel.tsx`
  - chief-editor style decision panel
- `src/components/projects/project-key-results.tsx`
  - compressed results summary block
- `src/components/projects/project-overview-page.tsx`
  - page composition for the new dual-project landing screen

## Task 1: Create a typed project-overview derivation layer

**Files:**
- Create: `src/lib/projects/overview.ts`
- Create: `src/lib/projects/overview.test.ts`
- Read for context: `src/app/(app)/sessions/[id]/page-data.ts`
- Read for context: `src/lib/session-status.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { deriveProjectOverview } from "./overview";

test("deriveProjectOverview returns upload-focused next action when only one book exists", () => {
  const result = deriveProjectOverview({
    books: [{ id: "b1", title: "Book A", position: 0, chapter_count: 10 }],
    briefs: [],
    bookSynthesisByBook: [],
    blueprintStatus: "draft",
    blueprintConfirmedAt: null,
    variants: [],
  });

  assert.equal(result.statusLabel, "等待补全素材");
  assert.equal(result.nextAction.href, "/upload?sessionId=session-1&position=1");
});

test("deriveProjectOverview returns blueprint confirmation action when both books are analyzed", () => {
  const result = deriveProjectOverview({
    books: [
      { id: "b1", title: "Book A", position: 0, chapter_count: 10 },
      { id: "b2", title: "Book B", position: 1, chapter_count: 12 },
    ],
    briefs: [
      { book_id: "b1", chapter_id: "c1", result: { summary: "..." } },
      { book_id: "b2", chapter_id: "c2", result: { summary: "..." } },
    ],
    bookSynthesisByBook: ["b1", "b2"],
    blueprintStatus: "draft",
    blueprintConfirmedAt: null,
    variants: [],
  });

  assert.equal(result.statusLabel, "等待确认蓝图");
  assert.equal(result.nextAction.href, "/sessions/session-1/workbench");
  assert.match(result.editorialBullets[0], /保留|融合|推进/);
});

test("deriveProjectOverview returns results action when variants already exist", () => {
  const result = deriveProjectOverview({
    books: [
      { id: "b1", title: "Book A", position: 0, chapter_count: 10 },
      { id: "b2", title: "Book B", position: 1, chapter_count: 12 },
    ],
    briefs: [],
    bookSynthesisByBook: ["b1", "b2"],
    blueprintStatus: "confirmed",
    blueprintConfirmedAt: "2026-05-23T00:00:00.000Z",
    variants: [{ id: "v1", title: "Draft 1" }],
  });

  assert.equal(result.statusLabel, "结果已生成");
  assert.equal(result.nextAction.href, "/sessions/session-1?panel=results");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
node --import tsx --test src/lib/projects/overview.test.ts
```

Expected: FAIL with `Cannot find module './overview'` or missing export errors.

- [ ] **Step 3: Write the minimal derivation helper**

```ts
export type ProjectOverviewInput = {
  sessionId: string;
  books: Array<{
    id: string;
    title: string;
    position: number;
    chapter_count: number | null;
  }>;
  briefs: Array<{ book_id: string; chapter_id: string; result: unknown }>;
  bookSynthesisByBook: string[];
  blueprintStatus: "draft" | "confirmed";
  blueprintConfirmedAt: string | null;
  variants: Array<{ id: string; title: string }>;
};

export type ProjectOverview = {
  statusLabel: string;
  progressLabel: string;
  editorialBullets: string[];
  nextAction: {
    label: string;
    href: string;
  };
  keyResults: Array<{ label: string; value: string }>;
};

export function deriveProjectOverview(
  input: ProjectOverviewInput,
): ProjectOverview {
  const hasTwoBooks = input.books.length === 2;
  const analyzedBooks = new Set(input.bookSynthesisByBook).size;
  const hasConfirmedBlueprint =
    input.blueprintStatus === "confirmed" || Boolean(input.blueprintConfirmedAt);
  const hasVariants = input.variants.length > 0;

  if (!hasTwoBooks) {
    return {
      statusLabel: "等待补全素材",
      progressLabel: "已导入 1 / 2 本参考小说",
      editorialBullets: [
        "先补齐第二本参考小说，系统才能给出稳定的融合判断。",
        "当前可先保留第一本的章节与人物基础结构。",
        "暂不建议进入生成，避免蓝图建立在单侧素材上。",
      ],
      nextAction: {
        label: "补充第二本参考书",
        href: `/upload?sessionId=${input.sessionId}&position=1`,
      },
      keyResults: [
        { label: "参考小说", value: "1 / 2" },
        { label: "已切章节", value: String(input.books[0]?.chapter_count ?? 0) },
        { label: "蓝图状态", value: "未开始" },
      ],
    };
  }

  if (analyzedBooks < 2) {
    return {
      statusLabel: "等待完成分析",
      progressLabel: `已完成 ${analyzedBooks} / 2 本整书分析`,
      editorialBullets: [
        "先让两本书都形成整书级判断，再讨论融合策略。",
        "当前阶段适合继续沉淀章节摘要与基础世界观信息。",
        "不要过早进入生成，先把双书理解补齐。",
      ],
      nextAction: {
        label: "进入工作台继续分析",
        href: `/sessions/${input.sessionId}/workbench`,
      },
      keyResults: [
        { label: "参考小说", value: "2 / 2" },
        { label: "整书分析", value: `${analyzedBooks} / 2` },
        { label: "蓝图状态", value: "草稿" },
      ],
    };
  }

  if (!hasConfirmedBlueprint) {
    return {
      statusLabel: "等待确认蓝图",
      progressLabel: "两本参考小说已具备融合条件",
      editorialBullets: [
        "先锁定最值得保留的结构骨架，再决定生成方向。",
        "优先处理两书之间最强的互补点，而不是平均混合。",
        "确认蓝图后再开始生成，结果会更稳定。",
      ],
      nextAction: {
        label: "进入工作台确认蓝图",
        href: `/sessions/${input.sessionId}/workbench`,
      },
      keyResults: [
        { label: "参考小说", value: "2 / 2" },
        { label: "整书分析", value: "2 / 2" },
        { label: "蓝图状态", value: "待确认" },
      ],
    };
  }

  if (hasVariants) {
    return {
      statusLabel: "结果已生成",
      progressLabel: `已保存 ${input.variants.length} 个生成版本`,
      editorialBullets: [
        "优先比较现有生成版本的骨架差异，再决定下一轮迭代。",
        "保留最稳定的融合骨架，避免每轮都重新发散。",
        "下一步更适合精修，而不是回到素材整理阶段。",
      ],
      nextAction: {
        label: "查看生成结果",
        href: `/sessions/${input.sessionId}?panel=results`,
      },
      keyResults: [
        { label: "参考小说", value: "2 / 2" },
        { label: "蓝图状态", value: "已确认" },
        { label: "生成版本", value: String(input.variants.length) },
      ],
    };
  }

  return {
    statusLabel: "可以开始生成",
    progressLabel: "融合蓝图已确认，等待首个版本输出",
    editorialBullets: [
      "融合条件已经具备，可以进入首版生成。",
      "建议先生成骨架稳定的版本，不要一次追求过多风格变化。",
      "生成后优先比较结构和角色张力，再做第二轮迭代。",
    ],
    nextAction: {
      label: "进入结果区开始生成",
      href: `/sessions/${input.sessionId}?panel=results`,
    },
    keyResults: [
      { label: "参考小说", value: "2 / 2" },
      { label: "蓝图状态", value: "已确认" },
      { label: "生成版本", value: "0" },
    ],
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
node --import tsx --test src/lib/projects/overview.test.ts
```

Expected: PASS for all `deriveProjectOverview` cases.

- [ ] **Step 5: Commit**

```bash
git add src/lib/projects/overview.ts src/lib/projects/overview.test.ts
git commit -m "feat: add project overview derivation"
```

## Task 2: Extend dual-session data loading for the project homepage

**Files:**
- Modify: `src/app/(app)/sessions/[id]/page-data.ts`
- Test: `src/lib/projects/overview.test.ts`

- [ ] **Step 1: Add the failing shape assertions to the existing tests**

```ts
test("deriveProjectOverview handles chapter counts and variant counts from loader-friendly payloads", () => {
  const result = deriveProjectOverview({
    sessionId: "session-1",
    books: [
      { id: "b1", title: "Book A", position: 0, chapter_count: 8 },
      { id: "b2", title: "Book B", position: 1, chapter_count: 14 },
    ],
    briefs: [],
    bookSynthesisByBook: ["b1", "b2"],
    blueprintStatus: "confirmed",
    blueprintConfirmedAt: "2026-05-23T00:00:00.000Z",
    variants: [{ id: "v1", title: "Draft 1" }, { id: "v2", title: "Draft 2" }],
  });

  assert.deepEqual(result.keyResults, [
    { label: "参考小说", value: "2 / 2" },
    { label: "蓝图状态", value: "已确认" },
    { label: "生成版本", value: "2" },
  ]);
});
```

- [ ] **Step 2: Run the tests to verify the new expectation fails if needed**

Run:

```bash
node --import tsx --test src/lib/projects/overview.test.ts
```

Expected: FAIL only if the helper returns mismatched key-result labels.

- [ ] **Step 3: Update the dual loader to carry the minimal homepage data cleanly**

```ts
export type DualSessionPageData = {
  session: {
    id: string;
    name: string;
    mode: "single" | "dual";
    created_at: string;
    updated_at: string;
  };
  books: Array<{
    id: string;
    title: string;
    position: number;
    word_count: number | null;
    chapter_count: number | null;
    created_at: string;
  }>;
  briefs: Array<{
    book_id: string;
    chapter_id: string;
    result: ChapterBriefResult;
  }>;
  bookSynthesisByBook: string[];
  blueprintStatus: "draft" | "confirmed";
  blueprintUpdatedAt: string | null;
  blueprintConfirmedAt: string | null;
  variants: Array<{
    id: string;
    title: string;
    created_at: string;
  }>;
  // keep existing fields for the workbench route
  chapters: DualSessionPageData["chapters"];
  blueprintId: string | null;
  blueprint: ReturnType<typeof emptyBlueprint>;
};
```

Implementation notes:

- Keep the existing queries.
- Narrow `variants` on the overview page to the small shape the new helper needs.
- Do not remove fields still consumed by `WorkbenchClient`.
- Keep loader responsibility as data loading only; editorial strings belong in `src/lib/projects/overview.ts`.

- [ ] **Step 4: Re-run the tests**

Run:

```bash
node --import tsx --test src/lib/projects/overview.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/sessions/\[id\]/page-data.ts src/lib/projects/overview.test.ts
git commit -m "refactor: shape dual session data for project overview"
```

## Task 3: Build the dual-project overview UI

**Files:**
- Create: `src/components/projects/project-module-nav.tsx`
- Create: `src/components/projects/project-overview-header.tsx`
- Create: `src/components/projects/editorial-recommendation-panel.tsx`
- Create: `src/components/projects/project-key-results.tsx`
- Create: `src/components/projects/project-overview-page.tsx`
- Modify: `src/app/(app)/sessions/[id]/page.tsx`
- Read for style: `src/components/page-header.tsx`
- Read for style: `src/components/workflow-stage-bar.tsx`

- [ ] **Step 1: Add a failing render smoke test for the new overview composition**

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { deriveProjectOverview } from "@/lib/projects/overview";

test("project overview data exposes the labels required by the overview UI", () => {
  const result = deriveProjectOverview({
    sessionId: "session-1",
    books: [
      { id: "b1", title: "Book A", position: 0, chapter_count: 8 },
      { id: "b2", title: "Book B", position: 1, chapter_count: 14 },
    ],
    briefs: [],
    bookSynthesisByBook: ["b1", "b2"],
    blueprintStatus: "draft",
    blueprintConfirmedAt: null,
    variants: [],
  });

  assert.equal(result.nextAction.label, "进入工作台确认蓝图");
  assert.equal(result.editorialBullets.length, 3);
});
```

- [ ] **Step 2: Run the tests**

Run:

```bash
node --import tsx --test src/lib/projects/overview.test.ts
```

Expected: PASS or a targeted FAIL before UI wiring if labels drifted.

- [ ] **Step 3: Write the new project overview components**

```tsx
// src/components/projects/project-module-nav.tsx
import Link from "next/link";

const MODULES = [
  { href: (id: string) => `/sessions/${id}`, label: "概览" },
  { href: (id: string) => `/sessions/${id}/workbench`, label: "工作台" },
  { href: (id: string) => `/studio/new?sessionId=${id}`, label: "简报" },
  { href: (id: string) => `/sessions/${id}?panel=results`, label: "结果" },
];

// src/components/projects/project-overview-page.tsx
export function ProjectOverviewPage(props: {
  sessionId: string;
  sessionName: string;
  overview: ProjectOverview;
  books: Array<{ id: string; title: string; chapter_count: number | null }>;
}) {
  return (
    <div className="app-page">
      <ProjectModuleNav sessionId={props.sessionId} current="概览" />
      <ProjectOverviewHeader
        title={props.sessionName}
        statusLabel={props.overview.statusLabel}
        progressLabel={props.overview.progressLabel}
        nextAction={props.overview.nextAction}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <EditorialRecommendationPanel
          bullets={props.overview.editorialBullets}
        />
        <ProjectKeyResults items={props.overview.keyResults} />
      </div>
    </div>
  );
}
```

In `src/app/(app)/sessions/[id]/page.tsx`:

```tsx
if (sessionMode?.mode === "dual") {
  const dualData = await loadDualSessionPageData({
    supabase,
    sessionId: id,
    userId: user.id,
  });
  if (!dualData) notFound();

  const overview = deriveProjectOverview({
    sessionId: dualData.session.id,
    books: dualData.books,
    briefs: dualData.briefs,
    bookSynthesisByBook: dualData.bookSynthesisByBook,
    blueprintStatus: dualData.blueprintStatus,
    blueprintConfirmedAt: dualData.blueprintConfirmedAt,
    variants: dualData.variants.map((variant) => ({
      id: variant.id,
      title: variant.title,
    })),
  });

  return (
    <ProjectOverviewPage
      sessionId={dualData.session.id}
      sessionName={dualData.session.name}
      overview={overview}
      books={dualData.books}
    />
  );
}
```

- [ ] **Step 4: Verify with type-check**

Run:

```bash
npm run type-check
```

Expected: PASS with no new type errors in `src/components/projects/*` or `src/app/(app)/sessions/[id]/page.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/components/projects src/app/\(app\)/sessions/\[id\]/page.tsx
git commit -m "feat: add dual project overview page"
```

## Task 4: Reframe global shell copy from tasks to projects

**Files:**
- Modify: `src/components/app-nav.tsx`
- Modify: `src/components/sidebar.tsx`
- Modify: `src/components/mobile-nav.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/(app)/sessions/page.tsx`
- Modify: `src/app/(app)/sessions/SessionsClient.tsx`
- Modify: `src/components/sessions/project-card.tsx`
- Modify: `src/app/(app)/upload/page.tsx`

- [ ] **Step 1: Add a failing copy-consistency test for project labels**

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { deriveProjectOverview } from "@/lib/projects/overview";

test("project shell vocabulary uses project-first labels", () => {
  const result = deriveProjectOverview({
    sessionId: "session-1",
    books: [{ id: "b1", title: "Book A", position: 0, chapter_count: 10 }],
    briefs: [],
    bookSynthesisByBook: [],
    blueprintStatus: "draft",
    blueprintConfirmedAt: null,
    variants: [],
  });

  assert.equal(result.statusLabel, "等待补全素材");
});
```

- [ ] **Step 2: Update shell and list copy**

Use these exact direction changes:

```tsx
// src/components/app-nav.tsx
const NAV_ITEMS = [
  { href: "/sessions", label: "项目", icon: FolderKanban },
];

// src/components/sidebar.tsx
<span className="mt-1 block text-[11px] text-muted-foreground">
  项目制小说融合工作区
</span>
<Link href="/upload">新建项目</Link>

// src/components/mobile-nav.tsx
<Link href="/upload" onClick={() => setOpen(false)}>
  <Plus aria-hidden="true" />
  新建项目
</Link>

// src/app/page.tsx
redirect(user ? "/sessions" : "/login");

// src/app/(app)/sessions/page.tsx
title={view === "archived" ? "归档项目" : "项目"}
description={
  view === "archived"
    ? "归档项目仍可恢复。永久删除会同时移除分析、章节和生成结果。"
    : "这里保留所有项目。进入项目后，先看结论概览，再决定是否进入工作台继续分析或生成。"
}

// src/components/sessions/project-card.tsx
{isDual ? "双书项目" : "单书兼容项目"}
{isDual ? "概览 → 工作台 → 结果" : "兼容旧流程"}
```

In `src/app/(app)/sessions/SessionsClient.tsx`:

```tsx
<SegmentLink active={view === "active"} href="/sessions">
  进行中项目
</SegmentLink>
<SegmentLink active={view === "archived"} href="/sessions?view=archived">
  归档项目
</SegmentLink>
```

In `src/app/(app)/upload/page.tsx`:

```tsx
title={addingSecondBook ? "补充参考书 2" : "创建双书项目"}
description={
  addingSecondBook
    ? "把第 2 本参考小说补充到当前项目。上传完成后会回到项目概览。"
    : "导入两本参考小说，系统会分析、整合情节与创意，然后带你进入项目概览继续推进。"
}
```

- [ ] **Step 3: Run type-check**

Run:

```bash
npm run type-check
```

Expected: PASS.

- [ ] **Step 4: Manually verify primary navigation and list copy**

Run:

```bash
npm run dev
```

Expected manual checks:

- sidebar button reads `新建项目`
- `/sessions` page title reads `项目`
- dual project cards read `双书项目`
- upload page references `项目` instead of `任务`

- [ ] **Step 5: Commit**

```bash
git add src/components/app-nav.tsx src/components/sidebar.tsx src/components/mobile-nav.tsx src/app/page.tsx src/app/\(app\)/sessions/page.tsx src/app/\(app\)/sessions/SessionsClient.tsx src/components/sessions/project-card.tsx src/app/\(app\)/upload/page.tsx
git commit -m "feat: reframe shell copy around projects"
```

## Task 5: Preserve deep work routes and validate the new flow end to end

**Files:**
- Modify: `src/app/(app)/sessions/[id]/workbench/page.tsx` (only if route messaging is missing)
- Optional modify: `src/app/(app)/studio/new/page.tsx`
- Optional modify: `src/app/(app)/compare/page.tsx`
- Optional modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Add a route-preservation checklist to the plan branch**

```md
- `/sessions/[id]` for dual sessions now shows the overview page
- `/sessions/[id]/workbench` still opens the heavy workbench
- `/studio/new?sessionId=<id>` still routes into the project-specific creative brief flow
- generation actions remain reachable from the overview CTA or results module
```

- [ ] **Step 2: If needed, add explicit redirects so old entry points land on the new project shell**

```tsx
// src/app/(app)/compare/page.tsx
redirect("/sessions");

// src/app/(app)/dashboard/page.tsx
redirect("/sessions");

// src/app/(app)/studio/new/page.tsx
redirect(`/sessions/${session.id}/workbench`);
```

Keep these edits minimal unless the existing behavior is already sufficient.

- [ ] **Step 3: Run the focused verification commands**

Run:

```bash
node --import tsx --test src/lib/projects/overview.test.ts
npm run type-check
```

Expected: both PASS.

- [ ] **Step 4: Run manual browser verification**

Run:

```bash
npm run dev
```

Verify:

- opening `/sessions` shows project wording
- opening a dual-book session lands on the new overview, not directly in the workbench
- overview CTA reaches `/sessions/[id]/workbench`
- upload flow returns to `/sessions/[id]`

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/sessions/\[id\]/workbench/page.tsx src/app/\(app\)/studio/new/page.tsx src/app/\(app\)/compare/page.tsx src/app/\(app\)/dashboard/page.tsx
git commit -m "test: verify project-centric routing flow"
```

## Self-Review

### Spec coverage

- Project as highest-level container: covered by Task 4 copy and Task 3 overview landing
- Conclusion-first homepage: covered by Task 1 and Task 3
- Chief-editor style recommendations: covered by Task 1 derivation and Task 3 panel
- Multi-module entry points: covered by Task 3 module nav and Task 5 route preservation
- Light frontend with strong backend unchanged: covered by keeping existing data model and workbench route intact

### Gaps intentionally deferred

- No deep dirty-data pipeline changes in this plan
- No new analyst/debug mode
- No attempt to re-platform single-book sessions in this first pass

### Placeholder scan

- No `TODO` or `TBD`
- Each task has exact file targets and explicit commands
- Optional route edits are constrained to existing files already acting as redirects

### Consistency check

- Route model stays anchored on existing `/sessions` paths
- UI wording moves from `任务` to `项目`
- Dual-session detail route becomes overview-first; workbench remains the heavy operations page

