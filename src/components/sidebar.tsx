"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { AppNav } from "@/components/app-nav";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  return (
    <aside className="hidden w-[260px] shrink-0 flex-col border-r border-border bg-background/95 md:flex">
      <Link
        href="/dashboard"
        className="group relative flex h-16 items-end gap-3 border-b border-border/70 px-5 pb-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
      >
        <div className="min-w-0">
          <span className="block leading-none">
            <span className="font-display text-[22px] italic text-foreground">
              Novel
            </span>
            <span className="font-mono text-[15px] text-primary">·fusion</span>
          </span>
          <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            atelier · 创作工作室
          </span>
        </div>
      </Link>

      <div className="px-5 pt-5">
        <Button
          asChild
          className="h-9 w-full justify-center gap-2 font-mono text-[11.5px] uppercase tracking-[0.10em]"
        >
          <Link href="/upload">
            <Plus className="h-4 w-4" aria-hidden />
            新建项目
          </Link>
        </Button>
      </div>

      <div className="flex-1 px-3 py-5">
        <AppNav />
      </div>
    </aside>
  );
}
