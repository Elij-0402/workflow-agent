"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
          <span className="flex size-9 items-center justify-center rounded-full border border-primary/50 bg-card font-mono text-[11px] uppercase text-primary">
            {initials}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem
          disabled
          className="cursor-default opacity-100 focus:bg-transparent focus:text-foreground"
        >
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-foreground">
              signed in as
            </span>
            <span className="truncate text-[13px] text-foreground">{email}</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-[12px] text-destructive focus:text-destructive"
          disabled={pending}
          onClick={() => start(() => signOut())}
        >
          <LogOut aria-hidden="true" className="text-destructive" />
          {pending ? "退出中…" : "退出账号"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
