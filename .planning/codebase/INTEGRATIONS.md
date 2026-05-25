# External Integrations

**Analysis Date:** 2026-05-26

## APIs & External Services

**LLM (BYOK — user-provided):**
- OpenAI-compatible HTTP APIs (OpenAI, DeepSeek, or custom HTTPS gateways)
  - SDK/Client: `@ai-sdk/openai` `createOpenAI({ apiKey, baseURL })` in `src/lib/llm/dispatch.ts`
  - Orchestration: Vercel AI SDK `ai` (`generateObject`, `streamObject`) in `src/lib/llm/runtime.ts`
  - Auth: per-user `api_key_encrypted` in Postgres `llm_config`; decrypted server-side with `ENCRYPTION_KEY` — never sent to browser
  - Base URL validation: `validateCompatibleBaseUrl()` in `src/lib/llm-config.ts` (HTTPS only, blocks Anthropic native host, private hostnames, IP literals)
  - Known host labels: `api.openai.com`, `api.deepseek.com`, else `custom`
  - Usage metering: rows in `llm_usage_events` (migration `supabase/migrations/0007_llm_runtime_governance.sql`)

**Application API surface (first-party, Next.js Route Handlers):**
- Analysis: `src/app/api/analyze/route.ts`, `analyze/chapter/route.ts`, `analyze/book/route.ts`, `analyze/extended/route.ts`
- Generation: `src/app/api/generate/route.ts`, `generate-v2/route.ts`, `generate/preview/route.ts`, `generate/iterate/route.ts`
- Workbench: `src/app/api/blueprint/route.ts`, `blueprint/confirm/route.ts`, `blueprint/unconfirm/route.ts`
- Sessions/variants: `src/app/api/sessions/[id]/route.ts`, `sessions/bulk/route.ts`, `variants/[id]/route.ts`
- Creative briefs: `src/app/api/briefs/route.ts`, `briefs/[id]/route.ts`
- Utilities: `src/app/api/chapters/parse/route.ts`, `compare/insights/route.ts`
- Streaming: SSE via `src/lib/streaming/sse.ts` (`text/event-stream`) on iterate/preview/generate routes; client consumer `src/lib/streaming/sse-client.ts`

## Data Storage

**Databases:**
- Supabase Postgres (managed)
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (RLS-scoped) or `SUPABASE_SERVICE_ROLE_KEY` (server-only bypass in `createServiceClient()` — must always filter by `user_id`)
  - Client: `@supabase/supabase-js` typed with `Database` from `src/lib/types.ts`
  - Schema source: `supabase/migrations/` (sessions, books, analyses, variants, blueprints, creative_briefs, llm_config, llm_usage_events, archival, etc.)
  - Security: RLS on all user tables (`auth.uid() = user_id` policies from `0001_init.sql` onward)

**File Storage:**
- Supabase Storage bucket `novels` (private)
  - Browser upload: `src/components/upload/use-novel-upload.ts` → `supabase.storage.from("novels").upload(...)`
  - Server read/process: `src/lib/upload/process.ts`, `src/lib/books/content.ts`
  - Path convention: `{user_id}/...` enforced in upload actions (`src/lib/upload/actions.ts`, `src/lib/upload/shared.ts`)
  - Cleanup: `src/lib/sessions/storage-cleanup.ts`

**Caching:**
- None (no Redis/Memcached). LLM response caching uses deterministic `cache_key` hashes stored on analyses/variants rows for dedup/metadata, not a separate cache service (`src/lib/llm/runtime.ts` `createCacheKey`)

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (email + password)
  - Implementation: `src/app/(auth)/actions.ts` (`signUp`, `signInWithPassword`), login UI `src/app/(auth)/login/`
  - Session: cookie-based SSR via `@supabase/ssr` in `src/lib/supabase/middleware.ts` + root `middleware.ts`
  - Protected routes: middleware redirects unauthenticated users to `/login`; public path list includes `/login` only
  - No OAuth/social providers detected in codebase

**Secrets at rest:**
- User LLM API keys: AES-256-GCM in `src/lib/crypto.ts`, column `llm_config.api_key_encrypted`, key from `ENCRYPTION_KEY` env

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry/Datadog/etc. SDK in `package.json` or `src/`)

**Logs:**
- Server `console.error` for operational failures (e.g. `src/lib/rate-limit.ts`, `src/lib/upload/actions.ts` ingest failures)
- No structured logging pipeline or log shipping integration

## CI/CD & Deployment

**Hosting:**
- Vercel (documented in `README.md`); `.vercel` directory gitignored

**CI Pipeline:**
- GitHub Actions — `.github/workflows/ci.yml`
  - Triggers: push to `main`, all pull requests
  - Steps: `npm ci`, `npm run lint`, `npm run type-check`, `npm test`, `npm run build`
  - Node 20, no E2E job in CI

**Local E2E:**
- Playwright manages `npm run build && npm run start -- -p 3001` when `E2E_BASE_URL` defaults to `http://127.0.0.1:3001` (`playwright.config.ts`)
- Requires live Supabase + real BYOK LLM credentials (README)

## Environment Configuration

**Required env vars (application):**
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key for browser and SSR cookie client
- `SUPABASE_SERVICE_ROLE_KEY` — service role for trusted server paths only (`createServiceClient()`)
- `ENCRYPTION_KEY` — 32-byte base64 AES key for API key encryption (`src/lib/crypto.ts`)

**E2E / local test (optional, not for production app boot):**
- `E2E_LOGIN_EMAIL`, `E2E_LOGIN_PASSWORD`
- `E2E_LLM_BASE_URL`, `E2E_LLM_API_KEY`, `E2E_LLM_MODEL`
- `E2E_BASE_URL`, `PW_HEADLESS`, `CI` (Playwright behavior)

**Secrets location:**
- Local: `.env` / `.env.local` (gitignored; `.env` noted present in workspace — do not commit)
- Production: Vercel project environment variables (README)
- User LLM keys: encrypted in Supabase Postgres, not in env

## Webhooks & Callbacks

**Incoming:**
- None — no Stripe, Supabase webhooks, or third-party callback Route Handlers in `src/app/api/`

**Outgoing:**
- HTTPS requests from server to user-configured LLM `base_url` on analyze/generate/compare-insights flows
- No outbound webhook dispatch to external systems detected

## Rate Limiting & Governance

**In-app rate limit:**
- Postgres-backed count of `llm_usage_events` per user per 60s window (`src/lib/rate-limit.ts`, default 30 requests/minute)
- Known limitation: read-check without atomic increment (documented in module comment)

**Connection health:**
- `llm_config` columns `last_connection_status`, `last_validated_at`, etc. (`0007_llm_runtime_governance.sql`)

## Third-Party UI / Assets

- Google Fonts / shadcn defaults via `src/app/globals.css` (standard Next/shadcn setup)
- No payment, email (SendGrid), or analytics integrations in application `src/`

---

*Integration audit: 2026-05-26*
