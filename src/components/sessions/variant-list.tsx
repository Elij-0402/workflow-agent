import type { SessionStatus, VariantRow } from "@/lib/types";
import { VariantCard } from "./variant-card";

type VariantListProps = {
  sessionStatus: SessionStatus;
  variants: Array<
    Pick<VariantRow, "id" | "title" | "config" | "content" | "word_count" | "created_at">
  >;
};

export function VariantList({ sessionStatus, variants }: VariantListProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-[18px] font-medium text-foreground">已生成变体</h2>
        <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
          生成结果按时间倒序展示，可直接展开查看完整正文。
        </p>
      </div>

      {variants.length > 0 ? (
        <div className="space-y-4">
          {variants.map((variant) => (
            <VariantCard key={variant.id} variant={variant} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border/70 px-5 py-10">
          <div className="max-w-lg space-y-2">
            <h3 className="text-[15px] font-medium text-foreground">还没有生成记录</h3>
            <p className="text-[13px] leading-6 text-muted-foreground">
              {sessionStatus === "analyzed" || sessionStatus === "done"
                ? "生成后的新变体会出现在这里。"
                : "请先完成三维度分析，再开始生成变体。"}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
