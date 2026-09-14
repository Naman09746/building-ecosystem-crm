"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { AuthCard } from "@/components/ui/auth-card";
import { 
  Building2, 
  Users, 
  MapPin, 
  ArrowRight, 
  Check, 
  Sparkles,
  Boxes,
  Palette,
  Compass,
  HardHat,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { EcosystemVertical, ComplexityMode } from "@/types/ecosystem";
import { ECOSYSTEM_VERTICALS } from "@/config/ecosystem";

const VERTICAL_OPTIONS: Array<{
  id: EcosystemVertical;
  name: string;
  tagline: string;
  badge: string;
  icon: any;
}> = [
  {
    id: "real_estate",
    name: "Real Estate & Housing",
    tagline: "Developers, Brokers, Mandates & Portfolios",
    badge: "Properties & Units",
    icon: Building2,
  },
  {
    id: "building_materials",
    name: "Building Materials",
    tagline: "Bricks, Cement, Marble, Tiles, Sanitaryware & Steel",
    badge: "SKUs & Dispatches",
    icon: Boxes,
  },
  {
    id: "interior_furniture",
    name: "Interior & Furniture",
    tagline: "Turnkey Studios, Modular Kitchens & Fit-outs",
    badge: "Room Staging & BOQs",
    icon: Palette,
  },
  {
    id: "architecture_design",
    name: "Architecture & Design",
    tagline: "Design Blueprints, Specifications & Approvals",
    badge: "Drawings & Specs",
    icon: Compass,
  },
  {
    id: "contractor_builder",
    name: "Contracting & Execution",
    tagline: "Site Milestones, Crew Attendance & Materials",
    badge: "DSR & Labor",
    icon: HardHat,
  },
];

const TEAM_SIZES = [
  { id: "1-5", label: "1 – 5 Reps", desc: "Solo desk or boutique team" },
  { id: "6-20", label: "6 – 20 Reps", desc: "Fast-growing business" },
  { id: "21-50", label: "21 – 50 Reps", desc: "Regional commercial command" },
  { id: "50+", label: "50+ Enterprise", desc: "Multi-city enterprise" },
];

const REGIONS = [
  "NCR — Gurgaon, Delhi, Noida, Greater Noida",
  "Mumbai Metropolitan Region (MMR)",
  "Bangalore (Urban & North)",
  "Hyderabad (HITEC City, Financial Dist)",
  "Pune (West & East)",
  "Chennai (OMR, Guindy, Alwarpet)",
  "Kolkata (Salt Lake, New Town, South)",
  "Goa & Alibaug Luxury",
  "Jaipur (Amber, Jagatpura, Kukas)",
  "Ahmedabad (SG Highway, Bodakdev)",
  "Kochi (Marine Drive, Kochi Hills)",
  "Lucknow (Gomti Nagar, Aminabad)",
  "Chandigarh (Sector 17, Zirakpur)",
  "Indore (MR10, Vijay Nagar)",
  "Other Indian Metro",
];

export default function SetupOrgPage() {
  const router = useRouter();
  const { org, saveOrgSetup } = useAuth();

  const [selectedVertical, setSelectedVertical] = React.useState<EcosystemVertical>(
    org?.industry || "real_estate"
  );
  const [complexityMode, setComplexityMode] = React.useState<ComplexityMode>(
    org?.complexityMode || "deep"
  );
  const [orgName, setOrgName] = React.useState(org?.name || "Apex Realty Partners");
  const [teamSize, setTeamSize] = React.useState(org?.teamSize || "6-20");
  const [primaryRegion, setPrimaryRegion] = React.useState(org?.primaryRegion || REGIONS[0]);
  const [slug, setSlug] = React.useState("apex-realty");

  React.useEffect(() => {
    const generatedSlug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setSlug(generatedSlug || "my-org");
  }, [orgName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;

    saveOrgSetup({
      name: orgName.trim(),
      teamSize,
      primaryRegion,
      industry: selectedVertical,
      complexityMode,
    });

    router.push("/choose-plan");
  };

  return (
    <AuthCard
      currentStep="org"
      maxWidthClass="max-w-2xl"
      title="Configure your Building Ecosystem Workspace"
      subtitle="Personalize the CRM to match your industry workflow, terminology, and operational depth."
      footerContent="You can change your vertical settings and team permissions anytime in workspace settings."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Select Industry Vertical */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>1. Select your Industry Vertical</span>
            <span className="text-[11px] text-muted-foreground font-normal">Adapts CRM terms & catalogs</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {VERTICAL_OPTIONS.map((v) => {
              const Icon = v.icon;
              const isSelected = selectedVertical === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVertical(v.id)}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary shadow-subtle"
                      : "border-border bg-card/50 hover:bg-secondary/50"
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <span className="truncate">{v.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </div>
                    <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{v.tagline}</div>
                    <span className="inline-block mt-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                      {v.badge}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Complexity Mode */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>2. Choose Operational Depth</span>
            <span className="text-[11px] text-muted-foreground font-normal">You can toggle this later</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setComplexityMode("simple")}
              className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                complexityMode === "simple"
                  ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500 shadow-subtle"
                  : "border-border bg-card/50 hover:bg-secondary/50"
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 ${complexityMode === "simple" ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span>⚡ Simple / High-Velocity</span>
                  {complexityMode === "simple" && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Minimalist, 3-stage visual pipeline, fast WhatsApp quotes & orders without deep nested forms.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setComplexityMode("deep")}
              className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                complexityMode === "deep"
                  ? "border-primary bg-primary/5 ring-1 ring-primary shadow-subtle"
                  : "border-border bg-card/50 hover:bg-secondary/50"
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 ${complexityMode === "deep" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span>🏛️ Deep / Enterprise</span>
                  {complexityMode === "deep" && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Full multi-tier asset hierarchy, chronological ledgers, gate passes, n8n event bus & statutory splits.
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Step 3: Organization Details */}
        <div className="space-y-4 pt-2 border-t border-border">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Company / Firm Name</span>
            </label>
            <input
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. Jindal Marble Yards, DLF Partners, Studio Arch"
              className="w-full h-9 px-3 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all font-medium"
            />
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <span>Workspace URL:</span>
              <span className="font-mono text-foreground font-semibold">
                app.callcrm.in/{slug}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Primary Hub / Region */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Primary Operating City</span>
              </label>
              <select
                value={primaryRegion}
                onChange={(e) => setPrimaryRegion(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Team Size */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Team Size</span>
              </label>
              <select
                value={teamSize}
                onChange={(e) => setTeamSize(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              >
                {TEAM_SIZES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({t.desc})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-subtle active:scale-[0.99]"
        >
          <span>Continue to Choose Plan</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </form>
    </AuthCard>
  );
}
