"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { RateBoard } from "@/components/verticals/materials/rate-board";
import { TrendingUp, RefreshCw } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { toast } from "sonner";

export default function RatesPage() {
  return (
    <AppShell initialTab="rates">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              <TrendingUp className="h-4 w-4" />
              <span>Commercial Pricing & Daily Board</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
              Daily Wholesale Rate Board
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Set today&apos;s wholesale price tiers for cement, steel, bricks, and broadcast directly to contractors.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="text-xs h-9 gap-1.5"
            onClick={() => toast.success("Rates refreshed from mill/distributor feeds")}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sync Mill Feeds</span>
          </Button>
        </div>

        <RateBoard />
      </div>
    </AppShell>
  );
}
