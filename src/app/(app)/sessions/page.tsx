import { BookOpen } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

import { SessionsClient } from "./SessionsClient";

export default async function SessionsPage() {
  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, name, status, mode, archived_at, created_at, updated_at")
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  const list = sessions ?? [];

  return (
    <div className="app-page">
      <PageHeader
        label="projects"
        title="我的项目"
        description="导入和分析过的所有项目都在这里。"
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/sessions/archived">归档夹</Link>
          </Button>
        }
      />

      {list.length > 0 ? (
        <SessionsClient sessions={list} view="active" />
      ) : (
        <div className="surface-panel flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <BookOpen className="h-12 w-12 text-primary/60" strokeWidth={1.5} aria-hidden />
          <h3 className="font-display text-[22px] italic leading-tight text-foreground">
            还没有项目
          </h3>
          <p className="max-w-md text-[13.5px] leading-7 text-muted-foreground">
            导入第一部小说后，所有分析进度、生成结果都会保留在这里。
          </p>
          <Button asChild>
            <Link href="/upload">开始新项目</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
