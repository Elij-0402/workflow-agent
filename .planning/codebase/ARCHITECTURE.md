<!-- refreshed: 2026-05-26 -->
# Architecture

**Analysis Date:** 2026-05-26

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                     Browser (React 19 Client Components)               │
│  `src/components/*`  ·  `src/app/(app)/**/page.tsx` (hydrated islands) │
├──────────────────┬──────────────────┬─────────────────────────────────┤
│  Sessions /      │  Dual-book       │  Studio / Compare / Settings      │
│  Project UI      │  Workbench       │  Creative brief + multi-session   │
│  `components/    │  `components/    │  `components/creative-brief/*`  │
│   sessions/*`    │   workbench/*`   │  `components/compare/*`         │
└────────┬─────────┴────────┬─────────┴──────────────┬──────────────────┘
         │ fetch / SSE      │ Server Actions         │
         ▼                  ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              Next.js 15 App Router (`src/app/`)                          │
│  Route Handlers `src/app/api/**/route.ts`  ·  RSC pages load data       │
│  Server Actions `src/lib/upload/actions.ts`, `src/app/(app)/settings/` │
├─────────────────────────────────────────────────────────────────────────┤
│                    Domain & Integration (`src/lib/`)                     │
│  prompts · llm/runtime · sessions/guard · blueprint · upload · compare  │
└────────┬───────────────────────────────┬────────────────────────────────┘
         │ Supabase client (RLS)         │ Vercel AI SDK + OpenAI-compat
         ▼                               ▼
┌─────────────────────┐         ┌─────────────────────────────────────────┐
│ Supabase            │         │ User BYOK LLM (DeepSeek / custom gateway) │
│ Auth · Postgres ·   │         │ `llm_config` + `getUserLLMClient()`        │
│ Storage (novels)    │         │ `src/lib/llm/dispatch.ts`                 │
└─────────────────────┘         └─────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Root layout | Global fonts, dark theme, toaster | `src/app/layout.tsx` |
| App shell | Auth gate, sidebar, mobile nav | `src/app/(app)/layout.tsx` |
| Middleware | Session refresh, login redirect | `middleware.ts` → `src/lib/supabase/middleware.ts` |
| API routes | LLM-backed analyze/generate, CRUD | `src/app/api/**/route.ts` |
| Domain types & Zod | Session status, analysis schemas, DB types | `src/lib/types.ts`, `src/lib/types/creative-brief.ts` |
| LLM runtime | Structured output, streaming, usage logging | `src/lib/llm/runtime.ts` |
| Prompt registry | Dimension → system prompt + schema | `src/lib/prompts/index.ts` |
| Session guard | Ownership + archival checks | `src/lib/sessions/guard.ts` |
| Upload pipeline | Storage path, ingest, book rows | `src/lib/upload/actions.ts`, `src/lib/upload/process.ts` |
| Blueprint | Zod schema, merge patches, confirm gate | `src/lib/blueprint/schema.ts`, `src/lib/brief-workflow.ts` |
| SSE transport | Server stream + client parser | `src/lib/streaming/sse.ts`, `src/lib/streaming/sse-client.ts` |

## Pattern Overview

**Overall:** Next.js App Router monolith with **layered domain modules** under `src/lib/`, **Route Handlers** for long-running LLM work, and **React Server Components** for authenticated page data loading.

**Key Characteristics:**
- **Session-centric workflow:** `sessions` row drives status machine (`draft` → `uploaded` → `analyzing` → `analyzed` → `generating` → `done`) with `mode` `single` | `dual`.
- **BYOK LLM:** Per-user `llm_config` with encrypted API key; all model calls go through `getUserLLMClient()` + `runLLMObject` / `streamLLMObject`.
- **Zod at boundaries:** Request bodies in API routes and LLM outputs use Zod schemas defined in `src/lib/types.ts` and feature modules.
- **No `lib` → `components` imports:** UI depends on domain; domain stays framework-agnostic except Next/server-only markers.

## Layers

**Presentation (UI):**
- Purpose: Chinese-first UX for upload, analysis panels, workbench, studio, compare.
- Location: `src/components/`, co-located client pages under `src/app/(app)/`
- Contains: Feature folders (`sessions`, `workbench`, `compare`, `creative-brief`, `upload`), shared `ui/` (shadcn), charts.
- Depends on: `@/lib/*` types/utils, fetch to `/api/*`, Server Action imports from `@/lib/upload/actions`.
- Used by: App Router pages as default or explicit imports.

**Application (App Router):**
- Purpose: Routing, auth layout groups, wire server data to components.
- Location: `src/app/`
- Contains: `(auth)` login, `(app)` authenticated shell, `api/` Route Handlers.
- Depends on: `createClient()` from `src/lib/supabase/server.ts`, domain loaders (`page-data.ts`, `loadDualSessionPageData`).
- Used by: Browser navigation and `middleware.ts`.

**Domain & services:**
- Purpose: Business rules, prompts, diff, rate limits, text processing.
- Location: `src/lib/` (subfolders by capability)
- Contains: `prompts/`, `llm/`, `sessions/`, `blueprint/`, `upload/`, `compare/`, `books/`, `text/`, `diff/`, `streaming/`, `projects/`.
- Depends on: Supabase types, Vercel AI SDK, Node crypto for cache keys.
- Used by: API routes, Server Actions, RSC pages.

**Data & auth:**
- Purpose: Persistence, RLS-scoped queries, encrypted secrets.
- Location: `supabase/migrations/*.sql`, `src/lib/supabase/*`, `src/lib/crypto.ts`
- Contains: Tables `sessions`, `books`, `chapters`, `analyses`, `variants`, `blueprints`, `creative_briefs`, `llm_config`, `llm_usage_events`.
- Depends on: Supabase project env vars (existence only in docs).
- Used by: All server paths via user-scoped `createClient()`.

## Data Flow

### Primary Request Path (single-book analyze)

1. User uploads `.txt` via client hook → Server Actions `initNovelUpload` / `finalizeNovelUpload` (`src/lib/upload/actions.ts`) → Storage + `books` row + session `uploaded`.
2. Client POST `/api/analyze` with `{ sessionId, dimension }` (`src/app/api/analyze/route.ts`).
3. Route loads session via `loadActiveSession`, reads `books.cleaned_content`, wraps text with `wrapUntrustedNovel`.
4. `runLLMObject` (`src/lib/llm/runtime.ts`) calls provider; result persisted via `saveAnalysis` (`src/lib/analysis-store.ts`).
5. Session status updated through `getSessionStatusAfterAnalysis` (`src/lib/session-status.ts`); UI refetches or navigates via RSC page `src/app/(app)/sessions/[id]/page.tsx`.

### Dual-book workbench path

1. Upload with `mode=dual` creates session with two books and chapters (`src/lib/upload/process.ts`, chapter APIs under `src/app/api/analyze/chapter/route.ts`, `src/app/api/analyze/book/route.ts`).
2. User edits blueprint in workbench client (`src/app/(app)/sessions/[id]/workbench/workbench-client.tsx`) → PATCH `/api/blueprint` → confirm `/api/blueprint/confirm`.
3. Generation uses `/api/generate-v2` with confirmed blueprint (+ optional `briefId`) (`src/app/api/generate-v2/route.ts`).

### Studio SSE streaming (outline preview)

1. Client POST `/api/generate/preview` with `briefId` (`src/app/api/generate/preview/route.ts`).
2. Route validates brief + confirmed blueprint via `validateConfirmedBlueprintForBrief` (`src/lib/brief-workflow.ts`).
3. `streamLLMObject` emits partial objects; `sseResponse` (`src/lib/streaming/sse.ts`) wraps as `event: partial|done|error`.
4. Client `consumeSseStream` (`src/lib/streaming/sse-client.ts`) drives UI in `src/components/creative-brief/outline-streamer.tsx`.

**State Management:**
- **Server state:** Postgres via Supabase; session `status`, analysis `result` JSONB, blueprint `sections`.
- **URL state:** Workflow steps use `searchParams` (`step`, `panel`) on session and workbench pages.
- **Client state:** React `useState` / hooks in feature components; React Context for compare UI sync (`src/lib/compare/drawer-context.tsx`, `src/lib/compare/sync-context.tsx`).
- **No global client store:** `zustand` is listed in `package.json` but not imported under `src/`.

## Key Abstractions

**Session status machine:**
- Purpose: Gate concurrent analyze vs generate operations.
- Examples: `src/lib/session-status.ts`, checks in `src/app/api/analyze/route.ts` and `src/app/api/generate/route.ts`.
- Pattern: Pure functions returning next status; routes enforce with HTTP 409 messages.

**Analysis dimension registry:**
- Purpose: Map `worldview` | `characters` | `narrative` | extended dimensions to prompt + Zod schema.
- Examples: `src/lib/prompts/index.ts`, `ANALYSIS_DIMENSION_CONFIG`, extended routes in `src/app/api/analyze/extended/route.ts`.
- Pattern: Config object consumed by analyze routes and UI labels in `DIMENSION_LABELS` (`src/lib/types.ts`).

**LLM client + runtime:**
- Purpose: Single entry for BYOK credentials, timeouts, usage accounting, structured output mode resolution.
- Examples: `src/lib/llm/dispatch.ts`, `src/lib/llm/runtime.ts`, `src/lib/llm/structured-output.ts`, `src/lib/llm/errors.ts`.
- Pattern: Routes catch `asLLMClientError` and map to JSON errors; successful calls write `llm_usage_events`.

**Blueprint document:**
- Purpose: Structured meta/structure/paragraph plan for dual-book variant generation.
- Examples: `src/lib/blueprint/schema.ts`, `src/lib/blueprint/merge.ts`, API `src/app/api/blueprint/route.ts`.
- Pattern: Optimistic concurrency via `expectedUpdatedAt` on PATCH; `status: confirmed` required before studio generate paths.

**Creative brief:**
- Purpose: Four-column directives (persona/plot/style/retention) for studio iteration.
- Examples: `src/lib/types/creative-brief.ts`, `src/lib/prompts/brief-compose.ts`, CRUD `src/app/api/briefs/route.ts`.
- Pattern: Brief must align `session_id` with confirmed blueprint (`src/lib/brief-workflow.ts`).

## Entry Points

**HTTP (browser):**
- Location: `src/app/page.tsx`
- Triggers: Visit `/`
- Responsibilities: Redirect authenticated users to `/sessions`, others to `/login`.

**Edge middleware:**
- Location: `middleware.ts`
- Triggers: All non-static routes per `config.matcher`
- Responsibilities: Refresh Supabase session cookies; redirect unauthenticated users to `/login` except `PUBLIC_PATHS`.

**Authenticated app shell:**
- Location: `src/app/(app)/layout.tsx`
- Triggers: Any route under `(app)/`
- Responsibilities: Require user; render `Sidebar`, `MobileNav`, `UserMenu`.

**API Route Handlers (18 routes):**
- Location: `src/app/api/**/route.ts`
- Triggers: `fetch` / form posts from client components
- Responsibilities: Auth check, Zod parse, `loadActiveSession`, rate limit, LLM or DB mutation. Long routes set `export const runtime = "nodejs"` and `maxDuration = 300`.

**Server Actions:**
- Location: `src/lib/upload/actions.ts`, `src/app/(auth)/actions.ts`, `src/app/(app)/settings/actions.ts`
- Triggers: Form submission or direct invocation from client components
- Responsibilities: Upload init/finalize, auth signup/login flows, LLM settings persistence.

## Architectural Constraints

- **Threading:** Node.js serverless/Node runtime per route; no worker threads. LLM calls use `withTimeout` in `src/lib/llm/runtime.ts` (default 60s, routes up to 300s via `maxDuration`).
- **Global state:** No shared in-memory app state across requests. Per-request Supabase client from `cookies()` in `src/lib/supabase/server.ts`.
- **Service role:** `createServiceClient()` exists in `src/lib/supabase/server.ts` but is unused in `src/` — all production paths use RLS anon client with `user_id` filters.
- **Layering:** `src/lib/**` must not import from `src/components/**` (verified: zero matches).
- **Dual vs single routing:** Dual sessions redirect legacy analysis UI to workbench (`src/app/(app)/sessions/[id]/page.tsx`); single-book uses inline `AnalysisPanel`.

## Anti-Patterns

### Calling legacy analyze API on dual sessions

**What happens:** POST `/api/analyze` for a `mode=dual` session returns 409 with message to use workbench chapter analysis (`src/app/api/analyze/route.ts`).
**Why it's wrong:** Dual flow uses per-chapter `chapter_brief` and `book_synthesis` dimensions, not legacy book-level three dimensions alone.
**Do this instead:** Use workbench batch/chapter endpoints (`src/app/api/analyze/chapter/route.ts`, `src/app/api/analyze/book/route.ts`) from `src/components/workbench/*`.

### Studio generate without confirmed blueprint

**What happens:** Brief-based preview/iterate routes fail validation with 409 (`src/lib/brief-workflow.ts`).
**Why it's wrong:** Studio prompts assume merged blueprint + brief directives; draft blueprint is incomplete.
**Do this instead:** Confirm via `/api/blueprint/confirm` from workbench before `/api/generate/preview` or `/api/generate/iterate`.

### Importing UI from domain modules

**What happens:** Would invert dependency direction and pull client bundles into server-only code paths.
**Why it's wrong:** Breaks RSC/server-only boundaries and causes circular build issues.
**Do this instead:** Keep presentation in `src/components/`; pass serializable props from RSC pages or API JSON.

## Error Handling

**Strategy:** Route-local `jsonError` helpers + typed `LLMError` from `src/lib/llm/errors.ts`; user-facing Chinese messages; HTTP status reflects auth (401), validation (400), conflict (409), LLM timeout (504).

**Patterns:**
- API routes: `try/catch` around `runLLMObject` / `streamLLMObject`, map via `asLLMClientError(e)`.
- Session guard: `loadActiveSession` returns `{ ok: false, status, message }` — routes return early without throwing.
- SSE: Producer throws → single `event: error` then stream close (`src/lib/streaming/sse.ts`).
- Client toasts: `src/lib/error-toast.ts` for consistent Sonner messaging.

## Cross-Cutting Concerns

**Logging:** `console.error` with structured context prefixes (e.g. `[upload.ingest.failure]`, `[rate-limit]`); no third-party APM in app code.

**Validation:** Zod at API boundary; blueprint `BlueprintSchema`; analysis outputs validated with dimension-specific schemas before `saveAnalysis`.

**Authentication:** Supabase Auth email/password; `safeGetUser` in middleware and layouts (`src/lib/supabase/auth.ts`); BYOK keys encrypted with `ENCRYPTION_KEY` via `src/lib/crypto.ts`.

---

*Architecture analysis: 2026-05-26*
