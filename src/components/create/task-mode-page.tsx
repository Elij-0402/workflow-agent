import Link from "next/link";
import { ArrowRight, BookCopy, GitCompare, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export function TaskModePage() {
  return (
    <div className="app-page">
      <PageHeader
        label="创建项目"
        title="从双书融合开始"
        description="NovelFusion 现在默认围绕双书融合工作流组织。先选择任务模式，再进入对应的上传与创作入口。"
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_340px]">
        <article className="surface-panel p-6 sm:p-7">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow-label">推荐模式</p>
                <h2 className="mt-2 text-[24px] font-semibold leading-tight text-foreground">
                  双书融合任务
                </h2>
              </div>
              <span className="inline-flex items-center rounded-[3px] border border-primary/35 bg-primary/10 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.10em] text-primary">
                双书
              </span>
            </div>

            <p className="max-w-2xl text-[13px] leading-6 text-muted-foreground">
              导入两本参考小说后，先在概览页判断进度，再进入工作台完成章节分析、蓝图确认与结果生成。
            </p>

            <div className="grid gap-3 md:grid-cols-3">
              <ModeStep
                icon={BookCopy}
                title="上传两本"
                description="一次建立双来源素材基础。"
              />
              <ModeStep
                icon={GitCompare}
                title="分析与蓝图"
                description="整合结构、人物与情节节点。"
              />
              <ModeStep
                icon={Sparkles}
                title="生成结果"
                description="确认融合方向后再输出版本。"
              />
            </div>

            <div className="flex flex-col gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center">
              <Button asChild className="h-10 justify-center">
                <Link href="/upload?mode=dual">
                  创建双书融合任务
                  <ArrowRight />
                </Link>
              </Button>
              <p className="text-[12px] text-muted-foreground">
                推荐给需要混合两本参考小说、再进入工作台细化蓝图的项目。
              </p>
            </div>
          </div>
        </article>

        <aside className="flex flex-col gap-4">
          <section className="surface-panel p-5">
            <p className="eyebrow-label">兼容模式</p>
            <h2 className="mt-2 text-[18px] font-semibold leading-tight text-foreground">
              单书兼容任务
            </h2>
            <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
              保留旧版单书分析与生成路径，适合继续处理历史任务或只想快速验证单篇文本的情况。
            </p>

            <div className="mt-4 space-y-2 text-[12px] text-muted-foreground">
              <div>1. 上传单本 `.txt` 小说</div>
              <div>2. 完成分析后直接生成结果</div>
              <div>3. 不进入双书概览页和工作台</div>
            </div>

            <Button
              asChild
              variant="outline"
              className="mt-5 w-full justify-center"
            >
              <Link href="/upload?mode=single">进入兼容旧流程</Link>
            </Button>
          </section>

          <section className="surface-subtle p-5">
            <p className="eyebrow-label">流程说明</p>
            <div className="mt-4 space-y-3 text-[13px] leading-6 text-muted-foreground">
              <p>双书任务会先进入概览页，再根据进度进入工作台或结果区。</p>
              <p>
                旧链接 `/upload` 仍然可用，但现在会先把你带回这个模式选择入口。
              </p>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function ModeStep({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof BookCopy;
  title: string;
  description: string;
}) {
  return (
    <div className="surface-subtle flex min-h-[144px] flex-col gap-3 p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-[3px] border border-primary/30 bg-background text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[14px] font-medium text-foreground">{title}</p>
        <p className="mt-2 text-[12px] leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
