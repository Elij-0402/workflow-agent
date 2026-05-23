"use server";

import { redirect } from "next/navigation";
import { ZodError } from "zod";

import {
  mapPasswordAuthErrorMessage,
  parsePasswordAuthFormData,
} from "@/lib/auth/password-auth";
import { getSafeRedirectPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export async function submitPasswordAuth(formData: FormData) {
  const redirectTo = getSafeRedirectPath(formData);

  let parsed;
  try {
    parsed = parsePasswordAuthFormData(formData);
  } catch (error) {
    if (error instanceof ZodError) {
      return { error: error.issues[0]?.message ?? "表单填写不完整。" };
    }
    return { error: "表单填写不完整。" };
  }

  const supabase = await createClient();

  if (parsed.mode === "register") {
    const { data, error } = await supabase.auth.signUp({
      email: parsed.email,
      password: parsed.password,
    });

    if (error) {
      return { error: mapPasswordAuthErrorMessage(error.message) };
    }

    if (!data.session) {
      return {
        error:
          "当前 Supabase 仍启用了邮箱确认。请在 Auth 设置里关闭邮箱确认后再使用密码注册。",
      };
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.email,
      password: parsed.password,
    });

    if (error) {
      return { error: mapPasswordAuthErrorMessage(error.message) };
    }
  }

  return {
    ok: true,
    message:
      parsed.mode === "register" ? "注册成功，已为你登录。" : "登录成功。",
    redirectTo,
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
