import type { ProjectOverview } from "@/lib/projects/overview";
import type { ExtendedAnalysisDimension } from "@/lib/types";

import { ExtendedAnalysisPanel } from "@/app/(app)/sessions/[id]/extended-analysis-panel";
import { EditorialRecommendationPanel } from "./editorial-recommendation-panel";
import { ImportHealthPanel } from "./import-health-panel";
import { ProjectKeyResults } from "./project-key-results";
import { ProjectModuleNav } from "./project-module-nav";
import { ProjectOverviewHeader } from "./project-overview-header";

type ProjectOverviewPageProps = {
  sessionId: string;
  sessionName: string;
  overview: ProjectOverview;
  books: Array<{
    id: string;
    title: string;
    chapter_count: number | null;
    metadata: Record<string, unknown>;
    extendedAnalyses?: Array<{
      dimension: ExtendedAnalysisDimension;
      result: unknown;
    }>;
  }>;
  llmConfigured?: boolean;
  extendedAnalysisDisabled?: boolean;
};

export function ProjectOverviewPage({
  sessionId,
  sessionName,
  overview,
  books,
  llmConfigured = false,
  extendedAnalysisDisabled = false,
}: ProjectOverviewPageProps) {
  return (
    <div className="app-page">
      <ProjectModuleNav sessionId={sessionId} current="概览" />

      <ProjectOverviewHeader
        title={sessionName}
        statusLabel={overview.statusLabel}
        progressLabel={overview.progressLabel}
        nextAction={overview.nextAction}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <EditorialRecommendationPanel bullets={overview.editorialBullets} />
        <div className="space-y-6">
          <ProjectKeyResults items={overview.keyResults} />
          <section className="surface-panel p-6">
            <p className="eyebrow-label">下一步</p>
            <h2 className="mt-2 text-[20px] font-semibold leading-tight text-foreground">
              继续推进项目
            </h2>
            <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
              当前最关键的动作已经收敛到一条主线，优先完成它，再进入下一轮简报或结果迭代。
            </p>
            <a
              href={overview.nextAction.href}
              className="mt-5 inline-flex items-center rounded-md bg-primary px-4 py-2 text-[13px] text-primary-foreground transition-opacity hover:opacity-90"
            >
              {overview.nextAction.label}
            </a>
          </section>
        </div>
      </div>

      <ImportHealthPanel books={books} />

      {books.length > 0 ? (
        <section className="space-y-6">
          <div>
            <p className="eyebrow-label">扩展分析</p>
            <h2 className="mt-2 text-[20px] font-semibold leading-tight text-foreground">
              写作技法与节奏洞察
            </h2>
            <p className="mt-2 max-w-3xl text-[13px] leading-6 text-muted-foreground">
              针对每本参考书运行
              prose_craft、emotion_arc、pacing_map、suspense_grid 四维扩展分析。
            </p>
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            {books.map((book) => (
              <ExtendedAnalysisPanel
                key={book.id}
                bookId={book.id}
                analyses={book.extendedAnalyses ?? []}
                llmConfigured={llmConfigured}
                disabled={extendedAnalysisDisabled}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
        <div className="surface-panel p-6">
          <div className="flex flex-col gap-2">
            <p className="eyebrow-label">参考书</p>
            <h2 className="text-[20px] font-semibold leading-tight text-foreground">
              参考书摘要
            </h2>
            <p className="max-w-2xl text-[13px] leading-6 text-muted-foreground">
              当前项目以参考书为输入来源。概览页负责判断项目状态，章节分析与蓝图编辑继续在工作台完成。
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {books.map((book, index) => (
              <article
                key={book.id}
                className="surface-subtle flex flex-col gap-3 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="mono-label-sm">参考书 {index + 1}</p>
                  <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                    {book.chapter_count ?? 0} 章
                  </span>
                </div>
                <h3 className="text-[16px] font-semibold leading-6 text-foreground">
                  {book.title}
                </h3>
              </article>
            ))}
          </div>
        </div>

        <div className="surface-panel p-6">
          <div className="flex flex-col gap-2">
            <p className="eyebrow-label">最近状态</p>
            <h2 className="text-[20px] font-semibold leading-tight text-foreground">
              项目主线
            </h2>
          </div>

          <div className="mt-5 space-y-4">
            <div className="surface-subtle px-4 py-3">
              <p className="mono-label-sm">当前阶段</p>
              <p className="mt-2 text-[14px] text-foreground">
                {overview.statusLabel}
              </p>
            </div>
            <div className="surface-subtle px-4 py-3">
              <p className="mono-label-sm">推进提示</p>
              <p className="mt-2 text-[14px] leading-6 text-foreground">
                {overview.progressLabel}
              </p>
            </div>
            <div className="surface-subtle px-4 py-3">
              <p className="mono-label-sm">结果判断</p>
              <p className="mt-2 text-[14px] leading-6 text-foreground">
                {overview.editorialBullets[0]}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
