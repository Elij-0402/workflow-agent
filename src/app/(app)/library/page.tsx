import Link from "next/link";
import { ArchiveRestore, LibraryBig } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { safeGetUser } from "@/lib/supabase/auth";
import { loadSessionDashboard } from "@/lib/sessions/dashboard-server";

import { SessionsClient } from "../sessions/SessionsClient";

export default async function LibraryPage() {
  const supabase = await createClient();
  const { user } = await safeGetUser(supabase, "library-page");

  const { sessions } = user
    ? await loadSessionDashboard({
        supabase,
        userId: user.id,
        view: "archived",
      })
    : { sessions: [] };

  return (
    <div className="app-page">
      <PageHeader
        label="资料库"
        title="归档项目与历史结果"
        description="把已经暂停的项目收在这里，主列表只保留当前需要推进的工作。"
        action={
          <Button asChild variant="outline">
            <Link href="/sessions">返回项目</Link>
          </Button>
        }
      />

      <div className="surface-panel p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow-label">归档</p>
            <h2 className="mt-2 text-[20px] font-semibold text-foreground">
              {sessions.length} 个归档项目
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
              归档不会删除分析、蓝图和结果。需要继续时，直接恢复到项目列表。
            </p>
          </div>
          <LibraryBig className="h-5 w-5 text-primary" aria-hidden />
        </div>
      </div>

      {sessions.length > 0 ? (
        <SessionsClient sessions={sessions} view="archived" />
      ) : (
        <EmptyState
          icon={ArchiveRestore}
          title="资料库还是空的"
          description="暂时还没有归档项目。需要清理主列表时，把不急着推进的项目移到这里。"
          className="py-14"
        />
      )}
    </div>
  );
}
