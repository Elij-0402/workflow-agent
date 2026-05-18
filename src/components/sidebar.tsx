"use client";

import Link from "next/link";

import { AppNav } from "@/components/app-nav";

export function Sidebar() {
  return (
    <aside className="hidden w-[248px] shrink-0 flex-col border-r border-border/70 bg-background/95 md:flex">
      <Link
        href="/dashboard"
        className="flex h-14 items-center gap-3 border-b border-border/60 px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/90 text-[11px] font-semibold text-primary-foreground">
          N
        </div>
        <div className="min-w-0">
          <span className="block text-[13px] font-medium tracking-tight">
            NovelFusion
          </span>
          <span className="block text-[11px] text-muted-foreground">
            创作工作台
          </span>
        </div>
      </Link>

      <div className="px-5 pt-6 pb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
        工作区
      </div>

      <div className="flex-1 px-3">
        <AppNav />
      </div>

      <div className="border-t border-border/60 px-5 py-4">
        <div className="text-[11px] text-muted-foreground/70">
          NovelFusion
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground/50">
          v0.1
        </div>
      </div>
    </aside>
  );
}
