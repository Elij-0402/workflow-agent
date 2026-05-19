# Approach B chunking spike

Throwaway prototype to test whether chapter-aware chunking + map-reduce aggregation can produce a 3-dimension report on a full-length 网文 within the design doc's pass criteria. **This is a SPIKE.** It is not wired into the app, hits no Supabase tables, and writes nothing under `src/`. Output goes to `runs/<timestamp>/` and is gitignored.

## Why this exists

`/autoplan` Phase 1 flagged F4 (HIGH): Approach A as designed claims 30-50% coverage of 起点 完本. Reality is worse — `ANALYSIS_TEXT_CHAR_LIMIT = 80_000` in `src/lib/prompts/index.ts:13` means the production pipeline truncates *every* novel to its first 80k chars (~5% of a 500万字 巨著). The revised design doc needs an Approach B verdict (proven / disproven / deferred-with-reason) before it can credibly pick a path forward.

This spike answers: can chunking + map-reduce ship a 3-dim report on a 500万字 玄幻 巨著 within the budget?

## Pass criteria

A run on one 500万字 玄幻 巨著 must satisfy ALL:

- **Wall-clock**: full pipeline (clean → chunk → extract → aggregate → summarize) finishes within **10 minutes**.
- **Cost**: total BYOK spend **< ¥5** (≈ $0.70).
- **Schema validity**: final output matches `WorldviewResultSchema`, `CharactersResultSchema`, `NarrativeResultSchema` from `src/lib/types.ts` (the production contract).
- **Quality**: when run alongside `--compare` (Approach A on the same novel, truncated to 80k chars), the chunked report should mention ≥ 5 characters / locations / themes that Approach A missed (because A only saw the first ~5%).

If wall-clock > 10 min or cost > ¥5 → Approach B disproven at current model/price tier. If schema fails → architecture broken. If quality delta is null → chunking added cost for no value.

## How to run

### 1. Configure env

Add to `.env.local` (already gitignored):

```
SPIKE_BASE_URL=https://api.deepseek.com/v1
SPIKE_API_KEY=<your DeepSeek key>
SPIKE_MODEL=deepseek-chat
SPIKE_CONCURRENCY=10
SPIKE_CHUNK_CHARS=85000
```

DeepSeek is the recommended provider for the spike — cheapest OpenAI-compatible endpoint that handles Chinese well, and the only one that fits the ¥5 cost target for 500万字. OpenAI works (swap `SPIKE_BASE_URL` and `SPIKE_MODEL`) but will blow the budget by ~10x.

### 2. Drop a test novel

Anywhere on disk. `.txt` only. UTF-8 or GB18030 (decoder handles both via `src/lib/text/decode.ts`).

### 3. Run

```bash
# Chunked Approach B only
npx tsx scripts/spike-chunking/index.ts --novel "C:/path/to/novel.txt"

# Side-by-side: Approach B + Approach A (truncated 80k) on the same novel
npx tsx scripts/spike-chunking/index.ts --novel "C:/path/to/novel.txt" --compare

# Dry-run (chunking + cost estimate only, no LLM calls)
npx tsx scripts/spike-chunking/index.ts --novel "C:/path/to/novel.txt" --dry-run
```

### 4. Read the output

Each run writes to `runs/<YYYYMMDD-HHMMSS>/`:

- `report.json` — final `{ worldview, characters, narrative }` matching production schemas
- `report.md` — same data rendered as readable Markdown
- `metrics.json` — wall-clock, tokens in/out, cost estimate, per-chunk timings
- `verdict.md` — PASS / FAIL / DEFER with reasons against the four criteria above
- `compare/` — present only with `--compare`: `approach-a.json`, `approach-a.md`, `delta.md` (what B caught that A missed)

## Architecture

```
.txt → decodeNovelBuffer (src/lib/text/decode.ts)
     → cleanNovelText (src/lib/text/clean.ts) → ChapterMeta[]
     → groupIntoChunks (chunker.ts) → Chunk[] (~85k chars each, chapter-aligned)
     → extractChunk × N in parallel (extract.ts) → PerChunkExtract[]
     → merge* deterministic (aggregate.ts) → structured stubs
     → summarize* × 3 final LLM calls (aggregate.ts) → WorldviewResult / CharactersResult / NarrativeResult
     → write artifacts
```

Map-reduce, not single-call. **Per-chunk extraction uses a smaller schema** (entities + events + beats per chunk) so individual calls fit easily inside DeepSeek's 64k context. Aggregation is deterministic JS (dedupe, sort, top-N) — no LLM. Only the final per-dimension summary uses an LLM call to write coherent prose.

## What this spike is NOT

- Not production code. Will be deleted (`runs/` retained for the design doc revision) after the verdict is recorded.
- Not wired to Supabase. Reads from disk, writes to disk.
- Not feature-complete. Does not handle: multi-file novels, mid-chapter chunking when chapters exceed `SPIKE_CHUNK_CHARS`, character disambiguation across pen-names.

## Deletion plan

After the design doc revision records the verdict (Step 3 of `C:\Users\Elij\.claude\plans\elegant-napping-hennessy.md`), this directory can be removed:

```bash
git rm -r scripts/spike-chunking
```

Or kept under `scripts/` as a reference if Approach B enters scope. Decision goes in the revised design doc.
