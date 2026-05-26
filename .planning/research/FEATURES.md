# Feature Research — v0.4 UX Foundation

**Domain:** Power-user UX layer for an existing dual-book novel-variant SaaS (Linear / Vercel / Raycast aesthetic, dark-only)
**Researched:** 2026-05-26
**Confidence:** HIGH for command-palette / URL-state / inline-edit / streaming / empty-state patterns (multiple authoritative SaaS references); MEDIUM for semantic creative-brief input patterns (Sudowrite/NovelAI patterns translate by analogy, not a direct competitor for dual-book融合 variants); MEDIUM for diff visualization specifically for long Chinese-prose chapters (no first-party reference for Chinese-character-scale prose diff in mainstream SaaS).

## Scope Note

This research covers **only the seven v0.4 new-feature territories** listed in the milestone context. It deliberately does **not** re-explore:

- Auth / BYOK / upload / analysis / blueprint Zod / generate-v2 / three-layer LCS diff engine — already shipped through v0.3
- Information-architecture shell decisions (Phase 3 of v0.3 locked dual-first redirect, ⌘K placement, CTA SSOT)
- Token system, dark-only color roles, density rules — Phase 2 of v0.3 (`02-UI-SPEC.md`) is canonical and v0.4 must respect it

The output is a **v0.4 feature landscape**, not a greenfield product feature survey. Categorisations reflect "what counts as 商业 SaaS 级 for a Linear/Vercel-class dark-only creator tool in 2026", not generic SaaS table stakes.

## Feature Landscape

### Table Stakes (Users Expect These in Linear/Vercel-tier Tools)

Missing any of these makes the product feel "not at SaaS-mature tier" relative to the stated benchmark. Inclusion is non-negotiable for v0.4's `QLT-03 商业 SaaS 级` perception goal.

| # | Feature | Why Expected (named benchmark) | Complexity | Notes |
|---|---------|--------------------------------|------------|-------|
| TS-01 | **⌘K command palette** with global shortcut + Esc to close + arrow-key navigation + Enter to execute | Linear / Vercel / Raycast / Notion all ship this; cmdk by Paco Coursey powers most of them [CITED: Geist, Vercel Command Menu docs] | M | Use `cmdk@1.1.1` headless primitives [VERIFIED: npm registry] + project tokens. Shadcn `Command` already wraps cmdk. |
| TS-02 | **Command-palette fuzzy search** across sessions/projects (name, ID, last-activity) | Linear/Vercel both fuzz-search across issues/deployments; users expect to type partial names | M | cmdk has built-in command-score fuzzy match; supplement with custom ranking by recency. |
| TS-03 | **Command-palette navigation routes** (jump to /sessions, /upload?mode=dual, /sessions/[id]/workbench?step=…) | Vercel ⌘K is primarily a navigator; Raycast Root Search is the same idea | S | Static routes list + dynamic recent sessions. |
| TS-04 | **Inline shortcut hints** displayed inside palette items (e.g., `↵`, `⌘K`, `?`) | Linear, Figma, Vercel, Intercom all show shortcuts inline; teaching surface | S | cmdk supports right-aligned shortcut badge slot. |
| TS-05 | **`?` shortcut to open keyboard reference** | Linear's pattern; expected in any palette-driven tool | S | Modal or palette mode listing all shortcuts grouped by section. |
| TS-06 | **Step in URL path** (`/sessions/[id]/workbench/upload`, `/analyze`, `/blueprint`, `/generate`) — refreshable, bookmarkable, back-button works | Wizard step = hierarchical sub-resource → path segment is the textbook fit [CITED: API-craft, TanStack Router] | M | Migrate current `?step=` (if present) or in-component state. Use Next App Router segment routes. |
| TS-07 | **Skeleton loading** for each workbench step that mirrors final layout (not generic spinner) | Linear/Notion/Vercel all use shape-matched skeletons; spinners feel 2018 | S | v0.3 already added `workbench/loading.tsx` (`PageLoadingShell`); v0.4 needs per-step variants. |
| TS-08 | **Three-state pattern** (loading / empty / error) for every primary surface (sessions list, workbench steps, generate variants, blueprint editor) | Industry minimum since 2020; Notion uses empty states as onboarding moments | M | Already have `EmptySlot`; need consistent error variant with retry. |
| TS-09 | **Active-language empty-state copy** ("创建第一个项目" not "暂无项目") | Supabase design system and best-practice consensus; "No X found" feels broken | S | Copy pass; map to existing `EmptySlot`. |
| TS-10 | **Streaming-in-progress visual cue** (blinking cursor or "AI is typing" pill at the end of streamed text) | ChatGPT/Claude/Cursor all use cursor or dots; absence = "is it broken?" | S | Already streaming via SSE in Studio; needs explicit indicator component. |
| TS-11 | **Prominent stop button during streaming** with proper teardown (buffer clear, cursor remove, state flip) | Cursor IDE bug reports prove naive stop buttons leave UI half-broken [CITED: Cursor forum bug reports] | M | Existing SSE abort exists; verify teardown completeness. |
| TS-12 | **Disable input during generation** to prevent overlapping streams | Standard pattern in all chat/streaming UIs | S | Add `isStreaming` flag to generate-drawer state. |
| TS-13 | **Two-mode keyboard model for inline editing** (navigation mode arrow keys; edit mode Tab/Enter/Escape with cell-aware behavior) | Airtable / Linear / Notion all enforce this; collisions otherwise break typing | M | Blueprint cards already partially have j/k; needs explicit mode boundary + Esc → blur pattern. |
| TS-14 | **`prefers-reduced-motion` respect** for streaming/skeleton animations | Accessibility floor; WCAG / browser API | S | CSS `@media (prefers-reduced-motion: reduce)` on cursor blink + skeleton shimmer. |
| TS-15 | **Visible focus ring** on every interactive element (especially in dark theme) | Linear/Vercel/Geist all maintain 2-3 px focus outlines | S | Already in `02-UI-SPEC.md` § Focus; verify v0.4 new components honor it. |
| TS-16 | **`?step=…` or `?view=…` for in-page ephemeral UI state** (which generate variant is selected, which blueprint card is expanded) | Emerging pattern (TanStack Router discussions); shareable but not on hot path | S | `nuqs@2.8.9` [VERIFIED: npm registry] is the standard for this in Next App Router. |

### Differentiators (NovelFusion-Specific Competitive Edge)

Features that are not industry-standard but align with v0.4's **"creative-writing power-user tool for dual-book融合"** positioning. These move the product from "polished SaaS" to "this feels designed for me specifically".

| # | Feature | Value Proposition | Complexity | Notes |
|---|---------|-------------------|------------|-------|
| DF-01 | **Command palette that knows the dual-book context** — actions like "Confirm blueprint for current project", "Compare generated variant A vs B", "Resume last analysis" surface at top when relevant | Raycast-style context-aware Actions; turns palette from generic launcher into power-user accelerator | M | Requires session-context awareness inside palette item filter. |
| DF-02 | **Two-tier palette: navigation + action panel** (⌘K = navigate/search, ⌘K-then-⌘K or `→` = actions on selected item) | Raycast's signature; flattens deep menus without overwhelming top-level list [CITED: Raycast Manual] | L | Defer to v0.4.x — full Raycast two-tier is heavy; for v0.4 launch, single-tier with action shortcuts inline is enough. |
| DF-03 | **Semantic creative-brief controls** — replace freeform 风格 textareas with: sensory-density slider (低/中/高), prose-register dropdown (口语化 / 现代书面 / 古典文言), pacing slider, POV dropdown, named-character preservation toggles | Sudowrite's "Tone Shift" (8 presets) + Creativity slider validate this pattern for fiction; Midjourney's `--s/--ow` sliders show users tolerate parameter-style controls in creative tools when defaults are sane [CITED: Sudowrite blog, Midjourney guides] | L | Critical: each control must be a **prompt-injection abstraction** with a JSON shape that the existing blueprint Zod schema can absorb. Don't replace creative brief panels entirely — augment them. |
| DF-04 | **Streaming dual-pane**: left = source-of-truth context (current blueprint summary + chapter being rewritten), right = live streaming output with cost meter, token-rate indicator, and stop control | Inverts ChatGPT's single-column layout for a use case where the user needs to compare against intent while waiting; Scrivener's split-screen for fiction is the closest creative-tool analog [CITED: Scrivener docs] | L | Cost meter / token-rate are differentiators — most chat UIs hide cost. |
| DF-05 | **In-place chapter diff with paragraph-anchored comments** — three-layer LCS already shipped in v0.3; v0.4 adds the ability to mark paragraphs as "keep" / "revise again" / "compare to variant N" inline | GitHub PR review patterns (range comments, classifications) adapted to prose [CITED: revdiff/tuicr]; novel writers need range comments not line comments because a single edit-intent spans paragraphs | L | The diff engine is done; v0.4 adds the annotation UI on top. |
| DF-06 | **Diff-mode toggle** between "vs original chapter" (default) and "vs prior variant" — both views one shortcut away | Google Docs version history allows non-adjacent compare; Linear/GitHub PR compare base; novel-rewrite users frequently want both | M | Single state machine: `compareTarget: "original" \| variant_id`. |
| DF-07 | **Blueprint card reorder via number keys + drag** — typing `1`, `2`, … on a focused card sends it to that position, Option+drag duplicates (Notion-style) | Notion: hold + arrow reorders; Linear: number keys set priority/status; combined for blueprint section ordering | M | Beyond j/k navigation. Drag is the discoverable affordance; number keys are the power-user accelerator. |
| DF-08 | **Generation cost meter** showing tokens consumed + estimated remaining + dollar (or input/output split) inline during stream | BYOK users care about cost; almost no consumer AI UI surfaces this; differentiates for the power-user audience | M | Existing BYOK accounting can be extended with live counter. |
| DF-09 | **Per-step empty-state with the exact next action** (upload step: drop zone with "拖入双书 .txt"; analyze step: "运行批量分析" CTA + previously-analyzed banner; etc.) | Self-diagnosing empty states (Linear filter pattern) extended to wizard steps | M | Build on existing `EmptySlot`; per-step copy SSOT in `src/lib/workbench/derive-hint.ts` (already partial). |

### Anti-Features (Commonly Requested, Usually Wrong for This Milestone)

| # | Feature | Why Tempting | Why Problematic | Alternative |
|---|---------|--------------|-----------------|-------------|
| AF-01 | **Putting all wizard form values (blueprint Zod fields, creative brief text) in URL search params** | URLs become shareable; "URL is state" purity | Blueprint is multi-kilobyte; hits browser URL caps; risk of leaking creative content in browser history/referrer logs; degrades type safety | **Path segment for step**, ephemeral local state for form values, sync only the `step` + selection IDs to URL [CITED: TanStack discussions] |
| AF-02 | **Mode dropdown / temperature slider / top-p exposed by default** (NovelAI-style power-tool sandbox) | Power users will ask | "Tinkerer's paradise" UI noise; the Sudowrite/Midjourney lesson is that **opinionated curated controls** convert to daily-use, **raw model knobs** scare daily users away; misaligned with "克制留白" aesthetic | Keep raw model controls behind an "Advanced" disclosure (Collapsible); ship 3-6 curated semantic controls per DF-03 as the primary surface |
| AF-03 | **Real-time collaborative editing** of blueprint / brief | "Modern SaaS has collab" reflex | Out of scope for current product domain (single-creator workflow); Figma's collab works because design files are inherently shared; novel rewrite drafts are not | Defer to v2; if multi-seat ever ships, it's a separate milestone — not part of v0.4 UX foundation |
| AF-04 | **Full Raycast extension API / extension marketplace** | "Extensible palette is cool" | 10× scope; Raycast's success is years of platform work; we have one product surface | Hard-coded palette item registry per route, no plugin runtime |
| AF-05 | **Auto-save / live-collaborative cursor on blueprint cards** | "Google Docs feels modern" | LLM-generated content is regen-friendly; auto-save adds OT/CRDT complexity for one user; Notion's "block lock" while editing is enough | Per-card save on blur / explicit save; lock-on-edit pattern, no realtime cursor |
| AF-06 | **Generic mega-search bar in header** (alongside ⌘K) | "Search is discoverable" | Linear/Vercel deliberately don't ship this — palette is the search; double surfaces dilute the contract | Single ⌘K entry; header keeps current breadcrumb + project selector only |
| AF-07 | **Inline AI-suggested edits with "Accept / Reject"** inside blueprint cards while streaming | "Cursor IDE does this for code" | Prose edit suggestions inside a structured Zod blueprint have a different mental model — blueprint is structured intent, not free text; risk of corrupting Zod schema if streaming partial JSON | Streaming is for *generation outputs* (chapter variants), not for *blueprint edits*; blueprint stays edit-on-confirm |
| AF-08 | **Drag-to-resize panes in the streaming dual-pane** | "Pro tools have resizable panes" | Adds layout state to track; mobile/tablet adaptation pain; pixel-perfect token guidelines need fixed widths | Two fixed breakpoints (compact: stacked; wide: 1/2 + 1/2 or 1/3 + 2/3); user choice via CSS media query, not drag |
| AF-09 | **Sentence-level diff or character-level diff for Chinese 3-10k character chapters** | "More granular = better" | Sentence/paragraph anchoring is the right unit for novel-scale prose; character-diff creates visual noise the eye can't parse on long text; the v0.3 three-layer LCS engine already operates at sentence + paragraph + chapter — keep it | Stick with existing diff layers; v0.4 adds annotation UI on top of paragraph anchors only |
| AF-10 | **Animated transitions between workbench steps** beyond a 150-200ms fade | "Snappy = animated" | Slow motion = "perceived slow" per 2025 NN/g research; respects reduced-motion contract; Linear keeps step transitions almost instant | ≤200ms fade/slide; explicit `prefers-reduced-motion` opt-out |

## Feature Dependencies

```
TS-06 (URL path step routing)
  └──unblocks──> DF-04 (Streaming dual-pane shareable URL per step)
  └──unblocks──> TS-08 (Per-step skeleton variants)
  └──unblocks──> DF-09 (Per-step empty state)

TS-01 (⌘K palette)
  └──requires──> cmdk@1.1.1
  └──enhances──> TS-03 (Route jumping)
  └──enhances──> TS-04 (Inline shortcut hints)
  └──enables───> DF-01 (Context-aware actions)
  └──enables───> DF-02 (Two-tier palette, future)

TS-13 (Inline edit two-mode keyboard) is foundation for:
  ├── DF-07 (Number-key reorder)
  └── j/k/d/a card navigation (already partial in v0.3)

TS-10 + TS-11 + TS-12 (streaming cue + stop + disable)
  └──compose──> DF-04 (Streaming dual-pane)
  └──compose──> DF-08 (Cost meter — depends on stop teardown completeness)

DF-03 (Semantic brief controls)
  └──requires──> existing blueprint Zod schema absorbing parameter outputs
  └──conflicts──> AF-02 (raw temperature sliders — explicitly DON'T mix)

DF-05 (In-place diff annotations)
  └──requires──> v0.3 three-layer LCS diff (shipped)
  └──independent of──> DF-06 (compare target toggle — both can ship independently)

TS-16 (nuqs for ephemeral UI state in URL)
  └──independent of──> TS-06 (path for step)
  └──compose──> shareable diff view URL (variantId + chapterIndex in search params)
```

### Dependency Notes

- **TS-06 must land before DF-04, TS-08 per-step skeleton, DF-09 per-step empty state:** without path-based steps the per-step variants of skeleton/empty can't be keyed to URL and lose refresh/share semantics.
- **TS-01 ⌘K is the spine of v0.4's "power-user" perception:** every other palette/keyboard feature is downstream.
- **TS-13 inline-edit two-mode keyboard contract must be defined before DF-07** — without an explicit edit-mode boundary, number-key reorder collides with users typing numbers in card text.
- **DF-03 and AF-02 are direct competitors:** picking semantic curated controls (DF-03) means explicitly NOT shipping raw model knobs (AF-02). Mixing both creates the "tinkerer's UI" feel that this milestone is trying to avoid.
- **TS-10/11/12 are a single composite feature** — shipping streaming cue without proper stop button teardown produces the Cursor IDE bug class.

## MVP Definition

### Launch With (v0.4)

Minimum viable for "商业 SaaS 级 daily-use perception":

- [ ] **TS-01 / TS-02 / TS-03 / TS-04** — ⌘K palette with fuzzy nav + actions + inline shortcuts. Bare minimum for the perception goal.
- [ ] **TS-05** — `?` opens keyboard help. Teaches the rest.
- [ ] **TS-06** — Path-segment step routing (`workbench/upload|analyze|blueprint|generate`). Unblocks per-step polish.
- [ ] **TS-07 / TS-08 / TS-09** — Per-step skeleton + three-state pattern + active-voice empty copy.
- [ ] **TS-10 / TS-11 / TS-12** — Streaming cue + stop button + input disable. Composite — ship together.
- [ ] **TS-13** — Inline-edit two-mode keyboard contract for blueprint cards.
- [ ] **TS-14 / TS-15** — `prefers-reduced-motion` + focus rings.
- [ ] **TS-16** — `nuqs` for ephemeral UI state (selected variant, diff target).
- [ ] **DF-03** — Semantic creative-brief controls (3-6 curated controls replacing one of the freeform 风格 textareas; **not** all four panels). This is THE differentiator that costs the most and earns the most.
- [ ] **DF-04** — Streaming dual-pane layout (left blueprint summary + chapter source / right streaming output with cost meter).
- [ ] **DF-09** — Per-step empty states with exact next action.

### Add After Validation (v0.4.x)

- [ ] **DF-01** — Context-aware palette actions ("Confirm blueprint for current project") — needs telemetry first to know which actions actually matter.
- [ ] **DF-05** — Paragraph-anchored diff annotations — depends on whether QLT-02 UAT surfaces this need.
- [ ] **DF-06** — Diff compare-target toggle (original vs prior variant) — natural follow-up to DF-05.
- [ ] **DF-07** — Blueprint number-key reorder + Option-drag duplicate — power-user nicety, ship after the two-mode foundation is stable.
- [ ] **DF-08** — Live cost meter — depends on whether BYOK usage analytics show users care about per-stream cost vs per-month total.

### Future Consideration (v0.5+)

- [ ] **DF-02** — Full two-tier Raycast-style palette (Action Panel via second ⌘K) — too much surface for one milestone; revisit once single-tier ⌘K usage data exists.
- [ ] Sub-menu / nested palette navigation — Raycast Sub-menu pattern — defer until DF-01 + DF-02 land.
- [ ] Multi-user collab on blueprint / generation — out of scope per AF-03.

## Feature Prioritization Matrix

| # | Feature | User Value | Implementation Cost | Priority |
|---|---------|------------|---------------------|----------|
| TS-01 | ⌘K command palette | HIGH | MEDIUM (cmdk + shadcn already there) | **P1** |
| TS-06 | Path-segment step routing | HIGH | MEDIUM (refactor `workbench-client`) | **P1** |
| TS-07/08/09 | Skeleton + empty + error states | HIGH | LOW-MEDIUM | **P1** |
| TS-10/11/12 | Streaming cue + stop + disable | HIGH | LOW (augment existing SSE) | **P1** |
| TS-13 | Inline-edit two-mode keyboard | HIGH | MEDIUM | **P1** |
| DF-03 | Semantic creative-brief controls | HIGH | HIGH | **P1** |
| DF-04 | Streaming dual-pane layout | HIGH | MEDIUM-HIGH | **P1** |
| DF-09 | Per-step empty with next action | MEDIUM-HIGH | LOW | **P1** |
| TS-02/03/04/05 | Palette fuzzy + nav + shortcuts + `?` | HIGH | LOW (rides on TS-01) | **P1** |
| TS-14/15/16 | Reduced motion + focus + nuqs | MEDIUM | LOW | **P1** (cheap) |
| DF-01 | Context-aware palette items | MEDIUM-HIGH | MEDIUM | **P2** |
| DF-05 | Diff paragraph annotations | MEDIUM | HIGH | **P2** |
| DF-06 | Compare-target toggle | MEDIUM | LOW (rides DF-05) | **P2** |
| DF-07 | Number-key reorder + drag dup | MEDIUM | MEDIUM | **P2** |
| DF-08 | Live cost meter | MEDIUM | MEDIUM | **P2** |
| DF-02 | Two-tier palette (Action Panel) | LOW-MEDIUM | HIGH | **P3** |
| AF-* | Anti-features | NEGATIVE | — | **DO NOT BUILD** |

**Priority key:**

- **P1:** Must ship in v0.4 to hit the "商业 SaaS 级" perception bar.
- **P2:** Ship in v0.4.x patch releases once P1 is stable; each is a follow-up enhancement to a P1 foundation.
- **P3:** Defer to v0.5+ unless validation data demands earlier.

## Competitor Feature Analysis

| Feature | Linear | Vercel | Raycast | Notion | Cursor / ChatGPT | NovelFusion v0.4 Approach |
|---------|--------|--------|---------|--------|------------------|---------------------------|
| **Command palette shortcut** | ⌘K | ⌘K (⌘+Shift+K when nested) | Alt+Space (root), ⌘K (Action Panel) | ⌘P (search) + ⌘\\ (navigate) | ⌘L (Cursor chat) | **⌘K only** — single entry like Vercel; no ⌘P split |
| **Palette structure** | Single tier, context-aware items | Single tier (nav + actions blended) | Two tier (Root Search + Action Panel) | Two surfaces (search vs slash) | Mostly chat-focused | **Single tier in v0.4**; two-tier (DF-02) deferred to v0.5+ |
| **Inline edit pattern** | Single-key in nav mode (S/P/A/L), Esc clears | Mostly clicks; few inline keys | Action Panel ⌘K | Slash menu, hover handle, Tab nest | (chat-only) | **Two-mode**: nav mode j/k/d/a/digit; edit mode Tab/Enter/Esc; drag handle on hover |
| **Reorder** | Drag in list views | n/a | Sub-menu | Hold + arrow / drag + Option duplicate | n/a | **Drag + number keys** (DF-07); Option-drag dup (Notion-style) — P2 |
| **URL state for views** | `?filter=` + path | `/[team]/[project]/deployments` | n/a (desktop app) | `?v=…` per view | n/a | **Path for step, nuqs search-params for ephemeral selection** |
| **Streaming cue** | n/a | n/a | n/a | n/a | Blinking cursor, "typing", stop button | **Blinking cursor + token-rate + cost meter + stop** |
| **Creative semantic controls** | n/a | n/a | n/a | n/a | (free-form prompt) | **Sliders + dropdowns** (Sudowrite-style curated, not NovelAI-raw) |
| **Diff for long text** | n/a | n/a | n/a | (revision history, version names) | (chat regen) | **Three-layer LCS already shipped**; v0.4 adds annotation UI on top — P2 |
| **Empty states** | Self-diagnosing (filter chips removable) | Strategic restraint | Action panel suggestions | Onboarding-as-empty-state | "Ask a question" | **Per-step, action-oriented copy, next-step CTA inline** |

## Library / Tooling Decisions (Verified)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `cmdk` | 1.1.1 | Headless command palette (powers Linear, Raycast, used via Shadcn Command) | [VERIFIED: npm registry] — already vendored via Shadcn `command` in repo |
| `nuqs` | 2.8.9 | Type-safe Next App Router search-params state for ephemeral UI state | [VERIFIED: npm registry] — recommended for TS-16 |
| `@radix-ui/react-collapsible` | 1.1.12 | Collapsible disclosures (already used in `app-nav.tsx`) | [VERIFIED: per v0.3 Phase 4 research] — reuse |
| Shadcn `Command` | (repo) | Pre-wired cmdk wrapper with Tailwind | Already in repo; use as base for TS-01 |
| Shadcn `Sheet` / `Dialog` | (repo) | Palette portal container | Already in repo |
| `sonner` | (repo) | Toast (streaming errors, stop confirmation) | Already in repo |

**Hand-rolling rejection list:**

| Don't build | Use | Why |
|-------------|-----|-----|
| Custom keyboard event handlers for global ⌘K | cmdk's built-in `useKey` + focus management | A11y, focus traps, ARIA — too easy to mis-implement |
| URLSearchParams + useEffect synchronization | `nuqs` | Boilerplate, type safety, well-tested |
| Custom fuzzy search | cmdk's `command-score` (built in) | Battle-tested ranking |
| Wizard step state in `useState` + page-level provider | Next App Router segment routes | Refresh/share/back-button correctness |
| Custom diff renderer | v0.3 three-layer LCS engine (already in repo) | Don't re-solve a shipped problem |
| Custom skeleton component | Existing `PageLoadingShell` + per-step variants | Consistency with v0.3 |

## Implementation Notes — Per Feature

### TS-01 ⌘K command palette

- Mount once at root layout level (above route layouts) so it's available on every route.
- Use Shadcn `Command` (wraps `cmdk@1.1.1`); place in a `Dialog` portal so it overlays cleanly above any in-page modal.
- Global keydown handler: `(e.metaKey || e.ctrlKey) && e.key === 'k'` → `e.preventDefault()` → toggle open.
- Item groups: **Navigation** (top-level routes), **Recent sessions** (last 5 from localStorage), **Actions** (context-aware per-route subset).
- Initial render: when query is empty, show "Recent" + top-level navigation. When query non-empty, hide "Recent" and let fuzzy match drive.
- Return focus to triggering element on close (cmdk does this automatically if used correctly).

### TS-06 Path-segment workbench step routing

- Convert current step state from in-component to Next.js segment route:
  - `/sessions/[id]/workbench` → redirect to current default step
  - `/sessions/[id]/workbench/upload`
  - `/sessions/[id]/workbench/analyze`
  - `/sessions/[id]/workbench/blueprint` (or `compare`, depending on existing naming)
  - `/sessions/[id]/workbench/generate`
- Each step gets its own `page.tsx` (or `layout.tsx` for shared chrome) and its own `loading.tsx` skeleton.
- Programmatic step transitions use `router.push` (full navigation, triggers loading.tsx) **not** `window.history.pushState` — because we want server data to refresh between steps.
- Use `window.history.replaceState` only for true in-step micro-state (e.g., which blueprint card is expanded).

### DF-03 Semantic creative-brief controls (the differentiator)

Replace **one freeform panel at a time**; not all four at once. Start with the highest-value:

| Control | Type | Values | Maps to (existing brief field) |
|---------|------|--------|--------------------------------|
| 感官密度 / sensory_density | Slider (3-stop) | 低 / 中 / 高 | persona/style — sensory description weight |
| 行文语域 / prose_register | Dropdown | 口语化 / 现代书面 / 古典文言 / 文白互见 | style — register/diction |
| 节奏 / pacing | Slider (3-stop) | 慢 / 中 / 快 | plot — beat density |
| 叙事人称 / pov | Dropdown | 第一人称限知 / 第三人称限知 / 全知 | persona — POV |
| 角色名 preserve | Toggle per character | on/off | constraints — character-name lock |
| 情节锚点 plot_anchors preserve | Toggle per anchor | on/off | constraints — plot-event lock |

- Each control serializes to a JSON value the existing Zod schema accepts (additive, no schema break).
- Below the curated controls, keep a collapsed "自由备注" textarea for things the curated controls can't capture.
- "Reset to suggested" button per control populates from the blueprint analyzer's recommendations.

### DF-04 Streaming dual-pane

| Pane | Content | Sticky? |
|------|---------|---------|
| **Left (1/3 to 1/2 width)** | Current blueprint summary (collapsed sections, only relevant sections expanded per current generation step) + original chapter text being rewritten | Yes, scrollable independent |
| **Right (the rest)** | Streaming output of new chapter variant + cost meter pill + token rate pill + stop button (sticky top-right) | Yes, scrollable independent; auto-scroll to bottom while streaming unless user has scrolled up |

- Auto-scroll lock: if user scrolls up during stream, pause auto-scroll; resume when user returns to within ~100px of bottom.
- Stop button teardown checklist (per Smashing Magazine 2026 patterns): cancel abort controller → clear RAF buffer → remove cursor element → set `isStreaming=false` → flip button state.

### TS-13 + DF-07 Inline-edit two-mode keyboard contract

Define explicit modes:

| Mode | Active when | Reserved keys |
|------|------------|---------------|
| **List mode** | Card focused, no text input focused | `j/k` (down/up), `d` (delete with confirm), `a` (add below), `Enter` (enter edit mode), `1-9` (move to position), `?` (help) |
| **Edit mode** | Text input focused within card | `Esc` (commit + exit to list mode), `Tab` (commit + next field), `Shift+Tab` (commit + prev field), all printables typing |

- **Hard rule:** Single-letter shortcuts (`j/k/d/a/digit`) **never** fire when any input is focused. Linear's contract verbatim.
- Drag handle on hover (Notion-style ⋮⋮) for mouse users; same reorder result.
- Live region announcement on reorder: "已移至第 3 位，共 7 项" (Atlassian / Smashing Mag pattern).

### TS-09 Empty-state copy guide (active voice)

| Surface | OLD (passive) | NEW (active) |
|---------|---------------|--------------|
| Sessions list | 暂无项目 | 创建第一个双书项目 |
| Workbench upload (empty) | 还没有上传文件 | 拖入双书 .txt 文件开始 |
| Workbench analyze (no chapters yet) | 暂无章节 | 运行批量分析 |
| Workbench blueprint (no draft) | 暂无蓝图 | 从分析生成蓝图草稿 |
| Workbench generate (no variants) | 暂无生成 | 生成第一个变体 |
| Variants list | 暂无变体 | 生成新版本 |

## Sources

### Primary (HIGH confidence — official docs or design-system specs)

- [Vercel Geist Command Menu](https://vercel.com/geist/command-menu) — design system spec
- [Vercel Command Menu docs](https://vercel.com/docs/concepts/dashboard-features/command-menu) — ⌘K behavior, ⌘+Shift+K escalation
- [Linear keyboard shortcuts](https://keycombiner.com/collections/linear/) and [Linear shortcuts.design](https://shortcuts.design/tools/toolspage-linear/) — canonical key reference
- [Linear "Invisible details" by andreas eldh](https://medium.com/linear-app/invisible-details-2ca718b41a44) — design philosophy of dual-input (mouse + keyboard)
- [Raycast Manual — Action Panel](https://manual.raycast.com/action-panel) — two-tier palette architecture
- [Notion keyboard shortcuts](https://www.notion.com/help/keyboard-shortcuts) — block reorder, drag handle, Tab nesting
- [Airtable keyboard shortcuts](https://support.airtable.com/docs/airtable-keyboard-shortcuts) — two-mode (navigation/edit) keyboard contract
- [cmdk by Paco Coursey](https://cmdk.paco.me/) — headless palette primitive (powers Linear/Raycast)
- [Shadcn Command](https://www.shadcn.io/ui/command) — repo-vendored cmdk wrapper
- [Next.js App Router: searchParams](https://nextjs.org/docs/app/getting-started/linking-and-navigating) — official URL state APIs
- [Supabase Design System empty states](https://supabase-design-system.vercel.app/design-system/docs/ui-patterns/empty-states) — active-voice copy guide

### Secondary (MEDIUM confidence — verified industry analysis)

- [Designing Stable Interfaces For Streaming Content — Smashing Magazine 2026](https://www.smashingmagazine.com/2026/05/designing-stable-interfaces-streaming-content/) — stop button teardown patterns, Markdown re-render buffering, prefers-reduced-motion
- [What Is Streaming UI in AI Applications — TheFrontKit](https://thefrontkit.com/blogs/what-is-streaming-ui-in-ai-applications) — typing indicator, isStreaming state
- [How to build a remarkable command palette — Superhuman](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/) — design tradeoffs
- [Skeleton Screens vs Loading Spinners — Onething Design](https://www.onething.design/post/skeleton-screens-vs-loading-spinners), [Productboard Engineering 300ms/1.5s thresholds](https://medium.com/productboard-engineering/%EF%B8%8F-spinners-versus-skeletons-in-the-battle-of-hasting-b51b9c6574ef)
- [SaaS Empty State Design — Pixxen](https://pixxen.com/saas-empty-state-design/), [Eleken empty state UX rules](https://www.eleken.co/blog-posts/empty-state-ux)
- [Sudowrite Tone Shift + Creativity Slider](https://sudowrite.com/blog/sudowrite-vs-novelai-the-no-bs-guide-for-fiction-writers/) — fiction-tool semantic control patterns
- [Midjourney V7 parameters guide](https://blakecrosley.com/guides/midjourney) — slider vs flag UI tension
- [TanStack Router URL-as-state discussion](https://github.com/TanStack/router/discussions/1249) — wizard step in path, form values in local state
- [nuqs library docs](https://nuqs.47ng.com/) — Next App Router search-param state
- [Your URL Is Your State — Ahmad Alfy](https://alfy.blog/2025/10/31/your-url-is-your-state.html) — path vs query decision framework
- [Notion drag + Option-duplicate](https://www.notion.com/help/writing-and-editing-basics) — reorder + modifier pattern
- [Salesforce Designer — Accessible drag-and-drop patterns](https://medium.com/salesforce-ux/4-major-patterns-for-accessible-drag-and-drop-1d43f64ebf09) — keyboard + drag pairing

### Tertiary (informational — broader context)

- [SaaSUI Linear Empty State pattern](https://www.saasui.design/pattern/empty-state/linear)
- [revdiff](https://github.com/umputun/revdiff) and [tuicr](https://github.com/agavra/tuicr) — prose review UX (range comments, classifications)
- [Scrivener Split-Screen for fiction](https://writersinthestormblog.com/2019/03/scrivener-split-screen-magic/) — closest creative-tool dual-pane analog
- [Cursor IDE bug reports](https://forum.cursor.com/) — real-world failure modes of naive streaming/stop

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Shadcn `Command` is already vendored in the repo (per v0.4 PROJECT.md stating Shadcn + Tailwind stack unchanged) | TS-01 implementation | Adds one install step; not load-bearing |
| A2 | Current `workbench-client.tsx` uses in-component step state, not URL state | TS-06 cost estimate | Confirmed by v0.3 Phase 4 research; would be confirmed by grep before plan |
| A3 | The blueprint Zod schema can absorb DF-03 semantic-control outputs via additive optional fields (no schema break) | DF-03 feasibility | If schema is rigid, DF-03 needs a separate "brief preferences" object stored alongside blueprint |
| A4 | Existing SSE generation infrastructure exposes an `AbortController` or equivalent for stop-button wiring | TS-11 / DF-04 | If not, stop button requires server-side cancellation route (small extra work) |
| A5 | Users tolerate one freeform-textarea-to-semantic-controls migration at a time (incremental DF-03 rollout) rather than full swap | DF-03 scope | Could pull more into v0.4 if user signal demands; defer is the safer default |
| A6 | Chinese-prose chapter sizes (3-10k characters) are well-served by paragraph-anchored diff (not sentence- or character-anchored) | AF-09 | v0.3 LCS engine operates at sentence + paragraph + chapter — if QLT-02 UAT shows users want sentence-level review, revisit in v0.4.x |
| A7 | "Single ⌘K entry, no ⌘P split" is the right call for a non-IDE creator tool | Competitor analysis | Vercel/Linear validate this; if user testing shows confusion, can add ⌘P → file-style search in v0.4.x |
| A8 | `nuqs@2.8.9` is the right ergonomics for ephemeral URL state in this codebase | TS-16 | Alternative is manual `useSearchParams` + `router.push` — works but more boilerplate |

## Open Questions

1. **Should the palette ship with action-execution items at v0.4 launch, or navigation-only?**
   - What we know: Vercel ⌘K mixes both; Linear ⌘K is heavily action-oriented for issues.
   - What's unclear: Which actions on the dual-book workflow are high-frequency enough to deserve top-level palette slots (vs. living in their natural surface).
   - Recommendation: **Launch with navigation + 4-6 high-frequency actions** ("Confirm blueprint", "Generate new variant", "Open last session", "Open settings"). Add more from telemetry. Defer DF-01 full context-awareness to v0.4.x.

2. **DF-03 rollout order — which freeform panel migrates first?**
   - What we know: Creative brief has 4 panels (persona / plot / style / constraints).
   - What's unclear: Which has the highest "vague freeform → concrete control" leverage.
   - Recommendation: **Start with style** (sensory density + prose register + pacing) — this is where users most often write "make it more X" and the dropdown/slider model maps cleanest. Persona POV is the second wave. Constraints toggles can ride alongside if cheap.

3. **Streaming dual-pane: what stays sticky as the user scrolls?**
   - What we know: Auto-scroll-lock-on-user-scroll is the consensus pattern.
   - What's unclear: Whether the cost meter / stop button should be sticky to viewport (always visible) or sticky to pane top (scrolls with pane).
   - Recommendation: **Cost meter + stop button sticky to viewport top-right corner of the right pane.** Always one click/keystroke away.

4. **Inline diff annotation persistence (DF-05 P2 question)**
   - What we know: Range comments + classifications are the right model.
   - What's unclear: Whether annotations persist across regen, or expire when a new variant supersedes.
   - Recommendation: Defer; tie to QLT UAT in v0.4 to see if users even reach for this. Default expectation: annotations belong to the (variant, chapter) pair and don't carry to new variants.

5. **Power-user discoverability of new key contracts**
   - What we know: `?` shortcut help is table stakes (TS-05).
   - What's unclear: First-time visibility — do we ever show a "press ⌘K to get started" hint, or trust the cohort to discover?
   - Recommendation: **One-shot hint on first sessions list visit after v0.4 deploy** (`localStorage` flag), with a "Don't show again" link. No persistent hint pill.

---
*Feature research for: v0.4 UX Foundation — power-user UX layer on top of existing dual-book novel-variant workflow*
*Researched: 2026-05-26*
