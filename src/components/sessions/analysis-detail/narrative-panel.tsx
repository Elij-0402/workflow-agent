import { Badge } from "@/components/ui/badge";
import { NarrativeResultSchema } from "@/lib/types";

import {
  DetailBlock,
  EmptyText,
  InvalidResultNotice,
  OverflowTable,
  SectionTitle,
  Separator,
} from "./shared";

export function NarrativePanel({ result }: { result: unknown }) {
  const parsed = NarrativeResultSchema.safeParse(result);
  if (!parsed.success) return <InvalidResultNotice />;
  const data = parsed.data;

  return (
    <div className="space-y-6 text-[13px] leading-7 text-muted-foreground">
      <div className="grid gap-3 md:grid-cols-3">
        <DetailBlock label="structure" value={data.structure} />
        <DetailBlock label="viewpoint" value={data.viewpoint} />
        <DetailBlock label="pacing" value={data.pacing} />
      </div>

      <Separator />

      <div className="space-y-3">
        <SectionTitle title="主题与冲突" token="themes · conflicts" />
        <div className="space-y-4">
          <div>
            <p className="data-label mb-2">themes</p>
            <div className="flex flex-wrap gap-2">
              {data.themes.length > 0 ? (
                data.themes.map((theme) => (
                  <Badge key={theme} variant="secondary">
                    {theme}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">暂无</span>
              )}
            </div>
          </div>
          <div>
            <p className="data-label mb-2">conflicts</p>
            {data.conflicts.length > 0 ? (
              <ul className="space-y-2">
                {data.conflicts.map((conflict, idx) => (
                  <li
                    key={conflict}
                    className="flex gap-3 rounded-[3px] border border-border bg-background/40 px-3 py-2 text-foreground"
                  >
                    <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-primary/80">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1">{conflict}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyText text="暂无明确冲突信息。" />
            )}
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <SectionTitle title="关键转折点" token="turning points" />
        {data.turning_points.length > 0 ? (
          <OverflowTable
            headers={["标题", "描述", "影响值"]}
            rows={data.turning_points.map((point) => [
              point.title,
              point.description,
              String(point.impact),
            ])}
          />
        ) : (
          <EmptyText text="暂无转折点信息。" />
        )}
      </div>
    </div>
  );
}
