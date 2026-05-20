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
    <div className="relative min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-[2px] bg-card px-3 py-2 font-mono text-[12px] uppercase tracking-[0.10em] text-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:outline-none focus:ring-1 focus:ring-primary"
      >
        $ jump to main
      </a>
      <div className="app-shell-grid min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-end border-b border-dashed border-border/70 bg-background px-4 pb-3 md:px-6">
            <div className="flex min-w-0 flex-1 items-end gap-3">
              <MobileNav />
              <div className="min-w-0">
                <div className="truncate font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
                  {"// 多源小说分析与融合创作"}</div>
                <div className="mt-1 truncate font-display italic text-[14px] leading-none text-foreground">
                  signed in as <span className="text-primary">{user.email?.split("@")[0] ?? "anonymous"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                asChild
                variant="terminal"
                size="sm"
                className="hidden sm:inline-flex"
              >
                <Link href="/upload">
                  <Plus aria-hidden="true" />
                  $ new task
                </Link>
              </Button>
              <UserMenu email={user.email ?? "anonymous"} />
            </div>
          </header>
          <main id="main-content" className="relative z-10 min-w-0 flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
