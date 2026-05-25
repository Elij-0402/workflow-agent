import test from "node:test";
import assert from "node:assert/strict";

import {
  PasswordAuthFormSchema,
  mapPasswordAuthErrorMessage,
} from "./password-auth.ts";

test("accepts login credentials with mode, email, and password", () => {
  const result = PasswordAuthFormSchema.parse({
    mode: "login",
    email: "reader@example.com",
    password: "password123",
  });

  assert.equal(result.mode, "login");
  assert.equal(result.email, "reader@example.com");
});

test("rejects passwords shorter than 8 characters", () => {
  const result = PasswordAuthFormSchema.safeParse({
    mode: "register",
    email: "reader@example.com",
    password: "short",
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.issues[0]?.message, "密码至少需要 8 位");
  }
});

test("maps common Supabase password auth errors to clear Chinese messages", () => {
  assert.equal(
    mapPasswordAuthErrorMessage("Invalid login credentials"),
    "邮箱或密码错误。",
  );
  assert.equal(
    mapPasswordAuthErrorMessage("User already registered"),
    "该邮箱已注册，请直接登录。",
  );
});
