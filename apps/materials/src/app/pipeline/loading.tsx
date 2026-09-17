import { Skeleton } from "@repo/ui/components/skeleton";

export default function PipelineLoading() {
  return (
    <div className="space-y-6 p-6 animate-fade-in h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="space-y-1">
          <Skeleton className="h-7 w-40 rounded-lg" />
          <Skeleton className="h-4 w-56 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* Kanban columns skeleton */}
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 5 }).map((_, colIdx) => (
          <div key={colIdx} className="w-72 shrink-0 rounded-xl border border-border/50 bg-card/30 p-3 space-y-3 flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-border/30">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-7 rounded-full" />
            </div>
            <div className="space-y-2.5 flex-1">
              {Array.from({ length: 3 }).map((_, cardIdx) => (
                <div key={cardIdx} className="p-3 rounded-lg border border-border/40 bg-background/60 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                  <div className="flex items-center justify-between pt-1">
                    <Skeleton className="h-5 w-16 rounded" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
