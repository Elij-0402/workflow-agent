export type ChapterSource = "regex" | "length-chunk" | "manual";
export type ChapterDetectionQuality = "high" | "medium" | "low";

export type ChapterMeta = {
  index: number;
  title: string;
  startChar: number;
  endChar: number;
  source: ChapterSource;
};

export type ChapterPlan = {
  chapters: ChapterMeta[];
  report: {
    strategy: "regex" | "length-chunk";
    quality: ChapterDetectionQuality;
    coverageRatio: number;
    averageSpan: number;
    shortChapterCount: number;
    emptyChapterCount: number;
    duplicateTitleCount: number;
    adjacentDuplicateCount: number;
    repeatedFragmentCount: number;
    titleSequenceBreakCount: number;
    warnings: string[];
  };
};

const STRONG_PATTERNS: RegExp[] = [
  /^[\s　]*第[\d一二三四五六七八九十百千零〇两\s]+[章卷回节折部篇].*$/gm,
  /^Chapter\s+\d+.*$/gim,
  /^[\s　]*(楔子|序章|序言|前言|引子|尾声|后记|番外|外传)[\s　：:].*$/gm,
  /^[\s　]*(楔子|序章|序言|前言|引子|尾声|后记|番外|外传)\s*$/gm,
  /^[\s　]*正文[\s　]*\d+.*$/gm,
];

const WEAK_PATTERN = /^[\s　]*\d{1,4}[\s　：:、.\-][^\n]{0,40}$/gm;

function extractStrongTitles(text: string) {
  const found = new Map<number, string>();
  for (const pattern of STRONG_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const index = match.index;
      const title = match[0]?.trim();
      if (typeof index !== "number" || !title) continue;
      found.set(index, title);
    }
  }
  return [...found.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([startChar, title]) => ({ startChar, title }));
}

function extractWeakTitles(text: string) {
  const candidates: Array<{ startChar: number; title: string }> = [];
  for (const m of text.matchAll(WEAK_PATTERN)) {
    if (typeof m.index !== "number") continue;
    const before = m.index === 0 ? "\n" : text[m.index - 1];
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 1);
    if (before !== "\n" && before !== "") continue;
    if (after !== "\n" && after !== "") continue;
    candidates.push({ startChar: m.index, title: m[0].trim() });
  }
  return candidates.length >= 3 ? candidates : [];
}

function toTitleDedupKey(title: string) {
  const chapterOrdinal = title.match(
    /第([\d一二三四五六七八九十百千零〇两\s]+)[章卷回节折部篇]/u,
  )?.[1];
  if (chapterOrdinal) {
    return `cn:${chapterOrdinal.replace(/\s+/g, "")}`;
  }

  const englishOrdinal = title.match(/^chapter\s+(\d+)/iu)?.[1];
  if (englishOrdinal) {
    return `en:${englishOrdinal}`;
  }

  return title
    .replace(/[【\[(（].{0,24}[】\])）]\s*$/u, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function collapseAdjacentDuplicateTitles(
  matches: Array<{ startChar: number; title: string }>,
) {
  if (matches.length < 2) return matches;

  const collapsed: Array<{ startChar: number; title: string }> = [];
  for (const current of matches) {
    const prev = collapsed[collapsed.length - 1];
    if (!prev) {
      collapsed.push(current);
      continue;
    }

    const prevKey = toTitleDedupKey(prev.title);
    const currentKey = toTitleDedupKey(current.title);
    const distance = current.startChar - prev.startChar;
    if (prevKey === currentKey && distance >= 0 && distance <= 120) {
      const cleanerTitle =
        current.title.length <= prev.title.length &&
        !/[【\[(（]/u.test(current.title)
          ? current.title
          : prev.title;
      collapsed[collapsed.length - 1] = {
        startChar: prev.startChar,
        title: cleanerTitle,
      };
      continue;
    }

    collapsed.push(current);
  }

  return collapsed;
}

export function detectChapters(text: string): ChapterMeta[] {
  const strong = extractStrongTitles(text);
  const weak = strong.length >= 1 ? [] : extractWeakTitles(text);
  const all = collapseAdjacentDuplicateTitles(
    [...strong, ...weak].sort((a, b) => a.startChar - b.startChar),
  );
  if (all.length === 0) return [];
  return all.map((m, i, arr) => ({
    index: i + 1,
    title: m.title,
    startChar: m.startChar,
    endChar: i + 1 < arr.length ? arr[i + 1].startChar : text.length,
    source: "regex" as const,
  }));
}

type ExpandOptions = { fallbackChunkChars?: number };

function buildFallbackChapters(text: string, chunkSize: number): ChapterMeta[] {
  if (text.length === 0) {
    return [
      {
        index: 1,
        title: "块 #1",
        startChar: 0,
        endChar: 0,
        source: "length-chunk",
      },
    ];
  }

  const chunks: ChapterMeta[] = [];
  for (let i = 0, cursor = 0; cursor < text.length; i += 1) {
    const start = cursor;
    const end = Math.min(cursor + chunkSize, text.length);
    chunks.push({
      index: i + 1,
      title: `块 #${i + 1}`,
      startChar: start,
      endChar: end,
      source: "length-chunk",
    });
    cursor = end;
  }

  return chunks;
}

function assessChapterPlan(
  text: string,
  chapters: ChapterMeta[],
): ChapterPlan["report"] {
  const totalLength = Math.max(text.length, 1);
  const spans = chapters.map((chapter) =>
    Math.max(0, chapter.endChar - chapter.startChar),
  );
  const covered = spans.reduce((sum, span) => sum + span, 0);
  const averageSpan =
    spans.length === 0
      ? 0
      : Math.round(spans.reduce((sum, span) => sum + span, 0) / spans.length);
  const shortChapterCount = spans.filter(
    (span) => span > 0 && span < 200,
  ).length;
  const emptyChapterCount = spans.filter((span) => span === 0).length;
  const coverageRatio = Math.min(1, covered / totalLength);
  const strategy = chapters[0]?.source === "regex" ? "regex" : "length-chunk";
  const warnings: string[] = [];
  const titleKeys = chapters.map((chapter) => toTitleDedupKey(chapter.title));
  const uniqueTitleKeys = new Set(titleKeys);
  const duplicateTitleCount = titleKeys.length - uniqueTitleKeys.size;
  const adjacentDuplicateCount = titleKeys.reduce((count, key, index) => {
    if (index === 0) return count;
    return count + (titleKeys[index - 1] === key ? 1 : 0);
  }, 0);
  const repeatedFragmentCount = spans.filter(
    (span) => span > 0 && span <= 40,
  ).length;
  const titleSequenceBreakCount = titleKeys.reduce((count, key, index) => {
    if (index === 0) return count;
    return count + (titleKeys[index - 1] === key ? 1 : 0);
  }, 0);

  let quality: ChapterDetectionQuality = strategy === "regex" ? "high" : "low";

  if (strategy === "length-chunk") {
    warnings.push("未识别到稳定章节标题，已按长度分块。");
  }

  if (emptyChapterCount > 0) {
    warnings.push("存在空章节片段。");
    quality = "low";
  }

  if (
    strategy === "regex" &&
    shortChapterCount >= Math.max(2, Math.ceil(chapters.length * 0.3))
  ) {
    warnings.push("识别到较多过短章节，建议人工检查。");
    quality = quality === "high" ? "medium" : quality;
  }

  if (strategy === "regex" && duplicateTitleCount > 0) {
    warnings.push("检测到重复章节标题，可能存在站点拼接或重复切章。");
    quality = "medium";
  }

  if (
    strategy === "regex" &&
    repeatedFragmentCount >= Math.max(2, Math.ceil(chapters.length * 0.08))
  ) {
    warnings.push("检测到较多极短片段，建议回退到更稳妥的分块分析。");
    quality = "low";
  }

  if (strategy === "regex" && chapters.length < 2 && text.length > 12_000) {
    warnings.push("章节数量偏少，可能没有识别到完整结构。");
    quality = "medium";
  }

  if (coverageRatio < 0.98) {
    warnings.push("章节覆盖率偏低。");
    quality = "medium";
  }

  return {
    strategy,
    quality,
    coverageRatio,
    averageSpan,
    shortChapterCount,
    emptyChapterCount,
    duplicateTitleCount,
    adjacentDuplicateCount,
    repeatedFragmentCount,
    titleSequenceBreakCount,
    warnings,
  };
}

export function buildChapterPlan(
  text: string,
  options: ExpandOptions = {},
): ChapterPlan {
  const chunkSize = options.fallbackChunkChars ?? 5000;
  const detected = detectChapters(text);
  const chapters =
    detected.length > 0 ? detected : buildFallbackChapters(text, chunkSize);

  return {
    chapters,
    report: assessChapterPlan(text, chapters),
  };
}

export function expandToChapters(
  text: string,
  options: ExpandOptions = {},
): ChapterMeta[] {
  return buildChapterPlan(text, options).chapters;
}
