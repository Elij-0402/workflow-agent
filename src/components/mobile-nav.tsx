"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Plus } from "lucide-react";

import { AppNav } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="打开导航菜单"
        >
          <Menu aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="left-0 top-0 h-dvh max-w-[320px] translate-x-0 translate-y-0 gap-0 rounded-none border-r border-border/70 p-0 shadow-2xl data-[state=closed]:slide-out-to-left-full data-[state=open]:slide-in-from-left-full">
        <div className="border-b border-border/60 px-5 py-4">
          <DialogTitle className="text-[14px] font-medium">NovelFusion</DialogTitle>
          <DialogDescription className="mt-1 text-[12px]">
            创作工作台
          </DialogDescription>
        </div>

        <div className="px-5 py-5">
          <Button asChild className="h-10 w-full justify-center">
            <Link href="/upload" onClick={() => setOpen(false)}>
              <Plus aria-hidden="true" />
              上传小说
            </Link>
          </Button>
        </div>

        <div className="border-t border-border/60 px-3 py-4">
          <AppNav onNavigate={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
