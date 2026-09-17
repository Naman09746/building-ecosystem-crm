"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Layers,
  Armchair,
  Paintbrush,
  HardHat,
  ShieldCheck,
  Activity,
  Truck,
} from "lucide-react";

export type VerticalType = "real_estate" | "materials" | "furniture" | "interiors" | "construction";

interface VerticalMeta {
  id: VerticalType;
  title: string;
  category: string;
  code: string;
  icon: React.ElementType;
  metric: string;
  metricLabel: string;
  badge: string;
  description: string;
}

export const VERTICAL_REGISTRY: Record<VerticalType, VerticalMeta> = {
  real_estate: {
    id: "real_estate",
    title: "Real Estate & Mandates",
    category: "High-Ticket Advisory",
    code: "RE-CORP",
    icon: Building2,
    metric: "₹18.5 Cr",
    metricLabel: "Avg Mandate Size",
    badge: "Direct Owner Inventory",
    description: "Multi-tower inventory matrices, Vastu orientation tagging, HNI requirement matching, and GPS-verified site visit gate passes.",
  },
  materials: {
    id: "materials",
    title: "Building Materials Depot",
    category: "Wholesale & Supply",
    code: "MAT-DISPATCH",
    icon: Layers,
    metric: "420 MT",
    metricLabel: "Daily Yard Tonnage",
    badge: "Weighbridge Sync",
    description: "Automated contractor Khata credit ledgers, real-time steel & cement rate tickers, and automated weighbridge tare dispatch slips.",
  },
  furniture: {
    id: "furniture",
    title: "Custom Furniture & Atelier",
    category: "Luxury Woodcraft",
    code: "FURN-CAD",
    icon: Armchair,
    metric: "100%",
    metricLabel: "Spec QA Accuracy",
    badge: "Workshop Milestones",
    description: "Precision timber moisture tracking, multi-stage workshop approvals (Joinery, Polish, Upholstery), and white-glove site delivery schedules.",
  },
  interiors: {
    id: "interiors",
    title: "Turnkey Interior Fitouts",
    category: "Studio & Design Ops",
    code: "INT-BOQ",
    icon: Paintbrush,
    metric: "98.4%",
    metricLabel: "SLA Velocity",
    badge: "Client BOQ Sync",
    description: "Unified client BOQ budgets, architect drawing revision approval workflows, MEP snagging registers, and supervisor site photo sign-offs.",
  },
  construction: {
    id: "construction",
    title: "Turnkey Civil Contracting",
    category: "EPC & Contracting",
    code: "CIVIL-MB",
    icon: HardHat,
    metric: "14 Sites",
    metricLabel: "Active Civil Concurrency",
    badge: "MB Book Drawdown",
    description: "Contractor measurement books (MB Book), 7/28-day concrete cube compressive tests, biometric site labor rolls, and pour logs.",
  },
};

/* ══════════════════════════════════════════════════════════════
   FLAGSHIP INTERACTIVE TELEMETRY STREAM
   ══════════════════════════════════════════════════════════════ */
const TELEMETRY_FEED = [
  {
    time: "10:42:15",
    vertical: "MATERIALS",
    icon: Truck,
    label: "Dispatch Challan #4912",
    detail: "42.5 MT Fe550 TMT Rebar cleared weighbridge gate-out. GPS active.",
    status: "DISPATCHED",
    statusColor: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  },
  {
    time: "10:41:50",
    vertical: "REAL ESTATE",
    icon: Building2,
    label: "Site Visit Gate Pass #SV-884",
    detail: "HNI client checked in at Tower B Penthouse. Biometric pass verified.",
    status: "ON-SITE",
    statusColor: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  },
  {
    time: "10:40:02",
    vertical: "CONSTRUCTION",
    icon: HardHat,
    label: "Compressive QA Cube Test",
    detail: "28-day curing batch #C40-91 achieved 44.2 MPa. Certified by Structural QC.",
    status: "PASSED",
    statusColor: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  },
  {
    time: "10:38:19",
    vertical: "INTERIORS",
    icon: Paintbrush,
    label: "BOQ Stage Drawdown #04",
    detail: "Italian Marble Dry-Lay sign-off approved by Architect. Invoice ₹18.4L generated.",
    status: "APPROVED",
    statusColor: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  },
  {
    time: "10:35:44",
    vertical: "FURNITURE",
    icon: Armchair,
    label: "Workshop Stage QA #02",
    detail: "Burma Teak Credenza joinery passed moisture equilibrium test (9.8%).",
    status: "IN POLISH",
    statusColor: "text-violet-400 border-violet-500/30 bg-violet-500/10",
  },
];

export function LiveTelemetryTicker() {
  const [activeItem, setActiveItem] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setActiveItem((prev) => (prev + 1) % TELEMETRY_FEED.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const current = TELEMETRY_FEED[activeItem];

  return (
    <div className="w-full bg-[#111317] border border-white/10 rounded-lg p-2.5 sm:px-4 sm:py-2.5 flex items-center justify-between gap-3 text-xs font-mono shadow-xl">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[#a0a5ad] uppercase tracking-wider text-[11px] hidden sm:inline">LIVE TELEMETRY:</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeItem}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2.5 min-w-0 truncate"
          >
            <span className="text-[#737882] text-[11px] shrink-0">{current.time}</span>
            <span className="px-1.5 py-0.5 rounded bg-white/10 text-white text-[10px] font-semibold tracking-wider shrink-0">
              {current.vertical}
            </span>
            <span className="text-white font-medium truncate">{current.label}</span>
            <span className="text-[#8e939d] hidden md:inline truncate">— {current.detail}</span>
          </motion.div>
        </AnimatePresence>
      </div>

      <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold tracking-wider shrink-0 ${current.statusColor}`}>
        {current.status}
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   FLAGSHIP DARK COCKPIT COMPONENT
   ══════════════════════════════════════════════════════════════ */
export function EcosystemDarkCockpit() {
  const [selectedVertical, setSelectedVertical] = React.useState<VerticalType>("real_estate");

  return (
    <div className="w-full rounded-xl border border-[#2a2e36] bg-[#0c0d10] text-[#eceff4] shadow-2xl overflow-hidden">
      {/* Chrome Header */}
      <div className="h-11 border-b border-[#22252c] bg-[#14161b] px-4 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#3d424d]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#3d424d]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#3d424d]" />
          </div>
          <span className="text-[#6c7380] ml-2">apex://enterprise-cockpit/unified-radar</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[#6c7380] hidden sm:inline">SYS.CORE // v3.4.1</span>
          <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            OPERATIONAL
          </div>
        </div>
      </div>

      {/* Cockpit Workspace */}
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Control Bar: Vertical Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[#22252c] pb-4">
          <div>
            <div className="text-[11px] font-mono text-[#818896] uppercase tracking-widest">ECOSYSTEM MULTI-TENANCY</div>
            <h3 className="text-lg font-semibold text-white tracking-tight">Active Ledger Inspector</h3>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-[#16181f] border border-[#262a34] rounded-lg">
            {(Object.keys(VERTICAL_REGISTRY) as VerticalType[]).map((vKey) => {
              const meta = VERTICAL_REGISTRY[vKey];
              const Icon = meta.icon;
              const isSelected = selectedVertical === vKey;

              return (
                <button
                  key={vKey}
                  type="button"
                  onClick={() => setSelectedVertical(vKey)}
                  className={`relative px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-2 ${
                    isSelected ? "text-white" : "text-[#7f8694] hover:text-[#c4cad4]"
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="cockpit-active-tab"
                      className="absolute inset-0 bg-[#2b303d] border border-white/10 rounded-md -z-0"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <Icon className="h-3.5 w-3.5 relative z-10" />
                  <span className="relative z-10 hidden md:inline">{meta.title.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Vertical Ledger Presentation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedVertical}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Left: Primary Ledger Table / Mockup */}
            <div className="lg:col-span-8 bg-[#13151b] border border-[#222630] rounded-lg p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-[#9fa6b3]">
                  <Activity className="h-4 w-4 text-[#a3b1c6]" />
                  <span>TRANSACTION LOG // {VERTICAL_REGISTRY[selectedVertical].code}</span>
                </div>
                <span className="text-[#666d7a]">{VERTICAL_REGISTRY[selectedVertical].badge}</span>
              </div>

              {/* Specialized Dynamic Table depending on vertical */}
              {selectedVertical === "real_estate" && (
                <div className="space-y-2 font-mono text-xs">
                  <div className="grid grid-cols-12 py-1.5 px-3 bg-[#1c1f27] text-[#717887] text-[11px] rounded uppercase font-semibold">
                    <span className="col-span-3">Unit Code</span>
                    <span className="col-span-3">Floor / Area</span>
                    <span className="col-span-3">Ticket Value</span>
                    <span className="col-span-3 text-right">Status</span>
                  </div>
                  {[
                    { code: "TWR-A · #3201", spec: "Lvl 32 / 3,840 sq.ft", value: "₹14.80 Cr", state: "Mandate Reserved", color: "text-amber-400 bg-amber-950/40 border-amber-800/40" },
                    { code: "TWR-A · #3202", spec: "Lvl 32 / 4,120 sq.ft", value: "₹16.50 Cr", state: "Site Visit Active", color: "text-blue-400 bg-blue-950/40 border-blue-800/40" },
                    { code: "TWR-B · #PH01", spec: "Penthouse / 7,200 sq.ft", value: "₹32.00 Cr", state: "Offer Under EOI", color: "text-emerald-400 bg-emerald-950/40 border-emerald-800/40" },
                    { code: "TWR-C · #1404", spec: "Lvl 14 / 2,150 sq.ft", value: "₹7.45 Cr", state: "Closed & Registered", color: "text-slate-400 bg-slate-800/40 border-slate-700/40" },
                  ].map((row, i) => (
                    <div key={i} className="grid grid-cols-12 py-2.5 px-3 border border-[#20242e] hover:bg-[#181b22] rounded transition-colors items-center">
                      <span className="col-span-3 text-white font-medium">{row.code}</span>
                      <span className="col-span-3 text-[#8f96a3]">{row.spec}</span>
                      <span className="col-span-3 text-white font-semibold tabular-nums">{row.value}</span>
                      <div className="col-span-3 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider ${row.color}`}>
                          {row.state}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedVertical === "materials" && (
                <div className="space-y-2 font-mono text-xs">
                  <div className="grid grid-cols-12 py-1.5 px-3 bg-[#1c1f27] text-[#717887] text-[11px] rounded uppercase font-semibold">
                    <span className="col-span-3">Challan #</span>
                    <span className="col-span-3">Commodity & Grade</span>
                    <span className="col-span-3">Net Tare Weight</span>
                    <span className="col-span-3 text-right">Khata Ledger</span>
                  </div>
                  {[
                    { code: "CH-9812", spec: "TMT Fe550D (16mm)", value: "32.40 MT", state: "₹18.4L Credit (D-15)", color: "text-emerald-400 bg-emerald-950/40 border-emerald-800/40" },
                    { code: "CH-9813", spec: "Ultratech OPC-53", value: "24.00 MT", state: "₹8.9L Paid (RTGS)", color: "text-blue-400 bg-blue-950/40 border-blue-800/40" },
                    { code: "CH-9814", spec: "Vitrified Tiles (800x1600)", value: "480 Boxes", state: "Khata Auto-Dunned", color: "text-amber-400 bg-amber-950/40 border-amber-800/40" },
                    { code: "CH-9815", spec: "River Sand (Washed)", value: "18.50 MT", state: "Yard Gate-Out Pass", color: "text-slate-400 bg-slate-800/40 border-slate-700/40" },
                  ].map((row, i) => (
                    <div key={i} className="grid grid-cols-12 py-2.5 px-3 border border-[#20242e] hover:bg-[#181b22] rounded transition-colors items-center">
                      <span className="col-span-3 text-white font-medium">{row.code}</span>
                      <span className="col-span-3 text-[#8f96a3]">{row.spec}</span>
                      <span className="col-span-3 text-white font-semibold tabular-nums">{row.value}</span>
                      <div className="col-span-3 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider ${row.color}`}>
                          {row.state}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedVertical === "furniture" && (
                <div className="space-y-2 font-mono text-xs">
                  <div className="grid grid-cols-12 py-1.5 px-3 bg-[#1c1f27] text-[#717887] text-[11px] rounded uppercase font-semibold">
                    <span className="col-span-3">Order SKU</span>
                    <span className="col-span-3">Material Specification</span>
                    <span className="col-span-3">Workshop Stage</span>
                    <span className="col-span-3 text-right">Site Delivery</span>
                  </div>
                  {[
                    { code: "FN-771 · Desk", spec: "Burma Teak / Brass PVD", value: "S4 Polish Complete", state: "Transit Scheduled", color: "text-emerald-400 bg-emerald-950/40 border-emerald-800/40" },
                    { code: "FN-772 · Sofa", spec: "Belgium Bouclé / Oak Frame", value: "S3 Upholstery QA", state: "Fabric Inspected", color: "text-blue-400 bg-blue-950/40 border-blue-800/40" },
                    { code: "FN-773 · Table", spec: "Michelangelo Marble Top", value: "S2 Precision Joinery", state: "CAD Signed Off", color: "text-amber-400 bg-amber-950/40 border-amber-800/40" },
                    { code: "FN-774 · Chairs", spec: "Walnut / Cognac Leather (8x)", value: "S5 White-Glove Install", state: "Completed & Signed", color: "text-slate-400 bg-slate-800/40 border-slate-700/40" },
                  ].map((row, i) => (
                    <div key={i} className="grid grid-cols-12 py-2.5 px-3 border border-[#20242e] hover:bg-[#181b22] rounded transition-colors items-center">
                      <span className="col-span-3 text-white font-medium">{row.code}</span>
                      <span className="col-span-3 text-[#8f96a3]">{row.spec}</span>
                      <span className="col-span-3 text-white font-semibold">{row.value}</span>
                      <div className="col-span-3 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider ${row.color}`}>
                          {row.state}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedVertical === "interiors" && (
                <div className="space-y-2 font-mono text-xs">
                  <div className="grid grid-cols-12 py-1.5 px-3 bg-[#1c1f27] text-[#717887] text-[11px] rounded uppercase font-semibold">
                    <span className="col-span-3">BOQ Package</span>
                    <span className="col-span-3">Architect Approval</span>
                    <span className="col-span-3">Drawdown %</span>
                    <span className="col-span-3 text-right">Snagging Status</span>
                  </div>
                  {[
                    { code: "PK-01 · Civil & Drywall", spec: "Rev 4 Signed (Ar. Verma)", value: "85% (₹42.5L / ₹50L)", state: "Zero Open Snags", color: "text-emerald-400 bg-emerald-950/40 border-emerald-800/40" },
                    { code: "PK-02 · HVAC & MEP", spec: "Ducting Pressure Tested", value: "60% (₹24.0L / ₹40L)", state: "2 Open Snags", color: "text-blue-400 bg-blue-950/40 border-blue-800/40" },
                    { code: "PK-03 · Veneer Paneling", spec: "Sample #B-04 Approved", value: "30% (₹12.0L / ₹38L)", state: "Material On-Site", color: "text-amber-400 bg-amber-950/40 border-amber-800/40" },
                    { code: "PK-04 · Automation & Light", spec: "DALI Control Wiring", value: "10% Advance Paid", state: "First Fix Done", color: "text-slate-400 bg-slate-800/40 border-slate-700/40" },
                  ].map((row, i) => (
                    <div key={i} className="grid grid-cols-12 py-2.5 px-3 border border-[#20242e] hover:bg-[#181b22] rounded transition-colors items-center">
                      <span className="col-span-3 text-white font-medium">{row.code}</span>
                      <span className="col-span-3 text-[#8f96a3]">{row.spec}</span>
                      <span className="col-span-3 text-white font-semibold tabular-nums">{row.value}</span>
                      <div className="col-span-3 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider ${row.color}`}>
                          {row.state}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedVertical === "construction" && (
                <div className="space-y-2 font-mono text-xs">
                  <div className="grid grid-cols-12 py-1.5 px-3 bg-[#1c1f27] text-[#717887] text-[11px] rounded uppercase font-semibold">
                    <span className="col-span-3">MB Sheet Ref</span>
                    <span className="col-span-3">Pour / Structural Zone</span>
                    <span className="col-span-3">Cube QA Result</span>
                    <span className="col-span-3 text-right">Contractor Draw</span>
                  </div>
                  {[
                    { code: "MB-2026/041", spec: "Tower C · Lvl 18 Slab", value: "46.2 MPa (28-day)", state: "₹64.2L Certified", color: "text-emerald-400 bg-emerald-950/40 border-emerald-800/40" },
                    { code: "MB-2026/042", spec: "Basement 2 Retaining Wall", value: "41.8 MPa (7-day)", state: "Retainage 5% Held", color: "text-blue-400 bg-blue-950/40 border-blue-800/40" },
                    { code: "MB-2026/043", spec: "Podium Ramp Column Pour", value: "Batch #C35 QC Ok", state: "MB Entry Pending", color: "text-amber-400 bg-amber-950/40 border-amber-800/40" },
                    { code: "MB-2026/044", spec: "Core Lift Shear Wall", value: "Ultrasonic Rebound Ok", state: "Passed Structural Audit", color: "text-slate-400 bg-slate-800/40 border-slate-700/40" },
                  ].map((row, i) => (
                    <div key={i} className="grid grid-cols-12 py-2.5 px-3 border border-[#20242e] hover:bg-[#181b22] rounded transition-colors items-center">
                      <span className="col-span-3 text-white font-medium">{row.code}</span>
                      <span className="col-span-3 text-[#8f96a3]">{row.spec}</span>
                      <span className="col-span-3 text-white font-semibold tabular-nums">{row.value}</span>
                      <div className="col-span-3 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider ${row.color}`}>
                          {row.state}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Architectural Telemetry & KPI Panel */}
            <div className="lg:col-span-4 bg-[#13151b] border border-[#222630] rounded-lg p-5 flex flex-col justify-between space-y-6 font-mono text-xs">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#222630] pb-3">
                  <span className="text-[#727a89]">OPERATIONAL METRIC</span>
                  <span className="text-white font-bold">{VERTICAL_REGISTRY[selectedVertical].category}</span>
                </div>

                <div className="space-y-1">
                  <div className="text-3xl font-bold text-white tracking-tight tabular-nums">
                    {VERTICAL_REGISTRY[selectedVertical].metric}
                  </div>
                  <div className="text-[#88909f] text-[11px]">{VERTICAL_REGISTRY[selectedVertical].metricLabel}</div>
                </div>

                <p className="text-[#9ea6b5] text-xs font-sans leading-relaxed pt-2">
                  {VERTICAL_REGISTRY[selectedVertical].description}
                </p>
              </div>

              <div className="pt-4 border-t border-[#222630] space-y-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#727a89]">RDBMS RLS POSTGRES:</span>
                  <span className="text-emerald-400 font-semibold">ENFORCED</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#727a89]">WHATSAPP DUNNING API:</span>
                  <span className="text-white font-semibold">ACTIVE</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#727a89]">MULTI-TENANT ISOLATION:</span>
                  <span className="text-white font-semibold">100% AIRGAPPED</span>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
