import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{ sessionId?: string }>;
};

export default async function NewBriefPage({ searchParams }: Props) {
  const { sessionId } = await searchParams;
  if (!sessionId) redirect("/sessions");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, mode")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session) notFound();
  redirect(
    session.mode === "dual"
      ? `/sessions/${session.id}/workbench?step=compare`
      : `/sessions/${session.id}`,
  );
}
