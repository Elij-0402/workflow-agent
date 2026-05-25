# Codebase Concerns

**Analysis Date:** 2026-05-26

## Tech Debt

**Dual generation API surface (legacy vs blueprint):**
- Issue: Two parallel generation paths coexist: single-book `POST /api/generate` (`src/app/api/generate/route.ts`) and blueprint-driven `POST /api/generate-v2` (`src/app/api/generate-v2/route.ts`). Dual-book mode further gates legacy analyze via 409 in `src/app/api/analyze/route.ts`.
- Files: `src/app/api/generate/route.ts`, `src/app/api/generate-v2/route.ts`, `src/app/api/analyze/route.ts`, `src/lib/prompts/generate.ts`, `src/lib/prompts/generate-from-blueprint.ts`
- Impact: Duplicate prompt/schema maintenance, inconsistent feature parity (e.g. brief composition only on v2), and higher cognitive load for planners/executors choosing the right route.
- Fix approach: Document a deprecation matrix in code comments or ADR; converge on one generation entry with mode flags, or rename routes (`/api/generate/legacy`) and add shared orchestration in `src/lib/llm/runtime.ts`.

**Legacy vs extended analysis dimensions:**
- Issue: `LEGACY_ANALYSIS_DIMENSIONS` and extended dimensions (prose craft, emotion arc, etc.) share `src/lib/types.ts` but different API routes and UI panels. Single-book flow still centers on three legacy dimensions; extended analysis is separate (`src/app/api/analyze/extended/route.ts`).
- Files: `src/lib/types.ts`, `src/app/api/analyze/route.ts`, `src/app/api/analyze/extended/route.ts`, `src/app/(app)/sessions/[id]/extended-analysis-panel.tsx`
- Impact: Session status transitions (`src/lib/session-status.ts`) may not reflect extended-dimension completion; product behavior differs by mode without a single “analysis complete” model.
- Fix approach: Unify dimension registry with explicit `scope` (book/chapter/session) and drive status machine from one config object.

**Oversized UI and page modules:**
- Issue: Several components exceed 500–800 lines, mixing layout, data fetching assumptions, and dense form state.
- Files: `src/app/(app)/design-system/design-system-client.tsx` (~810 lines), `src/components/creative-brief/brief-editor.tsx` (~773), `src/lib/types.ts` (~700), `src/components/workbench/blueprint-cards.tsx` (~603), `src/components/workbench/blueprint-editor.tsx` (~594), `src/app/(app)/settings/settings-form.tsx` (~541), `src/app/(app)/sessions/SessionsClient.tsx` (~440)
- Impact: Harder reviews, merge conflicts, and risky refactors; subtle regressions in blueprint/brief flows.
- Fix approach: Extract presentational subcomponents and hooks (`useBlueprintEditor`, `useBriefSections`) under `src/components/workbench/` and `src/components/creative-brief/` without changing public routes.

**Monolithic shared types module:**
- Issue: `src/lib/types.ts` centralizes DB-aligned types, Zod schemas for analysis/generate results, and dimension constants.
- Files: `src/lib/types.ts`, widespread imports across `src/app/api/*` and `src/components/*`
- Impact: Any schema change recompiles large portions of the app; circular-import pressure if split carelessly.
- Fix approach: Split into `src/lib/types/database.ts`, `src/lib/types/analysis-schemas.ts`, `src/lib/types/generate-schemas.ts` with a thin `index.ts` re-export barrel.

**Documentation vs repository artifacts:**
- Issue: `README.md` references copying `.env.example`; `CONTRIBUTING.md` references `.env.e2e.example`. Neither file exists in the repo (only runtime `.env` used locally).
- Files: `README.md`, `CONTRIBUTING.md`, `tests/e2e/smoke.spec.ts` (reads `.env` directly)
- Impact: Onboarding friction and e2e setup ambiguity; contributors may commit secrets while improvising env files.
- Fix approach: Add sanitized `.env.example` and `.env.e2e.example` (names only, no values); point e2e helpers at `.env.e2e` per CONTRIBUTING.

**Unused service-role helper:**
- Issue: `createServiceClient()` in `src/lib/supabase/server.ts` is documented in `CONTRIBUTING.md` but has no call sites in `src/`; e2e uses `@supabase/supabase-js` admin client in `tests/e2e/smoke.spec.ts` instead.
- Files: `src/lib/supabase/server.ts`, `tests/e2e/smoke.spec.ts`, `CONTRIBUTING.md`
- Impact: Two patterns for bypassing RLS; risk of future misuse without `user_id` filters.
- Fix approach: Either wire server-only admin tasks through `createServiceClient()` with enforced filters, or remove export and document e2e-only admin pattern.

## Known Bugs

**Rate limit check after session status flip (stuck `analyzing` / `generating`):**
- Symptoms: User hits 429 or LLM failure after status was optimistically set to `analyzing` or `generating`; UI may show in-progress state until manual retry.
- Files: `src/app/api/analyze/route.ts` (sets `analyzing` before `assertWithinRateLimit`), `src/app/api/generate/route.ts` (sets `generating` before rate limit)
- Trigger: Burst parallel requests within the same 60s window; documented TOCTOU in `src/lib/rate-limit.ts`.
- Workaround: Retry after window elapses; analyze route rolls back to `uploaded` only when `statusFlipped && !analysisSaved` — rate-limit failure after flip still rolls back in analyze, but generate path should be verified similarly in `src/app/api/generate/route.ts` catch block.

**Hard delete: storage cleanup best-effort after DB delete:**
- Symptoms: Orphaned objects in Supabase Storage bucket `novels` after permanent session delete.
- Files: `src/app/api/sessions/[id]/route.ts`, `src/lib/sessions/storage-cleanup.ts`
- Trigger: `hard=true` delete succeeds on `sessions` row but `removeStorageObjects` logs error and continues (`console.error` only).
- Workaround: Manual storage janitor or retry cleanup job; consider deleting storage before DB or using a transaction/outbox.

**Middleware passes through on auth transport errors:**
- Symptoms: When `safeGetUser` throws (Supabase unreachable), middleware returns `NextResponse.next` without redirect (`src/lib/supabase/middleware.ts`), relying on per-route `getUser()` checks.
- Files: `src/lib/supabase/middleware.ts`, `src/lib/supabase/auth.ts`, `middleware.ts`
- Trigger: Transient Supabase/auth outage.
- Workaround: API routes return 401; pages may briefly render in ambiguous state — prefer fail-closed redirect or error boundary for app routes.

## Security Considerations

**Non-atomic LLM rate limiting (BYOK cost bypass):**
- Risk: Concurrent requests can exceed `DEFAULT_MAX_REQUESTS` (30/min per user) because `assertWithinRateLimit` counts then `runLLMObject` inserts usage later without reservation.
- Files: `src/lib/rate-limit.ts`, `src/lib/llm/runtime.ts`, all LLM API routes under `src/app/api/`
- Current mitigation: Documented limitation in `rate-limit.ts`; per-user RLS on `llm_usage_events`; user brings own API key (cost externalized).
- Recommendations: Postgres RPC with `INSERT ... ON CONFLICT` quota, or Redis `INCR` with TTL; reject at edge before status flips.

**Settings server actions probe arbitrary compatible URLs:**
- Risk: `src/app/(app)/settings/actions.ts` performs live HTTP probes (`fetchJsonWithTimeout`) to user-supplied base URLs with decrypted API keys — no `assertWithinRateLimit`.
- Files: `src/app/(app)/settings/actions.ts`, `src/lib/llm-config.ts` (`validateCompatibleBaseUrl`)
- Current mitigation: SSRF-oriented URL rules (HTTPS, block IPv4 literals and local hostnames) in `validateCompatibleBaseUrl`; tests in `src/lib/llm-config.test.ts`.
- Recommendations: Rate-limit probes per user; cap probe frequency in DB; optional allowlist mode for enterprise.

**`/design-system` not restricted to development:**
- Risk: README/CHANGELOG describe design reference as dev-only, but `src/app/(app)/design-system/page.tsx` has no `NODE_ENV` guard — any authenticated user can open `/design-system`.
- Files: `src/app/(app)/design-system/page.tsx`, `src/app/(app)/design-system/design-system-client.tsx`
- Current mitigation: Hidden from main nav only.
- Recommendations: Guard with `process.env.NODE_ENV === "development"` or feature flag; return 404 in production.

**E2E tests read `.env` including service role:**
- Risk: `tests/e2e/smoke.spec.ts` parses `.env` at module load and constructs admin Supabase client — pattern encourages keeping service role in a file that might be committed or shared.
- Files: `tests/e2e/smoke.spec.ts`, `tests/e2e/helpers/auth.ts`
- Current mitigation: `.gitignore` should exclude `.env` (verify locally; do not commit).
- Recommendations: Use `.env.e2e` only in e2e; never read `.env` from tests; load via Playwright `env` config.

**Encryption key rotation:**
- Risk: Rotating `ENCRYPTION_KEY` invalidates all `api_key_encrypted` rows without migration path (documented in README).
- Files: `src/lib/crypto.ts`, `src/app/(app)/settings/actions.ts`
- Current mitigation: Clear error `LLM_SAVED_API_KEY_DECRYPT_FAILED_MESSAGE` on decrypt failure.
- Recommendations: Support `encryption_version` re-wrap job or dual-key decrypt window (column exists on `llm_config` per `src/lib/llm-config.ts` type).

## Performance Bottlenecks

**Large inline novel content in Postgres:**
- Problem: Up to `INLINE_CLEANED_CONTENT_CHAR_LIMIT` (1,000,000 chars) stored inline on `books.cleaned_content` when under threshold (`src/lib/books/content.ts`).
- Files: `src/lib/books/content.ts`, `src/lib/upload/process.ts`, `src/app/api/analyze/route.ts` (loads excerpt up to `ANALYSIS_TEXT_CHAR_LIMIT` 80k)
- Cause: Single-row payloads and full-book reads for analysis/generation.
- Improvement path: Prefer storage-backed content for large books; stream excerpts; paginate chapter analysis (already chapter-scoped in dual mode via `src/app/api/analyze/chapter/route.ts`).

**Long-running serverless routes:**
- Problem: Multiple routes set `maxDuration = 300` (5 minutes) for LLM work.
- Files: `src/app/api/generate/route.ts`, `src/app/api/generate-v2/route.ts`, `src/app/api/analyze/route.ts`, `src/app/api/analyze/extended/route.ts`, `src/app/api/generate/iterate/route.ts`, `src/app/api/generate/preview/route.ts`
- Cause: Synchronous `runLLMObject` / `streamLLMObject` on Vercel/serverless timeouts.
- Improvement path: Background jobs (queue + webhook), or split chapter iteration into smaller API calls with client-side orchestration.

**Dual-book chapter analysis fan-out:**
- Problem: E2E `finishAnalyses` loops all chapters × books and POSTs `/api/analyze/chapter` sequentially (`tests/e2e/smoke.spec.ts`) — reflects real user cost/latency for large chapter counts.
- Files: `src/app/api/analyze/chapter/route.ts`, `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx`
- Cause: Per-chapter LLM calls without batching.
- Improvement path: Bounded concurrency pool on client; server-side batch endpoint with shared rate-limit reservation.

**Chapter parse CPU on server:**
- Problem: `POST /api/chapters/parse` runs `expandToChapters` on full `cleaned_content` without rate limit (non-LLM but CPU-heavy).
- Files: `src/app/api/chapters/parse/route.ts`, `src/lib/text/chapters.ts`
- Cause: Regex/length chunking on large strings in Node.
- Improvement path: Body size cap, per-user throttle, or move parsing to upload pipeline in `src/lib/upload/process.ts`.

## Fragile Areas

**Session status machine coupled to legacy analysis count:**
- Files: `src/lib/session-status.ts`, `src/app/api/analyze/route.ts`, `src/app/api/generate/route.ts`
- Why fragile: Status transitions use `LEGACY_ANALYSIS_DIMENSIONS.length` and optimistic `.eq("status", prior)` updates; dual-book and extended dimensions use parallel flows.
- Safe modification: Add tests in `src/lib/session-status.test.ts` (create if missing) before changing enums; mirror rollback pattern from analyze/generate catch blocks.
- Test coverage: `src/lib/session-status.test.ts` exists; no direct API route integration tests.

**Blueprint Zod parse at runtime:**
- Files: `src/lib/blueprint/schema.ts`, `src/app/api/generate-v2/route.ts`, `src/app/api/blueprint/route.ts`
- Why fragile: `BlueprintSchema.parse(bp.sections ?? emptyBlueprint())` failure returns 400/409 — user-edited JSON in DB can block generation after confirm.
- Safe modification: Validate on PATCH/confirm only; store schema version; migration for section shape changes.
- Test coverage: `src/lib/blueprint/schema.test.ts`, `src/lib/blueprint/merge.test.ts` — no route-level tests.

**Streaming SSE finalize path:**
- Files: `src/lib/streaming/sse.ts`, `src/app/api/generate/preview/route.ts`, `src/app/api/generate/iterate/route.ts`, `src/lib/llm/runtime.ts` (`streamLLMObject` + `finalize`)
- Why fragile: Client disconnect before `finalize()` may skip usage logging and leave partial state; errors become generic SSE `error` events.
- Safe modification: Idempotent usage logging; heartbeat events; client retry tokens.
- Test coverage: `src/lib/streaming/sse-client.test.ts`, `src/lib/streaming/client-state.test.ts` — no HTTP-level SSE tests.

**Compare insights aggregation:**
- Files: `src/app/api/compare/insights/route.ts` (~279 lines), `src/lib/compare/distance.ts`
- Why fragile: Loads multiple sessions/books/analyses; LLM call for narrative insights — sensitive to missing partial analysis data.
- Safe modification: Defensive guards per session; unit tests for insight input builder (extend `src/lib/compare/distance.test.ts` patterns).
- Test coverage: Distance math tested; API route untested.

## Scaling Limits

**Per-user LLM rate window:**
- Current capacity: 30 requests / 60s per user (`src/lib/rate-limit.ts`), soft-enforced.
- Limit: Burst concurrency can exceed cap; BYOK users pay provider overage.
- Scaling path: Atomic quota in Postgres (`supabase/migrations/0007_llm_runtime_governance.sql` defines `llm_usage_events`) or external rate-limiter.

**Upload size:**
- Current capacity: 50 MB per file (`src/lib/upload/shared.ts` `MAX_UPLOAD_BYTES`).
- Limit: Memory pressure during `src/lib/upload/process.ts` decode/clean on server; 1M-char inline DB rows.
- Scaling path: Streaming ingest, mandatory storage-backed cleaned content, chunked processing.

**Compare page session cap:**
- Current capacity: UI/docs reference up to 6 sessions (`README.md`, `src/app/(app)/compare/page.tsx`).
- Limit: Payload size and LLM cost for `/api/compare/insights` grow linearly with selection count.
- Scaling path: Precomputed compare snapshots; cache insight results per session set hash.

## Dependencies at Risk

**Vercel AI SDK + OpenAI-compatible assumption:**
- Risk: All providers forced through `@ai-sdk/openai` with custom `baseURL` (`package.json`, `src/lib/llm/dispatch.ts`); migration 0003 restricts providers.
- Impact: Native Anthropic/other SDK features unavailable; structured output mode varies by provider (`src/lib/llm/structured-output.ts`).
- Migration plan: Provider adapter table per provider family if multi-SDK support becomes required.

**Next.js 15 + React 19:**
- Risk: Bleeding-edge stack (`package.json`); App Router server actions and RSC boundaries easy to misuse.
- Impact: Subtle hydration/auth cookie issues with `@supabase/ssr`.
- Migration plan: Pin minors; run `npm run build` in CI (already in `.github/workflows/ci.yml`).

**Supabase client in middleware:**
- Risk: Session refresh on every matched request (`middleware.ts` matcher is broad).
- Impact: Latency and auth call volume at scale.
- Migration plan: Narrow matcher for static assets; cache session where safe.

## Missing Critical Features

**CI does not run Playwright e2e:**
- Problem: `.github/workflows/ci.yml` runs lint, type-check, unit tests, build — not `npm run test:e2e`.
- Blocks: Regression detection for upload → analyze → generate golden paths; dual-upload branch coverage in `tests/e2e/upload-branches.spec.ts`.

**No API route automated tests:**
- Problem: Zero `*.test.ts` under `src/app/api/`; LLM paths validated only indirectly via lib tests and manual/e2e.
- Blocks: Safe refactors of auth guards, rate limits, and status rollback in route handlers.

**Atomic cost estimate before batch chapter analysis:**
- Problem: Dual-book UX shows cost modal (per CHANGELOG) but concurrent chapter analyze still depends on client orchestration — server does not enforce prepaid quota.
- Blocks: Predictable BYOK spend caps for large books.

## Test Coverage Gaps

**API route handlers (all LLM and CRUD endpoints):**
- What's not tested: Auth 401, archived session 409, rate limit 429, status rollback, blueprint confirm gates.
- Files: `src/app/api/**/*.ts` (18 route modules)
- Risk: Regressions ship despite green `npm test` (lib-only).
- Priority: High

**React components (workbench, studio, compare):**
- What's not tested: Component behavior, form validation UX, SSE client reconnection.
- Files: `src/components/workbench/*`, `src/components/creative-brief/*`, `src/components/compare/*`, `src/app/(app)/**`
- Risk: UI breakage in blueprint/brief/compare flows.
- Priority: Medium

**Server actions for settings:**
- What's not tested: `src/app/(app)/settings/actions.ts` probe/save paths, encrypt round-trip integration.
- Files: `src/app/(app)/settings/actions.ts`, `src/lib/crypto.test.ts` (crypto only)
- Risk: SSRF validation bypass via form edge cases; decrypt failures on deploy.
- Priority: High

**Upload pipeline integration:**
- What's not tested: End-to-end `src/lib/upload/process.ts` with real Supabase storage (unit tests cover pieces: `src/lib/upload/shared.test.ts`, `src/lib/upload/route.test.ts`).
- Files: `src/lib/upload/process.ts`, `src/lib/upload/actions.ts`
- Risk: Encoding/cleaning regressions for CN novels; partial ingest states.
- Priority: Medium

**E2E environment isolation:**
- What's not tested: CI matrix for e2e; smoke spec depends on live LLM and Supabase credentials.
- Files: `tests/e2e/smoke.spec.ts`, `tests/e2e/upload-branches.spec.ts`, `playwright.config.ts`
- Risk: Flaky CI if enabled without secrets; false confidence if skipped.
- Priority: Medium

---

*Concerns audit: 2026-05-26*
