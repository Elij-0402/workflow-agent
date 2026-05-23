export function CompareEmptyHint({ message }: { message: string }) {
  return (
    <div className="surface-subtle px-4 py-6 text-center font-mono text-[12px] uppercase tracking-[0.08em] text-muted-foreground/70">
      {message}
    </div>
  );
}
