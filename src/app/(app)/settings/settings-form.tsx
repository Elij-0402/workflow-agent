"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, RefreshCw } from "lucide-react";
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
import { cn } from "@/lib/utils";

type Status = { kind: "unconfigured" } | { kind: "saved"; updatedAt: string };

type ProviderKey = "openai" | "deepseek" | "custom";

const PROVIDER_OPTIONS: { key: ProviderKey; label: string; baseUrl: string }[] = [
  { key: "openai", label: "OpenAI", baseUrl: "https://api.openai.com/v1" },
  { key: "deepseek", label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1" },
  { key: "custom", label: "自定义", baseUrl: "" },
];

function detectProvider(baseUrl: string): ProviderKey {
  if (!baseUrl) return "openai";
  const known = PROVIDER_OPTIONS.find((p) => p.baseUrl && p.baseUrl === baseUrl);
  return known?.key ?? "custom";
}

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
  const autoFetched = useRef(false);

  const [savingConfig, startSave] = useTransition();
  const [fetchingModels, startFetch] = useTransition();

  const [provider, setProvider] = useState<ProviderKey>(
    detectProvider(initialConfig?.base_url ?? ""),
  );
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

  const onProviderChange = (next: ProviderKey) => {
    setProvider(next);
    const preset = PROVIDER_OPTIONS.find((p) => p.key === next);
    if (preset?.baseUrl) setBaseUrl(preset.baseUrl);
  };

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

  const onFetchModels = (silent = false) => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);

    startFetch(async () => {
      const result = await fetchAvailableModels(formData);
      if ("error" in result) {
        if (!silent) toast.error(result.error);
        return;
      }

      const fetched = result.models;
      const isStale = Boolean(model) && !fetched.includes(model);
      const merged = isStale ? [...fetched, model] : fetched;
      setModelOptions(merged);
      setSavedModelStale(isStale);
      if (!model && fetched[0]) setModel(fetched[0]);
      setManualModel(false);
      if (!silent) toast.success(`已获取 ${fetched.length} 个模型`);
    });
  };

  useEffect(() => {
    if (autoFetched.current) return;
    if (!hasSavedKey) return;
    if (modelOptions.length > 1) return;
    autoFetched.current = true;
    onFetchModels(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app-page">
      <div className="max-w-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[20px] font-medium leading-tight text-foreground">模型配置</h1>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              连接你的 OpenAI-compatible 接口，用于小说分析与生成。
            </p>
          </div>
          <StatusBadge status={status} />
        </div>

        <form ref={formRef} onSubmit={onSubmit} className="mt-7 flex flex-col gap-6">
          <input type="hidden" name="base_url" value={baseUrl} />

          <div className="flex flex-col gap-2.5">
            <Label>提供商</Label>
            <div className="grid grid-cols-3 gap-2">
              {PROVIDER_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => onProviderChange(opt.key)}
                  disabled={savingConfig}
                  className={cn(
                    "rounded-[3px] border px-3 py-2.5 text-[13px] transition-colors",
                    provider === opt.key
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {provider === "custom" ? (
              <Input
                placeholder="https://your-gateway.example.com/v1"
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                disabled={savingConfig}
                className="mt-1 h-10"
              />
            ) : null}
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="api_key">API Key</Label>
              {maskedApiKey ? (
                <span className="font-mono text-[10.5px] text-muted-foreground">
                  已保存 · {maskedApiKey}
                </span>
              ) : null}
            </div>
            <div className="relative">
              <Input
                id="api_key"
                name="api_key"
                type={showKey ? "text" : "password"}
                placeholder={maskedApiKey ? "留空表示沿用已保存的 Key" : "sk-..."}
                className="h-10 pr-10"
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

          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="model">模型</Label>
              <button
                type="button"
                onClick={() => setManualModel((v) => !v)}
                className="text-[12px] text-muted-foreground transition hover:text-foreground"
              >
                {manualModel ? "从列表选择" : "手动输入"}
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
                          modelOptions.length === 0
                            ? fetchingModels
                              ? "加载中…"
                              : "请先获取模型列表"
                            : "选择模型"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {modelOptions.map((id, index) => {
                        const isStaleSaved =
                          savedModelStale && index === modelOptions.length - 1 && id === model;
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
                onClick={() => onFetchModels(false)}
                disabled={!canFetch || fetchingModels || savingConfig}
                className="sm:w-auto"
              >
                {fetchingModels ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    获取中…
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    刷新模型
                  </>
                )}
              </Button>
            </div>

            {savedModelStale ? (
              <p className="text-[12px] text-destructive">已保存的模型不在新列表中，请重新选择。</p>
            ) : null}
          </div>

          <details className="group rounded-[3px] border border-border/60">
            <summary className="cursor-pointer list-none px-4 py-3 text-[13px] text-muted-foreground transition hover:text-foreground">
              <span className="inline-flex items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground/60 transition group-open:rotate-90">
                  ▸
                </span>
                生成参数 · 通常无需调整
              </span>
            </summary>
            <div className="grid gap-4 border-t border-border/60 p-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="temperature">temperature</Label>
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
                <Label htmlFor="max_tokens">max_tokens</Label>
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
          </details>

          <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-5">
            <p className="text-[12px] text-muted-foreground">API Key 仅在服务端加密存储。</p>
            <Button type="submit" disabled={savingConfig}>
              {savingConfig ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  保存中…
                </>
              ) : (
                "保存配置"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (status.kind === "unconfigured") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
        <span className="size-1.5 rounded-full bg-muted-foreground/40" />
        未配置
      </span>
    );
  }

  const suffix = mounted ? ` · ${relativeTime(status.updatedAt)}` : "";
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-flash/40 bg-flash/10 px-2.5 py-1 text-[11px] text-flash">
      <span className="size-1.5 rounded-full bg-flash" />
      已保存{suffix}
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
