# Phase 2: 极简设计契约 — Pattern Map

**Mapped:** 2026-05-26  
**Files analyzed:** 6 deliverables  
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `02-UI-SPEC.md` | doc / design contract | transform (CONTEXT+audit → SPEC) | Phase 1 `01-UI-REVIEW.md` structure | role-match |
| `src/app/globals.css` | style / SSOT | config | existing `:root` + `.surface-*` | exact |
| `src/lib/theme-tokens.ts` | config / TS mirror | config | `COLOR_TOKENS` array | exact |
| `design-system-client.tsx` | UI / reference | display | existing 16 SECTIONS | exact |
| `02-RESEARCH.md` | doc / research | — | `01-RESEARCH.md` | exact |

**Out of scope:** `app-nav`, `workbench-client`, route behavior (Phase 3–4).

---

## Pattern: Token dual-write

**Analog:** `globals.css` line 11 comment + `theme-tokens.ts` line 1

```typescript
/** Keep in sync with `src/app/globals.css` `:root` tokens. */
export const COLOR_TOKENS: ColorToken[] = [ ... ];
```

**Rule:** Every new CSS variable → add `COLOR_TOKENS` row + design-system swatch.

---

## Pattern: Surface utilities

**Analog:** `globals.css` `.surface-panel` / `.surface-subtle` / `.surface-locked`

**Phase 2 change:** `rounded-[6px]` → `rounded-[var(--radius-md)]` or `rounded-md` mapped to 5px token (D-16).

---

## Pattern: Plan document frontmatter

**Analog:** `01-01-PLAN.md` — `must_haves.truths`, `requirements`, `wave`, `depends_on`

---

## Pattern: UI-SPEC section template

**Analog:** design-system `SECTIONS` array — 1:1 map per RESEARCH alignment table.
