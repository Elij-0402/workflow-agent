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
        <SheetHeader className="border-b border-border/70 px-5 py-4">
          <SheetTitle>NovelFusion</SheetTitle>
          <SheetDescription className="sr-only">产品主导航</SheetDescription>
        </SheetHeader>

        <div className="px-5 py-5">
          <Button
            asChild
            variant="default"
            className="h-10 w-full justify-center"
          >
            <Link href="/create" onClick={() => setOpen(false)}>
              <Plus aria-hidden="true" />
              新建项目
            </Link>
          </Button>
        </div>

        <div className="px-3 py-2">
          <AppNav onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
