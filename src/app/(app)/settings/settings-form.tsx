"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot, KeyRound, Loader2, Server } from "lucide-react";
import { toast } from "sonner";

import { saveLLMConfig } from "./actions";
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

const providers = [
  { value: "openai", label: "OpenAI" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "anthropic", label: "Anthropic" },
  { value: "custom", label: "自定义兼容接口" },
] as const;

type SettingsFormProps = {
  initialConfig: {
    provider: string;
    base_url: string;
    model: string;
    temperature: number;
    max_tokens: number;
  } | null;
  maskedApiKey: string | null;
};

export function SettingsForm({
  initialConfig,
  maskedApiKey,
}: SettingsFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [provider, setProvider] = useState(initialConfig?.provider ?? "openai");
  const [baseUrl, setBaseUrl] = useState(
    initialConfig?.base_url ?? "https://api.openai.com/v1"
  );
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(initialConfig?.model ?? "");
  const [temperature, setTemperature] = useState(
    String(initialConfig?.temperature ?? 0.7)
  );
  const [maxTokens, setMaxTokens] = useState(
    String(initialConfig?.max_tokens ?? 4096)
  );

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await saveLLMConfig(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result?.message ?? "配置已保存。");
      setApiKey("");
      router.refresh();
    });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Card className="border-border/60 bg-card/60">
        <CardHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
            <Bot className="h-5 w-5" />
          </div>
          <CardTitle>LLM 配置</CardTitle>
          <CardDescription>
            每个账号保留一套模型配置，用于后续小说分析与生成。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="provider">服务提供方</Label>
                <Select
                  name="provider"
                  value={provider}
                  onValueChange={setProvider}
                  disabled={pending}
                >
                  <SelectTrigger id="provider">
                    <SelectValue placeholder="选择服务提供方" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((providerOption) => (
                      <SelectItem
                        key={providerOption.value}
                        value={providerOption.value}
                      >
                        {providerOption.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">模型 ID</Label>
                <Input
                  id="model"
                  name="model"
                  placeholder="gpt-4o-mini"
                  required
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  disabled={pending}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="base_url">Base URL</Label>
                <div className="relative">
                  <Server className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="base_url"
                    name="base_url"
                    placeholder="https://api.openai.com/v1"
                    required
                    className="pl-9"
                    value={baseUrl}
                    onChange={(event) => setBaseUrl(event.target.value)}
                    disabled={pending}
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
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
                    type="password"
                    placeholder={
                      maskedApiKey ? "留空则保留当前 API Key" : "sk-..."
                    }
                    className="pl-9"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    disabled={pending}
                  />
                </div>
              </div>

              <div className="space-y-2">
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
                  value={temperature}
                  onChange={(event) => setTemperature(event.target.value)}
                  disabled={pending}
                />
              </div>

              <div className="space-y-2">
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
                  value={maxTokens}
                  onChange={(event) => setMaxTokens(event.target.value)}
                  disabled={pending}
                />
              </div>
            </div>

            <CardFooter className="mt-1 border-t border-border/60 px-0 pt-5">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  API Key 仅在服务端加密存储，不会暴露到浏览器。
                </p>
                <Button type="submit" disabled={pending}>
                  {pending ? (
                    <>
                      <Loader2 className="animate-spin" />
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
    </div>
  );
}
