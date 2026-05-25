import { Skeleton } from "@/components/ui/skeleton";

export default function WorkbenchLoading() {
  return (
    <div className="app-page space-y-10">
      <div className="space-y-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <div className="flex flex-wrap gap-2 pt-1">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>

      <div className="surface-panel overflow-hidden">
        <ol className="flex flex-col divide-y divide-dashed divide-border/60 lg:flex-row lg:divide-x lg:divide-y-0">
          {Array.from({ length: 4 }).map((_, index) => (
            <li key={index} className="flex-1 px-5 py-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-5 w-7 shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-full max-w-[12rem]" />
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-panel space-y-4 p-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full animate-pulse" />
            ))}
          </div>
        </div>
        <div className="surface-panel space-y-4 p-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
