# Phase 5 — Manual E2E Smoke (D-03)

**Purpose:** Record how to run the dual-book confirm → generate-v2 path outside CI. Playwright is **not** a blocking PR job when `.env` / LLM keys are absent.

## Commands

```bash
npm run test:e2e
# or focused:
npx playwright test tests/e2e/smoke.spec.ts
```

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| Root `.env` | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (see `tests/e2e/helpers/auth.ts`) |
| LLM / BYOK | Run `configureLlm` in the smoke flow (login helper) |
| Chromium | `npx playwright install chromium` (one-time) |
| Dev server | `test:e2e` builds and starts the app (default port 3001) |

**Security:** Never commit `.env` or paste service-role keys into CI logs.

## Timeout

- Recommend **15 minutes** for full `smoke.spec.ts` (LLM + chapter analysis).
- Failures due to LLM rate limits or network → classify as **environment** (D-04), not product regression.
- Selector / heading mismatches → **product** (fix `smoke.spec.ts` or UI).

## Tier A visual grep (optional)

```powershell
.\scripts\tier-a-grep.ps1
```

Exit 0 when only `sessions/[id]/page.tsx` retains legacy `text-[Npx]` (overview baseline debt). Exit 1 if workbench, sessions list, or upload gain new arbitrary px classes.

## Last successful run

| Last successful run | date | operator | notes |
|---------------------|------|----------|-------|
| pending | — | — | Run after 05-01 selector alignment; record pass/fail-env here |
