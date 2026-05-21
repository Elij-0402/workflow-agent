import { Badge } from "@/components/ui/badge";
import { CharactersResultSchema } from "@/lib/types";

import { EmptyText, InvalidResultNotice, OverflowTable, SectionTitle, Separator } from "./shared";

function roleLabel(value: "protagonist" | "antagonist" | "supporting") {
  if (value === "protagonist") return "主角";
  if (value === "antagonist") return "对立方";
  return "配角";
}

export function CharactersPanel({ result }: { result: unknown }) {
  const parsed = CharactersResultSchema.safeParse(result);
  if (!parsed.success) return <InvalidResultNotice />;
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
