import { VariantResultSchema } from "@/lib/types";
import type { Outline } from "./preview-outline";
import { wrapUntrustedNovel } from "./safety";

export const ITERATE_CHAPTER_SYSTEM_PROMPT = `你是中文小说撰写助手。

基于用户提供的大纲（Outline）、目标章节（chapterIndex）、可选的上次稿件（previousContent）和反馈（feedback），输出该章的中文正文，严格返回符合 schema 的 JSON。

要求：
1. 只输出 JSON，不要 Markdown / 不要解释。
2. content 是该章节的完整正文（不带章节标题前缀，标题放在 title 字段）。
3. 若有 previousContent + feedback，在保留有效部分的前提下针对 feedback 修订；不要无视反馈。
4. 字数控制在 1800-4500 中文字；过短或过长都不可。
5. 不要跨越目标章节的范围讲下一章。`;

export const ITERATE_CHAPTER_RESULT_SCHEMA = VariantResultSchema;
export const ITERATE_CHAPTER_PROMPT_VERSION = "iterate-chapter-v1";
export const ITERATE_CHAPTER_SCHEMA_VERSION = "variant-result-v1";

export function buildIterateChapterUserPrompt({
  outline,
  chapterIndex,
  previousContent,
  feedback,
  briefSection,
}: {
  outline: Outline;
  chapterIndex: number;
  previousContent?: string;
  feedback?: string;
  briefSection?: string;
}): string {
  const target = outline.chapters.find((c) => c.index === chapterIndex);
  if (!target) {
    throw new Error(`chapterIndex ${chapterIndex} not in outline`);
  }

  const parts: string[] = [];
  parts.push("【整体大纲（仅供上下文参考）】");
  parts.push(JSON.stringify(outline, null, 2));
  parts.push("");
  parts.push(`【请撰写第 ${chapterIndex} 章】`);
  parts.push(`标题：${target.title}`);
  parts.push(`摘要：${target.summary}`);
  if (target.key_events.length > 0) {
    parts.push(`关键事件：${target.key_events.join("；")}`);
  }
  if (briefSection) {
    parts.push("");
    parts.push(briefSection);
  }
  if (previousContent) {
    parts.push("");
    parts.push("【上次稿件】");
    parts.push(wrapUntrustedNovel(previousContent));
  }
  if (feedback) {
    parts.push("");
    parts.push(`【本次反馈 / 修改方向】${feedback}`);
  }
  return parts.join("\n");
}
