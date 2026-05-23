"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpenText,
  Loader2,
  LockKeyhole,
  Mail,
  Orbit,
  ScanSearch,
  Sparkles,
} from "lucide-react";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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
    });
  };

  return (
    <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1.15fr)_420px] lg:items-center">
      <section className="hidden lg:flex lg:flex-col lg:gap-8">
        <div className="max-w-[560px]">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-[8px] bg-primary/90 text-primary-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.18)]">
              <BookOpenText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-foreground">NovelFusion</p>
              <p className="text-[12px] text-muted-foreground">创作研究工作区</p>
            </div>
          </div>

          <h1 className="text-[38px] font-medium leading-[1.08] tracking-tight text-foreground">
            为长篇文本建立可复用的分析与生成工作流。
          </h1>
          <p className="mt-5 max-w-[520px] text-[15px] leading-7 text-muted-foreground">
            导入小说，拆解世界构建、人物关系与叙事结构，再在研究结论之上生成新的原创变体文本。
          </p>
        </div>

        <div className="grid max-w-[640px] gap-3 md:grid-cols-3">
          <FeaturePill
            icon={ScanSearch}
            title="结构化分析"
            description="把长文本整理成可比较的研究结果。"
          />
          <FeaturePill
            icon={Orbit}
            title="多源融合"
            description="为后续双视角与多作品框架预留空间。"
          />
          <FeaturePill
            icon={Sparkles}
            title="原创变体"
            description="在约束内生成新的文本方向与章节结果。"
          />
        </div>
      </section>

      <Card className="border-border/80 bg-card/80 shadow-[0_20px_60px_hsl(0_0%_0%/0.22)]">
        <CardHeader className="gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow-label">Access</p>
              <CardTitle className="mt-2 text-[22px]">进入工作区</CardTitle>
              <CardDescription className="mt-2">
                {copy.description}
              </CardDescription>
            </div>
            <div className="flex size-10 items-center justify-center rounded-[8px] border border-border/80 bg-accent/50 text-primary">
              <BookOpenText className="h-4 w-4" />
            </div>
          </div>

          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(value) => {
              if (value === "login" || value === "register") {
                setMode(value);
              }
            }}
            variant="outline"
            className="grid w-full grid-cols-2 gap-2"
          >
            <ToggleGroupItem value="login" disabled={pending} className="w-full">
              登录
            </ToggleGroupItem>
            <ToggleGroupItem value="register" disabled={pending} className="w-full">
              注册
            </ToggleGroupItem>
          </ToggleGroup>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <input type="hidden" name="mode" value={mode} />
            <input type="hidden" name="redirect" value={redirectPath} />

            <div className="flex flex-col gap-2">
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
                  className="h-10 border-border/80 bg-background/60 pl-9"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={pending}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
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
                  className="h-10 border-border/80 bg-background/60 pl-9"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={pending}
                />
              </div>
            </div>

            <Button type="submit" className="mt-2 w-full" disabled={pending}>
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
        <CardFooter className="flex flex-col items-start gap-3 border-t border-border/70 pt-5 text-left text-xs text-muted-foreground">
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
          <p className="text-[11px] leading-5">
            你的 API Key 会在服务端加密保存，仅用于调用你自己配置的模型服务。
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

function FeaturePill({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="surface-subtle flex min-h-[132px] flex-col gap-4 p-4">
      <div className="flex size-8 items-center justify-center rounded-[7px] border border-border/80 bg-background/70 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[13px] font-medium text-foreground">{title}</p>
        <p className="mt-2 text-[12px] leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
