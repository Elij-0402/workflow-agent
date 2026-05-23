const CHAPTER_PATTERNS = [
  /^[\s　]*第[\d一二三四五六七八九十百千零〇两\s]+[章卷回].*$/gm,
  /^Chapter\s+\d+.*$/gim,
];

const LEADING_BOM_RE = /^\uFEFF+/;
const FULL_WIDTH_SPACE_RE = /\u3000/g;
const NON_BREAKING_SPACE_RE = /\u00A0/g;
const THREE_PLUS_NEWLINES_RE = /\n{3,}/g;
const BLANK_SPACE_BEFORE_NEWLINE_RE = /[ \t]+\n/g;
const MULTI_SPACE_RE = /[ \t]{2,}/g;

export type ChapterMeta = {
  index: number;
  title: string;
  startChar: number;
  endChar: number;
};

export type CleanTextResult = {
  cleaned: string;
  wordCount: number;
  chapters: ChapterMeta[];
};

function normalizeText(input: string) {
  return input
    .replace(LEADING_BOM_RE, "")
    .replace(/\r\n?/g, "\n")
    .replace(FULL_WIDTH_SPACE_RE, " ")
    .replace(NON_BREAKING_SPACE_RE, " ")
    .replace(BLANK_SPACE_BEFORE_NEWLINE_RE, "\n")
    .replace(MULTI_SPACE_RE, " ")
    .replace(THREE_PLUS_NEWLINES_RE, "\n\n")
    .trim();
}

function extractChapterTitles(text: string) {
  const found = new Map<number, string>();

  for (const pattern of CHAPTER_PATTERNS) {
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

function buildChapters(text: string): ChapterMeta[] {
  const markers = extractChapterTitles(text);
  if (markers.length === 0) return [];

  return markers.map((marker, index) => ({
    index: index + 1,
    title: marker.title,
    startChar: marker.startChar,
    endChar:
      index + 1 < markers.length ? markers[index + 1].startChar : text.length,
  }));
}

export function countWords(text: string) {
  const compact = text.replace(/\s+/g, "");
  if (compact.length === 0) return 0;

  const cjkMatches = compact.match(/[\p{Script=Han}]/gu) ?? [];
  const latinMatches =
    compact.match(/[A-Za-z0-9]+(?:['_-][A-Za-z0-9]+)*/g) ?? [];

  return cjkMatches.length + latinMatches.length;
}

export function cleanNovelText(input: string): CleanTextResult {
  const cleaned = normalizeText(input);

  return {
    cleaned,
    wordCount: countWords(cleaned),
    chapters: buildChapters(cleaned),
  };
}
