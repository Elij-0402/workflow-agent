# Architecture Research — v0.4 UX Foundation Integration

**Domain:** Brownfield UX-layer additions on Next.js 15 App Router + Supabase + AI SDK (custom SSE)
**Researched:** 2026-05-26
**Confidence:** HIGH (existing code read end-to-end; library versions verified on npm)
**Scope:** How eight specific v0.4 features attach to the existing system without rewriting it.

---

## Summary

This is **not** a greenfield architecture. The existing stack is solid and stays: Next.js 15 App Router, server actions + Route Handlers, Supabase RLS, custom SSE (`src/lib/streaming/sse.ts` + `consumeSseStream`), React 19, Shadcn/Tailwind, react-hook-form + zod, sonner toasts, custom dark HSL token system. The v0.4 changes are **integration questions**, not foundation questions.

The largest existing pain — `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx` at **1,403 lines** (verified, not 1,361 as briefed) — has a clean decomposition seam already encoded in its `FlowStep = "upload" | "analysis" | "compare" | "generate"` discriminated union. Each `activeStep === X` JSX branch is independent and shares data through props derived in the parent; the seam is by step, not by horizontal concern.

A hidden architecture problem I want to flag before any v0.4 work: `BlueprintEditor.save()` is called on **every keystroke** with no debounce — `void save({ ...bp, characters: bp.characters.map(...) })` fires inside every `onChange`. This means inline-edit cards already silently PATCH on every character. The v0.4 inline-edit feature must NOT inherit this; debounced or onBlur-batched save is a prerequisite, not an enhancement.

**Primary recommendation:** Adopt the eight integration decisions in [§ Architectural Decisions](#architectural-decisions) below. Build order is fixed by hard dependencies: URL-state utility → workbench multi-route split → loading/error boundary backfill → command palette → inline-edit overhaul → streaming dual-pane → long-text diff renderer. Add **nuqs** (one dependency) and shadcn **Command** (cmdk, already a transitive dep candidate); reject everything else. [VERIFIED: npm registry] nuqs 2.8.9, cmdk 1.1.1.

---

## Existing System Snapshot (Established Facts)

| Subsystem | Current Reality | Source |
|-----------|----------------|--------|
| Routing shell | `src/app/layout.tsx` (fonts, Toaster) → `src/app/(app)/layout.tsx` (Sidebar + sticky header + main) | Read |
| App nav | `src/components/sidebar.tsx` + `src/components/app-nav.tsx` (collapsible "更多工具") | Read |
| Workbench entry | `src/app/(app)/sessions/[id]/workbench/page.tsx` (Server Component, loads `loadDualSessionPageData`, passes 14 props to client) | Read |
| Workbench client | `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx` — 1,403 lines, 14 props, `FlowStep` union, branches by `activeStep === ...` | Verified `wc -l` |
| Step transport | `?step=upload\|analysis\|compare\|generate` searchParam, parsed by `resolveWorkbenchStep`, manipulated by `router.replace` | Read page.tsx + workbench-client.tsx:553-573 |
| Blueprint save | `BlueprintEditor.save()` fires on **every** field change via `void save({ ...bp, characters: bp.characters.map(...) })`; no debounce; PATCH `/api/blueprint` with `expectedUpdatedAt` for optimistic concurrency | Read blueprint-editor.tsx:91-115, grep "save\(\|onChange" |
| Streaming | Custom SSE: server emits `event: partial|done|error` via `sseResponse()`; client uses `consumeSseStream(res.body, handler, signal)`. `useChat` from AI SDK is NOT used anywhere | Read sse.ts + outline-streamer.tsx; grep `useChat` returns 0 hits |
| AI SDK use | `streamObject` server-side only (`src/lib/llm/runtime.ts`) — never on client | Read |
| Diff library | `src/lib/diff/variant-diff.ts` — LCS on normalized paragraphs, returns `aOnly/bOnly` index arrays; **no per-character or per-line render utility exists** | Read |
| Diff rendering | `src/components/sessions/variant-diff-paragraphs.tsx` — column list of "only-on-side" paragraphs sliced to 80 chars; full paragraph shown in a fixed-position drawer. **No virtualization, no chunked render** | Read |
| Generate UX | `src/components/workbench/generate-drawer.tsx` — Sheet + react-hook-form + POST `/api/generate-v2` returns JSON (NOT streamed in the workbench drawer today; streaming exists only in `creative-brief/outline-streamer.tsx` for Studio) | Read |
| State management | React `useState`/`useReducer` per component. `zustand@5.0.2` is in `package.json` but **0 imports** in `src/`. No global store today | Grep `zustand\|create\(` returns 0 src hits |
| Loading boundaries | Per-route `loading.tsx` exists for: workbench, sessions, compare, studio. No per-component Suspense | Glob `loading.tsx` returns 4 files |
| Forms | `react-hook-form@7.54` + `@hookform/resolvers` + zod throughout (`generate-drawer.tsx`, brief sheets) | package.json |
| UI primitives | Shadcn: Dialog, Sheet, Collapsible, DropdownMenu, Tabs, Toggle, ScrollArea, Select, Tooltip, Skeleton. **Command (cmdk) is NOT installed** | `ls src/components/ui/` |
| Optimistic concurrency | `expectedUpdatedAt` round-tripped to API; conflict → toast | blueprint-editor.tsx:99 |

These are the **fixed integration points** for v0.4. New code attaches to these, replaces none of them.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| ⌘K palette open/close + keystroke routing | Browser (Client) | — | Pure UI keyboard interaction; no data |
| ⌘K command catalog (route list, recent sessions) | (app) Server layout | Browser | Recent-sessions list needs RLS-scoped Supabase fetch; static commands can be inlined client-side |
| Per-step page data fetching | Frontend Server (RSC) | — | Already RSC pattern in `page.tsx`; preserves auth + RLS at the server edge |
| Per-step shared layout (stepper, header) | Frontend Server (RSC) | — | Stepper state derives from request URL — server-resolvable |
| Per-card inline edit state | Browser (Client) | — | Local typing latency is client-only; server is the source of truth on save |
| Optimistic save + conflict resolution | Browser → API → DB | — | Already established via `expectedUpdatedAt` |
| SSE stream consumption | Browser (Client) | — | Stream lifecycle bound to component, not request |
| Diff token highlighting | Browser (Client) | Frontend Server (precompute) | LCS already computed server-side (per brief); render is client |
| URL-as-state parsing | RSC (initial) + Browser (mutations) | — | Server reads on load; client mutates via History API |
| Skeleton/loading boundaries | Frontend Server (RSC) | Browser (Suspense) | Route-level `loading.tsx` is RSC-native; per-component Suspense for streamed sub-trees |

No misassignments detected vs. existing code — v0.4 just refines what's there.

---

## Standard Stack (Confirmed Current + Additions)

### Core — Already Installed (DO NOT replace)

| Library | Version | Purpose | Provenance |
|---------|---------|---------|------------|
| next | ^15.1.0 | App Router framework | package.json |
| react / react-dom | ^19.0.0 | UI runtime | package.json |
| @supabase/ssr + @supabase/supabase-js | ^0.10.3 / ^2.46.2 | RSC-compatible auth + RLS data | package.json |
| ai + @ai-sdk/openai | ^4.0.20 / ^1.0.10 | Server-side `streamObject` only | runtime.ts |
| react-hook-form + @hookform/resolvers + zod | ^7.54 / ^3.9 / ^3.23 | Forms (generate-drawer, briefs) | package.json |
| sonner | ^1.7.1 | Toasts | layout.tsx |
| lucide-react | ^0.468 | Icons | ubiquitous |
| zustand | ^5.0.2 | **Currently unused** — listed but 0 imports | package.json + grep |

### Additions for v0.4

| Library | Verified version | Purpose | Why standard |
|---------|------------------|---------|--------------|
| `nuqs` | 2.8.9 [VERIFIED: npm registry, 2026-05-26] | Typed URL-as-state for step/panel/diff-tab params | Officially documented for Next.js 15 App Router; ships `parseAsStringLiteral`, server cache, and `useQueryStates`; replaces ~5 ad-hoc `searchParams` resolvers ([nuqs.dev](https://nuqs.dev/)) |
| `cmdk` | 1.1.1 [VERIFIED: npm registry, 2026-05-26] | Underlying primitive for shadcn `Command` | Powers Linear/Raycast palettes; battle-tested fuzzy match; what shadcn `Command` wraps ([shadcn docs](https://ui.shadcn.com/docs/components/command)) |
| Shadcn `Command` component (file copy) | — | ⌘K dialog surface | First-party shadcn primitive; adds `command.tsx` to `src/components/ui/`; no separate npm package — installed via `npx shadcn@latest add command` |
| `use-debounce` *(optional, 10.0.x)* | — [ASSUMED] | Debounce inline-edit saves | Tiny (<1 kB), zero-config; existing repo has 0 debounce utilities. Alternative: write a 12-line `useDebouncedCallback` hook in `src/lib/hooks/` — preferred per "Don't Hand-Roll" inversion (this one IS trivial) |

### Rejected Alternatives

| Instead of | Considered | Rejected because |
|-----------|------------|------------------|
| nuqs | `next-usequerystate` | `next-usequerystate` is **the old name for nuqs** — the package was renamed; nuqs 2.x is the maintained line |
| nuqs | raw `useSearchParams` + `router.replace` | Already in use and clearly leaking (3 inline `resolveWorkbenchStep` style resolvers; no shared typing; manual `router.replace` calls everywhere) — pattern doesn't scale to 5+ URL params v0.4 needs |
| cmdk / shadcn Command | `kbar`, `react-cmdk` | shadcn already provides the styled wrapper matching the existing dark HSL token system; kbar/react-cmdk would each ship their own styling surface |
| zustand for ⌘K state | Context + `useReducer` | Palette has only `{open, query, recentSessions}`; React Context is sufficient and avoids introducing the first global store mid-milestone |
| zustand for workbench | Per-step local state + URL | Same — workbench data is RSC-loaded per route; client state per step stays local; no cross-step sync needed |
| Virtualized list for long-text diff | `react-window` / `@tanstack/react-virtual` | Chapters are 10k characters not 10k items; the unit is paragraph (~50-200 per chapter), not "millions of rows" — virtualization is overkill. CSS `content-visibility: auto` covers it |

### Installation

```bash
npx shadcn@latest add command   # adds src/components/ui/command.tsx + cmdk dep
npm install nuqs                 # 2.8.9
```

That's it. No other deps required for the entire milestone.

---

## Package Legitimacy Audit

Verification via `npm view` performed 2026-05-26.

| Package | Registry | Age | Source repo | Disposition |
|---------|----------|-----|-------------|-------------|
| nuqs | npm | ~3 years (2.x stable) | [github.com/47ng/nuqs](https://github.com/47ng/nuqs) | Approved — [VERIFIED via official Next.js docs ecosystem + npm 2.8.9] |
| cmdk | npm | ~3 years | [github.com/pacocoursey/cmdk](https://github.com/pacocoursey/cmdk) | Approved — [VERIFIED: shadcn's `Command` is a direct wrapper] |
| use-debounce *(optional)* | npm | ~7 years (10.x current) | [github.com/xnimorz/use-debounce](https://github.com/xnimorz/use-debounce) | Optional — recommend hand-roll the 12-line hook instead, no install needed |

**No suspicious or hallucinated packages.** No postinstall scripts. All packages confirmed via authoritative sources (shadcn docs, nuqs.dev) AND npm registry.

---

## Architectural Decisions

### Decision 1 — ⌘K Command Palette Placement

**Recommended:** Mount inside `src/app/(app)/layout.tsx` as the **last child of the shell `<div>`**, before `<Toaster/>` semantics-wise. Wrap with a `CommandPaletteProvider` (React Context) **inside (app) layout, not RootLayout**.

**Why this tier (NOT RootLayout):**
- RootLayout is shared with `(auth)` routes (login/signup). Palette has no meaning before auth.
- (app) layout already has `user` from `safeGetUser`. Recent-sessions fetching needs RLS — happens server-side once, then served to client provider via initial prop.
- Sticky header in (app) layout already owns the focus zone; palette overlay co-locates with it.

**Route context source:** `usePathname()` from `next/navigation` inside the client palette component. Commands filter against current path (e.g., when at `/sessions/[id]/workbench/...`, surface "回到分析步骤" actions; when on `/dashboard`, surface "新建双书项目").

**Integration points (file paths):**
- **NEW** `src/components/command-palette/command-palette.tsx` — client component, contains the `<CommandDialog>`
- **NEW** `src/components/command-palette/command-palette-provider.tsx` — Context + `useEffect` for ⌘K / Ctrl+K global listener
- **NEW** `src/components/command-palette/use-recent-sessions.ts` — client hook, hydrates from initial prop, refetches on session-list mutations
- **NEW** `src/lib/commands/registry.ts` — pure data: `{id, label, kbd?, route?, group, when?: (ctx) => boolean}[]`. Routes derive from existing `APP_NAV_ITEMS` in `src/components/app-nav.tsx`
- **MODIFIED** `src/app/(app)/layout.tsx` — wrap `{children}` in `<CommandPaletteProvider initialRecentSessions={...}>`; fetch top 8 sessions server-side
- **MODIFIED** `src/components/sidebar.tsx` — add visible "⌘K" affordance under the brand block (do NOT add new icon; reuse `kbd` styling from app-nav)

**Data flow:**
```
(app)/layout.tsx (RSC)
  ├─ supabase.from('sessions').select('id,name,updated_at').limit(8)
  └─ <CommandPaletteProvider initialRecent={...}>
       └─ <CommandPalette> (client)
            ├─ useEffect ⇒ window.addEventListener('keydown', ⌘K)
            ├─ usePathname() ⇒ filters registry.commands.filter(c => c.when(pathname))
            └─ <CommandDialog> (shadcn) ⇒ CommandInput + CommandList + CommandGroup × N
                 └─ onSelect ⇒ router.push(cmd.route) OR cmd.action()
```

**Rejected alternative:** Mount in RootLayout with a "is-authenticated" branch.
**Rejected because:** Forces palette to be a client component owning auth state, which violates the established pattern of (app) layout being the auth gate.

---

### Decision 2 — Workbench Multi-Route Refactor

**Recommended:** Convert single `/sessions/[id]/workbench/page.tsx` into a route group with a shared layout, **one nested folder per step**, each step's `page.tsx` fetches **only its slice**.

**Target structure:**
```
src/app/(app)/sessions/[id]/workbench/
├── layout.tsx              # NEW — sticky stepper + PageHeader; loads minimal session row
├── page.tsx                # MODIFIED — redirect-to-recommended-step server component (3-5 lines)
├── upload/page.tsx         # NEW — fetches books only
├── analyze/page.tsx        # NEW — fetches books + chapters + briefs
├── blueprint/page.tsx      # NEW — fetches blueprint + booksLookup + chaptersLookup
├── generate/page.tsx       # NEW — fetches blueprint + variants
├── loading.tsx             # KEEP — current skeleton works as fallback
└── error.tsx               # KEEP
```

**Data co-location:**
- Split `loadDualSessionPageData()` in `src/app/(app)/sessions/[id]/page-data.ts` into **named slices**: `loadWorkbenchShell()`, `loadUploadStep()`, `loadAnalyzeStep()`, `loadBlueprintStep()`, `loadGenerateStep()`. Each composes the same Supabase client; selectors are server-only.
- **Each step page is an RSC** that calls its slice loader, then renders a single client component (`UploadStepClient`, `AnalyzeStepClient`, etc.) with focused props (≤6 each, not 14).
- The shared `layout.tsx` calls `loadWorkbenchShell()` for the session name + mode check + auth — duplicating this in each page would re-run the auth check 4×.

**Stepper state from URL:** The stepper component in `layout.tsx` reads `usePathname()` (client component) or accepts the active step as a prop derived from `headers().get('x-pathname')` middleware. **Simpler:** make stepper a small client component that calls `usePathname()` and matches against a static map. No nuqs needed for the stepper itself — the path IS the state.

**Gating (e.g., blueprint requires analysis done):** Each step's `page.tsx` does its own precondition check at the server boundary and `redirect()` if not met. Today's `isStepAllowed()` logic moves from client to server.

**Migration plan (file-by-file):**
1. Create `layout.tsx` with stepper extracted from `WorkbenchClient` (lines 689-694 + `getStageItems()` helpers move to `src/components/workbench/stepper.tsx`)
2. Create `upload/page.tsx`; extract `WorkbenchClient` lines 696-736 + `UploadBookCard` + `EmptySlot` into `src/components/workbench/upload-step-client.tsx`
3. Same for `analyze/page.tsx` (lines 738-788), `blueprint/page.tsx` (lines 790-855), `generate/page.tsx` (lines 857-922)
4. **Old `workbench-client.tsx` becomes the redirect page** at `workbench/page.tsx`: server-resolves recommended step (logic already exists), returns `redirect('/sessions/${id}/workbench/${step}')`
5. Add `?step=...` → path rewrite in `src/middleware.ts` for one milestone (backward-compat); remove after v0.5
6. Delete `WorkbenchClient` once all four step clients ship

**Target size:** Each of the 4 step clients ≤ 300 LOC (current largest section is `compare` at ~65 lines of JSX + shared helpers; well within budget).

**Rejected alternative:** Keep single page, decompose `WorkbenchClient` into 4 step components imported conditionally.
**Rejected because:** Doesn't solve URL state ("only one URL for four screens"), doesn't enable per-step `loading.tsx`, and re-renders the parent on every step switch when the data needed by other steps hasn't changed. Multi-route gives free per-step Suspense, free per-step loading skeleton, free deep-linking, free analytics page-event boundaries.

---

### Decision 3 — URL-as-State

**Recommended:** Adopt **nuqs 2.8.9** as the single library for typed URL state across the whole app — but only for **non-routing** params (panel toggles, diff tab selection, filter state). Step itself becomes a **path segment**, not a query param (see Decision 2).

**Where nuqs lives:**
- `NuqsAdapter` wraps `(app)/layout.tsx`'s children (NOT root layout — auth pages don't need it)
- Parsers shared between server and client via `src/lib/url-state/` parser modules:
  - `src/lib/url-state/blueprint-tab.ts` exports `parseAsStringLiteral([...sections])` for blueprint section tabs
  - `src/lib/url-state/diff-tab.ts` exports `parseAsStringLiteral(['meta','structure','paragraphs'])` for VariantComparison (today uses localStorage at `wb-diff-tab` — replace)
  - `src/lib/url-state/compare-ids.ts` exports `parseAsArrayOf(parseAsString)` for `/compare?ids=` selection

**Migration order:**
1. Install + add `NuqsAdapter` (no behavior change yet)
2. Replace `?step=...` resolver in `workbench/page.tsx` (becomes obsolete after Decision 2 ships, but until then nuqs typing still beats the manual `query.step === "upload" || ...` block)
3. Replace VariantComparison's localStorage tab with nuqs `useQueryState('diff', ...)`
4. New v0.4 panels use nuqs from day 1

**Rejected alternative:** Raw `useSearchParams` + `router.replace` as today.
**Rejected because:** The existing `resolveWorkbenchStep()` pattern (workbench/page.tsx:57-72) is a manual literal-union parser duplicated 3× across the codebase. Each new URL param means another bespoke resolver. Two URL params will mean racing `router.replace` calls (browsers rate-limit pushState/replaceState; nuqs throttles automatically).

---

### Decision 4 — Inline-Edit State Model

**Recommended:** **Per-card local draft state** + **debounced save (400 ms)** + **router.refresh on success** + **optimistic concurrency via `expectedUpdatedAt`** (already exists).

**Critical pre-step:** Fix the existing every-keystroke save in `BlueprintEditor.save()`. This is a prerequisite, not optional. Today, typing a 20-character character name fires 20× PATCH `/api/blueprint`.

**State layering (from inside out):**

```
BlueprintRow (e.g., CharacterCard, draft state lives here)
  └─ useState<CharacterRow>(props.row)             ← local typing state
  └─ useDebouncedCallback(commitChanges, 400)
       └─ onCommit(patch) ← bubbles to parent BlueprintEditor
            └─ setBp(next)                          ← editor's source of truth
            └─ save(next)                           ← API call with expectedUpdatedAt
                 ├─ ok ⇒ setBpUpdatedAt(j.updated_at) + router.refresh()
                 └─ 409 ⇒ ConflictGate modal (NEW)
```

**Why per-card local state, not RootForm Provider:**
- Different card types have totally different fields (CharacterRow has `traits: string[]`, RelationshipRow has `from/to/type`, ViewpointRow has `mode/pacing`). One react-hook-form schema would be a union-discriminator mess.
- Cards are independently added/deleted; react-hook-form expects a stable field tree.
- The blueprint already has a strong server-side schema (Zod `BlueprintSchema`). Client doesn't need a second one.

**Conflict resolution (NEW):**
- API returns 409 + current `updated_at` when `expectedUpdatedAt` mismatches
- Show a `ConflictGate` dialog: "蓝图在另一标签页被修改 · [查看远端] / [覆盖远端]"
- "查看远端" → `router.refresh()` (rehydrates from server, loses local draft)
- "覆盖远端" → re-PATCH with the new `expectedUpdatedAt`

**Integration points:**
- **NEW** `src/lib/hooks/use-debounced-callback.ts` — 12-line utility, see [§ Don't Hand-Roll](#dont-hand-roll-and-its-inversion)
- **NEW** `src/components/workbench/conflict-gate.tsx`
- **MODIFIED** `src/components/workbench/blueprint-editor.tsx`:
  - `save()` becomes `commitSave()`, called by debounced wrapper
  - `save()` handler reads response status; on 409 sets `conflictState`
- **MODIFIED** `src/components/workbench/blueprint-cards.tsx`:
  - Each `Card` receives `onChange` AND owns local draft via `useState`
  - On mount: `useEffect` resets draft when `props.row.id` changes (handles delete/add)
  - On blur/Enter: immediate commit (bypasses debounce timer)
- **MODIFIED** `src/app/api/blueprint/route.ts` (PATCH) — already supports `expectedUpdatedAt`; verify 409 response shape includes the current `updated_at` (probable; verify in implementation phase)

**Rejected alternative:** Single workbench-level reducer holding the full blueprint draft.
**Rejected because:** Re-renders every card on every keystroke; defeats the per-card boundary; and the existing code already passes immutable rows down — switching to a reducer changes too many call sites for marginal benefit.

---

### Decision 5 — SSE + Side-Pane Coexistence

**Recommended:** **Two separate state owners**, **no merged state machine**. Keep custom SSE (`consumeSseStream`); do NOT introduce `useChat`.

**Layout:**
```
GenerateStreamingPanel (NEW client component)
├── left: <StreamingOutline> (owns the SSE state)
│     ├── useRef<AbortController>
│     ├── useState<{state, partial, final, error}>
│     └── consumeSseStream(res.body, handler, signal)
└── right: <BlueprintReadOnlyPane> (owns its own RSC-loaded blueprint snapshot)
      └── Receives blueprint via props (no client refetch during stream)
```

**Why two owners (not one state machine):**
- The blueprint pane is **static** during a stream — it's a reference panel, not a live data source. Re-syncing it with the stream state would force re-renders 30-60×/sec.
- SSE state is **ephemeral** (partial JSON merging, abort, retry). Blueprint state is **persistent** (already saved, has `updated_at`).
- The existing `OutlineStreamer` is exactly this shape — extends it as the model.

**Cross-pane interaction:** None during stream. Once stream is `"done"`:
- `onComplete(variantId)` callback bubbles to parent
- Parent dispatches `router.refresh()` (rehydrates blueprint side too, in case server stored cross-effects)
- Parent routes to `/sessions/[id]/workbench/generate` to show the result variant

**Abort coordination:** Single `AbortController` per stream. Page navigation triggers `useEffect` cleanup → `controller.abort()`. Manual cancel button → same.

**Why not `useChat` from AI SDK:** `useChat` assumes a chat-shaped streaming protocol (message array with role/content). The existing server emits structured `event: partial` with arbitrary JSON shape (e.g., partial `Outline`). Switching to `useChat` would force a server-side rewrite and lose Zod-validated final payloads.

**Integration points:**
- **NEW** `src/components/workbench/generate-streaming-panel.tsx` — replaces the JSON-response `GenerateDrawer` for v0.4 generate step (drawer stays for v0.5 quick-actions)
- **NEW** `src/app/api/generate-v2/stream/route.ts` — companion streaming endpoint; wraps existing `generate-v2` logic in `sseResponse()` and emits `event: partial` at chapter boundaries
- **REUSE** `src/lib/streaming/sse-client.ts` (`consumeSseStream`)

**Rejected alternative:** Unified state machine (e.g., XState) controlling both panes.
**Rejected because:** No state actually shares between panes during the stream. Coordination is two events (stream-complete, stream-aborted) — `useState` + callback is sufficient. XState would add ~12kB for no behavior gain.

---

### Decision 6 — Long-Text Diff Rendering

**Recommended:** **Pre-compute LCS-tagged token spans on the server** (extend `src/lib/diff/variant-diff.ts`), **render with paragraph-level `<p>` wrappers and CSS `content-visibility: auto`** on each paragraph. NO virtualization library.

**Why not virtualize:**
- A 10k-character Chinese chapter is ~50-200 paragraphs.
- `react-window` virtualizes when item count exceeds the viewport by ~10× — 200 items is well within native scroll perf budget.
- Virtualization breaks `Ctrl+F` browser find, copy-paste of full text, and accessibility (screen readers stop at viewport boundary).

**Why CSS containment instead:**
- `content-visibility: auto` on each paragraph lets the browser skip layout/paint for off-screen paragraphs. Native, zero JS, no API surface. ([MDN: content-visibility](https://developer.mozilla.org/en-US/docs/Web/CSS/content-visibility))
- Pair with `contain-intrinsic-size: 0 80px` so reserved scroll height doesn't jump on scroll.

**Why pre-compute on server:**
- LCS is O(m·n); for two 10k-char chapters that's ~100M comparisons.
- Today's `diffParagraphs` already does this server-callable; just call it from the page-data loader and pass `{paragraphSpans, changeType}` already-tagged to the client.
- Client gets a list of `{paragraph: string, side: 'common'|'aOnly'|'bOnly'|'changed', spans?: TokenSpan[]}`; render is pure mapping.

**Sub-paragraph token highlighting (within-paragraph differences):**
- Extend `variant-diff.ts` with `diffTokensWithinParagraph(left: string, right: string): TokenSpan[]` using the same LCS but on characters (Chinese has no word boundaries; character-level LCS is the standard).
- Render each token span with a `<mark>` wrapper for added or `<del>` for removed.
- Run only for paragraphs marked `changed` (not for `common` or pure aOnly/bOnly).

**Integration points:**
- **MODIFIED** `src/lib/diff/variant-diff.ts` — add `diffTokensWithinParagraph()`, add `diffAlignedParagraphs()` that returns aligned pairs (current returns split arrays)
- **NEW** `src/lib/diff/variant-diff.test.ts` cases for character-level tokenization on Chinese
- **NEW** `src/components/sessions/variant-diff-prose.tsx` — long-form side-by-side render using the aligned pairs
- **MODIFIED** `src/components/sessions/variant-comparison.tsx` — add `"prose"` as a 4th `DiffTab` value (today: meta / structure / paragraphs)
- **NEW** Tailwind utility class for `.content-visibility-auto` in `src/app/globals.css`

**Rejected alternative:** IntersectionObserver-driven chunked rendering.
**Rejected because:** Reinvents what `content-visibility: auto` does natively; adds JS + render-thrashing under fast scroll.

**Rejected alternative:** `react-window` / `@tanstack/react-virtual`.
**Rejected because:** See above — wrong tool for paragraph counts at this scale; breaks browser-native text features.

---

### Decision 7 — Component Decomposition Seam

**Recommended seam:** **By FlowStep**, exactly as the discriminated union already encodes. Each step becomes a self-contained client component owning its local UI state, receiving server-loaded data as focused props.

**Concretely (from existing line ranges in `workbench-client.tsx`):**

| Current line range | Future home | Approx LOC | Notes |
|--------------------|-------------|-----------|-------|
| 1-118 (imports, types) | Split per step file | n/a | Types move to `src/lib/workbench/types.ts` (shared) |
| 135-310 (state setup, hint, stage items) | `layout.tsx` (stepper) + each step's local | — | Stepper item derivation is shared shell concern |
| 354-380 (`runChapter`) | `analyze-step-client.tsx` | ~30 | Used only by analysis step |
| 381-520 (batch + cost modal) | `analyze-step-client.tsx` | ~140 | All batch logic |
| 533-551 (`synthesizeBook`) | `analyze-step-client.tsx` | ~20 | |
| 553-586 (`navigateToStep`, `openGenerateDrawer`) | `layout.tsx` (nav) + `generate-step-client.tsx` (drawer trigger) | — | Nav goes away once routes split |
| 588-661 (`analysisGrid` JSX) | `analyze-step-client.tsx` | ~75 | |
| 696-736 (upload section) | `upload-step-client.tsx` | ~50 | |
| 738-788 (analysis section) | `analyze-step-client.tsx` JSX | ~55 | |
| 790-855 (compare/blueprint section) | `blueprint-step-client.tsx` | ~65 | |
| 857-922 (generate section) | `generate-step-client.tsx` | ~65 | |
| 924-948 (modals at root) | Each step's own client | ~25 | GenerateDrawer → generate step; CostEstimateModal → analyze step |
| 953-1403 (helpers: `resolveStep`, `isStepAllowed`, `getStageItems`, `StepIntro`, `StepActionBar`, `CollapsedChaptersBar`, `EmptySlot`, `UploadBookCard`, `AnalysisCapabilityPanel`) | `src/components/workbench/shared/` | n/a | Pure JSX components shared across step files |

**Shared hooks (NEW):**
- `useBlueprintSave(sessionId, blueprintId)` — encapsulates debounced PATCH + conflict
- `useBookChapterBatch(bookId)` — encapsulates the `BatchState` + AbortController lifecycle (lines 162, 410-516)
- `useChapterAnalysis(bookId, chapterId)` — wraps `runChapter` (lines 354-379)

These hooks live in `src/lib/hooks/` and are testable in isolation.

**Target sizes after split:**
- `upload-step-client.tsx` ≤ 200 LOC
- `analyze-step-client.tsx` ≤ 320 LOC (largest; batch logic dominates)
- `blueprint-step-client.tsx` ≤ 180 LOC
- `generate-step-client.tsx` ≤ 200 LOC
- `layout.tsx` ≤ 150 LOC (stepper + PageHeader + nav handler)

Sum ≈ 1,050 LOC vs. today's 1,403 — savings come from removing duplicated `PipelineBar` calls (today: 3 sites) and the `activeStep === X ? ... : null` branching.

**Rejected alternative:** Decompose by horizontal concern (a `WorkbenchSteps` component, a `WorkbenchData` component, a `WorkbenchModals` component).
**Rejected because:** Existing data flow is vertical (per step); horizontal slicing would force props back up to the parent for cross-cutting state that doesn't actually cross-cut.

---

### Decision 8 — Loading.tsx vs Per-Component Suspense

**Recommended:** **Route-level `loading.tsx` for every new step route** (first-paint skeleton) + **Per-component `<Suspense>` only inside streaming sub-trees** (e.g., recent-sessions in palette, async variant list inside generate step).

**Concrete plan:**

| Boundary | Type | Skeleton |
|----------|------|----------|
| `workbench/upload/loading.tsx` | NEW route-level | 2 book card skeletons |
| `workbench/analyze/loading.tsx` | NEW route-level | Pipeline bar + 2 chapter trees |
| `workbench/blueprint/loading.tsx` | NEW route-level | Tab bar + 3 card skeletons |
| `workbench/generate/loading.tsx` | NEW route-level | Variant card grid skeleton |
| `workbench/loading.tsx` (existing) | KEEP as fallback for redirect | already correct |
| `<Suspense fallback={<RecentSessionsSkeleton/>}>` around recent-sessions hydration in palette | NEW component-level | small list skeleton |
| `<Suspense>` around async streaming OutlinePane inside `generate-streaming-panel.tsx` | NEW component-level | streaming-aware "···" |

**Why this split:**
- Route-level `loading.tsx` is RSC-native and handles the initial server-render gap with zero client JS overhead. Use it as default.
- Per-component `<Suspense>` is for sub-trees that **deliberately stream** (RSC Suspense) or **client-side fetch on mount**. Don't add Suspense where `loading.tsx` already covers it — duplicates skeletons.

**Skeleton consistency:**
- Reuse `src/components/ui/skeleton.tsx` everywhere
- Match section heights to actual content height to avoid CLS
- Existing `workbench/loading.tsx` is a good model — clone its structure for the four new step skeletons

**Rejected alternative:** Single shared `<WorkbenchSkeleton step={...}>` rendered from one `loading.tsx`.
**Rejected because:** Each step is its own route; Next.js maps `loading.tsx` per route; per-step loading.tsx is the canonical pattern and gives different skeletons for free.

---

## Recommended Project Structure (Delta Only)

```
src/
├── app/
│   └── (app)/
│       ├── layout.tsx                  # MODIFIED — wrap children in CommandPaletteProvider + NuqsAdapter
│       └── sessions/[id]/workbench/
│           ├── layout.tsx              # NEW — stepper + PageHeader
│           ├── page.tsx                # MODIFIED — redirect-to-recommended-step
│           ├── upload/
│           │   ├── page.tsx            # NEW (RSC)
│           │   └── loading.tsx         # NEW
│           ├── analyze/
│           │   ├── page.tsx            # NEW (RSC)
│           │   └── loading.tsx         # NEW
│           ├── blueprint/
│           │   ├── page.tsx            # NEW (RSC)
│           │   └── loading.tsx         # NEW
│           └── generate/
│               ├── page.tsx            # NEW (RSC)
│               └── loading.tsx         # NEW
├── components/
│   ├── command-palette/                # NEW directory
│   │   ├── command-palette.tsx
│   │   ├── command-palette-provider.tsx
│   │   └── use-recent-sessions.ts
│   ├── ui/
│   │   └── command.tsx                 # NEW — shadcn add
│   └── workbench/
│       ├── stepper.tsx                 # NEW — extracted from workbench-client
│       ├── upload-step-client.tsx      # NEW
│       ├── analyze-step-client.tsx     # NEW
│       ├── blueprint-step-client.tsx   # NEW
│       ├── generate-step-client.tsx    # NEW
│       ├── generate-streaming-panel.tsx # NEW
│       ├── conflict-gate.tsx           # NEW
│       └── shared/                     # NEW directory
│           ├── step-intro.tsx
│           ├── step-action-bar.tsx
│           ├── collapsed-chapters-bar.tsx
│           ├── empty-slot.tsx
│           ├── upload-book-card.tsx
│           └── analysis-capability-panel.tsx
├── lib/
│   ├── commands/
│   │   └── registry.ts                 # NEW
│   ├── hooks/                          # NEW directory
│   │   ├── use-debounced-callback.ts
│   │   ├── use-blueprint-save.ts
│   │   ├── use-book-chapter-batch.ts
│   │   └── use-chapter-analysis.ts
│   ├── url-state/                      # NEW directory
│   │   ├── blueprint-tab.ts
│   │   ├── diff-tab.ts
│   │   └── compare-ids.ts
│   ├── diff/
│   │   └── variant-diff.ts             # MODIFIED — add diffTokensWithinParagraph + diffAlignedParagraphs
│   └── workbench/
│       └── types.ts                    # NEW — extract FlowStep, BookRow, etc.
└── components/sessions/
    ├── variant-comparison.tsx          # MODIFIED — add 'prose' tab + nuqs
    └── variant-diff-prose.tsx          # NEW — long-form diff render with content-visibility
```

### Structure rationale

- **`(app)/sessions/[id]/workbench/{step}/`:** Path segments mirror the user's mental model (4 steps = 4 URLs). Enables free deep-linking, per-step skeletons, and server-side gating.
- **`components/workbench/shared/`:** Pure presentational components shared across steps. No state. Easy to test in isolation.
- **`lib/hooks/`:** Custom hooks become unit-testable; today the equivalent logic is buried inside the 1,403-line client.
- **`lib/url-state/`:** Co-located parser definitions enable server-side type-safe reading via `nuqs/server`.
- **`lib/commands/`:** Command registry is data, not logic — keep it pure and import from anywhere.

---

## Data Flow

### Existing flow (preserved as-is)

```
Browser
  └─ fetch '/api/{analyze|blueprint|generate-v2}' (server actions or Route Handlers)
       └─ Supabase RLS query (auth from cookies via @supabase/ssr)
            └─ LLM call via getUserLLMClient → streamObject / generateObject
                 └─ JSON response OR SSE stream (sseResponse helper)
                      └─ Client: JSON → toast + router.refresh()
                              OR SSE → consumeSseStream → partial state
                                   → final → router.refresh()
```

### New flow — ⌘K palette

```
(app)/layout.tsx (RSC)
  └─ supabase.from('sessions').select(...).limit(8)
       └─ <CommandPaletteProvider initialRecent={...}> (client island)
            └─ window.addEventListener('keydown', '⌘K')
            └─ CommandDialog onSelect:
                 ├─ navigate route ⇒ router.push(cmd.route)
                 └─ run action ⇒ cmd.action(ctx)
```

### New flow — Workbench step navigation

```
URL change (Link click, palette nav, programmatic push)
  └─ Next.js routes to /sessions/[id]/workbench/{step}/page.tsx (RSC)
       └─ loadXxxStep(supabase, sessionId, userId)
            ├─ precondition check ⇒ redirect() if not met
            └─ render XxxStepClient with focused props
                 └─ XxxStepClient: pure client (local state for typing/UI only)
```

### New flow — Inline-edit save

```
User keystroke in CharacterCard
  └─ setLocalDraft(...)                    ← immediate, no network
       └─ debouncedCommit(localDraft)       ← scheduled +400ms
            └─ onCommit(patch) → BlueprintEditor.save
                 └─ PATCH /api/blueprint { sessionId, patch, expectedUpdatedAt }
                      ├─ 200 ⇒ setBpUpdatedAt + router.refresh
                      └─ 409 ⇒ ConflictGate
```

### New flow — Streaming dual-pane

```
User clicks "生成新版本"
  └─ POST /api/generate-v2/stream (NEW) → SSE
       └─ Server: streamObject → emit('partial', delta) per chunk
            └─ Client: consumeSseStream → setPartial
                 → live left pane re-renders (typewriter effect)
                 → right pane (blueprint read-only) untouched
       └─ Final emit('done', { variantId })
            └─ Client: router.push('/sessions/[id]/workbench/generate?focus=' + variantId)
```

---

## Component Inventory: New vs Modified

### NEW (29 files)

| Path | LOC budget | Purpose |
|------|-----------|---------|
| `src/components/command-palette/command-palette.tsx` | 120 | Dialog UI |
| `src/components/command-palette/command-palette-provider.tsx` | 60 | Context + global ⌘K listener |
| `src/components/command-palette/use-recent-sessions.ts` | 40 | Recent sessions hook |
| `src/components/ui/command.tsx` | shadcn-generated | cmdk primitives |
| `src/components/workbench/stepper.tsx` | 100 | Sticky stepper extracted from monolith |
| `src/components/workbench/upload-step-client.tsx` | 200 | Upload step |
| `src/components/workbench/analyze-step-client.tsx` | 320 | Analyze step |
| `src/components/workbench/blueprint-step-client.tsx` | 180 | Blueprint step |
| `src/components/workbench/generate-step-client.tsx` | 200 | Generate step |
| `src/components/workbench/generate-streaming-panel.tsx` | 220 | Streaming dual-pane |
| `src/components/workbench/conflict-gate.tsx` | 80 | 409 resolution UI |
| `src/components/workbench/shared/step-intro.tsx` | 30 | Shared (extracted) |
| `src/components/workbench/shared/step-action-bar.tsx` | 25 | Shared (extracted) |
| `src/components/workbench/shared/collapsed-chapters-bar.tsx` | 40 | Shared (extracted) |
| `src/components/workbench/shared/empty-slot.tsx` | 30 | Shared (extracted) |
| `src/components/workbench/shared/upload-book-card.tsx` | 50 | Shared (extracted) |
| `src/components/workbench/shared/analysis-capability-panel.tsx` | 40 | Shared (extracted) |
| `src/components/sessions/variant-diff-prose.tsx` | 180 | Long-form diff |
| `src/lib/commands/registry.ts` | 80 | Command catalog (data) |
| `src/lib/hooks/use-debounced-callback.ts` | 25 | Debounce primitive |
| `src/lib/hooks/use-blueprint-save.ts` | 60 | Save + conflict |
| `src/lib/hooks/use-book-chapter-batch.ts` | 100 | Batch state machine |
| `src/lib/hooks/use-chapter-analysis.ts` | 40 | Single chapter |
| `src/lib/url-state/blueprint-tab.ts` | 10 | nuqs parser |
| `src/lib/url-state/diff-tab.ts` | 10 | nuqs parser |
| `src/lib/url-state/compare-ids.ts` | 10 | nuqs parser |
| `src/lib/workbench/types.ts` | 50 | Extracted types |
| `src/app/(app)/sessions/[id]/workbench/layout.tsx` | 100 | Shell |
| `src/app/(app)/sessions/[id]/workbench/{upload,analyze,blueprint,generate}/{page,loading}.tsx` | 60 each (×8) | Step routes |
| `src/app/api/generate-v2/stream/route.ts` | 80 | Streaming endpoint |

### MODIFIED (8 files)

| Path | Change |
|------|--------|
| `src/app/layout.tsx` | No change (keep RootLayout minimal) |
| `src/app/(app)/layout.tsx` | Wrap children with `<NuqsAdapter><CommandPaletteProvider initialRecent={...}>`; fetch top 8 sessions |
| `src/app/(app)/sessions/[id]/workbench/page.tsx` | Becomes `redirect()` to recommended step; ~10 LOC |
| `src/app/(app)/sessions/[id]/page-data.ts` | Split into focused `load{Workbench,Upload,Analyze,Blueprint,Generate}Step()` |
| `src/components/sidebar.tsx` | Add visible `⌘K` affordance under brand |
| `src/components/workbench/blueprint-editor.tsx` | Replace `save()` with debounced commit; remove redundant tab state once nuqs takes over |
| `src/components/workbench/blueprint-cards.tsx` | Each card uses local draft + debounced onChange + blur-flush |
| `src/components/sessions/variant-comparison.tsx` | Replace localStorage tab with nuqs; add `prose` tab |
| `src/lib/diff/variant-diff.ts` | Add `diffTokensWithinParagraph`, `diffAlignedParagraphs` |

### DELETED (1 file, post-migration)

| Path | When |
|------|------|
| `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx` | After all 4 step clients are green |

---

## Build Order (Dependency Graph)

```
Wave 0 — Foundation (no user-visible change)
  ├─ [F1] Install nuqs + shadcn Command
  ├─ [F2] Add NuqsAdapter to (app)/layout.tsx
  ├─ [F3] Create src/lib/hooks/use-debounced-callback.ts + test
  └─ [F4] Extract src/lib/workbench/types.ts from workbench-client.tsx
            (no behavior change, types now importable)

Wave 1 — URL state utilities
  ├─ [U1] src/lib/url-state/{blueprint-tab,diff-tab,compare-ids}.ts
  ├─ [U2] Migrate VariantComparison localStorage tab → nuqs diff-tab
  └─ [U3] Migrate workbench/page.tsx step resolver → nuqs (transitional)
            ⇒ DEPENDS ON F1, F2

Wave 2 — Workbench multi-route split
  ├─ [W1] Create workbench/layout.tsx with stepper + extracted shared/
  ├─ [W2] Split page-data.ts into focused slice loaders
  ├─ [W3] Create upload/page.tsx + upload-step-client.tsx + loading.tsx
  ├─ [W4] Create analyze/page.tsx + analyze-step-client.tsx + loading.tsx
  │         + extract use-book-chapter-batch + use-chapter-analysis hooks
  ├─ [W5] Create blueprint/page.tsx + blueprint-step-client.tsx + loading.tsx
  ├─ [W6] Create generate/page.tsx + generate-step-client.tsx + loading.tsx
  ├─ [W7] Modify workbench/page.tsx to redirect-to-recommended-step
  └─ [W8] Delete workbench-client.tsx
            ⇒ DEPENDS ON F4, U3 (each step page can use nuqs cleanly)

Wave 3 — Inline-edit overhaul
  ├─ [E1] use-blueprint-save hook + debounced save + 409 handling
  ├─ [E2] Refactor blueprint-cards.tsx to per-card local draft + blur-flush
  ├─ [E3] Create conflict-gate.tsx
  └─ [E4] Add keyboard shortcuts inside cards (Enter to flush, Esc to revert)
            ⇒ DEPENDS ON W5 (blueprint-step-client.tsx is the new home)
            ⇒ DEPENDS ON F3 (debounce hook)

Wave 4 — Command palette
  ├─ [P1] src/lib/commands/registry.ts (static actions only)
  ├─ [P2] command-palette-provider.tsx + (app)/layout.tsx integration
  ├─ [P3] command-palette.tsx (cmdk dialog + filtering)
  ├─ [P4] use-recent-sessions.ts + hydrate from initial prop
  └─ [P5] Route-aware command filtering (usePathname)
            ⇒ DEPENDS ON W7 (palette commands reference new step routes)

Wave 5 — Streaming dual-pane
  ├─ [S1] /api/generate-v2/stream route handler with sseResponse
  ├─ [S2] generate-streaming-panel.tsx (extends OutlineStreamer model)
  └─ [S3] Replace GenerateDrawer trigger in generate-step-client.tsx
            ⇒ DEPENDS ON W6

Wave 6 — Long-text diff
  ├─ [D1] Extend variant-diff.ts: diffAlignedParagraphs + diffTokensWithinParagraph
  ├─ [D2] variant-diff-prose.tsx with content-visibility paragraphs
  ├─ [D3] Add 'prose' tab to VariantComparison via nuqs
  └─ [D4] Add .content-visibility-auto utility to globals.css
            ⇒ DEPENDS ON U2 (nuqs diff-tab)
            ⇒ INDEPENDENT of W2-W6 (can run parallel)
```

**Critical path:** F1 → F2 → U3 → W1-W8 → E1-E4. ~3 waves serial; everything else parallelizable.

**Phase mapping suggestion (for `/gsd-plan-phase`):**
- Phase 1: Wave 0 + Wave 1 (foundation)
- Phase 2: Wave 2 (workbench split — the big one)
- Phase 3: Wave 3 + Wave 4 (inline-edit + palette)
- Phase 4: Wave 5 + Wave 6 (streaming + diff, can parallel)
- Phase 5: Polish / token cleanup / verification

---

## Common Pitfalls (Specific to THIS Integration)

### Pitfall 1: Re-introducing every-keystroke save during inline-edit refactor

**What goes wrong:** Wave 3 looks like a cosmetic refactor; engineer copies the existing `onChange={(name) => onChange({ name })}` pattern from `blueprint-cards.tsx` and re-attaches it to the new local-draft model. Result: local typing is smooth, but commits still fire per keystroke because the debounce wraps the wrong layer.

**Why it happens:** The current code has the API call buried 4 indirection levels deep (`onChange` → parent `onChange` → `save` → `fetch`). Debounce must wrap the **outermost call** that performs network, not the innermost `onChange`.

**How to avoid:** Make `useBlueprintSave` the single owner of the network call. Local draft `onChange` only updates local state; debounced effect (or explicit `commit()` on blur/Enter) is the only thing that calls the hook's `save`. Write a test that types 10 characters and asserts only 1 PATCH was made.

### Pitfall 2: `expectedUpdatedAt` stale after `router.refresh()` race

**What goes wrong:** User types in card A → debounced save fires → server returns new `updated_at` → `router.refresh()` rehydrates the RSC tree → server data overwrites the client's `bpUpdatedAt` value → user types in card B → save uses stale `expectedUpdatedAt` from a hot reload race → 409.

**Why it happens:** Two sources of truth for `updated_at`: server-fetched prop + client-set state. Async refresh during local edits causes them to disagree.

**How to avoid:** Treat the client's `bpUpdatedAt` as the **authoritative** value during an editing session; only sync from props when `props.blueprintId` changes (different blueprint loaded). The existing `useEffect` at workbench-client.tsx:270-280 already does this; preserve it in the refactor.

### Pitfall 3: nuqs `shallow: true` (default) won't trigger RSC re-render

**What goes wrong:** Engineer migrates `?step=` to nuqs with default options. Step changes don't re-fetch page data because shallow routing doesn't re-run RSC.

**Why it happens:** nuqs default is `shallow: true` for performance (avoids unnecessary server roundtrips). But our case wants server work on every URL state change (re-load slice).

**How to avoid:** For URL params that should trigger RSC refresh (none in v0.4 if Decision 2 ships — step is a path segment, not a query), explicitly use `withOptions({ shallow: false, history: 'push' })`. For purely client-side params (diff tab, panel toggle), default `shallow: true` is correct.

### Pitfall 4: SSE stream abort without unmount cleanup

**What goes wrong:** User starts a generate stream, then navigates via ⌘K to another route. The fetch keeps streaming server-side (LLM tokens still billed); component unmounts but `consumeSseStream` was never aborted.

**Why it happens:** Existing `OutlineStreamer` does `abortRef.current?.abort()` in unmount effect (lines 25-29). The new streaming panel must replicate this exactly. Easy to miss in a copy-paste refactor.

**How to avoid:** Wrap the abort logic in a reusable hook (`useSseStream`) that returns `{state, start, abort}` and handles unmount cleanup internally. Don't let consumers manage AbortController directly.

### Pitfall 5: Command palette mounts on auth pages because of provider misplacement

**What goes wrong:** Engineer adds `<CommandPaletteProvider>` to `src/app/layout.tsx` (root) instead of `(app)/layout.tsx`. Login page suddenly has a non-functional ⌘K listener that captures the keystroke and shows an empty palette.

**Why it happens:** Provider placement is the kind of choice that "looks the same" at PR review. Root layout vs (app) layout is one line different.

**How to avoid:** Provider lives in (app) layout. Codify in the wave plan with explicit file: `src/app/(app)/layout.tsx`, NOT `src/app/layout.tsx`. Add a test that visits `/login` and asserts ⌘K does nothing.

### Pitfall 6: Per-step `loading.tsx` reuses skeleton that doesn't match actual content height

**What goes wrong:** Engineer clones existing `workbench/loading.tsx` (which mirrors the OLD all-in-one layout) into each step folder. Layout shift on hydration as the real content turns out to be a different height.

**How to avoid:** Each step's `loading.tsx` must render skeletons whose **collapsed heights match a real-data instance**. For analyze step: 2 chapter tree cards = 2 × ~600px. For blueprint step: tab bar (40px) + 3 card skeletons (~120px each) + bottom bar. Spec the heights in the plan; verify visually before merge.

### Pitfall 7: nuqs server-side parser mismatch with `parseAsStringLiteral`

**What goes wrong:** Server-side `parseAsStringLiteral(['meta','structure','paragraphs']).parseServerSide(searchParams.diff)` returns `null` for an unknown value, not the default. RSC sees `null`, picks default, but client picks up `null` from `useQueryState` and the two desync briefly until user interacts.

**How to avoid:** Always use `parseAsStringLiteral([...]).withDefault('structure')` for both sides. The `.withDefault()` ensures both server and client get the same fallback.

---

## Don't Hand-Roll (and its inversion)

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| Typed URL state | Per-component `URLSearchParams` parsers + `router.replace` calls | nuqs `useQueryState` / `parseAsStringLiteral` | Browser pushState rate-limit handling + type safety + server-shared parsers |
| Command palette overlay + fuzzy search | Custom Dialog + `Array.filter(...includes)` | shadcn `Command` (wraps cmdk) | Keyboard nav, focus management, accessibility, fuzzy ranking — all wrong if hand-rolled |
| LCS for diff | Re-implementing alignment | Existing `src/lib/diff/variant-diff.ts` extended | Already battle-tested in v0.3; add functions, don't replace |
| Long-list virtualization (paragraph diff) | `react-window` | Native `content-visibility: auto` | Right tool for paragraph counts (50-200), preserves browser text features |
| Form state across many fields | Custom reducer | `react-hook-form` (already in use for generate-drawer) | But: NOT for blueprint inline-edit (per Decision 4) |
| SSE protocol | Custom event framing | Existing `sseResponse` + `consumeSseStream` | Already standardized; switching to `useChat` would re-pivot the server |

### Don't Hand-Roll — INVERTED (DO hand-roll these)

| Problem | DO build (don't pull a lib) | Why |
|---------|-------------------------------|-----|
| Debounce hook | 12-line `useDebouncedCallback` in `src/lib/hooks/` | Trivial; adding `use-debounce@10` is one more dep for what's effectively `setTimeout` + cleanup |
| Command catalog | Plain `const COMMANDS: Command[] = [...]` data file | No registry library needed; this is a static array |
| Per-card local draft sync | `useState` + `useEffect` on `props.row.id` | One render-cycle pattern; no library |
| Conflict resolution UI | Shadcn `<Dialog>` + 2 buttons | Two-button modal isn't a library question |

---

## Integration Points (Summary Table)

| New feature | Attaches at file | Replaces/augments |
|-------------|------------------|--------------------|
| ⌘K palette | `src/app/(app)/layout.tsx` (provider) + `src/components/sidebar.tsx` (affordance) | NEW capability; no replacement |
| Workbench multi-route | `src/app/(app)/sessions/[id]/workbench/` (whole folder restructured) | Replaces single-page `workbench/page.tsx` + `workbench-client.tsx` |
| nuqs URL state | `src/app/(app)/layout.tsx` (adapter) + parser modules in `src/lib/url-state/` | Replaces ad-hoc `resolveWorkbenchStep`, `wb-diff-tab` localStorage |
| Inline-edit | `src/components/workbench/blueprint-cards.tsx` + `blueprint-editor.tsx` + `src/lib/hooks/use-blueprint-save.ts` | Fixes existing every-keystroke save bug |
| Streaming dual-pane | `src/components/workbench/generate-streaming-panel.tsx` + `src/app/api/generate-v2/stream/route.ts` | Replaces JSON-response generate flow (drawer kept for v0.5) |
| Long-text diff | `src/lib/diff/variant-diff.ts` (extended) + `src/components/sessions/variant-diff-prose.tsx` | Augments existing 3-tab VariantComparison (adds 4th tab) |
| Component decomposition | `src/components/workbench/{step}-step-client.tsx` × 4 + `shared/` | Decomposes existing 1,403-line file |
| Skeleton boundaries | `src/app/(app)/sessions/[id]/workbench/{upload,analyze,blueprint,generate}/loading.tsx` | NEW per-step; existing one becomes redirect fallback |

---

## Scaling Considerations (Realistic for This App)

| Scale | Architecture adjustments |
|-------|--------------------------|
| Current (single-developer, ~100 sessions/user) | Decisions above are sufficient. No bottleneck. |
| 1k active users | First bottleneck: per-keystroke PATCH if Pitfall 1 leaks. Debounce + batching covers it. Server-side: Supabase connection pool may need tuning if blueprint saves exceed ~50/sec. |
| 100k active users | Consider: (a) optimistic UI hints (don't wait for server `updated_at`); (b) move LCS diff to a Web Worker for 30k+ char chapters; (c) palette recent-sessions cache via SWR pattern. Not v0.4 concerns. |

**First bottleneck specifically:** The blueprint save endpoint. If Wave 3 lands without debounce, even single-user typing storms it. Verify with browser DevTools Network tab: typing "张三李四" in a character name should show **1** PATCH, not 4.

---

## Open Questions

1. **Should ⌘K command "navigate to step X" force-validate the precondition (e.g., can't jump to blueprint if analysis not done)?**
   - What we know: today's `navigateToStep` (workbench-client.tsx:553) does this check client-side.
   - What's unclear: with multi-route, server `redirect()` handles invalid jumps. But the palette could pre-filter to avoid the user even seeing a step they can't enter.
   - Recommendation: Pre-filter in command registry's `when:` predicate using a context object passed from the provider. Implement in Wave 4.

2. **Does `/api/generate-v2/stream` need to share business logic with the existing JSON `/api/generate-v2`?**
   - What we know: both produce a variant row.
   - What's unclear: whether to extract a shared core function or duplicate.
   - Recommendation: Extract `runGeneration(blueprintId, config, emit?: (delta) => void)` from current generate-v2; both endpoints call it. `emit` is optional; absent → JSON response; present → streamed.

3. **Should the conflict-gate "覆盖远端" path also offer a 3-way merge?**
   - What we know: Today there's no conflict UI at all (just a toast).
   - What's unclear: Whether owner UAT will demand merge semantics for blueprint conflicts.
   - Recommendation: Ship 2-button (查看远端 / 覆盖远端) in Wave 3; merge is v0.5 if requested.

---

## Sources

### Primary (HIGH confidence)
- Existing codebase — every file path cited above was read in this session (workbench-client.tsx, blueprint-editor.tsx, blueprint-cards.tsx, sse.ts, variant-diff.ts, layout.tsx ×2, page.tsx, page-data.ts, app-nav.tsx, sidebar.tsx, generate-drawer.tsx, outline-streamer.tsx, variant-comparison.tsx, variant-diff-paragraphs.tsx, package.json)
- npm registry verification for `nuqs@2.8.9` and `cmdk@1.1.1` via `npm view`

### Secondary (MEDIUM-HIGH confidence)
- [nuqs.dev official documentation](https://nuqs.dev/) — Next.js 15 App Router integration, `parseAsStringLiteral`, `useQueryStates`, `shallow: false` behavior
- [shadcn/ui Command docs](https://ui.shadcn.com/docs/components/command) — Command component install + cmdk wrapping
- [MDN: content-visibility](https://developer.mozilla.org/en-US/docs/Web/CSS/content-visibility) — native off-screen layout skipping

### Tertiary (background)
- [LogRocket: Managing search parameters in Next.js with nuqs](https://blog.logrocket.com/managing-search-parameters-next-js-nuqs/)
- [ShadcnStudio: ⌘K Command Menu in 8 Steps](https://shadcnstudio.com/blog/shadcn-kbd-ui-component)

---

## Metadata

**Confidence breakdown:**
- Existing system facts: HIGH — every claim grounded in a file path that was actually read
- Library choices (nuqs, cmdk): HIGH — official docs + npm registry verification
- Decomposition seam: HIGH — line-range mapped from the actual 1,403-line file
- Build order: HIGH — dependency graph derives from explicit file-level dependencies
- Performance assumptions (content-visibility for 200 paragraphs): MEDIUM — based on browser-native behavior, not measured on this app's specific content
- Conflict resolution UX: MEDIUM — recommendation is conservative (2-button); 3-way merge deferred until requested

**Research date:** 2026-05-26
**Valid until:** 2026-08-26 (3 months — stack is stable; revisit if Next.js 16 ships)

**File:** D:/workflow-agent/.planning/research/ARCHITECTURE.md
