# Coding Conventions

**Analysis Date:** 2026-05-26

## Naming Patterns

**Files:**
- Domain and library modules: `kebab-case.ts` — e.g. `src/lib/auth/password-auth.ts`, `src/lib/text/chapters.ts`
- Unit tests: co-located `*.test.ts` beside the module under test — e.g. `src/lib/crypto.test.ts`
- React components: mostly `kebab-case.tsx` under feature folders — e.g. `src/components/upload/dual-upload-form.tsx`, `src/components/sessions/generate-panel.tsx`
- Compare UI uses `PascalCase.tsx` filenames — e.g. `src/components/compare/DetailDrawer.tsx`, `src/components/compare/CompareAtlas.tsx`
- App Router pages and layouts: `page.tsx`, `layout.tsx`, `error.tsx`, `loading.tsx` inside route segments — e.g. `src/app/(app)/sessions/[id]/workbench/page.tsx`
- API routes: `route.ts` in `src/app/api/**/`
- Client-only route helpers: `*-client.tsx` — e.g. `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx`
- Hooks: `use-*.ts` in `src/hooks/` — e.g. `src/hooks/use-tab-state.ts`

**Functions:**
- Use `camelCase` for functions and methods — e.g. `loadActiveSession`, `buildGenerateUserPrompt`, `assertWithinRateLimit`
- Prefix pure validators/mappers with verbs that describe behavior: `parse*`, `map*`, `build*`, `resolve*`, `normalize*`, `derive*`, `as*`
- Server Actions in `src/app/**/actions.ts` use verb phrases — e.g. `submitPasswordAuth`

**Variables:**
- `camelCase` for locals and parameters
- `SCREAMING_SNAKE_CASE` for module-level constants — e.g. `DEFAULT_PROMPT_VERSION` in `src/lib/prompts/index.ts`, `PREFIX` in `src/hooks/use-tab-state.ts`
- Destructured Supabase rows use snake_case field names matching DB columns — e.g. `session_id`, `user_id`, `updated_at`

**Types:**
- Prefer `export type X = z.infer<typeof XSchema>` next to Zod schemas — e.g. `PasswordAuthForm` in `src/lib/auth/password-auth.ts`
- Zod schemas: `PascalCase` + `Schema` suffix — e.g. `BlueprintSchema`, `LLMConfigFormSchema` in `src/lib/blueprint/schema.ts`, `src/lib/llm-config.ts`
- Discriminated result types use `{ ok: true } | { ok: false; ... }` — e.g. session guards in `src/lib/sessions/guard.ts`, rate limiting in `src/lib/rate-limit.ts`
- Shared domain types live in `src/lib/types.ts` and `src/lib/types/creative-brief.ts`; import via `@/lib/types` or specific modules
- React component props: `ComponentNameProps` — e.g. `ButtonProps` in `src/components/ui/button.tsx`

## Code Style

**Formatting:**
- Prettier 3 (`npm run format` / `format:check`) with `prettier-plugin-tailwindcss` (declared in `package.json`; no committed `.prettierrc` — defaults apply)
- Use double-quoted strings and semicolons (consistent across `src/`)
- 2-space indentation
- Tailwind class order is normalized by the Prettier Tailwind plugin when formatting

**Linting:**
- ESLint 9 via Next.js: `.eslintrc.json` extends `next/core-web-vitals` only
- Run `npm run lint` (`next lint`) before CI; no custom rule files beyond that extend

**TypeScript:**
- `strict: true`, `allowJs: false` in `tsconfig.json`
- Path alias: `@/*` → `./src/*` — always use `@/` for cross-module imports under `src/`
- Test files (`**/*.test.ts`) are excluded from `tsc` `include` via `exclude`; run `npm run type-check` for app code, `npm test` for unit tests
- Prefer explicit return types on exported public APIs when non-obvious; inference is fine for small internal helpers

## Import Organization

**Order:**
1. Node built-ins (`node:test`, `node:assert/strict`, `node:path`, etc.)
2. External packages (`next/*`, `react`, `zod`, `@supabase/*`, `ai`, etc.)
3. Internal absolute imports (`@/lib/...`, `@/components/...`)
4. Relative imports (`./foo`, `../bar`) — same-directory siblings last

**Path Aliases:**
- `@/*` maps to `src/*` per `tsconfig.json`
- Do not use deep relative paths like `../../../lib` when `@/lib/...` is available

**Relative import extensions:**
- Application code: omit `.ts` / `.tsx` in imports — e.g. `from "./schema"` in `src/lib/blueprint/schema.test.ts`
- Some unit tests import with explicit `.ts` suffix (both styles exist) — e.g. `from "./crypto.ts"` in `src/lib/crypto.test.ts`, `from "./llm-config.ts"` in `src/lib/llm-config.test.ts`
- Prefer extensionless relative imports for new tests unless setting `process.env` before the module loads (see `src/lib/crypto.test.ts`)

**Barrel files:**
- Rare; only notable barrel is `src/lib/prompts/index.ts` for analysis dimension config
- Do not add new catch-all barrels; import from the defining module

## Error Handling

**API Route Handlers (`src/app/api/**/route.ts`):**
- Export `export const runtime = "nodejs"` on routes that use Node crypto, long LLM calls, or Supabase server client
- Authenticate early: `createClient()` + `getUser()`; return `NextResponse.json({ error: "请先登录。" }, { status: 401 })` when unauthenticated
- Parse bodies with Zod (`bodySchema.parse` / `safeParse`); on failure return `400` with Chinese messages — e.g. `"请求参数不正确。"` in `src/app/api/blueprint/route.ts`
- Use session guards (`loadActiveSession`) and map `guard.ok === false` to the guard’s `status` and `message`
- Optimistic concurrency: compare `expectedUpdatedAt` and return `409` with a refresh hint when stale
- LLM-facing routes: throw or catch `LLMError` and serialize via `asLLMClientError` / `jsonClientError` from `src/lib/llm/errors.ts`

**Server Actions (`"use server"` in `src/app/**/actions.ts`):**
- Return `{ error: string }` objects for expected failures instead of throwing to the client
- Catch `ZodError` and surface `error.issues[0]?.message` — e.g. `src/app/(auth)/actions.ts`
- Use `redirect()` only after successful auth paths

**Domain errors:**
- Use `LLMError` class with `LLMErrorCode`, `userMessage` (Chinese), `retryable`, and optional `action` for client UX — `src/lib/llm/errors.ts`
- Map third-party English errors to Chinese in dedicated mappers — e.g. `mapPasswordAuthErrorMessage` in `src/lib/auth/password-auth.ts`
- Validation helpers return `{ ok: false, missing: string[] }` rather than throwing — e.g. `blueprintReadyToConfirm` in `src/lib/blueprint/schema.ts`
- Batch/async helpers collect failures in arrays instead of failing the whole batch — e.g. `runBatch` in `src/app/(app)/sessions/[id]/workbench/chapter-batch.ts`

**Client hooks:**
- Swallow non-critical `localStorage` errors in `try/catch` with empty catch — e.g. `src/hooks/use-tab-state.ts`

## Logging

**Framework:** `console.error` on the server only; no structured logging SDK

**Patterns:**
- Prefix logs with bracketed subsystem tags: `[rate-limit]`, `[upload.ingest.failure]`, `[supabase-auth]`, `[storage-cleanup]` — see `src/lib/rate-limit.ts`, `src/lib/upload/actions.ts`, `src/lib/supabase/auth.ts`, `src/lib/sessions/storage-cleanup.ts`
- Never log API keys, decrypted secrets, or full user payloads
- User-facing errors belong in JSON `error` / `userMessage` fields, not stdout

## Comments

**When to Comment:**
- Module-level JSDoc for security-sensitive or non-obvious server modules — e.g. encryption contract in `src/lib/crypto.ts`
- Inline comments for test invariants (env ordering, crypto IV behavior) — e.g. `src/lib/crypto.test.ts`
- Step labels in long E2E flows only when the assertion target is non-obvious

**JSDoc/TSDoc:**
- Use block comments for exported hooks/utilities that have SSR or persistence caveats — e.g. `useTabState` in `src/hooks/use-tab-state.ts`
- Do not duplicate type information already expressed in TypeScript signatures

## Function Design

**Size:** Keep route handlers thin; push branching logic into `src/lib/` pure functions that unit tests can target

**Parameters:**
- Prefer object parameters for functions with three or more arguments or optional flags
- Zod-parse `FormData` and JSON bodies at boundaries; pass typed objects inward

**Return Values:**
- API: `NextResponse.json({ ... })` with `{ error: string }` or `{ ok: true, ... }` shapes consistent per route family
- Pure lib functions: return data or `{ ok: boolean, ... }` discriminated unions
- Async iterators/streams: return terminal state enums — e.g. `"done" | "interrupted"` from `consumeSseStream` in `src/lib/streaming/sse-client.ts`

## Module Design

**Exports:**
- Named exports only (no default exports in `src/lib/**`; Next.js pages/layouts may default-export components as required by the framework)
- Co-locate Zod schema + `z.infer` type + parse helpers in the same file when they are only used together

**Barrel Files:** Avoid except `src/lib/prompts/index.ts` for dimension registry

**React components:**
- Add `"use client"` at top of interactive components and hooks consumed by client trees
- Compose class names with `cn()` from `src/lib/utils.ts` (`clsx` + `tailwind-merge`)
- Shadcn UI primitives live in `src/components/ui/`; extend via `cva` variants — e.g. `src/components/ui/button.tsx`

**Server vs client boundary:**
- Supabase service role and decryption only in Server Actions, Route Handlers, and `src/lib/supabase/server.ts`
- Never import `src/lib/crypto.ts` from client components

**User-facing copy:**
- Product strings, validation messages, and API errors are in **Simplified Chinese** unless mapping from an upstream English provider message

**Git commits (repo policy):**
- Chinese Conventional Commits per `CONTRIBUTING.md`; run `npm run format:check`, `npm run type-check`, and `npm test` before pushing

---

*Convention analysis: 2026-05-26*
