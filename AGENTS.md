# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project

NovelFusion AI — Next.js 15 + Supabase SaaS. Users upload a `.txt` novel, get a structured AI analysis on three dimensions (worldview / characters / narrative), then generate a variant novel. This is the v0.1 MVP closed loop; richer features (5 dimensions, comparison view, D3 graphs, multi-format upload, export) are deferred to V2.

## Commands

```bash
npm run dev         # next dev --turbopack (http://localhost:3000)
npm run build       # next build
npm run start       # next start (after build)
npm run lint        # next lint (ESLint flat config via eslint-config-next)
npm run type-check  # tsc --noEmit  — use this, the build does not type-check

# Tests use node:test directly; there is no test runner script.
node --test --import tsx src/lib/llm-config.test.ts                  # single file
node --test --import tsx 'src/**/*.test.ts'                          # all
```

Tests are colocated as `*.test.ts` next to the file they cover and use `node:test` + `node:assert/strict`. `tsconfig.json` excludes `**/*.test.ts` from the build.

## Architecture

### Route layout (App Router with route groups)
- `src/app/(auth)/` — public auth pages. `actions.ts` exports `submitPasswordAuth` / `signOut` Server Actions.
- `src/app/(app)/` — authenticated app. The group `layout.tsx` does a server-side `supabase.auth.getUser()` and redirects to `/login` if absent, then renders the `Sidebar` + `UserMenu` shell. Pages: `dashboard`, `upload` (stub), `sessions` (stub), `settings` (LLM config form).
- `src/app/auth/callback/` — placeholder for an OAuth callback; email-confirm must be disabled in Supabase so password signup returns a session immediately.
- `src/app/page.tsx` — root redirect based on session.
- `middleware.ts` → `src/lib/supabase/middleware.ts:updateSession` runs on every non-static request, refreshes the Supabase session cookie, and gates routes. `PUBLIC_PATHS = ["/login"]`. Any other unauthenticated path redirects to `/login?redirect=<original>`.

### Supabase clients (three flavors — pick the right one)
- `src/lib/supabase/client.ts` → `createClient()` — **browser**, anon key, used from Client Components.
- `src/lib/supabase/server.ts` → `createClient()` — **server with user cookies**, anon key, RLS enforced. Use in Server Components, Server Actions, Route Handlers.
- `src/lib/supabase/server.ts` → `createServiceClient()` — **service role**, bypasses RLS. Only in trusted server contexts and only with an explicit `.eq("user_id", user.id)` filter. Never import into a client bundle.

### BYOK + single-model pattern (load-bearing — do not redesign)
Every LLM call (the 3 analysis dimensions and variant generation) reads the user's single `llm_config` row, decrypts the API key, and dispatches to a user-provided OpenAI-compatible endpoint via `@ai-sdk/openai`'s `createOpenAI({ baseURL })`. Supported endpoints are OpenAI, DeepSeek, and custom OpenAI-compatible gateways. Anthropic native endpoints are out of scope here. There is one model per user; tasks differ only by system prompt. Do not add per-task model selection or expand to a multi-preset UI — that was migration 0002's whole point.

- `src/lib/crypto.ts` — AES-GCM (`webcrypto`) wrapper. `ENCRYPTION_KEY` is a 32-byte base64 secret loaded from env. **Server-only**; the module would crash in a browser bundle, but the bigger reason is the threat model: the key must never reach the client. Exposes `encrypt`, `decrypt`, `maskApiKey`.
- `src/lib/llm-config.ts` — Zod `LLMConfigFormSchema` + the `LLMConfig` row type + `parseLLMConfigFormData` (with `allowEmptyApiKey` so the settings form lets users edit other fields without re-typing the key) + `selectLegacyPresetForMigration` (used by migration 0002's data move).
- `src/app/(app)/settings/actions.ts` — canonical example of the encrypt-then-upsert flow: empty `api_key` keeps the existing encrypted value; non-empty value is re-encrypted.

API keys must never appear in: client bundles, component props, URLs, server logs, or error responses. Decryption happens only inside Server Actions / Route Handlers.

### Database (Supabase Postgres, RLS-enforced)
Schema in `supabase/migrations/`. Run them in order in the SQL Editor.
- `0001_init.sql` — initial schema with **`llm_presets`** (multiple per user) plus `sessions`, `books`, `analyses`, `variants`, the `novels` storage bucket, the `touch_updated_at` trigger, and RLS policies `auth.uid() = user_id` on every table.
- `0002_simplify_auth_and_llm_config.sql` — collapses presets into a single **`llm_config`** row per user (uniqueness via `user_id unique`), data-migrates from `llm_presets` preferring `is_default=true` then oldest, renames `preset_id` → `llm_config_id` on `analyses`/`variants`, drops `llm_presets`. Any new code must target `llm_config` / `llm_config_id`, not the legacy `llm_presets` / `preset_id` names.
- `0003_restrict_llm_providers_to_openai_compatible.sql` — rewrites legacy `anthropic` rows to `custom` and tightens `llm_config.provider` to `openai | deepseek | custom`.

Domain enums (mirror these in `src/lib/types.ts` if you change the SQL):
- `sessions.status`: `draft | uploaded | analyzing | analyzed | generating | done`
- `analyses.dimension`: `worldview | characters | narrative` (also a `unique(book_id, dimension)` — one analysis per dimension per book)

`Database` in `src/lib/types.ts` is hand-rolled, not generated. Keep it in sync with migrations or regenerate it via `supabase gen types typescript` when the schema grows.

### Storage
Bucket `novels` is private, 50 MB cap, MIME-restricted (`text/plain`, `text/markdown`, `application/octet-stream`). RLS policy gates `bucket_id = 'novels' AND auth.uid()::text = storage.foldername(name)[1]`, so **uploads must use the path `{user_id}/...`** or they will 403. `next.config.ts` raises Server Actions body limit to 60 MB to accommodate the 50 MB cap.

### Analysis result schemas
`src/lib/types.ts` defines `WorldviewResultSchema`, `CharactersResultSchema`, `NarrativeResultSchema`, and `GenerateConfigSchema` as Zod. These are the contract the LLM must satisfy — use them with `generateObject` / `streamObject` from the `ai` SDK and store the validated result in `analyses.result`.

## Conventions

- **Server Action return shape**: `{ ok: true, message?, redirectTo? }` on success, `{ error: string }` on failure (Chinese user-facing copy). Don't throw across the action boundary. See `src/app/(auth)/actions.ts` and `src/app/(app)/settings/actions.ts`.
- **Path alias**: `@/*` → `./src/*`. Use it for all internal imports.
- **TypeScript**: strict mode on. `noEmit: true` — type-check runs separately from build.
- **Shadcn**: new-york style, neutral base, `cssVariables: true`. Add components under `src/components/ui/`; aliases live in `components.json`.
- **Dark mode**: forced via `className="dark"` on `<html>` in `src/app/layout.tsx`. No theme toggle yet — that's V2.
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
