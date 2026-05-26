# Requirements: NovelFusion AI — v0.4 UX Foundation

**Defined:** 2026-05-26
**Core Value:** 双书蓝图主路径顺畅且令人愿意每天用（in Linear/Vercel-grade premium UX）

## v1 Requirements

Requirements for v0.4 milestone. Each maps to one roadmap phase.

### Foundation (FND) — Phase 1: IA + URL-state foundation

- [ ] **FND-01**: User can see a "⌘K" affordance in (app) sidebar (button stub; full palette ships in Phase 3)
- [ ] **FND-02**: `nuqs` URL-state adapter mounted in (app) layout; typed parsers replace the 3+ ad-hoc localStorage/searchParam resolvers (e.g., `wb-diff-tab`)
- [ ] **FND-03**: `useDebouncedCallback` hook available in `src/lib/hooks/` for Phase 3 reuse; bundle-size baseline captured via `@next/bundle-analyzer` for regression gating

### Workbench Split (WBS) — Phase 2: Multi-route refactor

- [ ] **WBS-01**: User can navigate `/sessions/[id]/workbench/{upload,analyze,blueprint,generate}` as 4 independent routes; URL is bookmarkable; deep-link restores correct step
- [ ] **WBS-02**: Each step has its own `loading.tsx` skeleton matching the final layout shape (no spinners, no layout shift on hydrate)
- [ ] **WBS-03**: `useBlueprintGate()` and `useGenerateBlock()` hooks extracted as a no-route-change PR before route split; 11/11 v0.3 owner UAT scenarios pass after extraction
- [ ] **WBS-04**: Monolithic `workbench-client.tsx` (1,403 lines) deleted; each step client ≤ 320 LOC; shared shell lives in `components/workbench/shared/`
- [ ] **WBS-05**: Single-mode sessions hard-removed: `/upload?mode=single` returns 301 → `/upload?mode=dual`; existing `sessions.mode='single'` rows kept as read-only legacy (no upgrade prompt, <50 rows)
- [ ] **WBS-06**: `STEP_HEADINGS` SSOT added to `src/lib/ui/`; Playwright smoke selectors import the SSOT so refactor doesn't drift the contract

### Command Palette (PAL) — Phase 3a: ⌘K nav-only

- [ ] **PAL-01**: User can press `⌘K` (mac) / `Ctrl+K` (win/linux) anywhere in (app) routes to open shadcn `<CommandDialog>` with fuzzy search
- [ ] **PAL-02**: Palette lists all (app) routes + last 5 recent sessions for one-keystroke navigation
- [ ] **PAL-03**: Palette respects IME composition — keyboard shortcut listeners gate on `event.nativeEvent.isComposing` so Pinyin input never triggers actions
- [ ] **PAL-04**: Palette is keyboard-accessible (arrows, Enter, Esc); visible focus ring (WCAG 2.4.7); `?` key opens a keyboard-shortcut help dialog

### Inline Blueprint Editor (IBE) — Phase 3b

- [ ] **IBE-01**: User can click any blueprint card field to edit inline using a Shadcn `<Textarea>` (no modal, no rich-text editor)
- [ ] **IBE-02**: Save is debounced 400ms with explicit flush on `blur`, `Enter`, and `compositionend`; typing 10 chars triggers exactly 1 PATCH (unit-tested)
- [ ] **IBE-03**: Editing during IME composition (Chinese Pinyin / Bopomofo) doesn't corrupt or truncate input; tested with `compositionstart`/`compositionend` events
- [ ] **IBE-04**: List-mode keyboard: `j`/`k` navigate cards, `d` deletes, `a` adds; edit-mode keyboard: `Tab`/`Enter`/`Esc`; single-letter shortcuts disabled while a field has focus
- [ ] **IBE-05**: `/api/blueprint` PATCH returns current `updated_at` in 409 conflict body; ConflictGate UI shows "已在其他窗口编辑" with single-click refresh, no extra GET round-trip

### Streaming Dual-Pane (STR) — Phase 4a

- [ ] **STR-01**: Generate page renders a two-pane layout — left: blueprint summary + source chapter; right: live SSE output with cost-tag and "stop" button
- [ ] **STR-02**: Stop button cancels SSE and tears down all listeners (AbortController); input controls (brief, generate) disable while streaming
- [ ] **STR-03**: Output pane auto-scrolls to tail unless user scrolls up; user-scroll intent persists until they hit "follow latest"
- [ ] **STR-04**: `/api/generate-v2` refactored to expose a shared `runGeneration(blueprintId, config, emit?)` core; JSON and SSE routes both consume it; no duplicated branch logic
- [ ] **STR-05**: Existing custom SSE pattern (`consumeSseStream` + `sseResponse()`) is the only streaming primitive used; no `useChat` / `@ai-sdk/react` introduced

### CJK Inline Diff (DIF) — Phase 4b

- [ ] **DIF-01**: User can toggle char/word-level inline diff vs the original chapter, in addition to existing three-layer paragraph LCS
- [ ] **DIF-02**: Chinese tokenization uses `Intl.Segmenter("zh", { granularity: "word" })` before passing to `diffWords`; never `\s+` split
- [ ] **DIF-03**: 10k-character chapter diff renders ≤ 200ms p95 (verified via Playwright timing); long-text paragraphs use CSS `content-visibility: auto`
- [ ] **DIF-04**: Diff highlight colors (insert / delete / equal) meet WCAG AA contrast in dark mode (verified by `axe-core` in Phase 5)

### Semantic Creative Brief (CRB) — Phase 4c, DF-03 first migration

- [ ] **CRB-01**: User can configure the 文风 (style) panel via semantic controls: `tone` (dropdown of 6–8 curated values), `pacing` (3-tier slider), `sensory_density` (3-tier slider), `prose_register` (dropdown of 4–5 curated values)
- [ ] **CRB-02**: Each semantic value maps to a deterministic prompt fragment in `src/lib/prompts/`; no raw temperature / top-p exposed to user
- [ ] **CRB-03**: Persona / Plot / Constraints panels remain freeform textarea-based for v0.4 (semantic migration scope limited to style)

### Token Polish + Verification (POL) — Phase 5

- [ ] **POL-01**: All 99 `text-[Npx]` violations across 16 files replaced with `.type-*` semantic utility classes; `grep -rn 'text-\[' src/` returns 0
- [ ] **POL-02**: Decorative `text-primary` usages removed (limit to actionable CTAs only); hardcoded amber/sky/emerald replaced with `--info`/`--warning`/`--flash`/`--destructive` tokens
- [ ] **POL-03**: 150ms `ease-out` baseline applied to hover/focus/state-change transitions via existing `--duration-fast` + `--easing-out` tokens; `prefers-reduced-motion` honored (transitions disabled, alternative state cues)
- [ ] **POL-04**: `next-themes` dependency removed from `package.json` (zero src/ imports verified)
- [ ] **POL-05**: 11/11 owner UAT scenarios pass on v0.4 build; Playwright smoke tests green; production build smoke (`npm run build && npm run start`) launches without error
- [ ] **POL-06**: UI Review (6-pillar audit by `gsd-ui-auditor`) scores ≥ 21/24 (vs v0.3 baseline 14/24) with no pillar below 3/4

## v2 Requirements

Deferred to v0.4.x or v0.5. Tracked but not in current roadmap.

### Palette Extensions (PAL-X)
- **PAL-X-01**: 4–6 high-frequency actions in palette (New dual-book / Confirm blueprint / Generate / Settings / Sign-out / Toggle theme)
- **PAL-X-02**: Context-aware palette items (per current route)

### Diff Annotations (DIF-X)
- **DIF-X-01**: Paragraph-anchored diff annotations (notes per diff hunk, persist across regens)
- **DIF-X-02**: Compare-target toggle (vs prior variant vs original)

### Creative Brief Extensions (CRB-X)
- **CRB-X-01**: Persona panel semantic controls (replace/modify/add/remove with dropdowns)
- **CRB-X-02**: Plot panel semantic controls (keep/replace/delete/insert/reorder visual flow)
- **CRB-X-03**: Constraints panel semantic controls (node-level severity dial)
- **CRB-X-04**: Live cost meter in dual-pane (DF-08 P2)

### Workbench Extensions
- **WBS-X-01**: Number-key reorder for blueprint cards (DF-07 P2)
- **WBS-X-02**: Compare / Library UX overhaul (deferred from v0.4 scope decision)

### Streaming Extensions
- **STR-X-01**: Migrate from `ai@4` server `streamObject` + custom SSE to `ai@5+` `@ai-sdk/react` `DefaultChatTransport` (breaking; own milestone)

## Out of Scope

Explicitly excluded in v0.4. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Tiptap / Lexical / ProseMirror / Slate rich-text editor | Blueprint Zod schema is verified plain-text fixed-shape (FND verification of Q1); native `<textarea>` IME handling is sufficient |
| `framer-motion` | Tailwind utilities + `tailwindcss-animate` + existing `--duration-fast` / `--easing-out` tokens cover all v0.4 motion needs |
| `zustand` | Already in `package.json` but unused (0 src/ imports); per-route local + URL state + React Context suffices |
| `useChat` / `@ai-sdk/react` migration | Existing custom SSE via `consumeSseStream` is the established pattern; migration deferred to dedicated milestone |
| `react-window` / virtualization libraries | Native `content-visibility: auto` solves long-text diff perf without library; <200 paragraphs per chapter is below virtualization threshold |
| Compare / Library UX overhaul | Twin scope decision: v0.4 focuses on dual-book main path; Compare/Library are secondary features deferred to v0.5+ |
| Single-book mode | Hard-removed (Q6: <50 rows); legacy reads kept; no upgrade prompt |
| All blueprint draft state in URL (AF-01) | Per FEATURES anti-pattern; URL holds step + ephemeral toggles only |
| Raw temperature / top-p sliders (AF-02) | Per FEATURES anti-pattern; mutually exclusive with DF-03 curated controls |
| Real-time collaboration / live cursors (AF-03/AF-05) | 10× scope; not on v0.4 roadmap |
| Raycast-style extension API (AF-04) | Not aligned with creative-writing core; vanity scope |
| Generic header mega-search bar (AF-06) | Dilutes ⌘K palette contract; Linear/Vercel deliberately don't ship this |
| Sentence/char-level diff across full 10k-char chapter without segmentation (AF-09) | Performance cliff; word-level via `Intl.Segmenter` is the bound |
| Step transition animations >200ms (AF-10) | Slow motion = perceived slow (NN/g 2025); kept under 200ms |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Phase Slug | Status |
|-------------|-------|------------|--------|
| FND-01 | Phase 1 | 01-foundation-url-state | Pending |
| FND-02 | Phase 1 | 01-foundation-url-state | Pending |
| FND-03 | Phase 1 | 01-foundation-url-state | Pending |
| WBS-01 | Phase 2 | 02-workbench-multi-route | Pending |
| WBS-02 | Phase 2 | 02-workbench-multi-route | Pending |
| WBS-03 | Phase 2 | 02-workbench-multi-route | Pending |
| WBS-04 | Phase 2 | 02-workbench-multi-route | Pending |
| WBS-05 | Phase 2 | 02-workbench-multi-route | Pending |
| WBS-06 | Phase 2 | 02-workbench-multi-route | Pending |
| PAL-01 | Phase 3 | 03-palette-and-inline-editor | Pending |
| PAL-02 | Phase 3 | 03-palette-and-inline-editor | Pending |
| PAL-03 | Phase 3 | 03-palette-and-inline-editor | Pending |
| PAL-04 | Phase 3 | 03-palette-and-inline-editor | Pending |
| IBE-01 | Phase 3 | 03-palette-and-inline-editor | Pending |
| IBE-02 | Phase 3 | 03-palette-and-inline-editor | Pending |
| IBE-03 | Phase 3 | 03-palette-and-inline-editor | Pending |
| IBE-04 | Phase 3 | 03-palette-and-inline-editor | Pending |
| IBE-05 | Phase 3 | 03-palette-and-inline-editor | Pending |
| STR-01 | Phase 4 | 04-streaming-diff-semantic-brief | Pending |
| STR-02 | Phase 4 | 04-streaming-diff-semantic-brief | Pending |
| STR-03 | Phase 4 | 04-streaming-diff-semantic-brief | Pending |
| STR-04 | Phase 4 | 04-streaming-diff-semantic-brief | Pending |
| STR-05 | Phase 4 | 04-streaming-diff-semantic-brief | Pending |
| DIF-01 | Phase 4 | 04-streaming-diff-semantic-brief | Pending |
| DIF-02 | Phase 4 | 04-streaming-diff-semantic-brief | Pending |
| DIF-03 | Phase 4 | 04-streaming-diff-semantic-brief | Pending |
| DIF-04 | Phase 4 | 04-streaming-diff-semantic-brief | Pending |
| CRB-01 | Phase 4 | 04-streaming-diff-semantic-brief | Pending |
| CRB-02 | Phase 4 | 04-streaming-diff-semantic-brief | Pending |
| CRB-03 | Phase 4 | 04-streaming-diff-semantic-brief | Pending |
| POL-01 | Phase 5 | 05-polish-and-verify | Pending |
| POL-02 | Phase 5 | 05-polish-and-verify | Pending |
| POL-03 | Phase 5 | 05-polish-and-verify | Pending |
| POL-04 | Phase 5 | 05-polish-and-verify | Pending |
| POL-05 | Phase 5 | 05-polish-and-verify | Pending |
| POL-06 | Phase 5 | 05-polish-and-verify | Pending |

**Coverage:**
- v1 requirements: 36 total (3 + 6 + 4 + 5 + 5 + 4 + 3 + 6)
- Mapped to phases: 36
- Unmapped: 0 ✓
- Double-mapped: 0 ✓

---
*Requirements defined: 2026-05-26*
*Last updated: 2026-05-26 after v0.4 ROADMAP.md creation (5 phases, slug-annotated)*
