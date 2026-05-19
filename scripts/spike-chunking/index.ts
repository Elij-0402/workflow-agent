/* eslint-disable no-console */
import { promises as fs } from "node:fs";
import path from "node:path";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

import { decodeNovelBuffer } from "../../src/lib/text/decode";
import { cleanNovelText } from "../../src/lib/text/clean";
import {
  ANALYSIS_DIMENSION_CONFIG,
  ANALYSIS_TEXT_CHAR_LIMIT,
} from "../../src/lib/prompts";
import { ANALYSIS_DIMENSIONS, type AnalysisDimension } from "../../src/lib/types";

import { aggregateAndSummarize, type AggregateResult } from "./aggregate";
import { groupIntoChunks } from "./chunker";
import { extractChunk, runWithConcurrency } from "./extract";
import {
  DEFAULT_PRICE_TABLE,
  type ChunkResult,
  type Metrics,
  type SpikeConfig,
  type Verdict,
} from "./types";

const PASS_WALL_CLOCK_MS = 10 * 60 * 1000; // 10 minutes
const PASS_COST_CNY = 5; // ¥5
const USD_TO_CNY = 7.1; // rough conversion for spike telemetry; not load-bearing

async function main() {
  const config = await loadConfig();
  console.log(banner(config));

  const novelBuffer = await fs.readFile(config.novelPath);
  const { text: decoded, encoding } = decodeNovelBuffer(novelBuffer);
  const cleaned = cleanNovelText(decoded);

  console.log(
    `📖 novel decoded (encoding=${encoding}) | chars=${cleaned.cleaned.length.toLocaleString()} | chapters=${cleaned.chapters.length}`
  );

  const chunks = groupIntoChunks({
    cleaned: cleaned.cleaned,
    chapters: cleaned.chapters,
    chunkChars: config.chunkChars,
  });
  console.log(
    `🧩 chunked into ${chunks.length} pieces (avg ${Math.round(
      chunks.reduce((s, c) => s + c.charCount, 0) / Math.max(1, chunks.length)
    ).toLocaleString()} chars/chunk)`
  );

  const priceRow =
    pricingFor(config.model) ?? {
      inPerM: Number(process.env.SPIKE_PRICE_IN_PER_M ?? "1"),
      outPerM: Number(process.env.SPIKE_PRICE_OUT_PER_M ?? "2"),
    };
  const estimatedInputTokens = chunks.reduce(
    (s, c) => s + Math.ceil(c.charCount * 1.1), // 1 tok ≈ 1 char for Chinese with safety margin
    0
  );
  const estimatedOutputTokens = chunks.length * 1500 + 3 * 1500; // per-chunk + 3 summaries, rough
  const estimatedCostUsd =
    (estimatedInputTokens * priceRow.inPerM +
      estimatedOutputTokens * priceRow.outPerM) /
    1_000_000;

  console.log(
    `💰 estimated: ~${estimatedInputTokens.toLocaleString()} input tok + ~${estimatedOutputTokens.toLocaleString()} output tok ≈ $${estimatedCostUsd.toFixed(3)} ≈ ¥${(estimatedCostUsd * USD_TO_CNY).toFixed(2)}`
  );

  if (config.dryRun) {
    console.log("\n🛑 --dry-run: skipping LLM calls. Plan + cost estimate above.");
    return;
  }

  if (estimatedCostUsd * USD_TO_CNY > 2 * PASS_COST_CNY) {
    console.log(
      `\n⚠️  Estimated cost exceeds 2× pass threshold (>¥${2 * PASS_COST_CNY}). Aborting. ` +
        `Use --dry-run first, switch to a cheaper model (DeepSeek), or shorten the novel.`
    );
    process.exit(2);
  }

  const openai = createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    compatibility: "compatible",
  });

  const wallStart = Date.now();
  const startedAt = new Date().toISOString();

  console.log(
    `\n🔄 extracting chunks (concurrency=${config.concurrency})...`
  );
  const chunkResults: ChunkResult[] = await runWithConcurrency({
    items: chunks,
    concurrency: config.concurrency,
    worker: (chunk) => extractChunk({ openai, model: config.model, chunk }),
    onProgress: (done, total) => {
      const pct = Math.round((done / total) * 100);
      process.stdout.write(`\r   progress: ${done}/${total} (${pct}%)   `);
    },
  });
  process.stdout.write("\n");

  console.log(`✅ extraction complete in ${formatMs(Date.now() - wallStart)}`);

  console.log(`\n🧮 aggregating + summarizing 3 dimensions...`);
  const aggregateStart = Date.now();
  const aggregate = await aggregateAndSummarize({
    openai,
    model: config.model,
    chunks: chunkResults,
  });
  console.log(
    `✅ aggregation complete in ${formatMs(Date.now() - aggregateStart)}`
  );

  const totalPromptTokens =
    chunkResults.reduce((s, c) => s + c.promptTokens, 0) +
    aggregate.summaryUsage.worldview.promptTokens +
    aggregate.summaryUsage.characters.promptTokens +
    aggregate.summaryUsage.narrative.promptTokens;
  const totalCompletionTokens =
    chunkResults.reduce((s, c) => s + c.completionTokens, 0) +
    aggregate.summaryUsage.worldview.completionTokens +
    aggregate.summaryUsage.characters.completionTokens +
    aggregate.summaryUsage.narrative.completionTokens;
  const actualCostUsd =
    (totalPromptTokens * priceRow.inPerM +
      totalCompletionTokens * priceRow.outPerM) /
    1_000_000;
  const wallClockMs = Date.now() - wallStart;
  const finishedAt = new Date().toISOString();

  const metrics: Metrics = {
    novelPath: config.novelPath,
    novelChars: cleaned.cleaned.length,
    novelChapters: cleaned.chapters.length,
    chunks: chunks.length,
    chunkChars: config.chunkChars,
    model: config.model,
    baseUrl: config.baseUrl,
    concurrency: config.concurrency,
    wallClockMs,
    totalPromptTokens,
    totalCompletionTokens,
    estimatedCostUsd: actualCostUsd,
    estimatedCostCny: actualCostUsd * USD_TO_CNY,
    perChunkMs: chunkResults.map((c) => c.durationMs),
    failedChunks: [],
    startedAt,
    finishedAt,
  };

  await fs.mkdir(config.outDir, { recursive: true });

  let approachAResult: AggregateResult | null = null;
  let approachACost = 0;
  if (config.compare) {
    console.log(
      `\n🆎 --compare: running Approach A on first ${ANALYSIS_TEXT_CHAR_LIMIT.toLocaleString()} chars...`
    );
    const aResult = await runApproachA({
      openai,
      model: config.model,
      cleaned: cleaned.cleaned,
    });
    approachAResult = aResult.result;
    approachACost =
      (aResult.usage.promptTokens * priceRow.inPerM +
        aResult.usage.completionTokens * priceRow.outPerM) /
      1_000_000;
    await fs.mkdir(path.join(config.outDir, "compare"), { recursive: true });
    await fs.writeFile(
      path.join(config.outDir, "compare", "approach-a.json"),
      JSON.stringify(approachAResult, null, 2),
      "utf-8"
    );
    await fs.writeFile(
      path.join(config.outDir, "compare", "approach-a.md"),
      renderReportMarkdown(approachAResult, "Approach A (truncated 80k chars)"),
      "utf-8"
    );
    await fs.writeFile(
      path.join(config.outDir, "compare", "delta.md"),
      renderDeltaMarkdown(aggregate, approachAResult),
      "utf-8"
    );
    console.log(
      `   Approach A cost: $${approachACost.toFixed(3)} ≈ ¥${(approachACost * USD_TO_CNY).toFixed(2)}`
    );
  }

  await fs.writeFile(
    path.join(config.outDir, "report.json"),
    JSON.stringify(
      {
        worldview: aggregate.worldview,
        characters: aggregate.characters,
        narrative: aggregate.narrative,
      },
      null,
      2
    ),
    "utf-8"
  );
  await fs.writeFile(
    path.join(config.outDir, "report.md"),
    renderReportMarkdown(aggregate, "Approach B (chunked)"),
    "utf-8"
  );
  await fs.writeFile(
    path.join(config.outDir, "metrics.json"),
    JSON.stringify(metrics, null, 2),
    "utf-8"
  );

  const verdict = computeVerdict({
    metrics,
    qualityCompared: Boolean(approachAResult),
    qualityDeltaPassed: approachAResult
      ? computeQualityDelta(aggregate, approachAResult).bMinusA >= 5
      : null,
  });
  await fs.writeFile(
    path.join(config.outDir, "verdict.md"),
    renderVerdictMarkdown(verdict, metrics, approachACost),
    "utf-8"
  );

  console.log(`\n${verdictBanner(verdict, metrics, approachACost)}`);
  console.log(`\n📁 artifacts: ${config.outDir}`);
}

// ---------------------------------------------------------------------------
// Approach A (truncated) — for --compare mode. Uses production prompts + schemas.
// ---------------------------------------------------------------------------

async function runApproachA(args: {
  openai: ReturnType<typeof createOpenAI>;
  model: string;
  cleaned: string;
}) {
  const excerpt = args.cleaned.slice(0, ANALYSIS_TEXT_CHAR_LIMIT);
  const usage = { promptTokens: 0, completionTokens: 0 };
  const out: Partial<{
    worldview: unknown;
    characters: unknown;
    narrative: unknown;
  }> = {};

  for (const dimension of ANALYSIS_DIMENSIONS as AnalysisDimension[]) {
    const cfg = ANALYSIS_DIMENSION_CONFIG[dimension];
    const result = await generateObject({
      model: args.openai(args.model),
      schema: cfg.schema,
      system: cfg.systemPrompt,
      prompt: excerpt,
      temperature: 0.3,
      maxTokens: 4096,
    });
    out[dimension] = result.object;
    usage.promptTokens += result.usage.promptTokens ?? 0;
    usage.completionTokens += result.usage.completionTokens ?? 0;
  }

  return {
    result: out as AggregateResult,
    usage,
  };
}

// ---------------------------------------------------------------------------
// Rendering.
// ---------------------------------------------------------------------------

function renderReportMarkdown(
  data: AggregateResult | unknown,
  title: string
): string {
  const d = data as AggregateResult; // shape is identical for compare
  return [
    `# ${title}`,
    "",
    "## 世界观",
    "",
    `- **类型**: ${safe(d.worldview?.type)}`,
    `- **背景**: ${safe(d.worldview?.setting)}`,
    `- **动力体系**: ${safe(d.worldview?.power_system) || "(未列出)"}`,
    "",
    "### 主要地点",
    "",
    ...(d.worldview?.locations?.map(
      (loc) => `- **${loc.name}** _(重要度: ${loc.importance})_: ${loc.description}`
    ) ?? []),
    "",
    "### 世界法则",
    "",
    ...(d.worldview?.rules?.map((r) => `- ${r}`) ?? []),
    "",
    `**摘要**: ${safe(d.worldview?.summary)}`,
    "",
    "## 人物",
    "",
    ...(d.characters?.characters?.flatMap((c) => [
      `### ${c.name} _(${c.role})_`,
      `- **特质**: ${c.traits?.join("、") ?? ""}`,
      `- **背景**: ${safe(c.background)}`,
      `- **描述**: ${safe(c.description)}`,
      "",
    ]) ?? []),
    "### 人物关系",
    "",
    ...(d.characters?.relationships?.map(
      (r) => `- ${r.from} → ${r.to} (${r.type}): ${r.description}`
    ) ?? []),
    "",
    `**人物摘要**: ${safe(d.characters?.summary)}`,
    "",
    "## 叙事",
    "",
    `- **结构**: ${safe(d.narrative?.structure)}`,
    `- **视角**: ${safe(d.narrative?.viewpoint)}`,
    `- **节奏**: ${safe(d.narrative?.pacing)}`,
    "",
    "### 主题",
    ...(d.narrative?.themes?.map((t) => `- ${t}`) ?? []),
    "",
    "### 转折点",
    ...(d.narrative?.turning_points?.map(
      (tp) => `- **${tp.title}** _(冲击力 ${tp.impact}/10)_: ${tp.description}`
    ) ?? []),
    "",
    "### 核心冲突",
    ...(d.narrative?.conflicts?.map((c) => `- ${c}`) ?? []),
    "",
    `**叙事摘要**: ${safe(d.narrative?.summary)}`,
    "",
  ].join("\n");
}

function renderDeltaMarkdown(
  approachB: AggregateResult,
  approachA: AggregateResult
): string {
  const aChars = new Set(approachA.characters.characters.map((c) => c.name));
  const bChars = new Set(approachB.characters.characters.map((c) => c.name));
  const aLocs = new Set(approachA.worldview.locations.map((l) => l.name));
  const bLocs = new Set(approachB.worldview.locations.map((l) => l.name));
  const aThemes = new Set(approachA.narrative.themes);
  const bThemes = new Set(approachB.narrative.themes);

  const bOnlyChars = [...bChars].filter((c) => !aChars.has(c));
  const aOnlyChars = [...aChars].filter((c) => !bChars.has(c));
  const bOnlyLocs = [...bLocs].filter((l) => !aLocs.has(l));
  const aOnlyLocs = [...aLocs].filter((l) => !bLocs.has(l));
  const bOnlyThemes = [...bThemes].filter((t) => !aThemes.has(t));
  const aOnlyThemes = [...aThemes].filter((t) => !bThemes.has(t));

  const delta = computeQualityDelta(approachB, approachA);

  return [
    "# Delta: Approach B vs Approach A",
    "",
    `B-only count − A-only count = **${delta.bMinusA}** (pass threshold: ≥ 5)`,
    "",
    `B caught (A missed): ${delta.bOnly} items.`,
    `A caught (B missed): ${delta.aOnly} items.`,
    "",
    "## 人物",
    "",
    `### Only in Approach B (${bOnlyChars.length})`,
    ...bOnlyChars.map((c) => `- ${c}`),
    "",
    `### Only in Approach A (${aOnlyChars.length})`,
    ...aOnlyChars.map((c) => `- ${c}`),
    "",
    "## 地点",
    "",
    `### Only in Approach B (${bOnlyLocs.length})`,
    ...bOnlyLocs.map((l) => `- ${l}`),
    "",
    `### Only in Approach A (${aOnlyLocs.length})`,
    ...aOnlyLocs.map((l) => `- ${l}`),
    "",
    "## 主题",
    "",
    `### Only in Approach B (${bOnlyThemes.length})`,
    ...bOnlyThemes.map((t) => `- ${t}`),
    "",
    `### Only in Approach A (${aOnlyThemes.length})`,
    ...aOnlyThemes.map((t) => `- ${t}`),
    "",
  ].join("\n");
}

function computeQualityDelta(b: AggregateResult, a: AggregateResult) {
  const aChars = new Set(a.characters.characters.map((c) => c.name));
  const bChars = new Set(b.characters.characters.map((c) => c.name));
  const aLocs = new Set(a.worldview.locations.map((l) => l.name));
  const bLocs = new Set(b.worldview.locations.map((l) => l.name));
  const aThemes = new Set(a.narrative.themes);
  const bThemes = new Set(b.narrative.themes);
  const bOnly =
    [...bChars].filter((c) => !aChars.has(c)).length +
    [...bLocs].filter((l) => !aLocs.has(l)).length +
    [...bThemes].filter((t) => !aThemes.has(t)).length;
  const aOnly =
    [...aChars].filter((c) => !bChars.has(c)).length +
    [...aLocs].filter((l) => !bLocs.has(l)).length +
    [...aThemes].filter((t) => !bThemes.has(t)).length;
  return { bOnly, aOnly, bMinusA: bOnly - aOnly };
}

function renderVerdictMarkdown(
  verdict: Verdict,
  metrics: Metrics,
  approachACost: number
): string {
  return [
    `# Spike B verdict: ${verdict.status}`,
    "",
    `Generated: ${metrics.finishedAt}`,
    `Novel: \`${metrics.novelPath}\` (${metrics.novelChars.toLocaleString()} chars / ${metrics.novelChapters} chapters)`,
    "",
    "## Pass criteria",
    "",
    `- Wall-clock ≤ 10 min: **${verdict.wallClockOk ? "PASS" : "FAIL"}** (actual: ${formatMs(metrics.wallClockMs)})`,
    `- Cost ≤ ¥5: **${verdict.costOk ? "PASS" : "FAIL"}** (actual: ¥${metrics.estimatedCostCny.toFixed(2)} ≈ $${metrics.estimatedCostUsd.toFixed(3)})`,
    `- Schema valid: **${verdict.schemaOk ? "PASS" : "FAIL"}** (zod-validated by \`generateObject\`)`,
    `- Quality delta (B-only ≥ 5 more than A-only): **${verdict.qualityOk === "skipped" ? "SKIPPED (no --compare)" : verdict.qualityOk ? "PASS" : "FAIL"}**`,
    approachACost > 0
      ? `\n_Approach A compare cost: $${approachACost.toFixed(3)} ≈ ¥${(approachACost * USD_TO_CNY).toFixed(2)}_`
      : "",
    "",
    "## Reasons",
    "",
    ...verdict.reasons.map((r) => `- ${r}`),
    "",
    "## Token totals",
    "",
    `- Prompt tokens: ${metrics.totalPromptTokens.toLocaleString()}`,
    `- Completion tokens: ${metrics.totalCompletionTokens.toLocaleString()}`,
    `- Chunks: ${metrics.chunks} × ~${metrics.chunkChars.toLocaleString()} chars`,
    "",
  ].join("\n");
}

function computeVerdict(args: {
  metrics: Metrics;
  qualityCompared: boolean;
  qualityDeltaPassed: boolean | null;
}): Verdict {
  const reasons: string[] = [];
  const wallClockOk = args.metrics.wallClockMs <= PASS_WALL_CLOCK_MS;
  if (!wallClockOk) {
    reasons.push(
      `Wall-clock ${formatMs(args.metrics.wallClockMs)} exceeds 10-min budget. ` +
        "Consider higher concurrency or a faster model."
    );
  }

  const costOk = args.metrics.estimatedCostCny <= PASS_COST_CNY;
  if (!costOk) {
    reasons.push(
      `Cost ¥${args.metrics.estimatedCostCny.toFixed(2)} exceeds ¥${PASS_COST_CNY} budget. ` +
        "Try DeepSeek if not already; or shrink chunk overlap; or accept that current model tier is too expensive for full-novel chunking."
    );
  }

  const schemaOk = args.metrics.failedChunks.length === 0;
  if (!schemaOk) {
    reasons.push(
      `${args.metrics.failedChunks.length} chunks failed schema validation. See logs.`
    );
  }

  let qualityOk: Verdict["qualityOk"] = "skipped";
  if (args.qualityCompared) {
    qualityOk = args.qualityDeltaPassed === true;
    if (!qualityOk) {
      reasons.push(
        "Approach B did not surface ≥ 5 more characters / locations / themes than Approach A. Chunking added cost without quality lift on this novel."
      );
    }
  } else {
    reasons.push(
      "Quality delta not measured (run again with --compare to validate vs Approach A)."
    );
  }

  const allPassed =
    wallClockOk && costOk && schemaOk && (qualityOk === true || qualityOk === "skipped");

  return {
    status: allPassed
      ? args.qualityCompared
        ? "PASS"
        : "DEFER"
      : "FAIL",
    wallClockOk,
    costOk,
    schemaOk,
    qualityOk,
    reasons,
  };
}

// ---------------------------------------------------------------------------
// Config + env loading.
// ---------------------------------------------------------------------------

async function loadConfig(): Promise<SpikeConfig> {
  await loadEnvFile(path.join(process.cwd(), ".env.local"));
  await loadEnvFile(path.join(process.cwd(), ".env"));

  const argv = process.argv.slice(2);
  const novelPath = takeFlag(argv, "--novel");
  if (!novelPath) {
    fail(
      "Missing --novel <path>. Example: tsx scripts/spike-chunking/index.ts --novel ./novel.txt"
    );
  }
  const compare = takeBool(argv, "--compare");
  const dryRun = takeBool(argv, "--dry-run");
  const concurrencyArg = takeFlag(argv, "--concurrency");
  const chunkCharsArg = takeFlag(argv, "--chunk-chars");
  const outArg = takeFlag(argv, "--out");

  const baseUrl = process.env.SPIKE_BASE_URL ?? "https://api.deepseek.com/v1";
  const apiKey = process.env.SPIKE_API_KEY ?? "";
  const model = process.env.SPIKE_MODEL ?? "deepseek-chat";
  const concurrency = Number(
    concurrencyArg ?? process.env.SPIKE_CONCURRENCY ?? "10"
  );
  const chunkChars = Number(
    chunkCharsArg ?? process.env.SPIKE_CHUNK_CHARS ?? "85000"
  );

  if (!apiKey && !dryRun) {
    fail(
      "SPIKE_API_KEY env var is required (set in .env.local or shell). Or use --dry-run to skip LLM calls."
    );
  }

  const timestamp = formatTimestamp(new Date());
  const outDir =
    outArg ??
    path.join(
      process.cwd(),
      "scripts",
      "spike-chunking",
      "runs",
      timestamp
    );

  const resolvedNovel = path.resolve(novelPath!);

  return {
    baseUrl,
    apiKey,
    model,
    concurrency,
    chunkChars,
    novelPath: resolvedNovel,
    compare,
    dryRun,
    outDir,
  };
}

async function loadEnvFile(filePath: string): Promise<void> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex < 0) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // file may not exist; that's fine
  }
}

function takeFlag(argv: string[], name: string): string | undefined {
  const idx = argv.indexOf(name);
  if (idx < 0) return undefined;
  return argv[idx + 1];
}

function takeBool(argv: string[], name: string): boolean {
  return argv.includes(name);
}

function pricingFor(model: string) {
  if (DEFAULT_PRICE_TABLE[model]) return DEFAULT_PRICE_TABLE[model];
  const lower = model.toLowerCase();
  for (const key of Object.keys(DEFAULT_PRICE_TABLE)) {
    if (lower.includes(key)) return DEFAULT_PRICE_TABLE[key];
  }
  return undefined;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remSec = Math.round(seconds - minutes * 60);
  return `${minutes}m${remSec.toString().padStart(2, "0")}s`;
}

function formatTimestamp(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

function banner(config: SpikeConfig): string {
  return [
    "",
    "╭─ Approach B chunking spike ─────────────────────────────",
    `│ novel:       ${config.novelPath}`,
    `│ base_url:    ${config.baseUrl}`,
    `│ model:       ${config.model}`,
    `│ concurrency: ${config.concurrency}`,
    `│ chunk_chars: ${config.chunkChars.toLocaleString()}`,
    `│ compare:     ${config.compare ? "yes (also runs Approach A)" : "no"}`,
    `│ dry_run:     ${config.dryRun}`,
    `│ out_dir:     ${config.outDir}`,
    "╰─────────────────────────────────────────────────────────",
    "",
  ].join("\n");
}

function verdictBanner(
  verdict: Verdict,
  metrics: Metrics,
  approachACost: number
): string {
  const icon =
    verdict.status === "PASS"
      ? "✅"
      : verdict.status === "DEFER"
        ? "⚠️ "
        : "❌";
  const lines = [
    "═══════════════════════════════════════════════════════════════",
    `${icon} VERDICT: ${verdict.status}`,
    "═══════════════════════════════════════════════════════════════",
    `  wall-clock: ${verdict.wallClockOk ? "✓" : "✗"} ${formatMs(metrics.wallClockMs)} (budget: 10 min)`,
    `  cost:       ${verdict.costOk ? "✓" : "✗"} ¥${metrics.estimatedCostCny.toFixed(2)} (budget: ¥${PASS_COST_CNY})`,
    `  schema:     ${verdict.schemaOk ? "✓" : "✗"}`,
    `  quality:    ${verdict.qualityOk === "skipped" ? "—" : verdict.qualityOk ? "✓" : "✗"} ${verdict.qualityOk === "skipped" ? "(run with --compare to measure)" : ""}`,
  ];
  if (approachACost > 0) {
    lines.push(`  compare A:  $${approachACost.toFixed(3)}`);
  }
  lines.push(
    "═══════════════════════════════════════════════════════════════"
  );
  return lines.join("\n");
}

function safe(v: string | null | undefined): string {
  return v?.toString().trim() || "(空)";
}

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

main().catch((err) => {
  console.error("\n💥 spike crashed:", err);
  process.exit(1);
});
