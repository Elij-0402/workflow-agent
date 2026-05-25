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
import {
  getBookAnalysisBlockingReason,
  getBookAnalysisMode,
  getBookChapterGate,
  getBookProviderCompatibility,
  type AnalysisMode,
} from "@/lib/books/content";
import type {
  ChapterBriefResult,
  VariantRow as StoredVariantRow,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { ANALYSIS_CAPABILITY_GUIDE } from "@/lib/workbench/analysis-display";
import { deriveHint } from "@/lib/workbench/derive-hint";
import {
  deriveUploadBookDisplay,
  deriveUploadStepSummary,
} from "@/lib/workbench/upload-health";

import { runBatch } from "./chapter-batch";

type FlowStep = "upload" | "analysis" | "compare" | "generate";

type BookRow = {
  id: string;
  title: string;
  position: number;
  word_count: number | null;
  chapter_count: number | null;
  metadata?: Record<string, unknown>;
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
  dimension: "chapter_brief" | "block_brief";
  result: ChapterBriefResult;
};

type VariantRow = Pick<
  StoredVariantRow,
  | "id"
  | "title"
  | "scope"
  | "chapter_index"
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
  const [analysisGuideExpanded, setAnalysisGuideExpanded] = useState(false);

  const [costModal, setCostModal] = useState<{
    open: boolean;
    bookId: string;
    chapterIds: string[];
    avgChars: number;
  } | null>(null);

  const [batchState, setBatchState] = useState<BatchState | null>(null);

  const a = props.books[0] ?? null;
  const b = props.books[1] ?? null;
  const bookModes = useMemo(
    () =>
      new Map(
        props.books.map((book) => [
          book.id,
          getBookAnalysisMode(book.metadata),
        ]),
      ),
    [props.books],
  );
  const bookGates = useMemo(
    () =>
      new Map(
        props.books.map((book) => [
          book.id,
          {
            gate: getBookChapterGate(book.metadata),
            blockingReason: getBookAnalysisBlockingReason(book.metadata),
            compatibility: getBookProviderCompatibility(book.metadata),
          },
        ]),
      ),
    [props.books],
  );

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
        const expectedDimension =
          bookModes.get(book.id) === "block-fallback"
            ? "block_brief"
            : "chapter_brief";
        const analyzed = props.briefs.filter(
          (brief) =>
            brief.book_id === book.id && brief.dimension === expectedDimension,
        ).length;
        return { bookId: book.id, total, analyzed };
      }),
    [props.books, props.chapters, props.briefs, bookModes],
  );

  const hasBothBooks = props.books.length === 2;
  const uploadSummary = useMemo(
    () => deriveUploadStepSummary(props.books),
    [props.books],
  );
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

  const recommendedStep: FlowStep =
    !hasBothBooks || !uploadSummary.canEnterAnalysis
      ? "upload"
      : !analysisDone
        ? "analysis"
        : !compareDone
          ? "compare"
          : "generate";

  const [activeStep, setActiveStep] = useState<FlowStep>(() =>
    resolveStep(props.initialStep, recommendedStep, {
      hasBothBooks,
      canEnterAnalysis: uploadSummary.canEnterAnalysis,
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
      canEnterAnalysis: uploadSummary.canEnterAnalysis,
      analysisDone,
      compareDone,
    });
    setActiveStep((current) =>
      isStepAllowed(current, {
        hasBothBooks,
        canEnterAnalysis: uploadSummary.canEnterAnalysis,
        analysisDone,
        compareDone,
      })
        ? current
        : next,
    );
  }, [
    props.initialStep,
    recommendedStep,
    hasBothBooks,
    uploadSummary.canEnterAnalysis,
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
    uploadDescription: uploadSummary.description,
  });

  const disabledKeys = stageItems
    .filter(
      (item) =>
        !isStepAllowed(item.key as FlowStep, {
          hasBothBooks,
          canEnterAnalysis: uploadSummary.canEnterAnalysis,
          analysisDone,
          compareDone,
        }),
    )
    .map((item) => item.key);

  async function runChapter(bookId: string, chapterId: string) {
    const gate = bookGates.get(bookId);
    if (gate?.blockingReason) {
      toast.error(gate.blockingReason);
      return;
    }
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
    const gate = bookGates.get(bookId);
    if (gate?.blockingReason) {
      toast.error(gate.blockingReason);
      return;
    }
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
    const gate = bookGates.get(bookId);
    if (gate?.blockingReason) {
      toast.error(gate.blockingReason);
      return;
    }
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
    if (
      !isStepAllowed(step, {
        hasBothBooks,
        canEnterAnalysis: uploadSummary.canEnterAnalysis,
        analysisDone,
        compareDone,
      })
    )
      return;
    setActiveStep(step);
    router.replace(`/sessions/${props.session.id}/workbench?step=${step}`);
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
          analysisMode={bookModes.get(a.id) ?? "chaptered"}
          gateStatus={bookGates.get(a.id)?.gate.status ?? "pass"}
          compatibilityStatus={
            bookGates.get(a.id)?.compatibility.status ?? "supported"
          }
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
          analysisMode={bookModes.get(b.id) ?? "chaptered"}
          gateStatus={bookGates.get(b.id)?.gate.status ?? "pass"}
          compatibilityStatus={
            bookGates.get(b.id)?.compatibility.status ?? "supported"
          }
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
        label="任务"
        title={props.session.name}
        description={
          a && b
            ? `双书融合任务 · ${a.title} × ${b.title}`
            : a
              ? `${a.title} 已就位 · 等待参考书 2`
              : "先导入两本参考小说，再开始后续流程"
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
            title="第 1 步 · 导入两本参考小说"
            description="一个任务只围绕两本参考小说展开。两本都到位后，再开始分析。"
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
                ? uploadSummary.footerText
                : "还缺 1 本参考小说。补齐后才会开放分析步骤。"}
            </p>
            {uploadSummary.hasBlocked ? (
              <Button asChild variant="outline">
                <Link href={`/sessions/${props.session.id}`}>
                  {uploadSummary.actionLabel}
                </Link>
              </Button>
            ) : (
              <Button
                onClick={() => navigateToStep("analysis")}
                disabled={!uploadSummary.canEnterAnalysis}
              >
                {uploadSummary.actionLabel}
              </Button>
            )}
          </div>
        </section>
      ) : null}

      {activeStep === "analysis" ? (
        <section className="space-y-5">
          <StepIntro
            title="第 2 步 · 拆解两本参考小说的结构、人物与叙事素材"
            description="系统会先分别拆解每本参考书，优先按章节分析；若导入体检判断章节结构不稳，则自动改为分段分析。完成两本书的结构化摘要后，再进入整书汇总与后续对比整理。"
          />
          <AnalysisCapabilityPanel
            expanded={analysisGuideExpanded}
            onToggle={() => setAnalysisGuideExpanded((value) => !value)}
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
                : "完成两本参考书的章节分析和整书汇总后，才能进入对比。"}
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
            description="这里把两本参考小说的章节素材、人物关系、世界规则和情节节点合并成一份融合蓝图。确认蓝图后才开放最终生成。"
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
          <div className="surface-panel flex flex-col gap-4 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="eyebrow-label">生成阶段</p>
                <h2 className="text-[20px] font-semibold leading-tight text-foreground">
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
  flags: {
    hasBothBooks: boolean;
    canEnterAnalysis: boolean;
    analysisDone: boolean;
    compareDone: boolean;
  },
) {
  if (initialStep && isStepAllowed(initialStep, flags)) {
    return initialStep;
  }
  return fallback;
}

function isStepAllowed(
  step: FlowStep,
  flags: {
    hasBothBooks: boolean;
    canEnterAnalysis: boolean;
    analysisDone: boolean;
    compareDone: boolean;
  },
) {
  if (step === "upload") return true;
  if (step === "analysis") return flags.hasBothBooks && flags.canEnterAnalysis;
  if (step === "compare") return flags.analysisDone;
  return flags.compareDone;
}

function getStageItems({
  hasBothBooks,
  analysisDone,
  compareDone,
  variantCount,
  chapterTotals,
  uploadDescription,
}: {
  hasBothBooks: boolean;
  analysisDone: boolean;
  compareDone: boolean;
  variantCount: number;
  chapterTotals: Array<{ bookId: string; total: number; analyzed: number }>;
  uploadDescription: string;
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
      description: hasBothBooks
        ? uploadDescription
        : "还需要补齐两本参考小说。",
      state: hasBothBooks ? "done" : "current",
    },
    {
      key: "analysis",
      label: "分析",
      description: analysisDone
        ? "章节分析和整书汇总都已完成。"
        : totalChapters > 0
          ? `已分析 ${analyzedChapters}/${totalChapters} 章。`
          : "开始分析两本参考小说的章节。",
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

function AnalysisCapabilityPanel({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  const guide = ANALYSIS_CAPABILITY_GUIDE;

  return (
    <div className="surface-panel p-5">
      <div className="flex flex-col gap-3 border-b border-dashed border-border/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="eyebrow-label">分析能力说明</p>
          <h3 className="text-[18px] font-semibold leading-tight text-foreground">
            当前更适合做创作拆解，不是全维度精读
          </h3>
          <p className="max-w-3xl text-[13px] leading-7 text-muted-foreground">
            {guide.shortSummary}
          </p>
          <p className="max-w-3xl text-[12px] leading-6 text-muted-foreground">
            {guide.positioning}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onToggle}>
          {expanded ? "收起完整说明" : "查看完整说明"}
        </Button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <InfoListCard
          title="适合分析"
          tone="normal"
          items={guide.suitable}
          footer="结构型信息相对稳定，适合先建立整书结构画像。"
        />
        <InfoListCard
          title="部分支持"
          tone="warning"
          items={guide.partial}
          footer="风格型信息可作参考，但不建议直接当作最终判断。"
        />
        <InfoListCard
          title="建议人工复核"
          tone="blocked"
          items={guide.reviewNeeded}
          footer="深层文学判断与长程伏线整理，仍建议结合人工精读。"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[4px] border border-border/70 bg-background/40 p-4">
          <p className="text-[13px] font-medium text-foreground">
            双书互动流程
          </p>
          <div className="mt-3 space-y-3">
            <StageLine index="01" text={guide.processStages[0]} />
            <StageLine index="02" text={guide.processStages[1]} />
          </div>
          <p className="mt-3 text-[12px] leading-6 text-muted-foreground">
            两本书之间的互动、互补和冲突，不会在本步直接生成，而是在下一步“对比”中整理。
          </p>
        </div>
        <div className="rounded-[4px] border border-border/70 bg-background/40 p-4">
          <p className="text-[13px] font-medium text-foreground">
            结果可信度说明
          </p>
          <ul className="mt-3 space-y-2 text-[12px] leading-6 text-muted-foreground">
            {guide.trustNotes.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
          <div className="mt-3 rounded-[4px] border border-border/60 bg-background/50 p-3 text-[12px] text-muted-foreground">
            结果预期：结构型信息相对稳定，风格型信息参考使用，深层文学判断需要人工复核。
          </div>
        </div>
      </div>

      {expanded ? (
        <div className="mt-4 rounded-[4px] border border-border/70 bg-background/40 p-4">
          <p className="text-[13px] font-medium text-foreground">
            推荐人工复核场景
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {guide.reviewScenarios.map((item) => (
              <span
                key={item}
                className="rounded-full border border-border/70 px-2.5 py-1 text-[12px] text-muted-foreground"
              >
                {item}
              </span>
            ))}
          </div>
          <p className="mt-3 text-[12px] leading-6 text-muted-foreground">
            批量分析只负责基础分析，不代表自动完成全部扩展维度。扩展分析适合在完成基础拆解后按需启用。
          </p>
        </div>
      ) : null}
    </div>
  );
}

function InfoListCard({
  title,
  items,
  footer,
  tone,
}: {
  title: string;
  items: string[];
  footer: string;
  tone: "normal" | "warning" | "blocked";
}) {
  return (
    <div
      className={cn(
        "rounded-[4px] border p-4",
        tone === "blocked"
          ? "border-destructive/30 bg-destructive/5"
          : tone === "warning"
            ? "border-amber-400/30 bg-amber-500/5"
            : "border-border/70 bg-background/40",
      )}
    >
      <p className="text-[13px] font-medium text-foreground">{title}</p>
      <ul className="mt-3 space-y-2 text-[12px] leading-6 text-muted-foreground">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] leading-6 text-muted-foreground">
        {footer}
      </p>
    </div>
  );
}

function StageLine({ index, text }: { index: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="font-mono text-[11px] text-primary/80">{index}</span>
      <p className="text-[12px] leading-6 text-muted-foreground">{text}</p>
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
        还没有导入参考书 {label === "A" ? "1" : "2"}。
      </div>
    );
  }

  const display = deriveUploadBookDisplay(book);
  const bookLabel = label === "A" ? "参考书 1" : "参考书 2";
  const serialLabel = label === "A" ? "一" : "二";

  return (
    <div className="surface-panel flex min-h-[220px] flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow-label">{bookLabel}</p>
          <h3 className="mt-2 text-[20px] font-semibold leading-tight text-foreground">
            {`${bookLabel} · ${book.title}`}
          </h3>
        </div>
        <span className="font-mono text-[24px] text-primary/50">
          {serialLabel}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat
          label="字数"
          value={book.word_count?.toLocaleString("zh-CN") ?? "未知"}
        />
        <Stat
          label="章节"
          value={book.chapter_count?.toLocaleString("zh-CN") ?? "待切章"}
          note={display.chapterWarning}
        />
        <Stat
          label="分析方式"
          value={display.analysisMethodLabel}
          note={display.analysisMethodHint}
          tone={
            display.analysisMode === "block-fallback" ? "fallback" : "normal"
          }
        />
        <Stat
          label="分析准入"
          value={display.accessLabel}
          note={display.accessHint}
          tone={display.tone}
        />
      </div>
      <div
        className={cn(
          "rounded-[3px] border px-4 py-3",
          display.tone === "blocked"
            ? "border-destructive/35 bg-destructive/8"
            : display.tone === "warning"
              ? "border-amber-400/35 bg-amber-500/8"
              : display.tone === "fallback"
                ? "border-sky-400/30 bg-sky-500/8"
                : "border-border/70 bg-background/50",
        )}
      >
        <p className="font-mono text-[10.5px] tracking-[0.10em] text-primary/80">
          文本体检
        </p>
        <p className="mt-2 text-[14px] font-medium leading-6 text-foreground">
          {display.healthHeadline}
        </p>
        <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
          {display.healthDetail}
        </p>
        <p className="mt-3 text-[12px] leading-6 text-muted-foreground">
          {`内容类型：${display.contentTypeLabel} · 模型适配：${display.modelFitLabel}`}
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  tone = "normal",
}: {
  label: string;
  value: string;
  note?: string | null;
  tone?: "normal" | "warning" | "blocked" | "fallback";
}) {
  return (
    <div className="rounded-[3px] border border-border/70 bg-background/50 px-4 py-3">
      <p className="font-mono text-[10.5px] tracking-[0.10em] text-primary/80">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-[13px] font-medium",
          tone === "blocked"
            ? "text-destructive"
            : tone === "warning"
              ? "text-amber-300"
              : tone === "fallback"
                ? "text-sky-300"
                : "text-foreground",
        )}
      >
        {value}
      </p>
      {note ? (
        <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
          {note}
        </p>
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
    <div className="surface-panel flex min-h-[260px] flex-col items-center justify-center gap-4 p-8 text-center">
      <BookPlus
        className="h-12 w-12 text-primary/60"
        strokeWidth={1.5}
        aria-hidden
      />
      <h3 className="text-[20px] font-semibold leading-tight text-foreground">
        {`还差参考书 ${position === "A" ? "1" : "2"}`}
      </h3>
      <p className="max-w-xs text-[13px] leading-7 text-muted-foreground">
        补上缺少的参考小说后，这个任务才会开放完整的分析和对比流程。
      </p>
      <Button asChild>
        <Link href={`/upload?sessionId=${sessionId}&position=${positionIndex}`}>
          {`补充参考书 ${position === "A" ? "1" : "2"}`}
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
    const bookNo = label === "A" ? "参考书 1" : "参考书 2";
    if (!book) return `${bookNo} · 未上传`;
    const total = chapterTotals.find((item) => item.bookId === book.id);
    return `${bookNo} · ${book.title} · ${total?.analyzed ?? 0}/${total?.total ?? 0} 章`;
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
