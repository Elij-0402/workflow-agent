"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { AppNav } from "@/components/app-nav";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  return (
    <aside className="hidden w-[264px] shrink-0 flex-col border-r border-border/80 bg-card/70 backdrop-blur md:flex">
      <Link
        href="/sessions"
        className="group relative flex h-20 items-center gap-3 border-b border-border/70 px-5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
      >
        <div className="min-w-0">
          <span className="block leading-none">
            <span className="text-[16px] font-semibold text-foreground">
              NovelFusion
            </span>
          </span>
          <span className="mt-2 block text-[11px] text-muted-foreground">
            AI 小说创作工作台
          </span>
        </div>
      </Link>

      <div className="px-5 pt-5">
        <Button
          asChild
          className="h-10 w-full justify-center gap-2"
        >
          <Link href="/create">
            <Plus className="h-4 w-4" aria-hidden />
            新建项目
          </Link>
        </Button>
      </div>

      <div className="px-5 pt-5">
        <div className="surface-subtle px-4 py-3">
          <p className="mono-label-sm">当前主线</p>
          <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
            从项目总览进入分析、蓝图、简报与结果，不再把页面当孤立工具用。
          </p>
        </div>
      </div>

      <div className="flex-1 px-3 py-5">
        <AppNav />
      </div>
    </aside>
  );
}
