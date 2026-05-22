"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getBookColorHsl } from "@/lib/compare/book-color";
import { useDrawer } from "@/lib/compare/drawer-context";

export function DetailDrawer() {
  const { payload, close } = useDrawer();
  const open = payload !== null;

  return (
    <Sheet open={open} onOpenChange={(v) => (!v ? close() : null)}>
      <SheetContent
        side="right"
        className="flex w-full max-w-[480px] flex-col gap-0 p-0 sm:max-w-[480px]"
      >
        {payload ? (
          <>
            <div
              className="h-[3px] w-full"
              style={{ background: getBookColorHsl(payload.bookIndex) }}
            />
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <SheetHeader className="pb-4">
                <p
                  className="font-mono text-[10.5px] uppercase tracking-[0.14em]"
                  style={{ color: getBookColorHsl(payload.bookIndex, 0.9) }}
                >
                  {payload.bookLabel}
                  {payload.eyebrow ? (
                    <span className="ml-2 text-muted-foreground/70">
                      · {payload.eyebrow}
                    </span>
                  ) : null}
                </p>
                <SheetTitle>{payload.title}</SheetTitle>
              </SheetHeader>

              {payload.badges && payload.badges.length > 0 ? (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {payload.badges.map((b) => (
                    <span
                      key={b}
                      className="rounded-[2px] border border-border bg-background/40 px-2 py-[2px] font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              ) : null}

              {payload.meta && payload.meta.length > 0 ? (
                <div className="mb-5 flex flex-col gap-3">
                  {payload.meta.map((m) => (
                    <div key={m.label}>
                      <p className="data-label">{`// ${m.label}`}</p>
                      <p className="mt-1.5 rounded-[3px] border border-border bg-background/40 px-3 py-2 text-[13.5px] text-foreground">
                        {m.value}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              {payload.paragraphs && payload.paragraphs.length > 0 ? (
                <div
                  className="space-y-3 text-[14px] leading-7 text-foreground"
                  style={{ fontFamily: "var(--font-zh-serif), serif" }}
                >
                  {payload.paragraphs
                    .filter((p) => p.trim().length > 0)
                    .map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
