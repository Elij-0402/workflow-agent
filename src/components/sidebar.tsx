"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { AppNav } from "@/components/app-nav";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  return (
    <aside className="hidden w-[248px] shrink-0 flex-col border-r border-border/80 bg-background md:flex">
      <Link
        href="/sessions"
        className="group relative flex h-14 items-center gap-3 border-b border-border/70 px-5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
      >
        <div className="min-w-0">
          <span className="block leading-none">
            <span className="text-[15px] font-semibold text-foreground">
              NovelFusion
            </span>
          </span>
          <span className="mt-1 block text-[11px] text-muted-foreground">
            创作任务空间
          </span>
        </div>
      </Link>

      <div className="px-5 pt-4">
        <Button
          asChild
          className="h-9 w-full justify-center gap-2 font-mono text-[11.5px] uppercase tracking-[0.10em]"
        >
          <Link href="/upload">
            <Plus className="h-4 w-4" aria-hidden />
            新建任务
          </Link>
        </Button>
      </div>

      <div className="flex-1 px-3 py-4">
        <AppNav />
      </div>
    </aside>
  );
}
