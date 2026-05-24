import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function InvalidResultNotice() {
  return (
    <p className="rounded-[3px] border border-destructive/40 bg-destructive/8 px-3 py-3 text-[12px] text-destructive">
      当前结果结构异常，请重新运行这一项分析。
    </p>
  );
}

export function DetailBlock({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="data-label">{label}</p>
      <p className="mt-2 rounded-[3px] border border-border bg-background/40 px-3 py-2 text-foreground">
        {value}
      </p>
    </div>
  );
}

export function SectionTitle({ title, token }: { title: string; token?: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <h4 className="font-display text-[16px] italic text-foreground">{title}</h4>
      {token ? (
        <span className="text-[11px] text-primary/75">
          {token}
        </span>
      ) : null}
    </div>
  );
}

export function EmptyText({ text }: { text: string }) {
  return <p className="text-[13px] text-muted-foreground">{text}</p>;
}

export function OverflowTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-[3px] border border-border bg-background/30">
      <Table className="text-[13px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {headers.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={`${row[0]}-${index}`}>
              {row.map((cell, cellIndex) => (
                <TableCell key={`${row[0]}-${cellIndex}`} className="align-top text-foreground">
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export { Separator };
