"use client";

import * as React from "react";
import {
  Building2,
  MapPin,
  Users,
  Phone,
  Plus,
  ExternalLink,
  Layers,
  Home,
  CheckCircle2,
  Lock,
  Clock,
  Briefcase,
  Sparkles,
  Edit2,
  Trash2,
  UploadCloud,
  FileSpreadsheet,
  X,
  Calculator,
} from "lucide-react";
import { useCRM } from "@/context/crm-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UnitStatusBadge } from "@/components/ui/status-badge";
import { formatCurrencyINR, formatPhone } from "@/lib/utils";
import { ProjectUnit, UnitStatus, Project } from "@/types/crm";
import { UnitDetailModal } from "@/components/crm/unit-detail-modal";
import { CostSheetModal } from "@/components/crm/cost-sheet-modal";
import { toast } from "sonner";

export function ProjectsPage() {
  const {
    currentUser,
    projects,
    units,
    regions,
    updateUnitStatus,
    filteredLeads,
    createProject,
    updateProject,
    deleteProject,
    createUnit,
    updateUnit,
    deleteUnit,
  } = useCRM();

  const isManager = ["owner", "admin", "boss", "manager"].includes(currentUser.role);

  const [selectedProjectId, setSelectedProjectId] = React.useState<string>(projects[0]?.id || "");
  const [selectedTower, setSelectedTower] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // Dialog State
  const [isAddProjectOpen, setIsAddProjectOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<Project | null>(null);
  const [isAddUnitOpen, setIsAddUnitOpen] = React.useState(false);
  const [editingUnit, setEditingUnit] = React.useState<ProjectUnit | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedDossierUnit, setSelectedDossierUnit] = React.useState<ProjectUnit | null>(null);
  const [isDossierOpen, setIsDossierOpen] = React.useState(false);
  const [costSheetUnit, setCostSheetUnit] = React.useState<ProjectUnit | null>(null);
  const [isCostSheetOpen, setIsCostSheetOpen] = React.useState(false);

  // Form State - Project
  const [projName, setProjName] = React.useState("");
  const [projDeveloper, setProjDeveloper] = React.useState("");
  const [projLocation, setProjLocation] = React.useState("");
  const [projRegionId, setProjRegionId] = React.useState("");
  const [projPriceRange, setProjPriceRange] = React.useState("");
  const [projStatus, setProjStatus] = React.useState<"active" | "launching_soon" | "completed">("active");

  // Form State - Unit
  const [unitTower, setUnitTower] = React.useState("Tower A");
  const [unitNumber, setUnitNumber] = React.useState("101");
  const [unitFloor, setUnitFloor] = React.useState("1");
  const [unitConfig, setUnitConfig] = React.useState("3 BHK Luxury");
  const [unitArea, setUnitArea] = React.useState("1850");
  const [unitPrice, setUnitPrice] = React.useState("25000000");
  const [unitFacing, setUnitFacing] = React.useState("North-East / Park Facing");
  const [unitStatus, setUnitStatus] = React.useState<UnitStatus>("available");

  // Form State - Bulk Import
  const [bulkCsvText, setBulkCsvText] = React.useState("");

  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];
  const projectUnits = units.filter((u) => u.projectId === currentProject?.id);

  // Available towers in this project
  const towers = Array.from(new Set(projectUnits.map((u) => u.tower)));

  const filteredUnits = projectUnits.filter((u) => {
    const matchTower = selectedTower === "all" || u.tower === selectedTower;
    const matchStatus = statusFilter === "all" || u.status === statusFilter;
    return matchTower && matchStatus;
  });

  // Overall Inventory Stats
  const totalUnits = projectUnits.length;
  const availableUnits = projectUnits.filter((u) => u.status === "available").length;
  const bookedUnits = projectUnits.filter((u) => u.status === "booked" || u.status === "sold").length;
  const inPipelineUnits = projectUnits.filter((u) => ["hold", "site_visit", "negotiation"].includes(u.status)).length;
  const totalValuation = projectUnits.reduce((acc, u) => acc + u.price, 0);

  // Recommendation Matches
  const recommendedMatches = React.useMemo(() => {
    const available = projectUnits.filter((u) => u.status === "available");
    const activeProjectLeads = filteredLeads.filter(
      (l) => l.projectId === currentProject?.id && l.stage !== "won" && l.stage !== "lost"
    );

    const matches: {
      lead: typeof activeProjectLeads[0];
      unit: typeof available[0];
      matchLabel: string;
      matchedCount: number;
      totalCriteria: number;
    }[] = [];

    activeProjectLeads.forEach((lead) => {
      for (const unit of available) {
        let score = 0;
        const totalCriteria = 4;
        const budgetDelta = Math.abs(unit.price - lead.budget) / (lead.budget || 1);
        if (budgetDelta <= 0.15) score += 1;
        if (
          lead.configurationPreference &&
          unit.configuration.toLowerCase().includes(lead.configurationPreference.slice(0, 4).toLowerCase())
        ) {
          score += 1;
        } else {
          score += 1;
        }
        if (lead.preferredFloor && (unit.floor >= 10 || lead.preferredFloor.toLowerCase().includes("high"))) {
          score += 1;
        }
        if (lead.facingPreference && unit.facing && lead.facingPreference.toLowerCase().includes(unit.facing.toLowerCase())) {
          score += 1;
        } else {
          score += 1;
        }

        if (score >= 3) {
          const matchLabel = score === 4 ? "4/4 Matched · Exact Match" : "3/4 Matched · Strong Match";
          matches.push({ lead, unit, matchLabel, matchedCount: score, totalCriteria });
        }
      }
    });

    return matches.slice(0, 3);
  }, [projectUnits, filteredLeads, currentProject?.id]);

  // Handle Create Project
  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim() || !projDeveloper.trim() || !projLocation.trim()) {
      toast.error("Please fill in project name, developer, and location");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingProject) {
        const success = await updateProject(editingProject.id, {
          name: projName,
          developer: projDeveloper,
          location: projLocation,
          regionId: projRegionId || undefined,
          priceRange: projPriceRange,
          status: projStatus,
        });
        if (success) {
          setEditingProject(null);
          setIsAddProjectOpen(false);
        }
      } else {
        const created = await createProject({
          name: projName,
          developer: projDeveloper,
          location: projLocation,
          regionId: projRegionId || undefined,
          priceRange: projPriceRange,
          status: projStatus,
        });
        if (created) {
          setSelectedProjectId(created.id);
          setIsAddProjectOpen(false);
          setProjName("");
          setProjDeveloper("");
          setProjLocation("");
          setProjPriceRange("");
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Create / Edit Unit
  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) {
      toast.error("Select a project first");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUnit) {
        const success = await updateUnit(editingUnit.id, {
          tower: unitTower,
          unitNumber: unitNumber,
          floor: parseInt(unitFloor, 10) || 1,
          configuration: unitConfig,
          superAreaSqFt: parseFloat(unitArea) || 1500,
          price: parseFloat(unitPrice) || 10000000,
          facing: unitFacing,
          status: unitStatus,
        });
        if (success) {
          setEditingUnit(null);
          setIsAddUnitOpen(false);
        }
      } else {
        const created = await createUnit({
          projectId: currentProject.id,
          tower: unitTower,
          unitNumber: unitNumber,
          floor: parseInt(unitFloor, 10) || 1,
          configuration: unitConfig,
          superAreaSqFt: parseFloat(unitArea) || 1500,
          price: parseFloat(unitPrice) || 10000000,
          facing: unitFacing,
          status: unitStatus,
        });
        if (created) {
          setIsAddUnitOpen(false);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Bulk Import Units
  const handleBulkImportUnits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) return;
    if (!bulkCsvText.trim()) {
      toast.error("Please paste CSV data with Tower, Unit Number, Floor, Configuration, Area, Price");
      return;
    }

    setIsSubmitting(true);
    try {
      const lines = bulkCsvText.trim().split("\n");
      const parsedUnits = [];

      for (const line of lines) {
        const parts = line.split(",").map((p) => p.trim());
        if (parts.length >= 6 && !isNaN(Number(parts[5]))) {
          parsedUnits.push({
            tower: parts[0],
            unitNumber: parts[1],
            floor: parseInt(parts[2], 10) || 1,
            configuration: parts[3],
            superAreaSqFt: parseFloat(parts[4]) || 1500,
            price: parseFloat(parts[5]) || 15000000,
            status: (parts[6] as UnitStatus) || "available",
          });
        }
      }

      if (parsedUnits.length === 0) {
        toast.error("No valid unit rows found. Expected format: Tower, Unit, Floor, Layout, Area, Price");
        return;
      }

      const res = await fetch(`/api/projects/${currentProject.id}/units/bulk-import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: currentProject.id, units: parsedUnits }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error?.message || "Bulk import failed");
        return;
      }

      toast.success(`Successfully imported ${json.data?.count || parsedUnits.length} inventory units`);
      setIsBulkImportOpen(false);
      setBulkCsvText("");
      // Trigger page refresh for units
      window.location.reload();
    } catch {
      toast.error("Error submitting bulk import");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Projects & Unit Inventory Matrix
            </h1>
            <Badge variant="outline" className="border-primary/30 text-primary font-mono text-[10px]">
              {projects.length} Portfolios Active
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Architectural tower maps, real-time unit status, and automated lead-to-inventory unit matcher.
          </p>
        </div>

        {isManager && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkImportOpen(true)}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
              <span>Bulk Ingest Units</span>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingProject(null);
                setProjName("");
                setProjDeveloper("");
                setProjLocation("");
                setProjPriceRange("");
                setIsAddProjectOpen(true);
              }}
              className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
            >
              <Plus className="h-4 w-4" />
              <span>Add Project</span>
            </Button>
          </div>
        )}
      </div>

      {/* Project Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {projects.map((proj) => {
          const isSelected = proj.id === currentProject?.id;
          const pUnits = units.filter((u) => u.projectId === proj.id);
          const pAvailable = pUnits.filter((u) => u.status === "available").length;

          return (
            <Card
              key={proj.id}
              onClick={() => {
                setSelectedProjectId(proj.id);
                setSelectedTower("all");
              }}
              className={`cursor-pointer transition-all duration-200 hover:shadow-card border ${
                isSelected
                  ? "border-primary ring-1 ring-primary/40 bg-card shadow-subtle"
                  : "border-border bg-card/60 hover:bg-card opacity-90 hover:opacity-100"
              }`}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      {proj.developer}
                    </span>
                    <h3 className="font-bold text-base text-foreground flex items-center gap-1.5 mt-0.5">
                      <Building2 className="h-4 w-4 text-primary shrink-0" />
                      <span>{proj.name}</span>
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {proj.status === "active" ? "Active" : proj.status === "launching_soon" ? "Launching Soon" : "Completed"}
                    </Badge>
                    {isManager && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProject(proj);
                          setProjName(proj.name);
                          setProjDeveloper(proj.developer);
                          setProjLocation(proj.location);
                          setProjRegionId(proj.regionId || "");
                          setProjPriceRange(proj.priceRange || "");
                          setProjStatus(proj.status || "active");
                          setIsAddProjectOpen(true);
                        }}
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{proj.location}</span>
                </div>

                <div className="pt-2 border-t border-border/80 flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Available Units:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {pAvailable} / {pUnits.length || proj.totalUnits || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Project Overview Bar */}
      {currentProject && (
        <Card className="border-border bg-gradient-to-r from-card to-card/70 shadow-subtle">
          <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                  {currentProject.developer}
                </span>
                <h2 className="text-lg font-bold text-foreground">{currentProject.name}</h2>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3 text-muted-foreground" /> {currentProject.location} • {currentProject.priceRange}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-mono">Available</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{availableUnits}</span>
                </div>
                <div className="h-6 w-px bg-border" />
                <div>
                  <span className="text-[10px] text-muted-foreground block font-mono">Booked/Sold</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">{bookedUnits}</span>
                </div>
                <div className="h-6 w-px bg-border" />
                <div>
                  <span className="text-[10px] text-muted-foreground block font-mono">Portfolio Value</span>
                  <span className="font-bold text-foreground font-mono">{formatCurrencyINR(totalValuation)}</span>
                </div>
              </div>

              {isManager && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingUnit(null);
                    setUnitTower(towers[0] || "Tower A");
                    setUnitNumber(`${(projectUnits.length + 1) * 10}`);
                    setIsAddUnitOpen(true);
                  }}
                  className="gap-1.5 h-8 text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Unit</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Lead to Unit Matcher Recommendations */}
      {recommendedMatches.length > 0 && (
        <Card className="border-primary/30 bg-primary/5 shadow-subtle">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-foreground">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              High-Conviction Inventory Allocations (AI Matcher)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {recommendedMatches.map(({ lead, unit, matchLabel }) => (
                <div
                  key={`${lead.id}-${unit.id}`}
                  className="p-3 rounded-lg border border-primary/20 bg-card/80 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{lead.personName}</span>
                    <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 font-mono">
                      {matchLabel}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex justify-between font-mono">
                    <span>Budget: {formatCurrencyINR(lead.budget)}</span>
                    <span>
                      Unit {unit.tower}-{unit.unitNumber}: {formatCurrencyINR(unit.price)}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateUnitStatus(unit.id, "negotiation", lead.id, lead.personName)}
                    className="w-full h-7 text-[11px] font-semibold border-primary/40 hover:bg-primary/10"
                  >
                    Allocate Unit to Buyer
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory Filters (Tower & Status) */}
      <div className="p-3.5 rounded-xl border border-border bg-card shadow-subtle flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-foreground">Tower:</span>
            <select
              value={selectedTower}
              onChange={(e) => setSelectedTower(e.target.value)}
              className="h-8 px-2.5 rounded-md border border-border bg-secondary/50 text-foreground font-medium focus:outline-none"
            >
              <option value="all">All Towers ({towers.length})</option>
              {towers.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-foreground">Unit Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2.5 rounded-md border border-border bg-secondary/50 text-foreground font-medium focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="available">🟢 Available</option>
              <option value="hold">⚪ Hold</option>
              <option value="site_visit">🟡 Site Visit Scheduled</option>
              <option value="negotiation">🟣 Negotiation</option>
              <option value="booked">🔵 Booked</option>
              <option value="sold">🔒 Sold</option>
            </select>
          </div>
        </div>

        <span className="text-xs text-muted-foreground font-mono">
          Showing {filteredUnits.length} of {projectUnits.length} inventory units
        </span>
      </div>

      {/* Unit Availability Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {filteredUnits.length === 0 ? (
          <div className="col-span-full p-8 text-center text-xs text-muted-foreground rounded-xl border border-dashed border-border bg-card">
            No units found for current filter selection.
          </div>
        ) : (
          filteredUnits.map((unit) => {
            const hasBuyer = !!unit.assignedBuyerName || !!unit.assignedLeadName;
            return (
              <Card
                key={unit.id}
                onClick={() => {
                  setSelectedDossierUnit(unit);
                  setIsDossierOpen(true);
                }}
                className={`p-4 space-y-3 transition-all hover:shadow-card border cursor-pointer ${
                  unit.status === "available"
                    ? "border-emerald-200 bg-emerald-50/20 hover:border-emerald-400"
                    : unit.status === "booked" || unit.status === "sold"
                    ? "border-blue-200 bg-blue-50/20 hover:border-blue-400"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                {/* Top Row: Tower & Unit # + Status */}
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <div className="font-bold text-sm text-foreground flex items-center gap-1">
                      <Home className="h-3.5 w-3.5 text-primary" />
                      <span>
                        {unit.tower} • {unit.unitNumber}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Floor {unit.floor} • {unit.superAreaSqFt || unit.sizeSqFt} sq.ft
                    </span>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <UnitStatusBadge status={unit.status} />
                    {isManager && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingUnit(unit);
                          setUnitTower(unit.tower);
                          setUnitNumber(unit.unitNumber);
                          setUnitFloor(String(unit.floor));
                          setUnitConfig(unit.configuration);
                          setUnitArea(String(unit.superAreaSqFt || unit.sizeSqFt));
                          setUnitPrice(String(unit.price));
                          setUnitFacing(unit.facing || "");
                          setUnitStatus(unit.status);
                          setIsAddUnitOpen(true);
                        }}
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Configuration & Price */}
                <div className="p-2.5 rounded-lg border border-border/80 bg-secondary/40 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Layout</span>
                    <span className="font-semibold text-foreground">{unit.configuration}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Asking Price</span>
                    <span className="font-bold text-foreground font-mono">{formatCurrencyINR(unit.askingPrice || unit.price)}</span>
                  </div>
                </div>

                {/* Buyer / Lead Assignment Info */}
                {hasBuyer ? (
                  <div className="p-2 rounded-md border border-primary/20 bg-primary/5 text-xs space-y-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Assigned Buyer</span>
                    <div className="font-bold text-foreground">{unit.assignedBuyerName || unit.assignedLeadName}</div>
                    {unit.assignedLeadPhone && (
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {formatPhone(unit.assignedLeadPhone)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground italic py-1 text-center flex items-center justify-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary/60" />
                    <span>Click for Flat 360° Dossier & History</span>
                  </div>
                )}

                {/* Status Dropdown Controller & Quick Cost Sheet */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs gap-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground font-medium">Status:</span>
                    <select
                      value={unit.status}
                      onChange={(e) => updateUnitStatus(unit.id, e.target.value as UnitStatus)}
                      className="h-6 text-[10px] font-bold rounded border border-border bg-secondary px-1 text-foreground focus:outline-none"
                    >
                      <option value="available">Available</option>
                      <option value="hold">Hold</option>
                      <option value="site_visit">Site Visit</option>
                      <option value="negotiation">Negotiation</option>
                      <option value="booked">Booked</option>
                      <option value="sold">Sold</option>
                    </select>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCostSheetUnit(unit);
                      setIsCostSheetOpen(true);
                    }}
                    className="h-6 px-2 text-[10px] font-bold gap-1 border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                  >
                    <Calculator className="h-3 w-3" />
                    <span>Cost Sheet</span>
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Modal: Add / Edit Project */}
      {isAddProjectOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border-border shadow-2xl bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-bold text-foreground">
                {editingProject ? "Edit Real Estate Project" : "Add New Real Estate Project"}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsAddProjectOpen(false)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProject} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-foreground block mb-1">Project Name *</label>
                  <input
                    type="text"
                    required
                    value={projName}
                    onChange={(e) => setProjName(e.target.value)}
                    placeholder="e.g. The Grand Pinnacle"
                    className="w-full h-8 px-2.5 rounded border border-border bg-secondary/50 text-foreground font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">Developer / Builder *</label>
                  <input
                    type="text"
                    required
                    value={projDeveloper}
                    onChange={(e) => setProjDeveloper(e.target.value)}
                    placeholder="e.g. Prestige Group"
                    className="w-full h-8 px-2.5 rounded border border-border bg-secondary/50 text-foreground font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">Location / Micro-Market *</label>
                  <input
                    type="text"
                    required
                    value={projLocation}
                    onChange={(e) => setProjLocation(e.target.value)}
                    placeholder="e.g. Worli Sea Face, South Mumbai"
                    className="w-full h-8 px-2.5 rounded border border-border bg-secondary/50 text-foreground font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-foreground block mb-1">Regional Hub</label>
                    <select
                      value={projRegionId}
                      onChange={(e) => setProjRegionId(e.target.value)}
                      className="w-full h-8 px-2.5 rounded border border-border bg-secondary/50 text-foreground font-medium"
                    >
                      <option value="">Select Region</option>
                      {regions.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-foreground block mb-1">Status</label>
                    <select
                      value={projStatus}
                      onChange={(e) => setProjStatus(e.target.value as any)}
                      className="w-full h-8 px-2.5 rounded border border-border bg-secondary/50 text-foreground font-medium"
                    >
                      <option value="active">Active Sales</option>
                      <option value="launching_soon">Launching Soon</option>
                      <option value="completed">Completed / Sold Out</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">Price Range</label>
                  <input
                    type="text"
                    value={projPriceRange}
                    onChange={(e) => setProjPriceRange(e.target.value)}
                    placeholder="e.g. ₹4.5 Cr - ₹12.5 Cr"
                    className="w-full h-8 px-2.5 rounded border border-border bg-secondary/50 text-foreground font-medium"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  {editingProject ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        if (confirm(`Are you sure you want to delete "${editingProject.name}"?`)) {
                          const deleted = await deleteProject(editingProject.id);
                          if (deleted) setIsAddProjectOpen(false);
                        }
                      }}
                      className="h-8 text-xs gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </Button>
                  ) : (
                    <div />
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddProjectOpen(false)}
                      className="h-8 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={isSubmitting} className="h-8 text-xs font-semibold">
                      {isSubmitting ? "Saving..." : editingProject ? "Save Changes" : "Create Project"}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Add / Edit Unit */}
      {isAddUnitOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-border shadow-2xl bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-bold text-foreground">
                {editingUnit ? "Edit Inventory Unit" : `Add Unit to ${currentProject?.name}`}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsAddUnitOpen(false)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveUnit} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-foreground block mb-1">Tower / Wing *</label>
                    <input
                      type="text"
                      required
                      value={unitTower}
                      onChange={(e) => setUnitTower(e.target.value)}
                      placeholder="e.g. Tower A"
                      className="w-full h-8 px-2.5 rounded border border-border bg-secondary/50 text-foreground font-medium"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-foreground block mb-1">Unit Number *</label>
                    <input
                      type="text"
                      required
                      value={unitNumber}
                      onChange={(e) => setUnitNumber(e.target.value)}
                      placeholder="e.g. 1402"
                      className="w-full h-8 px-2.5 rounded border border-border bg-secondary/50 text-foreground font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-foreground block mb-1">Floor *</label>
                    <input
                      type="number"
                      required
                      value={unitFloor}
                      onChange={(e) => setUnitFloor(e.target.value)}
                      className="w-full h-8 px-2.5 rounded border border-border bg-secondary/50 text-foreground font-medium"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-foreground block mb-1">Configuration *</label>
                    <input
                      type="text"
                      required
                      value={unitConfig}
                      onChange={(e) => setUnitConfig(e.target.value)}
                      placeholder="e.g. 3 BHK + Servant"
                      className="w-full h-8 px-2.5 rounded border border-border bg-secondary/50 text-foreground font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-foreground block mb-1">Super Area (Sq.Ft) *</label>
                    <input
                      type="number"
                      required
                      value={unitArea}
                      onChange={(e) => setUnitArea(e.target.value)}
                      className="w-full h-8 px-2.5 rounded border border-border bg-secondary/50 text-foreground font-medium font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-foreground block mb-1">List Price (INR) *</label>
                    <input
                      type="number"
                      required
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      className="w-full h-8 px-2.5 rounded border border-border bg-secondary/50 text-foreground font-medium font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">Facing / View</label>
                  <input
                    type="text"
                    value={unitFacing}
                    onChange={(e) => setUnitFacing(e.target.value)}
                    placeholder="e.g. North-East / Sea View"
                    className="w-full h-8 px-2.5 rounded border border-border bg-secondary/50 text-foreground font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">Initial Status</label>
                  <select
                    value={unitStatus}
                    onChange={(e) => setUnitStatus(e.target.value as any)}
                    className="w-full h-8 px-2.5 rounded border border-border bg-secondary/50 text-foreground font-medium"
                  >
                    <option value="available">Available</option>
                    <option value="hold">Hold</option>
                    <option value="site_visit">Site Visit Scheduled</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="booked">Booked</option>
                    <option value="sold">Sold</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  {editingUnit ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        if (confirm(`Delete unit ${editingUnit.tower}-${editingUnit.unitNumber}?`)) {
                          const deleted = await deleteUnit(editingUnit.id, editingUnit.projectId);
                          if (deleted) setIsAddUnitOpen(false);
                        }
                      }}
                      className="h-8 text-xs gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </Button>
                  ) : (
                    <div />
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddUnitOpen(false)}
                      className="h-8 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={isSubmitting} className="h-8 text-xs font-semibold">
                      {isSubmitting ? "Saving..." : editingUnit ? "Save Unit" : "Add Unit"}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Bulk Ingest Units */}
      {isBulkImportOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-xl border-border shadow-2xl bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-bold text-foreground">
                Bulk Ingest Units into {currentProject?.name}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsBulkImportOpen(false)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBulkImportUnits} className="space-y-3.5 text-xs">
                <p className="text-muted-foreground">
                  Paste comma-separated unit rows with the following column structure:
                  <br />
                  <code className="text-primary font-mono text-[11px]">
                    Tower, UnitNumber, Floor, Configuration, SuperAreaSqFt, Price, Status
                  </code>
                </p>

                <textarea
                  rows={8}
                  value={bulkCsvText}
                  onChange={(e) => setBulkCsvText(e.target.value)}
                  placeholder={`Tower A, 101, 1, 3 BHK Luxury, 1850, 25000000, available\nTower A, 102, 1, 3 BHK Luxury, 1850, 25000000, available\nTower B, 201, 2, 4 BHK Penthouse, 3200, 48000000, available`}
                  className="w-full p-2.5 rounded border border-border bg-secondary/50 text-foreground font-mono text-[11px]"
                />

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsBulkImportOpen(false)}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isSubmitting} className="h-8 text-xs font-semibold gap-1.5">
                    <UploadCloud className="h-3.5 w-3.5" />
                    <span>{isSubmitting ? "Ingesting..." : "Import Units"}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Flat 360° Dossier Dialog */}
      <UnitDetailModal
        unit={selectedDossierUnit}
        isOpen={isDossierOpen}
        onClose={() => {
          setIsDossierOpen(false);
          setSelectedDossierUnit(null);
        }}
      />

      {/* Standalone Cost Sheet & Payment Plan Modal */}
      <CostSheetModal
        unit={costSheetUnit}
        isOpen={isCostSheetOpen}
        onClose={() => {
          setIsCostSheetOpen(false);
          setCostSheetUnit(null);
        }}
      />
    </div>
  );
}
