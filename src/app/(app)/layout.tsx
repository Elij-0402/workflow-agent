import { redirect } from "next/navigation";

import { ContextualShellTitle } from "@/components/contextual-shell-title";
import { MobileNav } from "@/components/mobile-nav";
import { Sidebar } from "@/components/sidebar";
import { UserMenu } from "@/components/user-menu";
import { safeGetUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { user } = await safeGetUser(supabase, "app-layout");
  if (!user) redirect("/login");

  return (
    <div className="relative min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-[2px] bg-card px-3 py-2 text-[12px] text-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:outline-none focus:ring-1 focus:ring-primary"
      >
        跳到主内容
      </a>
      <div className="app-shell-grid min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border/70 bg-background/90 px-4 backdrop-blur md:px-6">
            <MobileNav />
            <div className="ml-auto flex items-center gap-3">
              <ContextualShellTitle />
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
