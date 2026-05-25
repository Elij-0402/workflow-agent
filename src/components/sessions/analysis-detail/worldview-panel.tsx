import { WorldviewResultSchema } from "@/lib/types";

import {
  DetailBlock,
  EmptyText,
  InvalidResultNotice,
  OverflowTable,
  SectionTitle,
  Separator,
} from "./shared";

function importanceLabel(value: "low" | "medium" | "high") {
  if (value === "high") return "高";
  if (value === "medium") return "中";
  return "低";
}

export function WorldviewPanel({ result }: { result: unknown }) {
  const parsed = WorldviewResultSchema.safeParse(result);
  if (!parsed.success) return <InvalidResultNotice />;
  const data = parsed.data;

  return (
    <div className="space-y-6 text-[13px] leading-7 text-muted-foreground">
      <div className="grid gap-3 md:grid-cols-2">
        <DetailBlock label="世界类型" value={data.type} />
        <DetailBlock
          label="力量体系"
          value={data.power_system ?? "未明确提及"}
        />
        <DetailBlock
          className="md:col-span-2"
          label="背景设定"
          value={data.setting}
        />
      </div>

      <Separator />

      <div className="space-y-3">
        <SectionTitle title="关键场景" token="地点分布" />
        {data.locations.length > 0 ? (
          <OverflowTable
            headers={["地点", "描述", "重要度"]}
            rows={data.locations.map((location) => [
              location.name,
              location.description,
              importanceLabel(location.importance),
            ])}
          />
        ) : (
          <EmptyText text="暂无地点信息。" />
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <SectionTitle title="核心规则" token="规则摘要" />
        {data.rules.length > 0 ? (
          <ul className="space-y-2">
            {data.rules.map((rule, idx) => (
              <li
                key={rule}
                className="flex gap-3 rounded-[3px] border border-border bg-background/40 px-3 py-2 text-foreground"
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-primary/80">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="flex-1">{rule}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyText text="暂无明确规则。" />
        )}
      </div>
    </div>
  );
}
