import * as React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@repo/core/lib/utils";
import { Button } from "./button";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export function ErrorState({
  title = "Unable to load data",
  description = "A connection or server error occurred. Please try again.",
  onRetry,
  isRetrying = false,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-destructive/20 bg-destructive-subtle/50",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive mb-4 border border-destructive/20">
        <AlertCircle className="h-6 w-6 stroke-[1.75]" />
      </div>
      <h3 className="text-base font-semibold text-foreground tracking-tight mb-1">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          isLoading={isRetrying}
          className="border-destructive/30 hover:bg-destructive/10"
        >
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Try Again
        </Button>
      )}
    </div>
  );
}
