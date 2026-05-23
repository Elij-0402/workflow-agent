"use client";

import Link from "next/link";

import { AppNav } from "@/components/app-nav";

export function Sidebar() {
  return (
    <aside className="hidden w-[248px] shrink-0 flex-col border-r border-border/70 bg-background/92 md:flex">
      <Link
        href="/dashboard"
        className="flex h-16 items-center gap-3 border-b border-border/70 px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="flex size-7 items-center justify-center rounded-[7px] bg-primary/90 text-[11px] font-semibold text-primary-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.18)]">
          N
        </div>
        <div className="min-w-0">
          <span className="block text-[13px] font-medium tracking-tight text-foreground">
            NovelFusion
          </span>
          <span className="block text-[11px] text-muted-foreground">
            创作工作区
          </span>
        </div>
      </Link>

      <div className="flex-1 px-3 py-4">
        <p className="px-3 pb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/68">
          Workspace
        </p>
        <AppNav />
      </div>
    </aside>
  );
}
