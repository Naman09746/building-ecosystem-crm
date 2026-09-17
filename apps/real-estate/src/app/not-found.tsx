"use client";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card shadow-card p-8 space-y-4 text-center">
        <div className="text-4xl font-serif font-bold text-primary">404</div>
        <h2 className="text-base font-bold text-foreground">Page not found</h2>
        <p className="text-xs text-muted-foreground">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          Back to Cockpit
        </a>
      </div>
    </div>
  );
}
