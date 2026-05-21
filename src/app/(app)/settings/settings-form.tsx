"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot, Eye, EyeOff, KeyRound, Loader2, RefreshCw, Server } from "lucide-react";
import { toast } from "sonner";

import { fetchAvailableModels, saveLLMConfig } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Status = { kind: "unconfigured" } | { kind: "saved"; updatedAt: string };

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

export function SettingsForm({ initialConfig, maskedApiKey, status }: SettingsFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [savingConfig, startSave] = useTransition();
  const [fetchingModels, startFetch] = useTransition();

  const [baseUrl, setBaseUrl] = useState(initialConfig?.base_url ?? "https://api.openai.com/v1");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState(initialConfig?.model ?? "");
  const [modelOptions, setModelOptions] = useState<string[]>(
    initialConfig?.model ? [initialConfig.model] : [],
  );
  const [savedModelStale, setSavedModelStale] = useState(false);
  const [manualModel, setManualModel] = useState(false);
  const [temperature, setTemperature] = useState(String(initialConfig?.temperature ?? 0.7));
  const [maxTokens, setMaxTokens] = useState(String(initialConfig?.max_tokens ?? 4096));

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
        <p className="eyebrow-label">config · models</p>
        <h1 className="mt-3 font-display text-[40px] italic leading-[1.04] tracking-[-0.01em] text-foreground sm:text-[48px]">
          配置分析模型
        </h1>
        <p className="mt-4 max-w-2xl text-[14px] leading-7 text-muted-foreground sm:text-[15px]">
          每个账号保留一套 OpenAI-compatible 模型配置，用于后续小说分析与生成。
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_320px]">
        <div className="surface-panel p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow-label">endpoint</p>
              <h2 className="mt-2 font-display text-[24px] italic leading-[1.1] text-foreground">
                LLM 配置
              </h2>
              <p className="mt-2 text-[13.5px] leading-7 text-muted-foreground">
                仅支持 OpenAI-compatible endpoint。若不提供 /models，可手动填写模型。
              </p>
            </div>
            <StatusBadge status={status} />
          </div>

          <form ref={formRef} onSubmit={onSubmit} className="mt-6 flex flex-col gap-6">
            <SettingsSection
              icon={Server}
              title="连接"
              token="connection"
              body={
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="base_url">{"// base url"}</Label>
                    <div className="relative">
                      <Server className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/60" />
                      <Input
                        id="base_url"
                        name="base_url"
                        placeholder="https://api.openai.com/v1"
                        required
                        className="h-10 pl-9"
                        value={baseUrl}
                        onChange={(event) => setBaseUrl(event.target.value)}
                        disabled={savingConfig}
                      />
                    </div>
                    <p className="text-[12px] leading-6 text-muted-foreground">
                      支持 OpenAI、DeepSeek 和自建兼容网关；不支持 Anthropic 原生接口。
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="api_key">{"// api key"}</Label>
                      {maskedApiKey ? (
                        <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-flash">
                          stored · {maskedApiKey}
                        </span>
                      ) : null}
                    </div>
                    <div className="relative">
                      <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/60" />
                      <Input
                        id="api_key"
                        name="api_key"
                        type={showKey ? "text" : "password"}
                        placeholder={maskedApiKey ? "leave empty to keep current" : "sk-..."}
                        className="h-10 pl-9 pr-10"
                        value={apiKey}
                        onChange={(event) => setApiKey(event.target.value)}
                        disabled={savingConfig}
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey((v) => !v)}
                        className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[2px] text-muted-foreground transition hover:text-primary"
                        aria-label={showKey ? "隐藏 API Key" : "显示 API Key"}
                        tabIndex={-1}
                      >
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              }
            />

            <SettingsSection
              icon={Bot}
              title="模型"
              token="model"
              body={
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="model">{"// model"}</Label>
                    <button
                      type="button"
                      onClick={() => setManualModel((v) => !v)}
                      className="text-[12px] text-muted-foreground transition hover:text-primary"
                    >
                      {manualModel ? "↩ 返回列表" : "手动输入"}
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
                          className="h-10"
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
                          <SelectTrigger id="model" className="h-10">
                            <SelectValue
                              placeholder={
                                modelOptions.length === 0 ? "// fetch models first" : "select model"
                              }
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
                                  {isStaleSaved ? " · (current)" : ""}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={onFetchModels}
                      disabled={!canFetch || fetchingModels || savingConfig}
                      className="sm:w-auto"
                    >
                      {fetchingModels ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          fetching…
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          获取模型列表
                        </>
                      )}
                    </Button>
                  </div>

                  {savedModelStale ? (
                    <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-destructive">
                      {"// saved model not in new list — please re-select"}
                    </p>
                  ) : null}
                </div>
              }
            />

            <SettingsSection
              icon={RefreshCw}
              title="生成参数"
              token="parameters"
              body={
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="temperature">{"// temperature"}</Label>
                    <Input
                      id="temperature"
                      name="temperature"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="2"
                      step="0.1"
                      required
                      className="h-10"
                      value={temperature}
                      onChange={(event) => setTemperature(event.target.value)}
                      disabled={savingConfig}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="max_tokens">{"// max tokens"}</Label>
                    <Input
                      id="max_tokens"
                      name="max_tokens"
                      type="number"
                      inputMode="numeric"
                      min="256"
                      max="200000"
                      step="1"
                      required
                      className="h-10"
                      value={maxTokens}
                      onChange={(event) => setMaxTokens(event.target.value)}
                      disabled={savingConfig}
                    />
                  </div>
                </div>
              }
            />

            <div className="mt-1 border-t border-dashed border-border/70 pt-5">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                  {"// api key 仅在服务端加密存储"}
                </p>
                <Button type="submit" disabled={savingConfig}>
                  {savingConfig ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      保存中…
                    </>
                  ) : (
                    "保存设置"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>

        <aside className="flex flex-col gap-4">
          <section className="surface-subtle p-5">
            <p className="eyebrow-label">notes</p>
            <h3 className="mt-2 font-display text-[18px] italic text-foreground">当前状态</h3>
            <div className="mt-3 flex flex-col gap-3 text-[13px] leading-7 text-muted-foreground">
              <p>模型配置会在后续分析与生成请求中复用。</p>
              <p>当 endpoint 可列出模型时，建议优先从列表选择，减少拼写错误。</p>
            </div>
          </section>

          <section className="surface-subtle p-5">
            <p className="eyebrow-label">security</p>
            <h3 className="mt-2 font-display text-[18px] italic text-foreground">安全说明</h3>
            <div className="mt-3 flex flex-col gap-3 text-[13px] leading-7 text-muted-foreground">
              <p>API Key 不会出现在客户端源码中。</p>
              <p>系统只保留一套当前账户的可用模型配置，用于维持最短工作路径。</p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function SettingsSection({
  icon: Icon,
  title,
  token,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  token: string;
  body: React.ReactNode;
}) {
  return (
    <section className="surface-subtle p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="font-display text-[16px] italic text-foreground">{title}</h3>
        </div>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-primary/70">
          {`// ${token}`}
        </span>
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
      <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-border bg-muted px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-foreground">
        <span className="text-muted-foreground/60">○</span>
        {"// unconfigured"}
      </span>
    );
  }

  const suffix = mounted ? ` · ${relativeTime(status.updatedAt)}` : "";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-flash/40 bg-flash/10 px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.10em] text-flash">
      <span>●</span>
      {`// saved${suffix}`}
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
