# Project Research Summary

**Project:** NovelFusion AI — v0.4 UX Foundation
**Domain:** Brownfield power-user UX upgrade on Next.js 15 + Supabase + Shadcn/Tailwind, dark-only, Linear/Vercel/Raycast aesthetic, Chinese-prose dual-book novel-variant workflow
**Researched:** 2026-05-26
**Confidence:** HIGH overall (existing stack is solid; deltas are narrow); MEDIUM on inline-edit IME handling and CJK long-text diff perf

---

## Executive Summary

v0.4 is integration-shaped, not foundation-shaped. The existing stack (Next.js 15 App Router + RSC, React 19, Supabase RLS, custom SSE in `src/lib/streaming/sse-client.ts`, Shadcn/Tailwind, dark-only token system, `ai@4` server-side `streamObject`, react-hook-form + Zod) stays untouched. The milestone delivers seven UX additions on top of it: ⌘K command palette, workbench multi-route split, URL-as-state, inline blueprint editing with debounced save, streaming dual-pane Studio, sub-paragraph CJK diff, and design-token polish. Three new dependencies cover the entire surface — `cmdk@^1.1.1` (via shadcn `Command`), `nuqs@^2.8.9` for typed URL state, and `diff@^9.0.0` for char/word-level diff — plus `react-hotkeys-hook@^4.6.2` if scoped keyboard contracts are taken seriously. No rich-text editor, no `framer-motion`, no `useChat`, no `zustand`, no virtualization library.

The biggest existing risks are (1) a silent every-keystroke PATCH bug already live in `BlueprintEditor.save()` that the inline-edit work must fix as a prerequisite; (2) the now-**1,403-line** `workbench-client.tsx` (briefed as 1,361 — debt grew by ~42 lines), which decomposes cleanly along its `FlowStep` discriminated union into 4 step routes; (3) **99 `text-[Npx]` violations across 16 files** (briefed as 63), so the design-token polish phase has ~60% more surface than originally scoped; (4) the IME composition trap for Chinese Pinyin input on inline editors, resolved below by choosing a native `<textarea>` over `contentEditable`-based rich-text libraries.

Recommended phase shape is the 6-wave dependency graph from ARCHITECTURE.md, collapsed to **5 milestone phases**: Foundation+URL-state → Workbench multi-route split → Palette+Inline-edit → Streaming dual-pane+CJK diff → Token polish + verification. Critical path is serial through the first three; streaming + diff parallelize in Phase 4.

---

## Updated Factual Baselines (Corrections to Original Brief)

These numbers MUST flow into REQUIREMENTS.md and ROADMAP.md. Planning at the briefed values will under-scope the work.

| Claim in Brief | Verified Reality | Source | Roadmap Impact |
|----------------|------------------|--------|----------------|
| `workbench-client.tsx` is 1,361 lines | **1,403 lines** | `wc -l` (PITFALLS Pitfall 4, ARCHITECTURE § Summary) | Phase 2 decomposition slightly larger; budget 4 step clients ≤ 200/320/180/200 LOC + shared shell, total ≈ 1,050 LOC vs. today's 1,403 |
| `text-[Npx]` violations: 63 in P0 alone | **99 across 16 files** | ripgrep (PITFALLS § Scope reminder) | Phase 5 token polish scope ~60% larger; sweeping codemod-style pass, not P0-only patch |
| Streaming uses `useChat` from AI SDK | **No `useChat` anywhere in src/**. Custom SSE via `src/lib/streaming/sse-client.ts::consumeSseStream`; server emits `event: partial\|done\|error` via `sseResponse()` | ARCHITECTURE § Existing System Snapshot; grep `useChat` = 0 hits | Phase 4 streaming MUST extend the existing custom SSE pattern (mirror `OutlineStreamer`). Do NOT introduce `useChat` / `@ai-sdk/react`. Override STACK.md's `useChat` recommendation |
| `zustand@5.0.2` available as global store | In `package.json` but **0 imports in src/** | ARCHITECTURE § Existing System Snapshot; grep returns 0 src hits | Do NOT introduce zustand for v0.4. Workbench state stays per-route local + URL; palette state uses React Context |

---

## Critical Conflict Resolution: Inline-Editor Library

**STACK.md said:** Custom `useInlineEdit` hook + Shadcn `Textarea`. No rich-text editor. Saves 30–120 KB.
**PITFALLS.md (Pitfall 8, Critical) said:** MUST use Tiptap because `contentEditable` IME composition for Chinese Pinyin fires `onChange` mid-composition and corrupts text.

### Resolution: Custom `useInlineEdit` hook + Shadcn `Textarea` (a native `<textarea>` element), guarded with `compositionstart` / `compositionend` events.

**Why (3 sentences):**
1. A native HTML `<textarea>` is NOT `contentEditable` — it has first-class IME composition handling built into the browser's text-input pipeline, so Pitfall 8's IME corruption applies to `contentEditable`-based editors (Tiptap, ProseMirror, Slate, Lexical) — NOT to `<textarea>`.
2. Blueprint card fields are plain-text, fixed-schema, Zod-validated (7 fields per section, no marks/lists/embeds per STACK A1) — rich-text capability would add 30–120 KB gzipped for zero functional value.
3. The residual IME risk is neutralized by (a) saving on `blur` / `Enter` / 400ms debounce, never on each `onChange`; (b) gating custom keyboard handlers with `if (e.nativeEvent.isComposing || e.keyCode === 229) return;`; (c) flushing debounced save on `compositionend`, not during composition.

**Residual risk:** If a future v0.5+ requirement adds rich formatting to blueprint fields, the textarea-based hook is inadequate and Tiptap becomes correct. Gate on REQUIREMENTS confirming v0.4 blueprint schema stays plain-text fixed-shape.

**Verification gate before Phase 3:** Confirm `src/lib/schemas/blueprint.ts` contains only string-shaped fields. If any rich content is permitted, escalate before Wave 3 plan-phase.

---

## Key Findings

### Recommended Stack

Three additions only. Everything else exists or stays out.

**Core additions (3 packages):**

- **`cmdk@^1.1.1`** (via `npx shadcn@latest add command`) — ⌘K palette primitive; install with `--legacy-peer-deps` (Shadcn-endorsed React 19 workaround).
- **`nuqs@^2.8.9`** — typed URL-as-state for non-routing params (diff tab, panel toggles); replaces 3+ ad-hoc resolvers; ships server-shared parsers.
- **`diff@^9.0.0`** + `@types/diff` — char/word-level inline diff; pair with `Intl.Segmenter("zh", { granularity: "word" })` for CJK tokenization.

**Optional 4th:**

- **`react-hotkeys-hook@^4.6.2`** — scoped keyboard shortcuts via `<HotkeysProvider>` (global / blueprint-list / palette-open); built-in `enableOnFormTags` / `enableOnContentEditable`. Strongly recommended if TS-13 j/k/d/a card-navigation is in scope.

**Patterns without dependencies:**

- Custom `useInlineEdit` hook + Shadcn `Textarea` (per conflict resolution).
- 12-line `useDebouncedCallback` hook in `src/lib/hooks/` — not `use-debounce@10`.
- CSS-only motion via existing `--duration-fast` (160ms) + `--easing-out` + `tailwindcss-animate`. NO `framer-motion`.
- Existing Shadcn `Skeleton`.
- Native `content-visibility: auto` on paragraphs for long-text diff. NO virtualization library.

**Existing stack — preserve:** `next@15`, `react@19`, `@supabase/ssr`, `ai@4` (server-side `streamObject` only), `react-hook-form` + `zod`, `sonner`, `lucide-react`, `tailwindcss-animate`, custom SSE.

**Bundle impact:** ~15–20 KB gzipped client-side. (Rejected path Tiptap + framer-motion + diff-match-patch: ~120–180 KB.)

### Expected Features

Carried verbatim from FEATURES.md.

**Table stakes (TS-01..TS-16 — non-negotiable):**

- TS-01..TS-05 ⌘K palette: open via `$mod+K`, fuzzy search, route navigation, inline shortcut hints, `?` opens keyboard help.
- TS-06 Path-segment step routing (`/workbench/{upload|analyze|blueprint|generate}`).
- TS-07..TS-09 Per-step skeleton (shape-matched), three-state pattern, active-voice empty copy.
- TS-10..TS-12 Streaming cue + stop button (full teardown) + input disable. Composite — ship together.
- TS-13 Inline-edit two-mode keyboard (list mode: j/k/d/a/digit; edit mode: Tab/Enter/Esc/printables). Hard rule: single-letter shortcuts NEVER fire when an input is focused.
- TS-14 `prefers-reduced-motion` respect.
- TS-15 Visible focus ring on every interactive element.
- TS-16 `nuqs` for ephemeral URL state.

**Differentiators (P1):**

- DF-03 Semantic creative-brief controls (sensory_density / prose_register / pacing / pov + character-name toggles). THE most-expensive, most-valuable v0.4 differentiator. Replace ONE freeform panel (style first); not all four.
- DF-04 Streaming dual-pane (left: blueprint summary + source; right: live output + cost meter + stop). Auto-scroll-lock-on-user-scroll.
- DF-09 Per-step empty states with exact next action.

**Differentiators (P2, defer to v0.4.x):** DF-01 context-aware palette items, DF-05 paragraph-anchored diff annotations, DF-06 compare-target toggle, DF-07 number-key reorder, DF-08 live cost meter.

**Anti-features (DO NOT BUILD):**

- AF-01 Wizard form values in URL.
- AF-02 Raw temperature / top-p sliders by default.
- AF-03/AF-05 Real-time collab / live cursor.
- AF-04 Raycast extension API.
- AF-06 Generic mega-search bar alongside ⌘K.
- AF-07 Inline AI-suggested edits inside blueprint cards.
- AF-08 Drag-to-resize panes.
- AF-09 Sentence/character-level diff for whole 3-10k char Chinese chapters.
- AF-10 Step transition animations beyond 150–200ms fade.

### Architecture Approach

System stays exactly as it is. v0.4 attaches eight integration decisions at specific files (per ARCHITECTURE.md Decisions 1–8):

1. **⌘K palette mounts in `(app)/layout.tsx`** (NOT root) — auth gate already there; recent-sessions fetched server-side once via RLS.
2. **Workbench multi-route split** — `/sessions/[id]/workbench/{upload,analyze,blueprint,generate}/page.tsx` (RSC) + shared `layout.tsx` for stepper. Each step gets its own slice loader, own `loading.tsx`, server-side `redirect()` gating.
3. **URL-as-state via nuqs** — `NuqsAdapter` in `(app)/layout.tsx`; parsers in `src/lib/url-state/`; replaces VariantComparison's `wb-diff-tab` localStorage and ad-hoc resolvers.
4. **Per-card local draft + 400ms debounced commit + blur/Enter flush + 409 ConflictGate** — fixes existing every-keystroke save bug. `useBlueprintSave` is sole network owner.
5. **Streaming dual-pane = two independent state owners** (left: static RSC props; right: SSE via `consumeSseStream`). NO merged state machine. NO `useChat`. Extends existing `OutlineStreamer` pattern.
6. **Long-text CJK diff = pre-compute LCS server-side + render with `<p>` + CSS `content-visibility: auto`**. Use `Intl.Segmenter("zh")` for tokenization. NO virtualization.
7. **Component decomposition seam: by `FlowStep`**. 4 step clients ≤ 200/320/180/200 LOC; shared shell in `components/workbench/shared/`; custom hooks in `src/lib/hooks/`.
8. **Loading.tsx for route-level + `<Suspense>` only inside deliberately streamed sub-trees** (recent-sessions, OutlinePane).

### Critical Pitfalls (Top 8)

1. **[Phase 3, Critical] CJK IME composition swallows input** — Use `<textarea>` (per conflict resolution); gate handlers with `isComposing || keyCode === 229`; debounce save after `compositionend`.
2. **[Phase 4, Critical] CJK diff catastrophic-slow on 10k+ chars** — `Intl.Segmenter("zh", { granularity: "word" })` BEFORE `diffWords`; server pre-compute; `content-visibility: auto`; Web Worker if >50ms; dark-mode-safe `bg-emerald-900/40 text-emerald-200` (verify WCAG AA).
3. **[Phase 2, Critical] Workbench split silently regresses confirm-gate / generate-block UAT** — Extract `useBlueprintGate()` + `useGenerateBlock()` BEFORE splitting routes (two PRs). Run 11/11 UAT after each route extraction. Smoke selectors from `CTA_COPY` SSOT.
4. **[Phase 2+3+4, Critical] Playwright selector drift during refactor** — All strings via `CTA_COPY` SSOT; new `STEP_HEADINGS` SSOT for headings; tests import same SSOT. Run `npm run test:e2e` at end of EACH phase.
5. **[Phase 1+3, Critical] ⌘K palette focus trap leaks** — Use shadcn `<CommandDialog>` (cmdk + Radix Dialog), not bare `<Command>`. Mount ONCE at `(app)/layout.tsx`.
6. **[Phase 3, High] Every-keystroke PATCH leak during inline-edit refactor** — `useBlueprintSave` is sole network owner; debounce wraps outermost API call. Unit test: type 10 chars → assert 1 PATCH.
7. **[Phase 2, High] nuqs default `shallow: true` won't refresh RSC** — explicit `withOptions({ shallow: false, history: 'push' })` where server work is needed; `withDefault` on both server + client.
8. **[Cross-phase, High] Bundle regression** — Baseline `@next/bundle-analyzer` at Phase 1; fail any phase that grows workbench chunk > 50 KB gzip; `next/dynamic` heavy deps.

Additional High items (not in top 8 but on roadmap radar): Pitfall 6 URL collision + back-button (Phase 2), 7 hydration mismatch (Phase 2+5), 9 draft loss on navigation (Phase 3), 10 optimistic-update race (Phase 3), 11 streaming layout thrash (Phase 4), 15 Tailwind purge dynamic classes (Phase 5), 16 dark-mode WCAG contrast (Phase 5), 17 single-book removal orphan data (Phase 2).

---

## Architecture Build Order (6 Waves → 5 Phases)

| Wave | Phase | Rationale |
|------|-------|-----------|
| Wave 0 (Foundation: install deps, NuqsAdapter, types extract, debounce hook) | Phase 1 | Foundation must land first |
| Wave 1 (URL state utilities + nuqs migration + transitional step parser) | Phase 1 | Coupled to Wave 0 |
| Wave 2 (Workbench multi-route split + slice loaders + 4 step clients + delete monolith) | Phase 2 | Biggest refactor; own phase |
| Wave 3 (Inline-edit overhaul: debounced save + per-card draft + conflict gate + card shortcuts) | Phase 3 | Depends on Wave 2; pairs with palette |
| Wave 4 (⌘K palette: registry, provider, dialog, recent sessions, route-aware filtering) | Phase 3 | Pairs with Wave 3; needs Wave 2 routes |
| Wave 5 (Streaming dual-pane: SSE route, panel component) | Phase 4 | Depends on Wave 2; independent of Wave 6 |
| Wave 6 (Long-text diff: `diffAlignedParagraphs`, `diffTokensWithinParagraph`, prose tab, `content-visibility`) | Phase 4 | Depends on Wave 1; parallel with Wave 5 |
| — | Phase 5 | Token polish: 99 `text-[Npx]` → semantic tokens; WCAG verification; motion baseline; bundle compare; UAT re-run; e2e; production smoke |

### Suggested 5-Phase Structure

**Phase 1 — IA + URL-state Foundation.** Wave 0 + Wave 1 + sidebar ⌘K affordance (palette ships in Phase 3). Delivers: `nuqs` adapter, command primitive installed, debounce hook, types extract, palette button visible. Avoids pitfalls 7 + partial 1/5.

**Phase 2 — Workbench Multi-Route Split.** Wave 2 only. Pre-step: extract `useBlueprintGate` + `useGenerateBlock` as no-route-change PR. Delivers: 4 step routes + 4 loading.tsx + slice loaders + shared shell + monolith deleted. Avoids pitfalls 4, 5, 6, 17, 19.

**Phase 3 — ⌘K Palette + Inline Blueprint Editor.** Wave 3 + Wave 4. Delivers: palette dialog (nav + actions + recent + route-aware + IME guards); inline editor (textarea-based, debounced, ConflictGate, two-mode keyboard, j/k/d/a). Avoids pitfalls 1, 2, 3, 8, 9, 10.

**Phase 4 — Studio Streaming Dual-Pane + CJK Diff.** Wave 5 + Wave 6 in parallel. Delivers: `/api/generate-v2/stream`, dual-pane streaming panel (extends `OutlineStreamer`, NOT `useChat`), abort + cost-meter UX, sub-paragraph CJK diff with `Intl.Segmenter` + `content-visibility` + prose tab. Avoids pitfalls 11, 12, 13.

**Phase 5 — Token Polish + Verification.** 99 `text-[Npx]` → semantic tokens via lookup-map pattern; WCAG AA verified via axe-core; `prefers-reduced-motion` honored; 150ms motion baseline on state changes only; bundle analyzer compare; UAT 11/11 re-run; e2e green; production build smoke. Avoids pitfalls 14, 15, 16, 18, 20.

### Phase Ordering Rationale

- Critical path Wave 0 → Wave 1 → Wave 2 → Wave 3 is strictly serial.
- Refactor before features: Phase 2's monolith split is riskiest; doing it before user-facing work means smaller-surface PRs when smoke selectors stabilize.
- Palette + inline-edit paired: both need IME-composition awareness, both ship keyboard-first power-user feel.
- Streaming + diff paired: both pre-compute server-side, render client-side, independent of palette.
- Token polish last: touching 99 violations conflicts with concurrent feature work; saving for Phase 5 = single clean sweep + verification.

### Research Flags

Phases likely needing `/gsd-plan-phase --research-phase`:

- **Phase 3** — Inline-edit two-mode keyboard is subtle (IME + scoped + autosize + 409 UX); palette has many integration points.
- **Phase 4** — CJK diff perf + `Intl.Segmenter` browser support + AbortController propagation through custom SSE.

Phases with standard patterns (skip research-phase):

- **Phase 1** — `nuqs` + shadcn install + types extract are mechanical.
- **Phase 2** — Multi-route split is textbook; ARCHITECTURE.md already maps file-by-file.
- **Phase 5** — Token codemod + axe-core + bundle analyzer are tooling-driven.

---

## Phase-to-Research-Finding Map

| Phase | STACK.md | FEATURES.md | ARCHITECTURE.md | PITFALLS.md |
|-------|---------|------------|-----------------|------------|
| **Phase 1: IA + URL-state foundation** | § Core Additions 1+2 (cmdk, nuqs); Installation block; Existing Token Map | TS-01..TS-05, TS-16, TS-15; Library Decisions verified | Decision 3 (nuqs); Wave 0+1; Existing System Snapshot (no useChat, zustand unused); Pitfall 3 (shallow), Pitfall 7 (parseAsStringLiteral default) | Pitfalls 1, 2, 3, 7 |
| **Phase 2: Workbench split** | Existing Token/Pattern Map; Re-use don't re-add | TS-06, TS-07..TS-09; Dependencies graph | Decision 2 (multi-route, full line-range map); Decision 7 (decomposition seam); Decision 8 (loading.tsx vs Suspense); Component Inventory; Wave 2 plan | Pitfalls 4, 5, 6, 7, 17, 19 |
| **Phase 3: Palette + Inline editor** | § Library Choices 1 (cmdk + CommandDialog); § Library Choices 2 (useInlineEdit pattern); § Library Choices 3 (react-hotkeys-hook scopes) | TS-01..TS-05, TS-13; DF-01 (P2), DF-07 (P2); per-feature Implementation Notes | Decision 1 (palette in (app)/layout); Decision 4 (per-card draft + debounce + 409); Wave 3+4; Pitfall 1 (every-keystroke save); Pitfall 5 (provider misplacement) | Pitfalls 1, 2, 3, **8 (IME — conflict resolution)**, 9, 10 |
| **Phase 4: Streaming + Diff** | § Library Choices 4 (jsdiff); § Library Choices 7 (stay on ai@4 + custom SSE — use consumeSseStream NOT useChat); existing variant-diff.ts | DF-04, TS-10..TS-12, DF-08 (P2), DF-05/06 (P2); AF-09 | Decision 5 (two independent owners, NOT useChat); Decision 6 (content-visibility + Intl.Segmenter); Wave 5+6; Pitfall 4 (SSE abort cleanup); Open Q2 (shared runGeneration) | Pitfalls 11, 12, **13 (CJK diff perf)** |
| **Phase 5: Polish + verify** | § Existing Token/Pattern Map; What NOT to Use | TS-07..TS-09 consistency; TS-14, TS-15; DF-09 | Decision 8 skeleton consistency | Pitfalls 14, **15 (Tailwind purge)**, **16 (WCAG contrast)**, 17 (single-book verify), **18 (bundle)**, 19 (selector drift smoke), 20 (motion baseline); "Looks Done But Isn't" checklist |

---

## Watch Out For (Top 8, with Phase Assignment)

1. **Phase 3, Critical:** CJK IME composition → `<textarea>` + isComposing guards + debounce-after-compositionend.
2. **Phase 4, Critical:** CJK diff perf cliff → `Intl.Segmenter` + server pre-compute + `content-visibility: auto`.
3. **Phase 2, Critical:** Confirm-gate regression → extract hooks first, two PRs, 11/11 UAT after each route.
4. **Phase 2+3+4, Critical:** Selector drift → `CTA_COPY` + new `STEP_HEADINGS` SSOT; e2e end of each phase.
5. **Phase 1+3, Critical:** Palette focus trap → `<CommandDialog>` not bare `<Command>`; mount in `(app)/layout` only.
6. **Phase 3, High:** Every-keystroke PATCH leak → `useBlueprintSave` sole owner; unit test 10 chars → 1 PATCH.
7. **Phase 2, High:** nuqs `shallow: true` default doesn't refresh RSC → explicit `withOptions({ shallow: false })`; `withDefault` both sides.
8. **Cross-phase, High:** Bundle regression → baseline analyzer Phase 1; fail any phase growing chunk > 50 KB gzip; `next/dynamic` heavy deps.

---

## Open Questions for `/gsd-discuss-phase`

Consolidated across all 4 research files. Each blocks specific phases.

1. **[Blocks Phase 3]** Is the blueprint Zod schema confirmed plain-text + fixed-shape across all 7 fields? If any rich content allowed, inline-editor conflict reopens toward Tiptap. *(STACK A1; conflict-resolution residual risk)*
2. **[Blocks Phase 4]** Does existing `/api/generate-v2` factor cleanly into `runGeneration(blueprintId, config, emit?)` so JSON + SSE share one core, or does duplication ship to v0.5? *(ARCHITECTURE Open Q2)*
3. **[Blocks Phase 3]** Does `/api/blueprint` PATCH return current `updated_at` in 409 body? If not, ConflictGate needs extra GET round-trip. *(ARCHITECTURE Decision 4 + Pitfall 2 race window)*
4. **[Blocks Phase 1+3 scope]** What's the v0.4 launch policy on palette action items vs nav-only? Lock the 4–6 actions in REQUIREMENTS to bound Phase 3. *(FEATURES Open Q1)*
5. **[Blocks Phase 3 scope]** Which freeform creative-brief panel migrates first to DF-03 semantic controls in v0.4 (style recommended), and which defer to v0.4.x? *(FEATURES Open Q2; STACK A1 corollary)*
6. **[Blocks Phase 2]** How many sessions have `mode='single'` in production DB? If <50, drop cold with 301 redirect. If thousands, soft migration prompt or distinct removal phase. *(PITFALLS 17 + Assumption A6)*
7. **[Blocks Phase 4]** Does owner UAT (QLT-02) require DF-05 paragraph-anchored diff annotations for v0.4 launch? Currently P2; if P1, Phase 4 scope grows ~30%. *(FEATURES MVP + Open Q4)*
8. **[Blocks Phase 5]** Is `next-themes` actively serving any hidden light-mode path, or fully dark-only post-v0.3? If dark-only, remove in Phase 5 to eliminate Pitfall 7 hydration risk + bundle bloat. *(PITFALLS 7; ARCHITECTURE dark-only token system)*

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All 4 picks verified via `npm view` 2026-05-26; Shadcn React 19 workaround officially documented |
| Features | HIGH | TS/DF/AF categorization sourced from Linear, Vercel, Raycast, Notion, Airtable, Sudowrite, Smashing Mag, Supabase Design System; MEDIUM only on Chinese-prose diff visualization |
| Architecture | HIGH | Every claim grounded in a file path read end-to-end; line ranges mapped; data flow traces to existing patterns |
| Pitfalls | HIGH | Framework traps + known-debt verified via `wc`, ripgrep, file read; MEDIUM on CJK-diff perf + IME (training-derived, not benchmarked on this codebase's content) |

**Overall confidence:** HIGH. Biggest unknowns are the 8 open questions, all answerable with a 15-minute REQUIREMENTS lock pass.

### Gaps to Address

- **Blueprint Zod schema verification** — spot-check before Phase 3 plan.
- **`/api/blueprint` 409 response shape** — verify it returns current `updated_at`.
- **`Intl.Segmenter` browser/runtime support on deploy target** — verify Browserslist before committing Phase 4. Fallback: paragraph-level only.
- **Real DB count of `mode='single'` sessions** — gates Phase 2 scope.
- **Bundle analyzer baseline** — capture during Phase 1 plan-phase output.

---

## Sources

### Primary (HIGH confidence)
- `.planning/research/STACK.md`, `FEATURES.md`, `ARCHITECTURE.md`, `PITFALLS.md`
- Repo evidence: `package.json`, `src/lib/streaming/sse-client.ts`, `src/lib/llm/dispatch.ts`, `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx` (1,403 lines via `wc -l`), `src/components/workbench/blueprint-editor.tsx`, `src/lib/ui/cta-copy.ts`, `tests/e2e/smoke.spec.ts`, `src/lib/theme-tokens.ts`, `tailwind.config.ts`, `src/app/globals.css`
- `npm view` 2026-05-26: cmdk@1.1.1, nuqs@2.8.9, react-hotkeys-hook@4.6.2, diff@9.0.0
- ripgrep: `text-[Npx]` = 99 in 16 files; `useChat` = 0 hits; `zustand` = 0 imports

### Secondary (MEDIUM confidence)
- Shadcn docs (ui.shadcn.com/docs/react-19, /components/command), nuqs.dev, motion.dev bundle math
- MDN Intl.Segmenter, CompositionEvent, KeyboardEvent.isComposing, content-visibility
- Vercel Geist Command Menu, Linear shortcuts, Raycast Action Panel, Notion + Airtable two-mode keyboard
- Sudowrite Tone Shift + Creativity Slider, Smashing Magazine 2026 streaming UI patterns

### Tertiary (background)
- v0.3 retrospective (.planning/milestones/v0.3-phases/05-saas/05-RESEARCH.md, UAT, VERIFICATION)
- ShadcnStudio ⌘K guide, LogRocket nuqs guide, Cursor IDE forum bug reports

---
*Research completed: 2026-05-26*
*Ready for roadmap: yes*
