"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FilePlus2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type SessionOption = {
  id: string;
  name: string;
  mode: string | null;
};

type Props = {
  sessions: SessionOption[];
};

export function BriefCreateSheet({ sessions }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => s.name.toLowerCase().includes(q));
  }, [sessions, query]);

  function pick(id: string) {
    setOpen(false);
    setQuery("");
    router.push(`/studio/new?sessionId=${id}`);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <FilePlus2 className="h-4 w-4" aria-hidden />
          新建简报
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[400px] border-l border-border bg-background p-0"
      >
        <SheetHeader className="border-b border-border/70 px-5 py-4">
          <SheetTitle className="font-display text-[20px] italic">
            选择目标项目
          </SheetTitle>
          <SheetDescription className="text-[12.5px] text-muted-foreground">
            简报会绑定到该项目，并在变体生成时注入。
          </SheetDescription>
        </SheetHeader>

        {sessions.length === 0 ? (
          <div className="p-5">
            <p className="text-[13px] text-muted-foreground">
              还没有可用项目。
            </p>
            <Button asChild className="mt-3 w-full">
              <Link href="/create" onClick={() => setOpen(false)}>
                导入新项目
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
              <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索项目名…"
                className="h-8 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
                autoFocus
              />
            </div>
            <ul className="flex-1 overflow-y-auto py-2">
              {filtered.length === 0 ? (
                <li className="px-5 py-6 text-center text-[13px] text-muted-foreground">
                  没有匹配的项目。
                </li>
              ) : (
                filtered.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => pick(s.id)}
                      className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left text-[13px] transition-colors hover:bg-accent/60"
                    >
                      <span className="truncate text-foreground">{s.name}</span>
                      <span className="mono-label-xs">
                        {s.mode === "dual" ? "dual" : "single"}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
