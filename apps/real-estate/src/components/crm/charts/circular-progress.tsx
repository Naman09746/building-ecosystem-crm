"use client";

import * as React from "react";
import { cn } from "@repo/core/lib/utils";

interface CircularProgressProps {
  value: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
  className?: string;
}

export function CircularProgress({
  value,
  size = 72,
  strokeWidth = 6,
  color = "#0f172a",
  trackColor = "#f1f5f9",
  label,
  sublabel,
  className,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(Math.max(value, 0), 100);
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg] overflow-visible">
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Active Meter */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Percentage */}
        <span className="absolute text-xs font-bold font-mono text-foreground">
          {Math.round(clampedValue)}%
        </span>
      </div>

      {(label || sublabel) && (
        <div className="space-y-0.5 leading-tight">
          {label && <div className="text-xs font-semibold text-foreground">{label}</div>}
          {sublabel && <div className="text-[11px] text-muted-foreground">{sublabel}</div>}
        </div>
      )}
    </div>
  );
}
