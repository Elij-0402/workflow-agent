import type { VariantRow } from "@/lib/types";
import { VariantCard } from "./variant-card";

type VariantListProps = {
  variants: Array<
    Pick<VariantRow, "id" | "title" | "config" | "content" | "word_count" | "created_at">
  >;
};

export function VariantList({ variants }: VariantListProps) {
  if (variants.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-[20px] font-medium tracking-tight text-foreground">
          已生成结果
        </h2>
        <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
          按时间倒序展示。打开即可阅读全文。
        </p>
      </div>

      <div className="space-y-4">
        {variants.map((variant) => (
          <VariantCard key={variant.id} variant={variant} />
        ))}
      </div>
    </section>
  );
}
