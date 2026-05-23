"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
  Server,
} from "lucide-react";
import { toast } from "sonner";

import { fetchAvailableModels, saveLLMConfig } from "./actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Status =
  | { kind: "unconfigured" }
  | { kind: "saved"; updatedAt: string };

type SettingsFormProps = {
  initialConfig: {
    base_url: string;
    model: string;
    temperature: number;
    max_tokens: number;
  } | null;
  maskedApiKey: string | null;
  status: Status;
};

export function SettingsForm({
  initialConfig,
  maskedApiKey,
  status,
}: SettingsFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [savingConfig, startSave] = useTransition();
  const [fetchingModels, startFetch] = useTransition();

  const [baseUrl, setBaseUrl] = useState(
    initialConfig?.base_url ?? "https://api.openai.com/v1"
  );
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState(initialConfig?.model ?? "");
  const [modelOptions, setModelOptions] = useState<string[]>(
    initialConfig?.model ? [initialConfig.model] : []
  );
  const [savedModelStale, setSavedModelStale] = useState(false);
  const [manualModel, setManualModel] = useState(false);
  const [temperature, setTemperature] = useState(
    String(initialConfig?.temperature ?? 0.7)
  );
  const [maxTokens, setMaxTokens] = useState(
    String(initialConfig?.max_tokens ?? 4096)
  );

  const hasSavedKey = Boolean(maskedApiKey);
  const canFetch = baseUrl.trim().length > 0 && (apiKey.length > 0 || hasSavedKey);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startSave(async () => {
      const result = await saveLLMConfig(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result?.message ?? "配置已保存。");
      setApiKey("");
      setShowKey(false);
      router.refresh();
    });
  };

  const onFetchModels = () => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);

    startFetch(async () => {
      const result = await fetchAvailableModels(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      const fetched = result.models;
      const isStale = Boolean(model) && !fetched.includes(model);
      const merged = isStale ? [...fetched, model] : fetched;
      setModelOptions(merged);
      setSavedModelStale(isStale);
      if (!model && fetched[0]) setModel(fetched[0]);
      setManualModel(false);
      toast.success(`已获取 ${fetched.length} 个模型`);
    });
  };

  return (
    <div className="app-page">
      <div className="max-w-3xl">
        <p className="eyebrow-label">Models</p>
        <h1 className="mt-2 text-[28px] font-medium tracking-tight sm:text-[32px]">
          配置分析模型
        </h1>
        <p className="mt-3 text-[14px] leading-6 text-muted-foreground sm:text-[15px]">
          每个账号保留一套 OpenAI-compatible 模型配置，用于后续小说分析与生成。
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_320px]">
        <Card className="border-border/80 bg-card/80 shadow-none">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow-label">Endpoint</p>
                <CardTitle className="mt-2">LLM 配置</CardTitle>
                <CardDescription className="mt-2">
                  仅支持 OpenAI-compatible endpoint。若 endpoint 不提供 /models，可手动填写模型。
                </CardDescription>
              </div>
              <StatusBadge status={status} />
            </div>
          </CardHeader>
          <CardContent>
            <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-6">
              <SettingsSection
                icon={Server}
                title="连接"
                body={
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="base_url">Base URL</Label>
                      <div className="relative">
                        <Server className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="base_url"
                          name="base_url"
                          placeholder="https://api.openai.com/v1"
                          required
                          className="h-10 border-border/80 bg-background/60 pl-9"
                          value={baseUrl}
                          onChange={(event) => setBaseUrl(event.target.value)}
                          disabled={savingConfig}
                        />
                      </div>
                      <p className="text-xs leading-5 text-muted-foreground">
                        支持 OpenAI、DeepSeek 和自建兼容网关；不支持 Anthropic 原生接口。
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="api_key">API Key</Label>
                        {maskedApiKey ? (
                          <span className="text-xs text-muted-foreground">
                            当前已保存：{maskedApiKey}
                          </span>
                        ) : null}
                      </div>
                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="api_key"
                          name="api_key"
                          type={showKey ? "text" : "password"}
                          placeholder={maskedApiKey ? "留空则保留当前 API Key" : "sk-..."}
                          className="h-10 border-border/80 bg-background/60 pl-9 pr-10"
                          value={apiKey}
                          onChange={(event) => setApiKey(event.target.value)}
                          disabled={savingConfig}
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey((v) => !v)}
                          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          aria-label={showKey ? "隐藏 API Key" : "显示 API Key"}
                          tabIndex={-1}
                        >
                          {showKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                }
              />

              <SettingsSection
                icon={Bot}
                title="模型"
                body={
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="model">模型</Label>
                      <button
                        type="button"
                        onClick={() => setManualModel((v) => !v)}
                        className="text-xs text-muted-foreground transition hover:text-foreground"
                      >
                        {manualModel ? "回到下拉选择" : "endpoint 不支持？手动输入"}
                      </button>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <div className="flex-1">
                        {manualModel ? (
                          <Input
                            id="model"
                            name="model"
                            placeholder="gpt-4o-mini"
                            required
                            className="h-10 border-border/80 bg-background/60"
                            value={model}
                            onChange={(event) => setModel(event.target.value)}
                            disabled={savingConfig}
                          />
                        ) : (
                          <Select
                            name="model"
                            value={model}
                            onValueChange={setModel}
                            disabled={savingConfig || fetchingModels || modelOptions.length === 0}
                          >
                            <SelectTrigger
                              id="model"
                              className="h-10 border-border/80 bg-background/60"
                            >
                              <SelectValue
                                placeholder={modelOptions.length === 0 ? "请先获取模型" : "选择模型"}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {modelOptions.map((id, index) => {
                                const isStaleSaved =
                                  savedModelStale &&
                                  index === modelOptions.length - 1 &&
                                  id === model;
                                return (
                                  <SelectItem key={id} value={id}>
                                    {id}
                                    {isStaleSaved ? "（当前）" : ""}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      <Button
                        type="button"
                        variant="secondary"
                        onClick={onFetchModels}
                        disabled={!canFetch || fetchingModels || savingConfig}
                        className="sm:w-auto"
                      >
                        {fetchingModels ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            获取中
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4" />
                            获取可用模型
                          </>
                        )}
                      </Button>
                    </div>

                    {savedModelStale ? (
                      <p className="text-xs text-muted-foreground">
                        当前模型不在新列表中，可重新选择。
                      </p>
                    ) : null}
                  </div>
                }
              />

              <SettingsSection
                icon={RefreshCw}
                title="生成参数"
                body={
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="temperature">Temperature</Label>
                      <Input
                        id="temperature"
                        name="temperature"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max="2"
                        step="0.1"
                        required
                        className="h-10 border-border/80 bg-background/60"
                        value={temperature}
                        onChange={(event) => setTemperature(event.target.value)}
                        disabled={savingConfig}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="max_tokens">Max Tokens</Label>
                      <Input
                        id="max_tokens"
                        name="max_tokens"
                        type="number"
                        inputMode="numeric"
                        min="256"
                        max="200000"
                        step="1"
                        required
                        className="h-10 border-border/80 bg-background/60"
                        value={maxTokens}
                        onChange={(event) => setMaxTokens(event.target.value)}
                        disabled={savingConfig}
                      />
                    </div>
                  </div>
                }
              />

              <CardFooter className="mt-1 border-t border-border/70 px-0 pt-5">
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    API Key 仅在服务端加密存储，不会暴露到浏览器。
                  </p>
                  <Button type="submit" disabled={savingConfig}>
                    {savingConfig ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        保存中
                      </>
                    ) : (
                      "保存配置"
                    )}
                  </Button>
                </div>
              </CardFooter>
            </form>
          </CardContent>
        </Card>

        <aside className="flex flex-col gap-4">
          <Card className="border-border/80 bg-card/70 shadow-none">
            <CardHeader>
              <CardTitle>当前状态</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-[13px] leading-6 text-muted-foreground">
              <p>模型配置会在后续分析与生成请求中复用。</p>
              <p>当 endpoint 可列出模型时，建议优先从列表选择，减少拼写错误。</p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/70 shadow-none">
            <CardHeader>
              <CardTitle>安全说明</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-[13px] leading-6 text-muted-foreground">
              <p>你的 API Key 不会出现在客户端源码中。</p>
              <p>系统只保留一套当前账户的可用模型配置，用于维持最短工作路径。</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function SettingsSection({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <section className="surface-subtle p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-[7px] border border-border/80 bg-background/80 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-[13px] font-medium text-foreground">{title}</h3>
      </div>
      {body}
    </section>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (status.kind === "unconfigured") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
        未配置
      </span>
    );
  }

  const suffix = mounted ? ` · ${relativeTime(status.updatedAt)}` : "";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      已配置{suffix}
    </span>
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "刚刚";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} 分钟前`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} 小时前`;
  if (diffMs < 30 * day) return `${Math.floor(diffMs / day)} 天前`;
  return new Date(iso).toLocaleDateString("zh-CN");
}
