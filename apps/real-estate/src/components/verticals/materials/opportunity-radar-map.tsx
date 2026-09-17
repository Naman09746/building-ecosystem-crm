"use client";

import * as React from "react";
import {
  MapPin,
  Camera,
  Layers,
  Phone,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle2,
  Building,
  Calendar,
  IndianRupee,
  Navigation,
  Compass,
} from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { formatCurrencyINR } from "@repo/core/lib/utils";
import { toast } from "sonner";
import type {
  MaterialsFieldScout,
  FieldScoutPhase,
} from "@repo/core/types/materials-extensions";

interface OpportunityRadarMapProps {
  scouts: MaterialsFieldScout[];
  onSelectScout?: (scout: MaterialsFieldScout) => void;
  onConvertToLead?: (scout: MaterialsFieldScout) => void;
}

export function OpportunityRadarMap({
  scouts,
  onSelectScout,
  onConvertToLead,
}: OpportunityRadarMapProps) {
  const [selectedScoutId, setSelectedScoutId] = React.useState<string>(scouts[0]?.id || "");
  const [phaseFilter, setPhaseFilter] = React.useState<string>("all");

  const activeScout = scouts.find((s) => s.id === selectedScoutId) || scouts[0];

  const filteredScouts = scouts.filter((s) => {
    return phaseFilter === "all" || s.estimatedPhase === phaseFilter;
  });

  const getPhaseColor = (phase: FieldScoutPhase) => {
    switch (phase) {
      case "excavation":
      case "foundation":
        return "bg-amber-500 text-amber-950 ring-amber-400";
      case "superstructure":
        return "bg-blue-500 text-white ring-blue-400";
      case "finishing":
        return "bg-emerald-500 text-emerald-950 ring-emerald-400";
      default:
        return "bg-purple-500 text-white ring-purple-400";
    }
  };

  const getPhaseBadge = (phase: FieldScoutPhase) => {
    switch (phase) {
      case "excavation":
      case "foundation":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Foundation (High Cement Demand)
          </span>
        );
      case "superstructure":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            Superstructure (Steel & Blocks)
          </span>
        );
      case "finishing":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Finishing (Tiles & Sanitary)
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            Renovation
          </span>
        );
    }
  };

  // Pre-calculate normalized radar coordinates for pins
  // Based on lat 28.53 - 28.65, long 77.20 - 77.40
  const getPinStyle = (scout: MaterialsFieldScout, index: number) => {
    // Generate organic distinct layout positions for the interactive radar visual
    const positions = [
      { left: "28%", top: "34%" },
      { left: "62%", top: "25%" },
      { left: "45%", top: "68%" },
      { left: "75%", top: "58%" },
      { left: "20%", top: "65%" },
      { left: "55%", top: "45%" },
    ];
    const pos = positions[index % positions.length];
    return { left: pos.left, top: pos.top };
  };

  return (
    <div className="space-y-4">
      {/* Radar Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Compass className="h-4 w-4 text-emerald-500" />
            Depot Recon Radar (15km Territory Radius)
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: "all", label: "All Scouts" },
            { id: "foundation", label: "Foundation" },
            { id: "superstructure", label: "Superstructure" },
            { id: "finishing", label: "Finishing" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setPhaseFilter(f.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                phaseFilter === f.id
                  ? "bg-foreground text-background"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Radar Map Canvas (Left 7 Cols) */}
        <div className="lg:col-span-7 bg-slate-950 text-white rounded-xl border border-slate-800 p-4 relative min-h-[380px] sm:min-h-[440px] flex flex-col justify-between overflow-hidden shadow-inner">
          {/* Radar Background Rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <div className="w-[320px] h-[320px] rounded-full border border-emerald-500 animate-pulse" />
            <div className="absolute w-[220px] h-[220px] rounded-full border border-emerald-500/60" />
            <div className="absolute w-[120px] h-[120px] rounded-full border border-emerald-500/40" />
            <div className="absolute w-full h-[1px] bg-emerald-500/20" />
            <div className="absolute h-full w-[1px] bg-emerald-500/20" />
          </div>

          {/* Central Depot Landmark */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-10">
            <div className="h-4 w-4 rounded-full bg-emerald-400 ring-4 ring-emerald-500/30 flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-slate-950" />
            </div>
            <span className="text-[10px] font-mono font-bold bg-slate-900/90 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 mt-1 whitespace-nowrap">
              Main Depot (HUB)
            </span>
          </div>

          {/* Map Top Header */}
          <div className="relative z-20 flex items-center justify-between">
            <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
              <Navigation className="h-3 w-3 animate-spin" />
              LIVE RECON RADAR • {filteredScouts.length} SITES ACTIVE
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Grid: Lat 28.59N • Long 77.31E
            </span>
          </div>

          {/* Interactive Scout Pins */}
          <div className="absolute inset-0 z-20 pointer-events-auto">
            {filteredScouts.map((scout, idx) => {
              const isSelected = activeScout?.id === scout.id;
              const style = getPinStyle(scout, idx);
              const colorClass = getPhaseColor(scout.estimatedPhase);
              return (
                <button
                  key={scout.id}
                  onClick={() => {
                    setSelectedScoutId(scout.id);
                    if (onSelectScout) onSelectScout(scout);
                  }}
                  style={style}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 group transition-all duration-300 focus:outline-none ${
                    isSelected ? "scale-125 z-30" : "hover:scale-115 z-20"
                  }`}
                >
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center font-bold shadow-lg ring-2 transition-all ${colorClass} ${
                      isSelected ? "ring-white animate-bounce" : "ring-white/40"
                    }`}
                  >
                    <Building className="h-3.5 w-3.5" />
                  </div>
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 top-8 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap shadow-md pointer-events-none transition-all ${
                      isSelected
                        ? "bg-emerald-500 text-slate-950 scale-100"
                        : "bg-slate-900/90 text-slate-200 border border-slate-700 opacity-80 group-hover:opacity-100"
                    }`}
                  >
                    {scout.title}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Map Footer Legend */}
          <div className="relative z-20 flex items-center justify-between text-[10px] text-slate-400 font-mono bg-slate-900/90 p-2 rounded border border-slate-800">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Foundation
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Superstructure
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Finishing
              </span>
            </div>
            <span>Tap pin for inspector reconnaissance</span>
          </div>
        </div>

        {/* Selected Scout Details Panel (Right 5 Cols) */}
        <div className="lg:col-span-5 bg-card text-card-foreground rounded-xl border border-border p-4 shadow-subtle flex flex-col justify-between space-y-4">
          {activeScout ? (
            <div className="space-y-3.5">
              {/* Photo Thumbnail */}
              {activeScout.photoUrls?.[0] ? (
                <div className="rounded-lg overflow-hidden border border-border h-40 relative group">
                  <img
                    src={activeScout.photoUrls[0]}
                    alt={activeScout.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    {getPhaseBadge(activeScout.estimatedPhase)}
                  </div>
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-white font-mono flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-emerald-400" />
                    {activeScout.geoLat.toFixed(3)}, {activeScout.geoLong.toFixed(3)}
                  </div>
                </div>
              ) : (
                <div className="h-28 rounded-lg bg-secondary/30 border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground text-xs gap-1">
                  <Camera className="h-5 w-5" />
                  <span>No photo attached</span>
                  <div className="mt-1">{getPhaseBadge(activeScout.estimatedPhase)}</div>
                </div>
              )}

              {/* Title and Address */}
              <div>
                <h3 className="text-base font-bold text-foreground">{activeScout.title}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                  <span>{activeScout.addressText}</span>
                </p>
              </div>

              {/* Immediate Material Demand */}
              <div className="space-y-1 bg-secondary/20 p-2.5 rounded-lg border border-border/70">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Identified Material Demand:
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {activeScout.estimatedMaterialNeeds.map((m) => (
                    <span
                      key={m}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold bg-secondary text-foreground border border-border"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Field Observation / Conclusion */}
              <div className="bg-background rounded-lg border border-border/80 p-3 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Field Rep Note
                  </span>
                  <span>Scouted by {activeScout.scoutedByName || "Rep"}</span>
                </div>
                <p className="text-xs text-foreground leading-relaxed">{activeScout.notes}</p>
              </div>

              {/* Contact Info If Available */}
              {activeScout.contractorContactName && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 border border-border text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Site Contact</span>
                    <span className="font-bold text-foreground">{activeScout.contractorContactName}</span>
                  </div>
                  {activeScout.contractorContactPhone && (
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${activeScout.contractorContactPhone}`}
                        className="p-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-foreground"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                      <a
                        href={`https://wa.me/${activeScout.contractorContactPhone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Action: Convert to Lead */}
              <div className="pt-2">
                <Button
                  onClick={() => {
                    if (onConvertToLead) {
                      onConvertToLead(activeScout);
                    } else {
                      toast.success(`Converted "${activeScout.title}" into wholesale inquiry lead!`);
                    }
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 gap-1.5 shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Convert to Pipeline Opportunity</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-xs text-muted-foreground">
              Select a pin to inspect site details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
