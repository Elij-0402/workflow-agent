"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookPlus, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { VariantCard } from "@/components/sessions/variant-card";
import { VariantComparison } from "@/components/sessions/variant-comparison";
import { Button } from "@/components/ui/button";
import {
  WorkflowStageBar,
  type WorkflowStageItem,
} from "@/components/workflow-stage-bar";
import { BatchTracker } from "@/components/workbench/batch-tracker";
import { BlueprintEditor } from "@/components/workbench/blueprint-editor";
import { ChapterTree } from "@/components/workbench/chapter-tree";
import { CostEstimateModal } from "@/components/workbench/cost-estimate-modal";
import { GenerateDrawer } from "@/components/workbench/generate-drawer";
import { HintBanner } from "@/components/workbench/hint-banner";
import { PipelineBar } from "@/components/workbench/pipeline-bar";
import type { Candidate } from "@/lib/blueprint/merge";
import {
  blueprintReadyToConfirm,
  type Blueprint,
  type BlueprintSection,
  type BlueprintStatus,
} from "@/lib/blueprint/schema";
import type {
  ChapterBriefResult,
  VariantRow as StoredVariantRow,
} from "@/lib/types";
import { deriveHint } from "@/lib/workbench/derive-hint";

import { runBatch } from "./chapter-batch";

type FlowStep = "upload" | "analysis" | "compare" | "generate";

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

type VariantRow = Pick<
  StoredVariantRow,
  | "id"
  | "title"
  | "config"
  | "content"
  | "word_count"
  | "blueprint_id"
  | "created_at"
>;

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
  initialStep?: FlowStep;
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
  const [pendingCandidate, setPendingCandidate] = useState<Candidate | null>(
    null,
  );
  const [blueprintStatus, setBlueprintStatus] = useState<BlueprintStatus>(
    props.blueprintStatus,
  );
  const [blueprintId, setBlueprintId] = useState<string | null>(
    props.blueprintId,
  );
  const [blueprintUpdatedAt, setBlueprintUpdatedAt] = useState<string | null>(
    props.blueprintUpdatedAt,
  );
  const [blueprint, setBlueprint] = useState<Blueprint>(props.blueprint);
  const [generateOpen, setGenerateOpen] = useState(false);

  const [costModal, setCostModal] = useState<{
    open: boolean;
    bookId: string;
    chapterIds: string[];
    avgChars: number;
  } | null>(null);

  const [batchState, setBatchState] = useState<BatchState | null>(null);

  const a = props.books[0] ?? null;
  const b = props.books[1] ?? null;

  const synthesisSet = useMemo(
    () => new Set(props.bookSynthesisByBook),
    [props.bookSynthesisByBook],
  );

  const booksLookup = useMemo(
    () =>
      props.books.map((book) => ({
        id: book.id,
        title: book.title,
        position: book.position,
      })),
    [props.books],
  );

  const chaptersLookup = useMemo(() => {
    const map = new Map<string, { index: number; title: string }>();
    for (const chapter of props.chapters) {
      map.set(chapter.id, { index: chapter.index, title: chapter.title });
    }
    return map;
  }, [props.chapters]);

  const chapterTotals = useMemo(
    () =>
      props.books.map((book) => {
        const total = props.chapters.filter(
          (chapter) => chapter.book_id === book.id,
        ).length;
        const analyzed = props.briefs.filter(
          (brief) => brief.book_id === book.id,
        ).length;
        return { bookId: book.id, total, analyzed };
      }),
    [props.books, props.chapters, props.briefs],
  );

  const hasBothBooks = props.books.length === 2;
  const allChaptersAnalyzed =
    hasBothBooks &&
    chapterTotals.length === 2 &&
    chapterTotals.every(
      (item) => item.total > 0 && item.analyzed === item.total,
    );
  const allSynthesized = Boolean(
    a && b && synthesisSet.has(a.id) && synthesisSet.has(b.id),
  );
  const analysisDone = hasBothBooks && allChaptersAnalyzed && allSynthesized;
  const blueprintReady = blueprintReadyToConfirm(blueprint).ok;
  const compareDone = blueprintStatus === "confirmed";
  const hasVariants = props.variants.length > 0;

  const recommendedStep: FlowStep = !hasBothBooks
    ? "upload"
    : !analysisDone
      ? "analysis"
      : !compareDone
        ? "compare"
        : "generate";

  const [activeStep, setActiveStep] = useState<FlowStep>(() =>
    resolveStep(props.initialStep, recommendedStep, {
      hasBothBooks,
      analysisDone,
      compareDone,
    }),
  );

  useEffect(() => {
    setBlueprint(props.blueprint);
    setBlueprintStatus(props.blueprintStatus);
    setBlueprintUpdatedAt(props.blueprintUpdatedAt);
    setBlueprintId(props.blueprintId);
  }, [
    props.blueprint,
    props.blueprintStatus,
    props.blueprintUpdatedAt,
    props.blueprintId,
  ]);

  useEffect(() => {
    const next = resolveStep(props.initialStep, recommendedStep, {
      hasBothBooks,
      analysisDone,
      compareDone,
    });
    setActiveStep((current) =>
      isStepAllowed(current, { hasBothBooks, analysisDone, compareDone })
        ? current
        : next,
    );
  }, [
    props.initialStep,
    recommendedStep,
    hasBothBooks,
    analysisDone,
    compareDone,
  ]);

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
        blueprintReady,
        variantCount: props.variants.length,
      }),
    [
      props.books.length,
      chapterTotals,
      a,
      b,
      synthesisSet,
      blueprintStatus,
      blueprintReady,
      props.variants.length,
    ],
  );

  const stageItems = getStageItems({
    hasBothBooks,
    analysisDone,
    compareDone,
    variantCount: props.variants.length,
    chapterTotals,
  });

  const disabledKeys = stageItems
    .filter(
      (item) =>
        !isStepAllowed(item.key as FlowStep, {
          hasBothBooks,
          analysisDone,
          compareDone,
        }),
    )
    .map((item) => item.key);

  async function runChapter(bookId: string, chapterId: string) {
    setChapterStatus((state) => ({ ...state, [chapterId]: "running" }));
    try {
      const response = await fetch("/api/analyze/chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, chapterId }),
      });
      const payload = (await response.json()) as { ok?: true; error?: string };
      if (!response.ok || !payload.ok) {
        setChapterStatus((state) => ({ ...state, [chapterId]: "error" }));
        toast.error(payload.error ?? "章节分析失败。");
        return;
      }
      setChapterStatus((state) => ({ ...state, [chapterId]: "done" }));
      startTransition(() => router.refresh());
    } catch {
      setChapterStatus((state) => ({ ...state, [chapterId]: "error" }));
      toast.error("章节分析失败：网络错误。");
    }
  }

  function askBatchConfirmation(bookId: string) {
    const targets = props.chapters
      .filter((chapter) => chapter.book_id === bookId)
      .filter(
        (chapter) =>
          !props.briefs.some((brief) => brief.chapter_id === chapter.id),
      );
    if (targets.length === 0) {
      toast.info("这本书的章节都已经分析完了。");
      return;
    }
    const avgChars =
      targets.reduce(
        (sum, chapter) => sum + (chapter.end_char - chapter.start_char),
        0,
      ) / targets.length;
    setCostModal({
      open: true,
      bookId,
      chapterIds: targets.map((chapter) => chapter.id),
      avgChars: Math.round(avgChars),
    });
  }

  async function startBookBatch(bookId: string, chapterIds: string[]) {
    const book = props.books.find((item) => item.id === bookId);
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
            const response = await fetch("/api/analyze/chapter", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bookId, chapterId }),
              signal: controller.signal,
            });
            const payload = (await response.json()) as {
              ok?: true;
              error?: string;
            };
            return response.ok && payload.ok
              ? { ok: true }
              : { ok: false, error: payload.error ?? "失败" };
          } catch (error) {
            if (controller.signal.aborted)
              return { ok: false, error: "已中止" };
            return {
              ok: false,
              error: error instanceof Error ? error.message : "网络错误",
            };
          }
        },
        onProgress: (id, status, error) => {
          setChapterStatus((state) => ({ ...state, [id]: status }));
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
        toast.error(`完成了，但还有 ${failures.length} 章失败。`);
      } else {
        toast.success("这本书的章节都分析完成了。");
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
    const chapterMap = new Map(
      props.chapters.map((chapter) => [chapter.id, chapter]),
    );
    return Array.from(batchState.errors.keys()).map((id) => {
      const chapter = chapterMap.get(id);
      return { index: chapter?.index ?? 0, title: chapter?.title ?? id };
    });
  }, [batchState, props.chapters]);

  async function synthesizeBook(bookId: string) {
    const response = await fetch("/api/analyze/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId }),
    });
    const payload = (await response.json()) as { ok?: true; error?: string };
    if (!response.ok || !payload.ok) {
      toast.error(payload.error ?? "整书汇总失败。");
      return;
    }
    toast.success("整书汇总完成。");
    startTransition(() => router.refresh());
  }

  function navigateToStep(step: FlowStep) {
    if (!isStepAllowed(step, { hasBothBooks, analysisDone, compareDone }))
      return;
    setActiveStep(step);
    router.replace(
      step === "upload"
        ? `/sessions/${props.session.id}`
        : `/sessions/${props.session.id}?step=${step}`,
    );
  }

  const analysisGrid = (
    <div className="grid gap-4 lg:grid-cols-2">
      {a ? (
        <ChapterTree
          book={a}
          position="A"
          chapters={props.chapters.filter(
            (chapter) => chapter.book_id === a.id,
          )}
          briefs={props.briefs.filter((brief) => brief.book_id === a.id)}
          chapterStatus={chapterStatus}
          synthesisDone={synthesisSet.has(a.id)}
          blueprintLocked={blueprintStatus === "confirmed"}
          onRunChapter={(chapterId) => void runChapter(a.id, chapterId)}
          onRunBatch={() => askBatchConfirmation(a.id)}
          onSynthesize={() => void synthesizeBook(a.id)}
          onAddCandidate={(candidate) =>
            setPendingCandidate({
              section: candidate.section as BlueprintSection,
              title: candidate.title,
              payload: candidate.payload,
              source: { book_id: a.id, chapter_id: candidate.chapterId },
            })
          }
        />
      ) : (
        <EmptySlot
          position="A"
          sessionId={props.session.id}
          positionIndex={0}
        />
      )}
      {b ? (
        <ChapterTree
          book={b}
          position="B"
          chapters={props.chapters.filter(
            (chapter) => chapter.book_id === b.id,
          )}
          briefs={props.briefs.filter((brief) => brief.book_id === b.id)}
          chapterStatus={chapterStatus}
          synthesisDone={synthesisSet.has(b.id)}
          blueprintLocked={blueprintStatus === "confirmed"}
          onRunChapter={(chapterId) => void runChapter(b.id, chapterId)}
          onRunBatch={() => askBatchConfirmation(b.id)}
          onSynthesize={() => void synthesizeBook(b.id)}
          onAddCandidate={(candidate) =>
            setPendingCandidate({
              section: candidate.section as BlueprintSection,
              title: candidate.title,
              payload: candidate.payload,
              source: { book_id: b.id, chapter_id: candidate.chapterId },
            })
          }
        />
      ) : (
        <EmptySlot
          position="B"
          sessionId={props.session.id}
          positionIndex={1}
        />
      )}
    </div>
  );

  return (
    <div className="app-page">
      <PageHeader
        label="task"
        title={props.session.name}
        description={
          a && b
            ? `双书任务 · ${a.title} × ${b.title}`
            : a
              ? `${a.title} 已就位 · 等待第 2 本小说`
              : "先上传两本小说，再开始后续流程"
        }
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/sessions">返回任务列表</Link>
          </Button>
        }
      />

      <WorkflowStageBar
        items={stageItems}
        activeKey={activeStep}
        disabledKeys={disabledKeys}
        onSelect={(key) => navigateToStep(key as FlowStep)}
      />

      {activeStep === "upload" ? (
        <section className="space-y-5">
          <StepIntro
            title="第 1 步 · 上传两本小说"
            description="一个任务只围绕两本来源小说展开。两本都到位后，再开始分析。"
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <UploadBookCard label="A" book={a} />
            {b ? (
              <UploadBookCard label="B" book={b} />
            ) : (
              <EmptySlot
                position="B"
                sessionId={props.session.id}
                positionIndex={1}
              />
            )}
          </div>
          <div className="surface-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] leading-6 text-muted-foreground">
              {hasBothBooks
                ? "两本小说都已上传。现在可以开始分析章节和整书素材。"
                : "还缺 1 本小说。补齐后才会开放分析步骤。"}
            </p>
            <Button
              onClick={() => navigateToStep("analysis")}
              disabled={!hasBothBooks}
            >
              开始分析
            </Button>
          </div>
        </section>
      ) : null}

      {activeStep === "analysis" ? (
        <section className="space-y-5">
          <StepIntro
            title="第 2 步 · 分析两本小说"
            description="先把两本书的章节分析完，再做整书汇总。分析完成后，系统会开放双书对比和融合蓝图。"
          />
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
          <HintBanner hint={hint} />
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
          {analysisGrid}
          <div className="surface-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] leading-6 text-muted-foreground">
              {analysisDone
                ? "章节分析和整书汇总都完成了。下一步进入双书对比与蓝图整理。"
                : "完成两本书的章节分析和整书汇总后，才能进入对比。"}
            </p>
            <Button
              onClick={() => navigateToStep("compare")}
              disabled={!analysisDone}
            >
              前往对比
            </Button>
          </div>
        </section>
      ) : null}

      {activeStep === "compare" ? (
        <section className="space-y-5">
          <StepIntro
            title="第 3 步 · 对比并整理骨架"
            description="这里把两本小说的章节素材、人物关系、世界规则和情节节点合并成一份融合蓝图。确认蓝图后才开放最终生成。"
          />
          <CollapsedChaptersBar
            a={a}
            b={b}
            chapterTotals={chapterTotals}
            onExpand={() => navigateToStep("analysis")}
          />
          <div className="min-h-[680px]">
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
              onStatusChange={(status) => {
                setBlueprintStatus(status);
                startTransition(() => router.refresh());
              }}
              onCandidateConsumed={() => setPendingCandidate(null)}
              onVariantGenerated={() => {
                setGenerateOpen(false);
                navigateToStep("generate");
                startTransition(() => router.refresh());
              }}
            />
          </div>
          <div className="surface-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] leading-6 text-muted-foreground">
              {compareDone
                ? "蓝图已经确认，可以开始生成新的融合小说。"
                : blueprintReady
                  ? "蓝图内容已经够用了。确认蓝图后，就能进入生成。"
                  : "先补齐蓝图里的关键卡片，再确认它。"}
            </p>
            <Button
              onClick={() => navigateToStep("generate")}
              disabled={!compareDone}
            >
              前往生成
            </Button>
          </div>
        </section>
      ) : null}

      {activeStep === "generate" ? (
        <section className="space-y-5">
          <StepIntro
            title="第 4 步 · 生成新小说"
            description="蓝图确认后，从这里生成新的融合版本。生成完成后，可以继续累积多个版本并直接对比它们。"
          />
          <div className="surface-panel flex flex-col gap-4 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="eyebrow-label">generation</p>
                <h2 className="mt-2 text-[20px] font-semibold leading-tight text-foreground">
                  生成结果
                </h2>
                <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground">
                  {hasVariants
                    ? `当前已有 ${props.variants.length} 个版本。可以继续生成，或者先比较已有结果。`
                    : "先生成第一个版本，再决定是否继续迭代多个结果。"}
                </p>
              </div>
              <Button
                onClick={() => setGenerateOpen(true)}
                disabled={!compareDone || !blueprintId}
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                {hasVariants ? "再生成一版" : "生成新小说"}
              </Button>
            </div>
            {!compareDone ? (
              <p className="text-[12px] text-primary">
                需要先在上一步确认蓝图，才能开始生成。
              </p>
            ) : null}
          </div>

          {props.variants.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {props.variants.map((variant) => (
                <VariantCard key={variant.id} variant={variant} />
              ))}
            </div>
          ) : (
            <div className="surface-panel p-6 text-[13px] leading-7 text-muted-foreground">
              还没有生成结果。确认蓝图后，点击上方按钮开始创作第一版。
            </div>
          )}

          {props.variants.length >= 2 ? (
            <VariantComparison
              variants={props.variants}
              confirmedAt={props.blueprintConfirmedAt}
            />
          ) : null}
        </section>
      ) : null}

      {generateOpen ? (
        <GenerateDrawer
          open={generateOpen}
          onOpenChange={setGenerateOpen}
          blueprintId={blueprintId}
          onGenerated={() => {
            setGenerateOpen(false);
            startTransition(() => router.refresh());
          }}
        />
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

function resolveStep(
  initialStep: FlowStep | undefined,
  fallback: FlowStep,
  flags: { hasBothBooks: boolean; analysisDone: boolean; compareDone: boolean },
) {
  if (initialStep && isStepAllowed(initialStep, flags)) {
    return initialStep;
  }
  return fallback;
}

function isStepAllowed(
  step: FlowStep,
  flags: { hasBothBooks: boolean; analysisDone: boolean; compareDone: boolean },
) {
  if (step === "upload") return true;
  if (step === "analysis") return flags.hasBothBooks;
  if (step === "compare") return flags.analysisDone;
  return flags.compareDone;
}

function getStageItems({
  hasBothBooks,
  analysisDone,
  compareDone,
  variantCount,
  chapterTotals,
}: {
  hasBothBooks: boolean;
  analysisDone: boolean;
  compareDone: boolean;
  variantCount: number;
  chapterTotals: Array<{ bookId: string; total: number; analyzed: number }>;
}): WorkflowStageItem[] {
  const totalChapters = chapterTotals.reduce(
    (sum, item) => sum + item.total,
    0,
  );
  const analyzedChapters = chapterTotals.reduce(
    (sum, item) => sum + item.analyzed,
    0,
  );

  return [
    {
      key: "upload",
      label: "上传",
      description: hasBothBooks ? "两本小说都已上传。" : "还需要补齐两本小说。",
      state: hasBothBooks ? "done" : "current",
    },
    {
      key: "analysis",
      label: "分析",
      description: analysisDone
        ? "章节分析和整书汇总都已完成。"
        : totalChapters > 0
          ? `已分析 ${analyzedChapters}/${totalChapters} 章。`
          : "开始分析两本小说的章节。",
      state: analysisDone ? "done" : hasBothBooks ? "current" : "upcoming",
    },
    {
      key: "compare",
      label: "对比",
      description: compareDone
        ? "蓝图已确认。"
        : "整理人物、结构、创意和融合骨架。",
      state: compareDone ? "done" : analysisDone ? "current" : "upcoming",
    },
    {
      key: "generate",
      label: "生成",
      description:
        variantCount > 0
          ? `已生成 ${variantCount} 个版本。`
          : "生成新的融合小说。",
      state: variantCount > 0 ? "done" : compareDone ? "current" : "upcoming",
    },
  ];
}

function StepIntro({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-[22px] font-semibold leading-tight text-foreground">
        {title}
      </h2>
      <p className="max-w-3xl text-[13px] leading-7 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function UploadBookCard({
  label,
  book,
}: {
  label: "A" | "B";
  book: BookRow | null;
}) {
  if (!book) {
    return (
      <div className="surface-panel flex min-h-[220px] items-center justify-center p-6 text-[13px] text-muted-foreground">
        还没有上传书 {label}。
      </div>
    );
  }

  return (
    <div className="surface-panel flex min-h-[220px] flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow-label">book {label}</p>
          <h3 className="mt-2 text-[20px] font-semibold leading-tight text-foreground">
            {book.title}
          </h3>
        </div>
        <span className="font-mono text-[24px] text-primary/50">{label}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat
          label="字数"
          value={book.word_count?.toLocaleString("zh-CN") ?? "未知"}
        />
        <Stat
          label="章节"
          value={book.chapter_count?.toLocaleString("zh-CN") ?? "待切章"}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[3px] border border-border/70 bg-background/50 px-4 py-3">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-primary/80">
        {label}
      </p>
      <p className="mt-1 text-[13px] text-foreground">{value}</p>
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
    <div className="surface-panel flex min-h-[260px] flex-col items-center justify-center gap-4 p-8 text-center">
      <BookPlus
        className="h-12 w-12 text-primary/60"
        strokeWidth={1.5}
        aria-hidden
      />
      <h3 className="text-[20px] font-semibold leading-tight text-foreground">
        还差书 {position}
      </h3>
      <p className="max-w-xs text-[13px] leading-7 text-muted-foreground">
        补上第 {position} 本小说后，这个任务才会开放完整的分析和对比流程。
      </p>
      <Button asChild>
        <Link href={`/upload?sessionId=${sessionId}&position=${positionIndex}`}>
          上传书 {position}
        </Link>
      </Button>
    </div>
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
    const total = chapterTotals.find((item) => item.bookId === book.id);
    return `${label} · ${book.title} · ${total?.analyzed ?? 0}/${total?.total ?? 0} 章`;
  }

  return (
    <button
      type="button"
      onClick={onExpand}
      className="surface-panel flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/30"
      style={{ transitionDuration: "var(--duration-fast)" }}
      aria-label="返回分析步骤查看章节"
    >
      <span className="flex min-w-0 flex-wrap items-center gap-3">
        <span className="text-[11px] uppercase tracking-[0.10em] text-muted-foreground">
          章节素材
        </span>
        <span className="truncate text-[12px] text-foreground">
          {summary(a, "A")}
        </span>
        <span className="text-primary/30">·</span>
        <span className="truncate text-[12px] text-foreground">
          {summary(b, "B")}
        </span>
      </span>
      <span className="text-[12px] text-primary">回看分析 →</span>
    </button>
  );
}
