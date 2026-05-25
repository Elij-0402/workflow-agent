"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Inbox,
  Loader2,
  Lock,
  Search,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { COLOR_TOKENS } from "@/lib/theme-tokens";

const SECTIONS = [
  { id: "principles", label: "原则" },
  { id: "color", label: "颜色" },
  { id: "type", label: "字体" },
  { id: "spacing", label: "间距" },
  { id: "surface", label: "层级" },
  { id: "button", label: "按钮" },
  { id: "form", label: "表单" },
  { id: "card", label: "卡片" },
  { id: "badge", label: "徽章" },
  { id: "tabs", label: "标签页" },
  { id: "toast", label: "Toast" },
  { id: "overlay", label: "弹层" },
  { id: "loading", label: "加载" },
  { id: "empty", label: "空状态" },
  { id: "keyboard", label: "键盘" },
  { id: "copy", label: "文案" },
] as const;

export function DesignSystemClient() {
  const [active, setActive] = useState<string>("principles");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    for (const { id } of SECTIONS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid gap-12 lg:grid-cols-[200px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <div className="sticky top-20 flex flex-col gap-0.5">
          <p className="eyebrow-label mb-3">contents</p>
          {SECTIONS.map((s, idx) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              data-active={active === s.id}
              className="group flex items-center gap-3 rounded-[2px] px-2 py-1.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground data-[active=true]:text-foreground"
            >
              <span className="font-mono text-[10px] text-muted-foreground/50 group-data-[active=true]:text-primary">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <span>{s.label}</span>
            </a>
          ))}
        </div>
      </aside>

      <main className="flex min-w-0 flex-col gap-16">
        <PrinciplesSection />
        <ColorSection />
        <TypeSection />
        <SpacingSection />
        <SurfaceSection />
        <ButtonSection />
        <FormSection />
        <CardSection />
        <BadgeSection />
        <TabsSection />
        <ToastSection />
        <OverlaySection />
        <LoadingSection />
        <EmptySection />
        <KeyboardSection />
        <CopySection />
        <footer className="border-t border-border pt-8 text-center">
          <p className="type-caption">
            实现标准页，非用户功能；生产路由 guard 属 Phase 3（D-24）。
          </p>
        </footer>
      </main>
    </div>
  );
}

function SectionHeader({
  id,
  num,
  title,
  hint,
}: {
  id: string;
  num: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[11px] text-muted-foreground/60">
          {num}
        </span>
        <h2 className="text-[18px] font-medium text-foreground">{title}</h2>
      </div>
      {hint ? (
        <p className="hidden text-[12px] text-muted-foreground sm:block">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 flex flex-col gap-5">
      {children}
    </section>
  );
}

const PRINCIPLES = [
  {
    n: "01",
    t: "极度克制",
    d: "每个像素服务信息层级或状态。不为氛围装饰。",
  },
  {
    n: "02",
    t: "大留白",
    d: "页面级纵向节奏 ≥40px；区块用留白分隔，少叠 panel。",
  },
  {
    n: "03",
    t: "一屏一焦点",
    d: "每视口最多 1 个主 CTA（primary Button）。",
  },
  {
    n: "04",
    t: "键盘是一等公民",
    d: "高频操作必须有快捷键并在 UI 中显式标注。",
  },
  { n: "05", t: "反馈在 200ms 内开始", d: "禁止按钮按下后无任何变化等数秒。" },
  {
    n: "06",
    t: "文案是 UI 的一部分",
    d: "陈述事实而非命令，给出可行动建议，不超过 60 字。",
  },
  {
    n: "07",
    t: "拒绝小聪明装饰",
    d: "shimmer、blink、ASCII 边框等创意装饰一律不用。",
  },
];

function PrinciplesSection() {
  return (
    <Section id="principles">
      <SectionHeader
        id="principles"
        num="01"
        title="核心设计原则"
        hint="冲突时按 简洁 > 一致 > 美观 > 表达 排序"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {PRINCIPLES.map((p) => (
          <div key={p.n} className="surface-panel p-4">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[11px] text-primary">{p.n}</span>
              <h3 className="text-[14px] font-medium text-foreground">{p.t}</h3>
            </div>
            <p className="mt-2 pl-7 text-[12.5px] leading-6 text-muted-foreground">
              {p.d}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function ColorSection() {
  return (
    <Section id="color">
      <SectionHeader
        id="color"
        num="02"
        title="颜色 token"
        hint="一屏内主色实色填充元素 ≤ 1"
      />
      <div className="mb-4 flex h-3 overflow-hidden rounded-[var(--radius-md)] border border-border">
        <div
          className="flex-[85] bg-background"
          title="背景+正文 ≥85%"
        />
        <div className="flex-[10] bg-muted" title="结构 ≤10%" />
        <div
          className="flex-[5] bg-primary"
          title="primary CTA ≤5%"
        />
      </div>
      <p className="type-caption mb-4">60 / 30 / 10 视觉权重示意</p>
      <div className="surface-panel divide-y divide-border">
        {COLOR_TOKENS.map((c) => (
          <div key={c.name} className="flex items-center gap-4 px-4 py-3">
            <div
              className="size-10 shrink-0 rounded-[3px] border border-border"
              style={{ backgroundColor: `hsl(${c.value})` }}
            />
            <div className="grid flex-1 grid-cols-3 items-baseline gap-4">
              <div className="font-mono text-[12px] text-foreground">
                --{c.name}
              </div>
              <div className="font-mono text-[11px] text-muted-foreground">
                {c.value}
              </div>
              <div className="text-[12.5px] text-muted-foreground">
                {c.role}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function TypeSection() {
  return (
    <Section id="type">
      <SectionHeader
        id="type"
        num="03"
        title="字体系统"
        hint="display 仅 h1·情感页 / mono 仅数据·键盘"
      />
      <div className="surface-panel divide-y divide-border">
        <TypeRow utility="type-display" label="display · 页面主标题">
          <span className="type-display">导入你的小说</span>
        </TypeRow>
        <TypeRow utility="type-title" label="title · 区块标题">
          <span className="type-title">最近变体</span>
        </TypeRow>
        <TypeRow utility="type-body" label="body · 正文">
          <span className="type-body">
            导入小说，拆解世界、人物与叙事，再生成新的原创变体文本。
          </span>
        </TypeRow>
        <TypeRow utility="type-caption" label="caption · 辅助">
          <span className="type-caption">已生成 · 12 字</span>
        </TypeRow>
        <TypeRow utility="type-mono-label" label="mono-label · 眉标">
          <span className="type-mono-label">17,432 tokens · 2026-05-22</span>
        </TypeRow>
      </div>
    </Section>
  );
}

function TypeRow({
  utility,
  label,
  children,
}: {
  utility: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[160px_minmax(0,1fr)] items-baseline gap-6 px-4 py-4">
      <p className="type-mono-label text-muted-foreground/60">{label}</p>
      <div>{children}</div>
    </div>
  );
}

const SPACING = [
  { token: "--space-1", px: "8px", tw: "gap-2" },
  { token: "--space-2", px: "16px", tw: "gap-4" },
  { token: "--space-3", px: "24px", tw: "gap-6 / space-y-6" },
  { token: "--space-4", px: "32px", tw: "gap-8" },
  { token: "--space-5", px: "40px", tw: "gap-10 / .app-page" },
  { token: "--space-6", px: "48px", tw: "gap-12 / space-y-10" },
];

function SpacingSection() {
  return (
    <Section id="spacing">
      <SectionHeader
        id="spacing"
        num="04"
        title="间距尺度"
        hint="8px 基准栅格 · 与 02-UI-SPEC 一致"
      />
      <div className="surface-panel divide-y divide-border">
        {SPACING.map((s) => {
          const px = parseInt(s.px);
          return (
            <div
              key={s.token}
              className="grid grid-cols-[120px_56px_100px_minmax(0,1fr)] items-center gap-4 px-4 py-3"
            >
              <span className="font-mono text-[12px] text-foreground">
                {s.token}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {s.px}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground/80">
                {s.tw}
              </span>
              <div
                className="h-3 bg-primary/60"
                style={{ width: `${px}px` }}
              />
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function SurfaceSection() {
  return (
    <Section id="surface">
      <SectionHeader
        id="surface"
        num="05"
        title="Surface 三层级"
        hint="同屏 1 主 panel + 最多 1 subtle · 圆角 5px"
      />
      <div className="rounded-[var(--radius-md)] border border-border/40 bg-background p-6">
        <p className="eyebrow-label mb-3">background</p>
        <div className="surface-panel p-5">
          <p className="eyebrow-label mb-3">surface-panel · 一级容器</p>
          <div className="surface-subtle p-4">
            <p className="eyebrow-label mb-2">surface-subtle · 二级辅助</p>
            <p className="type-caption">
              禁止第三层 panel；圆角 var(--radius-md) = 5px。
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

function ButtonSection() {
  const [loading, setLoading] = useState(false);
  return (
    <Section id="button">
      <SectionHeader
        id="button"
        num="06"
        title="按钮 variant"
        hint="一屏主色填充按钮 ≤ 1 个"
      />
      <div className="surface-panel divide-y divide-border">
        <ButtonRow label="default · 主操作">
          <Button>提交</Button>
          <Button size="sm">小</Button>
          <Button size="lg">大</Button>
          <Button disabled>禁用</Button>
        </ButtonRow>
        <ButtonRow label="outline · 次要">
          <Button variant="outline">保存</Button>
          <Button variant="outline" size="sm">
            取消
          </Button>
          <Button variant="outline" disabled>
            禁用
          </Button>
        </ButtonRow>
        <ButtonRow label="ghost · 辅助">
          <Button variant="ghost">
            <ChevronRight />
            返回
          </Button>
          <Button variant="ghost" size="sm">
            关闭
          </Button>
          <Button variant="ghost" size="icon" aria-label="设置">
            <Settings />
          </Button>
        </ButtonRow>
        <ButtonRow label="destructive · 不可逆">
          <Button variant="destructive">
            <Trash2 />
            删除变体
          </Button>
        </ButtonRow>
        <ButtonRow label="loading 状态">
          <Button
            disabled={loading}
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 1500);
            }}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                生成中
              </>
            ) : (
              "生成变体"
            )}
          </Button>
        </ButtonRow>
      </div>
    </Section>
  );
}

function ButtonRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center gap-4 px-4 py-4">
      <p className="text-[12px] text-muted-foreground">{label}</p>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function FormSection() {
  return (
    <Section id="form">
      <SectionHeader id="form" num="07" title="表单元素" />
      <div className="surface-panel max-w-xl space-y-5 p-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="ds-name">项目名称</Label>
          <Input id="ds-name" placeholder="给变体起个名字" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ds-desc">附加要求</Label>
          <Textarea
            id="ds-desc"
            placeholder="例如：让主角性格更内敛"
            rows={3}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ds-model">模型</Label>
          <Select>
            <SelectTrigger id="ds-model">
              <SelectValue placeholder="选择模型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt">gpt-4o</SelectItem>
              <SelectItem value="ds">deepseek-chat</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ds-err">温度</Label>
          <Input id="ds-err" defaultValue="2.5" aria-invalid />
          <p className="text-[12px] text-destructive">需介于 0 到 2 之间</p>
        </div>
      </div>
    </Section>
  );
}

function CardSection() {
  return (
    <Section id="card">
      <SectionHeader id="card" num="08" title="卡片" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="surface-panel flex flex-col gap-3 p-5">
          <p className="eyebrow-label">project</p>
          <h3 className="text-[16px] font-medium text-foreground">
            三体 · 重写实验
          </h3>
          <p className="text-[13px] leading-6 text-muted-foreground">
            基于原作世界观重新书写第一章，保留核心冲突。
          </p>
          <Separator />
          <div className="flex items-center justify-between text-[12px] text-muted-foreground">
            <span>3 个变体</span>
            <span className="font-mono">2026-05-22</span>
          </div>
        </div>
        <div className="surface-panel flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <p className="eyebrow-label">stats · 30d</p>
            <Badge>active</Badge>
          </div>
          <p className="font-mono text-[28px] font-medium text-foreground">
            17,432
          </p>
          <p className="text-[12px] text-muted-foreground">
            tokens 消耗 · 较上月 -8%
          </p>
        </div>
      </div>
    </Section>
  );
}

function BadgeSection() {
  return (
    <Section id="badge">
      <SectionHeader
        id="badge"
        num="09"
        title="徽章"
        hint="状态标记，避免装饰用途"
      />
      <div className="surface-panel flex flex-wrap gap-2 p-5">
        <Badge>default</Badge>
        <Badge variant="secondary">secondary</Badge>
        <Badge variant="outline">outline</Badge>
        <Badge variant="destructive">destructive</Badge>
      </div>
    </Section>
  );
}

function TabsSection() {
  return (
    <Section id="tabs">
      <SectionHeader id="tabs" num="10" title="标签页" />
      <Tabs defaultValue="chapters" className="surface-panel p-5">
        <TabsList>
          <TabsTrigger value="chapters">章节</TabsTrigger>
          <TabsTrigger value="blueprint">蓝图</TabsTrigger>
          <TabsTrigger value="variants">变体</TabsTrigger>
        </TabsList>
        <TabsContent
          value="chapters"
          className="pt-4 text-[13px] text-muted-foreground"
        >
          章节列表视图
        </TabsContent>
        <TabsContent
          value="blueprint"
          className="pt-4 text-[13px] text-muted-foreground"
        >
          蓝图编辑视图
        </TabsContent>
        <TabsContent
          value="variants"
          className="pt-4 text-[13px] text-muted-foreground"
        >
          变体对比视图
        </TabsContent>
      </Tabs>
    </Section>
  );
}

function ToastSection() {
  return (
    <Section id="toast">
      <SectionHeader
        id="toast"
        num="11"
        title="Toast"
        hint="success 3s / error 5s · maxToasts 3"
      />
      <div className="surface-panel flex flex-wrap gap-2 p-5">
        <Button variant="outline" onClick={() => toast.success("分析完成")}>
          success
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.error("上传失败 · 文件超过 50MB")}
        >
          error
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const id = toast.loading("生成中");
            setTimeout(() => toast.success("生成完成", { id }), 1500);
          }}
        >
          loading → success
        </Button>
        <Button variant="outline" onClick={() => toast("蓝图已保存")}>
          info
        </Button>
      </div>
    </Section>
  );
}

function OverlaySection() {
  return (
    <Section id="overlay">
      <SectionHeader
        id="overlay"
        num="12"
        title="弹层"
        hint="Dialog · 决策 / Sheet · 表单 / Popover · 微编辑"
      />
      <div className="surface-panel flex flex-wrap gap-2 p-5">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">打开 Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>删除变体？</DialogTitle>
              <DialogDescription>此操作不可撤销。</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost">取消</Button>
              <Button variant="destructive">删除</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">打开 Sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>生成变体</SheetTitle>
              <SheetDescription>
                调整参数，确认后会消耗 BYOK 配额。
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="sheet-temp">温度</Label>
                <Input id="sheet-temp" defaultValue="0.7" />
              </div>
              <Button>开始生成</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </Section>
  );
}

function LoadingSection() {
  return (
    <Section id="loading">
      <SectionHeader
        id="loading"
        num="13"
        title="加载状态"
        hint="按场景选择，不要纯居中 spinner 遮罩"
      />
      <div className="grid gap-3 md:grid-cols-3">
        <div className="surface-panel space-y-3 p-5">
          <p className="eyebrow-label">skeleton · 列表</p>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <div className="surface-panel space-y-3 p-5">
          <p className="eyebrow-label">inline spinner · 按钮</p>
          <Button disabled>
            <Loader2 className="animate-spin" />
            生成中
          </Button>
        </div>
        <div className="surface-panel space-y-3 p-5">
          <p className="eyebrow-label">progress · 长任务</p>
          <p className="text-[13px] text-foreground">处理中 · 已用 12s</p>
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/3 bg-primary transition-all" />
          </div>
        </div>
      </div>
    </Section>
  );
}

const EMPTY_STATES = [
  { icon: Inbox, t: "暂无变体", d: "完成分析后可生成第一个", a: "去分析" },
  { icon: Search, t: "无匹配结果", d: "试着换个关键词", a: "清除筛选" },
  { icon: AlertTriangle, t: "加载失败", d: "请检查网络后重试", a: "重试" },
  { icon: Lock, t: "权限不足", d: "联系管理员开通双书模式", a: "了解详情" },
];

function EmptySection() {
  return (
    <Section id="empty">
      <SectionHeader
        id="empty"
        num="14"
        title="空状态"
        hint="图标 · 标题 ≤12 字 · 说明 · 唯一行动"
      />
      <div className="grid gap-3 md:grid-cols-2">
        {EMPTY_STATES.map((e) => (
          <div
            key={e.t}
            className="surface-panel flex flex-col items-center gap-2 px-5 py-10 text-center"
          >
            <e.icon
              className="size-6 text-muted-foreground/50"
              strokeWidth={1.5}
            />
            <p className="text-[14px] font-medium text-foreground">{e.t}</p>
            <p className="text-[12.5px] text-muted-foreground">{e.d}</p>
            <Button variant="outline" size="sm" className="mt-2">
              {e.a}
            </Button>
          </div>
        ))}
      </div>
    </Section>
  );
}

const KEYS = [
  { combo: ["1", "-", "7"], label: "切换维度" },
  { combo: ["F"], label: "聚焦当前维度" },
  { combo: ["J"], label: "下一项" },
  { combo: ["K"], label: "上一项" },
  { combo: ["Enter"], label: "进入选中项" },
  { combo: ["Esc"], label: "关闭弹层" },
];

function KeyboardSection() {
  return (
    <Section id="keyboard">
      <SectionHeader
        id="keyboard"
        num="15"
        title="键盘快捷键"
        hint="高频操作必须在 UI 中标注快捷键"
      />
      <div className="surface-panel divide-y divide-border">
        {KEYS.map((k) => (
          <div
            key={k.label}
            className="flex items-center justify-between px-4 py-3"
          >
            <span className="text-[13px] text-foreground">{k.label}</span>
            <div className="flex gap-1">
              {k.combo.map((c, i) => (
                <kbd
                  key={i}
                  className="inline-flex h-5 min-w-5 items-center justify-center rounded-[2px] border border-border bg-muted/60 px-1.5 font-mono text-[11px] text-muted-foreground"
                >
                  {c}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

const COPY_PAIRS = [
  { bad: "请先配置你的模型", good: "配置模型后可使用" },
  { bad: "先完成三项分析。", good: "完成三项分析后可生成" },
  { bad: "当前还不能开始分析，先去补上模型设置。", good: "需先配置模型" },
  {
    bad: "本次重试失败，当前仍保留上一次结果。",
    good: "重试失败，保留上次结果",
  },
  { bad: "未返回任何模型。", good: "未找到可用模型" },
  {
    bad: "再生成一个版本会消耗你的 BYOK 配额。",
    good: "生成新版本将消耗 BYOK 配额",
  },
];

function CopySection() {
  return (
    <Section id="copy">
      <SectionHeader
        id="copy"
        num="16"
        title="文案对照"
        hint="禁用：您 / 请先 / 一键 / 轻松 / 感叹号 / emoji"
      />
      <div className="surface-panel divide-y divide-border">
        {COPY_PAIRS.map((p, i) => (
          <div key={i} className="grid gap-3 px-4 py-3 md:grid-cols-2">
            <div className="flex items-start gap-2">
              <X className="mt-1 size-3.5 shrink-0 text-destructive" />
              <p className="text-[13px] text-muted-foreground line-through decoration-destructive/40">
                {p.bad}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Check className="mt-1 size-3.5 shrink-0 text-flash" />
              <p className="text-[13px] text-foreground">{p.good}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
