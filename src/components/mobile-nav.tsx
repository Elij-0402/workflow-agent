"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Plus } from "lucide-react";

import { AppNav } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="打开导航菜单"
        >
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[304px] border-r border-border/70 bg-background/96 p-0 shadow-2xl"
      >
        <SheetHeader className="border-b border-border/70 px-5 py-4">
          <SheetTitle className="text-[14px] font-medium">NovelFusion</SheetTitle>
          <SheetDescription className="text-[12px]">创作工作区</SheetDescription>
        </SheetHeader>

        <div className="px-5 py-5">
          <Button asChild className="h-10 w-full justify-center">
            <Link href="/upload" onClick={() => setOpen(false)}>
              <Plus aria-hidden="true" />
              新建任务
            </Link>
          </Button>
        </div>

        <div className="border-t border-border/70 px-3 py-4">
          <p className="px-3 pb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/68">
            Workspace
          </p>
          <AppNav onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
