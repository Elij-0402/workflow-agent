"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { detectBriefConflicts } from "@/lib/prompts/brief-compose";
import {
  CreativeBriefSchema,
  type CreativeBrief,
  type PersonaDirective,
  type PlotDirective,
  type RetentionRule,
  type StyleDirective,
} from "@/lib/types/creative-brief";

type Mode = { kind: "create"; sessionId: string } | { kind: "edit"; briefId: string };

type Props = {
  mode: Mode;
  initial?: CreativeBrief;
};

function emptyPersona(): PersonaDirective {
  return {
    id: crypto.randomUUID(),
    character_name: "",
    change_type: "modify",
    fields: {},
  };
}

function emptyPlot(): PlotDirective {
  return {
    id: crypto.randomUUID(),
    action: "insert_after",
    new_beat: {},
  };
}

function emptyRetention(): RetentionRule {
  return {
    id: crypto.randomUUID(),
    section: "plot_beats",
    target_ids: [],
    strictness: "must_keep",
  };
}

function defaultStyle(): StyleDirective {
  return {
    tone: "keep",
    rhythm: "keep",
    dialogue_ratio: "keep",
    sensory_density: "keep",
    prose_register: "keep",
    extra_instructions: "",
  };
}

function defaultBrief(): CreativeBrief {
  return {
    title: "未命名简报",
    persona_directives: [],
    plot_directives: [],
    style_directives: defaultStyle(),
    retention_rules: [],
  };
}

export function BriefEditor({ mode, initial }: Props) {
  const router = useRouter();
  const [brief, setBrief] = useState<CreativeBrief>(initial ?? defaultBrief());
  const [pending, startTransition] = useTransition();

  const conflicts = useMemo(() => detectBriefConflicts(brief), [brief]);
  const lastConflictToastRef = useRef("");

  useEffect(() => {
    if (conflicts.length === 0) {
      lastConflictToastRef.current = "";
      return;
    }
    const signature = conflicts.join("\n");
    if (signature === lastConflictToastRef.current) return;
    lastConflictToastRef.current = signature;
    toast.warning(`简报中存在冲突指令：\n${signature}`, { duration: 6000 });
  }, [conflicts]);

  const handleSave = () => {
    const parsed = CreativeBriefSchema.safeParse(brief);
    if (!parsed.success) {
      toast.error("简报格式有误，请检查标题、人物名等必填项。");
      return;
    }
    startTransition(async () => {
      const isCreate = mode.kind === "create";
      const url = isCreate ? "/api/briefs" : `/api/briefs/${mode.briefId}`;
      const method = isCreate ? "POST" : "PATCH";
      const body = isCreate
        ? { sessionId: mode.sessionId, brief: parsed.data }
        : { brief: parsed.data };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "保存失败。");
        return;
      }
      toast.success("已保存。");
      if (isCreate && json.id) {
        router.push(`/studio/${json.id}`);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="surface-panel space-y-4 p-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="brief-title">简报标题</Label>
          <Input
            id="brief-title"
            value={brief.title}
            onChange={(e) => setBrief((b) => ({ ...b, title: e.target.value }))}
            maxLength={100}
            placeholder="例：女主版 / 古风版 / 节奏紧凑版"
          />
        </div>
      </div>

      <Tabs defaultValue="persona" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="persona">人设 ({brief.persona_directives.length})</TabsTrigger>
          <TabsTrigger value="plot">情节 ({brief.plot_directives.length})</TabsTrigger>
          <TabsTrigger value="style">文风</TabsTrigger>
          <TabsTrigger value="retention">保留 ({brief.retention_rules.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="persona">
          <PersonaTab
            value={brief.persona_directives}
            onChange={(next) => setBrief((b) => ({ ...b, persona_directives: next }))}
          />
        </TabsContent>

        <TabsContent value="plot">
          <PlotTab
            value={brief.plot_directives}
            onChange={(next) => setBrief((b) => ({ ...b, plot_directives: next }))}
          />
        </TabsContent>

        <TabsContent value="style">
          <StyleTab
            value={brief.style_directives}
            onChange={(next) => setBrief((b) => ({ ...b, style_directives: next }))}
          />
        </TabsContent>

        <TabsContent value="retention">
          <RetentionTab
            value={brief.retention_rules}
            onChange={(next) => setBrief((b) => ({ ...b, retention_rules: next }))}
          />
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-end gap-2 border-t border-dashed border-border/60 pt-4">
        {conflicts.length > 0 ? (
          <span className="font-mono text-[11px] text-destructive">
            {conflicts.length} 条冲突待处理
          </span>
        ) : null}
        <Button onClick={handleSave} disabled={pending}>
          <Save />
          {pending ? "保存中…" : mode.kind === "create" ? "创建简报" : "保存修改"}
        </Button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Persona Tab
// ----------------------------------------------------------------------------
function PersonaTab({
  value,
  onChange,
}: {
  value: PersonaDirective[];
  onChange: (next: PersonaDirective[]) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-6 text-muted-foreground">
        改造现有角色或加入新角色。可选「修改 / 替换 / 新增 / 删除」。
      </p>
      {value.map((d, idx) => (
        <div key={d.id} className="surface-panel space-y-3 p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-primary/85">
              {`// persona ${String(idx + 1).padStart(2, "0")}`}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(value.filter((x) => x.id !== d.id))}
            >
              <Trash2 />
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>角色名</Label>
              <Input
                value={d.character_name}
                onChange={(e) =>
                  onChange(
                    value.map((x) =>
                      x.id === d.id ? { ...x, character_name: e.target.value } : x,
                    ),
                  )
                }
              />
            </div>
            <div>
              <Label>操作</Label>
              <Select
                value={d.change_type}
                onValueChange={(v) =>
                  onChange(
                    value.map((x) =>
                      x.id === d.id ? { ...x, change_type: v as typeof d.change_type } : x,
                    ),
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="modify">修改属性</SelectItem>
                  <SelectItem value="replace">整体替换</SelectItem>
                  <SelectItem value="add">新增角色</SelectItem>
                  <SelectItem value="remove">移除角色</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <FieldInput
              label="性别"
              value={d.fields.gender ?? ""}
              onChange={(v) =>
                onChange(
                  value.map((x) =>
                    x.id === d.id ? { ...x, fields: { ...x.fields, gender: v } } : x,
                  ),
                )
              }
            />
            <FieldInput
              label="年龄"
              value={d.fields.age ?? ""}
              onChange={(v) =>
                onChange(
                  value.map((x) => (x.id === d.id ? { ...x, fields: { ...x.fields, age: v } } : x)),
                )
              }
            />
            <FieldInput
              label="性格"
              value={d.fields.personality ?? ""}
              onChange={(v) =>
                onChange(
                  value.map((x) =>
                    x.id === d.id ? { ...x, fields: { ...x.fields, personality: v } } : x,
                  ),
                )
              }
            />
            <FieldInput
              label="动机"
              value={d.fields.motivation ?? ""}
              onChange={(v) =>
                onChange(
                  value.map((x) =>
                    x.id === d.id ? { ...x, fields: { ...x.fields, motivation: v } } : x,
                  ),
                )
              }
            />
            <div className="md:col-span-2">
              <Label>背景 / 补充</Label>
              <Textarea
                value={d.fields.background ?? ""}
                onChange={(e) =>
                  onChange(
                    value.map((x) =>
                      x.id === d.id
                        ? { ...x, fields: { ...x.fields, background: e.target.value } }
                        : x,
                    ),
                  )
                }
                rows={2}
              />
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => onChange([...value, emptyPersona()])}>
        <Plus />
        新增人设指令
      </Button>
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// ----------------------------------------------------------------------------
// Plot Tab
// ----------------------------------------------------------------------------
function PlotTab({
  value,
  onChange,
}: {
  value: PlotDirective[];
  onChange: (next: PlotDirective[]) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-6 text-muted-foreground">
        引用蓝图 plot_beat 的 id（如 <code className="font-mono text-primary">beat-3</code>
        ），或留空插入新节点。
      </p>
      {value.map((d, idx) => (
        <div key={d.id} className="surface-panel space-y-3 p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-primary/85">
              {`// plot ${String(idx + 1).padStart(2, "0")}`}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(value.filter((x) => x.id !== d.id))}
            >
              <Trash2 />
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>操作</Label>
              <Select
                value={d.action}
                onValueChange={(v) =>
                  onChange(
                    value.map((x) => (x.id === d.id ? { ...x, action: v as typeof d.action } : x)),
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">保留</SelectItem>
                  <SelectItem value="replace">替换</SelectItem>
                  <SelectItem value="delete">删除</SelectItem>
                  <SelectItem value="insert_before">在此前插入</SelectItem>
                  <SelectItem value="insert_after">在此后插入</SelectItem>
                  <SelectItem value="reorder">重排</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>目标节点 id（可选）</Label>
              <Input
                value={d.target_beat_id ?? ""}
                onChange={(e) =>
                  onChange(
                    value.map((x) =>
                      x.id === d.id ? { ...x, target_beat_id: e.target.value || undefined } : x,
                    ),
                  )
                }
                placeholder="如 beat-3"
              />
            </div>
            <div className="md:col-span-2">
              <Label>新节点标题</Label>
              <Input
                value={d.new_beat?.title ?? ""}
                onChange={(e) =>
                  onChange(
                    value.map((x) =>
                      x.id === d.id
                        ? { ...x, new_beat: { ...x.new_beat, title: e.target.value } }
                        : x,
                    ),
                  )
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label>新节点描述</Label>
              <Textarea
                value={d.new_beat?.description ?? ""}
                onChange={(e) =>
                  onChange(
                    value.map((x) =>
                      x.id === d.id
                        ? { ...x, new_beat: { ...x.new_beat, description: e.target.value } }
                        : x,
                    ),
                  )
                }
                rows={2}
              />
            </div>
            <div className="md:col-span-2">
              <Label>备注</Label>
              <Input
                value={d.note ?? ""}
                onChange={(e) =>
                  onChange(value.map((x) => (x.id === d.id ? { ...x, note: e.target.value } : x)))
                }
              />
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => onChange([...value, emptyPlot()])}>
        <Plus />
        新增情节指令
      </Button>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Style Tab
// ----------------------------------------------------------------------------
function StyleTab({
  value,
  onChange,
}: {
  value: StyleDirective;
  onChange: (next: StyleDirective) => void;
}) {
  return (
    <div className="surface-panel space-y-4 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <SelectField
          label="语调"
          value={value.tone}
          onChange={(v) => onChange({ ...value, tone: v as StyleDirective["tone"] })}
          options={[
            { value: "keep", label: "保留原作" },
            { value: "lyrical", label: "抒情" },
            { value: "plain", label: "平实" },
            { value: "humorous", label: "幽默" },
            { value: "ironic", label: "冷讽" },
            { value: "noir", label: "黑色" },
            { value: "classical", label: "古典" },
          ]}
        />
        <SelectField
          label="节奏"
          value={value.rhythm}
          onChange={(v) => onChange({ ...value, rhythm: v as StyleDirective["rhythm"] })}
          options={[
            { value: "keep", label: "保留" },
            { value: "slow", label: "慢" },
            { value: "moderate", label: "中" },
            { value: "fast", label: "快" },
          ]}
        />
        <SelectField
          label="对话比例"
          value={value.dialogue_ratio}
          onChange={(v) =>
            onChange({ ...value, dialogue_ratio: v as StyleDirective["dialogue_ratio"] })
          }
          options={[
            { value: "keep", label: "保留" },
            { value: "more_dialogue", label: "多对话" },
            { value: "less_dialogue", label: "少对话" },
          ]}
        />
        <SelectField
          label="感官密度"
          value={value.sensory_density}
          onChange={(v) =>
            onChange({ ...value, sensory_density: v as StyleDirective["sensory_density"] })
          }
          options={[
            { value: "keep", label: "保留" },
            { value: "sparse", label: "稀疏" },
            { value: "rich", label: "密集" },
          ]}
        />
        <SelectField
          label="文体"
          value={value.prose_register}
          onChange={(v) =>
            onChange({ ...value, prose_register: v as StyleDirective["prose_register"] })
          }
          options={[
            { value: "keep", label: "保留" },
            { value: "modern", label: "现代汉语" },
            { value: "web_novel", label: "网文" },
            { value: "literary", label: "文学" },
            { value: "classical_chinese", label: "文言" },
          ]}
        />
      </div>
      <div>
        <Label>补充自由指令（≤800 字）</Label>
        <Textarea
          value={value.extra_instructions}
          onChange={(e) => onChange({ ...value, extra_instructions: e.target.value.slice(0, 800) })}
          rows={4}
          placeholder="例如：第三人称受限视角，多用比喻，避免直接心理描写"
        />
        <p className="mt-1 text-right font-mono text-[10px] text-muted-foreground/70">
          {value.extra_instructions.length} / 800
        </p>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Retention Tab
// ----------------------------------------------------------------------------
function RetentionTab({
  value,
  onChange,
}: {
  value: RetentionRule[];
  onChange: (next: RetentionRule[]) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-6 text-muted-foreground">
        标记哪些蓝图节点必须保留 / 尽量保留 / 可调整。目标 id 留空表示该段整体。
      </p>
      {value.map((r, idx) => (
        <div key={r.id} className="surface-panel space-y-3 p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-primary/85">
              {`// retention ${String(idx + 1).padStart(2, "0")}`}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(value.filter((x) => x.id !== r.id))}
            >
              <Trash2 />
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <SelectField
              label="段"
              value={r.section}
              onChange={(v) =>
                onChange(
                  value.map((x) =>
                    x.id === r.id ? { ...x, section: v as RetentionRule["section"] } : x,
                  ),
                )
              }
              options={[
                { value: "characters", label: "人物" },
                { value: "relationships", label: "关系" },
                { value: "world_rules", label: "世界规则" },
                { value: "conflicts", label: "冲突" },
                { value: "plot_beats", label: "情节节点" },
                { value: "themes", label: "主题" },
              ]}
            />
            <SelectField
              label="严格度"
              value={r.strictness}
              onChange={(v) =>
                onChange(
                  value.map((x) =>
                    x.id === r.id ? { ...x, strictness: v as RetentionRule["strictness"] } : x,
                  ),
                )
              }
              options={[
                { value: "must_keep", label: "必须保留" },
                { value: "prefer_keep", label: "尽量保留" },
                { value: "flexible", label: "可调整" },
              ]}
            />
            <div>
              <Label>目标 id（逗号分隔）</Label>
              <Input
                value={r.target_ids.join(",")}
                onChange={(e) =>
                  onChange(
                    value.map((x) =>
                      x.id === r.id
                        ? {
                            ...x,
                            target_ids: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          }
                        : x,
                    ),
                  )
                }
                placeholder="留空 = 整段"
              />
            </div>
            <div className="md:col-span-3">
              <Label>备注</Label>
              <Input
                value={r.note ?? ""}
                onChange={(e) =>
                  onChange(value.map((x) => (x.id === r.id ? { ...x, note: e.target.value } : x)))
                }
              />
            </div>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange([...value, emptyRetention()])}
      >
        <Plus />
        新增保留规则
      </Button>
    </div>
  );
}
