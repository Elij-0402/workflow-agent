"use client";

import { useMemo } from "react";

import { CompareEmptyHint } from "@/components/compare/CompareEmptyHint";
import { Badge } from "@/components/ui/badge";
import { getBookColorHsl } from "@/lib/compare/book-color";
import { useDrawer } from "@/lib/compare/drawer-context";
import { multiwayTag, type MultiwayEntry } from "@/lib/compare/multi-diff";
import { WorldviewResultSchema, type WorldviewResult } from "@/lib/types";

type Book = {
  bookId: string;
  label: string;
  index: number;
  result: unknown;
};

type ParsedBook = { book: Book; data: WorldviewResult };

const IMPORTANCE_COLOR: Record<WorldviewResult["locations"][number]["importance"], string> = {
  high: "hsl(var(--primary))",
  medium: "hsl(var(--chart-3))",
  low: "hsl(var(--muted-foreground) / 0.6)",
};

const IMPORTANCE_LABEL: Record<WorldviewResult["locations"][number]["importance"], string> = {
  high: "高",
  medium: "中",
  low: "低",
};

function parseSeries(books: Book[]): ParsedBook[] {
  const out: ParsedBook[] = [];
  for (const b of books) {
    const p = WorldviewResultSchema.safeParse(b.result);
    if (p.success) out.push({ book: b, data: p.data });
  }
  return out;
}

function RuleChip({
  entry,
  series,
}: {
  entry: MultiwayEntry<string>;
  series: ParsedBook[];
}) {
  const text = entry.items[0] ?? entry.key;
  const isShared = entry.tag === "common" || entry.tag === "majority";
  if (isShared) {
    return (
      <Badge variant="default" className="font-mono text-[11px]">
        {text}
        <span className="ml-1 text-primary/70">×{entry.bookIndices.length}</span>
      </Badge>
    );
  }
  const bookIdx = entry.bookIndices[0];
  const book = series.find((s) => s.book.index === bookIdx)?.book;
  return (
    <Badge
      variant="outline"
      className="font-mono text-[11px]"
      style={{
        borderColor: getBookColorHsl(bookIdx, 0.65),
        color: getBookColorHsl(bookIdx, 0.95),
      }}
    >
      {text}
      <span className="ml-1 opacity-60">{book?.label.replace("BOOK ", "")}</span>
    </Badge>
  );
}

export function WorldviewCompare({ books }: { books: Book[] }) {
  const series = useMemo(() => parseSeries(books), [books]);
  const { open } = useDrawer();

  const ruleEntries = useMemo(
    () =>
      multiwayTag(
        series.map((s) => s.data.rules ?? []),
        (s) => s,
      ),
    [series],
  );

  if (series.length === 0) {
    return <CompareEmptyHint message="无可用世界观数据" />;
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="surface-panel overflow-hidden">
        <div className="grid grid-cols-[120px_1fr_1fr_1fr] gap-0 border-b border-border/60 bg-background/40 px-4 py-2">
          <span className="eyebrow-label">book</span>
          <span className="eyebrow-label">type</span>
          <span className="eyebrow-label">setting</span>
          <span className="eyebrow-label">power system</span>
        </div>
        {series.map(({ book, data }) => (
          <div
            key={book.bookId}
            className="grid grid-cols-[120px_1fr_1fr_1fr] gap-0 border-b border-border/30 px-4 py-3 last:border-b-0"
            style={{ borderLeft: `3px solid ${getBookColorHsl(book.index)}` }}
          >
            <span
              className="font-mono text-[11px] uppercase tracking-[0.10em]"
              style={{ color: getBookColorHsl(book.index, 0.95) }}
            >
              {book.label}
            </span>
            <span className="text-[13px] text-foreground">{data.type || "—"}</span>
            <span className="text-[13px] text-muted-foreground">{data.setting || "—"}</span>
            <span className="text-[13px] text-muted-foreground">{data.power_system || "—"}</span>
          </div>
        ))}
      </section>

      <section>
        <div className="flex items-baseline gap-3 pb-2">
          <h4 className="font-display text-[16px] italic text-foreground">世界法则</h4>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-primary/70">
            {`// shared ${ruleEntries.filter((e) => e.tag !== "exclusive").length} · exclusive ${ruleEntries.filter((e) => e.tag === "exclusive").length}`}
          </span>
        </div>
        {ruleEntries.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">无 rules 数据</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {ruleEntries.map((entry) => (
              <RuleChip key={entry.key} entry={entry} series={series} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-baseline gap-3 pb-2">
          <h4 className="font-display text-[16px] italic text-foreground">主要场所</h4>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-primary/70">
            {`// click a row for detail`}
          </span>
        </div>
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${series.length}, minmax(220px, 1fr))` }}
        >
          {series.map(({ book, data }) => (
            <div key={book.bookId} className="surface-subtle flex flex-col">
              <div
                className="h-[2px] w-full"
                style={{ background: getBookColorHsl(book.index) }}
              />
              <div className="flex items-center justify-between px-3 py-2">
                <span
                  className="font-mono text-[10px] uppercase tracking-[0.10em]"
                  style={{ color: getBookColorHsl(book.index, 0.95) }}
                >
                  {book.label}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground/70">
                  {data.locations.length} 处
                </span>
              </div>
              <ul className="flex flex-col">
                {data.locations.length === 0 ? (
                  <li className="px-3 py-2 text-[12.5px] text-muted-foreground/70">
                    —
                  </li>
                ) : (
                  data.locations.map((loc) => (
                    <li key={loc.name}>
                      <button
                        type="button"
                        onClick={() =>
                          open({
                            title: loc.name,
                            bookLabel: book.label,
                            bookIndex: book.index,
                            eyebrow: "location",
                            badges: [`重要性 ${IMPORTANCE_LABEL[loc.importance]}`],
                            paragraphs: [loc.description],
                          })
                        }
                        className="flex w-full items-center justify-between border-t border-border/40 px-3 py-2 text-left text-[12.5px] text-foreground transition-colors hover:bg-background/40"
                      >
                        <span className="line-clamp-1 flex-1 pr-2">{loc.name}</span>
                        <span
                          aria-hidden
                          className="inline-block h-[6px] w-[6px] rounded-full"
                          style={{ background: IMPORTANCE_COLOR[loc.importance] }}
                          title={IMPORTANCE_LABEL[loc.importance]}
                        />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
