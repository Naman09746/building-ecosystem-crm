"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { reportError } from "@repo/core/lib/observability/reporter";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError("ui.error-boundary", error, { digest: error.digest });
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card shadow-card p-6 space-y-4 text-center">
        <div className="mx-auto h-12 w-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        <h2 className="text-base font-bold text-foreground">Something went wrong</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The workspace hit an unexpected error. Your data is safe — retrying usually resolves this.
          {error.digest && (
            <span className="block mt-1 font-mono text-[10px] opacity-60">Ref: {error.digest}</span>
          )}
        </p>
        <Button onClick={reset} className="gap-2 mx-auto">
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </Button>
      </div>
    </div>
  );
}
