import { NextResponse } from "next/server";
import { z } from "zod";

import { mergeSections } from "@/lib/blueprint/merge";
import { toBlueprintSaveResult } from "@/lib/blueprint/save-result";
import { BlueprintSchema, emptyBlueprint } from "@/lib/blueprint/schema";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  patch: z.record(z.unknown()),
  expectedUpdatedAt: z.string().nullable(),
});

export async function PATCH(req: Request) {
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

  const { data: existing } = await supabase
    .from("blueprints")
    .select("id, status, sections, updated_at")
    .eq("session_id", body.sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing && body.expectedUpdatedAt && existing.updated_at !== body.expectedUpdatedAt) {
    return NextResponse.json(
      { error: "蓝图已在其他窗口被更新，请刷新后再编辑。" },
      { status: 409 },
    );
  }
  if (existing?.status === "confirmed") {
    return NextResponse.json({ error: "蓝图已锁定，请先解锁。" }, { status: 409 });
  }

  const current = existing ? BlueprintSchema.parse(existing.sections ?? {}) : emptyBlueprint();
  let next;
  try {
    next = mergeSections(current, body.patch as never);
  } catch {
    return NextResponse.json({ error: "蓝图字段不合法。" }, { status: 400 });
  }

  const payload = {
    session_id: body.sessionId,
    user_id: user.id,
    status: "draft" as const,
    sections: next,
  };
  const upserted = await supabase
    .from("blueprints")
    .upsert(payload, { onConflict: "session_id" })
    .select("id, updated_at")
    .single();

  if (upserted.error) {
    return NextResponse.json({ error: "保存蓝图失败。" }, { status: 500 });
  }
  return NextResponse.json(toBlueprintSaveResult(upserted.data));
}
