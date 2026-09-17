"use client";

import * as React from "react";
import {
  Users,
  Search,
  Plus,
  Filter,
  Phone,
  MessageSquare,
  SlidersHorizontal,
  CheckSquare,
  Square,
  UserCheck,
  Calendar,
  FileSpreadsheet,
  ArrowUpDown,
  Download,
  Flame,
  ShieldAlert,
  ChevronDown,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { useCRM } from "@repo/core/context/crm-context";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Dialog, DialogContent, DialogTitle } from "@repo/ui/components/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@repo/ui/components/table";
import { PipelineBadge, TaskStatusBadge, DealHealthBadge, LeadScoreBadge } from "@repo/ui/components/status-badge";
import { formatCurrencyINR, formatPhone } from "@repo/core/lib/utils";
import { LeadDetailModal } from "@/components/crm/lead-detail-modal";
import { QuickActivityModal } from "@/components/crm/quick-activity-modal";
import { Lead, PipelineStage, DealHealth } from "@repo/core/types/crm";
import { actionCardProps } from "@repo/ui/components/action-card";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-device";
import { LeadCard } from "@/components/crm/lead-card";
import { FilterSheet, FilterState } from "@/components/crm/filter-sheet";

interface LeadsPageProps {
  onSelectLead?: (lead: Lead) => void;
  onOpenQuickLog?: (leadId?: string) => void;
}

export function LeadsPage({ onSelectLead, onOpenQuickLog }: LeadsPageProps = {}) {
  const isMobile = useIsMobile();
  const [filterSheetOpen, setFilterSheetOpen] = React.useState(false);
  const {
    filteredLeads,
    createLead,
    users,
    projects,
    regions,
    currentUser,
    bulkUpdateLeadsStage,
    bulkAssignLeadsRep,
    bulkScheduleFollowUp,
  } = useCRM();

  const [viewMode, setViewModeState] = React.useState<"list" | "pipeline" | "priority">("list");
  const [search, setSearch] = React.useState("");
  const [stageFilter, setStageFilter] = React.useState<string>("all");
  const [healthFilter, setHealthFilter] = React.useState<string>("all");
  const [regionFilter, setRegionFilter] = React.useState<string>("all");
  const [salespersonFilter, setSalespersonFilter] = React.useState<string>("all");
  const [projectFilter, setProjectFilter] = React.useState<string>("all");
  const [sortBy, setSortBy] = React.useState<"budget_desc" | "budget_asc" | "score_desc" | "recent">("score_desc");

  // Restore saved lead filters and viewMode on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("ecosystemrealty_leads_filters");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.viewMode) setViewModeState(parsed.viewMode);
        if (parsed.stageFilter) setStageFilter(parsed.stageFilter);
        if (parsed.healthFilter) setHealthFilter(parsed.healthFilter);
        if (parsed.regionFilter) setRegionFilter(parsed.regionFilter);
        if (parsed.salespersonFilter) setSalespersonFilter(parsed.salespersonFilter);
        if (parsed.projectFilter) setProjectFilter(parsed.projectFilter);
        if (parsed.sortBy) setSortBy(parsed.sortBy);
      }
    } catch {}
  }, []);

  const setViewMode = (mode: "list" | "pipeline" | "priority") => {
    setViewModeState(mode);
    updateFilter("viewMode", mode);
  };

  // Save filters on change
  const updateFilter = (key: string, val: string) => {
    try {
      const saved = JSON.parse(localStorage.getItem("ecosystemrealty_leads_filters") || "{}");
      localStorage.setItem("ecosystemrealty_leads_filters", JSON.stringify({ ...saved, [key]: val }));
    } catch {}
  };

  const handleStageFilterChange = (val: string) => {
    setStageFilter(val);
    updateFilter("stageFilter", val);
  };

  const handleHealthFilterChange = (val: string) => {
    setHealthFilter(val);
    updateFilter("healthFilter", val);
  };

  const handleRegionFilterChange = (val: string) => {
    setRegionFilter(val);
    updateFilter("regionFilter", val);
  };

  const handleSalespersonFilterChange = (val: string) => {
    setSalespersonFilter(val);
    updateFilter("salespersonFilter", val);
  };

  const handleProjectFilterChange = (val: string) => {
    setProjectFilter(val);
    updateFilter("projectFilter", val);
  };

  const handleSortByChange = (val: any) => {
    setSortBy(val);
    updateFilter("sortBy", val);
  };

  // Reset all filters helper
  const handleResetFilters = () => {
    setSearch("");
    setStageFilter("all");
    setHealthFilter("all");
    setRegionFilter("all");
    setSalespersonFilter("all");
    setProjectFilter("all");
    setSortBy("score_desc");
    localStorage.removeItem("ecosystemrealty_leads_filters");
  };

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [quickLogOpen, setQuickLogOpen] = React.useState(false);
  const [quickLogLeadId, setQuickLogLeadId] = React.useState<string | undefined>();

  // New Lead Dialog state
  const [newLeadOpen, setNewLeadOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");
  const [newBudget, setNewBudget] = React.useState("2500000");
  const [newProjectId, setNewProjectId] = React.useState(projects[0]?.id || "");
  const [newConfig, setNewConfig] = React.useState("OPC 53 Grade Cement");

  // Bulk action states
  const [bulkRepId, setBulkRepId] = React.useState("");
  const [bulkStage, setBulkStage] = React.useState<PipelineStage | "">("");

  const salespeople = users.filter((u) => u.role === "salesperson");

  // Filtering and Sorting
  const leads = React.useMemo(() => {
    return filteredLeads
      .filter((l) => {
        const matchSearch =
          l.personName.toLowerCase().includes(search.toLowerCase()) ||
          l.phone.includes(search) ||
          l.projectName.toLowerCase().includes(search.toLowerCase()) ||
          (l.assignedUnitNumber && l.assignedUnitNumber.toLowerCase().includes(search.toLowerCase()));

        const matchStage = stageFilter === "all" || l.stage === stageFilter;
        const matchHealth = healthFilter === "all" || l.dealHealth === healthFilter;
        const matchRegion = regionFilter === "all" || l.regionId === regionFilter;
        const matchRep = salespersonFilter === "all" || l.salespersonId === salespersonFilter;
        const matchProject = projectFilter === "all" || l.projectId === projectFilter;

        return matchSearch && matchStage && matchHealth && matchRegion && matchRep && matchProject;
      })
      .sort((a, b) => {
        if (sortBy === "budget_desc") return b.budget - a.budget;
        if (sortBy === "budget_asc") return a.budget - b.budget;
        if (sortBy === "score_desc") return (b.leadScore || 0) - (a.leadScore || 0);
        return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
      });
  }, [filteredLeads, search, stageFilter, healthFilter, regionFilter, salespersonFilter, projectFilter, sortBy]);

  const hasActiveFilters =
    search !== "" ||
    stageFilter !== "all" ||
    healthFilter !== "all" ||
    regionFilter !== "all" ||
    salespersonFilter !== "all" ||
    projectFilter !== "all";

  const activeFilterCount =
    (search !== "" ? 1 : 0) +
    (stageFilter !== "all" ? 1 : 0) +
    (healthFilter !== "all" ? 1 : 0) +
    (regionFilter !== "all" ? 1 : 0) +
    (salespersonFilter !== "all" ? 1 : 0) +
    (projectFilter !== "all" ? 1 : 0) +
    (sortBy !== "score_desc" ? 1 : 0);

  const allSelected = leads.length > 0 && selectedIds.length === leads.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map((l) => l.id));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleOpenLead = (lead: Lead) => {
    if (onSelectLead) {
      onSelectLead(lead);
    } else {
      setSelectedLead(lead);
      setDetailOpen(true);
    }
  };

  const handleLogActivity = (leadId: string) => {
    if (onOpenQuickLog) {
      onOpenQuickLog(leadId);
    } else {
      setQuickLogLeadId(leadId);
      setQuickLogOpen(true);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;

    const proj = projects.find((p) => p.id === newProjectId) || projects[0];
    try {
      await createLead({
      personId: `per-${Date.now()}`,
      personName: newName,
      phone: newPhone,
      projectId: proj.id,
      projectName: proj.name,
      regionId: proj.regionId,
      regionName: proj.regionName,
      salespersonId: currentUser.id,
      salespersonName: currentUser.name,
      budget: Number(newBudget),
      stage: "new",
      source: "Direct Manual Entry",
      leadScore: 85,
      leadScoreLabel: "Hot",
      dealHealth: "strong",
      dealHealthReason: "Fresh manual lead inquiry",
      recommendedAction: "Initial qualifying telephone conversation",
      configurationPreference: newConfig,
      daysInStage: 0,
      nextFollowUpAt: "Today, 5:00 PM",
      followUpStatus: "due_today",
      });
    } catch {
      // Live-path failure already surfaced a toast in the context; keep form
      // open so the operator can retry without retyping.
      return;
    }

    setNewName("");
    setNewPhone("");
    setNewLeadOpen(false);
  };

  const handleBulkStageChange = async (st: PipelineStage) => {
    if (selectedIds.length === 0 || !st) return;
    await bulkUpdateLeadsStage(selectedIds, st);
    setSelectedIds([]);
    setBulkStage("");
  };

  const handleBulkRepAssign = async (repId: string) => {
    if (selectedIds.length === 0 || !repId) return;
    const rep = users.find((u) => u.id === repId);
    if (!rep) return;
    await bulkAssignLeadsRep(selectedIds, rep.id, rep.name);
    setSelectedIds([]);
    setBulkRepId("");
  };

  const handleBulkFollowUp = async () => {
    if (selectedIds.length === 0) return;
    await bulkScheduleFollowUp(selectedIds, "Today", "4:00 PM");
    setSelectedIds([]);
  };

  // CSV Import State
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [importCsvText, setImportCsvText] = React.useState("");
  const [isImporting, setIsImporting] = React.useState(false);
  const [importResults, setImportResults] = React.useState<{ imported: number; duplicates: number; failed: number; errors: any[] } | null>(null);

  const handleImportCSV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importCsvText.trim()) {
      toast.error("Please paste CSV data to import");
      return;
    }

    setIsImporting(true);
    try {
      const lines = importCsvText.trim().split("\n");
      const parsedLeads = [];
      for (const line of lines) {
        const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
        if (parts.length >= 2 && parts[0] && parts[1]) {
          parsedLeads.push({
            personName: parts[0],
            phone: parts[1],
            email: parts[2] || undefined,
            budget: parseFloat(parts[3]) || 15000000,
            projectName: parts[4] || undefined,
            stage: (parts[5] as PipelineStage) || "new",
            source: parts[6] || "CSV Import",
            configurationPreference: parts[7] || undefined,
          });
        }
      }

      if (parsedLeads.length === 0) {
        toast.error("No valid lead rows found. Required columns: Name, Phone");
        return;
      }

      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: parsedLeads }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error?.message || "CSV import failed");
        return;
      }

      setImportResults(json.data);
      toast.success(`Imported ${json.data.imported} leads (${json.data.duplicates} duplicates skipped)`);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch {
      toast.error("Error submitting lead import");
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await fetch("/api/leads/export");
      if (!res.ok) {
        toast.error("Failed to generate leads export");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ecosystemrealty-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Leads CSV exported successfully");
    } catch {
      toast.error("Network error during leads export");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Contractor &amp; Supply Inquiries
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time supply pipeline, contractor dispatch bookings, and account management.
          </p>
        </div>
      </div>

      {/* View Switcher & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        {/* View Switch: List | Pipeline | Priority */}
        <div className="inline-flex p-1 rounded-xl bg-secondary/80 border border-border self-start">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "list"
                ? "bg-card text-foreground shadow-subtle font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            List Table
          </button>
          <button
            type="button"
            onClick={() => setViewMode("pipeline")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "pipeline"
                ? "bg-card text-foreground shadow-subtle font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pipeline Stages
          </button>
          <button
            type="button"
            onClick={() => setViewMode("priority")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              viewMode === "priority"
                ? "bg-card text-foreground shadow-subtle font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-3 w-3 text-amber-500" />
            <span>Priority Queue</span>
          </button>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setImportResults(null);
              setImportCsvText("");
              setIsImportOpen(true);
            }}
            className="text-xs font-semibold gap-1.5"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
            <span>Import CSV</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            className="text-xs font-semibold gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
          <Button size="sm" onClick={() => setNewLeadOpen(true)} className="gap-1.5 shadow-subtle text-xs font-semibold">
            <Plus className="h-4 w-4" />
            <span>Create New Lead</span>
          </Button>
        </div>
      </div>

      {/* CSV Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl border border-border shadow-2xl bg-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-base text-foreground">Import Leads from CSV</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsImportOpen(false)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {importResults ? (
              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-2">
                  <h4 className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                    ✅ Import Complete!
                  </h4>
                  <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                    <div className="p-2 rounded bg-card border border-border">
                      <span className="text-muted-foreground block text-[10px]">Imported</span>
                      <strong className="text-emerald-600 text-sm">{importResults.imported}</strong>
                    </div>
                    <div className="p-2 rounded bg-card border border-border">
                      <span className="text-muted-foreground block text-[10px]">Duplicates</span>
                      <strong className="text-amber-600 text-sm">{importResults.duplicates}</strong>
                    </div>
                    <div className="p-2 rounded bg-card border border-border">
                      <span className="text-muted-foreground block text-[10px]">Failed</span>
                      <strong className="text-destructive text-sm">{importResults.failed}</strong>
                    </div>
                  </div>
                </div>

                {importResults.errors && importResults.errors.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1 p-2 rounded border border-border bg-secondary/30 text-[11px] font-mono text-destructive">
                    {importResults.errors.map((e, idx) => (
                      <div key={idx}>Row {e.row}: {e.error}</div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button size="sm" onClick={() => setIsImportOpen(false)} className="text-xs">
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleImportCSV} className="space-y-3.5 text-xs">
                <p className="text-muted-foreground">
                  Paste comma-separated rows with the following column structure:
                  <br />
                  <code className="text-primary font-mono text-[11px]">
                    BuyerName, Phone, Email, Budget, ProjectName, Stage, Source, LayoutPreference
                  </code>
                </p>

                <textarea
                  rows={8}
                  value={importCsvText}
                  onChange={(e) => setImportCsvText(e.target.value)}
                  placeholder={`Rajesh Mehta, +919876543210, rajesh@example.com, 25000000, The Grand Pinnacle, new, Web Inbound, 3 BHK Luxury\nAnanya Sharma, +919823456789, ananya@example.com, 45000000, Sea Breeze Residency, site_visit, Referral, 4 BHK Penthouse`}
                  className="w-full p-2.5 rounded border border-border bg-secondary/50 text-foreground font-mono text-[11px]"
                />

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Phone numbers will be normalized to +91 E.164. Deduplicated automatically.
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsImportOpen(false)}
                      className="h-8 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={isImporting} className="h-8 text-xs font-semibold gap-1.5">
                      <UploadCloud className="h-3.5 w-3.5" />
                      <span>{isImporting ? "Importing..." : "Start Import"}</span>
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Floating / Sticky Bulk Actions Bar when items selected in list view */}
      {viewMode === "list" && selectedIds.length > 0 && (
        <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 shadow-subtle flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">
              {selectedIds.length}
            </span>
            <span className="font-bold text-foreground">Leads selected</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[11px] text-muted-foreground"
              onClick={() => setSelectedIds([])}
            >
              Clear selection
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Batch Stage Change */}
            <select
              value={bulkStage}
              onChange={(e) => handleBulkStageChange(e.target.value as PipelineStage)}
              className="h-8 px-2 rounded-md border border-border bg-card text-foreground font-medium text-xs focus:outline-none"
            >
              <option value="">Move Stage...</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="site_visit">Site Visit</option>
              <option value="negotiation">Negotiation</option>
              <option value="won">Won Deals</option>
              <option value="lost">Lost</option>
            </select>

            {/* Batch Assign Rep */}
            <select
              value={bulkRepId}
              onChange={(e) => handleBulkRepAssign(e.target.value)}
              className="h-8 px-2 rounded-md border border-border bg-card text-foreground font-medium text-xs focus:outline-none"
            >
              <option value="">Assign Rep...</option>
              {salespeople.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.regionName})
                </option>
              ))}
            </select>

            {/* Batch Schedule Follow-up */}
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs font-semibold"
              onClick={handleBulkFollowUp}
            >
              <Calendar className="h-3.5 w-3.5 mr-1" />
              Schedule Follow-up Today
            </Button>
          </div>
        </div>
      )}

      {/* Responsive Filter Toolbar */}
      {/* Mobile-Only Toolbar */}
      <div className="flex sm:hidden items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="pl-8 h-9 text-xs bg-secondary/40 rounded-xl"
          />
        </div>
        <Button
          type="button"
          variant={hasActiveFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterSheetOpen(true)}
          className="h-9 px-3 rounded-xl text-xs gap-1.5 shrink-0"
        >
          <Filter className="h-3.5 w-3.5" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="ml-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Desktop Filter Toolbar */}
      <div className="hidden sm:flex p-3 rounded-xl border border-border bg-card shadow-subtle flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative w-56 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contractor, phone, site..."
              className="pl-8 h-8 text-xs bg-secondary/40"
            />
          </div>

          {/* Site Filter */}
          <select
            value={projectFilter}
            onChange={(e) => handleProjectFilterChange(e.target.value)}
            className="h-8 px-2.5 rounded-md border border-border bg-secondary/50 text-foreground font-medium focus:outline-none"
          >
            <option value="all">All Sites ({projects.length})</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Stage Filter */}
          {viewMode !== "pipeline" && (
            <select
              value={stageFilter}
              onChange={(e) => handleStageFilterChange(e.target.value)}
              className="h-8 px-2.5 rounded-md border border-border bg-secondary/50 text-foreground font-medium focus:outline-none"
            >
              <option value="all">All Stages</option>
              <option value="new">New Inquiry</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="site_visit">Site / Lab Inspection</option>
              <option value="negotiation">Price Quotation / Khata</option>
              <option value="won">Dispatched / Won</option>
              <option value="lost">Lost</option>
            </select>
          )}

          {/* Salesperson Filter */}
          <select
            value={salespersonFilter}
            onChange={(e) => handleSalespersonFilterChange(e.target.value)}
            className="h-8 px-2.5 rounded-md border border-border bg-secondary/50 text-foreground font-medium focus:outline-none"
          >
            <option value="all">All Reps ({salespeople.length})</option>
            {salespeople.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.regionName})
              </option>
            ))}
          </select>

          {/* Sorting */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-border/80">
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => handleSortByChange(e.target.value)}
              className="h-8 px-2 rounded-md border border-border bg-secondary/50 text-foreground font-medium focus:outline-none"
            >
              <option value="score_desc">Lead Score (High to Low)</option>
              <option value="budget_desc">Order Value (High to Low)</option>
              <option value="budget_asc">Order Value (Low to High)</option>
              <option value="recent">Recently Active</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleResetFilters}
              className="h-7 text-[11px] text-muted-foreground hover:text-foreground font-semibold px-2"
            >
              Reset Filters
            </Button>
          )}
          <span className="text-xs text-muted-foreground font-mono">
            Showing {leads.length} of {filteredLeads.length} inquiries
          </span>
        </div>
      </div>

      {/* VIEW 1: PIPELINE STAGE COLUMNS */}
      {viewMode === "pipeline" && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 overflow-x-auto pb-4">
          {(["new", "contacted", "qualified", "site_visit", "negotiation", "won"] as PipelineStage[]).map((stage) => {
            const stageLeads = leads.filter((l) => l.stage === stage);
            const stageVal = stageLeads.reduce((acc, l) => acc + l.budget, 0);

            return (
              <div key={stage} className="rounded-xl border border-border bg-secondary/30 flex flex-col min-w-[240px]">
                {/* Column Header */}
                <div className="p-3 border-b border-border bg-card/60 rounded-t-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground capitalize">
                      {stage.replace("_", " ")}
                    </span>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {stageLeads.length} leads · {formatCurrencyINR(stageVal)}
                    </div>
                  </div>
                  <PipelineBadge stage={stage} />
                </div>

                {/* Cards List */}
                <div className="p-2 space-y-2.5 flex-1 min-h-[300px]">
                  {stageLeads.length === 0 ? (
                    <div className="p-4 text-center text-[11px] text-muted-foreground border border-dashed border-border/60 rounded-lg">
                      No leads in this stage
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        {...actionCardProps(() => handleOpenLead(lead), `Open lead ${lead.personName}`)}
                        className="p-3 rounded-lg border border-border bg-card shadow-subtle hover:border-primary/50 cursor-pointer transition-all space-y-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <span className="font-bold text-foreground">{lead.personName}</span>
                          <DealHealthBadge health={lead.dealHealth} />
                        </div>

                        <div className="text-[11px] text-muted-foreground">
                          {lead.projectName} {lead.assignedUnitNumber && `· Unit ${lead.assignedUnitNumber}`}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                          <span className="font-bold font-mono text-foreground">{formatCurrencyINR(lead.budget)}</span>
                          <LeadScoreBadge score={lead.leadScore} label={lead.leadScoreLabel} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: PRIORITY RANKED QUEUE */}
      {viewMode === "priority" && (
        <div className="space-y-3">
          {leads.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground bg-card rounded-xl border border-dashed border-border">
              No leads match your current filter parameters.
            </div>
          ) : (
            leads.map((lead, idx) => (
              <div
                key={lead.id}
                {...actionCardProps(() => handleOpenLead(lead), `Open priority lead ${lead.personName}`)}
                className="p-4 rounded-xl border border-border bg-card shadow-subtle hover:border-border/90 cursor-pointer transition-all space-y-2.5 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      #{idx + 1} Priority
                    </span>
                    <span className="font-bold text-base text-foreground">{lead.personName}</span>
                    <LeadScoreBadge score={lead.leadScore} label={lead.leadScoreLabel} />
                    <DealHealthBadge health={lead.dealHealth} score={lead.dealHealthScore} reason={lead.dealHealthReason} showScore />
                    <PipelineBadge stage={lead.stage} />
                  </div>

                  <div className="font-mono font-bold text-sm text-foreground">
                    {formatCurrencyINR(lead.budget)}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs p-2.5 rounded-lg bg-secondary/30 border border-border/40">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Customer Strategy:</span>
                    <span className="text-foreground/90 font-medium">{lead.lastConversationSummary || lead.lastActivityText}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-primary block">Recommended Move:</span>
                    <span className="text-foreground font-semibold">{lead.suggestedNextMove || lead.recommendedAction || "Call buyer to verify timeline"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    {lead.projectName} {lead.assignedUnitNumber && `· Unit ${lead.assignedUnitNumber}`} • Rep: <strong>{lead.salespersonName}</strong>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:${lead.phone}`}
                      className="inline-flex items-center justify-center h-7 px-2.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                    >
                      <Phone className="h-3 w-3 mr-1" />
                      Call
                    </a>
                    <a
                      href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center h-7 px-2.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      WhatsApp
                    </a>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 px-2 text-[11px] font-medium"
                      onClick={() => handleLogActivity(lead.id)}
                    >
                      Log
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VIEW 3: DATA TABLE ON DESKTOP / CARD LIST ON MOBILE */}
      {viewMode === "list" && (
        isMobile ? (
          <div className="space-y-3">
            {leads.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground bg-card rounded-xl border border-dashed border-border">
                No leads found matching current search and filter criteria.
              </div>
            ) : (
              leads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onSelect={handleOpenLead}
                  onLogActivity={handleLogActivity}
                />
              ))
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="flex items-center justify-center p-1 rounded hover:bg-secondary"
                    aria-label="Select All"
                  >
                    {allSelected ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </TableHead>
                <TableHead>Client / Contractor</TableHead>
                <TableHead>Score &amp; Health</TableHead>
                <TableHead>Target Site &amp; Material</TableHead>
                <TableHead>Order Value</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Assigned Rep</TableHead>
                <TableHead>Follow-up Schedule</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-xs text-muted-foreground">
                    No leads found matching current search and filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => {
                  const isChecked = selectedIds.includes(lead.id);
                  return (
                    <TableRow
                      key={lead.id}
                      onClick={() => handleOpenLead(lead)}
                      className={`cursor-pointer transition-colors ${
                        isChecked ? "bg-primary/5 hover:bg-primary/10" : ""
                      }`}
                    >
                      {/* Row Checkbox */}
                      <TableCell onClick={(e) => toggleSelectOne(lead.id, e)} className="w-10">
                        <div className="flex items-center justify-center">
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground/60 hover:text-foreground" />
                          )}
                        </div>
                      </TableCell>

                      {/* Client / Contractor */}
                      <TableCell>
                        <div className="font-bold text-foreground text-sm">{lead.personName}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{formatPhone(lead.phone)}</div>
                      </TableCell>

                      {/* Score & Health */}
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <LeadScoreBadge score={lead.leadScore} label={lead.leadScoreLabel} />
                          <DealHealthBadge health={lead.dealHealth} score={lead.dealHealthScore} reason={lead.dealHealthReason} showScore />
                        </div>
                      </TableCell>

                      {/* Target Site & Material */}
                      <TableCell>
                        <div className="font-medium text-foreground text-xs">{lead.projectName}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <span>{lead.configurationPreference || lead.regionName}</span>
                          {lead.assignedUnitNumber && (
                            <span className="font-mono font-bold text-foreground">· {lead.assignedUnitNumber}</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Order Value */}
                      <TableCell className="font-bold text-foreground font-mono text-xs">
                        {formatCurrencyINR(lead.budget)}
                      </TableCell>

                      {/* Stage */}
                      <TableCell>
                        <PipelineBadge stage={lead.stage} />
                      </TableCell>

                      {/* Rep */}
                      <TableCell>
                        <span className="text-xs font-semibold text-foreground">{lead.salespersonName}</span>
                      </TableCell>

                      {/* Follow-up Schedule */}
                      <TableCell>
                        <div className="text-xs font-medium text-foreground">
                          {lead.nextFollowUpAt || "—"}
                        </div>
                        <TaskStatusBadge status={lead.followUpStatus || "upcoming"} />
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`tel:${lead.phone}`}
                            className="inline-flex items-center justify-center h-7 px-2 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                          >
                            <Phone className="h-3 w-3 mr-1" />
                            Call
                          </a>
                          <a
                            href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`WhatsApp ${lead.personName}`}
                            className="inline-flex items-center justify-center h-7 px-2 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                          >
                            <MessageSquare className="h-3 w-3" />
                          </a>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 px-2 text-[11px] font-medium"
                            onClick={() => handleLogActivity(lead.id)}
                          >
                            Log
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )
      )}

      {/* Mobile Filter Sheet */}
      <FilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filters={{
          stage: stageFilter,
          health: healthFilter,
          region: regionFilter,
          salesperson: salespersonFilter,
          project: projectFilter,
          sortBy: sortBy,
        }}
        onFilterChange={(f) => {
          handleStageFilterChange(f.stage);
          handleHealthFilterChange(f.health);
          handleRegionFilterChange(f.region);
          handleSalespersonFilterChange(f.salesperson);
          handleProjectFilterChange(f.project);
          handleSortByChange(f.sortBy);
        }}
        onReset={handleResetFilters}
        projects={projects}
        regions={regions}
        salespeople={salespeople}
        activeCount={activeFilterCount}
      />

      {/* Modals */}
      <LeadDetailModal
        lead={selectedLead}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onLogActivity={handleLogActivity}
      />

      <QuickActivityModal
        open={quickLogOpen}
        onOpenChange={setQuickLogOpen}
        defaultLeadId={quickLogLeadId}
      />

      {/* Manual New Lead Modal (Radix Dialog: focus trap + Esc + aria) */}
      <Dialog open={newLeadOpen} onOpenChange={setNewLeadOpen}>
        <DialogContent className="w-full max-w-md bg-card rounded-xl border border-border p-5 space-y-4 shadow-modal">
          <DialogTitle className="text-base font-bold text-foreground">Log New Contractor / Supply Inquiry</DialogTitle>
          <form onSubmit={handleCreateLead} className="space-y-3 text-xs">
            <div className="space-y-1">
              <label htmlFor="new-lead-name" className="font-bold text-foreground">Contractor / Client Name</label>
              <Input
                id="new-lead-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Ramesh Chandra (Civil Contractor)"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="new-lead-phone" className="font-bold text-foreground">Phone Number (Indian Standard)</label>
              <Input
                id="new-lead-phone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+91 98100 XXXXX"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="new-lead-project" className="font-bold text-foreground">Target Construction Site</label>
              <select
                id="new-lead-project"
                value={newProjectId}
                onChange={(e) => setNewProjectId(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.regionName})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label htmlFor="new-lead-budget" className="font-bold text-foreground">Estimated Order Value (INR)</label>
                <Input
                  id="new-lead-budget"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                  type="number"
                  placeholder="2500000"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="new-lead-config" className="font-bold text-foreground">Material Grade / Requirement</label>
                <Input
                  id="new-lead-config"
                  value={newConfig}
                  onChange={(e) => setNewConfig(e.target.value)}
                  placeholder="e.g. OPC 53 Bulk (2,000 Bags)"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setNewLeadOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="font-semibold">
                Save Inquiry
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
