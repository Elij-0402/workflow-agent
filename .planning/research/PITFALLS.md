# Pitfalls Research — v0.4 UX Foundation

**Domain:** Brownfield UX upgrade on Next.js 15 dual-book SaaS (⌘K palette, workbench multi-route split, inline blueprint editing, streaming dual-pane Studio + CJK diff, design-token completeness, single-book removal)
**Researched:** 2026-05-26
**Confidence:** HIGH for known-debt + framework traps; MEDIUM for CJK-diff perf cliffs and IME composition (training-data-derived, not benchmarked in repo)

## Scope reminder

These pitfalls are scoped to **adding v0.4 UX features on top of the existing v0.3 system**:

- `workbench-client.tsx` is **1403 lines** [VERIFIED: `wc -l`], not 1361 — debt grew, refactor risk is higher than the v0.3 retrospective claimed.
- Existing `tests/e2e/smoke.spec.ts` already targets workbench heading + drawer-double-click `生成新版本` flow [VERIFIED: smoke.spec.ts L233–248]. Any refactor that changes selectors breaks the SSOT.
- `text-[Npx]` violation count across `src/app` is **99 occurrences in 16 files** [VERIFIED: ripgrep], not 63. Counting only legacy P0 routes hides the real cleanup surface.
- Existing parallel APIs: `api/generate-v2/route.ts` is current, legacy `generate` is in `CNV-01` debt → deferred-v2.
- Existing CTA SSOT: `src/lib/ui/cta-copy.ts` + `cta-copy.test.ts` already locked. Any new CTA must register there or break the test.
- Dark-only `UI-SPEC` is approved (AUD-03, IA-01). All new palette / inline-edit / skeleton work must conform; no light-mode escape valve.

---

## Critical Pitfalls

### Pitfall 1: ⌘K palette focus trap leaks to underlying page

**Severity:** Critical
**Phase:** Phase 1 (IA / command palette)

**What goes wrong:** Palette opens but Tab cycles out into the workbench beneath, screen readers still announce the now-inert background, and Esc closes the dialog but leaves focus on `<body>` instead of the trigger element. Power users on Macs press ⌘K mid-edit inside a blueprint card; if the palette steals focus without inert-ing background and restoring on close, they lose draft cursor position.

**Why it happens:** Most teams reach for a custom `<div role="dialog">` instead of a proven primitive. `cmdk` (the Linear/Vercel-style library) is **not** an accessible dialog by itself — it's a combobox. It must be mounted **inside** a Radix `Dialog` (or shadcn's `DialogPrimitive.Root`) so the dialog handles focus trap, scroll lock, `aria-modal`, and Esc-to-close. Skipping the dialog wrapper is the single most common cmdk regression.

**How to avoid:**
- Use shadcn's `<CommandDialog>` (cmdk inside Radix Dialog) rather than rolling `<Command>` standalone.
- Wire `aria-activedescendant` from input → highlighted item (cmdk does this; verify it isn't overridden).
- On close, restore focus to the element that opened the palette (Radix does this if the trigger uses `<DialogTrigger>`; manual openers must store and restore `document.activeElement`).
- Set `role="combobox"` on the input, `role="listbox"` on the list, `role="option"` on each item — cmdk handles this; do not add competing ARIA on parent divs.
- Mount the palette **once** at the app shell level, not inside route components, to avoid double-mount on navigation.

**Warning signs:**
- Tab key escapes the palette to the page underneath.
- VoiceOver / NVDA announces both palette options and underlying page headings.
- Esc closes palette but next Tab lands somewhere unexpected (top of page).
- Storybook a11y addon (or axe-core) flags `aria-modal` missing.

---

### Pitfall 2: ⌘K conflicts with browser / DevTools / OS shortcuts on Windows + Chinese IME

**Severity:** High
**Phase:** Phase 1

**What goes wrong:**
- On Windows, **Ctrl+K** is the browser address-bar search shortcut in Chrome/Edge — hijacking it without confirming key works mid-page costs users their browser muscle memory.
- **Cmd+K** on macOS Safari opens link-clear in some contexts; on Chrome it focuses address bar.
- Next.js Devtools (Next 15) binds `N` key for the dev overlay; nothing collides with ⌘K, but blanket `keydown` listeners can swallow it.
- A user composing Chinese (Pinyin IME) presses K to select a candidate; if your global listener doesn't check `event.isComposing` / `event.keyCode === 229`, palette opens mid-composition and corrupts input.

**How to avoid:**
- Register the shortcut with `event.metaKey || event.ctrlKey` AND `event.key === "k"` AND `!event.isComposing` AND `event.keyCode !== 229`. The 229 check is required because some IMEs synthesize a "fake" keydown with key=229 instead of setting `isComposing`.
- Call `event.preventDefault()` only after the check — don't preempt browser behavior universally.
- Document the shortcut in the palette itself ("⌘K to open" / "Ctrl+K to open") so users learn it.
- Provide an alternative trigger (visible search button in the shell header) — keyboard is not the only entry.
- Do not also bind `/` for palette; Slack/GitHub use `/`, but it conflicts with Chinese punctuation `、` IME flows. Stick to ⌘K.

**Warning signs:**
- QA reports "palette opened while I was typing 看 (kàn) in Pinyin".
- Browser address bar no longer responds to Ctrl+K on this site.
- Palette opens during dev overlay shortcut presses.

---

### Pitfall 3: Palette state survives navigation (or doesn't, but should)

**Severity:** Medium
**Phase:** Phase 1

**What goes wrong:** User opens palette, types `蓝图`, clicks a result → navigates to `/sessions/[id]/workbench`. On the new route, palette is still open (mounted at root, not closed on route change). Or the inverse: user closes palette, refreshes, search history is gone but they expected recent commands to persist.

**Why it happens:** Mounting the palette in the root layout means Next.js App Router does **not** unmount it across client navigations. State (open/closed, search query, selected index) is local React state by default, so it persists. Conversely, hooking palette state into the URL via `useSearchParams` creates SSR flicker.

**How to avoid:**
- Subscribe to `usePathname()` in the palette component and close on path change via `useEffect`.
- Persist **recent commands** in `localStorage`, not URL — this is per-user, not shareable state.
- Do not persist `open` state across reloads. Always boot closed.
- Do not put palette query in the URL — query is ephemeral, palette is a tool not a destination.

**Warning signs:** Palette visible after navigation; recent commands lost on tab close; refresh during palette open re-opens it (bad UX).

---

### Pitfall 4: Workbench multi-route split silently regresses confirm-gate / generate-block toast

**Severity:** Critical
**Phase:** Phase 2 (workbench multi-route split)

**What goes wrong:** Splitting the 1403-line `workbench-client.tsx` into per-step route segments (`/workbench/analysis`, `/workbench/compare`, `/workbench/generate`) accidentally drops the `blueprintReadyToConfirm` check from the compare step, or breaks the toast `请先确认蓝图 — 前往对比蓝图步骤` SSOT in `derive-hint.ts`. UAT scenario #6 ("Generate before confirm blocked") fails silently because the toast string is now hard-coded in the new generate route, drifting from `CTA_COPY`.

**Why it happens:** 1403 lines of code contains cross-cutting derived state — `blueprintReadyToConfirm`, `derive-hint`, `cta-copy`, dimension status — that's currently colocated. Splitting routes means you must extract this into shared hooks/server functions. Refactors under time pressure copy-paste the toast/check inline "just to ship the route" and the SSOT drifts.

**How to avoid:**
- **Before refactor:** extract `useBlueprintGate()` and `useGenerateBlock()` custom hooks from `workbench-client.tsx` as a no-route-change refactor. Land that first. Then split routes that consume the hooks. Two PRs, not one.
- Add a unit test that asserts the gate hook returns expected toast strings from `CTA_COPY` SSOT — fails if the new route hard-codes a string.
- Keep `tests/e2e/smoke.spec.ts` selectors **stable** through the refactor: the smoke spec already targets `getByRole("heading", { name: "拆解章节" })`, `前往对比`, `前往生成`, `生成新版本`. New routes must preserve these exact strings in the same DOM order.
- Run the existing 11/11 UAT script (`05-UAT.md`) after each route extraction, not just at the end.

**Warning signs:**
- Diff shows a Chinese toast string appearing in a new route file (should always come from `CTA_COPY` / `derive-hint`).
- `cta-copy.test.ts` still passes but UI shows divergent label (means the new route is bypassing the SSOT).
- Playwright smoke fails on `getByRole("heading", { name: "整理融合蓝图" })` — the heading was moved into a deeper component.

---

### Pitfall 5: Lost local state across route boundaries during workbench split

**Severity:** High
**Phase:** Phase 2

**What goes wrong:** User edits in analysis step, navigates to compare step via `前往对比`, comes back — unsaved local state (selected chapter, batch-analyze progress, draft blueprint patch) is gone because each route is a separate React tree with its own state.

**Why it happens:** Currently `workbench-client.tsx` is one big client component; all `useState` lives in one tree. Splitting into routes means each route remounts on navigation, dropping in-memory state. Server state (Supabase queries) is fine if cached via `react-query`/SWR or refetched; **client-only ephemeral state is the failure mode.**

**How to avoid:**
- Audit `workbench-client.tsx` before splitting: list every `useState` and decide for each — does it belong on the server (Supabase persisted), in URL search params (shareable/back-button-recoverable), or in `sessionStorage` (truly ephemeral)?
- Use URL search params for: selected chapter ID, current step, blueprint draft section. These are the natural shareable units.
- Use `sessionStorage` only for: streaming buffers, optimistic UI flickers, batch-analyze progress that shouldn't survive a tab close.
- Do **not** introduce Redux / Zustand "to fix the refactor". The existing code base avoids them; adding a global store hides the audit you need to do.

**Warning signs:** UAT tester reports "I clicked compare, came back, my selected chapter reset". DevTools shows route-level state unmounting on navigation.

---

### Pitfall 6: URL-as-state collides with existing search params and breaks back-button

**Severity:** High
**Phase:** Phase 2 (workbench split → URL state) and Phase 1 (palette deep-links)

**What goes wrong:**
- v0.3 introduced `?view=overview` to avoid redirect loops on `/sessions/[id]` (per `03-CONTEXT.md` D-01). Adding `?step=compare&chapter=3` for the workbench split risks collision: what does `/sessions/[id]?view=overview&step=compare` mean?
- Back button: user clicks blueprint card → URL becomes `?card=12&edit=true`. Browser back button goes one card edit at a time instead of one logical step. Or worse, doesn't change URL at all because the change was done via component state.
- External links break: someone shared `/sessions/[id]/workbench?step=2` in v0.3 (or has it in browser history); v0.4 renames `step` → `tab`. Old link 404s or shows blank.
- Search-param explosion: 8+ params on workbench URL is unreadable and unbookmarkable.

**How to avoid:**
- **One namespace per concern:** `view=` for overview/workbench/compare; `step=` only for workbench step; `chapter=` only inside analysis. Document the namespace in a README near the route.
- Compatibility shims: when renaming a param, accept the old name in the route handler and rewrite (`?step=2` → `?tab=compare`) with a 301 from a middleware redirect. Keep the shim for at least one milestone.
- **Server-side defaults** so `/sessions/[id]/workbench` (no params) renders the right initial step. Don't require params for first load.
- Avoid storing UI affordances (which accordion open, which tooltip showing) in URL — only **resumable navigation state**.
- Test back-button explicitly in UAT: open workbench, click 前往对比, click back → must land on analysis, not on sessions list.

**Warning signs:**
- `useSearchParams()` chains are 3+ params deep.
- Same logical state is read in two places (component `useState` AND URL) — choose one.
- Back button surprises owner during UAT.
- `tests/e2e/smoke.spec.ts` starts depending on specific search param order.

---

### Pitfall 7: SSR / CSR hydration mismatch from `useSearchParams` and `useTheme`

**Severity:** High
**Phase:** Phase 2 (URL state) and Phase 5 (token unification, dark-only enforcement)

**What goes wrong:** Server renders workbench with `step=analysis` from URL; client hydrates and reads `step=analysis` from `useSearchParams()` (which only works in client components). If the server component path also tries to derive UI from search params, the React tree mismatches between server HTML and client render → console error, momentary flash of wrong step, then re-render.

For dark-only: shadcn's `next-themes` returns `undefined` on first server render, then resolves to `dark` on client. If you render any conditional like `theme === "dark" ? <X /> : <Y />` at top level, SSR shows `<Y />`, hydration shows `<X />`, hydration mismatch warning fires.

**Why it happens:** Next.js 15 App Router strict-tracks Server vs Client component boundaries, and search params + theme are inherently client-only **on first load**. Mixing them with `<Suspense>` boundaries incorrectly causes either hydration errors or unintentional client-side waterfalls.

**How to avoid:**
- For URL state in Next.js 15: pass `searchParams` as a **prop from server page** to child server components; only use `useSearchParams()` in components marked `"use client"`. Reference: Next.js App Router docs (App Router > Server Components > searchParams prop).
- For theme: since this app is **dark-only** post-v0.3, don't conditional-render on theme at all. Hard-code dark classes; remove `next-themes` if it's not actively serving light-mode. If kept for future light support, render the same DOM in both and switch only via CSS classes (already on `<html>` element).
- Wrap any client component that reads `useSearchParams()` in `<Suspense>` — Next 15 errors at build if you don't.
- Run `npm run build` locally during phase work; hydration mismatches surface as build warnings.

**Warning signs:**
- Console warning "Hydration failed because the initial UI does not match what was rendered on the server".
- Flash of un-themed content on first paint.
- `npm run build` fails on a route that worked in `npm run dev`.

---

### Pitfall 8: contentEditable / Tiptap IME composition swallows Chinese input

**Severity:** Critical
**Phase:** Phase 3 (inline blueprint editing)

**What goes wrong:** User opens blueprint card, focuses the inline editor, types Pinyin `xiaoshuo` to compose 小说. The editor's `onChange` fires on every IME intermediate character (`x`, `xi`, `xia`, …), each firing an optimistic Supabase patch. By the time the user selects the candidate 小说, several characters of garbage have been saved. Worse, if your save logic does string-based diff and re-renders the editor, IME composition is torn down mid-input and the candidate window closes.

**Why it happens:** `contentEditable` and rich-text editors built on it (Tiptap, ProseMirror, Slate) fire input events during IME composition unless explicitly gated. ProseMirror handles this **correctly** by default; raw `contentEditable` does not. Custom React handlers (`onInput`, `onChange`) often re-render synchronously and break composition. This is the #1 reason CJK users hate Notion-clones built quickly.

**How to avoid:**
- **Use Tiptap (or ProseMirror directly)** for inline edit — never raw `contentEditable={true}`. Tiptap's `EditorContent` has IME composition handling built in. Reference: ProseMirror IME guide.
- Gate any custom `onInput` / `onKeyDown` with `if (event.nativeEvent.isComposing) return;`. The keyCode-229 fallback applies here too.
- Debounce optimistic save to **at least 300ms after composition end** (`compositionend` event), not after every keystroke.
- Never re-render the editor's DOM during composition. If a parent state change would cause re-render, defer it until `compositionend` via a flag.
- Test with Pinyin IME on Windows (Microsoft Pinyin) + macOS (built-in Pinyin) + an actual user typing 你好世界 — automated tests can't catch IME bugs.

**Warning signs:**
- Pinyin candidate window flickers or closes mid-input.
- Supabase patch logs show partial garbage strings (`x`, `xi`, `xia`).
- Bug report: "It deleted my character when I selected from the candidate list".

---

### Pitfall 9: Inline-edit draft loss on navigation / page close

**Severity:** High
**Phase:** Phase 3

**What goes wrong:** User edits a blueprint card, types two sentences, accidentally clicks `前往生成` or closes the tab. No autosave, no "are you sure?" prompt, no draft restoration on return. Two minutes of work gone — exact scenario that makes users distrust the product.

**Why it happens:** Optimistic UI feels "saved" but is in-memory only. Browser `beforeunload` won't fire on SPA navigation (only true tab close). Next.js App Router navigation is a JS-side route change; standard `beforeunload` doesn't catch it.

**How to avoid:**
- Autosave every **2 seconds** of idle (or after `compositionend`) to Supabase via the existing blueprint patch endpoint — already exists per v0.3 confirm-gate flow.
- For unsaved-by-design states, write draft to `sessionStorage` keyed by `sessionId + cardId + userId` and restore on next mount of the same card.
- Hook `useEffect` cleanup + Next.js `useRouter.events` (or App Router equivalent: a custom `<NavigationGuard>` that intercepts link clicks) to warn before nav with `confirm()` only if dirty.
- Real `beforeunload` for tab close — but use `event.preventDefault()` + `event.returnValue = ""` only when actually dirty.

**Warning signs:** UAT tester says "I lost my edits when I clicked compare". DevTools network tab shows no PATCH for several seconds after typing.

---

### Pitfall 10: Optimistic update race conditions vs Supabase real-time

**Severity:** High
**Phase:** Phase 3

**What goes wrong:** User edits card A optimistically (UI updates instantly), PATCH to Supabase pending. Meanwhile, a Supabase realtime subscription (if enabled) pushes the **stale** server version back. UI flickers from new value → old value → new value as the PATCH eventually completes. Or worse, two simultaneous PATCHes race: Edit-A finishes first, Edit-B was sent later but server applied A's full row over B's partial → B is lost.

**Why it happens:** Optimistic UI is intentionally lying to the user — the lie must be reconciled in a specific order. Naive React state updates plus a realtime channel cause "last write wins" UI loops.

**How to avoid:**
- Use a single source of truth per row: either React Query/SWR cache OR Supabase realtime, not both. The existing repo doesn't subscribe to realtime; **don't introduce it for v0.4** — it adds a brownfield risk for marginal benefit.
- PATCH semantics: send only the changed fields (`{ summary: "new" }`), not the full row, so concurrent edits on different fields don't clobber each other. Confirm the existing API accepts partial PATCH; if it accepts only `PUT { full row }`, fix at API level first.
- After PATCH responds, reconcile: if server returns different value than optimistic, show a subtle "synced" indicator and update silently. Don't yank focus.
- Disable optimistic UI on slow connection (`navigator.connection?.effectiveType === "slow-2g"`) — show a spinner instead.

**Warning signs:** UI shows old value briefly after edit. Two rapid edits result in one disappearing. Network tab shows PATCH 200 but next GET returns the optimistic value.

---

### Pitfall 11: Streaming dual-pane layout thrash as tokens arrive

**Severity:** High
**Phase:** Phase 4 (Studio streaming dual-pane + inline diff)

**What goes wrong:** Left pane is the source chapter (stable), right pane streams the generated variant. As tokens arrive via AI SDK SSE, the variant pane height grows; if the layout is `flex` row with `align-items: stretch`, the left pane re-flows to match, scrollbars appear/disappear, the user's scroll position resets to top because the document height changed.

**Why it happens:** Default flex behavior re-balances heights on content change. Browsers re-layout the whole flex container on each token arrival (default React re-render rate during streaming is fast — 60fps if not throttled).

**How to avoid:**
- Use `grid-template-columns: 1fr 1fr` + `grid-template-rows: auto` and pin the container height (`h-[calc(100vh-12rem)]` or similar) so neither pane drives container size.
- Each pane gets `overflow-y: auto` independently. They scroll separately.
- Throttle token-driven React state updates to **animation frame** (`requestAnimationFrame` batching, or AI SDK's built-in `experimental_throttle`) — don't re-render on every chunk. Target ~30fps for streaming text, not 60.
- Maintain scroll-anchor: if user has scrolled to bottom of variant pane, auto-stick to bottom as tokens arrive. If they've scrolled up to read, **don't** auto-scroll — they're reading old content.
- Use CSS `scroll-behavior: smooth` only on explicit user scroll, not on programmatic auto-stick.

**Warning signs:** Page reflows visibly mid-stream. Scrollbars appear/disappear. User scroll position jumps. CPU profiler shows React rendering 60+ times per second during stream.

---

### Pitfall 12: Cost meter desync with stream + abort UX gaps

**Severity:** Medium
**Phase:** Phase 4

**What goes wrong:** Cost meter ticks up based on token-count-so-far (client-side estimate). User clicks abort. Server-side billing finalizes based on actual tokens billed (which includes a few extra after abort signal). Meter shows ¥0.0234, server bill shows ¥0.0241 — distrust.

Worse: abort button shows "Cancelling…" but the SSE stream keeps flowing for 2 seconds because the client doesn't actually close the connection — it just stops rendering. User sees frozen UI.

**Why it happens:** AI SDK exposes `stop()` on the stream, but if abort isn't propagated to the underlying `fetch` AbortController, the connection stays open. Cost estimates client-side use a tokenizer that's not byte-exact with the upstream provider's billing.

**How to avoid:**
- Show cost meter as **estimate** with a tooltip: "Final cost will be confirmed when generation completes or is cancelled". Don't show exact decimals during stream — round to ¥0.01.
- Wire abort properly: AI SDK's `useChat`/`useCompletion` has a `stop()` method — confirm it triggers `AbortController.abort()` on the underlying fetch. Look at AI SDK Source for `streamText` to confirm. If using custom SSE: pass `signal` to `fetch`, call `controller.abort()` on stop click, and have the server route handle `req.signal` to short-circuit.
- After abort: refetch the final cost from server (single GET) before displaying final number. Show "Cancelled — final cost ¥X.XX" not "Cost ¥X.XX (cancelled)".
- Make abort button visible **only during streaming**, not after — prevents confused clicks on completed content.

**Warning signs:** Bill on Supabase doesn't match what user saw. Abort button shows but doesn't stop tokens immediately. Cost meter still increases after abort click.

---

### Pitfall 13: Inline diff renders catastrophically slow on 10k+ Chinese characters

**Severity:** Critical (for CJK)
**Phase:** Phase 4 (Studio diff direct render — replacing legacy variant diff)

**What goes wrong:** A typical chapter is 3,000–10,000 Chinese characters. Three layers of diff (source / blueprint / variant) means up to 30,000 characters rendered with per-character or per-word color spans. Most diff libraries (diff, jsdiff, diff-match-patch) break on whitespace + word boundaries — but **Chinese has no spaces**. Default tokenization treats the entire chapter as one "word", producing useless full-document diffs, or — if char-level — generates 30k DOM nodes that freeze the main thread for 5+ seconds.

**Why it happens:**
- jsdiff defaults: `diffWords` uses regex `/\s+/` for tokenization → fails on CJK.
- `diffChars` works for CJK but produces O(N) DOM elements; 30k is too many.
- React renders all 30k spans synchronously by default; no virtualization unless you add it.
- Color contrast in dark mode: `green-500` background on dark gray text may fail WCAG AA contrast at the character level.

**How to avoid:**
- **Tokenize on CJK boundaries before diffing.** Use Intl.Segmenter (`new Intl.Segmenter("zh", { granularity: "word" })`) — built into modern Node and browsers; segments Chinese into meaningful word units. Then diff segments, not characters. Reference: MDN Intl.Segmenter.
- For three-way diff, consider `diff-match-patch` (Google's library) which has better performance on long strings than jsdiff. Verify it handles CJK with proper tokenization.
- Virtualize the rendered diff: use `react-window` or `@tanstack/react-virtual` for the diff output if it exceeds ~500 segments. Render only the viewport + a buffer.
- Pre-compute diff in a Web Worker if it takes >50ms. The AI SDK SSE flow leaves the main thread free; use it.
- For dark-only color contrast: insertion = `bg-emerald-900/40 text-emerald-200` (not `bg-green-500`), deletion = `bg-red-900/40 text-red-200 line-through`. Verify with WCAG contrast checker — target AA (4.5:1) for body text, AAA (7:1) for code.
- Provide a "summary only" view as the default for long diffs; only show full diff on demand. Default-off heavy rendering.

**Warning signs:**
- DevTools Performance tab shows >200ms scripting on first diff render.
- Diff output looks like "the whole chapter changed" (tokenization broken).
- User scrolling diff drops below 30fps.
- Lighthouse a11y audit flags contrast on diff spans.

---

### Pitfall 14: Skeleton states flash on fast connections, lag on slow ones

**Severity:** Medium
**Phase:** Phase 5 (skeleton/error states + 150ms motion baseline)

**What goes wrong:**
- Fast load (50ms): skeleton appears for one frame then content. Looks like a flicker.
- Slow load (3s): skeleton appears immediately; user wonders why nothing's loading.
- Skeleton has wrong layout: 3 rows tall, content is 5 rows → page jumps when content arrives.
- SSR breaks: skeleton is a client component, but the route is a Server Component that already has the data — skeleton shows briefly during hydration even though SSR painted the real content.

**How to avoid:**
- **Delay skeleton mount by 150ms** to avoid flash on fast loads: render `null` for the first 150ms, then skeleton. Match this to the motion baseline (Phase 5 spec already says 150ms).
- Use Next.js 15 `loading.tsx` at the route level — it integrates with streaming SSR so skeleton only shows when the server itself is delayed, not during hydration of pre-fetched data. Reference: Next.js App Router `loading.tsx` docs.
- Match skeleton dimensions to final layout: count actual rows in production, mirror in skeleton. Use `aspect-ratio` and `min-height` to prevent jump.
- For lists where row count is unknown (sessions, chapters), use a fixed plausible count (5 rows) and `text-muted-foreground/20` background to suggest more below.
- Test on `Slow 3G` throttling in DevTools — see what actually happens, don't guess.

**Warning signs:** Skeleton appears and disappears in <100ms. Layout shift score (CLS) regresses. UAT tester says "the page jumped when it loaded".

---

### Pitfall 15: Tailwind purge breaks dynamic classes during token unification

**Severity:** High
**Phase:** Phase 5 (design-token completeness, fix `text-[Npx]` violations)

**What goes wrong:** Replacing 99 `text-[Npx]` arbitrary values with semantic tokens (`text-sm`, `text-base`, `text-lg`). Engineer writes:
```tsx
<p className={`text-${size}`}>...</p>  // size = "sm" | "base" | "lg"
```
Tailwind's JIT only generates utility classes it sees in source. `text-${size}` is invisible to the scanner → `text-sm` may not be in the CSS bundle if no other file uses it literally. Result: production build silently drops the styles, content renders unstyled.

**Why it happens:** Tailwind purge/JIT uses static analysis. Dynamic class composition (`text-${size}`, `bg-${color}-500`) is not supported. The dev server works because all utilities may be present; production purges aggressively.

**How to avoid:**
- Never construct classes via template literals or string concatenation.
- Use a lookup map with full string literals:
  ```ts
  const sizeMap = { sm: "text-sm", base: "text-base", lg: "text-lg" } as const;
  <p className={sizeMap[size]}>...</p>
  ```
- For complex variants, use `clsx` + `tailwind-merge` (likely already in the repo via shadcn's `cn` util).
- Run `npm run build` after token replacement and visually QA the build output (`next start`) on representative pages — dev mode is **not** representative.
- Add a lint rule (eslint-plugin-tailwindcss `no-arbitrary-value` if available, or grep CI script) to prevent re-introduction of `text-[Npx]`.

**Warning signs:** Styles work in `npm run dev` but break in `npm run build && npm start`. Lighthouse run shows unstyled text. `getComputedStyle` in DevTools shows default browser font-size.

---

### Pitfall 16: Dark-mode color contrast WCAG failures in newly tokenized surfaces

**Severity:** High
**Phase:** Phase 5

**What goes wrong:** v0.3 hard-coded specific hex values for some statuses (amber, sky) per audit item #10. Migrating to semantic tokens (`bg-warning`, `bg-info`) using shadcn's default dark theme produces lower contrast — `bg-yellow-500 text-yellow-50` reads fine on white, but `bg-yellow-500/20 text-yellow-200` on `bg-background` (dark) may fall below 4.5:1.

**Why it happens:** Dark themes have a smaller safe contrast range. shadcn defaults are tuned for general use, not novel-reading-density UIs. Brand color palettes shifted to dark backgrounds need explicit verification.

**How to avoid:**
- For every status color (success / warning / error / info), verify foreground-on-background contrast at AA (4.5:1) for body text using a tool like Stark or axe DevTools.
- Define semantic tokens in `theme-tokens.ts` (already exists per `src/lib/theme-tokens.ts`) with explicit dark-mode values, not Tailwind defaults.
- Run axe-core in Playwright or as a one-shot CI script across the main path routes. Existing repo doesn't have axe — adding it is a small task, not a phase blocker.
- For decorative color (not conveying info), AA contrast is not required; mark these explicitly with `aria-hidden` so audits don't flag them.

**Warning signs:** Owner squints during UAT. axe-core run flags `color-contrast` violations. Stark plugin shows "fails AA".

---

### Pitfall 17: Single-book mode removal leaves orphan data + dead deep-links

**Severity:** High
**Phase:** (Removal phase — likely Phase 2 or distinct removal phase)

**What goes wrong:**
- DB has `sessions` rows with `mode = 'single'`. Removing the UI doesn't migrate them. They become invisible but reachable via direct URL.
- External docs, bookmarks, or marketing emails contain `/upload?mode=single`. URL still routes to upload page, but the param is no-op'd → user lands on dual upload with no explanation.
- Existing code branches: `src/app/(app)/upload/page.tsx` has conditionals on `mode`. Removing the single branch leaves dead code if not done carefully.
- API endpoints that accept `mode` parameter may still process single-book uploads if the UI is removed but the backend isn't.

**How to avoid:**
- **Audit before removing:** count `single` mode sessions in DB. If <50, plan a soft migration prompt for those users on next login. If 0, just drop.
- Replace `/upload?mode=single` route with a 301 redirect to `/upload?mode=dual` + a toast on the destination explaining the move ("单书模式已合并到双书 — 上传两本即可").
- Remove `mode` from API surface only **after** the UI removal has shipped for one milestone, in case rollback is needed.
- Grep audit: search for `mode === 'single'`, `mode: "single"`, `?mode=single` across `src/` and `tests/` — remove all matches in one PR with a clear "single-mode removal" commit message.
- Remove from i18n/CTA SSOT (`cta-copy.ts`) any strings referring to "单书" / "single book".

**Warning signs:** Grep finds `single` references after "removal" complete. DB has `mode='single'` rows. External link to `/upload?mode=single` shows broken state.

---

### Pitfall 18: Bundle size regression from cmdk + Tiptap + framer-motion stack

**Severity:** High
**Phase:** Cross-phase (especially Phase 3 + 5)

**What goes wrong:** Adding the v0.4 stack roughly adds:
- `cmdk` (~7KB gzipped)
- `@tiptap/core` + `@tiptap/starter-kit` (~80KB gzipped at minimum, more with extensions)
- `framer-motion` (~50KB gzipped — and Phase 5 motion baseline implies global use)
- Possibly `diff-match-patch` or `jsdiff` (~10KB)

Total ~150KB+ gzipped on routes that include all of them (workbench). LCP on `/sessions/[id]` regresses from ~1.2s to ~2.5s. TTI on workbench breaks the SaaS feel.

**Why it happens:** Defaults route-level imports include everything. Tiptap pulls all its extensions even if you don't use them. framer-motion is famously not tree-shakeable in older versions.

**How to avoid:**
- **Code-split per route segment.** Tiptap should be dynamically imported in the inline editor component only:
  ```ts
  const Editor = dynamic(() => import("@/components/blueprint/inline-editor"), { ssr: false });
  ```
- For framer-motion in v0.4, use the `lazy-motion` API: `<LazyMotion features={domAnimation}>` cuts ~25KB from the initial bundle.
- For cmdk: already small, mount at root is fine.
- Use Next.js `@next/bundle-analyzer` (already common in Next 15 projects — verify in `package.json`) to measure before/after each phase. Fail the phase if `app/(app)/sessions/[id]/workbench` chunk grows > 50KB gzip.
- Diff library: prefer building diff in a Web Worker imported dynamically, so the diff lib code doesn't enter the main bundle until first use.

**Warning signs:** Bundle analyzer shows workbench chunk > 300KB gzip. Lighthouse perf score drops 10+ points. PageSpeed mobile LCP > 3s.

---

### Pitfall 19: Playwright selector drift during refactor — already-known fragility

**Severity:** Critical
**Phase:** Phase 2 + 3 + 4

**What goes wrong:** Phase 5 of v0.3 documented this exact failure mode (`05-RESEARCH.md` Pitfall 1): smoke spec drifted from UI heading strings after Phase 4 refactor. v0.4 will refactor again — same risk, larger surface (3 phases changing UI strings instead of 1).

Current smoke selectors include: `创建并进入工作台`, `第 1 步 · 导入两本参考小说`, `拆解章节`, `整理融合蓝图`, `前往对比`, `前往生成`, `生成变体`, `生成新版本`, `生成结果`, `阅读全文 →` [VERIFIED: tests/e2e/smoke.spec.ts].

**How to avoid:**
- **All UI strings must come from `CTA_COPY` SSOT** — already a project rule. Tests should import the same SSOT and assert against it, so renaming a string in `cta-copy.ts` updates both UI and test simultaneously.
- For headings (which aren't in CTA_COPY today), introduce a `STEP_HEADINGS` SSOT alongside `cta-copy.ts` during the workbench split. Tests reference `STEP_HEADINGS.compare`.
- Prefer `data-testid` for the **structural** selectors that should survive copy changes — but only for navigation skeleton, not user-visible text. Keep most assertions on user-visible strings (it tests what the user sees).
- Run `npm run test:e2e` at the end of each phase, not just at milestone end. v0.3 deferred this and inherited a Phase 5 cleanup task.
- Document the manual smoke run in each phase's SUMMARY.md, same pattern as `05-SMOKE.md`.

**Warning signs:** New Chinese string committed to `workbench-client.tsx` (or its successor route file) that isn't in `cta-copy.ts`. Smoke spec doesn't grow but UI does.

---

### Pitfall 20: framer-motion 150ms baseline becomes everywhere (jank + nausea)

**Severity:** Medium
**Phase:** Phase 5

**What goes wrong:** "150ms motion baseline" means everything animates — accordions, tooltips, page transitions, palette open, skeleton crossfade. On low-end devices, simultaneous animations drop frame rate. Users with vestibular sensitivity get nauseous from constant motion.

**How to avoid:**
- Respect `prefers-reduced-motion`: in CSS `@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }`. In framer-motion: use the `useReducedMotion()` hook and pass `transition={{ duration: shouldReduce ? 0 : 0.15 }}`.
- Apply motion only to **state changes**, not to **route changes** (Next.js page transitions in App Router are tricky to animate without flicker; not worth the complexity for v0.4).
- Stagger or queue large animations so only 1–2 elements animate per frame.
- 150ms is the **maximum**, not the target. Many UI changes should be instant — focus state, hover. Animations for accordion expand, palette open, skeleton swap.

**Warning signs:** Owner reports "feels twitchy" or "everything moves at once". DevTools Performance shows long animation frames (>16ms). axe-core or manual test with reduced-motion enabled still shows animations.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems for THIS codebase.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hard-code CTA strings in new workbench routes "just to ship" | Skip CTA_COPY refactor | Smoke drift, UAT failures, repeat of Phase 5 cleanup | **Never** — SSOT is project-locked |
| Skip `useReducedMotion` "for v0.4, add later" | Faster animation work | A11y regression; some users abandon | **Never** — one-line check |
| Use raw `contentEditable` instead of Tiptap "to avoid dep size" | -80KB bundle | IME bugs make inline-edit unusable for Chinese users (primary audience!) | **Never** for this product |
| Mount palette at every route instead of root | Avoid layout refactor | Double-mount, focus restoration breaks | **Never** — root mount is one line |
| Use `useState` for workbench step instead of URL | No URL design needed | Back button breaks, deep links impossible | **Never** for step-based flow |
| Defer single-book DB migration | Ship UI removal faster | Orphan data accumulates; eventual data integrity audit | **Acceptable** if DB rows < 50 and flagged in REQUIREMENTS for v0.5 |
| Inline diff renders all 30k chars without virtualization | Skip react-window dep | UI freezes on long chapters; users blame the AI not the diff | **Acceptable** only if max chapter length is gated < 3000 chars at the API level |
| Hard-code `prefers-reduced-motion: reduce` to false during dev | Faster QA on animation polish | Forget to remove; ship broken a11y | **Never** — use a `?motion=off` URL param if needed |
| Skip bundle-analyzer baseline before Phase 3 | Don't measure now, regret later | Can't tell which phase caused regression | **Never** — first thing in Phase 1 |
| Use Supabase realtime for inline-edit collab | Real-time feel | Race conditions vs optimistic UI; not in scope | **Never** in v0.4 — out of scope |

## Integration Gotchas

Common mistakes when connecting v0.4 features to existing integrations.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase RLS + new inline-edit | Forget that PATCH must include `user_id` for RLS | Use existing blueprint patch endpoint (already RLS-correct); do not add new write path |
| AI SDK SSE + abort | Stop UI but not abort the fetch | Pass `signal` to fetch + call `stop()` from `useChat`; verify Network tab closes the EventSource |
| Next.js 15 App Router + URL state | Read `searchParams` directly in Server Component without `<Suspense>` | Wrap consumers in `<Suspense>` (Next 15 build error otherwise) |
| BYOK + cost meter | Display cost using internal LLM price table — wrong for user's BYOK | Use the rate user configured; if unknown, show "Tokens: N" not "¥X" |
| shadcn `Dialog` + cmdk | Use `<Command>` standalone | Use `<CommandDialog>` (Dialog + Command nested) |
| Tiptap + Supabase optimistic | Patch on every keystroke | Debounce 300ms after `compositionend`; batch with previous edit if within 1s |
| Existing `generate-v2` + new Studio streaming | Call legacy `/api/generate` for variety | Always use `/api/generate-v2`; legacy is `CNV-01` deferred-v2 debt |
| next/dynamic + Tiptap | SSR Tiptap (crashes) | `dynamic(() => import(...), { ssr: false })` for the editor wrapper |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Diff renders all CJK chars as separate spans | Main thread blocked 1–5s on first diff | Intl.Segmenter tokenization + react-window | Chapters > 3000 chars (most chapters) |
| Streaming text re-renders 60fps | High CPU during generation; battery drain | AI SDK `experimental_throttle` or `requestAnimationFrame` batching | Always on streaming |
| Tiptap loaded eagerly on workbench root | LCP +800ms even when not editing | `next/dynamic` lazy load editor | Always |
| Tailwind dynamic class strings | Production build missing styles | Lookup maps with literal strings | Always (silent until production) |
| Bundle includes all framer-motion features | Initial JS bundle bloat | `<LazyMotion>` + `domAnimation` only | Always |
| Skeleton component is large client component | Hydration cost on every nav | Use Next.js `loading.tsx` (RSC-friendly) | First load after deploy |
| Per-row Supabase fetch in blueprint list | N+1 queries when card count > 20 | Existing list endpoint already batches — don't bypass it | Blueprints > 20 cards |
| Realtime subscriptions on workbench (if added) | WebSocket overhead per session view | **Don't add realtime in v0.4** | Out of scope |

## Security Mistakes

Domain-specific security issues for this stack.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Inline-edit accepts HTML from contentEditable, stores raw | XSS on render | Tiptap stores ProseMirror JSON not HTML; render via Tiptap's serializer, not `dangerouslySetInnerHTML` |
| ⌘K palette includes "Delete session" without confirm | Accidental destructive action via keyboard | Two-step: palette → confirm dialog; never single-keystroke destructive |
| Cost meter reveals other users' costs (RLS bug) | Information disclosure | Verify cost API uses session_id + user_id; existing RLS policies handle this — don't bypass |
| URL state includes auth tokens | Token leak via Referer header | Never put tokens in URL; this codebase doesn't — keep it that way |
| Streaming SSE allows arbitrary prompts via URL | Prompt injection through deep links | Server validates prompt source (blueprint ID); reject if not owned by user |
| Tiptap external image uploads | Could leak user content to third-party CDN | Don't enable image extension in v0.4; blueprints are text-only |
| Bundle includes Supabase service role key | Catastrophic leak | `NEXT_PUBLIC_*` only for anon key; verify `next/dynamic` imports don't drag server-only code into client |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Palette shows too many results, no grouping | Unscannable | Group: 项目 / 章节 / 操作 / 设置; cap at ~5 per group |
| ⌘K opens but cursor not auto-focused on input | User has to click | `autoFocus` on input + `onOpen` ref focus |
| Skeleton state looks more polished than real state | User feels real load was a regression | Skeleton should be **less** detailed; subtle gradient only |
| Inline-edit makes saved state ambiguous | "Did it save?" anxiety | Show subtle "已保存 · 2 秒前" inline; never block UI |
| Streaming dual-pane both auto-scroll | User can't read either side | Only variant pane auto-scrolls during stream; source is static |
| Inline diff colors are too saturated | Visual fatigue on long chapters | Subtle backgrounds (`/20` opacity), bold contrast only at character level |
| Removing single-book without explanation | Users with single-book sessions confused | Toast / migration message explaining the merge |
| Motion baseline applies to focus rings | Keyboard nav feels laggy | Focus rings should be instant (no transition); animate only color/size, not appearance |
| Confirm-gate toast appears repeatedly | Annoyance | Toast once per session; subsequent attempts highlight the gate inline silently |
| Palette command for "delete session" needs no confirmation | Disaster recovery via Ctrl+Z impossible (no undo for delete) | Always require dialog confirm for destructive commands |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces. Use during phase verification.

- [ ] **⌘K palette:** Often missing focus restoration on close — verify by opening from a focused input, closing palette, checking focus returns to input.
- [ ] **⌘K palette:** Often missing IME guard — verify by typing Pinyin while pressing K; palette should NOT open.
- [ ] **Workbench split:** Often missing back-button verification — open analysis → click 前往对比 → press browser back → must land on analysis with state restored.
- [ ] **Workbench split:** Often missing smoke spec update — run `npm run test:e2e` after split, expect green or document selector changes in 05-SMOKE.md equivalent.
- [ ] **Inline edit:** Often missing IME composition test — verify by typing 你好 via Pinyin; should not fire save during composition.
- [ ] **Inline edit:** Often missing draft autosave verification — make edits, force-close tab, reopen; draft should restore (or autosave should have run).
- [ ] **Streaming dual-pane:** Often missing abort verification — click abort; check Network tab confirms EventSource closes immediately, not after 2s.
- [ ] **Streaming dual-pane:** Often missing scroll-anchor logic — scroll up during stream, verify it does NOT auto-scroll over user.
- [ ] **Inline diff:** Often missing CJK tokenization — diff two chapters that differ by one word; verify only that word highlights, not entire chapter.
- [ ] **Inline diff:** Often missing perf check — diff two 8000-char chapters; verify first paint < 200ms.
- [ ] **Skeleton states:** Often missing flash prevention — load route on fast connection; skeleton should NOT appear and disappear in < 100ms.
- [ ] **Token unification:** Often missing build verification — `npm run build && npm start`; visually QA representative routes, not just dev mode.
- [ ] **Token unification:** Often missing contrast verification — run axe-core or Stark on main routes in dark mode.
- [ ] **Single-book removal:** Often missing DB audit — count `WHERE mode = 'single'` before declaring removal complete.
- [ ] **Single-book removal:** Often missing redirect — `/upload?mode=single` should 301 to `/upload?mode=dual` with explanation toast.
- [ ] **Bundle size:** Often missing baseline — record bundle analyzer output at start of milestone; compare at end.
- [ ] **Motion baseline:** Often missing reduced-motion test — toggle OS reduced-motion setting; all animations should disable.
- [ ] **CTA additions:** Often missing SSOT registration — grep for new Chinese strings in non-`cta-copy.ts` files; flag any new ones.

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Smoke spec drift after refactor | LOW | Patch selectors (1–2 hr); same pattern as v0.3 Phase 5 |
| Workbench refactor breaks UAT scenario | MEDIUM | Identify scenario, find dropped logic via `git diff` vs pre-refactor `workbench-client.tsx`; restore the check; add regression unit test |
| URL param compatibility breaks external links | LOW | Add middleware redirect from old → new param shape; ship hotfix |
| Tiptap IME bug discovered post-ship | HIGH | Hotfix to add isComposing guards; affected users report mid-edit data loss already; consider data recovery from Supabase audit log if available |
| Optimistic update race lost user edits | HIGH | Identify scope from Supabase logs; manual notify affected users; switch to non-optimistic save until fix |
| Inline diff freezes browser on long chapter | MEDIUM | Hotfix: gate diff to chapters < 3000 chars; show "use summary" for longer; ship react-window virtualization in next phase |
| Bundle regression caught in production | MEDIUM | Identify offending phase via git bisect on `npm run build` output; dynamic-import the heaviest dep; deploy |
| Skeleton flash reported by owner | LOW | Add 150ms delay; ship in next plan |
| Token-unification visual drift in production | MEDIUM | Run visual regression suite (chromatic or playwright screenshot tests — not in repo currently; quick to add); identify diffs; patch |
| Single-book orphan data after removal | LOW | Migration script; flag affected users; offer to migrate to dual or archive |
| Color contrast WCAG failure | LOW | Update specific token in `theme-tokens.ts`; usually one or two values |
| ⌘K conflicts with browser shortcut | LOW | Add `event.preventDefault()` only on success; check browser version compatibility |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| # | Pitfall | Prevention Phase | Severity | Verification |
|---|---------|------------------|----------|--------------|
| 1 | Palette focus trap leaks | Phase 1 | Critical | axe-core run; manual Tab cycle; VoiceOver/NVDA test |
| 2 | Shortcut conflicts + IME | Phase 1 | High | Manual Pinyin test; browser Ctrl+K still works on non-palette pages |
| 3 | Palette state survives nav | Phase 1 | Medium | UAT: open palette, click result, palette closes on new route |
| 4 | Confirm-gate regression in split | Phase 2 | Critical | Re-run 11/11 UAT (especially #5 and #6); smoke spec green |
| 5 | Lost local state across routes | Phase 2 | High | UAT: edit, navigate, return, state restored or correctly cleared |
| 6 | URL collision + back-button | Phase 2 | High | UAT: back-button explicit test; compat shim for old URL shapes |
| 7 | SSR/CSR hydration mismatch | Phase 2 + Phase 5 | High | `npm run build` exits 0 with no hydration warnings; production smoke pass |
| 8 | IME composition swallows Chinese | Phase 3 | Critical | Manual Pinyin typing test; Supabase logs show no partial saves |
| 9 | Draft loss on navigation | Phase 3 | High | UAT: edit, close tab, reopen, draft restored |
| 10 | Optimistic update race | Phase 3 | High | Rapid-fire edits, verify final state matches last input |
| 11 | Streaming layout thrash | Phase 4 | High | Visual inspection during stream; CPU profiler < 30% during stream |
| 12 | Cost meter desync + abort | Phase 4 | Medium | Abort test: click stop, verify Network tab closes EventSource within 200ms |
| 13 | Inline diff CJK perf cliff | Phase 4 | Critical | Perf test on 8000-char chapter; first paint < 200ms; axe contrast pass |
| 14 | Skeleton flash / wrong layout | Phase 5 | Medium | DevTools Slow 3G + fast throttle; CLS metric unchanged |
| 15 | Tailwind purge breaks dynamic | Phase 5 | High | `npm run build && npm start`; visual QA representative routes |
| 16 | Dark-mode contrast WCAG | Phase 5 | High | axe-core on main-path routes; contrast checker on every status color |
| 17 | Single-book removal orphan + dead links | Phase 2 (or removal phase) | High | DB audit `WHERE mode='single'`; 301 redirect test on `/upload?mode=single` |
| 18 | Bundle size regression | All phases | High | Bundle analyzer baseline at Phase 1; compare each phase; fail if main route > +50KB gzip |
| 19 | Playwright selector drift | Phase 2, 3, 4 | Critical | Run `npm run test:e2e` at end of every phase; SSOT all new strings via cta-copy / step-headings |
| 20 | Motion baseline jank + nausea | Phase 5 | Medium | Reduced-motion OS toggle test; manual review on low-end device |

## Sources

- v0.3 retrospective: `.planning/milestones/v0.3-phases/05-saas/05-RESEARCH.md`, `05-UAT.md`, `05-VERIFICATION.md` — known-debt baseline [VERIFIED: read]
- Existing codebase: `wc -l` on `workbench-client.tsx` (1403 lines), `text-[Npx]` count = 99 across 16 files [VERIFIED: ripgrep + wc]
- Existing smoke selectors: `tests/e2e/smoke.spec.ts` L213–253 [VERIFIED: grep]
- Existing CTA SSOT: `src/lib/ui/cta-copy.ts` + `cta-copy.test.ts` [VERIFIED: codebase]
- Existing generate path: `src/app/api/generate-v2/route.ts` [VERIFIED: filesystem]
- Existing theme tokens: `src/lib/theme-tokens.ts` [VERIFIED: filesystem]
- IME composition handling: ProseMirror Guide § Composition (MDN `CompositionEvent` + `KeyboardEvent.isComposing`) [CITED: MDN]
- Intl.Segmenter for CJK tokenization: MDN Web Docs `Intl.Segmenter` [CITED: MDN]
- cmdk inside Radix Dialog pattern: shadcn `CommandDialog` source [CITED: shadcn/ui docs]
- Next.js 15 App Router `searchParams` + Suspense requirement: Next.js App Router docs [CITED]
- Tailwind JIT static analysis limitation: Tailwind CSS docs § Content [CITED]
- WCAG 2.1 contrast targets: W3C WAI [CITED]
- AI SDK abort/stop semantics: `ai` package docs (`useChat.stop()`, `streamText` AbortSignal) [CITED]
- `prefers-reduced-motion`: MDN [CITED]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Tiptap will be the inline-edit library | Pitfall 8, 18 | If team chooses Lexical/Slate, IME guidance still applies but specific API names change |
| A2 | framer-motion is the chosen motion lib | Pitfall 18, 20 | If team uses CSS-only animations, bundle math changes (smaller); reduced-motion guidance still applies |
| A3 | cmdk is the chosen palette lib | Pitfall 1, 18 | If custom built, focus management gotchas become 10x more critical |
| A4 | AI SDK `useChat`/`useCompletion` will be used for streaming | Pitfall 11, 12 | If raw fetch SSE, abort wiring is manual; same end result |
| A5 | jsdiff or diff-match-patch will be used for diff | Pitfall 13 | If a third lib chosen, CJK tokenization may be built-in or absent |
| A6 | Single-book DB row count is small (< 100) | Pitfall 17 | If thousands, removal needs explicit migration plan, not just UI cut |
| A7 | Workbench split will be 3 routes (analysis/compare/generate) | Pitfall 4–6 | If a different split chosen, URL design changes but pitfalls remain |
| A8 | `prefers-reduced-motion` is honored project-wide | Pitfall 20 | If currently ignored, broader a11y task than just v0.4 |

These assumptions need confirmation in the Phase 1 plan or `/gsd-discuss-phase`. None of them invalidate the pitfalls themselves; they affect only which library-specific APIs to wire.

---
*Pitfalls research for: v0.4 UX Foundation — brownfield UX upgrade on Next.js 15 dual-book novel SaaS*
*Researched: 2026-05-26*
