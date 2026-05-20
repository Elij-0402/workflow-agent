"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export type SectionColumn<T> = {
  key: keyof T;
  label: string;
  width?: string;
  type?: "text" | "number";
};

type Props<T extends { id: string; notes: string }> = {
  rows: T[];
  columns: SectionColumn<T>[];
  onChange: (id: string, patch: Partial<T>) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
};

export function BlueprintSectionTable<T extends { id: string; notes: string }>({
  rows,
  columns,
  onChange,
  onDelete,
  disabled,
}: Props<T>) {
  if (rows.length === 0) {
    return (
      <p className="p-4 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
        {"// empty · 从左右章节卡片勾选候选项加入"}</p>
    );
  }
  return (
    <table className="w-full text-[12.5px]">
      <thead className="border-b border-dashed border-border/70 text-left font-mono text-[10.5px] uppercase tracking-[0.12em] text-primary/80">
        <tr>
          <th className="px-2 py-2 w-[40px]">#</th>
          {columns.map((c) => (
            <th
              key={String(c.key)}
              className="px-2 py-2"
              style={c.width ? { width: c.width } : undefined}
            >
              {c.label}
            </th>
          ))}
          <th className="px-2 py-2">备注</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={row.id} className="border-t border-dashed border-border/40 even:bg-muted/20">
            <td className="px-2 py-2 font-mono text-[10.5px] uppercase tracking-[0.06em] text-primary/75">
              {String(idx + 1).padStart(2, "0")}
            </td>
            {columns.map((c) => {
              const raw = row[c.key] as unknown;
              const value =
                raw == null
                  ? ""
                  : typeof raw === "object"
                    ? JSON.stringify(raw)
                    : String(raw);
              return (
                <td key={String(c.key)} className="px-2 py-1.5">
                  <input
                    className="w-full rounded-[2px] border border-transparent bg-transparent px-1 py-0.5 font-mono text-[12.5px] text-foreground outline-none focus:border-primary/70 focus:bg-background/40"
                    value={value}
                    disabled={disabled}
                    type={c.type === "number" ? "number" : "text"}
                    onChange={(e) =>
                      onChange(row.id, {
                        [c.key]:
                          c.type === "number"
                            ? Number(e.target.value)
                            : e.target.value,
                      } as Partial<T>)
                    }
                  />
                </td>
              );
            })}
            <td className="px-2 py-1.5">
              <input
                className="w-full rounded-[2px] border border-transparent bg-transparent px-1 py-0.5 font-mono text-[12.5px] text-muted-foreground outline-none focus:border-primary/70 focus:bg-background/40 focus:text-foreground"
                value={row.notes}
                disabled={disabled}
                onChange={(e) =>
                  onChange(row.id, { notes: e.target.value } as Partial<T>)
                }
              />
            </td>
            <td className="px-2 py-1.5">
              <Button
                size="sm"
                variant="ghost"
                disabled={disabled}
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(row.id)}
              >
                <Trash2 />
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
