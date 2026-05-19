import type { ChapterMeta } from "../../src/lib/text/clean";

import type { Chunk } from "./types";

/**
 * Group chapters into ~chunkChars-sized chunks, aligned to chapter boundaries.
 * Falls back to fixed-size character chunks if no chapters were detected.
 */
export function groupIntoChunks(args: {
  cleaned: string;
  chapters: ChapterMeta[];
  chunkChars: number;
}): Chunk[] {
  const { cleaned, chapters, chunkChars } = args;

  if (chapters.length === 0) {
    return splitByCharCount(cleaned, chunkChars);
  }

  const chunks: Chunk[] = [];
  let currentStart = 0;
  let currentStartChapter = 0;
  let currentEndChapter = 0;
  let chunkIndex = 0;

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const provisionalEnd = chapter.endChar;
    const provisionalSize = provisionalEnd - currentStart;

    const isLastChapter = i === chapters.length - 1;
    const exceeded = provisionalSize >= chunkChars;

    if (exceeded || isLastChapter) {
      currentEndChapter = i;
      const chunkText = cleaned.slice(currentStart, provisionalEnd);
      chunks.push({
        index: chunkIndex++,
        chapterStart: currentStartChapter + 1,
        chapterEnd: currentEndChapter + 1,
        chapterTitleStart: chapters[currentStartChapter]?.title ?? "",
        chapterTitleEnd: chapters[currentEndChapter]?.title ?? "",
        startChar: currentStart,
        endChar: provisionalEnd,
        text: chunkText,
        charCount: chunkText.length,
      });

      if (isLastChapter) break;

      currentStart = provisionalEnd;
      currentStartChapter = i + 1;
    }
  }

  // Edge case: any single chapter > chunkChars — caller's responsibility to notice
  // via chunks[].charCount; we don't hard-split mid-chapter because Chinese chapter
  // boundaries carry narrative weight and arbitrary splits make extraction worse.
  return chunks;
}

function splitByCharCount(text: string, chunkChars: number): Chunk[] {
  const chunks: Chunk[] = [];
  let i = 0;
  let chunkIndex = 0;
  while (i < text.length) {
    const end = Math.min(text.length, i + chunkChars);
    const slice = text.slice(i, end);
    chunks.push({
      index: chunkIndex++,
      chapterStart: 0,
      chapterEnd: 0,
      chapterTitleStart: "(no chapters detected)",
      chapterTitleEnd: "(no chapters detected)",
      startChar: i,
      endChar: end,
      text: slice,
      charCount: slice.length,
    });
    i = end;
  }
  return chunks;
}
