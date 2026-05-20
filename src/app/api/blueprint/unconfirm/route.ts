import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({ sessionId: z.string().uuid() });

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "请求参数不正确。" }, { status: 400 });
  }

  const { error } = await supabase
    .from("blueprints")
    .update({ status: "draft", confirmed_at: null })
    .eq("session_id", body.sessionId)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "解锁失败。" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
