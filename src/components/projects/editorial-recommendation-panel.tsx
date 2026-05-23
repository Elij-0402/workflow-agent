export function EditorialRecommendationPanel({
  bullets,
}: {
  bullets: string[];
}) {
  return (
    <section className="surface-panel p-6">
      <div className="flex flex-col gap-4">
        <div>
          <p className="eyebrow-label">editorial recommendation</p>
          <h2 className="mt-2 text-[20px] font-semibold leading-tight text-foreground">
            当前建议
          </h2>
        </div>

        <ol className="space-y-4">
          {bullets.map((bullet, index) => (
            <li key={bullet} className="flex gap-4 border-t border-border/60 pt-4 first:border-t-0 first:pt-0">
              <span className="mt-0.5 font-mono text-[11px] tracking-[0.08em] text-primary">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="text-[14px] leading-7 text-muted-foreground">{bullet}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
