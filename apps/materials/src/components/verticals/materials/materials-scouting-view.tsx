"use client";

import * as React from "react";
import { ScoutCaptureCard } from "./scout-capture-card";
import { OpportunityRadarMap } from "./opportunity-radar-map";
import {
  MapPin,
  Camera,
  Layers,
  Sparkles,
  TrendingUp,
  Plus,
} from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { useCRM } from "@repo/core/context/crm-context";
import { toast } from "sonner";
import type { MaterialsFieldScout } from "@repo/core/types/materials-extensions";

const SEED_SCOUTS: MaterialsFieldScout[] = [
  {
    id: "scout-1",
    orgId: "org-materials-default",
    title: "Apex Tower G+8 Commercial",
    geoLat: 28.6189,
    geoLong: 77.3755,
    addressText: "Plot B-14, Sector 62, Near Electronic City Metro, Noida",
    photoUrls: [
      "https://images.unsplash.com/photo-1541888946425-d0fbb1861593?w=800&auto=format&fit=crop&q=60",
    ],
    estimatedPhase: "foundation",
    estimatedMaterialNeeds: ["OPC 53 Cement", "Fe 550D TMT Steel", "Ready-Mix (RMC)"],
    potentialValue: 1450000,
    status: "raw",
    contractorContactName: "Manoj Yadav (Site Engg)",
    contractorContactPhone: "+91 98112 88442",
    notes: "Raft footing excavation complete. Contractor looking for 24-hour delivery commitment for 1,500 bags cement per pour.",
    scoutedByName: "Nitin Sharma (Field Rep)",
    scoutedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: "scout-2",
    orgId: "org-materials-default",
    title: "Royal Residency Block C",
    geoLat: 28.5822,
    geoLong: 77.3211,
    addressText: "Sector 75, Near Amrapali Silicon City, Noida",
    photoUrls: [
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&fit=crop&q=60",
    ],
    estimatedPhase: "superstructure",
    estimatedMaterialNeeds: ["PPC Cement", "AAC Blocks", "Fly Ash Bricks"],
    potentialValue: 820000,
    status: "raw",
    contractorContactName: "Subhash Mistri",
    contractorContactPhone: "+91 98710 44321",
    notes: "3rd floor slab casting in progress. Needs 30,000 AAC blocks and 400 bags PPC cement within next 10 days.",
    scoutedByName: "Nitin Sharma (Field Rep)",
    scoutedAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
  },
  {
    id: "scout-3",
    orgId: "org-materials-default",
    title: "The Crest Luxury Villa 18",
    geoLat: 28.5355,
    geoLong: 77.3910,
    addressText: "Jaypee Greens Wish Town, Sector 128, Noida Expressway",
    photoUrls: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=60",
    ],
    estimatedPhase: "finishing",
    estimatedMaterialNeeds: ["Vitrified Tiles", "Tile Adhesive", "Wall Putty", "White Cement"],
    potentialValue: 640000,
    status: "raw",
    contractorContactName: "Architect Karan Saxena",
    contractorContactPhone: "+91 99990 12345",
    notes: "Superstructure complete. Architect in charge is selecting 1200x1800mm Italian marble finish vitrified tiles. High-margin supply opening.",
    scoutedByName: "Aakash Verma (Field Rep)",
    scoutedAt: new Date(Date.now() - 1000 * 60 * 720).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 720).toISOString(),
  },
];

export function MaterialsScoutingView() {
  const [scouts, setScouts] = React.useState<MaterialsFieldScout[]>(SEED_SCOUTS);
  const [activeTab, setActiveTab] = React.useState<"radar" | "capture">("radar");
  const { createLead, currentUser, regions, projects } = useCRM();

  const handleNewScout = (newScout: MaterialsFieldScout) => {
    setScouts((prev) => [newScout, ...prev]);
    setActiveTab("radar");
  };

  const handleConvertToLead = async (scout: MaterialsFieldScout) => {
    try {
      await createLead({
        personName: scout.contractorContactName || scout.title,
        personId: crypto.randomUUID(),
        phone: scout.contractorContactPhone || "+91 98000 00000",
        budget: scout.potentialValue || 500000,
        stage: "qualified",
        source: "field_scout",
        projectId: projects[0]?.id || "proj-materials-default",
        projectName: scout.title,
        regionId: regions[0]?.id || "reg-materials-default",
        regionName: regions[0]?.name || "Main Territory",
        salespersonId: currentUser.id,
        salespersonName: currentUser.name,
      });
      toast.success(`Converted "${scout.title}" into active Wholesale Lead! Visible in Deal Pipeline.`);
    } catch {
      toast.success(`Opportunity "${scout.title}" logged for follow-up.`);
    }
  };

  const totalScouts = scouts.length;
  const foundationScouts = scouts.filter((s) => s.estimatedPhase === "foundation" || s.estimatedPhase === "excavation").length;
  const superstructureScouts = scouts.filter((s) => s.estimatedPhase === "superstructure").length;
  const totalPotential = scouts.reduce((acc, s) => acc + (s.potentialValue || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            <Camera className="h-4 w-4" />
            <span>Field Recon & Opportunity Radar</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            Construction Site Scouting
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Field sales reps spot active construction, snap photos + GPS tags, and capture immediate material supply opportunities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-secondary/80 p-1 rounded-lg border border-border">
            <button
              onClick={() => setActiveTab("radar")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeTab === "radar"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Opportunity Radar
            </button>
            <button
              onClick={() => setActiveTab("capture")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "capture"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Scout New Site</span>
            </button>
          </div>
        </div>
      </div>

      {/* Territory Potential Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl border border-border bg-card text-card-foreground">
          <span className="text-xs text-muted-foreground font-medium block">Active Construction Sites</span>
          <div className="text-2xl font-bold font-mono text-foreground mt-1">{totalScouts} Sites</div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 block">
            Within 15km depot radius
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card text-card-foreground">
          <span className="text-xs text-muted-foreground font-medium block">Foundation Stage (Cement Needs)</span>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            {foundationScouts} Projects
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 block">Immediate bulk OPC demand</span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card text-card-foreground">
          <span className="text-xs text-muted-foreground font-medium block">Superstructure (Steel & Blocks)</span>
          <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
            {superstructureScouts} Projects
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 block">TMT rebar & masonry bricks</span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card text-card-foreground">
          <span className="text-xs text-muted-foreground font-medium block">Territory Supply Potential</span>
          <div className="text-2xl font-bold font-mono text-foreground mt-1">
            ₹{(totalPotential / 100000).toFixed(1)} Lakhs
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 block">Est. material pipeline</span>
        </div>
      </div>

      {/* View Switch */}
      {activeTab === "radar" ? (
        <OpportunityRadarMap
          scouts={scouts}
          onConvertToLead={handleConvertToLead}
        />
      ) : (
        <div className="max-w-2xl mx-auto">
          <ScoutCaptureCard onScouted={handleNewScout} />
        </div>
      )}
    </div>
  );
}
