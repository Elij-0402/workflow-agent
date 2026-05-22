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
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session) notFound();
  redirect(`/sessions/${session.id}?step=generate`);
}
