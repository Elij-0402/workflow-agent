import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { loadActiveSession } from "@/lib/sessions/guard";
import type { Database } from "@/lib/types";
import {
  CreativeBriefSchema,
  CreativeBriefStatusSchema,
} from "@/lib/types/creative-brief";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string().uuid() });

const patchBodySchema = z.object({
  brief: CreativeBriefSchema.partial().optional(),
  status: CreativeBriefStatusSchema.optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) {
    return NextResponse.json({ error: "请求参数不正确。" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("creative_briefs")
    .select("*")
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: "读取简报失败。" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "未找到简报。" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, brief: data });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "请求参数不正确。" }, { status: 400 });
  }

  let body: z.infer<typeof patchBodySchema>;
  try {
    body = patchBodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "请求参数不正确。" }, { status: 400 });
  }

  if (!body.brief && !body.status) {
    return NextResponse.json({ error: "无变更内容。" }, { status: 400 });
  }

  const { data: briefRow } = await supabase
    .from("creative_briefs")
    .select("session_id")
    .eq("id", parsedParams.data.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!briefRow) {
    return NextResponse.json({ error: "未找到简报。" }, { status: 404 });
  }
  const { guard } = await loadActiveSession(
    supabase,
    briefRow.session_id,
    user.id,
  );
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.message },
      { status: guard.status },
    );
  }

  const update: Database["public"]["Tables"]["creative_briefs"]["Update"] = {};
  if (body.brief?.title !== undefined) update.title = body.brief.title;
  if (body.brief?.persona_directives !== undefined) {
    update.persona_directives = body.brief.persona_directives;
  }
  if (body.brief?.plot_directives !== undefined) {
    update.plot_directives = body.brief.plot_directives;
  }
  if (body.brief?.style_directives !== undefined) {
    update.style_directives = body.brief.style_directives;
  }
  if (body.brief?.retention_rules !== undefined) {
    update.retention_rules = body.brief.retention_rules;
  }
  if (body.status !== undefined) update.status = body.status;

  const { error } = await supabase
    .from("creative_briefs")
    .update(update)
    .eq("id", parsedParams.data.id)
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: "更新简报失败。" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) {
    return NextResponse.json({ error: "请求参数不正确。" }, { status: 400 });
  }

  const { data: briefRow } = await supabase
    .from("creative_briefs")
    .select("session_id")
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!briefRow) {
    return NextResponse.json({ error: "未找到简报。" }, { status: 404 });
  }
  const { guard } = await loadActiveSession(
    supabase,
    briefRow.session_id,
    user.id,
  );
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.message },
      { status: guard.status },
    );
  }

  const { error } = await supabase
    .from("creative_briefs")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: "删除简报失败。" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
