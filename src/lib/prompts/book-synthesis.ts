export const BOOK_SYNTHESIS_BRIEFS_LIMIT = 200;

export const BOOK_SYNTHESIS_SYSTEM_PROMPT = `你是中文小说研究助手。

收到一组章节级要点（JSON 数组），请合成整本书的结构化总览，严格按调用方提供的 schema 返回 JSON。

要求：
1. 只输出 JSON，不要 Markdown / 不要解释。
2. 不要捏造 briefs 中不存在的人物或事件。
3. plot_beats 按时间顺序（order 字段）。
4. viewpoint.mode 和 pacing 必填。`;

export type BriefEntry = {
  index: number;
  brief: {
    summary?: string;
    events?: Array<{ title?: string; description?: string; is_turning_point?: boolean }>;
    [key: string]: unknown;
  };
};

/**
 * When chapter count exceeds BOOK_SYNTHESIS_BRIEFS_LIMIT, sample down to fit the
 * model's context. Strategy: keep first/last 30, evenly sample 140 from the
 * middle, force-include any chapter whose brief.events contains a turning
 * point, deduplicate by chapter index, sort ascending.
 */
export function pickBriefsForSynthesis(briefs: BriefEntry[]): BriefEntry[] {
  if (briefs.length <= BOOK_SYNTHESIS_BRIEFS_LIMIT) return briefs;
  const head = briefs.slice(0, 30);
  const tail = briefs.slice(-30);
  const middle = briefs.slice(30, briefs.length - 30);
  const stride = Math.max(1, Math.floor(middle.length / 140));
  const sampled: BriefEntry[] = [];
  for (let i = 0; i < middle.length && sampled.length < 140; i += stride) {
    sampled.push(middle[i]);
  }
  const turning = briefs.filter((b) =>
    (b.brief.events ?? []).some((e) => e.is_turning_point === true),
  );
  const dedup = new Map<number, BriefEntry>();
  for (const b of [...head, ...sampled, ...tail, ...turning]) {
    dedup.set(b.index, b);
  }
  return [...dedup.values()].sort((a, b) => a.index - b.index);
}

export function buildBookSynthesisUserPrompt({
  bookTitle,
  briefs,
}: {
  bookTitle: string;
  briefs: BriefEntry[];
}) {
  return [
    `请基于以下章节要点合成《${bookTitle}》的整书结构化总览。`,
    "【章节要点 JSON 数组】",
    JSON.stringify(briefs, null, 2),
  ].join("\n\n");
}
