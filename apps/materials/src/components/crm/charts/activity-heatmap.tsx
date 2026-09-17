"use client";

import * as React from "react";
import { cn } from "@repo/core/lib/utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = ["10 AM", "12 PM", "2 PM", "4 PM", "6 PM", "8 PM"];

// Realistic calling density matrix for Indian real-estate teams
const HEATMAP_DATA = [
  [3, 8, 5, 9, 6, 2], // Mon
  [4, 11, 8, 14, 9, 3], // Tue (Peak)
  [2, 9, 7, 12, 8, 4], // Wed
  [5, 12, 10, 15, 11, 5], // Thu (Peak)
  [4, 10, 8, 13, 7, 2], // Fri
  [8, 16, 14, 18, 12, 6], // Sat (Site visits & heavy calling)
  [6, 14, 11, 15, 9, 3], // Sun (Site visits)
];

export function ActivityHeatmap({ className }: { className?: string }) {
  const [hoveredCell, setHoveredCell] = React.useState<{ day: string; hour: string; count: number } | null>(null);

  const getColorClass = (count: number) => {
    if (count === 0) return "bg-secondary/40 border-border/40";
    if (count <= 4) return "bg-slate-200 text-slate-800 border-slate-300";
    if (count <= 8) return "bg-slate-300 text-slate-900 border-slate-400";
    if (count <= 12) return "bg-slate-700 text-white border-slate-700";
    return "bg-slate-900 text-white border-slate-900 font-bold";
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between text-xs">
        <div>
          <span className="font-semibold text-foreground">Weekly Calling Activity & Density Matrix</span>
          <p className="text-[11px] text-muted-foreground">Distribution of 180+ logged calls across peak engagement hours</p>
        </div>

        {hoveredCell ? (
          <div className="text-[11px] font-medium text-foreground bg-secondary px-2 py-0.5 rounded border border-border">
            {hoveredCell.day} @ {hoveredCell.hour}: <strong className="font-mono">{hoveredCell.count} calls</strong>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span>Low</span>
            <span className="h-2 w-2 rounded bg-slate-200" />
            <span className="h-2 w-2 rounded bg-slate-400" />
            <span className="h-2 w-2 rounded bg-slate-700" />
            <span className="h-2 w-2 rounded bg-slate-900" />
            <span>Peak</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[420px] space-y-1">
          {/* Hour Headers */}
          <div className="grid grid-cols-7 gap-1 text-[10px] font-semibold text-muted-foreground uppercase text-center pb-1">
            <div className="text-left pl-1">Day</div>
            {HOURS.map((h) => (
              <div key={h}>{h}</div>
            ))}
          </div>

          {/* Day Rows */}
          {DAYS.map((day, dIdx) => (
            <div key={day} className="grid grid-cols-7 gap-1 items-center">
              <span className="text-[11px] font-medium text-foreground text-left pl-1">
                {day}
              </span>
              {HOURS.map((hour, hIdx) => {
                const count = HEATMAP_DATA[dIdx][hIdx];
                return (
                  <div
                    key={hour}
                    onMouseEnter={() => setHoveredCell({ day, hour, count })}
                    onMouseLeave={() => setHoveredCell(null)}
                    className={cn(
                      "h-6 rounded border flex items-center justify-center text-[10px] font-mono cursor-pointer transition-transform hover:scale-105 shadow-subtle",
                      getColorClass(count)
                    )}
                  >
                    {count}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
