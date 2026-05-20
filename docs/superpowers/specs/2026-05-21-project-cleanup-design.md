# Project Cleanup — Design

**Date:** 2026-05-21
**Scope:** File / repo hygiene only; no production code changes.

## Goal

Restore a clean repo working state after V0.2 ship so iteration can resume without confusion. Concretely:

1. Root directory legible at a glance.
2. No multi-MB test fixtures tracked in git.
3. Single source of truth for AI-assistant instructions (CLAUDE.md), with AGENTS.md kept only as a pointer for Codex.
4. README reflects V0.2 reality (dual-book blueprint workbench, migration 0004, etc).
5. Last commit message is descriptive.

## Out of scope (YAGNI)

- No `git filter-repo` / history rewrite. The 26 MB of tracked novels stay in old commits — accepted cost vs. force-push risk.
- No changes under `src/`. Dead-code review is a separate task.
- No edits to `supabase/migrations/`, `tests/`, `playwright.config.ts`, build config.
- No directory restructure of `src/` / `supabase/` / `tests/`.
- No new architectural docs (CLAUDE.md already serves that role).

## Inventory and disposition

| Path | State | Action |
|---|---|---|
| `docs/1508.txt` (8 MB) | tracked | `git rm --cached`, physically move to `samples/` |
| `docs/《斗破苍穹》小说全集txt版.txt` (18 MB) | tracked | same |
| `samples/` | new | created; gitignored except `samples/README.md` |
| `scripts/spike-chunking/runs/smoke-test-novel.txt` | tracked, 1.4 KB | `git mv` to `tests/e2e/fixtures/smoke-test-novel.txt` |
| `tests/e2e/smoke.spec.ts:7` | references spike path | one-line edit to new fixture path |
| `scripts/spike-chunking/` | tracked, ~50 KB | `git rm -r`; remove empty `scripts/` parent |
| `AGENTS.md` (V0.1, 9 KB) | tracked | rewrite as short pointer at CLAUDE.md |
| `README.md` (V0.1, 3.9 KB) | tracked | rewrite to V0.2 reality |
| `CLAUDE.md` (V0.2, 11.5 KB) | tracked | small fix: "ESLint flat config" → legacy `.eslintrc.json` |
| `.eslintrc.json` (42 B) | tracked, **active** | leave as is (used by `next lint`) |
| `tsconfig.tsbuildinfo`, `.next/`, `test-results/`, `next-env.d.ts` | local-only, already in `.gitignore` | leave |

## Execution sequence (5 commits + 1 amend)

```
Step 1 — amend HEAD commit message (no file changes)
  6966dd9 "1"  →  "chore: prune obsolete v0.2 design docs and e2e artifacts"

Step 2 — untrack test novels (commit)
  - mkdir samples + samples/README.md
  - .gitignore: append samples/ and !samples/README.md
  - git rm --cached docs/<two novel files>
  - mv docs/<two novel files> samples/
  "chore: untrack test novels and isolate in samples/ (gitignored)"

Step 3 — remove spike-chunking, preserve smoke fixture (commit)
  - mkdir tests/e2e/fixtures
  - git mv scripts/spike-chunking/runs/smoke-test-novel.txt tests/e2e/fixtures/
  - edit tests/e2e/smoke.spec.ts: path string → fixtures/
  - git rm -r scripts/spike-chunking
  - rmdir scripts (empty)
  "chore: remove spike-chunking prototype; preserve e2e smoke fixture"

Step 4 — collapse AGENTS.md (commit)
  - rewrite AGENTS.md to short pointer block
  "docs: collapse AGENTS.md to pointer at CLAUDE.md"

Step 5 — refresh README + CLAUDE.md eslint note (commit)
  - rewrite README.md to V0.2 (dual-book workbench, migration 0004, samples/ convention)
  - one-line fix in CLAUDE.md
  "docs: update README to V0.2 and fix CLAUDE.md eslint note"
```

## Verification

- `git log --oneline -7` shows the amend + 4 new commits in order.
- `git status` clean.
- `npm run lint` and `npm run type-check` pass.
- `tests/e2e/fixtures/smoke-test-novel.txt` exists and matches the prior file.
- `docs/` contains no `.txt` test fixtures.
- `scripts/` does not exist.
- No push performed.

## Discoveries outside this scope (called out, not fixed)

- `package.json` `"test"` script hardcodes a file list; the 7 V0.2 test files (chapter-batch, blueprint schema/merge, variant-diff, three V0.2 prompt tests) are silently excluded. Worth a separate one-line glob fix.
- `@playwright/test` is listed twice in `devDependencies` (lines 48 and 52). Lint-level issue.

Both items defer to a follow-up cleanup ticket so this PR stays scope-pure.
