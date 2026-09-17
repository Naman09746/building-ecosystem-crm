import { Skeleton } from "@repo/ui/components/skeleton";

export default function RootLoading() {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden animate-fade-in">
      {/* Sidebar Skeleton */}
      <div className="w-64 border-r border-border/40 p-4 space-y-4 hidden md:flex flex-col bg-card/30">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="space-y-2 pt-6 flex-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
        <div className="pt-4 border-t border-border/40 flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1 flex-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-2 w-12" />
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border/40 px-6 flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </header>
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-xl" />
        </main>
      </div>
    </div>
  );
}
