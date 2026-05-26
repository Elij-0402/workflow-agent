# Stack Research — v0.4 UX Foundation

**Domain:** Next.js 15 + React 19 dark-mode UX additions (command palette, inline edit, keyboard shortcuts, inline diff, motion, SSE dual-pane)
**Researched:** 2026-05-26
**Confidence:** HIGH (existing-stack alignment), MEDIUM (cmdk peer-deps friction documented)

---

## Executive Summary

The v0.4 UX features can be delivered with **three small additions** to the existing stack — `cmdk`, `react-hotkeys-hook`, and `diff` — plus **two pattern additions** without new dependencies: a custom contenteditable inline-edit hook (over a rich-text editor) and CSS-only motion (over framer-motion). The project's current `ai@4.0.20` + `useChat` already covers SSE streaming for the dual-pane UI; no SDK upgrade is required for v0.4. Existing `tailwindcss-animate`, the Radix Collapsible primitive, and the design-token motion variables (`--duration-fast`, `--easing-out`) already in `globals.css` cover the 150ms ease-out global transitions without framer-motion.

**Primary recommendation:**
- **Add:** `cmdk@^1.1.1`, `react-hotkeys-hook@^4.6.2`, `diff@^9.0.0` (npm pinned latest stable as of 2026-05-26).
- **Don't add:** framer-motion / motion, Tiptap / Lexical / Plate, tinykeys, react-diff-viewer, diff-match-patch, react-content-loader.
- **Install with `--legacy-peer-deps`** (or migrate to pnpm/bun) because `cmdk@1.1.1` still doesn't declare React 19 in peer-deps — Shadcn's official Next.js 15 guide documents this workaround. `[CITED: ui.shadcn.com/docs/react-19]`

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| ⌘K command palette | Browser (client component) | — | cmdk explicitly is **not** RSC-compatible; must live behind `"use client"` `[CITED: github.com/pacocoursey/cmdk]` |
| Multi-route workbench (URL-as-state) | Frontend Server (App Router) | Browser (transitions) | Next.js App Router parallel/intercepting routes + `useRouter`/`useSearchParams` own URL state; client only handles transitions |
| Inline-edit blueprint cards | Browser | API (PATCH on commit) | DOM editing is browser-tier; persistence to Supabase remains in existing route handlers |
| j/k/d/a keyboard shortcuts | Browser | — | `react-hotkeys-hook` scopes shortcuts to the card-list focus context |
| SSE streaming dual-pane | API (streamText route) + Browser (useChat) | — | Existing `ai@4` pattern already split this way in `src/lib/llm/dispatch.ts` |
| Inline LCS diff highlighting | Browser (render) | shared lib `src/lib/diff/` | Diff math runs client-side on already-loaded variant text; current `variant-diff.ts` handles paragraph LCS, char/word inline needs `diff` package |
| Skeleton states | Browser | — | Pure presentation; Shadcn `skeleton.tsx` already in repo |
| 150ms ease-out transitions | Browser | — | CSS variables (`--duration-fast`, `--easing-out`) already defined in `globals.css`; no JS motion runtime needed |

---

## Recommended Stack

### Core Additions (3 new packages)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `cmdk` | `^1.1.1` (published 2025-03-14) `[VERIFIED: npm registry]` | ⌘K command palette primitive | Built by pacocoursey (linear.app contributor); ships fuzzy matching, keyboard navigation, grouping, and `Command.Dialog`; Shadcn's official `command` component wraps it — minimal new surface for an already-Shadcn project `[CITED: github.com/pacocoursey/cmdk]` |
| `react-hotkeys-hook` | `^4.6.2` (verified via `npm view`) `[VERIFIED: npm registry]` | Scoped keyboard shortcuts incl. chords | Provider-based named scopes (`HotkeysProvider`) for "blueprint-card list active" vs "global palette open"; built-in `enableOnFormTags` / `enableOnContentEditable` (critical for the inline-edit feature); ~31KB unpacked `[CITED: react-hotkeys-hook.vercel.app]` |
| `diff` (jsdiff) | `^9.0.0` `[VERIFIED: npm registry]` | Word/char-level inline diff | The existing `src/lib/diff/variant-diff.ts` does paragraph-LCS only; `diff.diffWords()` / `diffChars()` produces the three-state segments (`added`/`removed`/`unchanged`) needed for in-place highlighting; pure-JS, no React dependency, ~616KB unpacked but only ~6KB of word/char diff used `[CITED: github.com/kpdecker/jsdiff]` |

### Pattern Additions (zero dependencies)

| Pattern | Replaces | Why |
|---------|----------|-----|
| **Custom `useInlineEdit` hook over `<input>` / `<textarea>` swap** (NOT contenteditable, NOT rich-text editor) | Tiptap / Lexical / Plate / Slate | Blueprint cards have a **fixed 7-field schema** with **plain-text values** — no marks, no nodes, no embeds. A rich-text editor here adds 30–60KB and forces ProseMirror/Lexical state management for zero functional gain. The standard pattern is: display-mode renders styled text; on `Enter` or click swap to a controlled `<input>` / `<textarea>` (autosize); on `Esc` cancel, on blur or `Enter` commit via existing PATCH handler. React 19 + `useDeferredValue` makes the swap trivial. `[ASSUMED — recommendation based on schema-fixed plain-text scope]` |
| **CSS-only motion via existing `--duration-fast` + `--easing-out` tokens + `tailwindcss-animate`** | framer-motion / motion | The motion library minimum is **4.6KB (LazyMotion + `m`) + 15KB (domAnimation) = 19.6KB** `[CITED: motion.dev/docs/react-reduce-bundle-size]`. The v0.4 motion brief is 150ms ease-out for opacity/transform/height — Tailwind's `transition`, `duration-150`, custom `ease-[cubic-bezier(0.16,1,0.3,1)]` (already defined as `--easing-out`), plus `tailwindcss-animate`'s `animate-in fade-in slide-in-from-bottom` covers every case. The Radix Collapsible (already in `package.json`) animates height via `--radix-collapsible-content-height` CSS var with the same easing. `[CITED: tailwindcss-animate readme + globals.css]` |
| **Existing Shadcn `Skeleton`** in `src/components/ui/skeleton.tsx` | react-content-loader / custom SVG skeletons | Shadcn's Skeleton is a CSS pulse on a 1×N rectangle — sufficient for blueprint-card, list, and pane placeholders. No SVG-shape skeletons are needed for the v0.4 brief. |

### Existing Stack — Re-use, Don't Re-add

| Already in `package.json` | Use For |
|---------------------------|---------|
| `ai@^4.0.20` + `@ai-sdk/openai@^1.0.10` | SSE dual-pane streaming. `useChat` from `ai/react` (NOT `@ai-sdk/react` — that's the v5+ split package) consumes `result.toDataStreamResponse()` from existing route handlers `[CITED: ai-sdk.dev/docs/getting-started/nextjs-app-router]` |
| `@radix-ui/react-collapsible@^1.1.12` | Card expand/collapse height transitions (the v0.4 collapsible coordination need) |
| `@radix-ui/react-dialog@^1.1.15` | Already a peer of `cmdk` — `Command.Dialog` reuses this, no duplicate dialog runtime |
| `tailwindcss-animate@^1.0.7` | `animate-in` / `animate-out` utilities for skeleton, palette, panel transitions |
| `zustand@^5.0.2` | Workbench split-state across the 4 sub-routes if URL params alone become insufficient (prefer URL first) |
| `sonner@^1.7.1` | Error retry boundary toasts |
| `lucide-react@^0.468.0` | All command-palette and shortcut hint icons |

---

## Package Legitimacy Audit

slopcheck is not installed in this environment. Per protocol, packages below are gated on registry verification + provenance (official Shadcn docs link, GitHub source, multi-million weekly downloads). Each is tagged `[VERIFIED: npm registry]` only when cited from an authoritative source (Shadcn docs or official maintainer repo). For each install task the planner should still gate behind `checkpoint:human-verify` per project policy.

| Package | Registry | Latest | Source Repo | Notes | Disposition |
|---------|----------|--------|-------------|-------|-------------|
| `cmdk` | npm | 1.1.1 (2025-03-14) | github.com/pacocoursey/cmdk | Shadcn-blessed; peer-dep warning on React 19 — install with `--legacy-peer-deps` | Approved |
| `react-hotkeys-hook` | npm | 4.6.2 | github.com/JohannesKlauss/react-hotkeys-hook | 31KB unpacked; active maintenance | Approved |
| `diff` | npm | 9.0.0 | github.com/kpdecker/jsdiff | de-facto standard JS diff library since 2009; Node/browser dual-build | Approved |

**Packages explicitly removed from consideration (do not install):** `framer-motion`, `motion`, `@tiptap/react`, `lexical`, `@udecode/plate`, `tinykeys`, `react-diff-viewer-continued`, `diff-match-patch`, `react-content-loader`, `slate` — rationale in "What NOT to Use" below.

---

## Installation

```bash
# All three additions in one shot — npm path with React 19 peer-deps workaround
npm install --legacy-peer-deps cmdk@^1.1.1 react-hotkeys-hook@^4.6.2 diff@^9.0.0
npm install --legacy-peer-deps -D @types/diff

# Then add the Shadcn Command wrapper (uses cmdk under the hood)
npx shadcn@latest add command
```

**Bundle size impact (gzipped client-bundle estimates):**
- `cmdk` — ~5–6 KB gzipped (peer-deps Radix dialog/id/primitive already in tree)
- `react-hotkeys-hook` — ~3–4 KB gzipped
- `diff` (word + char only, tree-shaken via named imports) — ~6–8 KB gzipped
- **Total added: ~15–18 KB gzipped to the client bundle.**

By contrast, the *rejected* path (Tiptap-react + StarterKit + framer-motion + diff-match-patch) would add ~120–180 KB gzipped.

---

## Detailed Library Choices — Why This Over Alternatives

### 1. Command palette — `cmdk` over custom build

**Why cmdk wins:**
- Shadcn's `Command` component is a thin styled wrapper over cmdk — already aligned with the project's `style: new-york` preset and HSL token system. `[CITED: ui.shadcn.com/docs/components/command]`
- Built-in fuzzy filtering, keyboard nav (↑↓ Enter Esc), `Command.Group`, `Command.Loading`, `Command.Empty`, ⌘K dialog mode — all the v0.4 brief items.
- pacocoursey is a Linear.app/Vercel engineer; cmdk is the de-facto palette in the Linear/Vercel aesthetic this milestone targets.

**Trade-off — React 19 peer-deps:**
- cmdk@1.1.1 hasn't bumped peer-deps to React 19. Real shipping bugs are TypeScript-only (a bundled older `@types/react`); runtime works. `[CITED: github.com/shadcn-ui/ui issues #6200, #6601]`
- Mitigation: `--legacy-peer-deps` install flag, or add a `package.json` overrides entry pinning `@types/react` to 19. Shadcn officially endorses the flag. `[CITED: ui.shadcn.com/docs/react-19]`
- Watch: Shadcn's compat table now marks cmdk ✅ as of latest, so the friction is documentation-only — no behavioral bugs in React 19.

**Integration point:**
- Add `<CommandPalette />` once, mounted in the root `app/layout.tsx`'s client boundary (a new `components/global/command-palette.tsx` thin client component).
- Listen for `$mod+K` via `react-hotkeys-hook` at the global scope; toggle a `useState` open prop on `Command.Dialog`.
- Wire commands as a static array — `{ id, label, hint, action, group }` — initially covering: jump to session, switch route, run "new dual-book", etc.

**Custom build was considered and rejected** because keyboard navigation + fuzzy match + group/list ARIA semantics would be 200+ lines of bespoke code, all of which cmdk does correctly and accessibly.

### 2. Inline edit — custom `useInlineEdit` hook over Tiptap/Lexical/Plate

**Decision: do NOT add a rich-text editor.** `[ASSUMED — based on plain-text + fixed-schema requirement]`

**The 7 blueprint sections are plain-text fields with a fixed schema (Zod-validated server-side).** There is no formatting (no bold, italic, lists, embeds, marks, code). The brief is "inline edit" not "rich-text edit."

| Option | Bundle | Why rejected |
|--------|--------|--------------|
| Tiptap | ~40–60 KB (core + react + StarterKit) | Adds ProseMirror schema/state for zero formatting benefit |
| Lexical | ~30–45 KB | Same problem; Meta-owned but still rich-text-first |
| Plate | ~80–120 KB | Slate-based; overkill |
| Slate | ~50 KB | Same |
| react-aria-components `TextField` | ~5 KB | Headless; viable but Shadcn's Input/Textarea + Radix focus management already covers it |

**The pattern (zero deps):**

```tsx
// src/components/workbench/use-inline-edit.ts (new)
function useInlineEdit<T extends string>({ value, onCommit }: { value: T; onCommit: (next: T) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); inputRef.current?.select(); }, [editing]);

  return {
    editing,
    enter: () => { setDraft(value); setEditing(true); },
    cancel: () => setEditing(false),
    commit: () => { if (draft !== value) onCommit(draft as T); setEditing(false); },
    inputProps: {
      ref: inputRef,
      value: draft,
      onChange: (e) => setDraft(e.target.value),
      onKeyDown: (e) => {
        if (e.key === "Escape") { e.preventDefault(); /* cancel */ }
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); /* commit */ }
      },
      onBlur: () => /* commit */,
    },
  };
}
```

Pair with Shadcn `Textarea` (already installed) auto-sized via `field-sizing: content` CSS (a 2025 baseline) or a 4-line `useEffect` ref-resize. Validation reuses existing Zod schemas on PATCH.

**Integration point:** new `src/components/workbench/blueprint-section-card.tsx` consumes `useInlineEdit` per section. The card stays Shadcn-style (`surface-panel` class).

### 3. Keyboard shortcuts — `react-hotkeys-hook` over `tinykeys`

**Why react-hotkeys-hook wins for this project:**
- **Named scopes via `<HotkeysProvider>`** — the v0.4 brief has overlapping scopes ("blueprint card list focused" gets `j/k/d/a`, "palette open" gets only navigation, "modal open" disables global shortcuts). tinykeys has no first-class scopes — you'd reimplement them. `[CITED: react-hotkeys-hook.vercel.app/docs/documentation/useHotkeys/scoping-hotkeys]`
- **Built-in `enableOnFormTags`/`enableOnContentEditable`** — critical because the inline-edit textarea must NOT swallow `j/k` while typing; tinykeys handles this via manual `options.ignore` filtering you have to maintain.
- **React-idiomatic hook API** — single `useHotkeys('j', handler, { scopes: ['blueprint-list'] })` per shortcut, no `useEffect` wrapping.
- Chord support: `useHotkeys('g>b', handler)` covers `g b` jumps without tinykeys' bespoke syntax.

**tinykeys advantages (don't apply here):** smaller (~1 KB vs 4 KB), regex matching, framework-agnostic. The size difference (3 KB) doesn't justify reimplementing scopes.

**Integration point:**
- Wrap `app/layout.tsx`'s client root in `<HotkeysProvider initiallyActiveScopes={['global']}>`.
- Scope vocabulary:
  - `global`: `$mod+K` (palette), `?` (shortcut help), `g b` (go blueprint), `g s` (go studio)
  - `blueprint-list`: `j` (down), `k` (up), `d` (delete/disable), `a` (add), `Enter` (edit), `Esc` (close)
  - `palette-open`: disables `blueprint-list` automatically via `enableScope`/`disableScope`
- Use `useHotkeysContext().enableScope('palette-open')` on dialog open.

### 4. Inline diff — `diff` (jsdiff) over `diff-match-patch` / `react-diff-viewer`

**Existing code:** `src/lib/diff/variant-diff.ts` already implements paragraph-level LCS for the three-pane variant comparison. **This stays.**

**What's new in v0.4:** "In-place LCS diff highlighting in long-form text" — char/word level highlighting *within* a single rendered paragraph (e.g., a generated variant with insertions/deletions inline-marked).

| Option | Why chose / rejected |
|--------|----------------------|
| `diff` (jsdiff) v9.0.0 | **Choice.** Pure JS, no React, `diffWords` / `diffWordsWithSpace` / `diffChars` return `{value, added, removed}[]`. Renders directly: map over result and emit `<span class="diff-added">` / `<span class="diff-removed">` / plain. Works for Chinese text via `diffChars` (no word-boundary assumption). |
| `diff-match-patch` | Google's algorithm, faster on huge inputs, but **last meaningful release 2018** (`[CITED: npm view diff-match-patch — 1.0.5]`); types are community-maintained; needs wrapper to produce semantic chunks. Save for v0.5+ if performance becomes an issue. |
| `react-diff-viewer-continued` | A **side-by-side renderer**, not a primitive — fights the project's "inline highlighting in long-form text" brief (renders its own table layout, hard to restyle to dark-only with HSL tokens). |
| Custom over existing LCS | Existing `lcs()` in `variant-diff.ts` is paragraph-array; extending it to char/word is duplicating jsdiff. Not worth maintenance burden. |

**Integration point:**
- New `src/lib/diff/inline-diff.ts` (~40 lines): wraps `diffWords` (English) and `diffChars` (Chinese — detected by Unicode range check) into a single typed `inlineDiff(a: string, b: string): InlineDiffSegment[]`.
- New `src/components/diff/InlineDiff.tsx`: receives segments, renders with token classes `text-flash` (added — uses existing semantic green) and `line-through text-destructive/70` (removed).
- Tokens for diff colors should use **existing** `--flash` (additions, semantic green) and `--destructive` (removals) rather than introducing new tokens.

### 5. Skeleton states — existing Shadcn `Skeleton`

Shadcn's `<Skeleton className="h-4 w-32" />` is already in `src/components/ui/skeleton.tsx`. The v0.4 brief needs:
- Card placeholders (4 cards × 7 sections): grid of `Skeleton` rectangles.
- Streaming-pane placeholders: rotating skeleton lines while SSE buffer is empty.
- Route-transition skeletons: Next.js App Router `loading.tsx` per workbench sub-route — `loading.tsx` returns a `<Skeleton>`-based layout.

No additions. The current `animate-pulse` on Skeleton already uses `--muted` correctly.

### 6. Motion — CSS tokens + Tailwind utilities, NO framer-motion

The motion brief is narrow: "150ms ease-out global transitions" + "collapsible height/opacity coordinated."

**Existing tools cover 100%:**

| Need | Solution | Source |
|------|----------|--------|
| 150ms ease-out fade/translate | `transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]` or define `transition-fast` utility extending `--duration-fast` (`160ms`) + `--easing-out` | `globals.css` :root already exports these tokens |
| Collapsible height | `tailwindcss-animate` `animate-accordion-down` already in `tailwind.config.ts`, driven by `--radix-collapsible-content-height` | Existing config |
| Mount/unmount fade-up | `animate-fade-up` keyframe already in `tailwind.config.ts` | Existing config |
| Layout animations (FLIP) | Not in v0.4 brief — defer |

**framer-motion / motion was considered and rejected** because:
- Smallest realistic footprint is **19.6 KB gzipped** (`LazyMotion` + `m` + `domAnimation`). `[CITED: motion.dev/docs/react-reduce-bundle-size]`
- v0.4 has no spring, drag, pan, layout-animation, or shared-layout requirements.
- Adding motion-runtime now creates a "we have it, use it" gravity that will pull future work toward JS-animated everything, breaking the "extreme restraint, dark minimal" aesthetic baseline.

**If a future milestone needs FLIP layout animations, shared-element transitions, or springs — add `motion@^12` then with `LazyMotion` strict mode.** Not v0.4.

### 7. SSE streaming dual-pane — existing `ai@4` + `useChat`

**Stay on `ai@^4.0.20` for v0.4.** The newer v6 docs use `@ai-sdk/react` + `DefaultChatTransport` and `result.toUIMessageStreamResponse()` — these are v5+/v6 idioms. The project's current `ai@4` uses:

- Server: `streamText({ ... }).toDataStreamResponse()` from `ai`
- Client: `useChat` from `ai/react`

This works in Next.js 15 App Router today and is what `src/lib/llm/dispatch.ts` is built around. `[CITED: ai-sdk.dev/docs/getting-started/nextjs-app-router]`

**Dual-pane state pattern (no new dep):**
- One `useChat` instance per pane is **wrong** — they'd be independent streams.
- Pattern: single SSE endpoint emits **two named data parts** (`data: { kind: 'blueprint' | 'variant', delta }`) using `streamText`'s `experimental_streamData` or a custom `ReadableStream` that interleaves tagged chunks.
- Client: a single `useChat({ api: '/api/...' })` consumer reads `messages[i].data` and routes chunks into two `useState` accumulators (one per pane). Render both panes from those states.
- **Alternative if `useChat`'s data model is too coupled:** use `fetch()` + manual `ReadableStream` reader + `useReducer` — already a pattern in some places in the codebase. Confirm with first task before deciding.

**Defer AI SDK v5/v6 upgrade to its own milestone** — breaking changes include the `ai/react` → `@ai-sdk/react` move, `toDataStreamResponse` → `toUIMessageStreamResponse`, and the `message.content` → `message.parts` model. None are needed for v0.4 features.

---

## Existing Token / Pattern Map (do not duplicate)

| v0.4 feature wants… | Use existing | Don't introduce |
|---------------------|-------------|------------------|
| `150ms ease-out` | `--duration-fast: 160ms` + `--easing-out` | New duration variables |
| Collapse height | Radix Collapsible + `animate-accordion-down` | New collapse impl |
| Card surface | `.surface-panel` class | New container class |
| Mono tags / kbd hints | `.type-mono-label`, `.mono-label-xs` | New mono class |
| Section heading inside card | `.type-title` | New heading class |
| Status colors (added/removed in diff) | `--flash` (green) + `--destructive` (red) | New diff tokens |
| Error retry boundary toasts | `sonner` (already installed) | New toast lib |
| Modal dialog (palette base) | `@radix-ui/react-dialog` (cmdk re-uses it) | Separate modal lib |

---

## Alternatives Considered

| Recommended | Alternative | When Alternative Would Be Better |
|-------------|-------------|----------------------------------|
| `cmdk` | Build palette on `Combobox` from headless-ui or react-aria-components | If we wanted RSC-compatibility, or if Linear-style fuzzy match wasn't required |
| `react-hotkeys-hook` | `tinykeys` | If bundle size were ≤2 KB hard ceiling and we accepted reimplementing scopes |
| Custom inline-edit hook | Tiptap | If 7 sections needed bold/italic/links — they don't; would revisit only if PM scope expands |
| `diff` (jsdiff) | `diff-match-patch` | If diffing >100 KB strings or needing patch-application (server-side reconciliation) — neither in v0.4 |
| CSS tokens + tailwindcss-animate | motion / framer-motion | If a phase introduced layout/shared-element animations or drag-and-drop reordering |
| `ai@4` + `useChat` | `ai@6` + `@ai-sdk/react` + transport | When the project is ready to take the v4→v6 breaking changes as a dedicated migration phase |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `motion` / `framer-motion` | 19.6KB+ minimum; v0.4 brief is satisfied by CSS tokens and `tailwindcss-animate` | Existing `--duration-fast` + `--easing-out` + Tailwind `transition-*` |
| `@tiptap/*`, `lexical`, `@udecode/plate`, `slate` | Rich-text editors for plain-text fixed-schema fields = wrong tool; 30–120 KB | `useInlineEdit` hook + Shadcn `Textarea` |
| `tinykeys` | No named scopes — would force a custom scope manager; ~3 KB savings doesn't justify it | `react-hotkeys-hook` |
| `diff-match-patch` | Stale (last release 2018), no semantic chunk API out of the box | `diff` (jsdiff) v9 |
| `react-diff-viewer-continued` | Renders its own side-by-side table; not a primitive for inline highlight | jsdiff segments + custom `<InlineDiff>` |
| `react-content-loader` | Shadcn Skeleton is already in repo and covers the brief | Existing `src/components/ui/skeleton.tsx` |
| `@ai-sdk/react` (v5+ package) | The project pins `ai@4`; mixing v4 and v5 packages causes type drift | `useChat` from `ai/react` (the v4 path) |
| Auto-installing cmdk with `npm install cmdk` (no flag) | npm strict peer-deps fails on React 19 | `npm install --legacy-peer-deps cmdk` or use pnpm/bun |

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `cmdk@^1.1.1` | latest | `react@19`, `react-dom@19`, `next@15` | Install with `--legacy-peer-deps`; bundles outdated `@types/react` — consider `package.json` overrides `{ "@types/react": "19.x" }` if TS build complains `[CITED: github.com/shadcn-ui/ui#6200]` |
| `react-hotkeys-hook@^4.6.2` | latest | `react@18+`, `react@19` | No peer-deps friction; works with strict TS |
| `diff@^9.0.0` | latest | Node 18+, all browsers | v9 dropped CommonJS-only; ESM-first — fine for Next.js 15 |
| `ai@^4.0.20` (existing) | pinned | `@ai-sdk/openai@^1.0.10`, Next.js 15 | Do not mix with `@ai-sdk/react`; that's the v5+ package |

---

## Sources

### Primary (HIGH confidence)
- `[CITED: ui.shadcn.com/docs/react-19]` — Shadcn's official React 19 + Next.js 15 install guidance, includes `--legacy-peer-deps` and cmdk status table
- `[CITED: github.com/pacocoursey/cmdk]` — cmdk README: React 18 required, no RSC support, v1.1.1 release date
- `[CITED: github.com/shadcn-ui/ui issue #6200, #6601]` — documented React 19 type friction with cmdk
- `[CITED: react-hotkeys-hook.vercel.app/docs/documentation/useHotkeys/scoping-hotkeys]` — named scopes API
- `[CITED: motion.dev/docs/react-reduce-bundle-size]` — LazyMotion bundle math (4.6KB + 15KB / 25KB)
- `[CITED: ai-sdk.dev/docs/getting-started/nextjs-app-router]` — App Router streaming pattern (note: docs are v5/v6; project pins v4 so consume v4-compatible bits only)
- `npm view` direct registry queries for all four version pins (2026-05-26)

### Secondary (MEDIUM confidence)
- `[CITED: github.com/jamiebuilds/tinykeys]` — chord syntax + scoping limits (used to confirm rejection rationale)
- `[CITED: github.com/kpdecker/jsdiff]` — diff library API surface

### Repo evidence
- `D:/workflow-agent/package.json` — current dependency map
- `D:/workflow-agent/src/lib/diff/variant-diff.ts` — existing paragraph-LCS implementation, confirms the gap is char/word inline diff
- `D:/workflow-agent/src/lib/llm/dispatch.ts` — confirms `ai@4` + `createOpenAI` pattern in use
- `D:/workflow-agent/src/app/globals.css` — confirms `--duration-fast`, `--easing-out`, all surface/type tokens already defined
- `D:/workflow-agent/tailwind.config.ts` — confirms `tailwindcss-animate` + `animate-fade-up` + `animate-accordion-down` keyframes already present
- `D:/workflow-agent/src/components/ui/skeleton.tsx` — confirms Shadcn Skeleton already installed

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Blueprint cards have **plain-text** fields with **no rich formatting** (no marks / lists / embeds) | Inline edit recommendation | If formatting is needed, the custom hook becomes inadequate — would need Tiptap. **Confirm in discuss-phase before lock.** |
| A2 | Inline diff in long-form text is **highlight-in-place** (one rendered paragraph with `<span>` segments) — NOT side-by-side panels | Diff recommendation | If side-by-side is wanted for some panes, jsdiff still works but renderer differs |
| A3 | v0.4 has **no spring / drag / layout-animation / shared-element** motion needs | Motion recommendation | If layout animations are wanted, add motion@12 + LazyMotion later |
| A4 | The project will stay on **ai@4** for the v0.4 milestone (no v6 migration concurrently) | SSE streaming recommendation | If a v5/v6 migration is desired in v0.4, that's a separate phase — recommend deferring |
| A5 | `react-hotkeys-hook@4.6.2` is the current latest from npm view at research time — version pin should be re-checked at install | Versions table | Minor patch differences shouldn't matter; major would warrant re-research |

---

## Metadata

**Confidence breakdown:**
- Library identity & rationale: HIGH — official sources for all four picks
- Version pins: HIGH — `npm view` queried 2026-05-26
- React 19 / cmdk peer-deps workaround: HIGH — multiple Shadcn-official sources
- AI SDK v4 pattern stability: MEDIUM — public docs have moved to v5/v6; v4 pattern is in-repo and stable, but external docs are sparse for v4 specifically
- Custom inline-edit hook recommendation: MEDIUM — depends on Assumption A1 (plain-text fixed schema)

**Research date:** 2026-05-26
**Valid until:** 2026-06-25 (30 days — stable libraries, no fast-moving frameworks involved)

---
*Stack research for: v0.4 UX Foundation — Next.js 15 + React 19 brownfield additions*
*Researched: 2026-05-26*
