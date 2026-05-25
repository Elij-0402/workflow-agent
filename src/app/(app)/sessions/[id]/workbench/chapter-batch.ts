export type ChapterAnalyzeFn = (
  chapterId: string,
) => Promise<{ ok: true } | { ok: false; error: string }>;

export type ChapterBatchProgress = (
  chapterId: string,
  status: "running" | "done" | "error",
  error?: string,
) => void;

export async function runBatch(opts: {
  chapterIds: string[];
  concurrency?: number;
  analyze: ChapterAnalyzeFn;
  onProgress: ChapterBatchProgress;
  signal?: AbortSignal;
}) {
  const max = opts.concurrency ?? 3;
  let cursor = 0;
  const failures: Array<{ chapterId: string; error: string }> = [];

  async function worker() {
    while (cursor < opts.chapterIds.length) {
      if (opts.signal?.aborted) return;
      const id = opts.chapterIds[cursor];
      cursor += 1;
      opts.onProgress(id, "running");
      try {
        const result = await opts.analyze(id);
        if (result.ok) {
          opts.onProgress(id, "done");
        } else {
          opts.onProgress(id, "error", result.error);
          failures.push({ chapterId: id, error: result.error });
        }
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        opts.onProgress(id, "error", error);
        failures.push({ chapterId: id, error });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(max, opts.chapterIds.length) }, worker),
  );
  return { failures };
}
