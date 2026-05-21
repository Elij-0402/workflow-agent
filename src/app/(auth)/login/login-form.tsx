"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, LockKeyhole, Mail, Orbit, ScanSearch, Sparkles } from "lucide-react";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const copy = useMemo(
    () =>
      mode === "login"
        ? {
            submit: "进入工作区",
            alt: "还没有账号？",
            switchLabel: "去注册",
            tagline: "使用邮箱和密码进入你的创作空间。",
          }
        : {
            submit: "创建账号",
            alt: "已经有账号？",
            switchLabel: "去登录",
            tagline: "创建一个普通账号，保存你的小说数据和 LLM 配置。",
          },
    [mode],
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
    });
  };

  return (
    <div className="grid w-full gap-12 lg:grid-cols-[minmax(0,1.2fr)_440px] lg:items-center">
      <section className="hidden lg:flex lg:flex-col lg:gap-10">
        <div className="max-w-[560px]">
          <div className="mb-8">
            <div className="leading-none">
              <span className="font-display text-[40px] italic text-foreground">Novel</span>
              <span className="font-mono text-[24px] text-primary">·fusion</span>
            </div>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              创作研究工作室
            </p>
          </div>

          <h1 className="font-display text-[44px] italic leading-[1.06] tracking-[-0.01em] text-foreground sm:text-[52px]">
            为长篇文本建立可复用的
            <br />
            分析与生成工作流。
          </h1>
          <p className="mt-6 max-w-[520px] text-[15px] leading-7 text-muted-foreground">
            导入小说，拆解世界构建、人物关系与叙事结构，再在研究结论之上生成新的原创变体文本。
          </p>
        </div>

        <div className="grid max-w-[640px] gap-3 md:grid-cols-3">
          <FeaturePill
            no="01"
            icon={ScanSearch}
            title="结构化分析"
            description="把长文本整理成可比较的研究结果。"
          />
          <FeaturePill
            no="02"
            icon={Orbit}
            title="多源融合"
            description="为双视角与多作品框架预留空间。"
          />
          <FeaturePill
            no="03"
            icon={Sparkles}
            title="原创变体"
            description="在约束内生成新的章节方向。"
          />
        </div>

      </section>

      <div className="surface-panel relative bg-card p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow-label">access</p>
            <h2 className="mt-2 font-display text-[28px] italic leading-[1.05] text-foreground">
              进入工作区
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{copy.tagline}</p>
          </div>
          <KeyRound aria-hidden className="h-5 w-5 text-primary/70" />
        </div>

        <div className="mt-5 flex gap-1 border-b border-dashed border-border/70">
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
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="h-10 pl-9"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
                placeholder="min 8 chars"
                required
                minLength={8}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="h-10 pl-9"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={pending}
              />
            </div>
          </div>

          <Button type="submit" className="mt-2 h-11 w-full justify-center" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                认证中…
              </>
            ) : (
              copy.submit
            )}
          </Button>
        </form>

        <div className="mt-6 flex flex-col gap-3 border-t border-dashed border-border/70 pt-5 text-left">
          <p className="text-[12.5px] text-muted-foreground">
            {copy.alt}
            <button
              type="button"
              className="ml-2 text-primary hover:underline"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              disabled={pending}
            >
              {copy.switchLabel}
            </button>
          </p>
          <p className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-foreground/80">
            <KeyRound className="h-3 w-3 text-primary/60" />
            api key 加密保存在服务端
          </p>
        </div>
      </div>
    </div>
  );
}

function FeaturePill({
  no,
  icon: Icon,
  title,
  description,
}: {
  no: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="surface-subtle relative flex min-h-[140px] flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-primary/80">
          {no} ─
        </span>
        <Icon className="h-4 w-4 text-primary/70" />
      </div>
      <div>
        <p className="font-display text-[16px] italic text-foreground">{title}</p>
        <p className="mt-2 text-[12.5px] leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
