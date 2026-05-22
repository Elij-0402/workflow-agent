import Link from "next/link";
import { Sparkles } from "lucide-react";

import { BriefCreateSheet } from "@/components/studio/brief-create-sheet";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { BriefStatusBadge } from "@/components/ui/status-badge";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRelativeTime } from "@/lib/utils";

export default async function StudioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: briefs }, { data: sessions }] = await Promise.all([
    supabase
      .from("creative_briefs")
      .select("id, session_id, title, status, created_at, updated_at")
      .eq("user_id", user?.id ?? "")
      .order("updated_at", { ascending: false }),
    supabase
      .from("sessions")
      .select("id, name, mode")
      .eq("user_id", user?.id ?? "")
      .is("archived_at", null)
      .order("updated_at", { ascending: false }),
  ]);

  const briefList = briefs ?? [];
  const sessionList = sessions ?? [];
  const sessionById = new Map(sessionList.map((s) => [s.id, s]));

  return (
    <div className="app-page">
      <PageHeader
        label="studio"
        title="创意工作室"
        description="为每个项目创建创意简报：人设改造 + 情节调整 + 文风偏好 + 保留规则。简报会注入到变体生成。"
        action={<BriefCreateSheet sessions={sessionList} />}
      />

      {briefList.length === 0 ? (
        <div className="surface-panel flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <Sparkles className="h-12 w-12 text-primary/60" strokeWidth={1.5} aria-hidden />
          <h3 className="font-display text-[22px] italic leading-tight text-foreground">
            还没有简报
          </h3>
          <p className="max-w-md text-[13.5px] leading-7 text-muted-foreground">
            {sessionList.length > 0
              ? "点击右上角「新建简报」选择一个项目即可开始。"
              : "先去导入第一个项目，再来创建简报。"}
          </p>
          {sessionList.length === 0 ? (
            <Button asChild>
              <Link href="/upload">导入新项目</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {briefList.map((b) => {
            const session = sessionById.get(b.session_id);
            return (
              <Link
                key={b.id}
                href={`/studio/${b.id}`}
                className="surface-panel group flex h-full flex-col p-5 transition-colors hover:border-primary/60"
              >
                <BriefStatusBadge status={b.status} />
                <h3 className="mt-3 line-clamp-2 font-display text-[20px] italic leading-tight text-foreground">
                  {b.title}
                </h3>
                <p className="mt-2 text-[12.5px] text-muted-foreground">
                  项目：{session?.name ?? "未知项目"}
                </p>
                <div className="mt-auto border-t border-border/40 pt-4 font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">
                  <div>updated · {formatRelativeTime(b.updated_at)}</div>
                  <div className="text-muted-foreground/60">
                    created · {formatDate(b.created_at)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
