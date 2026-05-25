# Technology Stack

**Analysis Date:** 2026-05-26

## Languages

**Primary:**
- TypeScript 5.7 (`typescript` in `package.json`) — entire application under `src/`, strict mode in `tsconfig.json` (`strict: true`, `allowJs: false`)
- TSX — React components and Next.js App Router pages in `src/app/`, `src/components/`

**Secondary:**
- SQL — Supabase Postgres schema and RLS in `supabase/migrations/*.sql`
- JavaScript (CommonJS) — GSD installer/tooling under `.claude/get-shit-done/bin/*.cjs`, `.cursor/get-shit-done/bin/*.cjs`
- Shell / PowerShell — maintenance scripts in `scripts/` (e.g. `scripts/reset-dev.ps1`)

## Runtime

**Environment:**
- Node.js 20 (CI: `.github/workflows/ci.yml` `node-version: 20`; local dev per README)
- Next.js 15 App Router server + browser bundles (`next` ^15.1.0)

**Package Manager:**
- npm (lockfile: `package-lock.json`, lockfileVersion 3)
- Lockfile: present (`package-lock.json`)

## Frameworks

**Core:**
- Next.js 15.1+ (`next`) — App Router, Route Handlers (`src/app/api/**/route.ts`), Server Actions (`"use server"` in `src/lib/upload/actions.ts`, `src/app/(auth)/actions.ts`, `src/app/(app)/settings/actions.ts`), middleware (`middleware.ts`)
- React 19 (`react`, `react-dom`) — UI in `src/components/`, pages in `src/app/`

**Testing:**
- Node.js built-in test runner (`node --test`) — colocated `src/**/*.test.ts`, invoked via `npm test` with `tsx` import hook
- Playwright 1.60 (`@playwright/test`, `playwright`) — E2E smoke in `tests/e2e/`, config `playwright.config.ts`

**Build/Dev:**
- TypeScript compiler — `npm run type-check` → `tsc --noEmit`
- ESLint 9 + `eslint-config-next` — `.eslintrc.json` extends `next/core-web-vitals`
- Prettier 3.8 + `prettier-plugin-tailwindcss` — `npm run format` / `format:check`
- Tailwind CSS 3.4 (`tailwindcss`, `tailwind.config.ts`, `postcss.config.cjs` with `autoprefixer`)
- shadcn/ui (new-york) — `components.json`, Radix primitives under `src/components/ui/`
- tsx 4.22 — test and script ESM/TS execution

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` ^2.46 + `@supabase/ssr` ^0.10 — Auth, Postgres, Storage (`src/lib/supabase/client.ts`, `server.ts`, `middleware.ts`)
- `ai` ^4.0 + `@ai-sdk/openai` ^1.0 — Vercel AI SDK; structured generation via `generateObject` / `streamObject` in `src/lib/llm/runtime.ts`
- `zod` ^3.23 — API/form validation (`src/lib/llm-config.ts`, `src/lib/types/creative-brief.ts`, route bodies)
- `zustand` ^5.0 — client state where used in components

**Infrastructure / UX:**
- `react-hook-form` + `@hookform/resolvers` — settings and forms
- `react-dropzone` — novel upload UI (`src/components/upload/`)
- `iconv-lite` — encoding detection for uploaded `.txt` novels (`src/lib/text/decode.ts`)
- `recharts` — analysis/compare charts (`src/components/charts/`, `src/components/compare/`)
- `html-to-image` — compare export PNG (`src/components/compare/ExportMenu.tsx`)
- `class-variance-authority`, `clsx`, `tailwind-merge` — styling utilities (`src/lib/utils.ts`)
- `lucide-react` — icons (shadcn config)
- `sonner` — toast notifications

**Repo tooling (not app runtime):**
- Get Shit Done (GSD) — `.claude/get-shit-done/`, `.cursor/get-shit-done/`, mirrored skills in `.cursor/skills/gsd-*/SKILL.md`

## Configuration

**Environment:**
- Documented vars (README): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY` (32-byte base64 for AES-GCM in `src/lib/crypto.ts`)
- Client reads public Supabase vars in `src/lib/supabase/client.ts`; server uses anon + service role in `src/lib/supabase/server.ts`
- `.env` may exist locally (gitignored per `.gitignore`); README describes copying to `.env.local`. Committed examples expected: `.env.example`, `.env.e2e.example` (referenced in `.gitignore` but not present in tree at analysis time)
- E2E-only (Playwright/README): `E2E_LOGIN_EMAIL`, `E2E_LOGIN_PASSWORD`, `E2E_LLM_BASE_URL`, `E2E_LLM_API_KEY`, `E2E_LLM_MODEL`, optional `E2E_BASE_URL`, `PW_HEADLESS`

**Build:**
- `next.config.ts` — `experimental.serverActions.bodySizeLimit: "60mb"`
- `tsconfig.json` — path alias `@/*` → `./src/*`
- `tailwind.config.ts`, `postcss.config.cjs`, `components.json`
- `middleware.ts` — session refresh and auth gate via `src/lib/supabase/middleware.ts`

## Platform Requirements

**Development:**
- Node.js 20+, npm
- Supabase project with migrations `supabase/migrations/0001_init.sql` through `0007_llm_runtime_governance.sql` applied manually in SQL Editor
- Supabase Auth: Email provider enabled; Confirm email disabled for password signup (README)
- Private Storage bucket `novels` (created in `0001_init.sql`)
- User BYOK LLM: any HTTPS OpenAI-compatible gateway (DeepSeek/OpenAI/custom), configured in app settings

**Production:**
- Deployment target: Vercel (README)
- Upload path: browser → Supabase Storage (`novels` bucket), then server finalize/ingest — avoids shipping full 50 MB files through Vercel Functions
- CI: GitHub Actions on `main` and PRs — lint, type-check, unit tests, production build (no Playwright in CI workflow)

---

*Stack analysis: 2026-05-26*
