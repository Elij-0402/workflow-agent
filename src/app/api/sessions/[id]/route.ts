import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import {
  collectSessionStoragePaths,
  removeStorageObjects,
} from "@/lib/sessions/storage-cleanup";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function DELETE(
  req: Request,
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

  const url = new URL(req.url);
  const hard = url.searchParams.get("hard") === "true";

  if (hard) {
    const paths = await collectSessionStoragePaths(
      supabase,
      [parsed.data.id],
      user.id,
    );
    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("id", parsed.data.id)
      .eq("user_id", user.id);
    if (error) {
      return NextResponse.json({ error: "永久删除失败。" }, { status: 500 });
    }
    await removeStorageObjects(supabase, paths);
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from("sessions")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: "归档失败。" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(
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

  const { error } = await supabase
    .from("sessions")
    .update({ archived_at: null })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: "恢复失败。" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
