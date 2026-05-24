"use client";

import { useMemo, useState } from "react";
import { Loader2, PlayCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { consumeSseStream } from "@/lib/streaming/sse-client";
import type { Outline } from "@/lib/prompts/preview-outline";
import { VariantResultSchema } from "@/lib/types";

type StreamState = "idle" | "running" | "done" | "error";

export type ChapterVariantSummary = {
  id: string;
  chapterIndex: number;
  title: string;
  content: string;
  wordCount: number | null;
  createdAt: string;
};

type Props = {
  briefId: string;
  outlineVariantId: string | null;
  outline: Outline | null;
  initialChapterVariants?: ChapterVariantSummary[];
};

export function ChapterIterateStreamer({
  briefId,
  outlineVariantId,
  outline,
  initialChapterVariants = [],
}: Props) {
  const [chapterIndex, setChapterIndex] = useState(outline?.chapters[0]?.index ?? 1);
  const [feedback, setFeedback] = useState("");
  const [state, setState] = useState<StreamState>("idle");
  const [partialContent, setPartialContent] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [chapterVariants, setChapterVariants] =
    useState<ChapterVariantSummary[]>(initialChapterVariants);

  const chapters = outline?.chapters ?? [];

  const latestByChapter = useMemo(() => {
    const map = new Map<number, ChapterVariantSummary>();
    for (const variant of chapterVariants) {
      const existing = map.get(variant.chapterIndex);
      if (!existing || variant.createdAt > existing.createdAt) {
        map.set(variant.chapterIndex, variant);
      }
    }
    return map;
  }, [chapterVariants]);

  const previousVariantId = latestByChapter.get(chapterIndex)?.id ?? null;
  const activeVariant = latestByChapter.get(chapterIndex) ?? null;

  const run = async () => {
    if (!outlineVariantId) {
      toast.error("请先生成大纲。");
      return;
    }

    setState("running");
    setPartialContent(null);
    setErrorMsg(null);

    let finalizedContent = activeVariant?.content ?? "";

    try {
      const res = await fetch("/api/generate/iterate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          briefId,
          outlineVariantId,
          chapterIndex,
          previousVariantId: previousVariantId ?? undefined,
          feedback: feedback.trim() || undefined,
        }),
      });

      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({}));
        const msg = (json as { error?: string }).error ?? `HTTP ${res.status}`;
        setErrorMsg(msg);
        setState("error");
        toast.error(`章节生成失败：${msg}`);
        return;
      }

      const completion = await consumeSseStream(res.body, (event) => {
        if (event.type === "partial") {
          const partial = VariantResultSchema.partial().safeParse(event.data);
          if (partial.success && partial.data.content) {
            finalizedContent = partial.data.content;
            setPartialContent(partial.data.content);
          }
        } else if (event.type === "done") {
          const payload = event.data as {
            variantId?: string;
            chapterIndex?: number;
            wordCount?: number;
            title?: string;
          };
          if (payload.variantId && payload.chapterIndex) {
            const variantId = payload.variantId;
            const chapterIdx = payload.chapterIndex;
            setChapterVariants((current) => [
              ...current,
              {
                id: variantId,
                chapterIndex: chapterIdx,
                title: payload.title ?? `第 ${chapterIdx} 章`,
                content: finalizedContent,
                wordCount: payload.wordCount ?? null,
                createdAt: new Date().toISOString(),
              },
            ]);
          }
          setState("done");
          toast.success(`第 ${chapterIndex} 章已生成并保存。`);
        } else if (event.type === "error") {
          const message = (event.data as { message?: string }).message ?? "stream error";
          setErrorMsg(message);
          setState("error");
          toast.error(message);
        }
      });

      if (completion === "interrupted") {
        setErrorMsg("连接中断，请重试。");
        setState("error");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "网络异常";
      setErrorMsg(msg);
      setState("error");
      toast.error(msg);
    }
  };

  const liveContent =
    state === "running" && partialContent
      ? partialContent
      : activeVariant?.content ?? null;

  if (!outlineVariantId || !outline) {
    return (
      <div className="surface-panel p-5">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-primary/85">
          章节迭代
        </p>
        <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
          完成左侧简报编辑并预生成大纲后，可在此逐章生成正文并基于反馈迭代。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-primary/85">
            章节迭代
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            基于大纲逐章生成正文；可引用上一版稿件并附加修改反馈。
          </p>
        </div>
        <Button
          onClick={run}
          disabled={state === "running" || chapters.length === 0}
          variant="terminal"
          size="sm"
        >
          {state === "running" ? (
            <>
              <Loader2 className="animate-spin" />
              生成中…
            </>
          ) : state === "done" || state === "error" ? (
            <>
              <RotateCcw />
              {previousVariantId ? "重新迭代" : "生成本章"}
            </>
          ) : (
            <>
              <PlayCircle />
              {previousVariantId ? "继续迭代" : "生成本章"}
            </>
          )}
        </Button>
      </div>

      <div className="surface-panel space-y-4 p-5">
        <div className="flex flex-wrap gap-2">
          {chapters.map((chapter) => {
            const hasDraft = latestByChapter.has(chapter.index);
            const active = chapter.index === chapterIndex;
            return (
              <button
                key={chapter.index}
                type="button"
                onClick={() => setChapterIndex(chapter.index)}
                className={`rounded-[3px] border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background/40 text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={active}
              >
                ch{String(chapter.index).padStart(2, "0")}
                {hasDraft ? " · 已有稿" : ""}
              </button>
            );
          })}
        </div>

        <div>
          <p className="data-label">修改反馈（可选）</p>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="例如：加强冲突张力，减少解释性旁白…"
            className="mt-2 min-h-[88px]"
            maxLength={800}
          />
        </div>

        {errorMsg && state === "error" ? (
          <p className="rounded-[3px] border border-destructive/40 bg-destructive/8 px-3 py-2 font-mono text-[12px] text-destructive">
            {errorMsg}
          </p>
        ) : null}

        <div aria-live="polite" aria-atomic="true" className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-[20px] italic leading-tight text-foreground">
              {chapters.find((c) => c.index === chapterIndex)?.title ?? `第 ${chapterIndex} 章`}
            </h3>
            {activeVariant?.wordCount ? (
              <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
                {activeVariant.wordCount.toLocaleString("zh-CN")} 字
              </span>
            ) : null}
          </div>
          {liveContent ? (
            <article className="reading-prose max-w-none whitespace-pre-wrap text-[13.5px] leading-7 text-foreground">
              {liveContent}
            </article>
          ) : (
            <p className="text-[13px] leading-6 text-muted-foreground">
              {state === "running"
                ? "正在流式生成章节正文…"
                : "选择章节并点击生成，正文将在此显示。"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
