import { Skeleton, SkeletonCard, SkeletonList } from "@/components/ui/skeleton";

export function PageLoadingShell({
  titleWidth = "w-48",
  cards = 3,
}: {
  titleWidth?: string;
  cards?: number;
}) {
  return (
    <div className="app-page space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className={`h-8 ${titleWidth}`} />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: cards }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
      <SkeletonList rows={4} />
    </div>
  );
}
