"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Blueprint, BlueprintSource } from "@/lib/blueprint/schema";

export type BookLookup = { id: string; title: string; position: number };
export type ChapterLookup = Map<string, { index: number; title: string }>;

type CharacterRow = Blueprint["characters"][number];
type RelationshipRow = Blueprint["relationships"][number];
type WorldRuleRow = Blueprint["world_rules"][number];
type ConflictRow = Blueprint["conflicts"][number];
type PlotBeatRow = Blueprint["plot_beats"][number];
type ThemeRow = Blueprint["themes"][number];

type WithBaseProps<T> = {
  row: T;
  disabled: boolean;
  books: BookLookup[];
  chapters: ChapterLookup;
  onChange: (patch: Partial<T>) => void;
  onDelete: () => void;
};

function bookLabel(books: BookLookup[], bookId: string): string {
  const b = books.find((x) => x.id === bookId);
  if (!b) return "未知书";
  return b.position === 0 ? "书 A" : "书 B";
}

function chapterLabel(chapters: ChapterLookup, chapterId: string | null): string | null {
  if (!chapterId) return null;
  const ch = chapters.get(chapterId);
  if (!ch) return null;
  return `第 ${ch.index} 章`;
}

function SourceChips({
  sources,
  books,
  chapters,
}: {
  sources: BlueprintSource[];
  books: BookLookup[];
  chapters: ChapterLookup;
}) {
  if (sources.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary/55">
        {"// 来源"}
      </span>
      {sources.map((s, i) => {
        const chLabel = chapterLabel(chapters, s.chapter_id);
        return (
          <span
            key={`${s.book_id}:${s.chapter_id ?? ""}:${i}`}
            className="inline-flex items-center gap-1 rounded-[2px] border border-border bg-background/40 px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground"
          >
            <BookOpen className="h-3 w-3 text-primary/60" aria-hidden />
            {bookLabel(books, s.book_id)}
            {chLabel ? <span className="text-primary/40">·</span> : null}
            {chLabel}
          </span>
        );
      })}
    </div>
  );
}

function NotesField({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(value.trim().length > 0);
  return (
    <div className="mt-2 border-t border-dashed border-border/40 pt-2">
      <button
        type="button"
        className="flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-foreground transition-colors hover:text-primary"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {"// 备注"}
      </button>
      {open ? (
        <textarea
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder="可写额外笔记…"
          className="mt-1.5 w-full resize-y rounded-[2px] border border-border bg-background/40 px-2 py-1.5 text-[13px] leading-6 text-foreground outline-none focus:border-primary/70"
        />
      ) : null}
    </div>
  );
}

type CardShellProps = {
  disabled: boolean;
  /** Top-row content: title input + secondary input(s) */
  header: React.ReactNode;
  /** Main body content (usually a textarea + extras) */
  body?: React.ReactNode;
  /** Extra meta row before sources (e.g. plot beat order, themes hints) */
  meta?: React.ReactNode;
  notes: string;
  sources: BlueprintSource[];
  books: BookLookup[];
  chapters: ChapterLookup;
  onNotesChange: (v: string) => void;
  onDelete: () => void;
  /** Optional reorder controls — only used by plot beats */
  reorder?: {
    canMoveUp: boolean;
    canMoveDown: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
  };
};

function CardShell({
  disabled,
  header,
  body,
  meta,
  notes,
  sources,
  books,
  chapters,
  onNotesChange,
  onDelete,
  reorder,
}: CardShellProps) {
  return (
    <div className="surface-subtle p-3.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-2">{header}</div>
        <div className="flex shrink-0 items-center gap-0.5">
          {reorder ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                disabled={disabled || !reorder.canMoveUp}
                onClick={reorder.onMoveUp}
                aria-label="上移"
                className="h-7 w-7 p-0"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={disabled || !reorder.canMoveDown}
                onClick={reorder.onMoveDown}
                aria-label="下移"
                className="h-7 w-7 p-0"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={onDelete}
            aria-label="删除"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {body ? <div className="mt-2">{body}</div> : null}
      {meta}
      <SourceChips sources={sources} books={books} chapters={chapters} />
      <NotesField value={notes} disabled={disabled} onChange={onNotesChange} />
    </div>
  );
}

function TitleInput({
  value,
  disabled,
  placeholder,
  onChange,
}: {
  value: string;
  disabled: boolean;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-[2px] border border-transparent bg-transparent px-1 py-0.5 font-display text-[18px] italic leading-tight text-foreground outline-none focus:border-primary/60 focus:bg-background/40"
    />
  );
}

function SubInput({
  value,
  disabled,
  placeholder,
  onChange,
}: {
  value: string;
  disabled: boolean;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-[2px] border border-border bg-background/30 px-2 py-1 text-[13px] text-foreground outline-none focus:border-primary/70 focus:bg-background/40"
    />
  );
}

function DescriptionTextarea({
  value,
  disabled,
  placeholder,
  onChange,
  rows = 3,
}: {
  value: string;
  disabled: boolean;
  placeholder: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className="w-full resize-y rounded-[2px] border border-border bg-background/30 px-2 py-1.5 text-[13.5px] leading-7 text-foreground outline-none focus:border-primary/70 focus:bg-background/40"
    />
  );
}

function TraitChips({
  traits,
  disabled,
  onChange,
}: {
  traits: string[];
  disabled: boolean;
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (traits.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...traits, v]);
    setDraft("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary/55">
        {"// 特征"}
      </span>
      {traits.map((t) => (
        <span
          key={t}
          className="bg-primary/8 inline-flex items-center gap-1 rounded-[2px] border border-primary/30 px-1.5 py-0.5 text-[12px] text-primary"
        >
          {t}
          {!disabled ? (
            <button
              type="button"
              onClick={() => onChange(traits.filter((x) => x !== t))}
              className="-mr-0.5 text-primary/70 hover:text-primary"
              aria-label={`移除 ${t}`}
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </span>
      ))}
      {!disabled ? (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
          placeholder="+ 添加"
          className="w-20 rounded-[2px] border border-transparent bg-transparent px-1 py-0.5 text-[12px] text-foreground outline-none focus:border-primary/50 focus:bg-background/40"
        />
      ) : null}
    </div>
  );
}

// ---- Per-section cards ----

export function CharacterCard(props: WithBaseProps<CharacterRow>) {
  const { row, disabled, onChange } = props;
  return (
    <CardShell
      disabled={disabled}
      header={
        <>
          <TitleInput
            value={row.name}
            disabled={disabled}
            placeholder="角色名"
            onChange={(name) => onChange({ name } as Partial<CharacterRow>)}
          />
          <SubInput
            value={row.role}
            disabled={disabled}
            placeholder="角色定位（如：女主 / 反派）"
            onChange={(role) => onChange({ role } as Partial<CharacterRow>)}
          />
          <TraitChips
            traits={row.traits}
            disabled={disabled}
            onChange={(traits) => onChange({ traits } as Partial<CharacterRow>)}
          />
        </>
      }
      body={
        <DescriptionTextarea
          value={row.description}
          disabled={disabled}
          placeholder="角色背景与设定…"
          onChange={(description) => onChange({ description } as Partial<CharacterRow>)}
        />
      }
      notes={row.notes}
      sources={row.sources}
      books={props.books}
      chapters={props.chapters}
      onNotesChange={(notes) => onChange({ notes } as Partial<CharacterRow>)}
      onDelete={props.onDelete}
    />
  );
}

export function RelationshipCard(props: WithBaseProps<RelationshipRow>) {
  const { row, disabled, onChange } = props;
  return (
    <CardShell
      disabled={disabled}
      header={
        <>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <input
              value={row.from}
              disabled={disabled}
              placeholder="角色 A"
              onChange={(e) => onChange({ from: e.target.value } as Partial<RelationshipRow>)}
              className="w-full rounded-[2px] border border-border bg-background/30 px-2 py-1 font-display text-[16px] italic text-foreground outline-none focus:border-primary/70 focus:bg-background/40"
            />
            <span className="text-primary/70">↔</span>
            <input
              value={row.to}
              disabled={disabled}
              placeholder="角色 B"
              onChange={(e) => onChange({ to: e.target.value } as Partial<RelationshipRow>)}
              className="w-full rounded-[2px] border border-border bg-background/30 px-2 py-1 font-display text-[16px] italic text-foreground outline-none focus:border-primary/70 focus:bg-background/40"
            />
          </div>
          <SubInput
            value={row.type}
            disabled={disabled}
            placeholder="关系类型（如：师徒 / 宿敌）"
            onChange={(type) => onChange({ type } as Partial<RelationshipRow>)}
          />
        </>
      }
      body={
        <DescriptionTextarea
          value={row.description}
          disabled={disabled}
          placeholder="关系的来龙去脉、张力来源…"
          onChange={(description) => onChange({ description } as Partial<RelationshipRow>)}
        />
      }
      notes={row.notes}
      sources={row.sources}
      books={props.books}
      chapters={props.chapters}
      onNotesChange={(notes) => onChange({ notes } as Partial<RelationshipRow>)}
      onDelete={props.onDelete}
    />
  );
}

export function WorldRuleCard(props: WithBaseProps<WorldRuleRow>) {
  const { row, disabled, onChange } = props;
  return (
    <CardShell
      disabled={disabled}
      header={
        <TitleInput
          value={row.rule}
          disabled={disabled}
          placeholder="规则一句话概括"
          onChange={(rule) => onChange({ rule } as Partial<WorldRuleRow>)}
        />
      }
      body={
        <DescriptionTextarea
          value={row.description}
          disabled={disabled}
          placeholder="规则细节、边界与代价…"
          onChange={(description) => onChange({ description } as Partial<WorldRuleRow>)}
        />
      }
      notes={row.notes}
      sources={row.sources}
      books={props.books}
      chapters={props.chapters}
      onNotesChange={(notes) => onChange({ notes } as Partial<WorldRuleRow>)}
      onDelete={props.onDelete}
    />
  );
}

export function ConflictCard(props: WithBaseProps<ConflictRow>) {
  const { row, disabled, onChange } = props;
  return (
    <CardShell
      disabled={disabled}
      header={
        <TitleInput
          value={row.title}
          disabled={disabled}
          placeholder="冲突标题"
          onChange={(title) => onChange({ title } as Partial<ConflictRow>)}
        />
      }
      body={
        <DescriptionTextarea
          value={row.description}
          disabled={disabled}
          placeholder="冲突双方、张力、转折点…"
          onChange={(description) => onChange({ description } as Partial<ConflictRow>)}
        />
      }
      notes={row.notes}
      sources={row.sources}
      books={props.books}
      chapters={props.chapters}
      onNotesChange={(notes) => onChange({ notes } as Partial<ConflictRow>)}
      onDelete={props.onDelete}
    />
  );
}

type PlotBeatCardProps = WithBaseProps<PlotBeatRow> & {
  reorder: {
    canMoveUp: boolean;
    canMoveDown: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
  };
};

export function PlotBeatCard(props: PlotBeatCardProps) {
  const { row, disabled, onChange } = props;
  return (
    <CardShell
      disabled={disabled}
      header={
        <>
          <div className="flex items-center gap-2">
            <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.10em] text-primary/80">
              #{String(row.order).padStart(2, "0")}
            </span>
            <TitleInput
              value={row.title}
              disabled={disabled}
              placeholder="节点标题"
              onChange={(title) => onChange({ title } as Partial<PlotBeatRow>)}
            />
          </div>
        </>
      }
      body={
        <DescriptionTextarea
          value={row.description}
          disabled={disabled}
          placeholder="这一节点的事件、推进与意义…"
          onChange={(description) => onChange({ description } as Partial<PlotBeatRow>)}
        />
      }
      notes={row.notes}
      sources={row.sources}
      books={props.books}
      chapters={props.chapters}
      onNotesChange={(notes) => onChange({ notes } as Partial<PlotBeatRow>)}
      onDelete={props.onDelete}
      reorder={props.reorder}
    />
  );
}

export function ThemeCard(props: WithBaseProps<ThemeRow>) {
  const { row, disabled, onChange } = props;
  return (
    <CardShell
      disabled={disabled}
      header={
        <TitleInput
          value={row.theme}
          disabled={disabled}
          placeholder="主题"
          onChange={(theme) => onChange({ theme } as Partial<ThemeRow>)}
        />
      }
      notes={row.notes}
      sources={row.sources}
      books={props.books}
      chapters={props.chapters}
      onNotesChange={(notes) => onChange({ notes } as Partial<ThemeRow>)}
      onDelete={props.onDelete}
    />
  );
}

// ---- List wrapper ----

type ListProps<T extends { id: string }> = {
  rows: T[];
  disabled: boolean;
  addLabel: string;
  emptyHint: string;
  onAdd: () => void;
  renderRow: (row: T, index: number) => React.ReactNode;
};

export function BlueprintCardList<T extends { id: string }>({
  rows,
  disabled,
  addLabel,
  emptyHint,
  onAdd,
  renderRow,
}: ListProps<T>) {
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-primary/75">
          {`// ${rows.length} 项`}
        </span>
        <Button size="sm" variant="outline" disabled={disabled} onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
          {addLabel}
        </Button>
      </div>
      {rows.length === 0 ? (
        <p
          className={cn(
            "rounded-[2px] border border-dashed border-border/60 bg-background/30 px-4 py-6 text-center text-[13px] leading-7 text-muted-foreground",
          )}
        >
          {emptyHint}
        </p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((row, idx) => (
            <div key={row.id}>{renderRow(row, idx)}</div>
          ))}
        </div>
      )}
    </div>
  );
}
