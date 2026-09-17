"use client";

import * as React from "react";
import { cn, formatCurrencyINR } from "@repo/core/lib/utils";
import { ArrowRight, ChevronRight, TrendingDown } from "lucide-react";

interface FunnelStage {
  name: string;
  count: number;
  value: number;
  conversionPct: number;
  color: string;
  dropOffPct?: number;
}

const DEFAULT_FUNNEL: FunnelStage[] = [
  { name: "Total Inflow", count: 248, value: 1650000000, conversionPct: 100, color: "bg-slate-800" },
  { name: "Contacted & Engaged", count: 184, value: 1220000000, conversionPct: 74.2, color: "bg-blue-600", dropOffPct: 25.8 },
  { name: "Qualified Budget", count: 96, value: 680000000, conversionPct: 38.7, color: "bg-indigo-600", dropOffPct: 47.8 },
  { name: "Site Visits Done", count: 34, value: 248000000, conversionPct: 13.7, color: "bg-amber-600", dropOffPct: 64.5 },
  { name: "Deals Won", count: 18, value: 132000000, conversionPct: 7.2, color: "bg-emerald-600", dropOffPct: 47.0 },
];

export function ConversionFunnel({
  stages = DEFAULT_FUNNEL,
  overallConversionPct,
  className,
}: {
  stages?: FunnelStage[];
  overallConversionPct?: number;
  className?: string;
}) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1);
  const derivedOverall =
    typeof overallConversionPct === "number"
      ? overallConversionPct
      : stages.length > 0 && stages[0].count > 0
      ? Number(((stages[stages.length - 1].count / stages[0].count) * 100).toFixed(1))
      : 0;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between text-xs">
        <div>
          <span className="font-semibold text-foreground">Pipeline Velocity & Conversion Funnel</span>
          <p className="text-[11px] text-muted-foreground">Drop-off telemetry from raw lead to token booking</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">Overall Conversion</span>
          <span className="text-sm font-bold text-emerald-700 font-mono">{derivedOverall}%</span>
        </div>
      </div>

      <div className="space-y-2.5">
        {stages.map((stage, idx) => {
          const widthPct = Math.max((stage.count / maxCount) * 100, 14);

          return (
            <div key={stage.name} className="space-y-1 group">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-slate-400 group-hover:scale-125 transition-transform" />
                  <span className="font-semibold text-foreground">{stage.name}</span>
                  {stage.dropOffPct !== undefined && (
                    <span className="text-[10px] text-muted-foreground/80 flex items-center font-mono">
                      <TrendingDown className="h-2.5 w-2.5 mr-0.5 text-rose-500" />
                      -{stage.dropOffPct}% drop
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-foreground text-xs">{stage.count} leads</span>
                  <span className="text-[11px] text-muted-foreground">({stage.conversionPct}%)</span>
                  <span className="text-xs font-semibold text-foreground/90 pl-1">
                    {formatCurrencyINR(stage.value)}
                  </span>
                </div>
              </div>

              {/* Stepped Telemetry Bar */}
              <div className="h-3 w-full rounded-md bg-secondary/70 overflow-hidden border border-border/50">
                <div
                  className={cn(
                    "h-full rounded-sm transition-all duration-500 flex items-center justify-end pr-1 text-[9px] font-bold text-white",
                    stage.color
                  )}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
