# Codebase Structure

**Analysis Date:** 2026-05-26

## Directory Layout

```
workflow-agent/                    # npm package: novelfusion-ai
├── src/                           # Application source (Next.js App Router)
│   ├── app/                       # Routes, layouts, API handlers
│   ├── components/                # React UI by feature + shadcn ui/
│   ├── hooks/                     # Shared client hooks (minimal)
│   └── lib/                       # Domain logic, prompts, integrations
├── supabase/migrations/           # Ordered SQL schema (0001–0007)
├── tests/e2e/                     # Playwright smoke & upload branches
├── scripts/                       # Dev utilities (e.g. reset-dev.ps1)
├── docs/                          # GIT_HISTORY, plan notes
├── .planning/                     # GSD planning artifacts (codebase maps)
├── .cursor/                       # Cursor GSD skills/agents (tooling)
├── .claude/                       # Claude GSD install mirror (tooling)
├── middleware.ts                  # Supabase session edge middleware
├── next.config.ts                 # Server Actions body limit 60mb
├── package.json                   # Scripts: dev, test, test:e2e
├── components.json                # shadcn aliases (@/components, @/lib)
├── tailwind.config.ts
├── tsconfig.json                  # paths: @/* → ./src/*
└── README.md                      # Product overview & setup
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js 15 routing tree — layouts, pages, Route Handlers.
- Contains: Route groups `(auth)`, `(app)`; nested dynamic `[id]`, `[briefId]`; `api/` REST-style handlers.
- Key files: `src/app/layout.tsx`, `src/app/(app)/layout.tsx`, `src/app/api/generate/route.ts`

**`src/components/`:**
- Purpose: Client and shared UI; feature folders mirror product areas.
- Contains: `ui/` (shadcn primitives), `sessions/`, `workbench/`, `compare/`, `creative-brief/`, `upload/`, `charts/`, `projects/`.
- Key files: `src/components/sidebar.tsx`, `src/components/app-nav.tsx`

**`src/lib/`:**
- Purpose: Server-safe and isomorphic domain code; no React in most modules.
- Contains: Capability subfolders (`llm`, `prompts`, `sessions`, `blueprint`, `upload`, `compare`, `supabase`, `text`, `diff`, `streaming`, `books`, `projects`, `workbench`, `cost`, `auth`, `crypto`).
- Key files: `src/lib/types.ts`, `src/lib/llm/runtime.ts`, `src/lib/sessions/guard.ts`

**`src/hooks/`:**
- Purpose: Reusable client hooks (shadcn alias `@/hooks` reserved).
- Contains: `src/hooks/use-tab-state.ts` only.
- Key files: Add new cross-feature hooks here when not tied to one component folder.

**`supabase/migrations/`:**
- Purpose: Versioned Postgres schema, RLS policies, storage buckets.
- Contains: `0001_init.sql` through `0007_llm_runtime_governance.sql`.
- Key files: Run in numeric order per `README.md`.

**`tests/e2e/`:**
- Purpose: Playwright integration against live Supabase + LLM env.
- Contains: `smoke.spec.ts`, `upload-branches.spec.ts`, `helpers/`, `fixtures/`.
- Key files: `tests/e2e/smoke.spec.ts`

**`.planning/`:**
- Purpose: GSD-generated project intelligence (not application runtime).
- Contains: `codebase/` architecture maps consumed by `/gsd-plan-phase`.
- Key files: `ARCHITECTURE.md`, `STRUCTURE.md` (this tree)

## Key File Locations

**Entry Points:**
- `middleware.ts`: Edge auth/session refresh
- `src/app/page.tsx`: Root redirect `/sessions` | `/login`
- `src/app/(auth)/login/page.tsx`: Login UI
- `src/app/(app)/sessions/page.tsx`: Project list

**Configuration:**
- `next.config.ts`: Next.js experimental serverActions body limit
- `tsconfig.json`: Strict TS, `@/*` path alias
- `tailwind.config.ts`, `postcss.config.js`: Styling pipeline
- `components.json`: shadcn component generator config
- `.env.example` / `.env.local` (local only, not committed): Supabase + `ENCRYPTION_KEY`

**Core Logic:**
- `src/lib/types.ts`: Zod schemas, `Database` type, session/analysis enums
- `src/lib/llm/dispatch.ts`: BYOK OpenAI-compatible client factory
- `src/lib/llm/runtime.ts`: `runLLMObject`, `streamLLMObject`, usage events
- `src/lib/prompts/index.ts`: Analysis dimension registry
- `src/lib/upload/actions.ts`: Upload Server Actions
- `src/lib/analysis-store.ts`: Upsert analyses by book/dimension/scope

**API Surface (`src/app/api/`):**
- `analyze/route.ts`, `analyze/extended/route.ts`, `analyze/chapter/route.ts`, `analyze/book/route.ts`
- `generate/route.ts`, `generate-v2/route.ts`, `generate/preview/route.ts`, `generate/iterate/route.ts`
- `blueprint/route.ts`, `blueprint/confirm/route.ts`, `blueprint/unconfirm/route.ts`
- `briefs/route.ts`, `briefs/[id]/route.ts`
- `sessions/[id]/route.ts`, `sessions/bulk/route.ts`
- `variants/[id]/route.ts`, `chapters/parse/route.ts`, `compare/insights/route.ts`

**Testing:**
- Unit: colocated `src/**/*.test.ts` (excluded from `tsc` emit via `tsconfig.json`)
- E2E: `tests/e2e/*.spec.ts`, run via `npm run test:e2e`

## Naming Conventions

**Files:**
- React components: `kebab-case.tsx` (e.g. `workbench-client.tsx`, `generate-form.tsx`)
- Route segments: Next conventions — `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`
- Domain modules: `kebab-case.ts` or topic folder (`variant-diff.ts`, `brief-workflow.ts`)
- Tests: sibling `*.test.ts` next to implementation (e.g. `src/lib/crypto.test.ts`)
- Client-only streamers: `*-streamer.tsx` under `src/components/creative-brief/`

**Directories:**
- App route groups: parentheses `(app)`, `(auth)` — do not appear in URL
- Feature components: plural nouns (`sessions`, `compare`, `workbench`)
- Lib capabilities: singular/plural by domain (`llm`, `prompts`, `sessions`, `blueprint`)

**Symbols:**
- React components: `PascalCase` export matching filename semantics (`WorkbenchClient`)
- Functions: `camelCase` (`loadActiveSession`, `assertWithinRateLimit`)
- Types/schemas: `PascalCase` + `Schema` suffix for Zod (`WorldviewResultSchema`)
- Constants: `SCREAMING_SNAKE` for prompt versions and limits (`ANALYSIS_TEXT_CHAR_LIMIT`)

## Where to Add New Code

**New authenticated page:**
- Server page: `src/app/(app)/<feature>/page.tsx`
- Optional client island: `src/app/(app)/<feature>/<Feature>Client.tsx` or `src/components/<feature>/`
- Register nav link in `src/components/app-nav.tsx` if top-level

**New API endpoint:**
- Handler: `src/app/api/<resource>/route.ts` or `src/app/api/<resource>/[id]/route.ts`
- Shared logic: `src/lib/<domain>/` — never inline large LLM prompts in the route file
- Follow existing pattern: `createClient()` → `getUser()` → `loadActiveSession` → Zod parse → domain call → `NextResponse.json`

**New LLM prompt / dimension:**
- Prompt text: `src/lib/prompts/<name>.ts` with exported `SYSTEM_PROMPT`
- Register in `src/lib/prompts/index.ts` or extended config
- Zod result schema: add to `src/lib/types.ts` (or feature types file)
- API route: extend or add under `src/app/api/analyze/` with `saveAnalysis`

**New UI component (feature-specific):**
- Implementation: `src/components/<feature>/<component-name>.tsx`
- Primitives only in `src/components/ui/` (shadcn CLI targets this via `components.json`)

**New DB table / column:**
- Migration: next `supabase/migrations/00XX_<description>.sql`
- Update hand-maintained `Database` type in `src/lib/types.ts`
- Document in `README.md` migration list

**Utilities:**
- Generic: `src/lib/utils.ts` (cn helper) or new file in closest domain folder (`src/lib/text/`, `src/lib/diff/`)
- Cross-route server-only: mark file or top import with `import "server-only"` when needed

**Tests:**
- Unit: `src/lib/<module>.test.ts` beside source
- E2E: `tests/e2e/<flow>.spec.ts` with helpers in `tests/e2e/helpers/`

## Special Directories

**`node_modules/`, `.next/`:**
- Purpose: Dependencies and Next build output
- Generated: Yes
- Committed: No

**`samples/`:**
- Purpose: Local `.txt` novels for manual upload testing
- Generated: User content
- Committed: No (gitignored per README)

**`.cursor/`, `.claude/`:**
- Purpose: GSD workflow skills, agents, hooks — development methodology tooling
- Generated: Installer/updater
- Committed: Mixed (project may track `.cursor/skills`); not part of NovelFusion runtime

**`playwright-report/`, `test-results/`:**
- Purpose: E2E run artifacts
- Generated: Yes
- Committed: No

**`middleware.ts` (repo root):**
- Purpose: Required Next.js edge entry; thin wrapper over `src/lib/supabase/middleware.ts`
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-05-26*
