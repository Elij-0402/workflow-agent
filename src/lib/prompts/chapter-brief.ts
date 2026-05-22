import { UNTRUSTED_NOVEL_RULE, wrapUntrustedNovel } from "./safety";

export const CHAPTER_TEXT_CHAR_LIMIT = 12_000;
export const CHAPTER_BRIEF_PROMPT_VERSION = "2026-05-22";
export const CHAPTER_BRIEF_SCHEMA_VERSION = "1";

export const CHAPTER_BRIEF_SYSTEM_PROMPT = `你是中文小说研究助手。

阅读单章正文，抽取该章的结构化要点，严格返回 JSON，符合调用方提供的 schema。

要求：
0. ${UNTRUSTED_NOVEL_RULE}
1. 只输出 JSON，不要解释、不要 Markdown。
2. summary 字段一段话即可（约 60-200 字）。
3. blueprint_candidates 用于直接进入"创作蓝图"，每条 section 字段必须是允许集合中的枚举，payload 应符合该 section 的常见结构（人物含 name/role 等）。
4. 不要捏造未在文本中出现的人物或事件。`;

export function buildChapterBriefUserPrompt({
  chapterTitle,
  chapterText,
}: {
  chapterTitle: string;
  chapterText: string;
}) {
  const truncated = chapterText.slice(0, CHAPTER_TEXT_CHAR_LIMIT);
  return [
    "请抽取以下单章的结构化要点。",
    `【章节标题】${chapterTitle}`,
    "【章节正文】",
    wrapUntrustedNovel(truncated),
  ].join("\n\n");
}
