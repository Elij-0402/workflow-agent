"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { BlueprintEditor } from "@/components/workbench/blueprint-editor";
import { ChapterTree } from "@/components/workbench/chapter-tree";
import { CostEstimateModal } from "@/components/workbench/cost-estimate-modal";
import { PipelineBar } from "@/components/workbench/pipeline-bar";
import { VariantComparison } from "@/components/sessions/variant-comparison";
import type { Candidate } from "@/lib/blueprint/merge";
import type { Blueprint, BlueprintSection, BlueprintStatus } from "@/lib/blueprint/schema";
import type { ChapterBriefResult } from "@/lib/types";

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

export function WorkbenchClient(props: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [chapterStatus, setChapterStatus] = useState<ChapterStatus>({});
  const [pendingCandidate, setPendingCandidate] = useState<Candidate | null>(null);
  const [blueprintStatus, setBlueprintStatus] = useState<BlueprintStatus>(
    props.blueprintStatus
  );
  const [blueprintId, setBlueprintId] = useState<string | null>(props.blueprintId);
  const [blueprintUpdatedAt, setBlueprintUpdatedAt] = useState<string | null>(
    props.blueprintUpdatedAt
  );
  const [blueprint, setBlueprint] = useState<Blueprint>(props.blueprint);

  const [costModal, setCostModal] = useState<{
    open: boolean;
    bookId: string;
    chapterIds: string[];
    avgChars: number;
  } | null>(null);

  const a = props.books[0] ?? null;
  const b = props.books[1] ?? null;

  const synthesisSet = useMemo(() => new Set(props.bookSynthesisByBook), [
    props.bookSynthesisByBook,
  ]);

  const chapterTotals = useMemo(
    () =>
      props.books.map((book) => {
        const total = props.chapters.filter((c) => c.book_id === book.id).length;
        const analyzed = props.briefs.filter((br) => br.book_id === book.id).length;
        return { bookId: book.id, total, analyzed };
      }),
    [props.books, props.chapters, props.briefs]
  );

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
    const avgChars =
      targets.reduce((s, c) => s + (c.end_char - c.start_char), 0) / targets.length;
    setCostModal({
      open: true,
      bookId,
      chapterIds: targets.map((c) => c.id),
      avgChars: Math.round(avgChars),
    });
  }

  async function startBookBatch(bookId: string, chapterIds: string[]) {
    const interval = setInterval(() => {
      startTransition(() => router.refresh());
    }, 5000);
    try {
      const { failures } = await runBatch({
        chapterIds,
        analyze: async (chapterId) => {
          const r = await fetch("/api/analyze/chapter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookId, chapterId }),
          });
          const j = (await r.json()) as { ok?: true; error?: string };
          return r.ok && j.ok ? { ok: true } : { ok: false, error: j.error ?? "失败" };
        },
        onProgress: (id, status, error) => {
          setChapterStatus((s) => ({ ...s, [id]: status }));
          if (status === "error" && error) toast.error(`章节失败：${error}`);
        },
      });
      if (failures.length > 0) {
        toast.error(`完成，但有 ${failures.length} 章失败。`);
      } else {
        toast.success("章节分析全部完成。");
      }
    } finally {
      clearInterval(interval);
      startTransition(() => router.refresh());
    }
  }

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
        label="Workbench"
        title={props.session.name}
        description={
          a && b
            ? `双书任务 · ${a.title} ↔ ${b.title}`
            : a
              ? `${a.title} · 等待第 2 本书`
              : "等待导入"
        }
      />

      <div className="flex h-[calc(100vh-220px)] min-h-[640px] flex-col gap-3">
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
        <div className="grid flex-1 grid-cols-2 gap-3 overflow-hidden">
          {a ? (
            <ChapterTree
              book={a}
              chapters={props.chapters.filter((c) => c.book_id === a.id)}
              briefs={props.briefs.filter((br) => br.book_id === a.id)}
              chapterStatus={chapterStatus}
              synthesisDone={synthesisSet.has(a.id)}
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
            <EmptySlot label="还未上传 A 书" sessionId={props.session.id} position={0} />
          )}
          {b ? (
            <ChapterTree
              book={b}
              chapters={props.chapters.filter((c) => c.book_id === b.id)}
              briefs={props.briefs.filter((br) => br.book_id === b.id)}
              chapterStatus={chapterStatus}
              synthesisDone={synthesisSet.has(b.id)}
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
            <EmptySlot label="还未上传 B 书" sessionId={props.session.id} position={1} />
          )}
        </div>
        <BlueprintEditor
          sessionId={props.session.id}
          blueprintId={blueprintId}
          blueprint={blueprint}
          status={blueprintStatus}
          updatedAt={blueprintUpdatedAt}
          pendingCandidate={pendingCandidate}
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
      </div>

      {props.variants.length >= 2 ? (
        <section className="mt-4">
          <VariantComparison
            variants={props.variants}
            confirmedAt={props.blueprintConfirmedAt}
          />
        </section>
      ) : null}

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
  label,
  sessionId,
  position,
}: {
  label: string;
  sessionId: string;
  position: 0 | 1;
}) {
  return (
    <div className="surface-panel flex items-center justify-center p-6">
      <div className="text-center text-[13px] text-muted-foreground">
        <p>{label}</p>
        <Link
          href={`/upload?mode=dual&sessionId=${sessionId}&position=${position}`}
          className="mt-3 inline-flex h-9 items-center rounded-[7px] border border-border/70 bg-background/60 px-4 text-foreground hover:bg-accent/40"
        >
          上传文本
        </Link>
      </div>
    </div>
  );
}
