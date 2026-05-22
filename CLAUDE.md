# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

NovelFusion AI — Next.js 15 + Supabase SaaS. Users upload a `.txt` novel, get a structured AI analysis on three legacy dimensions (worldview / characters / narrative), then generate a variant novel. **V0.2** adds a dual-book blueprint workbench (chapter-level analysis → book synthesis → confirmed blueprint → blueprint-gated variant generation). **V0.3** adds creative briefs + outline/chapter iteration plus 4 extended analysis dimensions (prose_craft / emotion_arc / pacing_map / suspense_grid). V0.1 status, V0.2 workbench, and V0.3 brief flow each have their own section below — current code is V0.3.

## Commands

```bash
npm run dev         # next dev --turbopack (http://localhost:3000)
npm run build       # next build
npm run start       # next start (after build)
npm run lint        # next lint (legacy .eslintrc.json + eslint-config-next)
npm run type-check  # tsc --noEmit  — use this, the build does not type-check
npm run format      # prettier --write . (with prettier-plugin-tailwindcss)
npm run format:check # prettier --check . — CI-friendly

npm test                                                       # all unit tests (node:test + tsx)
npm run test:e2e                                               # Playwright e2e smoke
npm run test:e2e:headed                                        # Playwright with headed browser
node --test --import tsx src/lib/llm-config.test.ts            # single unit-test file
```

Unit tests are colocated as `*.test.ts` next to the file they cover and use `node:test` + `node:assert/strict`. `tsconfig.json` excludes `**/*.test.ts` from the build.

## Architecture

### Sub-CLAUDE.md cross-reference

Four nested CLAUDE.md files own local conventions — read whichever sits closest to the file you're editing. Local rules win over this root file when they conflict.

- `src/app/CLAUDE.md` — App Router groups, Server Action shape, single-vs-dual route gating, V0.3 route map.
- `src/lib/CLAUDE.md` — Supabase clients, BYOK/crypto, prompt registry, blueprint + brief Zod gates.
- `src/components/CLAUDE.md` — Atelier Terminal theme, font CSS variables, shadcn config, component subdirectory layout.
- `src/components/workbench/CLAUDE.md` — dual-mode workbench state flow, cost-estimate gate, file inventory.

### Route layout (App Router with route groups)

- `src/app/(auth)/` — public auth pages. `actions.ts` exports `submitPasswordAuth` / `signOut` Server Actions.
- `src/app/(app)/` — authenticated app. The group `layout.tsx` does a server-side `supabase.auth.getUser()` and redirects to `/login` if absent, then renders the `Sidebar` + `UserMenu` shell. V0.1 pages: `dashboard`, `upload`, `sessions`, `settings`. V0.2 adds `sessions/[id]/workbench`. V0.3 adds `studio` (+ `studio/new`, `studio/[briefId]`), `compare`, `sessions/archived`, `design-system`.
- `src/app/auth/callback/` — placeholder for an OAuth callback; email-confirm must be disabled in Supabase so password signup returns a session immediately.
- `src/app/page.tsx` — root redirect based on session.
- `middleware.ts` → `src/lib/supabase/middleware.ts:updateSession` runs on every non-static request, refreshes the Supabase session cookie, and gates routes. `PUBLIC_PATHS = ["/login"]`. Any other unauthenticated path redirects to `/login?redirect=<original>`.

### Supabase clients (three flavors — pick the right one)

- `src/lib/supabase/client.ts` → `createClient()` — **browser**, anon key, used from Client Components.
- `src/lib/supabase/server.ts` → `createClient()` — **server with user cookies**, anon key, RLS enforced. Use in Server Components, Server Actions, Route Handlers.
- `src/lib/supabase/server.ts` → `createServiceClient()` — **service role**, bypasses RLS. Only in trusted server contexts and only with an explicit `.eq("user_id", user.id)` filter. Never import into a client bundle.

### BYOK + single-model pattern (load-bearing — do not redesign)

Every LLM call (legacy 3 dimensions, V0.2 dual-mode chapter/book analyses, V0.3 4 extended dimensions, and every variant generation path) reads the user's single `llm_config` row, decrypts the API key, and dispatches to a user-provided OpenAI-compatible endpoint via `@ai-sdk/openai`'s `createOpenAI({ baseURL })`. Supported endpoints are OpenAI, DeepSeek, and custom OpenAI-compatible gateways. Anthropic native endpoints are out of scope here. There is one model per user; tasks differ only by system prompt. Do not add per-task model selection or expand to a multi-preset UI — that was migration 0002's whole point.

- `src/lib/crypto.ts` — AES-GCM (`webcrypto`) wrapper. `ENCRYPTION_KEY` is a 32-byte base64 secret loaded from env. **Server-only**; the module would crash in a browser bundle, but the bigger reason is the threat model: the key must never reach the client. Exposes `encrypt`, `decrypt`, `maskApiKey`.
- `src/lib/llm-config.ts` — Zod `LLMConfigFormSchema` + the `LLMConfig` row type + `parseLLMConfigFormData` (with `allowEmptyApiKey` so the settings form lets users edit other fields without re-typing the key) + `selectLegacyPresetForMigration` (used by migration 0002's data move).
- `src/app/(app)/settings/actions.ts` — canonical example of the encrypt-then-upsert flow: empty `api_key` keeps the existing encrypted value; non-empty value is re-encrypted.

API keys must never appear in: client bundles, component props, URLs, server logs, or error responses. Decryption happens only inside Server Actions / Route Handlers.

### Database (Supabase Postgres, RLS-enforced)

Schema in `supabase/migrations/`. Run them in order in the SQL Editor.

- `0001_init.sql` — initial schema with **`llm_presets`** (multiple per user) plus `sessions`, `books`, `analyses`, `variants`, the `novels` storage bucket, the `touch_updated_at` trigger, and RLS policies `auth.uid() = user_id` on every table.
- `0002_simplify_auth_and_llm_config.sql` — collapses presets into a single **`llm_config`** row per user (uniqueness via `user_id unique`), data-migrates from `llm_presets` preferring `is_default=true` then oldest, renames `preset_id` → `llm_config_id` on `analyses`/`variants`, drops `llm_presets`. Any new code must target `llm_config` / `llm_config_id`, not the legacy `llm_presets` / `preset_id` names.
- `0003_restrict_llm_providers_to_openai_compatible.sql` — rewrites legacy `anthropic` rows to `custom` and tightens `llm_config.provider` to `openai | deepseek | custom`.
- `0004_multi_book_blueprint_workbench.sql` — V0.2 dual-mode tables: `chapters`, `blueprints`; extends `analyses` with `scope` ('book'|'chapter') and `chapter_id` (partial unique indexes split book-scope vs chapter-scope to handle NULL chapter_id); adds `variants.blueprint_id`.
- `0005_session_archival.sql` — soft-delete: `sessions.archived_at timestamptz null` + composite index `(user_id, archived_at)`. Variants/books/chapters/analyses cascade through sessions, so list views filter `archived_at` on sessions alone.
- `0006_creative_briefs.sql` — V0.3 brief layer: new table `creative_briefs` (4 jsonb directive columns + `status` `draft|active|archived`); extends `variants` with `brief_id`, `parent_variant_id` (self-FK for iteration chain), `scope` (`outline|chapter|full`), `chapter_index`.

Domain enums (mirror these in `src/lib/types.ts` if you change the SQL):

- `sessions.status`: `draft | uploaded | analyzing | analyzed | generating | done`
- `sessions.mode`: `single | dual`
- `analyses.dimension`: `worldview | characters | narrative | chapter_brief | book_synthesis | prose_craft | emotion_arc | pacing_map | suspense_grid` — split into `LegacyAnalysisDimension` (first 3), dual-mode (`chapter_brief` / `book_synthesis`), and `ExtendedAnalysisDimension` (last 4) in `src/lib/types.ts`. Partial unique indexes enforce one analysis per `(book_id, dimension)` for book-scope and per `(chapter_id, dimension)` for chapter-scope.
- `analyses.scope`: `book | chapter`
- `variants.scope`: `outline | chapter | full`
- `creative_briefs.status`: `draft | active | archived`

`Database` in `src/lib/types.ts` is hand-rolled, not generated. Keep it in sync with migrations or regenerate it via `supabase gen types typescript` when the schema grows.

### Storage

Bucket `novels` is private, 50 MB cap, MIME-restricted (`text/plain`, `text/markdown`, `application/octet-stream`). RLS policy gates `bucket_id = 'novels' AND auth.uid()::text = storage.foldername(name)[1]`, so **uploads must use the path `{user_id}/...`** or they will 403. `next.config.ts` raises Server Actions body limit to 60 MB to accommodate the 50 MB cap.

### Analysis result schemas

`src/lib/types.ts` defines nine Zod schemas — three legacy dimensions (`WorldviewResultSchema`, `CharactersResultSchema`, `NarrativeResultSchema`), two dual-mode (`ChapterBriefResultSchema`, `BookSynthesisResultSchema`), four extended (`ProseCraftResultSchema`, `EmotionArcResultSchema`, `PacingMapResultSchema`, `SuspenseGridResultSchema`) — plus `GenerateConfigSchema` and `VariantResultSchema`. These are the contract the LLM must satisfy — use them with `generateObject` / `streamObject` from the `ai` SDK and store the validated result in `analyses.result`.

`src/lib/prompts/index.ts` is the single source of truth that binds each dimension to its system prompt + schema: `ANALYSIS_DIMENSION_CONFIG` (legacy 3) + `EXTENDED_ANALYSIS_DIMENSION_CONFIG` (extended 4). Don't fan out new dimension switches across routes — add the entry there and consume the config.

## Conventions

- **Server Action return shape**: `{ ok: true, message?, redirectTo? }` on success, `{ error: string }` on failure (Chinese user-facing copy). Don't throw across the action boundary. See `src/app/(auth)/actions.ts` and `src/app/(app)/settings/actions.ts`.
- **Path alias**: `@/*` → `./src/*`. Use it for all internal imports.
- **TypeScript**: strict mode on. `noEmit: true` — type-check runs separately from build.
- **Shadcn**: new-york style, neutral base, `cssVariables: true`. Add components under `src/components/ui/`; aliases live in `components.json`.
- **Dark mode / UI theme**: "Atelier Terminal" — dark-only, forced via `className="dark"` on `<html>` in `src/app/layout.tsx`. Five Google fonts are wired as CSS variables (`--font-display` Instrument Serif, `--font-sans` Inter Tight, `--font-mono` JetBrains Mono, `--font-zh-serif` Noto Serif SC, `--font-zh-sans` Noto Sans SC); Tailwind references them by variable, so new components should use `font-sans` / `font-mono` / `font-display` rather than hard-coding families. The `Toaster` in `layout.tsx` is custom-themed — match its mono/border style for any new global UI chrome. No theme toggle.
- **Local fixtures**: Test novels go in `samples/` (gitignored). The repo does not ship fixtures for the upload flow.
- **Language**: UI copy and user-facing errors are Chinese; code identifiers, comments, commit messages are English.

## Environment variables

Required for the app to run (set in `.env.local` for dev, Vercel env for prod):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ENCRYPTION_KEY=          # 32 bytes, base64 — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Rotating `ENCRYPTION_KEY` invalidates every stored `api_key_encrypted` and forces users to re-enter their keys.

## V0.1 status — what's wired vs stubbed

Wired: email/password auth, route gating, sidebar shell, `llm_config` CRUD + AES-GCM encryption, `/upload` form (`src/components/upload/upload-form.tsx` + `src/lib/upload/actions.ts`), `/sessions` list, `/dashboard` (queries `llm_config` + `sessions` + `variants`), `src/lib/llm/dispatch.ts` (`getUserLLMClient`), `src/lib/text/clean.ts` + `decode.ts`, three dimension prompts (`src/lib/prompts/{worldview,characters,narrative}.ts`) and the variant generate prompt (`src/lib/prompts/generate.ts`), API routes `src/app/api/analyze/route.ts` and `src/app/api/generate/route.ts`.
Stubbed / V2: variant UI polish, cards/export, multi-session selection, payment/pricing experiment, dedicated chunking layer for >150 万字 novels.

## V0.2 — Dual-book blueprint workbench

Wired in dual mode (`sessions.mode='dual'`):

- `/upload?mode=dual` flow + workbench empty-slot "添加第二本书" link
- `/sessions/[id]/workbench` page (server component fetches everything, hands a `WorkbenchClient` shell with: chapter tree per book, candidate picker, blueprint editor, pipeline bar, variant comparison)
- New tables: `chapters`, `blueprints` (see `supabase/migrations/0004_multi_book_blueprint_workbench.sql`)
- `analyses` extended with `scope` ('book'|'chapter') and `chapter_id`; partial unique indexes split book-scope vs chapter-scope to handle NULL chapter_id correctly
- `variants.blueprint_id` (nullable for legacy single-mode rows; required in app layer for dual)
- API: `/api/chapters/parse`, `/api/analyze/chapter`, `/api/analyze/book`, `/api/blueprint` (PATCH), `/api/blueprint/confirm`, `/api/blueprint/unconfirm`, `/api/generate-v2`
- Prompts: `src/lib/prompts/chapter-brief.ts`, `book-synthesis.ts`, `generate-from-blueprint.ts`
- Blueprint lib: `src/lib/blueprint/{schema,merge}.ts` — Zod schema validates every write, `applyCandidate` dedupes by per-section identity key + source dedup
- Variant diff: `src/lib/diff/variant-diff.ts` — three-layer (meta / structure / paragraph LCS, normalize whitespace+punct)
- Cost estimator: `src/lib/cost/estimate.ts` — pre-batch confirmation modal

Old single-book sessions (`mode='single'`) keep the legacy `AnalysisPanel`/`GeneratePanel`/`VariantList` path; `src/app/(app)/sessions/[id]/page.tsx` server-side redirects dual to `/workbench`. Legacy `/api/analyze` and `/api/generate` reject dual sessions explicitly (409) so the old UI cannot accidentally bypass the blueprint gate.

Constraint: every blueprint write goes through `BlueprintSchema.parse`. `/api/generate-v2` requires `blueprints.status='confirmed'`. Chapter-level analysis is client-orchestrated (no worker) — concurrency cap 3 in `src/app/(app)/sessions/[id]/workbench/chapter-batch.ts`, with a cost-estimate modal before each batch.

Type aliases: `LegacyAnalysisDimension` is the 3-dim subset used by legacy single-mode code paths (analysis-panel, `ANALYSIS_DIMENSION_CONFIG`); `ExtendedAnalysisDimension` is the V0.3 4-dim subset (`EXTENDED_ANALYSIS_DIMENSION_CONFIG`); the top-level `AnalysisDimension` union also includes `chapter_brief` and `book_synthesis` used by dual-mode `analyses` rows.

## V0.3 — Creative briefs + outline/chapter iteration

Layer on top of a confirmed dual-mode blueprint. Users author a **creative brief** that encodes their intended re-write — persona changes, plot directives, style preferences, retention rules — then iterate chapter-by-chapter against that brief.

### New table: `creative_briefs` (migration 0006)

One brief per project (multiple briefs per session allowed). Columns: `id`, `user_id`, `session_id`, `title`, four jsonb directive arrays/objects, `status` (`draft | active | archived`). RLS by `auth.uid() = user_id`. `touch_updated_at` trigger wired.

### `variants` extensions

`brief_id` (FK to `creative_briefs`, null = legacy), `parent_variant_id` (self-FK, forms the iteration chain), `scope` (`outline | chapter | full`), `chapter_index` (1-based, only meaningful when `scope='chapter'`).

### Gate chain

`blueprint.draft → blueprint.confirmed` (V0.2 gate, unchanged) → `/api/generate/preview` requires `blueprints.status='confirmed'` and injects the brief via `composeBriefIntoPrompt`, writes a row `variants(scope='outline', brief_id=…)` → `/api/generate/iterate` accepts that outline variant + optional previous chapter variant, writes `variants(scope='chapter', parent_variant_id=…, brief_id=…)`. Brief CRUD itself (`/api/briefs`) does **not** require a confirmed blueprint — it gates only at preview time.

### New API routes

- `/api/briefs` — `GET` list by `sessionId`, `POST` create (`{ sessionId, brief }` parsed through `CreativeBriefSchema`).
- `/api/briefs/[id]` — `GET` / `PATCH` (partial: title, directives, or status via `CreativeBriefStatusSchema`) / `DELETE` (hard).
- `/api/generate/preview` — `POST` `{ briefId, targetChapterCount? }`, SSE stream of `OutlineSchema` partials, persists outline variant.
- `/api/generate/iterate` — `POST` `{ briefId, outlineVariantId, chapterIndex, previousVariantId?, feedback? }`, SSE stream of `VariantResultSchema` partials, persists chapter variant linked via `parent_variant_id`. Validates `outlineVariant.scope === 'outline'` and `outlineVariant.session_id === brief.session_id`.
- `/api/analyze/extended` — `POST` `{ bookId, dimension }` where `dimension ∈ ExtendedAnalysisDimension`. Non-streaming `generateObject`. Wraps the excerpt with `wrapUntrustedNovel` before sending.
- `/api/sessions/[id]` — `DELETE` (soft archive sets `archived_at`; `?hard=true` cascades), `PATCH` (restore by setting `archived_at=null`).
- `/api/sessions/bulk` — `POST` `{ action: 'archive' | 'restore' | 'delete', ids[] (max 100) }`.
- `/api/variants/[id]` — `DELETE`.

### New prompts

`src/lib/prompts/brief-compose.ts` (`composeBriefIntoPrompt` serializes brief to Chinese markdown sections + `detectBriefConflicts`), `preview-outline.ts` (`PREVIEW_OUTLINE_SYSTEM_PROMPT`, `buildPreviewOutlineUserPrompt`, `OutlineSchema`), `iterate-chapter.ts` (`ITERATE_CHAPTER_SYSTEM_PROMPT`, `ITERATE_CHAPTER_RESULT_SCHEMA = VariantResultSchema`, `buildIterateChapterUserPrompt`), `safety.ts` (`wrapUntrustedNovel` + `UNTRUSTED_NOVEL_RULE` — every excerpt sent to an LLM should pass through this), plus the four extended-dimension prompts (`prose-craft`, `emotion-arc`, `pacing-map`, `suspense-grid`).

### New infra

`src/lib/streaming/sse.ts:sseResponse(producer)` wraps an async producer into a Server-Sent Events `Response` — used by `/api/generate/preview` and `/api/generate/iterate`. Producer emits `{ type: 'partial' | 'done' | 'error', data | message }`.

`src/lib/types/creative-brief.ts` — Zod schemas for the four directive shapes (`PersonaDirectiveSchema`, `PlotDirectiveSchema`, `StyleDirectiveSchema`, `RetentionRuleSchema`) + top-level `CreativeBriefSchema`. **Every brief write goes through `CreativeBriefSchema.parse`.**

### UI surface

`/studio` lists briefs grouped by project. `/studio/new?sessionId=…` opens the BriefEditor in create mode. `/studio/[briefId]` shows BriefEditor (4 tabs: persona / plot / style / retention) + `OutlineStreamer` (SSE client). `/compare?sessionIds=a,b,c` shows up to 6 sessions side-by-side across all analysis dimensions. `/sessions/archived` lists soft-deleted sessions. `/design-system` is the Linear-style visual reference (Atelier Terminal residual).

## gstack

Use gstack's `/browse` skill for ALL web browsing. NEVER use `mcp__claude-in-chrome__*` tools.

Available skills:

- `/office-hours`
- `/plan-ceo-review`
- `/plan-eng-review`
- `/plan-design-review`
- `/design-consultation`
- `/design-shotgun`
- `/design-html`
- `/review`
- `/ship`
- `/land-and-deploy`
- `/canary`
- `/benchmark`
- `/browse`
- `/connect-chrome`
- `/qa`
- `/qa-only`
- `/design-review`
- `/setup-browser-cookies`
- `/setup-deploy`
- `/setup-gbrain`
- `/retro`
- `/investigate`
- `/document-release`
- `/document-generate`
- `/codex`
- `/cso`
- `/autoplan`
- `/plan-devex-review`
- `/devex-review`
- `/careful`
- `/freeze`
- `/guard`
- `/unfreeze`
- `/gstack-upgrade`
- `/learn`
