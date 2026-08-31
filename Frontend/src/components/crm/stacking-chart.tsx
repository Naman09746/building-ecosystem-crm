"use client";

import * as React from "react";
import {
  Building2,
  Layers,
  Sparkles,
  Calculator,
  Eye,
  CheckCircle2,
  Lock,
  Clock,
  Compass,
  Maximize2,
  User,
  ShieldCheck,
  TrendingUp,
  Filter,
  ArrowUpDown,
  Home,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrencyINR, formatPhone } from "@/lib/utils";
import type { Project, ProjectTower, ProjectUnit, UnitStatus } from "@/types/crm";

interface StackingChartProps {
  project: Project;
  units: ProjectUnit[];
  towers: ProjectTower[];
  onSelectUnit: (unit: ProjectUnit) => void;
  onOpenCostSheet: (unit: ProjectUnit) => void;
}

export function StackingChart({
  project,
  units,
  towers,
  onSelectUnit,
  onOpenCostSheet,
}: StackingChartProps) {
  // Available tower names
  const availableTowerNames = React.useMemo(() => {
    const names = Array.from(new Set(units.map((u) => u.tower)));
    return names.length > 0 ? names : ["Tower A"];
  }, [units]);

  const [selectedTowerName, setSelectedTowerName] = React.useState<string>(
    availableTowerNames[0] || "Tower A"
  );
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [configFilter, setConfigFilter] = React.useState<string>("all");
  const [hoveredUnit, setHoveredUnit] = React.useState<ProjectUnit | null>(null);

  // Auto-switch tower if selected one has no units
  React.useEffect(() => {
    if (availableTowerNames.length > 0 && !availableTowerNames.includes(selectedTowerName)) {
      setSelectedTowerName(availableTowerNames[0]);
    }
  }, [availableTowerNames, selectedTowerName]);

  // Filter units for selected tower
  const towerUnits = React.useMemo(() => {
    return units.filter((u) => u.tower === selectedTowerName);
  }, [units, selectedTowerName]);

  // Extract unique configurations in this tower
  const availableConfigs = React.useMemo(() => {
    return Array.from(new Set(towerUnits.map((u) => u.configuration))).filter(Boolean);
  }, [towerUnits]);

  // Group units by Floor in descending order (top floor at the top)
  const floorMap = React.useMemo(() => {
    const map = new Map<number, ProjectUnit[]>();
    for (const u of towerUnits) {
      const fl = u.floor || 1;
      if (!map.has(fl)) map.set(fl, []);
      map.get(fl)!.push(u);
    }

    // Sort units within each floor by unitNumber
    for (const [fl, flUnits] of map.entries()) {
      flUnits.sort((a, b) => a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true }));
    }

    // Sort floor numbers descending (Penthouse down to Ground floor)
    const sortedFloors = Array.from(map.keys()).sort((a, b) => b - a);
    return { map, sortedFloors };
  }, [towerUnits]);

  // Tower Inventory Statistics
  const totalTowerUnits = towerUnits.length;
  const availableCount = towerUnits.filter((u) => u.status === "available").length;
  const bookedOrSoldCount = towerUnits.filter((u) => u.status === "booked" || u.status === "sold").length;
  const inPipelineCount = towerUnits.filter((u) => ["hold", "site_visit", "negotiation"].includes(u.status)).length;
  const unsoldValuation = towerUnits
    .filter((u) => u.status === "available" || ["hold", "site_visit", "negotiation"].includes(u.status))
    .reduce((acc, u) => acc + u.price, 0);
  const selloutPct = totalTowerUnits > 0 ? Math.round((bookedOrSoldCount / totalTowerUnits) * 100) : 0;

  const getStatusColor = (status: UnitStatus) => {
    switch (status) {
      case "available":
        return {
          bg: "bg-emerald-950/40 hover:bg-emerald-900/60",
          border: "border-emerald-500/40 hover:border-emerald-400",
          text: "text-emerald-300",
          indicator: "bg-emerald-500",
          label: "Available",
        };
      case "site_visit":
        return {
          bg: "bg-amber-950/40 hover:bg-amber-900/60",
          border: "border-amber-500/40 hover:border-amber-400",
          text: "text-amber-300",
          indicator: "bg-amber-500",
          label: "Site Visit",
        };
      case "negotiation":
        return {
          bg: "bg-purple-950/40 hover:bg-purple-900/60",
          border: "border-purple-500/40 hover:border-purple-400",
          text: "text-purple-300",
          indicator: "bg-purple-500",
          label: "Negotiation",
        };
      case "hold":
        return {
          bg: "bg-slate-900/60 hover:bg-slate-800/80",
          border: "border-slate-600 border-dashed hover:border-slate-500",
          text: "text-slate-400",
          indicator: "bg-slate-500",
          label: "Hold",
        };
      case "booked":
        return {
          bg: "bg-blue-950/40 hover:bg-blue-900/60",
          border: "border-blue-500/40 hover:border-blue-400",
          text: "text-blue-300",
          indicator: "bg-blue-500",
          label: "Booked",
        };
      case "sold":
      default:
        return {
          bg: "bg-slate-950/80 hover:bg-slate-900",
          border: "border-slate-800 hover:border-slate-700",
          text: "text-slate-500",
          indicator: "bg-slate-600",
          label: "Sold Out",
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Tower Selector & Real-Time Stats Header */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70 backdrop-blur-md shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Tower Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 shrink-0 mr-2">
            <Building2 className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Select Tower:</span>
          </div>
          <div className="flex gap-1.5">
            {availableTowerNames.map((tName) => (
              <button
                key={tName}
                onClick={() => setSelectedTowerName(tName)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  selectedTowerName === tName
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                    : "bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/50"
                }`}
              >
                {tName}
              </button>
            ))}
          </div>
        </div>

        {/* Tower KPIs */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <div className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 flex items-center gap-1.5">
            <span className="text-slate-400">Total Units:</span>
            <span className="font-bold text-slate-100">{totalTowerUnits}</span>
          </div>
          <div className="px-2.5 py-1 rounded-md bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-1.5 text-emerald-300">
            <span>Available:</span>
            <span className="font-bold">{availableCount}</span>
          </div>
          <div className="px-2.5 py-1 rounded-md bg-blue-950/40 border border-blue-500/30 flex items-center gap-1.5 text-blue-300">
            <span>Sold / Booked:</span>
            <span className="font-bold">{bookedOrSoldCount} ({selloutPct}%)</span>
          </div>
          <div className="px-2.5 py-1 rounded-md bg-amber-950/40 border border-amber-500/30 flex items-center gap-1.5 text-amber-300">
            <span>Unsold Pipeline:</span>
            <span className="font-bold">{formatCurrencyINR(unsoldValuation)}</span>
          </div>
        </div>
      </div>

      {/* Filter Controls & Color Legend */}
      <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Status & Config Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-7 px-2 rounded-md border border-slate-700 bg-slate-950 text-slate-200 text-xs focus:outline-none"
            >
              <option value="all">All Units</option>
              <option value="available">🟢 Available Only</option>
              <option value="site_visit">🟡 Site Visit</option>
              <option value="negotiation">🟣 Negotiation</option>
              <option value="hold">⚪ Hold</option>
              <option value="booked">🔵 Booked</option>
              <option value="sold">🔒 Sold</option>
            </select>
          </div>

          {availableConfigs.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-slate-400">Layout:</span>
              <select
                value={configFilter}
                onChange={(e) => setConfigFilter(e.target.value)}
                className="h-7 px-2 rounded-md border border-slate-700 bg-slate-950 text-slate-200 text-xs focus:outline-none"
              >
                <option value="all">All Configurations</option>
                {availableConfigs.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Status Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span className="text-slate-300">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
            <span className="text-slate-300">Site Visit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-purple-500"></span>
            <span className="text-slate-300">Negotiation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500"></span>
            <span className="text-slate-300">Booked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-600"></span>
            <span className="text-slate-400">Sold</span>
          </div>
        </div>
      </div>

      {/* Main Building Stacking Matrix */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 overflow-x-auto shadow-2xl">
        <div className="min-w-[640px] space-y-2">
          {floorMap.sortedFloors.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No floor inventory found for {selectedTowerName}.
            </div>
          ) : (
            floorMap.sortedFloors.map((floorNum) => {
              const floorUnits = floorMap.map.get(floorNum) || [];
              const isPenthouse = floorNum === Math.max(...floorMap.sortedFloors) && floorNum > 10;

              return (
                <div key={floorNum} className="flex items-stretch gap-2.5">
                  {/* Floor Level Column */}
                  <div
                    className={`w-20 shrink-0 flex flex-col items-center justify-center rounded-lg border text-xs font-mono font-bold ${
                      isPenthouse
                        ? "bg-amber-950/40 border-amber-500/40 text-amber-300"
                        : "bg-slate-900/90 border-slate-800 text-slate-400"
                    }`}
                  >
                    <span className="text-[10px] uppercase tracking-wider">
                      {isPenthouse ? "PH" : `FL ${floorNum}`}
                    </span>
                    <span className="text-[9px] font-normal text-slate-500">
                      Level {floorNum}
                    </span>
                  </div>

                  {/* Units along this floor */}
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {floorUnits.map((unit) => {
                      const matchesStatus = statusFilter === "all" || unit.status === statusFilter;
                      const matchesConfig = configFilter === "all" || unit.configuration === configFilter;
                      const isVisible = matchesStatus && matchesConfig;
                      const color = getStatusColor(unit.status);

                      if (!isVisible) {
                        return (
                          <div
                            key={unit.id}
                            className="p-2 rounded-lg border border-slate-800/40 bg-slate-900/10 opacity-30 text-slate-600 text-xs font-mono text-center flex items-center justify-center"
                          >
                            Unit {unit.unitNumber}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={unit.id}
                          onMouseEnter={() => setHoveredUnit(unit)}
                          onClick={() => onSelectUnit(unit)}
                          className={`p-2.5 rounded-lg border transition-all cursor-pointer relative group ${color.bg} ${color.border} shadow-sm`}
                        >
                          {/* Unit Top Line: Number + Status Dot */}
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`h-2 w-2 rounded-full ${color.indicator}`}></span>
                              <span className="font-mono font-bold text-xs text-slate-100">
                                {unit.unitNumber}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-amber-300">
                              {formatCurrencyINR(unit.askingPrice || unit.price)}
                            </span>
                          </div>

                          {/* Unit Details */}
                          <div className="text-[11px] text-slate-300 flex items-center justify-between gap-1 font-sans">
                            <span className="truncate">{unit.configuration}</span>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              {unit.superAreaSqFt || unit.sizeSqFt} sq.ft
                            </span>
                          </div>

                          {/* Facing / Corner Tag */}
                          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                            <span className="truncate">{unit.facing || "Park Facing"}</span>
                            {unit.isCornerUnit && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold shrink-0">
                                Corner
                              </span>
                            )}
                          </div>

                          {/* Quick Action Overlay on Hover */}
                          <div className="absolute inset-0 rounded-lg bg-slate-950/90 backdrop-blur-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 z-10">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectUnit(unit);
                              }}
                              className="h-6 px-2 text-[10px] font-bold border-slate-700 bg-slate-900 text-slate-200 hover:text-white"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Dossier
                            </Button>
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenCostSheet(unit);
                              }}
                              className="h-6 px-2 text-[10px] font-bold bg-amber-600 hover:bg-amber-500 text-slate-950"
                            >
                              <Calculator className="h-3 w-3 mr-1" />
                              Cost Sheet
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
