import { Archive } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

import { SessionsClient } from "../SessionsClient";

export default async function ArchivedSessionsPage() {
  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, name, status, mode, archived_at, created_at, updated_at")
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false });

  const list = sessions ?? [];

  return (
    <div className="app-page">
      <PageHeader
        label="archive"
        title="归档夹"
        description="归档的项目仍可恢复；永久删除会同时移除分析、章节、变体。"
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/sessions">返回项目列表</Link>
          </Button>
        }
      />

      {list.length > 0 ? (
        <SessionsClient sessions={list} view="archived" />
      ) : (
        <div className="surface-panel flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <Archive className="h-12 w-12 text-primary/60" strokeWidth={1.5} aria-hidden />
          <h3 className="font-display text-[22px] italic leading-tight text-foreground">
            归档夹是空的
          </h3>
          <p className="max-w-md text-[13.5px] leading-7 text-muted-foreground">
            在项目列表的卡片菜单选择「归档」后，项目会移到这里。
          </p>
        </div>
      )}
    </div>
  );
}
