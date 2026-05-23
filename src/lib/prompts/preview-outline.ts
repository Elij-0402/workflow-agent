import { z } from "zod";

export const OutlineSchema = z.object({
  title: z.string().min(1),
  premise: z.string().describe("1-2 句话核心立意"),
  chapters: z
    .array(
      z.object({
        index: z.number().int().min(1),
        title: z.string().min(1),
        summary: z.string().min(1),
        key_events: z.array(z.string()).default([]),
      }),
    )
    .min(1),
});
export type Outline = z.infer<typeof OutlineSchema>;

export const PREVIEW_OUTLINE_SYSTEM_PROMPT = `你是中文小说大纲设计助手。

基于用户提供的蓝图（Blueprint）和创意简报（CreativeBrief），合成一份新版本的大纲，严格返回符合 schema 的 JSON。

要求：
1. 只输出 JSON，不要 Markdown / 解释。
2. 严格遵循创意简报里的人设、情节、文风、保留规则。冲突时以「必须保留」为优先。
3. chapters.index 从 1 起递增。
4. 每章 summary 2-4 句，key_events 列 1-5 条。
5. 章节总数控制在 6-20 章之间（取决于原蓝图规模）。`;

export function buildPreviewOutlineUserPrompt({
  blueprint,
  briefSection,
  targetChapterCount,
}: {
  blueprint: unknown;
  briefSection: string;
  targetChapterCount?: number;
}): string {
  const parts: string[] = [];
  parts.push("【蓝图（Blueprint）】");
  parts.push(JSON.stringify(blueprint, null, 2));
  if (briefSection) {
    parts.push("");
    parts.push(briefSection);
  }
  if (targetChapterCount && targetChapterCount > 0) {
    parts.push("");
    parts.push(`【建议章节数】${targetChapterCount}`);
  }
  parts.push("");
  parts.push("请合成大纲。");
  return parts.join("\n");
}
