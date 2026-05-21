import { detectChapters, type ChapterMeta } from "./chapters";
export type { ChapterMeta } from "./chapters";

const LEADING_BOM_RE = /^﻿+/;
const FULL_WIDTH_SPACE_RE = /　/g;
const NON_BREAKING_SPACE_RE = / /g;
const THREE_PLUS_NEWLINES_RE = /\n{3,}/g;
const BLANK_SPACE_BEFORE_NEWLINE_RE = /[ \t]+\n/g;
const MULTI_SPACE_RE = /[ \t]{2,}/g;

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

export function countWords(text: string) {
  const compact = text.replace(/\s+/g, "");
  if (compact.length === 0) return 0;

  const cjkMatches = compact.match(/[\p{Script=Han}]/gu) ?? [];
  const latinMatches = compact.match(/[A-Za-z0-9]+(?:['_-][A-Za-z0-9]+)*/g) ?? [];

  return cjkMatches.length + latinMatches.length;
}

export function cleanNovelText(input: string): CleanTextResult {
  const cleaned = normalizeText(input);

  return {
    cleaned,
    wordCount: countWords(cleaned),
    chapters: detectChapters(cleaned),
  };
}
