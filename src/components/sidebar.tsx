"use client";

import Link from "next/link";

import { AppNav } from "@/components/app-nav";

export function Sidebar() {
  return (
    <aside className="hidden w-[236px] shrink-0 flex-col border-r border-border/70 bg-background/95 md:flex">
      <Link
        href="/dashboard"
        className="flex h-14 items-center gap-3 px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/90 text-[11px] font-semibold text-primary-foreground">
          N
        </div>
        <div className="min-w-0">
          <span className="block text-[13px] font-medium tracking-tight">
            NovelFusion
          </span>
        </div>
      </Link>

      <div className="flex-1 px-3 py-4">
        <AppNav />
      </div>
    </aside>
  );
}
