import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CharactersResultSchema,
  NarrativeResultSchema,
  WorldviewResultSchema,
  type AnalysisDimension,
} from "@/lib/types";

type AnalysisDetailProps = {
  dimension: AnalysisDimension;
  result: unknown;
};

export function AnalysisDetail({ dimension, result }: AnalysisDetailProps) {
  if (dimension === "worldview") {
    const parsed = WorldviewResultSchema.safeParse(result);

    if (!parsed.success) {
      return <InvalidResultNotice />;
    }

    const data = parsed.data;

    return (
      <div className="space-y-6 text-[13px] leading-7 text-muted-foreground">
        <div className="grid gap-3 md:grid-cols-2">
          <DetailBlock label="world type" value={data.type} />
          <DetailBlock label="power system" value={data.power_system ?? "未明确提及"} />
          <DetailBlock className="md:col-span-2" label="setting" value={data.setting} />
        </div>

        <Separator />

        <div className="space-y-3">
          <SectionTitle title="关键场景" token="locations" />
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
          <SectionTitle title="核心规则" token="rules" />
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

  if (dimension === "characters") {
    const parsed = CharactersResultSchema.safeParse(result);

    if (!parsed.success) {
      return <InvalidResultNotice />;
    }

    const data = parsed.data;

    return (
      <div className="space-y-6 text-[13px] leading-7 text-muted-foreground">
        <div className="space-y-3">
          <SectionTitle title="主要人物" token="characters" />
          {data.characters.length > 0 ? (
            <OverflowTable
              headers={["角色", "定位", "特征", "背景"]}
              rows={data.characters.map((character) => [
                character.name,
                roleLabel(character.role),
                character.traits.join(" / ") || "无",
                character.background,
              ])}
            />
          ) : (
            <EmptyText text="暂无人物信息。" />
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          <SectionTitle title="人物关系" token="relationships" />
          {data.relationships.length > 0 ? (
            <div className="space-y-2">
              {data.relationships.map((relationship) => (
                <div
                  key={`${relationship.from}-${relationship.to}-${relationship.type}`}
                  className="rounded-[3px] border border-border bg-background/40 px-3 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2 font-mono text-[12px]">
                    <span className="text-foreground">{relationship.from}</span>
                    <span className="text-primary">→</span>
                    <span className="text-foreground">{relationship.to}</span>
                    <Badge variant="outline">{relationship.type}</Badge>
                  </div>
                  <p className="mt-2 text-[13px] leading-7 text-muted-foreground">
                    {relationship.description}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyText text="暂无明确关系信息。" />
          )}
        </div>
      </div>
    );
  }

  const parsed = NarrativeResultSchema.safeParse(result);

  if (!parsed.success) {
    return <InvalidResultNotice />;
  }

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

function InvalidResultNotice() {
  return (
    <p className="bg-destructive/8 rounded-[3px] border border-destructive/40 px-3 py-3 font-mono text-[12px] uppercase tracking-[0.08em] text-destructive">
      {"// schema invalid — please rerun this dimension"}
    </p>
  );
}

function DetailBlock({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="data-label">{`// ${label}`}</p>
      <p className="mt-2 rounded-[3px] border border-border bg-background/40 px-3 py-2 text-foreground">
        {value}
      </p>
    </div>
  );
}

function SectionTitle({ title, token }: { title: string; token?: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <h4 className="font-display text-[16px] italic text-foreground">{title}</h4>
      {token ? (
        <span className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-primary/70">
          {`// ${token}`}
        </span>
      ) : null}
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <p className="text-[13px] text-muted-foreground">{text}</p>;
}

function OverflowTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-[3px] border border-border bg-background/30">
      <Table className="text-[13px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {headers.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={`${row[0]}-${index}`}>
              {row.map((cell, cellIndex) => (
                <TableCell key={`${row[0]}-${cellIndex}`} className="align-top text-foreground">
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function importanceLabel(value: "low" | "medium" | "high") {
  if (value === "high") return "高";
  if (value === "medium") return "中";
  return "低";
}

function roleLabel(value: "protagonist" | "antagonist" | "supporting") {
  if (value === "protagonist") return "主角";
  if (value === "antagonist") return "对立方";
  return "配角";
}
