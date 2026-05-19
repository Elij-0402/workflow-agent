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
      <div className="space-y-5 text-[13px] leading-6 text-muted-foreground">
        <div className="grid gap-3 md:grid-cols-2">
          <DetailBlock label="世界类型" value={data.type} />
          <DetailBlock
            label="力量体系"
            value={data.power_system ?? "未明确提及"}
          />
          <DetailBlock className="md:col-span-2" label="时代背景" value={data.setting} />
        </div>

        <Separator className="bg-border/60" />

        <div className="space-y-3">
          <SectionTitle title="关键场景" />
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

        <Separator className="bg-border/60" />

        <div className="space-y-3">
          <SectionTitle title="核心规则" />
          {data.rules.length > 0 ? (
            <ul className="space-y-2">
              {data.rules.map((rule) => (
                <li
                  key={rule}
                  className="rounded-[7px] border border-border/70 bg-background/40 px-3 py-2 text-foreground"
                >
                  {rule}
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
      <div className="space-y-5 text-[13px] leading-6 text-muted-foreground">
        <div className="space-y-3">
          <SectionTitle title="主要人物" />
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

        <Separator className="bg-border/60" />

        <div className="space-y-3">
          <SectionTitle title="人物关系" />
          {data.relationships.length > 0 ? (
            <div className="space-y-2">
              {data.relationships.map((relationship) => (
                <div
                  key={`${relationship.from}-${relationship.to}-${relationship.type}`}
                  className="rounded-[7px] border border-border/70 bg-background/40 px-3 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">
                      {relationship.from}
                    </span>
                    <span>→</span>
                    <span className="font-medium text-foreground">
                      {relationship.to}
                    </span>
                    <Badge variant="outline">{relationship.type}</Badge>
                  </div>
                  <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
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
      <div className="space-y-5 text-[13px] leading-6 text-muted-foreground">
      <div className="grid gap-3 md:grid-cols-3">
        <DetailBlock label="叙事结构" value={data.structure} />
        <DetailBlock label="叙事视角" value={data.viewpoint} />
        <DetailBlock label="节奏" value={data.pacing} />
      </div>

      <Separator className="bg-border/60" />

      <div className="space-y-3">
        <SectionTitle title="主题与冲突" />
        <div className="space-y-3">
          <div>
            <p className="mb-2 text-[12px] uppercase tracking-[0.12em] text-muted-foreground/70">
              主题
            </p>
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
            <p className="mb-2 text-[12px] uppercase tracking-[0.12em] text-muted-foreground/70">
              冲突
            </p>
            {data.conflicts.length > 0 ? (
              <ul className="space-y-2">
                {data.conflicts.map((conflict) => (
                  <li
                    key={conflict}
                    className="rounded-[7px] border border-border/70 bg-background/40 px-3 py-2 text-foreground"
                  >
                    {conflict}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyText text="暂无明确冲突信息。" />
            )}
          </div>
        </div>
      </div>

      <Separator className="bg-border/60" />

      <div className="space-y-3">
        <SectionTitle title="关键转折点" />
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
    <p className="rounded-[7px] border border-border/70 bg-background/40 px-3 py-3 text-[13px] leading-6 text-muted-foreground">
      当前结果结构不完整，请重新运行该维度分析。
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
      <p className="data-label">
        {label}
      </p>
      <p className="mt-2 rounded-[7px] border border-border/70 bg-background/40 px-3 py-2 text-foreground">
        {value}
      </p>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h4 className="data-label">{title}</h4>
  );
}

function EmptyText({ text }: { text: string }) {
  return <p className="text-[13px] text-muted-foreground">{text}</p>;
}

function OverflowTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto rounded-[8px] border border-border/70 bg-background/20">
      <Table className="text-[13px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {headers.map((header) => (
              <TableHead key={header} className="px-3 py-2 text-[12px] font-medium">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={`${row[0]}-${index}`} className="hover:bg-background/20">
              {row.map((cell, cellIndex) => (
                <TableCell
                  key={`${row[0]}-${cellIndex}`}
                  className="px-3 py-2 align-top text-[13px] text-foreground"
                >
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
