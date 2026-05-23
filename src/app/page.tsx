import { redirect } from "next/navigation";

import { safeGetUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = await createClient();
  const { user, authError } = await safeGetUser(supabase, "root-page", "/");
  if (authError) {
    redirect("/sessions");
  }

  redirect(user ? "/sessions" : "/login");
}
