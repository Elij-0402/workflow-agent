import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[2px] bg-muted/60",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-brass-shimmer before:bg-gradient-to-r before:from-transparent before:via-primary/15 before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
