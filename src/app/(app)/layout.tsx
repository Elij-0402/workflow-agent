import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";

import { MobileNav } from "@/components/mobile-nav";
import { Sidebar } from "@/components/sidebar";
import { UserMenu } from "@/components/user-menu";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-background px-3 py-2 text-sm text-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        跳转到主要内容
      </a>
      <div className="app-shell-grid min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border/70 bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75 md:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <MobileNav />
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium">NovelFusion</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  多源小说分析与融合创作
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
              >
                <Link href="/upload">
                  <Plus aria-hidden="true" />
                  新建任务
                </Link>
              </Button>
              <UserMenu email={user.email ?? "anonymous"} />
            </div>
          </header>
          <main id="main-content" className="min-w-0 flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
