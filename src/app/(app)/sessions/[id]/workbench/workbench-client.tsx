"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookPlus } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { BatchTracker } from "@/components/workbench/batch-tracker";
import { BlueprintEditor } from "@/components/workbench/blueprint-editor";
import { ChapterTree } from "@/components/workbench/chapter-tree";
import { CostEstimateModal } from "@/components/workbench/cost-estimate-modal";
import { HintBanner } from "@/components/workbench/hint-banner";
import { OnboardingCard } from "@/components/workbench/onboarding-card";
import { PipelineBar } from "@/components/workbench/pipeline-bar";
import {
  WorkbenchModeSwitcher,
  type WorkbenchMode,
} from "@/components/workbench/workbench-mode-switcher";
import { VariantComparison } from "@/components/sessions/variant-comparison";
import type { Candidate } from "@/lib/blueprint/merge";
import {
  blueprintReadyToConfirm,
  type Blueprint,
  type BlueprintSection,
  type BlueprintStatus,
} from "@/lib/blueprint/schema";
import type { ChapterBriefResult } from "@/lib/types";
import { deriveHint } from "@/lib/workbench/derive-hint";

import { runBatch } from "./chapter-batch";

type BookRow = {
  id: string;
  title: string;
  position: number;
  word_count: number | null;
  chapter_count: number | null;
};

type ChapterRow = {
  id: string;
  book_id: string;
  index: number;
  title: string;
  start_char: number;
  end_char: number;
  source: "regex" | "length-chunk" | "manual";
};

type BriefRow = {
  book_id: string;
  chapter_id: string;
  result: ChapterBriefResult;
};

type VariantRow = {
  id: string;
  title: string;
  config: Record<string, unknown>;
  content: string;
  word_count: number | null;
  blueprint_id: string | null;
  created_at: string;
};

type Props = {
  session: { id: string; name: string };
  books: BookRow[];
  chapters: ChapterRow[];
  briefs: BriefRow[];
  bookSynthesisByBook: string[];
  blueprintId: string | null;
  blueprintStatus: BlueprintStatus;
  blueprintUpdatedAt: string | null;
  blueprintConfirmedAt: string | null;
  blueprint: Blueprint;
  variants: VariantRow[];
};

type ChapterStatus = Record<string, "idle" | "running" | "done" | "error">;

type BatchState = {
  bookId: string;
  bookLabel: "A" | "B";
  bookTitle: string;
  controller: AbortController;
  total: number;
  startedAt: number;
  done: Set<string>;
  running: Set<string>;
  errors: Map<string, string>;
  finished: boolean;
};

export function WorkbenchClient(props: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [chapterStatus, setChapterStatus] = useState<ChapterStatus>({});
  const [pendingCandidate, setPendingCandidate] = useState<Candidate | null>(null);
  const [blueprintStatus, setBlueprintStatus] = useState<BlueprintStatus>(props.blueprintStatus);
  const [blueprintId, setBlueprintId] = useState<string | null>(props.blueprintId);
  const [blueprintUpdatedAt, setBlueprintUpdatedAt] = useState<string | null>(
    props.blueprintUpdatedAt,
  );
  const [blueprint, setBlueprint] = useState<Blueprint>(props.blueprint);

  const [costModal, setCostModal] = useState<{
    open: boolean;
    bookId: string;
    chapterIds: string[];
    avgChars: number;
  } | null>(null);

  const [batchState, setBatchState] = useState<BatchState | null>(null);

  const [mode, setMode] = useState<WorkbenchMode>("chapters");

  const a = props.books[0] ?? null;
  const b = props.books[1] ?? null;

  const synthesisSet = useMemo(
    () => new Set(props.bookSynthesisByBook),
    [props.bookSynthesisByBook],
  );

  const booksLookup = useMemo(
    () =>
      props.books.map((b) => ({
        id: b.id,
        title: b.title,
        position: b.position,
      })),
    [props.books],
  );

  const chaptersLookup = useMemo(() => {
    const m = new Map<string, { index: number; title: string }>();
    for (const c of props.chapters) m.set(c.id, { index: c.index, title: c.title });
    return m;
  }, [props.chapters]);

  const chapterTotals = useMemo(
    () =>
      props.books.map((book) => {
        const total = props.chapters.filter((c) => c.book_id === book.id).length;
        const analyzed = props.briefs.filter((br) => br.book_id === book.id).length;
        return { bookId: book.id, total, analyzed };
      }),
    [props.books, props.chapters, props.briefs],
  );

  const hint = useMemo(
    () =>
      deriveHint({
        importedCount: props.books.length,
        chapterTotals,
        bookSynthesisDone: {
          a: a ? synthesisSet.has(a.id) : false,
          b: b ? synthesisSet.has(b.id) : false,
        },
        blueprintStatus,
        blueprintReady: blueprintReadyToConfirm(blueprint).ok,
        variantCount: props.variants.length,
      }),
    [
      props.books.length,
      chapterTotals,
      a,
      b,
      synthesisSet,
      blueprintStatus,
      blueprint,
      props.variants.length,
    ],
  );

  const variantsEnabled = props.variants.length >= 2;

  // Keep editor state in sync after router.refresh().
  useEffect(() => {
    setBlueprint(props.blueprint);
    setBlueprintStatus(props.blueprintStatus);
    setBlueprintUpdatedAt(props.blueprintUpdatedAt);
    setBlueprintId(props.blueprintId);
  }, [props.blueprint, props.blueprintStatus, props.blueprintUpdatedAt, props.blueprintId]);

  async function runChapter(bookId: string, chapterId: string) {
    setChapterStatus((s) => ({ ...s, [chapterId]: "running" }));
    try {
      const r = await fetch("/api/analyze/chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, chapterId }),
      });
      const j = (await r.json()) as { ok?: true; error?: string };
      if (!r.ok || !j.ok) {
        setChapterStatus((s) => ({ ...s, [chapterId]: "error" }));
        toast.error(j.error ?? "章节分析失败。");
        return;
      }
      setChapterStatus((s) => ({ ...s, [chapterId]: "done" }));
      startTransition(() => router.refresh());
    } catch {
      setChapterStatus((s) => ({ ...s, [chapterId]: "error" }));
      toast.error("章节分析失败：网络错误。");
    }
  }

  function askBatchConfirmation(bookId: string) {
    const targets = props.chapters
      .filter((c) => c.book_id === bookId)
      .filter((c) => !props.briefs.some((br) => br.chapter_id === c.id));
    if (targets.length === 0) {
      toast.info("该书所有章节已分析。");
      return;
    }
    const avgChars = targets.reduce((s, c) => s + (c.end_char - c.start_char), 0) / targets.length;
    setCostModal({
      open: true,
      bookId,
      chapterIds: targets.map((c) => c.id),
      avgChars: Math.round(avgChars),
    });
  }

  async function startBookBatch(bookId: string, chapterIds: string[]) {
    const book = props.books.find((bk) => bk.id === bookId);
    if (!book) return;
    const label: "A" | "B" = book.position === 0 ? "A" : "B";
    const controller = new AbortController();

    setBatchState({
      bookId,
      bookLabel: label,
      bookTitle: book.title,
      controller,
      total: chapterIds.length,
      startedAt: Date.now(),
      done: new Set(),
      running: new Set(),
      errors: new Map(),
      finished: false,
    });

    const interval = setInterval(() => {
      startTransition(() => router.refresh());
    }, 5000);

    try {
      const { failures } = await runBatch({
        chapterIds,
        signal: controller.signal,
        analyze: async (chapterId) => {
          if (controller.signal.aborted) {
            return { ok: false, error: "已中止" };
          }
          try {
            const r = await fetch("/api/analyze/chapter", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bookId, chapterId }),
              signal: controller.signal,
            });
            const j = (await r.json()) as { ok?: true; error?: string };
            return r.ok && j.ok ? { ok: true } : { ok: false, error: j.error ?? "失败" };
          } catch (e) {
            if (controller.signal.aborted) return { ok: false, error: "已中止" };
            return { ok: false, error: e instanceof Error ? e.message : "网络错误" };
          }
        },
        onProgress: (id, status, error) => {
          setChapterStatus((s) => ({ ...s, [id]: status }));
          setBatchState((prev) => {
            if (!prev || prev.bookId !== bookId) return prev;
            const next: BatchState = {
              ...prev,
              done: new Set(prev.done),
              running: new Set(prev.running),
              errors: new Map(prev.errors),
            };
            if (status === "running") {
              next.running.add(id);
            } else {
              next.running.delete(id);
              if (status === "done") next.done.add(id);
              else if (status === "error") next.errors.set(id, error ?? "失败");
            }
            return next;
          });
        },
      });
      if (controller.signal.aborted) {
        toast.info("批量分析已中止。");
      } else if (failures.length > 0) {
        toast.error(`完成，但有 ${failures.length} 章失败。`);
      } else {
        toast.success("章节分析全部完成。");
      }
    } finally {
      clearInterval(interval);
      setBatchState((prev) =>
        prev && prev.bookId === bookId ? { ...prev, finished: true } : prev,
      );
      startTransition(() => router.refresh());
    }
  }

  function abortBatch() {
    setBatchState((prev) => {
      if (!prev) return prev;
      prev.controller.abort();
      return { ...prev, finished: true };
    });
  }

  function retryFailedBatch() {
    const prev = batchState;
    if (!prev) return;
    const failedIds = Array.from(prev.errors.keys());
    if (failedIds.length === 0) return;
    setBatchState(null);
    void startBookBatch(prev.bookId, failedIds);
  }

  function dismissBatch() {
    setBatchState(null);
  }

  const batchFailuresForUI = useMemo(() => {
    if (!batchState) return [];
    const chapterMap = new Map(props.chapters.map((c) => [c.id, c]));
    return Array.from(batchState.errors.keys()).map((id) => {
      const ch = chapterMap.get(id);
      return { index: ch?.index ?? 0, title: ch?.title ?? id };
    });
  }, [batchState, props.chapters]);

  async function synthesizeBook(bookId: string) {
    const res = await fetch("/api/analyze/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId }),
    });
    const j = (await res.json()) as { ok?: true; error?: string };
    if (!res.ok || !j.ok) {
      toast.error(j.error ?? "整书汇总失败。");
      return;
    }
    toast.success("整书汇总完成。");
    startTransition(() => router.refresh());
  }

  return (
    <div className="app-page">
      <PageHeader
        label="workbench"
        title={props.session.name}
        description={
          a && b
            ? `双书任务 · ${a.title} ↔ ${b.title}`
            : a
              ? `${a.title} · 等待第 2 本书`
              : "等待导入"
        }
      />

      <div className="flex flex-col gap-4 xl:h-[calc(100vh-260px)] xl:min-h-[640px]">
        <PipelineBar
          importedCount={props.books.length}
          chapterTotals={chapterTotals}
          bookSynthesisDone={{
            a: a ? synthesisSet.has(a.id) : false,
            b: b ? synthesisSet.has(b.id) : false,
          }}
          blueprintStatus={blueprintStatus}
          variantCount={props.variants.length}
        />

        <div className="flex flex-wrap items-stretch justify-between gap-2">
          <div className="min-w-0 flex-1">
            <HintBanner hint={hint} />
          </div>
          <WorkbenchModeSwitcher mode={mode} onChange={setMode} variantsEnabled={variantsEnabled} />
        </div>

        {batchState ? (
          <BatchTracker
            bookLabel={batchState.bookLabel}
            bookTitle={batchState.bookTitle}
            total={batchState.total}
            doneCount={batchState.done.size}
            runningCount={batchState.running.size}
            errorCount={batchState.errors.size}
            startedAt={batchState.startedAt}
            failures={batchFailuresForUI}
            finished={batchState.finished}
            onAbort={abortBatch}
            onRetryFailed={retryFailedBatch}
            onDismiss={dismissBatch}
          />
        ) : null}

        {mode === "chapters" ? (
          <>
            <div className="grid gap-4 lg:h-[280px] lg:shrink-0 lg:grid-cols-2 lg:overflow-hidden">
              {a ? (
                <ChapterTree
                  book={a}
                  position="A"
                  chapters={props.chapters.filter((c) => c.book_id === a.id)}
                  briefs={props.briefs.filter((br) => br.book_id === a.id)}
                  chapterStatus={chapterStatus}
                  synthesisDone={synthesisSet.has(a.id)}
                  blueprintLocked={blueprintStatus === "confirmed"}
                  onRunChapter={(cid) => void runChapter(a.id, cid)}
                  onRunBatch={() => askBatchConfirmation(a.id)}
                  onSynthesize={() => void synthesizeBook(a.id)}
                  onAddCandidate={(c) =>
                    setPendingCandidate({
                      section: c.section as BlueprintSection,
                      title: c.title,
                      payload: c.payload,
                      source: { book_id: a.id, chapter_id: c.chapterId },
                    })
                  }
                />
              ) : (
                <EmptySlot position="A" sessionId={props.session.id} positionIndex={0} />
              )}
              {b ? (
                <ChapterTree
                  book={b}
                  position="B"
                  chapters={props.chapters.filter((c) => c.book_id === b.id)}
                  briefs={props.briefs.filter((br) => br.book_id === b.id)}
                  chapterStatus={chapterStatus}
                  synthesisDone={synthesisSet.has(b.id)}
                  blueprintLocked={blueprintStatus === "confirmed"}
                  onRunChapter={(cid) => void runChapter(b.id, cid)}
                  onRunBatch={() => askBatchConfirmation(b.id)}
                  onSynthesize={() => void synthesizeBook(b.id)}
                  onAddCandidate={(c) =>
                    setPendingCandidate({
                      section: c.section as BlueprintSection,
                      title: c.title,
                      payload: c.payload,
                      source: { book_id: b.id, chapter_id: c.chapterId },
                    })
                  }
                />
              ) : (
                <EmptySlot position="B" sessionId={props.session.id} positionIndex={1} />
              )}
            </div>
            <CollapsedBlueprintBar
              blueprint={blueprint}
              status={blueprintStatus}
              onExpand={() => setMode("blueprint")}
            />
          </>
        ) : mode === "blueprint" ? (
          <>
            <CollapsedChaptersBar
              a={a}
              b={b}
              chapterTotals={chapterTotals}
              onExpand={() => setMode("chapters")}
            />
            <BlueprintEditor
              sessionId={props.session.id}
              blueprintId={blueprintId}
              blueprint={blueprint}
              status={blueprintStatus}
              updatedAt={blueprintUpdatedAt}
              pendingCandidate={pendingCandidate}
              books={booksLookup}
              chapters={chaptersLookup}
              onSaved={(next, ts, id) => {
                setBlueprint(next);
                setBlueprintUpdatedAt(ts);
                if (id) setBlueprintId(id);
                startTransition(() => router.refresh());
              }}
              onStatusChange={(s, _confirmedAt) => {
                setBlueprintStatus(s);
                startTransition(() => router.refresh());
              }}
              onCandidateConsumed={() => setPendingCandidate(null)}
              onVariantGenerated={() => startTransition(() => router.refresh())}
            />
          </>
        ) : (
          <section className="min-h-0 flex-1 overflow-auto">
            <VariantComparison variants={props.variants} confirmedAt={props.blueprintConfirmedAt} />
          </section>
        )}
      </div>

      {costModal ? (
        <CostEstimateModal
          open={costModal.open}
          chapterCount={costModal.chapterIds.length}
          avgChars={costModal.avgChars}
          onCancel={() => setCostModal(null)}
          onConfirm={() => {
            const { bookId, chapterIds } = costModal;
            setCostModal(null);
            void startBookBatch(bookId, chapterIds);
          }}
        />
      ) : null}
    </div>
  );
}

function EmptySlot({
  position,
  sessionId,
  positionIndex,
}: {
  position: "A" | "B";
  sessionId: string;
  positionIndex: 0 | 1;
}) {
  return (
    <div className="surface-panel flex flex-col items-center justify-center gap-4 p-8 text-center">
      <BookPlus className="h-12 w-12 text-primary/60" strokeWidth={1.5} aria-hidden />
      <h3 className="font-display text-[20px] italic leading-tight text-foreground">
        还差第 {position} 本书
      </h3>
      <p className="max-w-xs text-[13px] leading-7 text-muted-foreground">
        上传后这本书的章节会进入素材区，参与下方蓝图的合并。
      </p>
      <Button asChild>
        <Link href={`/upload?mode=dual&sessionId=${sessionId}&position=${positionIndex}`}>
          上传第 {position} 本书
        </Link>
      </Button>
    </div>
  );
}

function CollapsedBlueprintBar({
  blueprint,
  status,
  onExpand,
}: {
  blueprint: Blueprint;
  status: BlueprintStatus;
  onExpand: () => void;
}) {
  const cardCount =
    blueprint.characters.length +
    blueprint.relationships.length +
    blueprint.world_rules.length +
    blueprint.conflicts.length +
    blueprint.plot_beats.length +
    blueprint.themes.length;
  return (
    <button
      type="button"
      onClick={onExpand}
      className={`${
        status === "confirmed" ? "surface-locked" : "surface-panel"
      } flex items-center justify-between gap-3 px-4 py-2 text-left transition-colors hover:bg-accent/30`}
      style={{ transitionDuration: "var(--duration-fast)" }}
      aria-label="展开蓝图编辑器"
    >
      <span className="flex items-center gap-3">
        <span className="text-[11px] uppercase tracking-[0.10em] text-muted-foreground">蓝图</span>
        <span className="text-[12px] text-muted-foreground">
          {cardCount} 张卡片 ·{" "}
          <span className={status === "confirmed" ? "text-locked" : "text-primary"}>
            {status === "confirmed" ? "已确认" : "草稿"}
          </span>
        </span>
      </span>
      <span className="text-[12px] text-primary">编辑 →</span>
    </button>
  );
}

function CollapsedChaptersBar({
  a,
  b,
  chapterTotals,
  onExpand,
}: {
  a: BookRow | null;
  b: BookRow | null;
  chapterTotals: Array<{ bookId: string; total: number; analyzed: number }>;
  onExpand: () => void;
}) {
  function summary(book: BookRow | null, label: "A" | "B") {
    if (!book) return `${label} · 未上传`;
    const t = chapterTotals.find((c) => c.bookId === book.id);
    return `${label} · ${book.title} · ${t?.analyzed ?? 0}/${t?.total ?? 0} 章`;
  }
  return (
    <button
      type="button"
      onClick={onExpand}
      className="surface-panel flex items-center justify-between gap-3 px-4 py-2 text-left transition-colors hover:bg-accent/30"
      style={{ transitionDuration: "var(--duration-fast)" }}
      aria-label="展开章节区"
    >
      <span className="flex min-w-0 flex-wrap items-center gap-3">
        <span className="text-[11px] uppercase tracking-[0.10em] text-muted-foreground">章节</span>
        <span className="truncate text-[12px] text-foreground">{summary(a, "A")}</span>
        <span className="text-primary/30">·</span>
        <span className="truncate text-[12px] text-foreground">{summary(b, "B")}</span>
      </span>
      <span className="text-[12px] text-primary">展开 →</span>
    </button>
  );
}
