"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpenText, Loader2, LockKeyhole, Mail } from "lucide-react";
import { toast } from "sonner";

import { submitPasswordAuth } from "../actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthMode = "login" | "register";

export function LoginForm({ redirectPath }: { redirectPath: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const copy = useMemo(
    () =>
      mode === "login"
        ? {
            title: "登录",
            description: "使用邮箱和密码进入你的创作空间。",
            submit: "登录",
            alt: "还没有账号？",
            switchLabel: "注册",
          }
        : {
            title: "注册",
            description: "创建一个普通账号，保存你的小说数据和 LLM 配置。",
            submit: "创建账号",
            alt: "已经有账号？",
            switchLabel: "登录",
          },
    [mode]
  );

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("mode", mode);
    formData.set("redirect", redirectPath);

    startTransition(async () => {
      const result = await submitPasswordAuth(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result?.message ?? "操作成功。");
      router.push(result?.redirectTo ?? "/dashboard");
      router.refresh();
    });
  };

  return (
    <Card className="border-border/60 bg-card/60 shadow-2xl backdrop-blur-md">
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
          <BookOpenText className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-2xl">NovelFusion AI</CardTitle>
          <CardDescription>多源小说智能分析与变体生成</CardDescription>
        </div>
        <div className="grid grid-cols-2 rounded-lg bg-muted/60 p-1">
          <ModeButton
            active={mode === "login"}
            disabled={pending}
            onClick={() => setMode("login")}
          >
            登录
          </ModeButton>
          <ModeButton
            active={mode === "register"}
            disabled={pending}
            onClick={() => setMode("register")}
          >
            注册
          </ModeButton>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">{copy.title}</h1>
          <p className="text-sm text-muted-foreground">{copy.description}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="redirect" value={redirectPath} />

          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="pl-9"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={pending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="至少 8 位"
                required
                minLength={8}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="pl-9"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={pending}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                提交中
              </>
            ) : (
              copy.submit
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 text-center text-xs text-muted-foreground">
        <p>
          {copy.alt}
          <button
            type="button"
            className="ml-1 text-primary hover:underline"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            disabled={pending}
          >
            {copy.switchLabel}
          </button>
        </p>
        <p className="text-[11px]">
          你的 API Key 会在服务端加密保存，仅用于调用你自己配置的模型服务。
        </p>
      </CardFooter>
    </Card>
  );
}

function ModeButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={[
        "rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      ].join(" ")}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
