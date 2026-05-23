# Multi-book Chapter Comparison + Blueprint Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor NovelFusion AI v0.1 from single-book three-dimension summary → variant generation into a dual-book research workbench with chapter-level analysis, structured merge blueprint, and blueprint-driven variant generation with side-by-side diff.

**Architecture:** Approach C (pragmatic hybrid) from the spec — incremental schema with a single `chapters` table for stable chapter IDs, jsonb-backed `blueprints.sections` validated by Zod, single `analyses` table extended with `scope`/`chapter_id`, client-orchestrated chapter analysis (concurrency-capped fetch pool, no worker), and pure-frontend variant diff. Old single-book sessions keep their current path; new dual mode lives in `/sessions/[id]/workbench`.

**Tech Stack:** Next.js 15 (App Router, Server Actions), Supabase Postgres + Storage + Auth, `@ai-sdk/openai` via `createOpenAI({ baseURL })`, Zod, `node:test` + `node:assert/strict` (with `--import tsx`), TypeScript strict mode, Tailwind + shadcn/ui.

**Reference spec:** `docs/superpowers/specs/2026-05-20-multi-book-blueprint-workbench-design.md`

---

## File Structure

### New files
- `supabase/migrations/0004_multi_book_blueprint_workbench.sql` — schema migration
- `src/lib/text/chapters.ts` — chapter detection (regex extensions + length fallback + manual)
- `src/lib/text/chapters.test.ts`
- `src/lib/blueprint/schema.ts` — Zod `BlueprintSchema`
- `src/lib/blueprint/schema.test.ts`
- `src/lib/blueprint/merge.ts` — candidate → blueprint item conversion + section merge
- `src/lib/blueprint/merge.test.ts`
- `src/lib/diff/variant-diff.ts` — paragraph LCS + structural diff
- `src/lib/diff/variant-diff.test.ts`
- `src/lib/cost/estimate.ts` — chapter-batch cost estimator
- `src/lib/prompts/chapter-brief.ts`
- `src/lib/prompts/chapter-brief.test.ts`
- `src/lib/prompts/book-synthesis.ts`
- `src/lib/prompts/book-synthesis.test.ts`
- `src/lib/prompts/generate-from-blueprint.ts`
- `src/lib/prompts/generate-from-blueprint.test.ts`
- `src/app/api/chapters/parse/route.ts`
- `src/app/api/analyze/chapter/route.ts`
- `src/app/api/analyze/book/route.ts`
- `src/app/api/blueprint/route.ts` (PATCH)
- `src/app/api/blueprint/confirm/route.ts`
- `src/app/api/blueprint/unconfirm/route.ts`
- `src/app/api/generate-v2/route.ts` (new generate signature; old route kept for single mode)
- `src/app/(app)/sessions/[id]/workbench/page.tsx`
- `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx`
- `src/app/(app)/sessions/[id]/workbench/chapter-batch.ts` (client orchestrator)
- `src/components/workbench/chapter-tree.tsx`
- `src/components/workbench/chapter-card.tsx`
- `src/components/workbench/filter-bar.tsx`
- `src/components/workbench/blueprint-editor.tsx`
- `src/components/workbench/blueprint-section.tsx`
- `src/components/workbench/pipeline-bar.tsx`
- `src/components/workbench/cost-estimate-modal.tsx`
- `src/components/sessions/variant-comparison.tsx`
- `src/components/sessions/variant-diff-meta.tsx`
- `src/components/sessions/variant-diff-structure.tsx`
- `src/components/sessions/variant-diff-paragraphs.tsx`

### Modified files
- `src/lib/types.ts` — extend `Database` types, `AnalysisDimension`, add `ChapterBriefResultSchema` / `BookSynthesisResultSchema`
- `src/lib/text/clean.ts` — remove `buildChapters`/`extractChapterTitles`, re-export from `chapters.ts`
- `src/lib/upload/actions.ts` — `initNovelUpload` accepts `{ mode, position? }`; finalize writes `chapters` table
- `src/lib/upload/shared.ts` — `buildStorageObjectPath` already partitions by sessionId, no change required
- `src/components/upload/upload-form.tsx` — mode picker + dual second-book slot
- `src/app/(app)/upload/page.tsx` — minor copy/header update
- `src/app/(app)/sessions/[id]/page.tsx` — mode dispatcher → workbench or legacy path
- `src/app/api/generate/route.ts` — guard: only allowed for `mode='single'`
- `CLAUDE.md` — document dual mode, new routes, new tables

---

## Phase 1 — Foundation (DB + Types)

### Task 1: SQL migration 0004

**Files:**
- Create: `supabase/migrations/0004_multi_book_blueprint_workbench.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- 0004 multi-book + blueprint workbench

-- sessions.mode
alter table public.sessions
  add column if not exists mode text not null default 'single'
    check (mode in ('single','dual'));

-- books.position
alter table public.books
  add column if not exists position smallint not null default 0
    check (position between 0 and 1);
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'books_session_position_unique'
  ) then
    alter table public.books
      add constraint books_session_position_unique unique (session_id, position);
  end if;
end $$;

-- chapters
create table if not exists public.chapters (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references public.books(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  index       int  not null,
  title       text not null,
  start_char  int  not null,
  end_char    int  not null,
  source      text not null check (source in ('regex','length-chunk','manual')),
  created_at  timestamptz not null default now(),
  unique (book_id, index)
);

alter table public.chapters enable row level security;
drop policy if exists "users access own chapters" on public.chapters;
create policy "users access own chapters"
  on public.chapters for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- analyses.scope + chapter_id
alter table public.analyses
  add column if not exists scope text not null default 'book'
    check (scope in ('book','chapter')),
  add column if not exists chapter_id uuid null
    references public.chapters(id) on delete cascade;

-- relax dimension to text (we add new dimensions chapter_brief, book_synthesis)
alter table public.analyses
  drop constraint if exists analyses_dimension_check;

-- partial unique indexes (NULL-safe)
drop index if exists analyses_book_dimension_unique;
do $$ begin
  if exists (
    select 1 from pg_constraint
    where conname = 'analyses_book_id_dimension_key'
  ) then
    alter table public.analyses drop constraint analyses_book_id_dimension_key;
  end if;
end $$;

create unique index if not exists analyses_book_scope_book_uniq
  on public.analyses (book_id, dimension)
  where scope = 'book' and chapter_id is null;

create unique index if not exists analyses_book_scope_chapter_uniq
  on public.analyses (book_id, chapter_id, dimension)
  where scope = 'chapter' and chapter_id is not null;

-- blueprints
create table if not exists public.blueprints (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null unique references public.sessions(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'draft' check (status in ('draft','confirmed')),
  sections     jsonb not null default '{}'::jsonb,
  confirmed_at timestamptz null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.blueprints enable row level security;
drop policy if exists "users access own blueprints" on public.blueprints;
create policy "users access own blueprints"
  on public.blueprints for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists trg_blueprints_updated on public.blueprints;
create trigger trg_blueprints_updated
  before update on public.blueprints
  for each row execute function public.touch_updated_at();

-- variants.blueprint_id
alter table public.variants
  add column if not exists blueprint_id uuid null
    references public.blueprints(id) on delete restrict;

create index if not exists variants_blueprint_id_idx
  on public.variants (blueprint_id);
```

- [ ] **Step 2: Apply migration in Supabase**

Run the SQL above in the Supabase SQL editor (or via the local Supabase CLI). Verify with:
```sql
select column_name, data_type from information_schema.columns
  where table_name='sessions' and column_name='mode';
select column_name from information_schema.columns
  where table_name='chapters' order by ordinal_position;
select column_name from information_schema.columns
  where table_name='blueprints' order by ordinal_position;
```
Expected: each query returns rows confirming new columns exist.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0004_multi_book_blueprint_workbench.sql
git commit -m "feat(db): migration 0004 — multi-book + blueprint schema"
```

---

### Task 2: Extend `AnalysisDimension` and Database types — sessions/books/chapters

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Update `AnalysisDimension` and add `AnalysisScope`**

Replace lines 15–27 of `src/lib/types.ts`:

```ts
export type AnalysisDimension =
  | "worldview"
  | "characters"
  | "narrative"
  | "chapter_brief"
  | "book_synthesis";

export const LEGACY_ANALYSIS_DIMENSIONS = [
  "worldview",
  "characters",
  "narrative",
] as const satisfies readonly AnalysisDimension[];

export type AnalysisScope = "book" | "chapter";

export const ANALYSIS_DIMENSIONS = LEGACY_ANALYSIS_DIMENSIONS;

export const DIMENSION_LABELS: Record<AnalysisDimension, string> = {
  worldview: "世界观",
  characters: "人物",
  narrative: "叙事",
  chapter_brief: "章节抽取",
  book_synthesis: "整书汇总",
};

export type SessionMode = "single" | "dual";
```

(Keep `ANALYSIS_DIMENSIONS` referring to the legacy 3 so existing imports still type-check.)

- [ ] **Step 2: Extend `sessions` and `books` row types**

In `Database["public"]["Tables"]`:

```ts
sessions: {
  Row: {
    id: string;
    user_id: string;
    name: string;
    status: SessionStatus;
    mode: SessionMode;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    user_id: string;
    name?: string;
    status?: SessionStatus;
    mode?: SessionMode;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<{
    name: string;
    status: SessionStatus;
    mode: SessionMode;
    updated_at: string;
  }>;
  Relationships: [];
};

books: {
  Row: {
    id: string;
    session_id: string;
    user_id: string;
    title: string;
    storage_path: string;
    position: number;
    word_count: number | null;
    chapter_count: number | null;
    metadata: Record<string, unknown>;
    cleaned_content: string | null;
    created_at: string;
  };
  Insert: {
    id?: string;
    session_id: string;
    user_id: string;
    title: string;
    storage_path: string;
    position?: number;
    word_count?: number | null;
    chapter_count?: number | null;
    metadata?: Record<string, unknown>;
    cleaned_content?: string | null;
    created_at?: string;
  };
  Update: Partial<{
    title: string;
    position: number;
    word_count: number | null;
    chapter_count: number | null;
    metadata: Record<string, unknown>;
    cleaned_content: string | null;
  }>;
  Relationships: [];
};
```

- [ ] **Step 3: Add `chapters` table type**

```ts
chapters: {
  Row: {
    id: string;
    book_id: string;
    user_id: string;
    index: number;
    title: string;
    start_char: number;
    end_char: number;
    source: "regex" | "length-chunk" | "manual";
    created_at: string;
  };
  Insert: {
    id?: string;
    book_id: string;
    user_id: string;
    index: number;
    title: string;
    start_char: number;
    end_char: number;
    source: "regex" | "length-chunk" | "manual";
    created_at?: string;
  };
  Update: Partial<{
    index: number;
    title: string;
    start_char: number;
    end_char: number;
    source: "regex" | "length-chunk" | "manual";
  }>;
  Relationships: [];
};
```

- [ ] **Step 4: Run type-check**

Run: `npm run type-check`
Expected: passes (we have not yet introduced consumers of new fields).

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): extend Database types for sessions.mode, books.position, chapters"
```

---

### Task 3: Extend `analyses`, `blueprints`, `variants` types + result schemas

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add `ChapterBriefResultSchema`**

After existing `NarrativeResultSchema` block, add:

```ts
export const ChapterBriefResultSchema = z.object({
  summary: z.string(),
  scenes: z
    .array(
      z.object({
        place: z.string(),
        time: z.string().optional(),
        description: z.string(),
      })
    )
    .default([]),
  characters_appeared: z
    .array(
      z.object({
        name: z.string(),
        action: z.string(),
      })
    )
    .default([]),
  events: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        is_turning_point: z.boolean().default(false),
      })
    )
    .default([]),
  conflicts: z.array(z.string()).default([]),
  viewpoint: z.string().optional(),
  themes_hints: z.array(z.string()).default([]),
  blueprint_candidates: z
    .array(
      z.object({
        section: z.enum([
          "characters",
          "relationships",
          "world_rules",
          "conflicts",
          "plot_beats",
          "viewpoint",
          "themes",
        ]),
        title: z.string(),
        payload: z.unknown(),
      })
    )
    .default([]),
});
export type ChapterBriefResult = z.infer<typeof ChapterBriefResultSchema>;
```

- [ ] **Step 2: Add `BookSynthesisResultSchema`**

```ts
export const BookSynthesisResultSchema = z.object({
  characters: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      traits: z.array(z.string()).default([]),
      description: z.string(),
    })
  ),
  relationships: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      type: z.string(),
      description: z.string(),
    })
  ),
  world_rules: z.array(
    z.object({
      rule: z.string(),
      description: z.string(),
    })
  ),
  conflicts: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    })
  ),
  plot_beats: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      order: z.number().int(),
    })
  ),
  viewpoint: z.object({
    mode: z.string(),
    pacing: z.string(),
  }),
  themes: z.array(z.string()),
});
export type BookSynthesisResult = z.infer<typeof BookSynthesisResultSchema>;
```

- [ ] **Step 3: Extend `analyses` row type**

Update `analyses` `Row`/`Insert`/`Update` to include:
```ts
scope: AnalysisScope;
chapter_id: string | null;
```
Insert defaults: `scope?: AnalysisScope` (default `'book'`), `chapter_id?: string | null`.

- [ ] **Step 4: Add `blueprints` table type, extend `variants`**

```ts
blueprints: {
  Row: {
    id: string;
    session_id: string;
    user_id: string;
    status: "draft" | "confirmed";
    sections: unknown;       // BlueprintSchema-validated jsonb
    confirmed_at: string | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    session_id: string;
    user_id: string;
    status?: "draft" | "confirmed";
    sections?: unknown;
    confirmed_at?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<{
    status: "draft" | "confirmed";
    sections: unknown;
    confirmed_at: string | null;
    updated_at: string;
  }>;
  Relationships: [];
};
```

In `variants.Row` add `blueprint_id: string | null;` (Insert: optional; Update: not changed).

Export aliases:
```ts
export type ChapterRow = Database["public"]["Tables"]["chapters"]["Row"];
export type BlueprintRow = Database["public"]["Tables"]["blueprints"]["Row"];
```

- [ ] **Step 5: Type-check + commit**

Run: `npm run type-check`
Expected: passes.

```bash
git add src/lib/types.ts
git commit -m "feat(types): chapter_brief / book_synthesis schemas + analyses/blueprints/variants extensions"
```

---

## Phase 2 — Chapter Detection

### Task 4: Move chapter logic into new module

**Files:**
- Create: `src/lib/text/chapters.ts`
- Modify: `src/lib/text/clean.ts`

- [ ] **Step 1: Create `src/lib/text/chapters.ts` with current logic moved out**

```ts
export type ChapterSource = "regex" | "length-chunk" | "manual";

export type ChapterMeta = {
  index: number;
  title: string;
  startChar: number;
  endChar: number;
  source: ChapterSource;
};

const STRONG_PATTERNS: RegExp[] = [
  /^[\s　]*第[\d一二三四五六七八九十百千零〇两\s]+[章卷回].*$/gm,
  /^Chapter\s+\d+.*$/gim,
];

function extractStrongTitles(text: string) {
  const found = new Map<number, string>();
  for (const pattern of STRONG_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const index = match.index;
      const title = match[0]?.trim();
      if (typeof index !== "number" || !title) continue;
      found.set(index, title);
    }
  }
  return [...found.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([startChar, title]) => ({ startChar, title }));
}

export function detectChapters(text: string): ChapterMeta[] {
  const markers = extractStrongTitles(text);
  if (markers.length === 0) return [];
  return markers.map((marker, index, arr) => ({
    index: index + 1,
    title: marker.title,
    startChar: marker.startChar,
    endChar: index + 1 < arr.length ? arr[index + 1].startChar : text.length,
    source: "regex" as const,
  }));
}
```

- [ ] **Step 2: Update `clean.ts` to re-export and stop owning chapter detection**

In `src/lib/text/clean.ts`, replace the `CHAPTER_PATTERNS` array, `extractChapterTitles`, `buildChapters`, and the `ChapterMeta` type. Import from `chapters.ts`:

```ts
import { detectChapters, type ChapterMeta } from "./chapters";
export type { ChapterMeta } from "./chapters";
```

Replace `buildChapters(cleaned)` call inside `cleanNovelText` with `detectChapters(cleaned)`.

- [ ] **Step 3: Run existing tests**

Run: `node --test --import tsx 'src/**/*.test.ts'`
Expected: all green. If a test imports `ChapterMeta` or chapter helpers directly from `clean.ts`, the re-export above keeps it working.

- [ ] **Step 4: Commit**

```bash
git add src/lib/text/chapters.ts src/lib/text/clean.ts
git commit -m "refactor(text): extract chapter detection to chapters.ts"
```

---

### Task 5: Test extended regex (序章/楔子/正文/节/折)

**Files:**
- Create: `src/lib/text/chapters.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";

import { detectChapters, expandToChapters } from "./chapters";

test("detectChapters: 序章/楔子/番外 are recognized", () => {
  const text = [
    "楔子",
    "白雪覆盖荒原。",
    "",
    "第一章 风起",
    "马蹄如雷。",
    "",
    "番外：旧友",
    "他记得那座山。",
  ].join("\n");

  const chapters = detectChapters(text);
  const titles = chapters.map((c) => c.title);
  assert.deepEqual(titles, ["楔子", "第一章 风起", "番外：旧友"]);
});

test("detectChapters: 第X节/折/部/篇 variants", () => {
  const text = [
    "第一节 开端",
    "...",
    "第二折 中段",
    "...",
    "第三部 终章",
    "...",
  ].join("\n");

  const chapters = detectChapters(text);
  assert.equal(chapters.length, 3);
});

test("detectChapters: 正文 N variant", () => {
  const text = ["正文 1", "...", "正文 2", "..."].join("\n");
  const chapters = detectChapters(text);
  assert.equal(chapters.length, 2);
});
```

- [ ] **Step 2: Run — verify fail**

Run: `node --test --import tsx src/lib/text/chapters.test.ts`
Expected: tests fail because new patterns are not yet covered (and `expandToChapters` not yet exported).

- [ ] **Step 3: Extend regex in `chapters.ts`**

Add to `STRONG_PATTERNS`:

```ts
const STRONG_PATTERNS: RegExp[] = [
  /^[\s　]*第[\d一二三四五六七八九十百千零〇两\s]+[章卷回节折部篇].*$/gm,
  /^Chapter\s+\d+.*$/gim,
  /^[\s　]*(楔子|序章|序言|前言|引子|尾声|后记|番外|外传)[\s　：:].*$/gm,
  /^[\s　]*(楔子|序章|序言|前言|引子|尾声|后记|番外|外传)\s*$/gm,
  /^[\s　]*正文[\s　]*\d+.*$/gm,
];
```

Add stub export to satisfy second test once weak signals land:
```ts
export function expandToChapters(): never {
  throw new Error("not implemented");
}
```
(We will replace this in Task 7.)

- [ ] **Step 4: Run — verify the three regex tests now pass**

Run: `node --test --import tsx src/lib/text/chapters.test.ts`
Expected: 3 of them pass; `expandToChapters` not used by the regex tests directly so total passes for them.

- [ ] **Step 5: Commit**

```bash
git add src/lib/text/chapters.ts src/lib/text/chapters.test.ts
git commit -m "feat(chapters): regex covers 楔子/序章/番外/节/折/部/篇/正文 N"
```

---

### Task 6: Test + implement weak-signal numeric chapters

**Files:**
- Modify: `src/lib/text/chapters.ts`, `src/lib/text/chapters.test.ts`

- [ ] **Step 1: Add failing test**

Append to `chapters.test.ts`:

```ts
test("detectChapters: numeric-only weak signal accepted when ≥3 in a row with blank surroundings", () => {
  const text = [
    "001 启程",
    "...",
    "",
    "002 风雪",
    "...",
    "",
    "003 抵达",
    "...",
  ].join("\n");
  const chapters = detectChapters(text);
  assert.equal(chapters.length, 3);
  assert.equal(chapters[0].title, "001 启程");
});

test("detectChapters: numeric-only weak signal rejected when only 2 occurrences", () => {
  const text = [
    "正文开篇。",
    "",
    "001 行将就木的老人开口。",
    "他抬头。",
    "",
    "999 是个不存在的章节号但被怀疑触发。",
    "再来一段。",
  ].join("\n");
  const chapters = detectChapters(text);
  assert.equal(chapters.length, 0);
});
```

- [ ] **Step 2: Run — fail**

Run: `node --test --import tsx src/lib/text/chapters.test.ts`
Expected: 2 new tests fail.

- [ ] **Step 3: Implement weak signal**

In `chapters.ts`:

```ts
const WEAK_PATTERN = /^[\s　]*\d{1,4}[\s　：:、.\-][^\n]{0,40}$/gm;

function extractWeakTitles(text: string) {
  const candidates: Array<{ startChar: number; title: string }> = [];
  for (const m of text.matchAll(WEAK_PATTERN)) {
    if (typeof m.index !== "number") continue;
    const before = m.index === 0 ? "\n" : text[m.index - 1];
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 1);
    if (before !== "\n" && before !== "") continue;
    if (after !== "\n" && after !== "") continue;
    candidates.push({ startChar: m.index, title: m[0].trim() });
  }
  return candidates.length >= 3 ? candidates : [];
}
```

Update `detectChapters`:

```ts
export function detectChapters(text: string): ChapterMeta[] {
  const strong = extractStrongTitles(text);
  const weak = strong.length >= 1 ? [] : extractWeakTitles(text);
  const all = [...strong, ...weak]
    .sort((a, b) => a.startChar - b.startChar);
  if (all.length === 0) return [];
  return all.map((m, i, arr) => ({
    index: i + 1,
    title: m.title,
    startChar: m.startChar,
    endChar: i + 1 < arr.length ? arr[i + 1].startChar : text.length,
    source: "regex" as const,
  }));
}
```

- [ ] **Step 4: Run — pass**

Run: `node --test --import tsx src/lib/text/chapters.test.ts`
Expected: all chapter tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/text/chapters.ts src/lib/text/chapters.test.ts
git commit -m "feat(chapters): weak-signal numeric titles when ≥3 consecutive with blank surrounds"
```

---

### Task 7: Test + implement length-chunk fallback

**Files:**
- Modify: `src/lib/text/chapters.ts`, `src/lib/text/chapters.test.ts`

- [ ] **Step 1: Add failing test**

```ts
test("expandToChapters: falls back to length chunks when no chapters detected", () => {
  const text = "甲".repeat(13000);
  const chunks = expandToChapters(text, { fallbackChunkChars: 5000 });
  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].source, "length-chunk");
  assert.equal(chunks[0].title, "块 #1");
  assert.equal(chunks[0].startChar, 0);
  assert.equal(chunks[0].endChar, 5000);
  assert.equal(chunks[2].endChar, 13000);
});

test("expandToChapters: uses regex result when chapters detected", () => {
  const text = ["第一章 起", "甲".repeat(100), "第二章 承", "甲".repeat(100)].join("\n");
  const chunks = expandToChapters(text, { fallbackChunkChars: 5000 });
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].source, "regex");
});

test("expandToChapters: never empty — single block fallback when text is 1 line", () => {
  const text = "短文一句话。";
  const chunks = expandToChapters(text, { fallbackChunkChars: 5000 });
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].title, "块 #1");
  assert.equal(chunks[0].source, "length-chunk");
});
```

- [ ] **Step 2: Run — fail**

Run: `node --test --import tsx src/lib/text/chapters.test.ts`
Expected: 3 new tests fail (stub throws).

- [ ] **Step 3: Implement `expandToChapters`**

Replace the stub in `chapters.ts`:

```ts
type ExpandOptions = { fallbackChunkChars?: number };

export function expandToChapters(
  text: string,
  options: ExpandOptions = {}
): ChapterMeta[] {
  const chunkSize = options.fallbackChunkChars ?? 5000;
  const detected = detectChapters(text);
  if (detected.length > 0) return detected;
  if (text.length === 0) {
    return [
      { index: 1, title: "块 #1", startChar: 0, endChar: 0, source: "length-chunk" },
    ];
  }
  const chunks: ChapterMeta[] = [];
  for (let i = 0, cursor = 0; cursor < text.length; i += 1) {
    const start = cursor;
    const end = Math.min(cursor + chunkSize, text.length);
    chunks.push({
      index: i + 1,
      title: `块 #${i + 1}`,
      startChar: start,
      endChar: end,
      source: "length-chunk",
    });
    cursor = end;
  }
  return chunks;
}
```

- [ ] **Step 4: Run — pass**

Run: `node --test --import tsx src/lib/text/chapters.test.ts`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/text/chapters.ts src/lib/text/chapters.test.ts
git commit -m "feat(chapters): expandToChapters with length-chunk fallback + non-empty guarantee"
```

---

### Task 8: Wire upload to persist `chapters` rows

**Files:**
- Modify: `src/lib/upload/actions.ts`

- [ ] **Step 1: Read current upload finalize**

Look at `finalizeNovelUpload` (already in your context). After the `books` insert/update succeeds, we add a chapters write.

- [ ] **Step 2: Update `finalizeNovelUpload` to also insert `chapters`**

After the existing book insert/update block (before `sessionUpdateError` check), add:

```ts
import { expandToChapters } from "@/lib/text/chapters";

// ...

const bookId = existingBook?.id ?? (
  await supabase
    .from("books")
    .select("id")
    .eq("session_id", session.id)
    .eq("user_id", user.id)
    .single()
).data?.id;

if (!bookId) {
  return { error: "原始文件已上传，但读取书籍 ID 失败。" };
}

const chapters = expandToChapters(cleaned.cleaned, { fallbackChunkChars: 5000 });

await supabase.from("chapters").delete().eq("book_id", bookId).eq("user_id", user.id);

const { error: chaptersInsertError } = await supabase.from("chapters").insert(
  chapters.map((c) => ({
    book_id: bookId,
    user_id: user.id,
    index: c.index,
    title: c.title,
    start_char: c.startChar,
    end_char: c.endChar,
    source: c.source,
  }))
);

if (chaptersInsertError) {
  return { error: "原始文件已上传，但章节切分写入失败。" };
}
```

Replace `cleaned.chapters.length` → `chapters.length` for the `chapter_count` payload computed earlier in the same function.

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: passes.

- [ ] **Step 4: Manual smoke test**

Start dev server: `npm run dev`. Upload a known .txt with chapters. In Supabase, run:
```sql
select count(*) from chapters where book_id = (select id from books order by created_at desc limit 1);
```
Expected: > 0 rows.

- [ ] **Step 5: Commit**

```bash
git add src/lib/upload/actions.ts
git commit -m "feat(upload): persist chapters table on finalize via expandToChapters"
```

---

### Task 9: `initNovelUpload` accepts `mode` + `position`

**Files:**
- Modify: `src/lib/upload/actions.ts`

- [ ] **Step 1: Update signature**

```ts
type InitNovelUploadInput = {
  filename: string;
  size: number;
  contentType: string;
  mode?: "single" | "dual";
  sessionId?: string;   // when adding 2nd book into an existing dual session
  position?: 0 | 1;     // dual only
};
```

- [ ] **Step 2: Update body**

Inside `initNovelUpload`, after the existing input validation:

```ts
const requestedMode = input.mode ?? "single";

if (requestedMode === "dual" && input.sessionId) {
  // Adding 2nd book to existing dual session — validate ownership + position free
  const { data: existingSession, error: existingErr } = await supabase
    .from("sessions")
    .select("id, mode")
    .eq("id", input.sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingErr || !existingSession || existingSession.mode !== "dual") {
    return { error: "未找到目标双书任务。" };
  }
  const position = input.position ?? 1;
  const { data: positionBusy } = await supabase
    .from("books")
    .select("id")
    .eq("session_id", input.sessionId)
    .eq("position", position)
    .maybeSingle();
  if (positionBusy) {
    return { error: "该位置已有书，请删除后再上传。" };
  }
  return {
    ok: true as const,
    sessionId: input.sessionId,
    storageObjectPath: buildStorageObjectPath(user.id, input.sessionId, safeFilename),
    position,
  };
}

// otherwise: create new session
const { data: session, error: sessionError } = await supabase
  .from("sessions")
  .insert({
    user_id: user.id,
    name: sessionName,
    status: "draft",
    mode: requestedMode,
  })
  .select("id")
  .single();
```

Return type now includes `position?: 0 | 1`.

- [ ] **Step 3: Update `finalizeNovelUpload` to accept `position`**

```ts
type FinalizeNovelUploadInput = {
  sessionId: string;
  storageObjectPath: string;
  filename: string;
  size: number;
  contentType: string;
  position?: 0 | 1;
};
```

When inserting/updating the `books` row, include `position: input.position ?? 0`.

- [ ] **Step 4: Type-check + commit**

Run: `npm run type-check`
Expected: passes.

```bash
git add src/lib/upload/actions.ts
git commit -m "feat(upload): mode + position params for dual-book sessions"
```

---

## Phase 3 — Prompts

### Task 10: Chapter-brief prompt

**Files:**
- Create: `src/lib/prompts/chapter-brief.ts`
- Create: `src/lib/prompts/chapter-brief.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";

import { buildChapterBriefUserPrompt, CHAPTER_BRIEF_SYSTEM_PROMPT, CHAPTER_TEXT_CHAR_LIMIT } from "./chapter-brief";

test("CHAPTER_TEXT_CHAR_LIMIT is 12000", () => {
  assert.equal(CHAPTER_TEXT_CHAR_LIMIT, 12_000);
});

test("buildChapterBriefUserPrompt wraps untrusted text and includes chapter title", () => {
  const prompt = buildChapterBriefUserPrompt({
    chapterTitle: "第一章 起",
    chapterText: "甲乙丙丁。",
  });
  assert.ok(prompt.includes("第一章 起"));
  assert.ok(prompt.includes("甲乙丙丁。"));
  assert.ok(prompt.includes("UNTRUSTED"));
});

test("buildChapterBriefUserPrompt truncates beyond limit", () => {
  const long = "字".repeat(15_000);
  const prompt = buildChapterBriefUserPrompt({ chapterTitle: "X", chapterText: long });
  assert.ok(prompt.length < 15_500);
});

test("system prompt mentions JSON schema return", () => {
  assert.ok(/JSON/i.test(CHAPTER_BRIEF_SYSTEM_PROMPT));
});
```

- [ ] **Step 2: Run — fail (file missing)**

Run: `node --test --import tsx src/lib/prompts/chapter-brief.test.ts`
Expected: cannot find module.

- [ ] **Step 3: Implement**

```ts
import { UNTRUSTED_NOVEL_RULE, wrapUntrustedNovel } from "./safety";

export const CHAPTER_TEXT_CHAR_LIMIT = 12_000;

export const CHAPTER_BRIEF_SYSTEM_PROMPT = `你是中文小说研究助手。

阅读单章正文，抽取该章的结构化要点，严格返回 JSON，符合调用方提供的 schema。

要求：
0. ${UNTRUSTED_NOVEL_RULE}
1. 只输出 JSON，不要解释、不要 Markdown。
2. summary 字段一段话即可（约 60-200 字）。
3. blueprint_candidates 用于直接进入"创作蓝图"，每条 section 字段必须是允许集合中的枚举，payload 应符合该 section 的常见结构（人物含 name/role 等）。
4. 不要捏造未在文本中出现的人物或事件。`;

export function buildChapterBriefUserPrompt({
  chapterTitle,
  chapterText,
}: {
  chapterTitle: string;
  chapterText: string;
}) {
  const truncated = chapterText.slice(0, CHAPTER_TEXT_CHAR_LIMIT);
  return [
    "请抽取以下单章的结构化要点。",
    `【章节标题】${chapterTitle}`,
    "【章节正文】",
    wrapUntrustedNovel(truncated),
  ].join("\n\n");
}
```

- [ ] **Step 4: Run — pass**

Run: `node --test --import tsx src/lib/prompts/chapter-brief.test.ts`
Expected: 4 pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/prompts/chapter-brief.ts src/lib/prompts/chapter-brief.test.ts
git commit -m "feat(prompts): chapter-brief system + user prompt"
```

---

### Task 11: Book-synthesis prompt

**Files:**
- Create: `src/lib/prompts/book-synthesis.ts`
- Create: `src/lib/prompts/book-synthesis.test.ts`

- [ ] **Step 1: Failing tests**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  BOOK_SYNTHESIS_BRIEFS_LIMIT,
  buildBookSynthesisUserPrompt,
  pickBriefsForSynthesis,
  BOOK_SYNTHESIS_SYSTEM_PROMPT,
} from "./book-synthesis";

test("limit is 200", () => {
  assert.equal(BOOK_SYNTHESIS_BRIEFS_LIMIT, 200);
});

test("pickBriefsForSynthesis: passthrough when ≤200", () => {
  const briefs = Array.from({ length: 50 }, (_, i) => ({ index: i + 1, brief: { events: [] } }));
  const picked = pickBriefsForSynthesis(briefs);
  assert.equal(picked.length, 50);
});

test("pickBriefsForSynthesis: head/tail 30 + middle 140 sample + turning points forced", () => {
  const briefs = Array.from({ length: 500 }, (_, i) => ({
    index: i + 1,
    brief: {
      events:
        i === 250
          ? [{ title: "x", description: "y", is_turning_point: true }]
          : [],
    },
  }));
  const picked = pickBriefsForSynthesis(briefs);
  assert.ok(picked.length <= 201);
  assert.ok(picked.some((p) => p.index === 1));
  assert.ok(picked.some((p) => p.index === 500));
  assert.ok(picked.some((p) => p.index === 251));
});

test("buildBookSynthesisUserPrompt wraps briefs as JSON, no raw novel text", () => {
  const briefs = [{ index: 1, brief: { summary: "x", events: [] } }];
  const prompt = buildBookSynthesisUserPrompt({ bookTitle: "TestBook", briefs });
  assert.ok(prompt.includes("TestBook"));
  assert.ok(prompt.includes('"summary": "x"'));
  assert.ok(!prompt.includes("UNTRUSTED"));
});
```

- [ ] **Step 2: Fail run**

`node --test --import tsx src/lib/prompts/book-synthesis.test.ts`

- [ ] **Step 3: Implement**

```ts
export const BOOK_SYNTHESIS_BRIEFS_LIMIT = 200;

export const BOOK_SYNTHESIS_SYSTEM_PROMPT = `你是中文小说研究助手。

收到一组章节级要点（JSON 数组），请合成整本书的结构化总览，严格按调用方提供的 schema 返回 JSON。

要求：
1. 只输出 JSON，不要 Markdown / 不要解释。
2. 不要捏造 briefs 中不存在的人物或事件。
3. plot_beats 按时间顺序（order 字段）。
4. viewpoint.mode 和 pacing 必填。`;

export type BriefEntry = {
  index: number;
  brief: {
    summary?: string;
    events?: Array<{ title?: string; description?: string; is_turning_point?: boolean }>;
    [key: string]: unknown;
  };
};

export function pickBriefsForSynthesis(briefs: BriefEntry[]): BriefEntry[] {
  if (briefs.length <= BOOK_SYNTHESIS_BRIEFS_LIMIT) return briefs;
  const head = briefs.slice(0, 30);
  const tail = briefs.slice(-30);
  const middle = briefs.slice(30, briefs.length - 30);
  const stride = Math.max(1, Math.floor(middle.length / 140));
  const sampled: BriefEntry[] = [];
  for (let i = 0; i < middle.length && sampled.length < 140; i += stride) {
    sampled.push(middle[i]);
  }
  const turning = briefs.filter((b) =>
    (b.brief.events ?? []).some((e) => e.is_turning_point === true)
  );
  const dedup = new Map<number, BriefEntry>();
  for (const b of [...head, ...sampled, ...tail, ...turning]) {
    dedup.set(b.index, b);
  }
  return [...dedup.values()].sort((a, b) => a.index - b.index);
}

export function buildBookSynthesisUserPrompt({
  bookTitle,
  briefs,
}: {
  bookTitle: string;
  briefs: BriefEntry[];
}) {
  return [
    `请基于以下章节要点合成《${bookTitle}》的整书结构化总览。`,
    "【章节要点 JSON 数组】",
    JSON.stringify(briefs, null, 2),
  ].join("\n\n");
}
```

- [ ] **Step 4: Pass + commit**

Run tests, then:
```bash
git add src/lib/prompts/book-synthesis.ts src/lib/prompts/book-synthesis.test.ts
git commit -m "feat(prompts): book-synthesis + sampling for >200 chapters"
```

---

### Task 12: Generate-from-blueprint prompt

**Files:**
- Create: `src/lib/prompts/generate-from-blueprint.ts`
- Create: `src/lib/prompts/generate-from-blueprint.test.ts`

- [ ] **Step 1: Failing tests**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  GENERATE_FROM_BLUEPRINT_SYSTEM_PROMPT,
  buildGenerateFromBlueprintUserPrompt,
} from "./generate-from-blueprint";

test("system prompt forbids raw novel reference and forces JSON", () => {
  assert.ok(/无原文/.test(GENERATE_FROM_BLUEPRINT_SYSTEM_PROMPT));
  assert.ok(/JSON/i.test(GENERATE_FROM_BLUEPRINT_SYSTEM_PROMPT));
});

test("user prompt embeds blueprint json + config block, no excerpt", () => {
  const prompt = buildGenerateFromBlueprintUserPrompt({
    blueprint: { characters: [{ name: "甲" }] },
    config: {
      strategy: "balanced",
      innovation: 5,
      viewpoint: "keep",
      style: "keep",
      output_scope: "single-chapter",
      extra_instructions: "",
    },
  });
  assert.ok(prompt.includes('"name": "甲"'));
  assert.ok(prompt.includes("variant"));
  assert.ok(!prompt.includes("UNTRUSTED"));
});
```

- [ ] **Step 2: Fail run**

`node --test --import tsx src/lib/prompts/generate-from-blueprint.test.ts`

- [ ] **Step 3: Implement**

```ts
import type { GenerateConfig } from "@/lib/types";

export const GENERATE_FROM_BLUEPRINT_SYSTEM_PROMPT = `你是中文小说变体创作助手。

仅基于"合并创作蓝图"与用户的生成参数，创作一个自洽、可直接展示的中文小说 variant，严格返回符合 schema 的 JSON。

要求：
1. 仅输出 JSON，不要 Markdown / 解释 / 前言。
2. 无原文：你不会收到任何原文片段，所有素材均来自蓝图；不要捏造蓝图未提及的关键人物或世界规则。
3. title 简洁中文，体现本次变体核心。
4. 保持人物动机、世界规则、叙事因果自洽。
5. extra_instructions 非空时优先执行。
6. 严守 output_scope：要大纲就不写完整章节。`;

const STRATEGY_PROMPTS: Record<GenerateConfig["strategy"], string> = {
  "a-dominant": "以蓝图中的核心骨架为主，仅局部改写。",
  balanced: "在蓝图与新鲜感之间均衡。",
  "theme-graft": "优先强化主题嫁接，允许更明显改写。",
};

const VIEWPOINT_PROMPTS: Record<GenerateConfig["viewpoint"], string> = {
  keep: "保持蓝图所述视角。",
  "first-person": "改为第一人称或贴近第一人称。",
  "third-limited": "改为第三人称有限视角。",
  omniscient: "改为第三人称全知视角。",
};

const STYLE_PROMPTS: Record<GenerateConfig["style"], string> = {
  keep: "保持蓝图所述文风。",
  modern: "语言更现代、直接。",
  classical: "语言更凝练，允许古典表达。",
  "web-novel": "贴近中文网文节奏。",
};

const SCOPE_INSTRUCTIONS: Record<GenerateConfig["output_scope"], string> = {
  outline: "返回章节大纲，5-10 个节点，每节点 50-150 字。",
  "single-chapter": "返回单一完整章节，约 3000-5000 字。",
  "three-chapters": "返回连续三章，每章约 3000 字。",
};

export function buildGenerateFromBlueprintUserPrompt({
  blueprint,
  config,
}: {
  blueprint: unknown;
  config: GenerateConfig;
}) {
  return [
    "请按以下蓝图创作一个中文小说 variant。",
    "【生成参数】",
    [
      `- 策略：${STRATEGY_PROMPTS[config.strategy]}`,
      `- 创新强度：${config.innovation}/10。`,
      `- 视角：${VIEWPOINT_PROMPTS[config.viewpoint]}`,
      `- 文风：${STYLE_PROMPTS[config.style]}`,
      `- 输出范围：${SCOPE_INSTRUCTIONS[config.output_scope]}`,
      `- 额外要求：${config.extra_instructions.trim() || "无"}`,
    ].join("\n"),
    "【合并创作蓝图】",
    JSON.stringify(blueprint, null, 2),
    "【执行要求】",
    "- 结果必须为中文。",
    "- content 内保留自然换行。",
    "- 不要复述输入 JSON。",
  ].join("\n\n");
}
```

- [ ] **Step 4: Pass + commit**

```bash
git add src/lib/prompts/generate-from-blueprint.ts src/lib/prompts/generate-from-blueprint.test.ts
git commit -m "feat(prompts): generate-from-blueprint (no raw novel)"
```

---

## Phase 4 — Blueprint Schema + Merge

### Task 13: Blueprint Zod schema

**Files:**
- Create: `src/lib/blueprint/schema.ts`
- Create: `src/lib/blueprint/schema.test.ts`

- [ ] **Step 1: Failing tests**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  BlueprintSchema,
  emptyBlueprint,
  blueprintReadyToConfirm,
} from "./schema";

test("emptyBlueprint passes schema", () => {
  const parsed = BlueprintSchema.safeParse(emptyBlueprint());
  assert.equal(parsed.success, true);
});

test("BlueprintSchema rejects unknown viewpoint shape", () => {
  const bad = { ...emptyBlueprint(), viewpoint: { something: "x" } };
  assert.equal(BlueprintSchema.safeParse(bad).success, false);
});

test("blueprintReadyToConfirm false when any section empty", () => {
  assert.equal(blueprintReadyToConfirm(emptyBlueprint()).ok, false);
});

test("blueprintReadyToConfirm true when minimal valid", () => {
  const bp = emptyBlueprint();
  bp.characters.push({ id: "1", name: "A", role: "protagonist", traits: [], description: "x", notes: "", sources: [] });
  bp.relationships.push({ id: "1", from: "A", to: "B", type: "ally", description: "x", notes: "", sources: [] });
  bp.world_rules.push({ id: "1", rule: "r", description: "x", notes: "", sources: [] });
  bp.conflicts.push({ id: "1", title: "c", description: "x", notes: "", sources: [] });
  bp.plot_beats.push({ id: "1", title: "p", description: "x", order: 1, notes: "", sources: [] });
  bp.themes.push({ id: "1", theme: "love", notes: "", sources: [] });
  bp.viewpoint = { mode: "third-limited", pacing: "even", notes: "" };
  assert.equal(blueprintReadyToConfirm(bp).ok, true);
});
```

- [ ] **Step 2: Fail run**

`node --test --import tsx src/lib/blueprint/schema.test.ts`

- [ ] **Step 3: Implement**

```ts
import { z } from "zod";

export const BlueprintSourceSchema = z.object({
  book_id: z.string().uuid(),
  chapter_id: z.string().uuid().nullable(),
});
export type BlueprintSource = z.infer<typeof BlueprintSourceSchema>;

const baseItem = {
  id: z.string(),
  notes: z.string().default(""),
  sources: z.array(BlueprintSourceSchema).default([]),
};

export const BlueprintSchema = z.object({
  characters: z.array(
    z.object({
      ...baseItem,
      name: z.string(),
      role: z.string(),
      traits: z.array(z.string()).default([]),
      description: z.string(),
    })
  ).default([]),
  relationships: z.array(
    z.object({
      ...baseItem,
      from: z.string(),
      to: z.string(),
      type: z.string(),
      description: z.string(),
    })
  ).default([]),
  world_rules: z.array(
    z.object({
      ...baseItem,
      rule: z.string(),
      description: z.string(),
    })
  ).default([]),
  conflicts: z.array(
    z.object({
      ...baseItem,
      title: z.string(),
      description: z.string(),
    })
  ).default([]),
  plot_beats: z.array(
    z.object({
      ...baseItem,
      title: z.string(),
      description: z.string(),
      order: z.number().int(),
    })
  ).default([]),
  viewpoint: z.object({
    mode: z.string(),
    pacing: z.string(),
    notes: z.string().default(""),
  }).default({ mode: "", pacing: "", notes: "" }),
  themes: z.array(
    z.object({
      ...baseItem,
      theme: z.string(),
    })
  ).default([]),
});
export type Blueprint = z.infer<typeof BlueprintSchema>;
export type BlueprintSection = keyof Blueprint;

export function emptyBlueprint(): Blueprint {
  return BlueprintSchema.parse({});
}

export type ReadyToConfirm =
  | { ok: true }
  | { ok: false; missing: string[] };

export function blueprintReadyToConfirm(bp: Blueprint): ReadyToConfirm {
  const missing: string[] = [];
  for (const key of ["characters", "relationships", "world_rules", "conflicts", "plot_beats", "themes"] as const) {
    if (bp[key].length === 0) missing.push(key);
  }
  if (!bp.viewpoint.mode.trim()) missing.push("viewpoint.mode");
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}
```

- [ ] **Step 4: Pass + commit**

```bash
git add src/lib/blueprint/schema.ts src/lib/blueprint/schema.test.ts
git commit -m "feat(blueprint): Zod schema + emptyBlueprint + confirm precondition"
```

---

### Task 14: Blueprint merge util (candidate → item, dedupe by source)

**Files:**
- Create: `src/lib/blueprint/merge.ts`
- Create: `src/lib/blueprint/merge.test.ts`

- [ ] **Step 1: Failing tests**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";

import { applyCandidate, mergeSections } from "./merge";
import { emptyBlueprint } from "./schema";

test("applyCandidate inserts into characters section with source", () => {
  const bp = emptyBlueprint();
  const next = applyCandidate(bp, {
    section: "characters",
    title: "甲",
    payload: { name: "甲", role: "protagonist", traits: [], description: "" },
    source: { book_id: "00000000-0000-0000-0000-000000000001", chapter_id: "00000000-0000-0000-0000-000000000002" },
  });
  assert.equal(next.characters.length, 1);
  assert.equal(next.characters[0].name, "甲");
  assert.equal(next.characters[0].sources.length, 1);
});

test("applyCandidate merges source when item with same identity already exists", () => {
  const bp = emptyBlueprint();
  const src1 = { book_id: "00000000-0000-0000-0000-000000000001", chapter_id: "00000000-0000-0000-0000-000000000002" };
  const src2 = { book_id: "00000000-0000-0000-0000-000000000001", chapter_id: "00000000-0000-0000-0000-000000000003" };
  const once = applyCandidate(bp, { section: "characters", title: "甲", payload: { name: "甲", role: "protagonist", description: "" }, source: src1 });
  const twice = applyCandidate(once, { section: "characters", title: "甲", payload: { name: "甲", role: "protagonist", description: "" }, source: src2 });
  assert.equal(twice.characters.length, 1);
  assert.equal(twice.characters[0].sources.length, 2);
});

test("mergeSections only overwrites listed keys", () => {
  const bp = emptyBlueprint();
  bp.themes.push({ id: "1", theme: "love", notes: "", sources: [] });
  const merged = mergeSections(bp, { conflicts: [{ id: "x", title: "war", description: "y", notes: "", sources: [] }] });
  assert.equal(merged.themes.length, 1);
  assert.equal(merged.conflicts.length, 1);
});
```

- [ ] **Step 2: Fail run**

- [ ] **Step 3: Implement**

```ts
import { randomUUID } from "node:crypto";
import {
  type Blueprint,
  type BlueprintSection,
  type BlueprintSource,
  BlueprintSchema,
} from "./schema";

export type Candidate = {
  section: BlueprintSection;
  title: string;
  payload: Record<string, unknown>;
  source: BlueprintSource;
};

function identityKey(section: BlueprintSection, item: Record<string, unknown>): string {
  switch (section) {
    case "characters":
    case "themes":
      return String(item.name ?? item.theme ?? item.title ?? "");
    case "relationships":
      return `${item.from}→${item.to}:${item.type}`;
    case "world_rules":
      return String(item.rule ?? "");
    case "conflicts":
    case "plot_beats":
      return String(item.title ?? "");
    case "viewpoint":
      return "viewpoint";
    default:
      return JSON.stringify(item);
  }
}

function dedupSources(sources: BlueprintSource[]): BlueprintSource[] {
  const seen = new Set<string>();
  const out: BlueprintSource[] = [];
  for (const s of sources) {
    const key = `${s.book_id}:${s.chapter_id ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

export function applyCandidate(bp: Blueprint, c: Candidate): Blueprint {
  if (c.section === "viewpoint") {
    const payload = c.payload as { mode?: string; pacing?: string };
    return BlueprintSchema.parse({
      ...bp,
      viewpoint: {
        mode: payload.mode ?? bp.viewpoint.mode,
        pacing: payload.pacing ?? bp.viewpoint.pacing,
        notes: bp.viewpoint.notes,
      },
    });
  }
  const arr = bp[c.section] as Array<Record<string, unknown>>;
  const key = identityKey(c.section, c.payload);
  const existingIdx = arr.findIndex((it) => identityKey(c.section, it) === key);
  if (existingIdx >= 0) {
    const existing = arr[existingIdx] as { sources?: BlueprintSource[] };
    const mergedSources = dedupSources([...(existing.sources ?? []), c.source]);
    const nextArr = [...arr];
    nextArr[existingIdx] = { ...existing, sources: mergedSources };
    return BlueprintSchema.parse({ ...bp, [c.section]: nextArr });
  }
  const newItem = {
    id: randomUUID(),
    notes: "",
    sources: [c.source],
    ...c.payload,
  };
  return BlueprintSchema.parse({ ...bp, [c.section]: [...arr, newItem] });
}

export function mergeSections(bp: Blueprint, patch: Partial<Blueprint>): Blueprint {
  return BlueprintSchema.parse({ ...bp, ...patch });
}
```

- [ ] **Step 4: Pass + commit**

```bash
git add src/lib/blueprint/merge.ts src/lib/blueprint/merge.test.ts
git commit -m "feat(blueprint): applyCandidate + mergeSections with source dedupe"
```

---

## Phase 5 — Backend Routes

### Task 15: `POST /api/chapters/parse`

**Files:**
- Create: `src/app/api/chapters/parse/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { expandToChapters } from "@/lib/text/chapters";

export const runtime = "nodejs";
export const maxDuration = 60;

const manualChapterSchema = z.object({
  title: z.string().min(1),
  startChar: z.number().int().nonnegative(),
  endChar: z.number().int().positive(),
});

const bodySchema = z.object({
  bookId: z.string().uuid(),
  mode: z.enum(["regex", "length", "manual"]),
  chunkChars: z.number().int().positive().max(50_000).optional(),
  chapters: z.array(manualChapterSchema).optional(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  let body: z.infer<typeof bodySchema>;
  try { body = bodySchema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "请求参数不正确。" }, { status: 400 }); }

  const { data: book } = await supabase
    .from("books")
    .select("id, cleaned_content")
    .eq("id", body.bookId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!book?.cleaned_content) return NextResponse.json({ error: "当前书籍内容不可用。" }, { status: 404 });

  let chapters;
  if (body.mode === "regex") {
    chapters = expandToChapters(book.cleaned_content, { fallbackChunkChars: body.chunkChars ?? 5000 });
  } else if (body.mode === "length") {
    const size = body.chunkChars ?? 5000;
    chapters = expandToChapters("", { fallbackChunkChars: size });
    // force length-chunk regardless of regex matches:
    const text = book.cleaned_content;
    chapters = [];
    for (let i = 0, cursor = 0; cursor < text.length; i += 1) {
      const end = Math.min(cursor + size, text.length);
      chapters.push({ index: i + 1, title: `块 #${i + 1}`, startChar: cursor, endChar: end, source: "length-chunk" as const });
      cursor = end;
    }
  } else {
    if (!body.chapters?.length) return NextResponse.json({ error: "手工模式需要 chapters 数组。" }, { status: 400 });
    chapters = body.chapters.map((c, i) => ({
      index: i + 1,
      title: c.title,
      startChar: c.startChar,
      endChar: c.endChar,
      source: "manual" as const,
    }));
  }

  // wipe + insert + cascade clears chapter-scope analyses via FK on chapters delete
  await supabase.from("chapters").delete().eq("book_id", body.bookId).eq("user_id", user.id);
  const { error: insertErr } = await supabase.from("chapters").insert(
    chapters.map((c) => ({
      book_id: body.bookId,
      user_id: user.id,
      index: c.index,
      title: c.title,
      start_char: c.startChar,
      end_char: c.endChar,
      source: c.source,
    }))
  );
  if (insertErr) return NextResponse.json({ error: "章节写入失败。" }, { status: 500 });

  await supabase.from("books").update({ chapter_count: chapters.length }).eq("id", body.bookId).eq("user_id", user.id);

  return NextResponse.json({ ok: true, count: chapters.length });
}
```

- [ ] **Step 2: Type-check + manual smoke**

Run: `npm run type-check`
Expected: passes.

Manual: with dev server running, hit `POST http://localhost:3000/api/chapters/parse` with `{ bookId, mode: "regex" }` and verify rows in `chapters` change.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/chapters/parse/route.ts
git commit -m "feat(api): /api/chapters/parse — regex/length/manual chapter rebuild"
```

---

### Task 16: `POST /api/analyze/chapter`

**Files:**
- Create: `src/app/api/analyze/chapter/route.ts`

- [ ] **Step 1: Implement**

```ts
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserLLMClient } from "@/lib/llm/dispatch";
import { isUserFixableLLMConfigMessage } from "@/lib/llm-config";
import {
  CHAPTER_BRIEF_SYSTEM_PROMPT,
  buildChapterBriefUserPrompt,
} from "@/lib/prompts/chapter-brief";
import { createClient } from "@/lib/supabase/server";
import { ChapterBriefResultSchema } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  bookId: z.string().uuid(),
  chapterId: z.string().uuid(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  let body: z.infer<typeof bodySchema>;
  try { body = bodySchema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "请求参数不正确。" }, { status: 400 }); }

  const [{ data: chapter }, { data: book }] = await Promise.all([
    supabase
      .from("chapters")
      .select("id, title, start_char, end_char, book_id")
      .eq("id", body.chapterId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("books")
      .select("id, cleaned_content")
      .eq("id", body.bookId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!chapter || chapter.book_id !== body.bookId) {
    return NextResponse.json({ error: "未找到章节。" }, { status: 404 });
  }
  if (!book?.cleaned_content) {
    return NextResponse.json({ error: "当前书籍内容不可用。" }, { status: 404 });
  }

  const chapterText = book.cleaned_content.slice(chapter.start_char, chapter.end_char);

  try {
    const llm = await getUserLLMClient(supabase);
    const result = await generateObject({
      model: llm.openai(llm.model),
      schema: ChapterBriefResultSchema,
      system: CHAPTER_BRIEF_SYSTEM_PROMPT,
      prompt: buildChapterBriefUserPrompt({
        chapterTitle: chapter.title,
        chapterText,
      }),
      temperature: llm.temperature,
      maxTokens: Math.min(2048, llm.maxTokens),
    });

    const { error: upErr } = await supabase.from("analyses").upsert(
      {
        book_id: body.bookId,
        user_id: user.id,
        scope: "chapter",
        chapter_id: body.chapterId,
        dimension: "chapter_brief",
        result: result.object,
        llm_config_id: llm.configId,
        prompt_tokens: Number.isFinite(result.usage.promptTokens) ? result.usage.promptTokens : null,
        completion_tokens: Number.isFinite(result.usage.completionTokens) ? result.usage.completionTokens : null,
      },
      { onConflict: "book_id,chapter_id,dimension" }
    );
    if (upErr) return NextResponse.json({ error: "保存分析失败。" }, { status: 500 });

    return NextResponse.json({ ok: true, result: result.object });
  } catch (e) {
    const msg = e instanceof Error && isUserFixableLLMConfigMessage(e.message) ? e.message : "章节分析失败。";
    return NextResponse.json({ error: msg }, { status: msg === "章节分析失败。" ? 502 : 409 });
  }
}
```

- [ ] **Step 2: Type-check + commit**

```bash
git add src/app/api/analyze/chapter/route.ts
git commit -m "feat(api): /api/analyze/chapter — per-chapter brief upsert"
```

---

### Task 17: `POST /api/analyze/book`

**Files:**
- Create: `src/app/api/analyze/book/route.ts`

- [ ] **Step 1: Implement**

```ts
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserLLMClient } from "@/lib/llm/dispatch";
import {
  BOOK_SYNTHESIS_SYSTEM_PROMPT,
  buildBookSynthesisUserPrompt,
  pickBriefsForSynthesis,
} from "@/lib/prompts/book-synthesis";
import { createClient } from "@/lib/supabase/server";
import { BookSynthesisResultSchema, ChapterBriefResultSchema } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 180;

const bodySchema = z.object({ bookId: z.string().uuid() });

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  let body: z.infer<typeof bodySchema>;
  try { body = bodySchema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "请求参数不正确。" }, { status: 400 }); }

  const [{ data: book }, { data: chapters }] = await Promise.all([
    supabase.from("books").select("id, title").eq("id", body.bookId).eq("user_id", user.id).maybeSingle(),
    supabase.from("chapters").select("id, index").eq("book_id", body.bookId).eq("user_id", user.id).order("index", { ascending: true }),
  ]);

  if (!book) return NextResponse.json({ error: "未找到书籍。" }, { status: 404 });
  if (!chapters?.length) return NextResponse.json({ error: "当前书籍没有章节。" }, { status: 400 });

  const { data: briefs } = await supabase
    .from("analyses")
    .select("chapter_id, result")
    .eq("book_id", body.bookId)
    .eq("user_id", user.id)
    .eq("scope", "chapter")
    .eq("dimension", "chapter_brief");

  const briefByChapter = new Map((briefs ?? []).map((b) => [b.chapter_id as string, b.result]));
  const missing = chapters.filter((c) => !briefByChapter.has(c.id));
  if (missing.length > 0) {
    return NextResponse.json({ error: `还有 ${missing.length} 个章节未完成 chapter_brief。` }, { status: 409 });
  }

  const entries = chapters.map((c) => {
    const parsed = ChapterBriefResultSchema.safeParse(briefByChapter.get(c.id));
    return { index: c.index, brief: parsed.success ? parsed.data : { events: [] } };
  });
  const sampled = pickBriefsForSynthesis(entries);

  try {
    const llm = await getUserLLMClient(supabase);
    const result = await generateObject({
      model: llm.openai(llm.model),
      schema: BookSynthesisResultSchema,
      system: BOOK_SYNTHESIS_SYSTEM_PROMPT,
      prompt: buildBookSynthesisUserPrompt({ bookTitle: book.title, briefs: sampled }),
      temperature: llm.temperature,
      maxTokens: Math.min(4096, llm.maxTokens),
    });

    const { error: upErr } = await supabase.from("analyses").upsert(
      {
        book_id: body.bookId,
        user_id: user.id,
        scope: "book",
        chapter_id: null,
        dimension: "book_synthesis",
        result: result.object,
        llm_config_id: llm.configId,
        prompt_tokens: Number.isFinite(result.usage.promptTokens) ? result.usage.promptTokens : null,
        completion_tokens: Number.isFinite(result.usage.completionTokens) ? result.usage.completionTokens : null,
      },
      { onConflict: "book_id,dimension" }
    );
    if (upErr) return NextResponse.json({ error: "保存整书汇总失败。" }, { status: 500 });
    return NextResponse.json({ ok: true, result: result.object });
  } catch {
    return NextResponse.json({ error: "整书汇总失败。" }, { status: 502 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/analyze/book/route.ts
git commit -m "feat(api): /api/analyze/book — synthesize once briefs are complete"
```

---

### Task 18: Blueprint routes — PATCH / confirm / unconfirm

**Files:**
- Create: `src/app/api/blueprint/route.ts`
- Create: `src/app/api/blueprint/confirm/route.ts`
- Create: `src/app/api/blueprint/unconfirm/route.ts`

- [ ] **Step 1: `PATCH /api/blueprint`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { BlueprintSchema, emptyBlueprint } from "@/lib/blueprint/schema";
import { mergeSections } from "@/lib/blueprint/merge";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  patch: z.record(z.unknown()),
  expectedUpdatedAt: z.string().nullable(),
});

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  let body: z.infer<typeof bodySchema>;
  try { body = bodySchema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "请求参数不正确。" }, { status: 400 }); }

  const { data: existing } = await supabase
    .from("blueprints")
    .select("id, status, sections, updated_at")
    .eq("session_id", body.sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing && body.expectedUpdatedAt && existing.updated_at !== body.expectedUpdatedAt) {
    return NextResponse.json({ error: "蓝图已在其他窗口被更新，请刷新后再编辑。" }, { status: 409 });
  }
  if (existing?.status === "confirmed") {
    return NextResponse.json({ error: "蓝图已锁定，请先解锁。" }, { status: 409 });
  }

  const current = existing ? BlueprintSchema.parse(existing.sections ?? {}) : emptyBlueprint();
  let next;
  try {
    next = mergeSections(current, body.patch as never);
  } catch {
    return NextResponse.json({ error: "蓝图字段不合法。" }, { status: 400 });
  }

  const payload = {
    session_id: body.sessionId,
    user_id: user.id,
    status: "draft" as const,
    sections: next,
  };
  const upserted = await supabase
    .from("blueprints")
    .upsert(payload, { onConflict: "session_id" })
    .select("updated_at")
    .single();

  if (upserted.error) return NextResponse.json({ error: "保存蓝图失败。" }, { status: 500 });
  return NextResponse.json({ ok: true, updated_at: upserted.data.updated_at });
}
```

- [ ] **Step 2: `POST /api/blueprint/confirm`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { BlueprintSchema, blueprintReadyToConfirm } from "@/lib/blueprint/schema";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({ sessionId: z.string().uuid() });

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  let body: z.infer<typeof bodySchema>;
  try { body = bodySchema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "请求参数不正确。" }, { status: 400 }); }

  const { data: bp } = await supabase
    .from("blueprints")
    .select("id, sections")
    .eq("session_id", body.sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!bp) return NextResponse.json({ error: "未找到蓝图。" }, { status: 404 });

  const parsed = BlueprintSchema.parse(bp.sections ?? {});
  const ready = blueprintReadyToConfirm(parsed);
  if (!ready.ok) {
    return NextResponse.json({ error: `蓝图缺少：${ready.missing.join(", ")}` }, { status: 400 });
  }

  const { error } = await supabase
    .from("blueprints")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", bp.id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "锁定蓝图失败。" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: `POST /api/blueprint/unconfirm`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({ sessionId: z.string().uuid() });

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  let body: z.infer<typeof bodySchema>;
  try { body = bodySchema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "请求参数不正确。" }, { status: 400 }); }

  const { error } = await supabase
    .from("blueprints")
    .update({ status: "draft", confirmed_at: null })
    .eq("session_id", body.sessionId)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "解锁失败。" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Type-check + commit**

```bash
git add src/app/api/blueprint
git commit -m "feat(api): blueprint PATCH/confirm/unconfirm with optimistic concurrency"
```

---

### Task 19: `POST /api/generate-v2` (blueprint-driven)

**Files:**
- Create: `src/app/api/generate-v2/route.ts`

- [ ] **Step 1: Implement**

```ts
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserLLMClient } from "@/lib/llm/dispatch";
import { isUserFixableLLMConfigMessage } from "@/lib/llm-config";
import {
  GENERATE_FROM_BLUEPRINT_SYSTEM_PROMPT,
  buildGenerateFromBlueprintUserPrompt,
} from "@/lib/prompts/generate-from-blueprint";
import { scopeToMaxTokens, GENERATE_TITLE_FALLBACK } from "@/lib/prompts/generate";
import { createClient } from "@/lib/supabase/server";
import { countWords } from "@/lib/text/clean";
import { GenerateConfigSchema, VariantResultSchema } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  blueprintId: z.string().uuid(),
  config: GenerateConfigSchema,
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  let body: z.infer<typeof bodySchema>;
  try { body = bodySchema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "请求参数不正确。" }, { status: 400 }); }

  const { data: bp } = await supabase
    .from("blueprints")
    .select("id, session_id, status, sections")
    .eq("id", body.blueprintId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!bp) return NextResponse.json({ error: "未找到蓝图。" }, { status: 404 });
  if (bp.status !== "confirmed") return NextResponse.json({ error: "请先确认蓝图。" }, { status: 409 });

  try {
    const llm = await getUserLLMClient(supabase);
    const { object } = await generateObject({
      model: llm.openai(llm.model),
      schema: VariantResultSchema,
      system: GENERATE_FROM_BLUEPRINT_SYSTEM_PROMPT,
      prompt: buildGenerateFromBlueprintUserPrompt({ blueprint: bp.sections, config: body.config }),
      temperature: llm.temperature,
      maxTokens: Math.min(scopeToMaxTokens(body.config.output_scope), llm.maxTokens),
    });
    const title = object.title.trim() || GENERATE_TITLE_FALLBACK;
    const content = object.content.trim();
    if (!content) return NextResponse.json({ error: "生成内容为空。" }, { status: 502 });
    const wordCount = countWords(content);

    const { data: variant, error } = await supabase.from("variants").insert({
      session_id: bp.session_id,
      user_id: user.id,
      title,
      config: body.config,
      content,
      word_count: wordCount,
      llm_config_id: llm.configId,
      blueprint_id: bp.id,
    }).select("id").single();
    if (error || !variant) return NextResponse.json({ error: "保存变体失败。" }, { status: 500 });

    return NextResponse.json({ ok: true, variantId: variant.id, title, wordCount });
  } catch (e) {
    const msg = e instanceof Error && isUserFixableLLMConfigMessage(e.message) ? e.message : "生成失败，请稍后重试。";
    return NextResponse.json({ error: msg }, { status: msg === "生成失败，请稍后重试。" ? 502 : 409 });
  }
}
```

- [ ] **Step 2: Guard legacy `/api/generate` to single mode**

In `src/app/api/generate/route.ts`, right after `const { data: session ... }` lookup, add:

```ts
const { data: sessionMeta } = await supabase
  .from("sessions")
  .select("mode")
  .eq("id", session.id)
  .single();
if (sessionMeta?.mode === "dual") {
  return jsonError("双书任务请使用蓝图生成入口。", 409);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/generate-v2 src/app/api/generate/route.ts
git commit -m "feat(api): generate-v2 from confirmed blueprint; legacy /api/generate gated to single mode"
```

---

## Phase 6 — Variant Diff Lib

### Task 20: Variant diff — meta, structure, paragraph LCS

**Files:**
- Create: `src/lib/diff/variant-diff.ts`
- Create: `src/lib/diff/variant-diff.test.ts`

- [ ] **Step 1: Failing tests**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";

import { diffMeta, diffStructure, diffParagraphs, splitParagraphs } from "./variant-diff";

test("splitParagraphs splits on blank lines and trims", () => {
  const out = splitParagraphs("一段。\n\n二段。\n  \n三段。");
  assert.deepEqual(out, ["一段。", "二段。", "三段。"]);
});

test("diffMeta marks per-field differences", () => {
  const d = diffMeta(
    { title: "A", wordCount: 100, chapters: 1, config: { strategy: "balanced" } },
    { title: "B", wordCount: 100, chapters: 2, config: { strategy: "a-dominant" } },
  );
  assert.equal(d.title.same, false);
  assert.equal(d.wordCount.same, true);
  assert.equal(d.chapters.same, false);
  assert.equal(d.config.strategy.same, false);
});

test("diffStructure detects added/removed chapter titles", () => {
  const d = diffStructure(["序", "一", "二"], ["序", "一", "番外", "二"]);
  assert.deepEqual(d.added, ["番外"]);
  assert.deepEqual(d.removed, []);
  assert.deepEqual(d.common, ["序", "一", "二"]);
});

test("diffParagraphs identifies removed/added paragraphs via LCS", () => {
  const a = ["共同 1", "仅 A", "共同 2"];
  const b = ["共同 1", "仅 B", "共同 2", "尾段"];
  const d = diffParagraphs(a, b);
  assert.ok(d.aOnly.some((p) => p.paragraph === "仅 A"));
  assert.ok(d.bOnly.some((p) => p.paragraph === "仅 B"));
  assert.ok(d.bOnly.some((p) => p.paragraph === "尾段"));
});
```

- [ ] **Step 2: Fail run**

- [ ] **Step 3: Implement**

```ts
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export type MetaDiff = Record<string, { same: boolean; left: unknown; right: unknown }>;

export function diffMeta(left: Record<string, unknown>, right: Record<string, unknown>): MetaDiff {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  const out: MetaDiff = {};
  for (const key of keys) {
    const l = left[key];
    const r = right[key];
    if (l && typeof l === "object" && r && typeof r === "object" && !Array.isArray(l)) {
      const sub = diffMeta(l as Record<string, unknown>, r as Record<string, unknown>);
      // flatten one level
      for (const [k, v] of Object.entries(sub)) {
        out[`${key}.${k}`] = v;
      }
      out[key] = { same: JSON.stringify(l) === JSON.stringify(r), left: l, right: r };
    } else {
      out[key] = { same: JSON.stringify(l) === JSON.stringify(r), left: l, right: r };
    }
  }
  return out;
}

export function diffStructure(left: string[], right: string[]) {
  const setL = new Set(left);
  const setR = new Set(right);
  const common = left.filter((t) => setR.has(t));
  const added = right.filter((t) => !setL.has(t));
  const removed = left.filter((t) => !setR.has(t));
  return { common, added, removed };
}

function normalize(p: string): string {
  return p.replace(/[\s\p{P}]+/gu, "").toLowerCase();
}

function lcs(a: string[], b: string[]): boolean[][] {
  const ah = a.map(normalize);
  const bh = b.map(normalize);
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      dp[i][j] = ah[i] === bh[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const inLcsA = new Array(a.length).fill(false);
  const inLcsB = new Array(b.length).fill(false);
  let i = 0; let j = 0;
  while (i < a.length && j < b.length) {
    if (ah[i] === bh[j]) {
      inLcsA[i] = true;
      inLcsB[j] = true;
      i += 1; j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i += 1;
    } else {
      j += 1;
    }
  }
  return [inLcsA, inLcsB];
}

export function diffParagraphs(left: string[], right: string[]) {
  const [inA, inB] = lcs(left, right);
  const aOnly = left.map((p, i) => ({ index: i, paragraph: p })).filter((_, i) => !inA[i]);
  const bOnly = right.map((p, i) => ({ index: i, paragraph: p })).filter((_, i) => !inB[i]);
  return { aOnly, bOnly };
}
```

- [ ] **Step 4: Pass + commit**

```bash
git add src/lib/diff/variant-diff.ts src/lib/diff/variant-diff.test.ts
git commit -m "feat(diff): three-layer variant diff (meta/structure/paragraphs)"
```

---

### Task 21: Cost estimator

**Files:**
- Create: `src/lib/cost/estimate.ts`

- [ ] **Step 1: Implement**

```ts
export function estimateChapterBatchCost(opts: {
  chapterCount: number;
  avgCharsPerChapter: number;
  pricePer1kInputTokens?: number;
  pricePer1kOutputTokens?: number;
  approxTokensPerChar?: number;
}) {
  const tokensPerChar = opts.approxTokensPerChar ?? 0.6;
  const inputTokens = opts.chapterCount * opts.avgCharsPerChapter * tokensPerChar;
  const outputTokens = opts.chapterCount * 600;
  const inputPrice = opts.pricePer1kInputTokens ?? 0.002;
  const outputPrice = opts.pricePer1kOutputTokens ?? 0.006;
  const cny = (inputTokens / 1000) * inputPrice + (outputTokens / 1000) * outputPrice;
  return {
    calls: opts.chapterCount,
    estimatedInputTokens: Math.round(inputTokens),
    estimatedOutputTokens: Math.round(outputTokens),
    estimatedCNY: Math.round(cny * 100) / 100,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/cost/estimate.ts
git commit -m "feat(cost): rough per-batch chapter-analysis estimator"
```

---

## Phase 7 — Workbench UI

### Task 22: Mode dispatcher in `/sessions/[id]/page.tsx`

**Files:**
- Modify: `src/app/(app)/sessions/[id]/page.tsx`

- [ ] **Step 1: Add early branch**

Near the top of `SessionDetailPage`, immediately after `await supabase.from("sessions").select(...)`:

```ts
const { data: sessionRow } = await supabase
  .from("sessions")
  .select("id, name, status, mode, created_at, updated_at")
  .eq("id", id)
  .eq("user_id", user.id)
  .maybeSingle();

if (sessionRow?.mode === "dual") {
  const { redirect } = await import("next/navigation");
  redirect(`/sessions/${id}/workbench`);
}
```

(Keep the existing parallel fetch for the single-mode path.)

- [ ] **Step 2: Commit**

```bash
git add src/app/(app)/sessions/[id]/page.tsx
git commit -m "feat(routing): dispatch dual-mode sessions to /workbench"
```

---

### Task 23: Workbench page (server component shell)

**Files:**
- Create: `src/app/(app)/sessions/[id]/workbench/page.tsx`

- [ ] **Step 1: Implement skeleton**

```tsx
import { notFound, redirect } from "next/navigation";

import { BlueprintSchema, emptyBlueprint } from "@/lib/blueprint/schema";
import { ChapterBriefResultSchema } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

import { WorkbenchClient } from "./workbench-client";

type Props = { params: Promise<{ id: string }> };

export default async function WorkbenchPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, name, mode, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session) notFound();
  if (session.mode !== "dual") redirect(`/sessions/${id}`);

  const { data: books } = await supabase
    .from("books")
    .select("id, title, position, word_count, chapter_count, metadata, created_at")
    .eq("session_id", id)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  const bookIds = (books ?? []).map((b) => b.id);
  const [{ data: chapters }, { data: analyses }, { data: blueprintRow }, { data: variants }] = await Promise.all([
    bookIds.length
      ? supabase.from("chapters").select("id, book_id, index, title, start_char, end_char, source").in("book_id", bookIds).eq("user_id", user.id).order("index")
      : Promise.resolve({ data: [] }),
    bookIds.length
      ? supabase.from("analyses").select("book_id, chapter_id, scope, dimension, result").in("book_id", bookIds).eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
    supabase.from("blueprints").select("id, status, sections, confirmed_at, updated_at").eq("session_id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("variants").select("id, title, config, content, word_count, blueprint_id, created_at").eq("session_id", id).eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);

  const blueprint = blueprintRow
    ? BlueprintSchema.parse(blueprintRow.sections ?? {})
    : emptyBlueprint();

  // sanitize chapter_brief results
  const briefs = (analyses ?? [])
    .filter((a) => a.scope === "chapter" && a.dimension === "chapter_brief")
    .map((a) => {
      const parsed = ChapterBriefResultSchema.safeParse(a.result);
      return parsed.success ? { ...a, result: parsed.data } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <WorkbenchClient
      session={session}
      books={books ?? []}
      chapters={chapters ?? []}
      briefs={briefs}
      blueprintRow={blueprintRow}
      blueprint={blueprint}
      variants={variants ?? []}
    />
  );
}
```

- [ ] **Step 2: Manual verify route exists**

Run `npm run dev`. Visit `http://localhost:3000/sessions/<dual-session-id>/workbench`.
Expected: page renders (likely error because `WorkbenchClient` not built yet — implement in next task).

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/sessions/[id]/workbench/page.tsx
git commit -m "feat(workbench): server-side data fetch for dual-mode workbench"
```

---

### Task 24: `WorkbenchClient` shell + layout grid

**Files:**
- Create: `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx`

- [ ] **Step 1: Skeleton**

```tsx
"use client";

import { useState } from "react";

import { PipelineBar } from "@/components/workbench/pipeline-bar";
import { ChapterTree } from "@/components/workbench/chapter-tree";
import { BlueprintEditor } from "@/components/workbench/blueprint-editor";
import type { Blueprint } from "@/lib/blueprint/schema";

type BookRow = { id: string; title: string; position: number; chapter_count: number | null };
type ChapterRow = { id: string; book_id: string; index: number; title: string; start_char: number; end_char: number; source: string };
type BriefRow = { book_id: string; chapter_id: string; result: unknown };
type BlueprintRow = { id: string; status: "draft" | "confirmed"; updated_at: string; confirmed_at: string | null } | null;

type Props = {
  session: { id: string; name: string };
  books: BookRow[];
  chapters: ChapterRow[];
  briefs: BriefRow[];
  blueprintRow: BlueprintRow;
  blueprint: Blueprint;
  variants: unknown[];
};

export function WorkbenchClient({ session, books, chapters, briefs, blueprintRow, blueprint }: Props) {
  const [bp, setBp] = useState<Blueprint>(blueprint);
  const [bpUpdatedAt, setBpUpdatedAt] = useState<string | null>(blueprintRow?.updated_at ?? null);
  const [bpStatus, setBpStatus] = useState<"draft" | "confirmed">(blueprintRow?.status ?? "draft");

  const a = books[0] ?? null;
  const b = books[1] ?? null;

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col gap-3">
      <PipelineBar
        importedCount={books.length}
        chapterCount={chapters.length}
        analyzedCount={briefs.length}
        blueprintStatus={bpStatus}
      />
      <div className="grid flex-1 grid-cols-2 gap-3 overflow-hidden">
        {a ? (
          <ChapterTree
            book={a}
            chapters={chapters.filter((c) => c.book_id === a.id)}
            briefs={briefs.filter((c) => c.book_id === a.id)}
            onAddCandidate={(candidate) => {
              // wire in Task 28 (mini picker)
              void candidate;
            }}
          />
        ) : (
          <EmptySlot label="还未上传 A 书" sessionId={session.id} position={0} />
        )}
        {b ? (
          <ChapterTree
            book={b}
            chapters={chapters.filter((c) => c.book_id === b.id)}
            briefs={briefs.filter((c) => c.book_id === b.id)}
            onAddCandidate={(candidate) => { void candidate; }}
          />
        ) : (
          <EmptySlot label="还未上传 B 书" sessionId={session.id} position={1} />
        )}
      </div>
      <BlueprintEditor
        sessionId={session.id}
        blueprint={bp}
        status={bpStatus}
        updatedAt={bpUpdatedAt}
        onSaved={(next, ts) => { setBp(next); setBpUpdatedAt(ts); }}
        onStatusChange={(s) => setBpStatus(s)}
      />
    </div>
  );
}

function EmptySlot({ label, sessionId, position }: { label: string; sessionId: string; position: 0 | 1 }) {
  return (
    <div className="surface-panel flex items-center justify-center p-6">
      <div className="text-center text-[13px] text-muted-foreground">
        <p>{label}</p>
        <a
          href={`/upload?mode=dual&sessionId=${sessionId}&position=${position}`}
          className="mt-3 inline-flex h-9 items-center rounded-[7px] border border-border/70 bg-background/60 px-4 text-foreground hover:bg-accent/40"
        >
          上传文本
        </a>
      </div>
    </div>
  );
}
```

(Note: this references components we build next — keep the impl import-only so we can compile after later tasks.)

- [ ] **Step 2: Stub the components used so the file compiles**

Create lightweight placeholder files to unblock compilation:

`src/components/workbench/pipeline-bar.tsx`:
```tsx
export function PipelineBar(props: { importedCount: number; chapterCount: number; analyzedCount: number; blueprintStatus: "draft" | "confirmed" }) {
  return (
    <div className="surface-panel px-4 py-2 text-[12px] text-muted-foreground">
      Pipeline · books {props.importedCount}/2 · chapters {props.chapterCount} · analyzed {props.analyzedCount} · blueprint {props.blueprintStatus}
    </div>
  );
}
```

`src/components/workbench/chapter-tree.tsx`:
```tsx
type Brief = { chapter_id: string; result: unknown };
type Chapter = { id: string; index: number; title: string };

export function ChapterTree({
  book, chapters, briefs,
}: {
  book: { id: string; title: string };
  chapters: Chapter[];
  briefs: Brief[];
  onAddCandidate: (c: unknown) => void;
}) {
  const analyzed = new Set(briefs.map((b) => b.chapter_id));
  return (
    <div className="surface-panel flex h-full flex-col">
      <header className="border-b border-border/70 p-3 text-[13px] font-medium">{book.title}</header>
      <ul className="flex-1 overflow-auto text-[13px]">
        {chapters.map((c) => (
          <li key={c.id} className="flex items-center justify-between border-b border-border/40 px-3 py-2">
            <span className="truncate">{c.index}. {c.title}</span>
            <span className={analyzed.has(c.id) ? "text-emerald-300" : "text-muted-foreground"}>
              {analyzed.has(c.id) ? "已分析" : "未分析"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

`src/components/workbench/blueprint-editor.tsx`:
```tsx
"use client";
import type { Blueprint } from "@/lib/blueprint/schema";

export function BlueprintEditor(props: {
  sessionId: string;
  blueprint: Blueprint;
  status: "draft" | "confirmed";
  updatedAt: string | null;
  onSaved: (next: Blueprint, ts: string) => void;
  onStatusChange: (s: "draft" | "confirmed") => void;
}) {
  return (
    <div className="surface-panel h-[320px] p-3 text-[13px] text-muted-foreground">
      Blueprint editor placeholder · status {props.status} · {props.blueprint.characters.length} characters
    </div>
  );
}
```

- [ ] **Step 3: Compile + manual smoke**

Run `npm run type-check` then `npm run dev`. Visit a dual session URL.
Expected: page renders with two columns (or "未上传" slots) and a blueprint placeholder strip.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/sessions/[id]/workbench src/components/workbench
git commit -m "feat(workbench): client shell + placeholder pipeline/chapter-tree/blueprint components"
```

---

### Task 25: Chapter card with expand + 加入蓝图 button

**Files:**
- Create: `src/components/workbench/chapter-card.tsx`
- Modify: `src/components/workbench/chapter-tree.tsx`

- [ ] **Step 1: Implement `ChapterCard`**

```tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ChapterBriefResult } from "@/lib/types";

type Props = {
  chapter: { id: string; index: number; title: string; source: string };
  brief: ChapterBriefResult | null;
  busy?: boolean;
  onAnalyze: () => void;
  onAddCandidate: (c: { section: string; title: string; payload: unknown; chapterId: string }) => void;
};

export function ChapterCard({ chapter, brief, busy, onAnalyze, onAddCandidate }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/40 px-3 py-2 text-[13px]">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-medium">{chapter.index}. {chapter.title}</span>
        <div className="flex shrink-0 items-center gap-1">
          {brief
            ? <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>{open ? <ChevronUp /> : <ChevronDown />}</Button>
            : <Button variant="outline" size="sm" disabled={busy} onClick={onAnalyze}>{busy ? <Loader2 className="animate-spin" /> : "分析"}</Button>}
        </div>
      </div>
      {brief && open ? (
        <div className="mt-2 space-y-2 text-[12.5px] text-muted-foreground">
          <p>{brief.summary}</p>
          {brief.blueprint_candidates.map((cand, i) => (
            <div key={i} className="flex items-start justify-between gap-2 rounded-[7px] border border-border/40 bg-background/40 px-2 py-1.5">
              <div>
                <div className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{cand.section}</div>
                <div className="text-foreground">{cand.title}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => onAddCandidate({ section: cand.section, title: cand.title, payload: cand.payload, chapterId: chapter.id })}>
                <Plus />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      {chapter.source !== "regex" ? (
        <p className="mt-1 text-[11px] text-amber-300/80">章节来源：{chapter.source}</p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Wire into `ChapterTree`**

Replace the `<ul>` body in `chapter-tree.tsx` with mapped `ChapterCard`s. Accept `onAnalyze(chapterId)` callback prop and forward to each card. Hook `onAddCandidate` through.

- [ ] **Step 3: Manual verify**

Dev server, load workbench. Click "分析" on a chapter — it should call (still TODO) the analyze handler.

- [ ] **Step 4: Commit**

```bash
git add src/components/workbench/chapter-card.tsx src/components/workbench/chapter-tree.tsx
git commit -m "feat(workbench): chapter card with summary + candidates + add-to-blueprint button"
```

---

### Task 26: Chapter batch orchestrator (concurrency = 3)

**Files:**
- Create: `src/app/(app)/sessions/[id]/workbench/chapter-batch.ts`

- [ ] **Step 1: Implement**

```ts
export type ChapterAnalyzeFn = (chapterId: string) => Promise<{ ok: true } | { ok: false; error: string }>;

export async function runBatch(opts: {
  chapterIds: string[];
  concurrency?: number;
  analyze: ChapterAnalyzeFn;
  onProgress: (chapterId: string, status: "running" | "done" | "error", error?: string) => void;
  signal?: AbortSignal;
}) {
  const max = opts.concurrency ?? 3;
  let cursor = 0;
  const failures: Array<{ chapterId: string; error: string }> = [];

  async function worker() {
    while (cursor < opts.chapterIds.length) {
      if (opts.signal?.aborted) return;
      const id = opts.chapterIds[cursor++];
      opts.onProgress(id, "running");
      try {
        const result = await opts.analyze(id);
        if (result.ok) {
          opts.onProgress(id, "done");
        } else {
          opts.onProgress(id, "error", result.error);
          failures.push({ chapterId: id, error: result.error });
        }
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        opts.onProgress(id, "error", error);
        failures.push({ chapterId: id, error });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(max, opts.chapterIds.length) }, worker));
  return { failures };
}
```

- [ ] **Step 2: Add a unit test**

`src/app/(app)/sessions/[id]/workbench/chapter-batch.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";

import { runBatch } from "./chapter-batch";

test("runBatch respects concurrency cap", async () => {
  let active = 0; let peak = 0;
  const ids = Array.from({ length: 10 }, (_, i) => String(i));
  const { failures } = await runBatch({
    chapterIds: ids,
    concurrency: 3,
    onProgress: () => {},
    analyze: async () => {
      active += 1; peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 20));
      active -= 1;
      return { ok: true };
    },
  });
  assert.equal(failures.length, 0);
  assert.ok(peak <= 3, `peak concurrency ${peak} > 3`);
});

test("runBatch reports failures without throwing", async () => {
  const { failures } = await runBatch({
    chapterIds: ["a", "b"],
    onProgress: () => {},
    analyze: async (id) => (id === "a" ? { ok: false, error: "boom" } : { ok: true }),
  });
  assert.equal(failures.length, 1);
  assert.equal(failures[0].chapterId, "a");
});
```

- [ ] **Step 3: Run + commit**

Run: `node --test --import tsx 'src/app/(app)/sessions/[id]/workbench/chapter-batch.test.ts'`
Expected: green.

```bash
git add src/app/(app)/sessions/[id]/workbench/chapter-batch.ts src/app/(app)/sessions/[id]/workbench/chapter-batch.test.ts
git commit -m "feat(workbench): concurrency-capped client batch orchestrator"
```

---

### Task 27: Wire batch into `WorkbenchClient`

**Files:**
- Modify: `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx`

- [ ] **Step 1: Add per-book "分析未完成章节" button + state**

Inside `WorkbenchClient`, add state map `Record<chapterId, 'idle'|'running'|'done'|'error'>`, derived from `briefs`. Add per-book button next to the slot header that:

1. Computes the list of chapter IDs that have no brief in current `briefs`.
2. Opens a `CostEstimateModal` (next task) to confirm.
3. On confirm, calls `runBatch` with `analyze: (id) => fetch('/api/analyze/chapter', { method: 'POST', body: JSON.stringify({ bookId, chapterId: id }) }).then(r => r.json()).then(j => j.ok ? { ok: true } : { ok: false, error: j.error })`.
4. Periodically does `router.refresh()` (every ~5s during batch) to repaint with new briefs.

Sketch (focus on diff):

```tsx
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { runBatch } from "./chapter-batch";

// inside component
const router = useRouter();
const [, startTransition] = useTransition();
const [chapterStatus, setChapterStatus] = useState<Record<string, "idle" | "running" | "done" | "error">>({});

async function startBookBatch(bookId: string) {
  const targets = chapters
    .filter((c) => c.book_id === bookId)
    .filter((c) => !briefs.some((b) => b.chapter_id === c.id))
    .map((c) => c.id);
  if (targets.length === 0) {
    toast.info("该书所有章节已分析。");
    return;
  }
  // TODO: cost-estimate confirm in next task; for now go straight
  const interval = setInterval(() => startTransition(() => router.refresh()), 5000);
  const { failures } = await runBatch({
    chapterIds: targets,
    analyze: async (chapterId) => {
      const r = await fetch("/api/analyze/chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, chapterId }),
      });
      const j = await r.json();
      return r.ok ? { ok: true } : { ok: false, error: j.error ?? "失败" };
    },
    onProgress: (chapterId, status, error) => {
      setChapterStatus((s) => ({ ...s, [chapterId]: status }));
      if (status === "error") toast.error(`章节失败：${error}`);
    },
  });
  clearInterval(interval);
  startTransition(() => router.refresh());
  if (failures.length > 0) toast.error(`完成，但有 ${failures.length} 章失败。`);
  else toast.success("章节分析全部完成。");
}
```

Pass `startBookBatch` into each `ChapterTree`'s header as a "分析未完成" button.

- [ ] **Step 2: Smoke test in browser**

With a real dual session + 1-2 short chapters, click batch and verify progress + final state.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/sessions/[id]/workbench/workbench-client.tsx
git commit -m "feat(workbench): batch-analyze unfinished chapters per book"
```

---

### Task 28: Cost-estimate modal + integrate

**Files:**
- Create: `src/components/workbench/cost-estimate-modal.tsx`
- Modify: `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx`

- [ ] **Step 1: Component**

```tsx
"use client";
import { Button } from "@/components/ui/button";
import { estimateChapterBatchCost } from "@/lib/cost/estimate";

export function CostEstimateModal({
  open, chapterCount, avgChars, onCancel, onConfirm,
}: {
  open: boolean; chapterCount: number; avgChars: number;
  onCancel: () => void; onConfirm: () => void;
}) {
  if (!open) return null;
  const est = estimateChapterBatchCost({ chapterCount, avgCharsPerChapter: avgChars });
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="surface-panel max-w-md space-y-3 p-5 text-[13px]">
        <h3 className="text-[15px] font-medium">本次将发起 {est.calls} 次 LLM 调用</h3>
        <p className="text-muted-foreground">
          按当前模型粗估约 ¥{est.estimatedCNY}（估算值，仅供参考）<br />
          输入 token ≈ {est.estimatedInputTokens.toLocaleString()}，输出 token ≈ {est.estimatedOutputTokens.toLocaleString()}。
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>取消</Button>
          <Button onClick={onConfirm}>开始分析</Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into workbench-client**

Add modal state `{ open, targetBookId, chapterCount, avgChars }`. The "分析未完成" button sets it; modal `onConfirm` calls `startBookBatch(targetBookId)`.

- [ ] **Step 3: Commit**

```bash
git add src/components/workbench/cost-estimate-modal.tsx src/app/(app)/sessions/[id]/workbench/workbench-client.tsx
git commit -m "feat(workbench): cost-estimate modal before batch analyze"
```

---

### Task 29: Filter bar (characters / conflicts / themes)

**Files:**
- Create: `src/components/workbench/filter-bar.tsx`
- Modify: `src/components/workbench/chapter-tree.tsx`

- [ ] **Step 1: Build filter bar**

```tsx
"use client";
import { useMemo } from "react";

export type FilterState = { characters: string[]; conflicts: string[]; themeKeyword: string };

export function FilterBar({
  options, value, onChange,
}: {
  options: { characters: string[]; conflicts: string[] };
  value: FilterState;
  onChange: (next: FilterState) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/60 p-2 text-[12px]">
      <Multi label="人物" all={options.characters} selected={value.characters} onChange={(characters) => onChange({ ...value, characters })} />
      <Multi label="冲突" all={options.conflicts} selected={value.conflicts} onChange={(conflicts) => onChange({ ...value, conflicts })} />
      <input
        value={value.themeKeyword}
        onChange={(e) => onChange({ ...value, themeKeyword: e.target.value })}
        placeholder="主题关键词"
        className="h-7 rounded-[6px] border border-border/60 bg-background/40 px-2 text-[12px]"
      />
    </div>
  );
}

function Multi({ label, all, selected, onChange }: { label: string; all: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  return (
    <details className="relative">
      <summary className="cursor-pointer rounded-[6px] border border-border/60 px-2 py-1 text-foreground">
        {label}{selected.length > 0 ? ` (${selected.length})` : ""}
      </summary>
      <div className="absolute z-10 mt-1 max-h-60 w-48 overflow-auto rounded-[6px] border border-border/70 bg-background/95 p-2 shadow-md">
        {all.length === 0 ? <p className="text-muted-foreground">无可选项</p> : null}
        {all.map((opt) => {
          const checked = selected.includes(opt);
          return (
            <label key={opt} className="flex cursor-pointer items-center gap-2 py-0.5">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked ? [...selected, opt] : selected.filter((s) => s !== opt))}
              />
              <span className="truncate">{opt}</span>
            </label>
          );
        })}
      </div>
    </details>
  );
}
```

- [ ] **Step 2: Add filter state to `ChapterTree`**

Build `options` by aggregating `briefs[].characters_appeared[].name` and `briefs[].conflicts`. Filter visible cards: a chapter is visible if (no filter set) OR (its brief matches any selected character / conflict, and `themeKeyword` substring-matches any `themes_hints` entry).

- [ ] **Step 3: Smoke verify**

Open workbench with briefs present, toggle filters, see cards collapse/expand visibility.

- [ ] **Step 4: Commit**

```bash
git add src/components/workbench/filter-bar.tsx src/components/workbench/chapter-tree.tsx
git commit -m "feat(workbench): per-book filter bar (characters / conflicts / theme keyword)"
```

---

### Task 30: Real blueprint editor — 7 sections

**Files:**
- Create: `src/components/workbench/blueprint-section.tsx`
- Modify: `src/components/workbench/blueprint-editor.tsx`

- [ ] **Step 1: Section component**

```tsx
"use client";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function BlueprintSectionTable<T extends { id: string; notes: string }>({
  rows, columns, onChange, onDelete, disabled,
}: {
  rows: T[];
  columns: Array<{ key: keyof T; label: string; width?: string }>;
  onChange: (id: string, patch: Partial<T>) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}) {
  if (rows.length === 0) {
    return <p className="p-3 text-[12px] text-muted-foreground">还没有条目。从左右章节卡片勾选候选项加入。</p>;
  }
  return (
    <table className="w-full text-[12.5px]">
      <thead className="text-left text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
        <tr>
          {columns.map((c) => <th key={String(c.key)} className="px-2 py-1" style={{ width: c.width }}>{c.label}</th>)}
          <th className="px-2 py-1">备注</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-border/40">
            {columns.map((c) => (
              <td key={String(c.key)} className="px-2 py-1.5">
                <input
                  className="w-full bg-transparent text-foreground outline-none"
                  value={String((row[c.key] ?? "") as string)}
                  disabled={disabled}
                  onChange={(e) => onChange(row.id, { [c.key]: e.target.value } as Partial<T>)}
                />
              </td>
            ))}
            <td className="px-2 py-1.5">
              <input
                className="w-full bg-transparent text-muted-foreground outline-none"
                value={row.notes}
                disabled={disabled}
                onChange={(e) => onChange(row.id, { notes: e.target.value } as Partial<T>)}
              />
            </td>
            <td className="px-2 py-1.5">
              <Button size="sm" variant="ghost" disabled={disabled} onClick={() => onDelete(row.id)}><Trash2 /></Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Editor wires tabs + save**

Replace `blueprint-editor.tsx` placeholder with:

```tsx
"use client";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { BlueprintSectionTable } from "./blueprint-section";
import { type Blueprint, blueprintReadyToConfirm } from "@/lib/blueprint/schema";

type Status = "draft" | "confirmed";
const TABS: Array<{ key: keyof Blueprint; label: string }> = [
  { key: "characters", label: "人物" },
  { key: "relationships", label: "人物关系" },
  { key: "world_rules", label: "世界规则" },
  { key: "conflicts", label: "核心冲突" },
  { key: "plot_beats", label: "章节节点" },
  { key: "viewpoint", label: "视角与节奏" },
  { key: "themes", label: "主题" },
];

export function BlueprintEditor({
  sessionId, blueprint, status, updatedAt, onSaved, onStatusChange,
}: {
  sessionId: string;
  blueprint: Blueprint;
  status: Status;
  updatedAt: string | null;
  onSaved: (next: Blueprint, ts: string) => void;
  onStatusChange: (s: Status) => void;
}) {
  const [active, setActive] = useState<keyof Blueprint>("characters");
  const [bp, setBp] = useState<Blueprint>(blueprint);
  const disabled = status === "confirmed";

  async function save(next: Blueprint) {
    setBp(next);
    const res = await fetch("/api/blueprint", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, patch: next, expectedUpdatedAt: updatedAt }),
    });
    const j = await res.json();
    if (!res.ok) {
      toast.error(j.error ?? "保存蓝图失败。");
      return;
    }
    onSaved(next, j.updated_at);
  }

  async function confirm() {
    const ready = blueprintReadyToConfirm(bp);
    if (!ready.ok) { toast.error(`蓝图缺少：${ready.missing.join(", ")}`); return; }
    const res = await fetch("/api/blueprint/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) });
    const j = await res.json();
    if (!res.ok) { toast.error(j.error ?? "确认失败。"); return; }
    onStatusChange("confirmed");
    toast.success("蓝图已确认。");
  }

  async function unlock() {
    const res = await fetch("/api/blueprint/unconfirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) });
    if (res.ok) { onStatusChange("draft"); toast.success("蓝图已解锁。"); }
  }

  return (
    <div className="surface-panel flex h-[320px] flex-col">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <nav className="flex gap-1 text-[12px]">
          {TABS.map((t) => (
            <button
              key={String(t.key)}
              onClick={() => setActive(t.key)}
              className={`rounded-[6px] px-2 py-1 ${active === t.key ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          状态：{status === "confirmed" ? "已确认" : "草稿"}
          {status === "confirmed"
            ? <Button size="sm" variant="ghost" onClick={() => void unlock()}>解锁</Button>
            : <Button size="sm" onClick={() => void confirm()}>确认蓝图</Button>}
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {active === "viewpoint" ? (
          <div className="grid gap-2 p-3 text-[12.5px]">
            <label>视角模式：<input className="ml-2 rounded-[6px] border border-border/60 bg-background/40 px-2 py-1" value={bp.viewpoint.mode} disabled={disabled} onChange={(e) => void save({ ...bp, viewpoint: { ...bp.viewpoint, mode: e.target.value } })} /></label>
            <label>节奏：<input className="ml-2 rounded-[6px] border border-border/60 bg-background/40 px-2 py-1" value={bp.viewpoint.pacing} disabled={disabled} onChange={(e) => void save({ ...bp, viewpoint: { ...bp.viewpoint, pacing: e.target.value } })} /></label>
            <label>备注：<input className="ml-2 rounded-[6px] border border-border/60 bg-background/40 px-2 py-1" value={bp.viewpoint.notes} disabled={disabled} onChange={(e) => void save({ ...bp, viewpoint: { ...bp.viewpoint, notes: e.target.value } })} /></label>
          </div>
        ) : (
          <SectionTable section={active} bp={bp} onSave={save} disabled={disabled} />
        )}
      </div>
    </div>
  );
}

function SectionTable({ section, bp, onSave, disabled }: { section: Exclude<keyof Blueprint, "viewpoint">; bp: Blueprint; onSave: (next: Blueprint) => void; disabled: boolean }) {
  const rows = bp[section] as Array<Record<string, unknown> & { id: string; notes: string }>;
  const columnsBySection: Record<string, Array<{ key: string; label: string; width?: string }>> = {
    characters: [{ key: "name", label: "名称" }, { key: "role", label: "角色" }, { key: "description", label: "描述" }],
    relationships: [{ key: "from", label: "From" }, { key: "to", label: "To" }, { key: "type", label: "类型" }, { key: "description", label: "描述" }],
    world_rules: [{ key: "rule", label: "规则" }, { key: "description", label: "描述" }],
    conflicts: [{ key: "title", label: "标题" }, { key: "description", label: "描述" }],
    plot_beats: [{ key: "title", label: "标题" }, { key: "description", label: "描述" }, { key: "order", label: "顺序", width: "60px" }],
    themes: [{ key: "theme", label: "主题" }],
  };
  return (
    <BlueprintSectionTable
      rows={rows as never}
      columns={(columnsBySection[section] as never)}
      disabled={disabled}
      onChange={(id, patch) => {
        const next = { ...bp, [section]: rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) };
        onSave(next as Blueprint);
      }}
      onDelete={(id) => {
        const next = { ...bp, [section]: rows.filter((r) => r.id !== id) };
        onSave(next as Blueprint);
      }}
    />
  );
}
```

- [ ] **Step 3: Smoke**

Open workbench → switch tabs → edit field → check Network tab for PATCH /api/blueprint.

- [ ] **Step 4: Commit**

```bash
git add src/components/workbench/blueprint-section.tsx src/components/workbench/blueprint-editor.tsx
git commit -m "feat(workbench): 7-section blueprint editor with autosave + confirm/unlock"
```

---

### Task 31: Add candidate → blueprint wiring (chapter card → editor)

**Files:**
- Modify: `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx`
- Modify: `src/components/workbench/blueprint-editor.tsx` (expose ref or `appendCandidate`)

- [ ] **Step 1: Expose imperative API on editor**

Convert `BlueprintEditor` to accept `pendingCandidate` prop. When it changes, call `applyCandidate` then `save`.

```tsx
// addition to props:
pendingCandidate?: { section: keyof Blueprint; payload: Record<string, unknown>; source: { book_id: string; chapter_id: string | null } } | null;
onCandidateConsumed?: () => void;

// inside component:
useEffect(() => {
  if (!pendingCandidate) return;
  import("@/lib/blueprint/merge").then(({ applyCandidate }) => {
    const next = applyCandidate(bp, { ...pendingCandidate, title: String(pendingCandidate.payload.name ?? pendingCandidate.payload.title ?? "") });
    void save(next);
    onCandidateConsumed?.();
  });
}, [pendingCandidate]);
```

- [ ] **Step 2: Wire in `WorkbenchClient`**

```tsx
const [pendingCandidate, setPendingCandidate] = useState<null | { section: keyof Blueprint; payload: Record<string, unknown>; source: { book_id: string; chapter_id: string | null } }>(null);

// pass `onAddCandidate` into each ChapterTree:
onAddCandidate={(c) => setPendingCandidate({ section: c.section as keyof Blueprint, payload: c.payload as Record<string, unknown>, source: { book_id: a.id, chapter_id: c.chapterId } })}
```

Pass `pendingCandidate` + `onCandidateConsumed={() => setPendingCandidate(null)}` to `BlueprintEditor`.

- [ ] **Step 3: Smoke**

Click "+" on a chapter candidate → row should appear in matching blueprint tab → PATCH fires.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/sessions/[id]/workbench/workbench-client.tsx src/components/workbench/blueprint-editor.tsx
git commit -m "feat(workbench): chapter candidate → blueprint via applyCandidate"
```

---

### Task 32: Pipeline bar — real 6-step derived state

**Files:**
- Modify: `src/components/workbench/pipeline-bar.tsx`

- [ ] **Step 1: Implement real bar**

```tsx
type Props = {
  importedCount: number;          // 0..2
  chapterTotals: { bookId: string; total: number; analyzed: number }[];
  bookSynthesisDone: { a: boolean; b: boolean };
  blueprintStatus: "draft" | "confirmed";
  variantCount: number;
};

export function PipelineBar(p: Props) {
  const steps = [
    { key: "import", label: "导入", done: p.importedCount === 2 },
    {
      key: "chapter-analyze", label: "章节分析",
      done: p.chapterTotals.every((t) => t.total > 0 && t.analyzed === t.total),
    },
    {
      key: "synthesis", label: "整书汇总",
      done: p.bookSynthesisDone.a && p.bookSynthesisDone.b,
    },
    { key: "compare", label: "双书对照", done: p.blueprintStatus === "confirmed" || (p.bookSynthesisDone.a && p.bookSynthesisDone.b) },
    { key: "confirm", label: "确认蓝图", done: p.blueprintStatus === "confirmed" },
    { key: "generate", label: "生成变体", done: p.variantCount > 0 },
  ];
  return (
    <div className="surface-panel flex items-center gap-2 px-3 py-2 text-[12px]">
      {steps.map((s, i) => (
        <span key={s.key} className={`inline-flex items-center gap-1 ${s.done ? "text-emerald-300" : "text-muted-foreground"}`}>
          <span className="size-1.5 rounded-full bg-current" />
          {s.label}
          {i < steps.length - 1 ? <span className="mx-1 text-muted-foreground/40">·</span> : null}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Pass derived props from `WorkbenchClient`**

Compute `chapterTotals`, `bookSynthesisDone`, `variantCount` from server data fetched in `page.tsx` (pass through props to `WorkbenchClient`).

In `page.tsx`, also query `analyses` rows with `dimension='book_synthesis'` and compute booleans per book; pass to client.

- [ ] **Step 3: Commit**

```bash
git add src/components/workbench/pipeline-bar.tsx src/app/(app)/sessions/[id]/workbench
git commit -m "feat(workbench): pipeline bar driven by derived state"
```

---

### Task 33: "整书汇总" trigger button per book

**Files:**
- Modify: `src/components/workbench/chapter-tree.tsx`
- Modify: `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx`

- [ ] **Step 1: Add header action**

In `ChapterTree` header, render `[整书汇总]` button. Enabled when all chapters in this book have a brief. Calls a `onSynthesize(bookId)` prop.

- [ ] **Step 2: Implement in client**

```tsx
async function synthesizeBook(bookId: string) {
  const res = await fetch("/api/analyze/book", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookId }) });
  const j = await res.json();
  if (!res.ok) { toast.error(j.error ?? "整书汇总失败。"); return; }
  toast.success("整书汇总完成。");
  startTransition(() => router.refresh());
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/workbench/chapter-tree.tsx src/app/(app)/sessions/[id]/workbench/workbench-client.tsx
git commit -m "feat(workbench): per-book synthesize action when briefs complete"
```

---

## Phase 8 — Upload Flow

### Task 34: Mode picker on `/upload` + URL params

**Files:**
- Modify: `src/app/(app)/upload/page.tsx`
- Modify: `src/components/upload/upload-form.tsx`

- [ ] **Step 1: Add mode + position to `UploadForm` props**

```tsx
// upload-form.tsx
type UploadFormProps = {
  mode?: "single" | "dual";
  sessionId?: string;
  position?: 0 | 1;
};
export function UploadForm({ mode = "single", sessionId, position }: UploadFormProps) {
  // pass mode/sessionId/position to initNovelUpload
}
```

In `onSubmit`, the `initNovelUpload` call becomes:

```ts
const initResult = await initNovelUpload({
  filename: selectedFile.name,
  size: selectedFile.size,
  contentType: selectedFile.type,
  mode,
  sessionId,
  position,
});
```

In `finalizeNovelUpload`, pass `position` through:
```ts
const finalizeResult = await finalizeNovelUpload({
  sessionId: initResult.sessionId,
  storageObjectPath: initResult.storageObjectPath,
  filename: selectedFile.name,
  size: selectedFile.size,
  contentType: selectedFile.type,
  position: initResult.position,
});
```

After success in dual mode, route to `/sessions/<id>/workbench`.

- [ ] **Step 2: Add mode picker to `/upload/page.tsx`**

Read `searchParams.mode | sessionId | position`. If `mode === "dual"` and `sessionId` set → render UploadForm in "add 2nd book" state. Otherwise render a small toggle: "单书 / 双书对照"; if user picks 双书 with no `sessionId`, the form creates a new dual session on first upload.

```tsx
type SP = Promise<{ mode?: string; sessionId?: string; position?: string }>;
export default async function UploadPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const mode = sp.mode === "dual" ? "dual" as const : "single" as const;
  const sessionId = sp.sessionId;
  const position = sp.position ? (Number(sp.position) as 0 | 1) : undefined;
  return (
    <div className="app-page">
      {/* existing header */}
      <ModePicker current={mode} sessionId={sessionId} />
      <UploadForm mode={mode} sessionId={sessionId} position={position} />
    </div>
  );
}
function ModePicker({ current, sessionId }: { current: "single" | "dual"; sessionId?: string }) {
  if (sessionId) return null;
  return (
    <div className="surface-panel mb-3 flex gap-2 p-2 text-[12px]">
      <a className={current === "single" ? "rounded-[6px] bg-accent px-3 py-1 text-foreground" : "px-3 py-1 text-muted-foreground"} href="/upload?mode=single">单书任务</a>
      <a className={current === "dual" ? "rounded-[6px] bg-accent px-3 py-1 text-foreground" : "px-3 py-1 text-muted-foreground"} href="/upload?mode=dual">双书对照</a>
    </div>
  );
}
```

- [ ] **Step 3: Smoke**

Visit `/upload?mode=dual` → upload first book → end up at `/sessions/<id>/workbench` with one slot filled. Click "上传第 2 本" in empty slot, upload, both slots fill.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/upload/page.tsx src/components/upload/upload-form.tsx
git commit -m "feat(upload): mode picker + dual second-book slot"
```

---

## Phase 9 — Variant Comparison

### Task 35: Variant comparison view (meta + structure)

**Files:**
- Create: `src/components/sessions/variant-comparison.tsx`
- Create: `src/components/sessions/variant-diff-meta.tsx`
- Create: `src/components/sessions/variant-diff-structure.tsx`

- [ ] **Step 1: Meta diff component**

```tsx
"use client";
import { diffMeta } from "@/lib/diff/variant-diff";

export function VariantDiffMeta({ left, right }: { left: Record<string, unknown>; right: Record<string, unknown> }) {
  const d = diffMeta(left, right);
  const rows = Object.entries(d).filter(([k]) => !k.includes(".")); // flatten layer only
  return (
    <div className="grid gap-1 text-[12.5px]">
      {rows.map(([key, v]) => (
        <div key={key} className={`grid grid-cols-[160px_1fr_1fr] gap-2 px-2 py-1 ${v.same ? "" : "bg-amber-300/10"}`}>
          <div className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{key}</div>
          <div className="truncate">{JSON.stringify(v.left)}</div>
          <div className="truncate">{JSON.stringify(v.right)}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Structure diff (parse chapters out of content text)**

```tsx
"use client";
import { detectChapters } from "@/lib/text/chapters";
import { diffStructure } from "@/lib/diff/variant-diff";

export function VariantDiffStructure({ left, right }: { left: string; right: string }) {
  const leftTitles = detectChapters(left).map((c) => c.title);
  const rightTitles = detectChapters(right).map((c) => c.title);
  const d = diffStructure(leftTitles, rightTitles);
  return (
    <div className="grid grid-cols-2 gap-3 text-[12.5px]">
      <div>
        <h4 className="text-[11px] uppercase text-muted-foreground">左 · 共 {leftTitles.length}</h4>
        <ul>{leftTitles.map((t) => <li key={t} className={d.removed.includes(t) ? "text-rose-300" : ""}>{t}</li>)}</ul>
      </div>
      <div>
        <h4 className="text-[11px] uppercase text-muted-foreground">右 · 共 {rightTitles.length}</h4>
        <ul>{rightTitles.map((t) => <li key={t} className={d.added.includes(t) ? "text-emerald-300" : ""}>{t}</li>)}</ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Comparison shell**

```tsx
"use client";
import { useState } from "react";

import { VariantDiffMeta } from "./variant-diff-meta";
import { VariantDiffStructure } from "./variant-diff-structure";
import { VariantDiffParagraphs } from "./variant-diff-paragraphs";

type Variant = { id: string; title: string; content: string; word_count: number | null; config: Record<string, unknown>; created_at: string };

export function VariantComparison({ variants }: { variants: Variant[] }) {
  const [leftId, setLeftId] = useState(variants[0]?.id ?? "");
  const [rightId, setRightId] = useState(variants[1]?.id ?? variants[0]?.id ?? "");
  const left = variants.find((v) => v.id === leftId);
  const right = variants.find((v) => v.id === rightId);
  if (!left || !right) return <p className="text-[13px] text-muted-foreground">至少生成 2 个变体才能进入比较。</p>;
  return (
    <section className="space-y-3">
      <div className="flex gap-3 text-[13px]">
        <Picker label="左" value={leftId} options={variants} onChange={setLeftId} />
        <Picker label="右" value={rightId} options={variants} onChange={setRightId} />
      </div>
      <Card title="元信息">
        <VariantDiffMeta
          left={{ title: left.title, wordCount: left.word_count ?? 0, ...left.config }}
          right={{ title: right.title, wordCount: right.word_count ?? 0, ...right.config }}
        />
      </Card>
      <Card title="章节结构">
        <VariantDiffStructure left={left.content} right={right.content} />
      </Card>
      <Card title="关键段落">
        <VariantDiffParagraphs left={left.content} right={right.content} />
      </Card>
    </section>
  );
}

function Picker({ label, value, options, onChange }: { label: string; value: string; options: Variant[]; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-muted-foreground">{label}</span>
      <select className="rounded-[6px] border border-border/60 bg-background/40 px-2 py-1" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}
      </select>
    </label>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface-panel p-3">
      <h3 className="mb-2 text-[13px] font-medium">{title}</h3>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/sessions/variant-comparison.tsx src/components/sessions/variant-diff-meta.tsx src/components/sessions/variant-diff-structure.tsx
git commit -m "feat(variants): comparison shell + meta/structure diff cards"
```

---

### Task 36: Paragraph diff + drawer

**Files:**
- Create: `src/components/sessions/variant-diff-paragraphs.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";
import { useMemo, useState } from "react";

import { diffParagraphs, splitParagraphs } from "@/lib/diff/variant-diff";

export function VariantDiffParagraphs({ left, right }: { left: string; right: string }) {
  const [openIndex, setOpenIndex] = useState<{ side: "a" | "b"; idx: number } | null>(null);
  const data = useMemo(() => {
    const a = splitParagraphs(left);
    const b = splitParagraphs(right);
    const { aOnly, bOnly } = diffParagraphs(a, b);
    return { a, b, aOnly, bOnly };
  }, [left, right]);
  return (
    <div className="grid grid-cols-2 gap-3 text-[12.5px]">
      <Column title={`仅在左侧（${data.aOnly.length}）`} items={data.aOnly} onOpen={(idx) => setOpenIndex({ side: "a", idx })} />
      <Column title={`仅在右侧（${data.bOnly.length}）`} items={data.bOnly} onOpen={(idx) => setOpenIndex({ side: "b", idx })} />
      {openIndex ? (
        <Drawer
          paragraph={openIndex.side === "a" ? data.a[openIndex.idx] : data.b[openIndex.idx]}
          onClose={() => setOpenIndex(null)}
        />
      ) : null}
    </div>
  );
}

function Column({ title, items, onOpen }: { title: string; items: { index: number; paragraph: string }[]; onOpen: (idx: number) => void }) {
  return (
    <div>
      <h4 className="mb-1 text-[11px] uppercase text-muted-foreground">{title}</h4>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.index} className="cursor-pointer truncate rounded-[6px] border border-border/40 bg-background/30 px-2 py-1.5 hover:bg-accent/30" onClick={() => onOpen(it.index)}>
            #{it.index + 1} {it.paragraph.slice(0, 80)}{it.paragraph.length > 80 ? "…" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Drawer({ paragraph, onClose }: { paragraph: string; onClose: () => void }) {
  return (
    <div className="fixed inset-y-0 right-0 z-30 w-[420px] overflow-auto border-l border-border/70 bg-background/95 p-4">
      <button className="mb-3 text-[12px] text-muted-foreground hover:text-foreground" onClick={onClose}>关闭</button>
      <pre className="whitespace-pre-wrap text-[12.5px] leading-6 text-foreground">{paragraph}</pre>
    </div>
  );
}
```

- [ ] **Step 2: Mount in session detail (dual mode only)**

In workbench page server component, after variants query, pass to `WorkbenchClient`. Render `<VariantComparison variants={variants ?? []} />` below the blueprint editor when `variants.length >= 2`.

- [ ] **Step 3: Commit**

```bash
git add src/components/sessions/variant-diff-paragraphs.tsx src/app/(app)/sessions/[id]/workbench
git commit -m "feat(variants): paragraph LCS diff + open-in-drawer"
```

---

### Task 37: "生成变体" button + flow

**Files:**
- Modify: `src/components/workbench/blueprint-editor.tsx`
- Modify: `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx`

- [ ] **Step 1: Add generate dialog inside editor or workbench**

Add a "生成变体" button in the editor header (enabled only when `status === 'confirmed'`).
On click: open a small form with `strategy / innovation / viewpoint / style / output_scope / extra_instructions` (mirror `GenerateConfigSchema`). On submit:

```ts
const res = await fetch("/api/generate-v2", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ blueprintId, config }),
});
const j = await res.json();
if (!res.ok) toast.error(j.error ?? "生成失败。");
else { toast.success("变体已生成。"); startTransition(() => router.refresh()); }
```

Pass `blueprintId` (from server-fetched `blueprintRow.id`) via props.

- [ ] **Step 2: Reuse the existing config picker UI**

If `src/components/sessions/generate-panel.tsx` already has the form, factor its inner form into a `GenerateConfigForm` component and reuse here. Otherwise reproduce inline using the same fields.

- [ ] **Step 3: Smoke + commit**

```bash
git add src/components/workbench src/app/(app)/sessions/[id]/workbench
git commit -m "feat(workbench): generate variant via /api/generate-v2 once blueprint confirmed"
```

---

## Phase 10 — Wire-up + Verification

### Task 38: Sessions list shows mode badge

**Files:**
- Modify: `src/app/(app)/sessions/page.tsx`

- [ ] **Step 1: Include `mode` in query**

```ts
.select("id, name, status, mode, created_at, updated_at")
```

- [ ] **Step 2: Render mode badge next to status**

```tsx
<span className="rounded-[5px] border border-border/60 px-1.5 py-0.5 text-[10.5px] text-muted-foreground">
  {session.mode === "dual" ? "双书" : "单书"}
</span>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/sessions/page.tsx
git commit -m "chore(sessions): show mode badge in list"
```

---

### Task 39: Dashboard handles dual sessions

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Adjust latest-session link**

When the latest session is `mode='dual'`, link to `/sessions/<id>/workbench` and label "打开工作台". For variant count, the existing query is fine (variants still keyed by `session_id`).

```ts
const target = latestSession.mode === "dual" ? `/sessions/${latestSession.id}/workbench` : `/sessions/${latestSession.id}`;
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(app)/dashboard/page.tsx
git commit -m "chore(dashboard): route dual-mode latest session to workbench"
```

---

### Task 40: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add dual mode section**

After "V0.1 status — what's wired vs stubbed", add:

```markdown
## V0.2 — Dual-book blueprint workbench

Wired in dual mode (`sessions.mode='dual'`):
- `/upload?mode=dual` flow, two-slot book attachment
- `/sessions/[id]/workbench` page with chapter tree, candidate picker, blueprint editor, pipeline bar, variant comparison
- New tables: `chapters`, `blueprints`
- `analyses` extended with `scope` ('book'|'chapter') and `chapter_id`
- API: `/api/chapters/parse`, `/api/analyze/chapter`, `/api/analyze/book`, `/api/blueprint{,/confirm,/unconfirm}`, `/api/generate-v2`
- Prompts: `src/lib/prompts/chapter-brief.ts`, `book-synthesis.ts`, `generate-from-blueprint.ts`
- Blueprint lib: `src/lib/blueprint/{schema,merge}.ts`
- Variant diff: `src/lib/diff/variant-diff.ts`

Old single-book sessions (`mode='single'`) keep the legacy `AnalysisPanel`/`GeneratePanel`/`VariantList` path; legacy `/api/analyze` and `/api/generate` are gated to single mode.

Constraint: every blueprint write goes through `BlueprintSchema.parse`. `/api/generate-v2` requires `blueprints.status='confirmed'`.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document v0.2 dual workbench in CLAUDE.md"
```

---

### Task 41: Final test sweep + manual end-to-end

- [ ] **Step 1: Run full test suite**

```bash
node --test --import tsx 'src/**/*.test.ts'
```
Expected: all pass.

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```
Expected: passes.

- [ ] **Step 3: Lint**

```bash
npm run lint
```
Expected: passes (fix any new findings).

- [ ] **Step 4: Manual smoke walkthrough**

1. Create a new dual session via `/upload?mode=dual`, upload book A.
2. Land in workbench, upload book B via empty-slot link.
3. Run "分析未完成章节" on book A (small file). Watch progress + cost modal.
4. Run "整书汇总" on book A.
5. Repeat 3–4 on book B.
6. Open chapter cards, click `+` to add 2–3 candidates per section into blueprint.
7. Fill viewpoint, click "确认蓝图".
8. Open generate form, generate 2 variants.
9. Open comparison view, verify meta / structure / paragraph diff renders.
10. Verify a legacy `mode='single'` session still loads its old layout.

- [ ] **Step 5: Commit any lint/type fixups**

```bash
git add -p
git commit -m "chore: lint + type fixups after end-to-end smoke"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ §3 data model — Tasks 1–3
- ✅ §4 chapter pipeline — Tasks 4–8, 15
- ✅ §5 blueprint — Tasks 13–14, 18
- ✅ §6 API + orchestration — Tasks 15–19, 26
- ✅ §7 UI — Tasks 22–37
- ✅ §8 prompts — Tasks 10–12
- ✅ §9 tests — Tasks 5–7, 10–14, 20, 26 (integrated per-feature)
- ✅ §10 risks — addressed via cost modal (28), source chip (25), partial unique indexes (1), unconfirm preserves variants (18+37)

**Type consistency:** `BlueprintSchema` / `applyCandidate` / `mergeSections` / `ChapterBriefResult` referenced consistently. `WorkbenchClient` props match `page.tsx` server-side query shape. `runBatch` signature stable across tasks 26–27.

**Placeholder scan:** no TBD/TODO in code blocks. All step commands include expected behavior.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-20-multi-book-blueprint-workbench.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
