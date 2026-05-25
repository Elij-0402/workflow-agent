import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { loadActiveSession } from "@/lib/sessions/guard";
import { CreativeBriefSchema } from "@/lib/types/creative-brief";

export const runtime = "nodejs";

const listQuerySchema = z.object({
  sessionId: z.string().uuid().optional(),
});

const createBodySchema = z.object({
  sessionId: z.string().uuid(),
  brief: CreativeBriefSchema,
});

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const url = new URL(req.url);
  const parsed = listQuerySchema.safeParse({
    sessionId: url.searchParams.get("sessionId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "请求参数不正确。" }, { status: 400 });
  }

  let query = supabase
    .from("creative_briefs")
    .select(
      "id, session_id, title, persona_directives, plot_directives, style_directives, retention_rules, status, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (parsed.data.sessionId) {
    query = query.eq("session_id", parsed.data.sessionId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "读取简报失败。" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, briefs: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  let body: z.infer<typeof createBodySchema>;
  try {
    body = createBodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "请求参数不正确。" }, { status: 400 });
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", body.sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session) {
    return NextResponse.json({ error: "未找到对应项目。" }, { status: 404 });
  }

  const { guard } = await loadActiveSession(supabase, body.sessionId, user.id);
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.message },
      { status: guard.status },
    );
  }

  const { data, error } = await supabase
    .from("creative_briefs")
    .insert({
      user_id: user.id,
      session_id: body.sessionId,
      title: body.brief.title,
      persona_directives: body.brief.persona_directives,
      plot_directives: body.brief.plot_directives,
      style_directives: body.brief.style_directives,
      retention_rules: body.brief.retention_rules,
    })
    .select("id")
    .single();
  if (error || !data) {
    return NextResponse.json({ error: "创建简报失败。" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}
