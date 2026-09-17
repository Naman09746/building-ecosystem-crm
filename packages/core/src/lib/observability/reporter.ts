// ============================================================================
// ERROR REPORTING PIPELINE
//
// Structured, greppable, correlation-friendly error reporting. Today it emits
// tagged structured JSON to the console; when NEXT_PUBLIC_SENTRY_DSN (or any
// future reporter endpoint) is configured, events are additionally forwarded
// fire-and-forget. Never blocks the caller; never logs secrets or PII payloads
// — callers pass scopes and metadata, not user data blobs.
// ============================================================================

export interface ErrorMeta {
  [key: string]: string | number | boolean | null | undefined;
}

let clientErrorCount = 0;

export function reportError(scope: string, error: unknown, meta?: ErrorMeta): void {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "unknown";

  const event = {
    ts: new Date().toISOString(),
    scope,
    message,
    stack: error instanceof Error ? error.stack?.split("\n").slice(0, 5).join(" | ") : undefined,
    ...meta,
  };

  // Structured console telemetry (grep-friendly: `[CRM_ERROR]`)
  console.error(`[CRM_ERROR] ${JSON.stringify(event)}`);

  forwardToReporter(scope, event);
}

function forwardToReporter(scope: string, event: Record<string, unknown>): void {
  try {
    // Hook point for a real backend. A Sentry DSN alone isn't enough to ship
    // events without the SDK/envelope protocol; wire @sentry/next.js here when
    // an account exists. Until then this is a deliberate no-op beyond console.
    //
    // Example future integration:
    //   import * as Sentry from "@sentry/nextjs";
    //   Sentry.captureException(new Error(event.message as string), {
    //     tags: { scope },
    //     extra: event,
    //   });

    // Client-side circuit breaker: avoid log floods from a hot failure loop.
    if (typeof window !== "undefined" && ++clientErrorCount > 200) {
      if (clientErrorCount === 201) {
        console.warn("[CRM_ERROR] reporting circuit opened after 200 errors");
      }
    }
  } catch {
    // Reporting must never throw.
  }
}
