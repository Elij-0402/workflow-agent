import { z } from "zod";

import {
  ANALYSIS_DIMENSIONS,
  EXTENDED_ANALYSIS_DIMENSIONS,
  type AnalysisDimension,
} from "@/lib/types";

export const COMPARE_INSIGHT_DIMENSIONS = [
  ...ANALYSIS_DIMENSIONS,
  ...EXTENDED_ANALYSIS_DIMENSIONS,
] as const satisfies readonly AnalysisDimension[];
export const COMPARE_INSIGHTS_PROMPT_VERSION = "2026-05-22";
export const COMPARE_INSIGHTS_SCHEMA_VERSION = "1";

type Dim = (typeof COMPARE_INSIGHT_DIMENSIONS)[number];

export const CompareInsightsResultSchema = z.object({
  insights: z
    .array(
      z.object({
        title: z.string().min(2).max(60).describe("一句话观察标题，10-30 字"),
        body: z.string().min(10).max(400).describe("解释为什么 / 给出对比依据，60-200 字"),
        dimension: z.enum(
          COMPARE_INSIGHT_DIMENSIONS as readonly [Dim, ...Dim[]],
        ),
        severity: z
          .enum(["note", "finding", "highlight"])
          .describe("note=次要 / finding=有意思 / highlight=最强对比点"),
      }),
    )
    .min(3)
    .max(5),
});

export type CompareInsightsResult = z.infer<typeof CompareInsightsResultSchema>;

export const COMPARE_INSIGHTS_SYSTEM_PROMPT = `你是一名中文小说对比分析助手。

用户提供多本小说在多个分析维度上的结构化数据（JSON）以及一个预先计算好的「差异指数」表（0-100，越高代表两书在该维度差异越大）。请基于这些数据，提炼 3-5 条最有价值的对比洞察。

要求：
1. 只输出 JSON，严格符合 schema，不要任何前言或 Markdown 之外的文字。
2. 优先针对差异指数最高的 2-3 个维度生成洞察；剩余条目可覆盖低差异维度中真正值得注意的对照。
3. 每条 insight 必须基于数据本身（引用具体维度的具体字段、章节、计数、比例等），不要空泛评价。
4. severity:
   - highlight: 最值得用户关注的 1-2 条（差异指数高且解读有冲击力）
   - finding: 数据驱动的、有信息量的常规对比
   - note: 微弱但真实的差异
5. title 用陈述句概括对比点（例如「两书的转折点都集中在 35-45% 处，但 A 走悲剧线、B 走和解线」）。
6. body 用中文 60-200 字，先讲事实再讲含义；可引用具体数字。
7. 不要编造数据中不存在的字段或数字。`;
