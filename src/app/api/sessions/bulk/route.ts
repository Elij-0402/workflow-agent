import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  action: z.enum(["archive", "restore", "delete"]),
  ids: z.array(z.string().uuid()).min(1).max(100),
});

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

  if (body.action === "delete") {
    const { error } = await supabase
      .from("sessions")
      .delete()
      .in("id", body.ids)
      .eq("user_id", user.id);
    if (error) {
      return NextResponse.json({ error: "批量删除失败。" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, count: body.ids.length });
  }

  const archived_at = body.action === "archive" ? new Date().toISOString() : null;
  const { error } = await supabase
    .from("sessions")
    .update({ archived_at })
    .in("id", body.ids)
    .eq("user_id", user.id);
  if (error) {
    const msg = body.action === "archive" ? "批量归档失败。" : "批量恢复失败。";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  return NextResponse.json({ ok: true, count: body.ids.length });
}
