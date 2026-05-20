"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { applyCandidate, type Candidate } from "@/lib/blueprint/merge";
import {
  blueprintReadyToConfirm,
  type Blueprint,
  type BlueprintSection,
  type BlueprintStatus,
} from "@/lib/blueprint/schema";

import {
  BlueprintCardList,
  CharacterCard,
  ConflictCard,
  PlotBeatCard,
  RelationshipCard,
  ThemeCard,
  WorldRuleCard,
  type BookLookup,
  type ChapterLookup,
} from "./blueprint-cards";
import { GenerateDrawer } from "./generate-drawer";

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
  books: BookLookup[];
  chapters: ChapterLookup;
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
  books,
  chapters,
  onSaved,
  onStatusChange,
  onCandidateConsumed,
  onVariantGenerated,
}: Props) {
  const [active, setActive] = useState<BlueprintSection>("characters");
  const [bp, setBp] = useState<Blueprint>(blueprint);
  const [bpId, setBpId] = useState<string | null>(blueprintId);
  const [bpUpdatedAt, setBpUpdatedAt] = useState<string | null>(updatedAt);
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

  async function moveBeat(fromIdx: number, toIdx: number) {
    const beats = [...bp.plot_beats];
    if (toIdx < 0 || toIdx >= beats.length) return;
    const [moved] = beats.splice(fromIdx, 1);
    beats.splice(toIdx, 0, moved);
    await save({ ...bp, plot_beats: renumberBeats(beats) });
  }

  useEffect(() => {
    setBp(blueprint);
    setBpUpdatedAt(updatedAt);
    setBpId(blueprintId);
  }, [blueprint, updatedAt, blueprintId]);

  return (
    <div className="surface-panel flex flex-1 min-h-0 flex-col">
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
              <Button
                size="sm"
                variant="ghost"
                className="font-mono uppercase tracking-[0.08em]"
                onClick={() => void unlock()}
              >
                $ unlock
              </Button>
              <Button size="sm" onClick={() => setShowGenerate(true)}>
                <Sparkles />
                生成新版本
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => void confirm()}
            >
              确认蓝图
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
        ) : active === "characters" ? (
          <BlueprintCardList
            rows={bp.characters}
            disabled={disabled}
            addLabel="新建角色"
            emptyHint="还没有角色 · 从两本书的章节卡片勾选添加，或新建一个空角色。"
            onAdd={() =>
              void save({
                ...bp,
                characters: [
                  ...bp.characters,
                  {
                    id: crypto.randomUUID(),
                    notes: "",
                    sources: [],
                    name: "",
                    role: "",
                    traits: [],
                    description: "",
                  },
                ],
              })
            }
            renderRow={(row) => (
              <CharacterCard
                row={row}
                disabled={disabled}
                books={books}
                chapters={chapters}
                onChange={(patch) =>
                  void save({
                    ...bp,
                    characters: bp.characters.map((r) =>
                      r.id === row.id ? { ...r, ...patch } : r
                    ),
                  })
                }
                onDelete={() =>
                  void save({
                    ...bp,
                    characters: bp.characters.filter((r) => r.id !== row.id),
                  })
                }
              />
            )}
          />
        ) : active === "relationships" ? (
          <BlueprintCardList
            rows={bp.relationships}
            disabled={disabled}
            addLabel="新建关系"
            emptyHint="还没有关系 · 从章节卡片勾选添加，或新建一对人物连接。"
            onAdd={() =>
              void save({
                ...bp,
                relationships: [
                  ...bp.relationships,
                  {
                    id: crypto.randomUUID(),
                    notes: "",
                    sources: [],
                    from: "",
                    to: "",
                    type: "",
                    description: "",
                  },
                ],
              })
            }
            renderRow={(row) => (
              <RelationshipCard
                row={row}
                disabled={disabled}
                books={books}
                chapters={chapters}
                onChange={(patch) =>
                  void save({
                    ...bp,
                    relationships: bp.relationships.map((r) =>
                      r.id === row.id ? { ...r, ...patch } : r
                    ),
                  })
                }
                onDelete={() =>
                  void save({
                    ...bp,
                    relationships: bp.relationships.filter((r) => r.id !== row.id),
                  })
                }
              />
            )}
          />
        ) : active === "world_rules" ? (
          <BlueprintCardList
            rows={bp.world_rules}
            disabled={disabled}
            addLabel="新建规则"
            emptyHint="还没有世界规则 · 添加魔法体系、社会结构、限制等。"
            onAdd={() =>
              void save({
                ...bp,
                world_rules: [
                  ...bp.world_rules,
                  {
                    id: crypto.randomUUID(),
                    notes: "",
                    sources: [],
                    rule: "",
                    description: "",
                  },
                ],
              })
            }
            renderRow={(row) => (
              <WorldRuleCard
                row={row}
                disabled={disabled}
                books={books}
                chapters={chapters}
                onChange={(patch) =>
                  void save({
                    ...bp,
                    world_rules: bp.world_rules.map((r) =>
                      r.id === row.id ? { ...r, ...patch } : r
                    ),
                  })
                }
                onDelete={() =>
                  void save({
                    ...bp,
                    world_rules: bp.world_rules.filter((r) => r.id !== row.id),
                  })
                }
              />
            )}
          />
        ) : active === "conflicts" ? (
          <BlueprintCardList
            rows={bp.conflicts}
            disabled={disabled}
            addLabel="新建冲突"
            emptyHint="还没有冲突 · 添加贯穿全篇的主要张力线。"
            onAdd={() =>
              void save({
                ...bp,
                conflicts: [
                  ...bp.conflicts,
                  {
                    id: crypto.randomUUID(),
                    notes: "",
                    sources: [],
                    title: "",
                    description: "",
                  },
                ],
              })
            }
            renderRow={(row) => (
              <ConflictCard
                row={row}
                disabled={disabled}
                books={books}
                chapters={chapters}
                onChange={(patch) =>
                  void save({
                    ...bp,
                    conflicts: bp.conflicts.map((r) =>
                      r.id === row.id ? { ...r, ...patch } : r
                    ),
                  })
                }
                onDelete={() =>
                  void save({
                    ...bp,
                    conflicts: bp.conflicts.filter((r) => r.id !== row.id),
                  })
                }
              />
            )}
          />
        ) : active === "plot_beats" ? (
          <BlueprintCardList
            rows={bp.plot_beats}
            disabled={disabled}
            addLabel="新建节点"
            emptyHint="还没有章节节点 · 添加故事推进的关键转折点。"
            onAdd={() =>
              void save({
                ...bp,
                plot_beats: [
                  ...bp.plot_beats,
                  {
                    id: crypto.randomUUID(),
                    notes: "",
                    sources: [],
                    title: "",
                    description: "",
                    order: bp.plot_beats.length + 1,
                  },
                ],
              })
            }
            renderRow={(row, idx) => (
              <PlotBeatCard
                row={row}
                disabled={disabled}
                books={books}
                chapters={chapters}
                reorder={{
                  canMoveUp: idx > 0,
                  canMoveDown: idx < bp.plot_beats.length - 1,
                  onMoveUp: () => void moveBeat(idx, idx - 1),
                  onMoveDown: () => void moveBeat(idx, idx + 1),
                }}
                onChange={(patch) =>
                  void save({
                    ...bp,
                    plot_beats: bp.plot_beats.map((r) =>
                      r.id === row.id ? { ...r, ...patch } : r
                    ),
                  })
                }
                onDelete={() =>
                  void save({
                    ...bp,
                    plot_beats: renumberBeats(
                      bp.plot_beats.filter((r) => r.id !== row.id)
                    ),
                  })
                }
              />
            )}
          />
        ) : active === "themes" ? (
          <BlueprintCardList
            rows={bp.themes}
            disabled={disabled}
            addLabel="新建主题"
            emptyHint="还没有主题 · 添加贯穿故事的内在母题。"
            onAdd={() =>
              void save({
                ...bp,
                themes: [
                  ...bp.themes,
                  {
                    id: crypto.randomUUID(),
                    notes: "",
                    sources: [],
                    theme: "",
                  },
                ],
              })
            }
            renderRow={(row) => (
              <ThemeCard
                row={row}
                disabled={disabled}
                books={books}
                chapters={chapters}
                onChange={(patch) =>
                  void save({
                    ...bp,
                    themes: bp.themes.map((r) =>
                      r.id === row.id ? { ...r, ...patch } : r
                    ),
                  })
                }
                onDelete={() =>
                  void save({
                    ...bp,
                    themes: bp.themes.filter((r) => r.id !== row.id),
                  })
                }
              />
            )}
          />
        ) : null}
      </div>
      {showGenerate ? (
        <GenerateDrawer
          open={showGenerate}
          onOpenChange={setShowGenerate}
          blueprintId={bpId}
          onGenerated={onVariantGenerated}
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

function renumberBeats<T extends { order: number }>(beats: T[]): T[] {
  return beats.map((b, idx) => ({ ...b, order: idx + 1 }));
}
