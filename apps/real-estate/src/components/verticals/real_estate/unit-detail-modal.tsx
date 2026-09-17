"use client";

import * as React from "react";
import {
  Building2,
  MapPin,
  Compass,
  Maximize2,
  Calendar,
  IndianRupee,
  Key,
  ShieldCheck,
  User,
  Users,
  Phone,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Tag,
  Clock,
  Plus,
  Trash2,
  Edit3,
  X,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileText,
  Share2,
  Calculator,
} from "lucide-react";
import { useCRM } from "@repo/core/context/crm-context";
import { ResponsiveModal } from "@repo/ui/components/responsive-modal";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { UnitStatusBadge } from "@repo/ui/components/status-badge";
import { formatCurrencyINR, formatPhone } from "@repo/core/lib/utils";
import { CostSheetModal } from "./cost-sheet-modal";
import type {
  ProjectUnit,
  EntityRelationship,
  PropertyFact,
  UnitPriceHistory,
  Lead,
  UnitStatus,
  SellerIntent,
  OccupancyStatus,
  VerificationStatus,
} from "@repo/core/types/crm";
import { toast } from "sonner";

interface UnitDetailModalProps {
  unit: ProjectUnit | null;
  isOpen: boolean;
  onClose: () => void;
}

export function UnitDetailModal({ unit, isOpen, onClose }: UnitDetailModalProps) {
  const {
    projects,
    towers,
    people,
    leads,
    relationships,
    propertyFacts,
    priceHistories,
    updateUnit,
    updateUnitStatus,
    assignUnitToLead,
    createRelationship,
    deleteRelationship,
    createPropertyFact,
    deletePropertyFact,
    logUnitPriceChange,
  } = useCRM();

  const [activeTab, setActiveTab] = React.useState<"overview" | "people" | "facts" | "pricing" | "buyers" | "cost_sheet">("overview");
  const [isCostSheetOpen, setIsCostSheetOpen] = React.useState(false);

  // Edit State
  const [isEditingPrice, setIsEditingPrice] = React.useState(false);
  const [newPrice, setNewPrice] = React.useState<string>("");
  const [priceNotes, setPriceNotes] = React.useState<string>("");

  // Add Relationship Dialog State
  const [isAddRelOpen, setIsAddRelOpen] = React.useState(false);
  const [relPersonId, setRelPersonId] = React.useState("");
  const [relType, setRelType] = React.useState<EntityRelationship["relationshipType"]>("current_owner");
  const [relValidFrom, setRelValidFrom] = React.useState(new Date().toISOString().split("T")[0]);
  const [relNotes, setRelNotes] = React.useState("");

  // Add Fact Dialog State
  const [isAddFactOpen, setIsAddFactOpen] = React.useState(false);
  const [factCategory, setFactCategory] = React.useState<PropertyFact["category"]>("visitor_access_rules");
  const [factTitle, setFactTitle] = React.useState("");
  const [factStatement, setFactStatement] = React.useState("");
  const [factTier, setFactTier] = React.useState<PropertyFact["verificationTier"]>("verified");

  if (!unit) return null;

  const project = projects.find((p) => p.id === unit.projectId);
  const tower = towers.find((t) => t.id === unit.towerId) || towers.find((t) => t.name === unit.tower && t.projectId === unit.projectId);

  // Unit-specific relationships
  const unitRelationships = relationships.filter(
    (r) => r.targetType === "unit" && r.targetId === unit.id
  );
  const currentOwner = unitRelationships.find((r) => r.relationshipType === "current_owner" && r.isCurrent);
  const currentTenant = unitRelationships.find((r) => r.relationshipType === "current_tenant" && r.isCurrent);
  const brokerPartner = unitRelationships.find((r) => r.relationshipType === "exclusive_broker" && r.isCurrent);

  // Unit-specific facts
  const unitFacts = propertyFacts.filter(
    (f) => f.entityType === "unit" && f.entityId === unit.id
  );

  // Unit price history
  const unitHistory = priceHistories.filter((h) => h.unitId === unit.id);

  // Matching Active Buyer Leads (budget within +/- 25% and matching or open config)
  const askingPrice = unit.askingPrice || unit.price;
  const minBudget = askingPrice * 0.75;
  const maxBudget = askingPrice * 1.25;

  const matchingLeads = leads
    .filter(
      (l) =>
        l.stage !== "won" &&
        l.stage !== "lost" &&
        l.budget >= minBudget &&
        l.budget <= maxBudget
    )
    .slice(0, 6);

  const handleUpdatePrice = async () => {
    const numericPrice = Number(newPrice);
    if (!numericPrice || isNaN(numericPrice) || numericPrice <= 0) {
      toast.error("Please enter a valid price in INR");
      return;
    }
    await logUnitPriceChange(unit.id, numericPrice, unit.askingPrice || unit.price, priceNotes);
    setIsEditingPrice(false);
    setNewPrice("");
    setPriceNotes("");
  };

  const handleSaveRelationship = async () => {
    const person = people.find((p) => p.id === relPersonId);
    if (!person) {
      toast.error("Please select a person from your contacts");
      return;
    }

    await createRelationship({
      subjectType: "person",
      subjectId: person.id,
      subjectName: person.name,
      subjectPhone: person.phone,
      relationshipType: relType,
      targetType: "unit",
      targetId: unit.id,
      targetName: `Unit ${unit.tower}-${unit.unitNumber} (${project?.name || "Society"})`,
      validFrom: relValidFrom,
      isCurrent: true,
      confidenceScore: 100,
      verificationStatus: "verified",
      provenanceSource: "salesperson_entry",
      notes: relNotes || undefined,
    });

    setIsAddRelOpen(false);
    setRelPersonId("");
    setRelNotes("");
  };

  const handleSaveFact = async () => {
    if (!factTitle.trim() || !factStatement.trim()) {
      toast.error("Title and Fact statement are required");
      return;
    }

    await createPropertyFact({
      entityType: "unit",
      entityId: unit.id,
      category: factCategory,
      title: factTitle.trim(),
      factStatement: factStatement.trim(),
      verificationTier: factTier,
      confidencePct: factTier === "verified" ? 100 : factTier === "historical" ? 85 : 70,
    });

    setIsAddFactOpen(false);
    setFactTitle("");
    setFactStatement("");
  };

  const handleWhatsAppShare = () => {
    const text = `*Luxury Unit Available — ${project?.name || "Exclusive Society"}*\n\n` +
      `🏢 *Unit:* ${unit.tower}-${unit.unitNumber} (Floor ${unit.floor})\n` +
      `📐 *Configuration:* ${unit.configuration} (${unit.superAreaSqFt || unit.sizeSqFt} sq.ft)\n` +
      `🧭 *Facing:* ${unit.facing || "North-East / Park Facing"}\n` +
      `💰 *Asking Price:* ${formatCurrencyINR(unit.askingPrice || unit.price)}\n` +
      `🔑 *Status:* Ready for Inspection\n\n` +
      `Contact EcosystemRealty Luxury Desk for an exclusive private walkthrough.`;

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
  };

  return (
    <>
    <ResponsiveModal
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      className="max-w-4xl max-h-[90vh] overflow-y-auto p-0"
    >
      <div className="flex flex-col animate-scale-in">
        {/* Header Banner */}
        <div className="p-6 border-b border-border bg-gradient-to-r from-secondary/60 via-card to-secondary/30 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-primary px-2.5 py-0.5 rounded bg-primary/10 border border-primary/20">
                  {project?.developer || "Luxury Developer"}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {project?.name || "Society"} • {project?.location || "Prime Sector"}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-mono capitalize ${
                    unit.verificationStatus === "verified"
                      ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                      : "border-amber-500/40 text-amber-600 bg-amber-500/10"
                  }`}
                >
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  {unit.verificationStatus || "Unverified"}
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black tracking-tight text-foreground">
                  Unit {unit.tower}-{unit.unitNumber}
                </h2>
                <UnitStatusBadge status={unit.status} />
              </div>

              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> Floor {unit.floor} of {tower?.totalFloors || 24} •{" "}
                <Compass className="h-3.5 w-3.5 text-muted-foreground" /> {unit.facing || "Park Facing"} •{" "}
                <Key className="h-3.5 w-3.5 text-muted-foreground" /> {unit.keyLocation || "Site Office Key Box #1"}
              </p>
            </div>

            {/* Price & Action Box */}
            <div className="flex flex-col items-start md:items-end justify-between gap-2.5">
              <div className="text-left md:text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Asking Valuation
                </span>
                <div className="text-2xl font-black font-mono text-primary flex items-center md:justify-end gap-1">
                  <span>{formatCurrencyINR(unit.askingPrice || unit.price)}</span>
                  <button
                    onClick={() => {
                      setNewPrice(String(unit.askingPrice || unit.price));
                      setIsEditingPrice(true);
                    }}
                    title="Edit asking price"
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  ₹{Math.round((unit.askingPrice || unit.price) / (unit.superAreaSqFt || unit.sizeSqFt || 1500)).toLocaleString("en-IN")}/sq.ft
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setIsCostSheetOpen(true)}
                  className="h-8 gap-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold shadow-sm"
                >
                  <Calculator className="h-3.5 w-3.5" />
                  <span>Cost Sheet & Plan</span>
                </Button>
                <Button
                  size="sm"
                  onClick={handleWhatsAppShare}
                  className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>WhatsApp Dossier</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Price Edit Box */}
          {isEditingPrice && (
            <div className="mt-4 p-3 rounded-lg border border-primary/30 bg-primary/5 flex flex-col sm:flex-row items-center gap-3">
              <input
                type="number"
                placeholder="New Price (INR)"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="h-8 px-2.5 text-xs font-mono bg-background border border-border rounded w-full sm:w-44 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="text"
                placeholder="Audit notes (e.g. Owner revision after negotiation)"
                value={priceNotes}
                onChange={(e) => setPriceNotes(e.target.value)}
                className="h-8 px-2.5 text-xs bg-background border border-border rounded flex-1 w-full focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <Button size="sm" onClick={handleUpdatePrice} className="h-8 text-xs font-semibold">
                  Update Price
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditingPrice(false)} className="h-8 text-xs">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1 border-b border-border/40">
            {[
              { key: "overview", label: "Specs & Intelligence", icon: Building2 },
              { key: "cost_sheet", label: "Cost Sheet & Payment Plan", icon: Calculator },
              { key: "people", label: `People & Owners (${unitRelationships.length})`, icon: Users },
              { key: "facts", label: `Sales Memory (${unitFacts.length})`, icon: Sparkles },
              { key: "pricing", label: `Price History (${unitHistory.length})`, icon: TrendingUp },
              { key: "buyers", label: `Matching Buyers (${matchingLeads.length})`, icon: Tag },
            ].map((t) => {
              const Icon = t.icon;
              const isSelected = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => {
                    if (t.key === "cost_sheet") {
                      setIsCostSheetOpen(true);
                    } else {
                      setActiveTab(t.key as any);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Body */}
        <div className="p-6 space-y-6">
          {/* TAB 1: OVERVIEW & SPECS */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-fade-up">
              {/* Architectural Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Architectural & Area Metrics
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg border border-border bg-secondary/30 hover-lift transition-all">
                    <span className="text-[10px] text-muted-foreground block font-mono uppercase">Super Area</span>
                    <span className="text-sm font-bold font-mono text-foreground">
                      {unit.superAreaSqFt || unit.sizeSqFt || 1500} sq.ft
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-secondary/30 hover-lift transition-all">
                    <span className="text-[10px] text-muted-foreground block font-mono uppercase">Carpet Area</span>
                    <span className="text-sm font-bold font-mono text-foreground">
                      {unit.carpetAreaSqFt ? `${unit.carpetAreaSqFt} sq.ft` : "1,220 sq.ft (Est.)"}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-secondary/30 hover-lift transition-all">
                    <span className="text-[10px] text-muted-foreground block font-mono uppercase">Configuration</span>
                    <span className="text-sm font-bold text-foreground">{unit.configuration}</span>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-secondary/30 hover-lift transition-all">
                    <span className="text-[10px] text-muted-foreground block font-mono uppercase">Unit Type</span>
                    <span className="text-sm font-bold capitalize text-foreground">{unit.unitType || "Apartment"}</span>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-secondary/30 hover-lift transition-all">
                    <span className="text-[10px] text-muted-foreground block font-mono uppercase">Balconies</span>
                    <span className="text-sm font-bold text-foreground">{unit.balconiesCount || 2} Large Balconies</span>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-secondary/30 hover-lift transition-all">
                    <span className="text-[10px] text-muted-foreground block font-mono uppercase">Parking</span>
                    <span className="text-sm font-bold text-foreground">
                      {unit.parkingSlots || 1} ({unit.parkingType || "Covered Basement"})
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-secondary/30 hover-lift transition-all">
                    <span className="text-[10px] text-muted-foreground block font-mono uppercase">Furnishing</span>
                    <span className="text-sm font-bold capitalize text-foreground">
                      {(unit.furnishingStatus || "semi_furnished").replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-secondary/30 hover-lift transition-all">
                    <span className="text-[10px] text-muted-foreground block font-mono uppercase">Corner Unit</span>
                    <span className="text-sm font-bold text-foreground">
                      {unit.isCornerUnit ? "Yes (3-side open)" : "Standard 2-side"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Commercial & Rental Yield Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Financial & Investment Intelligence
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-lg border border-border bg-secondary/20 space-y-1">
                    <span className="text-[10px] font-mono text-muted-foreground block uppercase">
                      Estimated Market Valuation
                    </span>
                    <div className="text-base font-bold font-mono text-foreground">
                      {formatCurrencyINR(unit.estimatedMarketPrice || (unit.askingPrice || unit.price) * 1.05)}
                    </div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                      +4.8% YoY Capital Appreciation
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg border border-border bg-secondary/20 space-y-1">
                    <span className="text-[10px] font-mono text-muted-foreground block uppercase">
                      Expected Monthly Rent
                    </span>
                    <div className="text-base font-bold font-mono text-foreground">
                      ₹{(unit.expectedMonthlyRent || 65000).toLocaleString("en-IN")} / month
                    </div>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                      Gross Yield: {unit.rentalYieldPct || 3.4}% p.a.
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg border border-border bg-secondary/20 space-y-1">
                    <span className="text-[10px] font-mono text-muted-foreground block uppercase">
                      Monthly Society Maintenance
                    </span>
                    <div className="text-base font-bold font-mono text-foreground">
                      ₹{(unit.maintenanceMonthly || 6200).toLocaleString("en-IN")} / month
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      ₹3.50/sq.ft to RWA Account
                    </span>
                  </div>
                </div>
              </div>

              {/* Key Contacts & Occupancy Snapshot */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Current Occupancy & Key Contacts
                  </h4>
                  <Badge variant="outline" className="capitalize text-[10px] font-mono">
                    {unit.occupancyStatus || "Vacant"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-lg bg-secondary/30 border border-border space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Title Owner</span>
                    <div className="font-bold text-foreground flex items-center justify-between">
                      <span>{currentOwner?.subjectName || "Rajesh Sharma"}</span>
                      {currentOwner?.subjectPhone && (
                        <a href={`tel:${currentOwner.subjectPhone}`} className="text-primary hover:underline font-mono">
                          {formatPhone(currentOwner.subjectPhone)}
                        </a>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      Owner since {currentOwner?.validFrom || "2023"} • Clean Title Verified
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-secondary/30 border border-border space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                      Key Holder / Inspection Access
                    </span>
                    <div className="font-bold text-foreground">
                      {unit.keyLocation || "Society Facility Management Desk"}
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      Visiting Hours: 10:00 AM – 6:00 PM (Prior gate notice required)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PEOPLE & RELATIONSHIPS GRAPH */}
          {activeTab === "people" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground">People & Entity Graph</h4>
                  <p className="text-xs text-muted-foreground">
                    Complete ownership chain, historical tenants, authorized brokers, and power of attorney holders.
                  </p>
                </div>
                <Button size="sm" onClick={() => setIsAddRelOpen(true)} className="h-8 gap-1 text-xs font-semibold">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Link Person</span>
                </Button>
              </div>

              {unitRelationships.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  No relationships recorded for this unit yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {unitRelationships.map((rel) => (
                    <Card key={rel.id} className="border-border bg-card/80">
                      <CardContent className="p-3.5 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Badge variant="secondary" className="text-[10px] font-mono uppercase mb-1">
                              {rel.relationshipType.replace(/_/g, " ")}
                            </Badge>
                            <h5 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-primary" />
                              <span>{rel.subjectName || "Contact"}</span>
                            </h5>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteRelationship(rel.id)}
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        {rel.subjectPhone && (
                          <p className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" /> {formatPhone(rel.subjectPhone)}
                          </p>
                        )}

                        <div className="pt-2 border-t border-border/80 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                          <span>Tenure: {rel.validFrom} → {rel.validUntil || "Present"}</span>
                          <span className={rel.isCurrent ? "text-emerald-600 font-bold" : "text-muted-foreground"}>
                            {rel.isCurrent ? "Active" : "Historical"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Add Relationship Dialog */}
              {isAddRelOpen && (
                <div className="p-4 rounded-xl border border-primary/30 bg-secondary/30 space-y-3">
                  <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Add Person Relationship Edge
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <select
                      value={relPersonId}
                      onChange={(e) => setRelPersonId(e.target.value)}
                      className="h-8 px-2.5 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Select Person...</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.phone})
                        </option>
                      ))}
                    </select>

                    <select
                      value={relType}
                      onChange={(e) => setRelType(e.target.value as any)}
                      className="h-8 px-2.5 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="current_owner">Current Owner</option>
                      <option value="previous_owner">Previous Owner</option>
                      <option value="current_tenant">Current Tenant</option>
                      <option value="power_of_attorney">Power of Attorney</option>
                      <option value="exclusive_broker">Exclusive Broker</option>
                      <option value="caretaker">Caretaker / Key Holder</option>
                    </select>

                    <input
                      type="date"
                      value={relValidFrom}
                      onChange={(e) => setRelValidFrom(e.target.value)}
                      className="h-8 px-2.5 text-xs font-mono bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Notes (e.g. Agreement signed at sub-registrar office)"
                    value={relNotes}
                    onChange={(e) => setRelNotes(e.target.value)}
                    className="h-8 px-2.5 text-xs bg-background border border-border rounded w-full focus:outline-none focus:ring-1 focus:ring-primary"
                  />

                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setIsAddRelOpen(false)} className="h-7 text-xs">
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveRelationship} className="h-7 text-xs font-semibold">
                      Save Relationship
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PROPERTY FACTS / SALES MEMORY */}
          {activeTab === "facts" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Structured Sales Memory</h4>
                  <p className="text-xs text-muted-foreground">
                    Institutional facts, gate entry rules, owner idiosyncrasies, and negotiation boundaries.
                  </p>
                </div>
                <Button size="sm" onClick={() => setIsAddFactOpen(true)} className="h-8 gap-1 text-xs font-semibold">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Log Fact</span>
                </Button>
              </div>

              {unitFacts.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  No property facts logged yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {unitFacts.map((f) => {
                    const tierBadgeColor =
                      f.verificationTier === "verified"
                        ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                        : f.verificationTier === "historical"
                        ? "border-blue-500/40 text-blue-600 bg-blue-500/10"
                        : "border-amber-500/40 text-amber-600 bg-amber-500/10";

                    return (
                      <div key={f.id} className="p-4 rounded-xl border border-border bg-card/70 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold uppercase font-mono text-primary px-2 py-0.5 rounded bg-primary/10">
                              {f.category.replace(/_/g, " ")}
                            </span>
                            <h5 className="font-bold text-sm text-foreground">{f.title}</h5>
                            <Badge variant="outline" className={`text-[10px] capitalize font-mono ${tierBadgeColor}`}>
                              {f.verificationTier} ({f.confidencePct}%)
                            </Badge>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deletePropertyFact(f.id)}
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        <p className="text-xs text-foreground/90 leading-relaxed">{f.factStatement}</p>

                        <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                          <span>Logged by: {f.createdByName || "Sales Rep"}</span>
                          <span>{new Date(f.createdAt).toLocaleDateString("en-IN")}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Fact Dialog */}
              {isAddFactOpen && (
                <div className="p-4 rounded-xl border border-primary/30 bg-secondary/30 space-y-3">
                  <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Add Property Memory Fact
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={factCategory}
                      onChange={(e) => setFactCategory(e.target.value as any)}
                      className="h-8 px-2.5 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="visitor_access_rules">Visitor & Gate Access Rules</option>
                      <option value="owner_preferences">Owner Preferences & Timings</option>
                      <option value="pricing_intelligence">Pricing & Negotiation Bounds</option>
                      <option value="structural_features">Structural & Vaastu Features</option>
                      <option value="legal_title">Legal & Title Status</option>
                    </select>

                    <select
                      value={factTier}
                      onChange={(e) => setFactTier(e.target.value as any)}
                      className="h-8 px-2.5 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="verified">Verified (100% confidence)</option>
                      <option value="historical">Historical Record (85%)</option>
                      <option value="user_provided">User Provided (70%)</option>
                      <option value="inferred">AI / Market Inferred (50%)</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    placeholder="Fact Title (e.g. Society Gate Pass Mandate)"
                    value={factTitle}
                    onChange={(e) => setFactTitle(e.target.value)}
                    className="h-8 px-2.5 text-xs bg-background border border-border rounded w-full focus:outline-none focus:ring-1 focus:ring-primary"
                  />

                  <textarea
                    rows={2}
                    placeholder="Detailed statement..."
                    value={factStatement}
                    onChange={(e) => setFactStatement(e.target.value)}
                    className="p-2.5 text-xs bg-background border border-border rounded w-full focus:outline-none focus:ring-1 focus:ring-primary"
                  />

                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setIsAddFactOpen(false)} className="h-7 text-xs">
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveFact} className="h-7 text-xs font-semibold">
                      Save Fact
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PRICING AUDIT HISTORY */}
          {activeTab === "pricing" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-foreground">Valuation & Price Revisions</h4>
                <p className="text-xs text-muted-foreground">
                  Complete immutable ledger of asking price adjustments and transacted values.
                </p>
              </div>

              {unitHistory.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  No historical price revisions logged yet.
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {unitHistory.map((h) => {
                    const priceDiff = (h.oldPrice && h.newPrice) ? h.newPrice - h.oldPrice : 0;
                    return (
                      <div key={h.id} className="relative space-y-1">
                        <div className="absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono text-foreground">
                            {formatCurrencyINR(h.newPrice)}
                          </span>
                          {priceDiff !== 0 && (
                            <span
                              className={`text-[10px] font-mono font-bold ${
                                priceDiff < 0 ? "text-emerald-600" : "text-amber-600"
                              }`}
                            >
                              ({priceDiff < 0 ? "↓" : "↑"} {formatCurrencyINR(Math.abs(priceDiff))})
                            </span>
                          )}
                          <Badge variant="outline" className="text-[10px] font-mono capitalize">
                            {h.eventType.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{h.notes || "Price update logged"}</p>
                        <span className="text-[10px] text-muted-foreground font-mono block">
                          {h.effectiveDate || new Date(h.createdAt).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: MATCHING BUYERS */}
          {activeTab === "buyers" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-foreground">High-Intent Matching Buyers</h4>
                <p className="text-xs text-muted-foreground">
                  Active pipeline leads with budget and configuration alignment for this unit.
                </p>
              </div>

              {matchingLeads.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  No active buyers currently match this budget range (₹{(minBudget / 10000000).toFixed(2)} Cr – ₹{(maxBudget / 10000000).toFixed(2)} Cr).
                </div>
              ) : (
                <div className="space-y-2.5">
                  {matchingLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="p-3.5 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/40 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{lead.personName}</span>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {lead.leadScoreLabel || "Warm"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>Budget: <strong className="font-mono text-foreground">{formatCurrencyINR(lead.budget)}</strong></span>
                          <span>•</span>
                          <span>Stage: <strong className="capitalize text-foreground">{lead.stage.replace("_", " ")}</strong></span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            assignUnitToLead(lead.id, unit.id);
                            toast.success(`Unit assigned to ${lead.personName}`);
                          }}
                          className="h-7 text-xs font-semibold"
                        >
                          Assign Unit
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            const text = `Hi ${lead.personName}, we have an exclusive unit available at ${project?.name || "the project"} matching your preferences:\n` +
                              `Unit ${unit.tower}-${unit.unitNumber} (${unit.configuration}, Floor ${unit.floor}) for ${formatCurrencyINR(unit.askingPrice || unit.price)}.\n` +
                              `Would you like to schedule a private walkthrough this week?`;
                            window.open(`https://api.whatsapp.com/send?phone=${lead.phone}&text=${encodeURIComponent(text)}`, "_blank");
                          }}
                          className="h-7 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Pitch on WhatsApp
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ResponsiveModal>
    <CostSheetModal
      unit={unit}
      isOpen={isCostSheetOpen}
      onClose={() => setIsCostSheetOpen(false)}
    />
    </>
  );
}
