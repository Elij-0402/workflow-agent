"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { applyCandidate, type Candidate } from "@/lib/blueprint/merge";
import {
  blueprintReadyToConfirm,
  type Blueprint,
  type BlueprintSection,
  type BlueprintStatus,
} from "@/lib/blueprint/schema";
import { GenerateConfigSchema, type GenerateConfig } from "@/lib/types";

import {
  BlueprintSectionTable,
  type SectionColumn,
} from "./blueprint-section";

type Status = BlueprintStatus;

const TABS: Array<{ key: BlueprintSection; label: string; token: string }> = [
  { key: "characters", label: "人物", token: "characters" },
  { key: "relationships", label: "人物关系", token: "relationships" },
  { key: "world_rules", label: "世界规则", token: "world" },
  { key: "conflicts", label: "核心冲突", token: "conflicts" },
  { key: "plot_beats", label: "章节节点", token: "beats" },
  { key: "viewpoint", label: "视角与节奏", token: "viewpoint" },
  { key: "themes", label: "主题", token: "themes" },
];

type Props = {
  sessionId: string;
  blueprintId: string | null;
  blueprint: Blueprint;
  status: Status;
  updatedAt: string | null;
  pendingCandidate: Candidate | null;
  onSaved: (next: Blueprint, ts: string, id: string) => void;
  onStatusChange: (s: Status, confirmedAt: string | null) => void;
  onCandidateConsumed: () => void;
  onVariantGenerated: () => void;
};

export function BlueprintEditor({
  sessionId,
  blueprintId,
  blueprint,
  status,
  updatedAt,
  pendingCandidate,
  onSaved,
  onStatusChange,
  onCandidateConsumed,
  onVariantGenerated,
}: Props) {
  const [active, setActive] = useState<BlueprintSection>("characters");
  const [bp, setBp] = useState<Blueprint>(blueprint);
  const [bpId, setBpId] = useState<string | null>(blueprintId);
  const [bpUpdatedAt, setBpUpdatedAt] = useState<string | null>(updatedAt);
  const [generating, setGenerating] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const disabled = status === "confirmed";

  useEffect(() => {
    if (!pendingCandidate) return;
    if (disabled) {
      toast.error("蓝图已锁定，请先解锁后再修改。");
      onCandidateConsumed();
      return;
    }
    const next = applyCandidate(bp, pendingCandidate);
    void save(next);
    onCandidateConsumed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCandidate]);

  async function save(next: Blueprint) {
    setBp(next);
    const res = await fetch("/api/blueprint", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        patch: next,
        expectedUpdatedAt: bpUpdatedAt,
      }),
    });
    const j = (await res.json()) as { ok?: true; updated_at?: string; error?: string };
    if (!res.ok || !j.ok || !j.updated_at) {
      toast.error(j.error ?? "保存蓝图失败。");
      return;
    }
    setBpUpdatedAt(j.updated_at);
    onSaved(next, j.updated_at, bpId ?? "");
  }

  async function confirm() {
    const ready = blueprintReadyToConfirm(bp);
    if (!ready.ok) {
      toast.error(`蓝图缺少：${ready.missing.join(", ")}`);
      return;
    }
    const res = await fetch("/api/blueprint/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const j = (await res.json()) as { ok?: true; error?: string };
    if (!res.ok || !j.ok) {
      toast.error(j.error ?? "确认失败。");
      return;
    }
    const ts = new Date().toISOString();
    onStatusChange("confirmed", ts);
    toast.success("蓝图已确认。");
  }

  async function unlock() {
    const res = await fetch("/api/blueprint/unconfirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    if (res.ok) {
      onStatusChange("draft", null);
      toast.success("蓝图已解锁。");
    }
  }

  async function generateVariant(config: GenerateConfig) {
    if (!bpId) {
      toast.error("请先保存蓝图。");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blueprintId: bpId, config }),
      });
      const j = (await res.json()) as { ok?: true; error?: string };
      if (!res.ok || !j.ok) {
        toast.error(j.error ?? "生成失败。");
        return;
      }
      toast.success("变体已生成。");
      setShowGenerate(false);
      onVariantGenerated();
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    setBp(blueprint);
    setBpUpdatedAt(updatedAt);
    setBpId(blueprintId);
  }, [blueprint, updatedAt, blueprintId]);

  return (
    <div className="surface-panel flex h-[380px] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-dashed border-border/60 px-4 py-2.5">
        <nav className="flex flex-wrap gap-0.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              data-active={active === t.key}
              onClick={() => setActive(t.key)}
              className="terminal-tab"
              title={t.label}
            >
              [ {t.token} ]
            </button>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`font-mono text-[10.5px] uppercase tracking-[0.12em] ${
              status === "confirmed" ? "text-flash" : "text-primary/85"
            }`}
          >
            {status === "confirmed" ? "// confirmed" : "// draft"}
          </span>
          {status === "confirmed" ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => void unlock()}>
                $ unlock
              </Button>
              <Button
                size="sm"
                disabled={generating}
                className="font-mono uppercase tracking-[0.10em]"
                onClick={() => setShowGenerate(true)}
              >
                {generating ? <Loader2 className="animate-spin" /> : <Sparkles />}
                $ generate
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              className="font-mono uppercase tracking-[0.10em]"
              onClick={() => void confirm()}
            >
              $ confirm
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {active === "viewpoint" ? (
          <ViewpointEditor
            bp={bp}
            disabled={disabled}
            onSave={(patch) =>
              void save({ ...bp, viewpoint: { ...bp.viewpoint, ...patch } })
            }
          />
        ) : (
          <SectionTable
            section={active}
            bp={bp}
            onSave={save}
            disabled={disabled}
          />
        )}
      </div>
      {showGenerate ? (
        <GenerateConfigDialog
          generating={generating}
          onCancel={() => setShowGenerate(false)}
          onSubmit={(config) => void generateVariant(config)}
        />
      ) : null}
    </div>
  );
}

function ViewpointEditor({
  bp,
  disabled,
  onSave,
}: {
  bp: Blueprint;
  disabled: boolean;
  onSave: (patch: Partial<Blueprint["viewpoint"]>) => void;
}) {
  return (
    <div className="grid gap-3 p-4 text-[13px]">
      <Field
        label="// mode"
        zh="视角模式"
        value={bp.viewpoint.mode}
        disabled={disabled}
        onChange={(mode) => onSave({ mode })}
      />
      <Field
        label="// pacing"
        zh="节奏"
        value={bp.viewpoint.pacing}
        disabled={disabled}
        onChange={(pacing) => onSave({ pacing })}
      />
      <Field
        label="// notes"
        zh="备注"
        value={bp.viewpoint.notes}
        disabled={disabled}
        onChange={(notes) => onSave({ notes })}
      />
    </div>
  );
}

function Field({
  label,
  zh,
  value,
  disabled,
  onChange,
}: {
  label: string;
  zh: string;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-start gap-3">
      <span className="w-32 shrink-0 pt-2">
        <span className="block font-mono text-[10.5px] uppercase tracking-[0.12em] text-primary/85">
          {label}
        </span>
        <span className="block font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">
          {zh}
        </span>
      </span>
      <input
        className="flex-1 rounded-[2px] border border-border bg-background/40 px-2 py-1.5 font-mono text-[12.5px] text-foreground focus:border-primary focus:outline-none"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

type ArraySection = Exclude<BlueprintSection, "viewpoint">;

const COLUMNS_BY_SECTION: Record<
  ArraySection,
  ReadonlyArray<SectionColumn<Record<string, unknown> & { id: string; notes: string }>>
> = {
  characters: [
    { key: "name", label: "名称" },
    { key: "role", label: "角色" },
    { key: "description", label: "描述" },
  ],
  relationships: [
    { key: "from", label: "From" },
    { key: "to", label: "To" },
    { key: "type", label: "类型" },
    { key: "description", label: "描述" },
  ],
  world_rules: [
    { key: "rule", label: "规则" },
    { key: "description", label: "描述" },
  ],
  conflicts: [
    { key: "title", label: "标题" },
    { key: "description", label: "描述" },
  ],
  plot_beats: [
    { key: "title", label: "标题" },
    { key: "description", label: "描述" },
    { key: "order", label: "顺序", width: "70px", type: "number" },
  ],
  themes: [{ key: "theme", label: "主题" }],
};

function SectionTable({
  section,
  bp,
  onSave,
  disabled,
}: {
  section: ArraySection;
  bp: Blueprint;
  onSave: (next: Blueprint) => void;
  disabled: boolean;
}) {
  const rows = bp[section] as Array<Record<string, unknown> & { id: string; notes: string }>;
  const columns = COLUMNS_BY_SECTION[section];
  return (
    <BlueprintSectionTable
      rows={rows}
      columns={[...columns]}
      disabled={disabled}
      onChange={(id, patch) => {
        const next = {
          ...bp,
          [section]: rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        };
        onSave(next as Blueprint);
      }}
      onDelete={(id) => {
        const next = { ...bp, [section]: rows.filter((r) => r.id !== id) };
        onSave(next as Blueprint);
      }}
    />
  );
}

function GenerateConfigDialog({
  generating,
  onCancel,
  onSubmit,
}: {
  generating: boolean;
  onCancel: () => void;
  onSubmit: (config: GenerateConfig) => void;
}) {
  const [config, setConfig] = useState<GenerateConfig>(
    GenerateConfigSchema.parse({})
  );
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/72 backdrop-blur-[2px]">
      <div className="surface-panel w-[480px] space-y-4 bg-card p-6 text-[13px]">
        <div>
          <p className="eyebrow-label">generate config</p>
          <h3 className="mt-2 font-display italic text-[22px] leading-tight text-foreground">
            生成变体参数
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="strategy"
            value={config.strategy}
            options={["a-dominant", "balanced", "theme-graft"]}
            onChange={(strategy) =>
              setConfig({ ...config, strategy: strategy as GenerateConfig["strategy"] })
            }
          />
          <Select
            label="viewpoint"
            value={config.viewpoint}
            options={["keep", "first-person", "third-limited", "omniscient"]}
            onChange={(viewpoint) =>
              setConfig({
                ...config,
                viewpoint: viewpoint as GenerateConfig["viewpoint"],
              })
            }
          />
          <Select
            label="style"
            value={config.style}
            options={["keep", "modern", "classical", "web-novel"]}
            onChange={(style) =>
              setConfig({ ...config, style: style as GenerateConfig["style"] })
            }
          />
          <Select
            label="scope"
            value={config.output_scope}
            options={["single-chapter", "outline", "three-chapters"]}
            onChange={(output_scope) =>
              setConfig({
                ...config,
                output_scope: output_scope as GenerateConfig["output_scope"],
              })
            }
          />
          <label className="col-span-2 flex items-center gap-3">
            <span className="w-24 font-mono text-[10.5px] uppercase tracking-[0.12em] text-primary/85">
              {"// innov"}</span>
            <input
              type="number"
              min={1}
              max={10}
              value={config.innovation}
              onChange={(e) =>
                setConfig({ ...config, innovation: Number(e.target.value) })
              }
              className="w-20 rounded-[2px] border border-border bg-background/40 px-2 py-1.5 font-mono text-[13px] text-foreground focus:border-primary focus:outline-none"
            />
            <span className="font-mono text-[11px] text-muted-foreground">/ 10</span>
          </label>
          <label className="col-span-2 flex items-start gap-3">
            <span className="w-24 pt-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-primary/85">
              {"// extra"}</span>
            <textarea
              value={config.extra_instructions}
              onChange={(e) =>
                setConfig({ ...config, extra_instructions: e.target.value })
              }
              className="min-h-[88px] flex-1 rounded-[2px] border border-border bg-background/40 px-2 py-1.5 font-mono text-[12.5px] text-foreground focus:border-primary focus:outline-none"
              maxLength={800}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-dashed border-border/70 pt-4">
          <Button variant="ghost" onClick={onCancel} disabled={generating}>
            $ cancel
          </Button>
          <Button
            onClick={() => onSubmit(config)}
            disabled={generating}
            className="font-mono uppercase tracking-[0.10em]"
          >
            {generating ? <Loader2 className="animate-spin" /> : null}
            $ generate
          </Button>
        </div>
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-3">
      <span className="w-20 font-mono text-[10.5px] uppercase tracking-[0.12em] text-primary/85">
        {`// ${label}`}
      </span>
      <select
        className="flex-1 rounded-[2px] border border-border bg-background/40 px-2 py-1.5 font-mono text-[12.5px] text-foreground focus:border-primary focus:outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
