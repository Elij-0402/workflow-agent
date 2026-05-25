# Testing Patterns

**Analysis Date:** 2026-05-26

## Test Framework

**Runner:**
- Node.js built-in test runner (`node:test`) executed via `tsx` for TypeScript
- Config: no `vitest.config` / `jest.config`; invocation is script-driven in `package.json`
- `tsconfig.json` excludes `**/*.test.ts` from `tsc` emit; tests still type-check when run under `tsx`

**Assertion Library:**
- `node:assert/strict` (`assert.equal`, `assert.deepEqual`, `assert.ok`, `assert.rejects`, `assert.match`)

**Run Commands:**
```bash
npm test                                              # All unit tests: src/**/*.test.ts
node --test --import tsx src/lib/crypto.test.ts     # Single file
npm run type-check                                    # App TS only (tests excluded from tsc project)
npm run test:e2e                                      # Playwright (build + start on :3001 by default)
npm run test:e2e:headed                             # Playwright with UI (PW_HEADLESS=false)
npx playwright install chromium                       # One-time browser install
```

## Test File Organization

**Location:**
- Unit tests are **co-located** next to implementation under `src/**/*.test.ts` (37 files)
- App-route-adjacent logic: `src/app/(auth)/actions.test.ts`, `src/app/(app)/sessions/[id]/workbench/chapter-batch.test.ts`
- E2E tests live in `tests/e2e/*.spec.ts` (separate from `src/`)

**Naming:**
- Unit: `{module}.test.ts` beside `{module}.ts`
- E2E: `{feature}.spec.ts` — e.g. `tests/e2e/smoke.spec.ts`, `tests/e2e/upload-branches.spec.ts`

**Structure:**
```
workflow-agent/
├── src/
│   ├── lib/
│   │   ├── crypto.ts
│   │   ├── crypto.test.ts
│   │   ├── rate-limit.ts
│   │   └── rate-limit.test.ts
│   └── app/
│       └── (auth)/
│           ├── actions.ts
│           └── actions.test.ts
└── tests/
    └── e2e/
        ├── smoke.spec.ts
        ├── upload-branches.spec.ts
        ├── fixtures/           # Committed .txt novel samples
        └── helpers/            # login, fixture resolution
```

## Test Structure

**Suite Organization:**
```typescript
import test from "node:test";
import assert from "node:assert/strict";

import { resolveUploadRoute } from "./route";

test("resolveUploadRoute routes explicit modes to the correct upload flow", () => {
  assert.deepEqual(resolveUploadRoute({ mode: "dual" }), { kind: "dual" });
});
```

**Patterns:**
- **No nested `describe` in unit tests** — flat `test("…", …)` cases per file (E2E may use `test.describe` + `beforeEach`)
- **Arrange / act / assert** inline; build fixtures as plain objects at top of file or inside the test — e.g. `src/lib/prompts/generate.test.ts`
- **Async tests** use `async` callbacks and `await assert.rejects(...)` for failure paths — e.g. `src/lib/crypto.test.ts`
- **Import order** mirrors app code: `node:test` / `node:assert/strict` first, then module under test, then `@/` types if needed
- **No global setup file** — per-file env mutation when required (see crypto tests)

## Mocking

**Framework:** None (no Jest/Vitest/Sinon); hand-rolled stubs and in-memory streams

**Patterns:**

**Environment before import (module-level singletons):**
```typescript
const TEST_KEY = Buffer.from(new Uint8Array(32).fill(7)).toString("base64");
process.env.ENCRYPTION_KEY = TEST_KEY;

import { encrypt, decrypt } from "./crypto.ts";
```
Use this when the module caches crypto keys on first use — `src/lib/crypto.test.ts`.

**Minimal Supabase query chain mock:**
```typescript
function createMockSupabase(query: { count: number | null; error: { message: string } | null }) {
  const chain = {
    eq: () => chain,
    gte: () => chain,
    then(resolve: (value: { count: number | null; error: { message: string } | null }) => void) {
      resolve({ count: query.count, error: query.error });
    },
  };
  return { from: () => ({ select: () => chain }) } as never;
}
```
See `src/lib/rate-limit.test.ts` — cast with `as never` to satisfy `assertWithinRateLimit` typing.

**ReadableStream / SSE without network:**
```typescript
const body = new ReadableStream<Uint8Array>({
  start(controller) {
    controller.enqueue(encoder.encode('event: done\ndata: {"ok":true}\n\n'));
    controller.close();
  },
});
const state = await consumeSseStream(body, () => {});
assert.equal(state, "done");
```
See `src/lib/streaming/sse-client.test.ts`.

**Timing / concurrency:** real `setTimeout` with short delays to assert caps — `src/app/(app)/sessions/[id]/workbench/chapter-batch.test.ts`

**What to Mock:**
- Supabase clients when testing pure policy functions (rate limits, guards’ pure helpers)
- Streams, clocks, and env vars for deterministic crypto/SSE/batch behavior
- Never mock Zod or your own pure string/prompt builders — use real schemas and fixtures

**What NOT to Mock:**
- Zod `parse` / `safeParse` in schema tests — e.g. `src/lib/blueprint/schema.test.ts`
- Prompt assembly functions — assert on substring content with real fixture objects — e.g. `src/lib/prompts/generate.test.ts`
- LLM SDK calls in unit tests (no unit tests hit live LLM APIs)

## Fixtures and Factories

**Test Data:**
```typescript
const analyses: GenerateAnalyses = {
  worldview: { type: "仙侠", setting: "…", /* … */ },
  characters: { characters: [{ name: "沈砚", role: "protagonist", /* … */ }], /* … */ },
  narrative: { structure: "三幕式", /* … */ },
};

const config: GenerateConfig = {
  strategy: "theme-graft",
  innovation: 8,
  viewpoint: "first-person",
  style: "modern",
  output_scope: "outline",
  extra_instructions: "…",
};
```
Inline typed objects matching `@/lib/types` — no shared factory module.

**Location:**
- Unit: constants inside each `*.test.ts`
- E2E novels: `tests/e2e/fixtures/*.txt` (committed)
- Optional large local novels: `docs/*.txt` when `E2E_USE_DOCS_FIXTURES=1` — resolved by `tests/e2e/helpers/upload-fixtures.ts`
- E2E auth/LLM: env vars documented in `.env.e2e.example` (not committed)

## Coverage

**Requirements:** None enforced; no coverage script in `package.json` or CI

**View Coverage:** Not configured (no `c8`/`nyc`/`vitest --coverage`)

## Test Types

**Unit Tests:**
- Scope: pure functions in `src/lib/**`, Zod schemas, prompt builders, diff/merge utilities, redirect sanitization, upload route resolution, batch orchestration
- ~37 files under `src/**/*.test.ts`; fast, no network, no DB
- Run in CI (`.github/workflows/ci.yml` → `npm test`)

**Integration Tests:**
- Not used as a separate layer; Supabase/LLM integration is exercised only in E2E

**E2E Tests:**
- Framework: `@playwright/test` ^1.60 (`playwright.config.ts`)
- Directory: `tests/e2e/`
- Default: Chromium, `workers: 1`, `fullyParallel: false`, 10-minute test timeout, 15-minute smoke override via `test.setTimeout`
- `webServer`: when `E2E_BASE_URL` unset, runs `npm run build && npm run start -- -p 3001` against `http://127.0.0.1:3001`
- Helpers: `tests/e2e/helpers/auth.ts` (`login`, `configureLlm`), `tests/e2e/helpers/upload-fixtures.ts`
- **Not run in CI** — only lint, type-check, unit tests, and build on push/PR
- Requires real Supabase, migrations, test account, BYOK LLM env (`E2E_*` vars per `README.md`)

## Common Patterns

**Async Testing:**
```typescript
test("decrypt rejects a tampered GCM tag", async () => {
  const ciphertext = await encrypt(plaintext);
  await assert.rejects(() => decrypt(tampered));
});
```

**Error / validation testing:**
```typescript
const result = PasswordAuthFormSchema.safeParse({ mode: "register", email: "…", password: "short" });
assert.equal(result.success, false);
if (!result.success) {
  assert.equal(result.error.issues[0]?.message, "密码至少需要 8 位");
}
```

**Discriminated union results:**
```typescript
const result = blueprintReadyToConfirm(emptyBlueprint());
assert.equal(result.ok, false);
if (!result.ok) {
  assert.ok(result.missing.includes("characters"));
}
```

**E2E selectors (accessibility-first):**
```typescript
await page.getByRole("button", { name: "登录", exact: true }).click();
await expect(page.getByRole("heading", { name: "第 2 步 · 分析两本参考小说", exact: true })).toBeVisible();
```
Prefer `getByRole` / `getByLabel` with `{ exact: true }` where the UI copy is stable — `tests/e2e/helpers/auth.ts`, `tests/e2e/smoke.spec.ts`.

**E2E API seeding:** use `page.request.post` / `patch` against app routes and Supabase admin client for deterministic blueprint state — `tests/e2e/smoke.spec.ts` (admin client via env from local `.env`; do not commit secrets).

## Adding New Tests

**New pure logic in `src/lib/foo/bar.ts`:**
- Add `src/lib/foo/bar.test.ts` beside it
- Use `node:test` + `assert/strict`; no extra dependencies
- Run `node --test --import tsx src/lib/foo/bar.test.ts` while iterating

**New API policy or Server Action helper:**
- If extractable to `src/lib/`, unit test there (preferred)
- If logic must stay in `route.ts` / `actions.ts`, either extract to `src/lib/` or add a co-located `*.test.ts` next to the route module (pattern exists in `src/app/(auth)/actions.test.ts`)

**New user-facing flow:**
- Add Playwright spec under `tests/e2e/` and reuse `tests/e2e/helpers/auth.ts`
- Add/fixture txt under `tests/e2e/fixtures/` if upload content is required
- Document new `E2E_*` env vars in `.env.e2e.example` only (never commit real credentials)

**Pre-merge checklist (from `CONTRIBUTING.md`):**
```bash
npm run format:check
npm run type-check
npm test
```

---

*Testing analysis: 2026-05-26*
