export type ChapterSource = "regex" | "length-chunk" | "manual";

export type ChapterMeta = {
  index: number;
  title: string;
  startChar: number;
  endChar: number;
  source: ChapterSource;
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

export function detectChapters(text: string): ChapterMeta[] {
  const strong = extractStrongTitles(text);
  const weak = strong.length >= 1 ? [] : extractWeakTitles(text);
  const all = [...strong, ...weak].sort((a, b) => a.startChar - b.startChar);
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

export function expandToChapters(text: string, options: ExpandOptions = {}): ChapterMeta[] {
  const chunkSize = options.fallbackChunkChars ?? 5000;
  const detected = detectChapters(text);
  if (detected.length > 0) return detected;
  if (text.length === 0) {
    return [{ index: 1, title: "块 #1", startChar: 0, endChar: 0, source: "length-chunk" }];
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
