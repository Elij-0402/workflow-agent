"use client";

import { useMemo } from "react";

import { CompareEmptyHint } from "@/components/compare/CompareEmptyHint";
import { getBookColorHsl } from "@/lib/compare/book-color";
import { useDrawer } from "@/lib/compare/drawer-context";
import { CharactersResultSchema, type CharactersResult } from "@/lib/types";

type Book = {
  bookId: string;
  label: string;
  index: number;
  result: unknown;
};

type ParsedBook = { book: Book; data: CharactersResult };

type Role = CharactersResult["characters"][number]["role"];

const ROLE_LABEL: Record<Role, string> = {
  protagonist: "主角",
  antagonist: "反派",
  supporting: "配角",
};

const ROLE_ORDER: Role[] = ["protagonist", "antagonist", "supporting"];

function parseSeries(books: Book[]): ParsedBook[] {
  const out: ParsedBook[] = [];
  for (const b of books) {
    const p = CharactersResultSchema.safeParse(b.result);
    if (p.success) out.push({ book: b, data: p.data });
  }
  return out;
}

export function CharactersCompare({ books }: { books: Book[] }) {
  const series = useMemo(() => parseSeries(books), [books]);
  const { open } = useDrawer();

  if (series.length === 0) {
    return <CompareEmptyHint message="无可用人物数据" />;
  }

  return (
    <div className="flex flex-col gap-5">
      {ROLE_ORDER.map((role) => {
        const totalInRole = series.reduce(
          (n, s) => n + s.data.characters.filter((c) => c.role === role).length,
          0,
        );
        if (totalInRole === 0) return null;
        return (
          <section key={role}>
            <div className="flex items-baseline gap-3 pb-2">
              <h4 className="font-display text-[16px] italic text-foreground">
                {ROLE_LABEL[role]}
              </h4>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-primary/70">
                {`// ${totalInRole} across ${series.length} books`}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {series.map(({ book, data }) => {
                const chars = data.characters.filter((c) => c.role === role);
                return (
                  <div
                    key={book.bookId}
                    className="flex items-start gap-3 rounded-[3px] border border-border/40 bg-background/30 px-3 py-2"
                    style={{
                      borderLeft: `3px solid ${getBookColorHsl(book.index)}`,
                    }}
                  >
                    <span
                      className="w-[36px] shrink-0 font-mono text-[10.5px] uppercase tracking-[0.10em]"
                      style={{ color: getBookColorHsl(book.index, 0.95) }}
                    >
                      {book.label.replace("BOOK ", "")}
                    </span>
                    {chars.length === 0 ? (
                      <span className="text-[12.5px] text-muted-foreground/70">
                        —
                      </span>
                    ) : (
                      <div className="flex flex-1 flex-wrap gap-1.5">
                        {chars.map((c) => (
                          <button
                            key={`${book.bookId}-${c.name}`}
                            type="button"
                            onClick={() =>
                              open({
                                title: c.name,
                                bookLabel: book.label,
                                bookIndex: book.index,
                                eyebrow: ROLE_LABEL[role],
                                badges: c.traits.slice(0, 8),
                                meta:
                                  c.background.trim().length > 0
                                    ? [
                                        {
                                          label: "background",
                                          value: c.background,
                                        },
                                      ]
                                    : undefined,
                                paragraphs: c.description
                                  ? [c.description]
                                  : undefined,
                              })
                            }
                            className="group inline-flex items-center gap-1.5 rounded-[2px] border border-border bg-card px-2 py-1 text-left transition-colors hover:border-primary/40"
                          >
                            <span className="font-mono text-[11.5px] text-foreground">
                              {c.name}
                            </span>
                            {c.traits.length > 0 ? (
                              <span className="hidden text-[10.5px] text-muted-foreground/60 sm:inline">
                                {c.traits.slice(0, 2).join(" · ")}
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <section className="surface-subtle px-4 py-3">
        <div className="flex items-baseline gap-3 pb-1.5">
          <h4 className="font-display text-[14px] italic text-foreground">
            人物关系
          </h4>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-foreground/70">
            {`// counts only · pairing view coming later`}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono text-[12px] tabular-nums">
          {series.map(({ book, data }) => (
            <span key={book.bookId} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-[8px] w-[8px] rounded-full"
                style={{ background: getBookColorHsl(book.index) }}
              />
              <span style={{ color: getBookColorHsl(book.index, 0.95) }}>
                {book.label.replace("BOOK ", "")}
              </span>
              <span className="text-muted-foreground">
                {data.relationships.length} 条
              </span>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
