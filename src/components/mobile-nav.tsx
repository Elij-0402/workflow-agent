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
        className="w-[304px] border-r border-border bg-background p-0"
      >
        <SheetHeader className="border-b border-dashed border-border/70 px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary/80">
            {"// menu"}</p>
          <SheetTitle>NovelFusion</SheetTitle>
          <SheetDescription>atelier · 创作工作室</SheetDescription>
        </SheetHeader>

        <div className="px-5 py-5">
          <Button
            asChild
            variant="default"
            className="h-10 w-full justify-center font-mono uppercase tracking-[0.10em]"
          >
            <Link href="/upload" onClick={() => setOpen(false)}>
              <Plus aria-hidden="true" />
              $ new task
            </Link>
          </Button>
        </div>

        <div className="border-t border-dashed border-border/70 px-3 py-4">
          <p className="eyebrow-label px-3 pb-3">workspace</p>
          <AppNav onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
