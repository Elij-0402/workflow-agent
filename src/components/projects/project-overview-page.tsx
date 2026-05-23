import type { ProjectOverview } from "@/lib/projects/overview";

import { EditorialRecommendationPanel } from "./editorial-recommendation-panel";
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
  }>;
};

export function ProjectOverviewPage({
  sessionId,
  sessionName,
  overview,
  books,
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <EditorialRecommendationPanel bullets={overview.editorialBullets} />
        <ProjectKeyResults items={overview.keyResults} />
      </div>

      <section className="surface-panel p-6">
        <div className="flex flex-col gap-2">
          <p className="eyebrow-label">reference books</p>
          <h2 className="text-[20px] font-semibold leading-tight text-foreground">
            参考小说
          </h2>
          <p className="max-w-2xl text-[13px] leading-6 text-muted-foreground">
            当前项目以两本参考小说作为融合来源。概览页负责判断下一步，章节分析与蓝图编辑继续在工作台完成。
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {books.map((book, index) => (
            <article
              key={book.id}
              className="surface-subtle flex flex-col gap-3 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="mono-label-sm">参考小说 {index + 1}</p>
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                  chapters {book.chapter_count ?? 0}
                </span>
              </div>
              <h3 className="text-[16px] font-semibold leading-6 text-foreground">
                {book.title}
              </h3>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
