"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/(auth)/actions";

export function UserMenu({ email }: { email: string }) {
  const [pending, start] = useTransition();
  const initials = email.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-full p-0"
          aria-label="账户菜单"
        >
          <span className="flex size-9 items-center justify-center rounded-full border border-border/80 bg-accent/60 text-[11px] font-medium text-foreground">
            {initials}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 border-border/80 bg-popover/95">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">已登录</span>
            <span className="truncate text-sm">{email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          disabled={pending}
          onClick={() => start(() => signOut())}
        >
          <LogOut aria-hidden="true" />
          {pending ? "登出中…" : "登出"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
