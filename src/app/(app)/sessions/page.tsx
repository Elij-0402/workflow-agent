import { Archive, BookOpen } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

import { SessionsClient } from "./SessionsClient";

type Props = {
  searchParams: Promise<{ view?: string; with?: string }>;
};

export default async function SessionsPage({ searchParams }: Props) {
  const { view: viewParam } = await searchParams;
  const view: "active" | "archived" =
    viewParam === "archived" ? "archived" : "active";

  const supabase = await createClient();
  const query = supabase
    .from("sessions")
    .select("id, name, status, mode, archived_at, created_at, updated_at");
  const { data: sessions } =
    view === "archived"
      ? await query
          .not("archived_at", "is", null)
          .order("archived_at", { ascending: false })
      : await query
          .is("archived_at", null)
          .order("updated_at", { ascending: false });

  const list = sessions ?? [];

  return (
    <div className="app-page">
      <PageHeader
        label={view === "archived" ? "tasks · archived" : "tasks"}
        title={view === "archived" ? "归档任务" : "任务"}
        description={
          view === "archived"
            ? "归档任务仍可恢复。永久删除会同时移除分析、章节和生成结果。"
            : "这里保留所有任务。打开任意任务后，会在同一个页面里完成上传、分析、对比和生成。"
        }
      />

      {list.length > 0 ? (
        <SessionsClient sessions={list} view={view} />
      ) : (
        <div className="surface-panel flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
          {view === "archived" ? (
            <Archive
              className="h-12 w-12 text-primary/60"
              strokeWidth={1.5}
              aria-hidden
            />
          ) : (
            <BookOpen
              className="h-12 w-12 text-primary/60"
              strokeWidth={1.5}
              aria-hidden
            />
          )}
          <h3 className="text-[18px] font-semibold leading-tight text-foreground">
            {view === "archived" ? "归档夹是空的" : "还没有任务"}
          </h3>
          <p className="max-w-md text-[13px] leading-6 text-muted-foreground">
            {view === "archived"
              ? "任务归档后会出现在这里。"
              : "导入两本参考小说后，分析进度、对比蓝图和生成结果都会保留在这里。"}
          </p>
          {view === "active" ? (
            <Button asChild>
              <Link href="/upload">开始新任务</Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/sessions">返回任务列表</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
