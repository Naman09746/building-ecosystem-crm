import { cn } from "@repo/core/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-secondary/80 border border-border/40",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
