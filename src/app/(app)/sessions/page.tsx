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
  const { view: viewParam, with: withParam } = await searchParams;
  const view: "active" | "archived" = viewParam === "archived" ? "archived" : "active";

  const supabase = await createClient();
  const query = supabase
    .from("sessions")
    .select("id, name, status, mode, archived_at, created_at, updated_at");
  const { data: sessions } =
    view === "archived"
      ? await query.not("archived_at", "is", null).order("archived_at", { ascending: false })
      : await query.is("archived_at", null).order("updated_at", { ascending: false });

  const list = sessions ?? [];

  return (
    <div className="app-page">
      <PageHeader
        label={view === "archived" ? "projects · archived" : "projects"}
        title={view === "archived" ? "归档夹" : "我的项目"}
        description={
          view === "archived"
            ? "归档的项目仍可恢复；永久删除会同时移除分析、章节、变体。"
            : "导入和分析过的所有项目都在这里。多选两个或更多项目可进入对比。"
        }
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/upload">导入新项目</Link>
          </Button>
        }
      />

      {list.length > 0 ? (
        <SessionsClient sessions={list} view={view} initialWith={withParam ?? null} />
      ) : (
        <div className="surface-panel flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          {view === "archived" ? (
            <Archive className="h-12 w-12 text-primary/60" strokeWidth={1.5} aria-hidden />
          ) : (
            <BookOpen className="h-12 w-12 text-primary/60" strokeWidth={1.5} aria-hidden />
          )}
          <h3 className="font-display text-[22px] italic leading-tight text-foreground">
            {view === "archived" ? "归档夹是空的" : "还没有项目"}
          </h3>
          <p className="max-w-md text-[13.5px] leading-7 text-muted-foreground">
            {view === "archived"
              ? "在项目列表的卡片菜单选择「归档」后，项目会移到这里。"
              : "导入第一部小说后，所有分析进度、生成结果都会保留在这里。"}
          </p>
          {view === "active" ? (
            <Button asChild>
              <Link href="/upload">开始新项目</Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/sessions">返回项目列表</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
