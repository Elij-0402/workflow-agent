import { NextResponse } from "next/server";
import { z } from "zod";

import {
  BlueprintSchema,
  blueprintReadyToConfirm,
} from "@/lib/blueprint/schema";
import { createClient } from "@/lib/supabase/server";
import { loadActiveSession } from "@/lib/sessions/guard";

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

  const { guard } = await loadActiveSession(supabase, body.sessionId, user.id);
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.message },
      { status: guard.status },
    );
  }

  const { data: bp } = await supabase
    .from("blueprints")
    .select("id, sections")
    .eq("session_id", body.sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!bp) return NextResponse.json({ error: "未找到蓝图。" }, { status: 404 });

  const parsed = BlueprintSchema.parse(bp.sections ?? {});
  const ready = blueprintReadyToConfirm(parsed);
  if (!ready.ok) {
    return NextResponse.json(
      { error: `蓝图缺少：${ready.missing.join(", ")}` },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("blueprints")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", bp.id)
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: "锁定蓝图失败。" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
