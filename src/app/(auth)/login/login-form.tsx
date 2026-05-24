"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole, Mail } from "lucide-react";
import { toast } from "sonner";

import { submitPasswordAuth } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthMode = "login" | "register";

export function LoginForm({ redirectPath }: { redirectPath: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [pending, startTransition] = useTransition();

  const copy =
    mode === "login"
      ? {
          submit: "登录",
          alt: "还没有账号？",
          switchLabel: "注册",
          tagline: "使用邮箱和密码继续当前工作。",
        }
      : {
          submit: "注册账号",
          alt: "已经有账号？",
          switchLabel: "登录",
          tagline: "创建账号后可保存项目、模型配置和生成结果。",
        };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await submitPasswordAuth(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result?.message ?? "操作成功。");
      router.push(result?.redirectTo ?? "/sessions");
    });
  };

  return (
    <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
      <section className="hidden lg:flex lg:flex-col lg:gap-6">
        <div className="max-w-[480px]">
          <p className="text-[15px] font-semibold text-foreground">
            NovelFusion
          </p>
          <h1 className="mt-6 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">
            登录后继续你的创作任务。
          </h1>
          <p className="mt-4 max-w-[440px] text-[14px] leading-6 text-muted-foreground">
            导入文本、查看分析、生成变体都在同一个工作流里完成。
          </p>
        </div>
        <div className="surface-subtle max-w-[480px] p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <InfoItem label="导入" value="小说文本" />
            <InfoItem label="分析" value="结构与角色" />
            <InfoItem label="生成" value="新版本" />
          </div>
        </div>
      </section>

      <div className="surface-panel relative bg-card p-6 sm:p-7">
        <div>
          <p className="eyebrow-label">账号</p>
          <h2 className="mt-2 text-[24px] font-semibold leading-tight text-foreground">
            {mode === "login" ? "登录" : "注册"}
          </h2>
          <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
            {copy.tagline}
          </p>
        </div>

        <div className="mt-5 flex gap-1 border-b border-border/70">
          <button
            type="button"
            data-active={mode === "login"}
            onClick={() => setMode("login")}
            disabled={pending}
            className="terminal-tab"
          >
            登录
          </button>
          <button
            type="button"
            data-active={mode === "register"}
            onClick={() => setMode("register")}
            disabled={pending}
            className="terminal-tab"
          >
            注册
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-5">
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="redirect" value={redirectPath} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">邮箱</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/60" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                required
                autoComplete="email"
                className="pl-9"
                disabled={pending}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">密码</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/60" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="至少 8 位字符"
                required
                minLength={8}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                className="pl-9"
                disabled={pending}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="mt-1 h-10 w-full justify-center"
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                处理中…
              </>
            ) : (
              copy.submit
            )}
          </Button>
        </form>

        <div className="mt-5 flex flex-col gap-3 border-t border-border/70 pt-4 text-left">
          <p className="text-[12.5px] text-muted-foreground">
            {copy.alt}
            <button
              type="button"
              className="ml-2 rounded-[2px] text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              disabled={pending}
            >
              {copy.switchLabel}
            </button>
          </p>
          <p className="text-[12px] text-muted-foreground">
            模型密钥会加密保存在服务端。
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[4px] border border-border/70 bg-background px-3 py-3">
      <p className="mono-label-sm">{label}</p>
      <p className="mt-2 text-[13px] font-medium text-foreground">{value}</p>
    </div>
  );
}
