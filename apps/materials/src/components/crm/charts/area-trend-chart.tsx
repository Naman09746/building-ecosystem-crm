"use client";

import * as React from "react";
import { cn } from "@repo/core/lib/utils";

interface DataPoint {
  label: string;
  leads: number;
  visits: number;
  deals: number;
}

const DEFAULT_SERIES: DataPoint[] = [
  { label: "W1 Jul", leads: 32, visits: 8, deals: 2 },
  { label: "W2 Jul", leads: 45, visits: 12, deals: 3 },
  { label: "W3 Jul", leads: 38, visits: 10, deals: 2 },
  { label: "W4 Jul", leads: 52, visits: 15, deals: 4 },
  { label: "W1 Aug", leads: 60, visits: 19, deals: 5 },
  { label: "W2 Aug", leads: 58, visits: 18, deals: 4 },
  { label: "W3 Aug", leads: 74, visits: 24, deals: 6 },
  { label: "W4 Aug (Current)", leads: 82, visits: 28, deals: 7 },
];

export function AreaTrendChart({
  data = DEFAULT_SERIES,
  className,
}: {
  data?: DataPoint[];
  className?: string;
}) {
  const [activeIdx, setActiveIdx] = React.useState<number | null>(data.length - 1);
  const [activeMetric, setActiveMetric] = React.useState<"leads" | "visits" | "all">("all");

  const width = 640;
  const height = 220;
  const padding = { top: 20, right: 20, bottom: 30, left: 35 };

  const maxVal = Math.max(...data.map((d) => Math.max(d.leads || 0, d.visits || 0)), 10);

  const getX = (idx: number) => {
    if (data.length <= 1) return padding.left + (width - padding.left - padding.right) / 2;
    return padding.left + (idx / Math.max(1, data.length - 1)) * (width - padding.left - padding.right);
  };

  const getY = (val: number) => {
    return height - padding.bottom - (val / maxVal) * (height - padding.top - padding.bottom);
  };

  // Generate smooth SVG curve using Catmull-Rom or cubic Bezier
  const createSmoothPath = (values: number[]) => {
    const points = values.map((val, idx) => ({ x: getX(idx), y: getY(val) }));
    if (points.length === 0) return "";

    let path = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cpX1 = curr.x + (next.x - curr.x) / 3;
      const cpY1 = curr.y;
      const cpX2 = curr.x + ((next.x - curr.x) * 2) / 3;
      const cpY2 = next.y;
      path += ` C ${cpX1},${cpY1} ${cpX2},${cpY2} ${next.x},${next.y}`;
    }
    return path;
  };

  const leadsPath = createSmoothPath(data.map((d) => d.leads));
  const visitsPath = createSmoothPath(data.map((d) => d.visits));

  const leadsArea = `${leadsPath} L ${getX(data.length - 1)},${height - padding.bottom} L ${getX(0)},${height - padding.bottom} Z`;
  const visitsArea = `${visitsPath} L ${getX(data.length - 1)},${height - padding.bottom} L ${getX(0)},${height - padding.bottom} Z`;

  const activePoint = activeIdx !== null ? data[activeIdx] : null;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Metric Selector & Tooltip summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-900" />
            <span className="font-semibold text-foreground">Lead Volume</span>
            {activePoint && (
              <span className="font-bold text-foreground font-mono ml-1">
                {activePoint.leads}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="font-semibold text-foreground">Site Visits</span>
            {activePoint && (
              <span className="font-bold text-amber-700 font-mono ml-1">
                {activePoint.visits}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
            <span className="font-semibold text-foreground">Deals Closed</span>
            {activePoint && (
              <span className="font-bold text-emerald-700 font-mono ml-1">
                {activePoint.deals}
              </span>
            )}
          </div>
        </div>

        {activePoint && (
          <div className="text-muted-foreground text-[11px] font-medium bg-secondary/80 px-2 py-0.5 rounded border border-border">
            Selected: <strong className="text-foreground">{activePoint.label}</strong>
          </div>
        )}
      </div>

      {/* SVG Chart Container */}
      <div className="relative w-full overflow-hidden rounded-xl border border-border bg-card p-3 shadow-subtle">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            {/* Leads Gradient */}
            <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f172a" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
            </linearGradient>
            {/* Visits Gradient */}
            <linearGradient id="visitsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = height - padding.bottom - pct * (height - padding.top - padding.bottom);
            const val = Math.round(pct * maxVal);
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#94a3b8"
                  fontFamily="monospace"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* X Axis Labels */}
          {data.map((d, idx) => {
            const x = getX(idx);
            return (
              <text
                key={d.label}
                x={x}
                y={height - 10}
                textAnchor="middle"
                fontSize="10"
                fill="#64748b"
                fontWeight="500"
              >
                {d.label.split(" ")[0]}
              </text>
            );
          })}

          {/* Areas */}
          {(activeMetric === "all" || activeMetric === "leads") && (
            <path d={leadsArea} fill="url(#leadsGradient)" />
          )}
          {(activeMetric === "all" || activeMetric === "visits") && (
            <path d={visitsArea} fill="url(#visitsGradient)" />
          )}

          {/* Lines */}
          {(activeMetric === "all" || activeMetric === "leads") && (
            <path
              d={leadsPath}
              fill="none"
              stroke="#0f172a"
              strokeWidth="2.25"
              strokeLinecap="round"
            />
          )}

          {(activeMetric === "all" || activeMetric === "visits") && (
            <path
              d={visitsPath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}

          {/* Active Hover Crosshair Line & Dots */}
          {activeIdx !== null && (
            <g>
              <line
                x1={getX(activeIdx)}
                y1={padding.top}
                x2={getX(activeIdx)}
                y2={height - padding.bottom}
                stroke="#94a3b8"
                strokeWidth="1.25"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(activeIdx)}
                cy={getY(data[activeIdx].leads)}
                r="4.5"
                fill="#0f172a"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <circle
                cx={getX(activeIdx)}
                cy={getY(data[activeIdx].visits)}
                r="4"
                fill="#f59e0b"
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Interactive touch/click zones */}
          {data.map((_, idx) => (
            <rect
              key={idx}
              x={getX(idx) - (width - padding.left - padding.right) / (data.length * 2)}
              y={padding.top}
              width={(width - padding.left - padding.right) / data.length}
              height={height - padding.top - padding.bottom}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setActiveIdx(idx)}
              onClick={() => setActiveIdx(idx)}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
