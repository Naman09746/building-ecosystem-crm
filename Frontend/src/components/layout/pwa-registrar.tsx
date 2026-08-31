"use client";

import * as React from "react";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { flushRetries, pendingRetryCount } from "@/lib/persistence/retry-queue";
import { toast } from "sonner";

export function PWARegistrar() {
  const [isOnline, setIsOnline] = React.useState(true);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [isSyncing, setIsSyncing] = React.useState(false);

  React.useEffect(() => {
    // Check initial online status
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      setPendingCount(pendingRetryCount());

      // Register Service Worker in production or supporting environments
      if ("serviceWorker" in navigator && process.env.NODE_ENV !== "test") {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("[PWA] Service Worker registered with scope:", registration.scope);
          })
          .catch((error) => {
            console.warn("[PWA] Service Worker registration failed:", error);
          });
      }

      const handleOnline = async () => {
        setIsOnline(true);
        toast.success("Network connection restored. Syncing pending data...");
        setIsSyncing(true);
        try {
          const flushed = await flushRetries();
          if (flushed > 0) {
            toast.success(`Successfully synced ${flushed} offline changes to server`);
          }
        } finally {
          setIsSyncing(false);
          setPendingCount(pendingRetryCount());
        }
      };

      const handleOffline = () => {
        setIsOnline(false);
        setPendingCount(pendingRetryCount());
        toast.warning("Working in Offline Mode. Actions are securely queued locally.");
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      const interval = setInterval(() => {
        setPendingCount(pendingRetryCount());
      }, 5000);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        clearInterval(interval);
      };
    }
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const flushed = await flushRetries();
      toast.success(`Synced ${flushed} items`);
    } catch {
      toast.error("Sync failed. Will retry automatically.");
    } finally {
      setIsSyncing(false);
      setPendingCount(pendingRetryCount());
    }
  };

  if (isOnline && pendingCount === 0) return null;

  return (
    <aside
      aria-label="Network status banner"
      className="fixed bottom-16 sm:bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-auto"
    >
      <div
        className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium border shadow-2xl backdrop-blur-md ${
          !isOnline
            ? "bg-amber-950/90 border-amber-500/40 text-amber-200"
            : "bg-slate-900/90 border-slate-700 text-slate-200"
        }`}
      >
        {!isOnline ? (
          <>
            <WifiOff className="h-4 w-4 text-amber-400 shrink-0 animate-pulse" />
            <span>
              <strong>Offline Mode:</strong> Working locally
              {pendingCount > 0 && ` (${pendingCount} writes queued)`}
            </span>
          </>
        ) : (
          <>
            <Wifi className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              {isSyncing ? "Syncing data to server..." : `${pendingCount} queued writes pending`}
            </span>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="ml-1 p-1 hover:bg-slate-800 rounded transition-colors"
              title="Sync now"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-amber-300 ${isSyncing ? "animate-spin" : ""}`} />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
