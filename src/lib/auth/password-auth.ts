import { z } from "zod";

export const PasswordAuthModeSchema = z.enum(["login", "register"]);
export type PasswordAuthMode = z.infer<typeof PasswordAuthModeSchema>;

export const PasswordAuthFormSchema = z.object({
  mode: PasswordAuthModeSchema,
  email: z.string().trim().email("请输入有效邮箱"),
  password: z.string().min(8, "密码至少需要 8 位"),
});

export type PasswordAuthForm = z.infer<typeof PasswordAuthFormSchema>;

export function parsePasswordAuthFormData(formData: FormData): PasswordAuthForm {
  return PasswordAuthFormSchema.parse({
    mode: String(formData.get("mode") ?? "login"),
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
}

export function mapPasswordAuthErrorMessage(message: string) {
  switch (message.toLowerCase()) {
    case "invalid login credentials":
      return "邮箱或密码错误。";
    case "user already registered":
      return "该邮箱已注册，请直接登录。";
    case "password should be at least 6 characters":
      return "密码至少需要 8 位。";
    default:
      return message;
  }
}
