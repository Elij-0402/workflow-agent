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
      <p className="p-3 text-[12px] text-muted-foreground">
        还没有条目。从左右章节卡片勾选候选项加入。
      </p>
    );
  }
  return (
    <table className="w-full text-[12.5px]">
      <thead className="text-left text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
        <tr>
          {columns.map((c) => (
            <th
              key={String(c.key)}
              className="px-2 py-1"
              style={c.width ? { width: c.width } : undefined}
            >
              {c.label}
            </th>
          ))}
          <th className="px-2 py-1">备注</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-border/40">
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
                    className="w-full bg-transparent text-foreground outline-none"
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
                className="w-full bg-transparent text-muted-foreground outline-none"
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
