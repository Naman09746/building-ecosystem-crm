"use client";

import * as React from "react";
import {
  TrendingUp,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  RefreshCw,
  Phone,
  MessageSquare,
  ChevronRight,
  Target,
  Flame,
  Sparkles,
  Search,
  Zap,
  Footprints,
  IndianRupee,
  Camera,
} from "lucide-react";
import { useCRM } from "@repo/core/context/crm-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { Badge } from "@repo/ui/components/badge";
import { PipelineBadge, TaskStatusBadge, DealHealthBadge, LeadScoreBadge } from "@repo/ui/components/status-badge";
import { formatCurrencyINR, formatPhone } from "@repo/core/lib/utils";
import { Lead, PipelineStage } from "@repo/core/types/crm";
import { AiResurrectionModal } from "@/components/crm/ai-resurrection-modal";
import { actionCardProps } from "@repo/ui/components/action-card";

export function BossOverview({
  onSelectLead,
  onNavigateToTab,
}: {
  onSelectLead: (lead: Lead) => void;
  onNavigateToTab?: (tab: string) => void;
}) {
  const {
    filteredLeads,
    regions,
    users,
    projects,
    activities,
    selectedRegionId,
    setSelectedRegionId,
    selectedSalespersonId,
    setSelectedSalespersonId,
    selectedProjectId,
    setSelectedProjectId,
    dateRange,
    setDateRange,
    updateLeadStage,
    reactivateLead,
    reactivationLeads,
    vertical,
  } = useCRM();

  const [activeTab, setActiveTab] = React.useState<"focus" | "pipeline" | "team" | "revival">("focus");
  const [activeStageFilter, setActiveStageFilter] = React.useState<PipelineStage | "all">("all");
  const [resurrectionModalOpen, setResurrectionModalOpen] = React.useState(false);
  const [resurrectionTargetLeadId, setResurrectionTargetLeadId] = React.useState<string | undefined>();
  const [searchQuery, setSearchQuery] = React.useState("");

  // Date-range aware lead set
  const rangedLeads = React.useMemo(() => {
    if (dateRange === "all") return filteredLeads;
    const now = new Date();
    let start: Date;
    if (dateRange === "last_30_days") {
      start = new Date(now.getTime() - 30 * 864e5);
    } else if (dateRange === "this_quarter") {
      start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return filteredLeads.filter((l) => {
      const t = new Date(l.createdAt || l.lastActivityAt).getTime();
      return Number.isFinite(t) && t >= start.getTime();
    });
  }, [filteredLeads, dateRange]);

  const [serverAnalytics, setServerAnalytics] = React.useState<any>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams();
        if (dateRange) params.set("range", dateRange);
        if (selectedRegionId && selectedRegionId !== "all") params.set("region_id", selectedRegionId);
        if (selectedSalespersonId && selectedSalespersonId !== "all") params.set("salesperson_id", selectedSalespersonId);
        if (selectedProjectId && selectedProjectId !== "all") params.set("project_id", selectedProjectId);

        const res = await fetch(`/api/analytics/dashboard?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && !cancelled) {
            setServerAnalytics(json.data);
          }
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [dateRange, selectedRegionId, selectedSalespersonId, selectedProjectId]);

  // Aggregate Metrics — all computed from the same rangedLeads population/period
  const totalLeads = serverAnalytics?.summary?.totalLeads ?? rangedLeads.length;
  const totalPipelineValue = serverAnalytics?.summary?.pipelineValue ?? rangedLeads.reduce((acc, l) => acc + (l.budget || 0), 0);
  const openLeads = serverAnalytics?.summary?.openLeads ?? rangedLeads.filter((l) => l.stage !== "won" && l.stage !== "lost").length;
  const wonLeads = React.useMemo(() => rangedLeads.filter((l) => l.stage === "won"), [rangedLeads]);
  const wonDeals = serverAnalytics?.summary?.wonDeals ?? wonLeads.length;
  const wonValue = serverAnalytics?.summary?.wonRevenue ?? wonLeads.reduce((acc, l) => acc + (l.budget || 0), 0);
  const overdueLeads = React.useMemo(() => rangedLeads.filter((l) => l.followUpStatus === "overdue"), [rangedLeads]);
  const overdueCount = serverAnalytics?.summary?.overdueFollowups ?? overdueLeads.length;
  const siteVisits = serverAnalytics?.summary?.siteVisitsCount ?? rangedLeads.filter((l) => l.stage === "site_visit").length;

  // Speed-to-Lead SLA — same lead population as used everywhere
  const slaPercent = totalLeads > 0 ? Math.round(((totalLeads - overdueCount) / totalLeads) * 100) : 100;

  // Today's Activity metrics (within current dateRange)
  const callsToday = activities.filter(
    (a) => a.type === "call" && new Date(a.createdAt).toDateString() === new Date().toDateString()
  ).length;
  const visitsThisWeek = rangedLeads.filter(
    (l) => l.stage === "site_visit" && l.lastActivityAt
      ? new Date(l.lastActivityAt).getTime() >= Date.now() - 7 * 864e5
      : false
  ).length;
  const bookingsThisMonth = rangedLeads.filter(
    (l) => l.stage === "won" && l.lastActivityAt
      ? new Date(l.lastActivityAt).getMonth() === new Date().getMonth() && new Date(l.lastActivityAt).getFullYear() === new Date().getFullYear()
      : false
  ).length;

  const rangeStart = React.useMemo(() => {
    if (dateRange === "all") return new Date(0);
    if (dateRange === "last_30_days") return new Date(Date.now() - 30 * 864e5);
    if (dateRange === "this_quarter") return new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3, 1);
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  }, [dateRange]);

  const getFollowupsDone = (repId: string) =>
    activities.filter(
      (a) =>
        (a.type === "call" || a.type === "whatsapp") &&
        a.userId === repId &&
        a.createdAt &&
        new Date(a.createdAt) >= rangeStart
    ).length;

  const getAvgResponseTime = (repLeads: Lead[]): string | null => {
    const times: number[] = [];
    repLeads.forEach((l) => {
      const firstAct = activities.find(
        (a) => a.leadId === l.id && a.createdAt
      );
      if (firstAct && l.createdAt) {
        const diff = new Date(firstAct.createdAt).getTime() - new Date(l.createdAt).getTime();
        if (diff > 0) times.push(diff / 3600000);
      }
    });
    if (times.length === 0) return null;
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    return avg < 1 ? `${Math.round(avg * 60)}m` : `${avg.toFixed(1)}h`;
  };

  const getConversionRate = (repLeads: Lead[]): string => {
    const won = repLeads.filter((l) => l.stage === "won").length;
    const lost = repLeads.filter((l) => l.stage === "lost").length;
    if (won + lost === 0) return "N/A";
    return `${Math.round((won / (won + lost)) * 100)}%`;
  };

  const salespeople = users.filter((u) => u.role === "salesperson");

  // Priority Attention Items
  const atRiskDeals = rangedLeads.filter((l) => l.dealHealth === "at_risk");
  const stagnantNegotiations = rangedLeads.filter((l) => l.stage === "negotiation" && l.daysInStage >= 3);

  // Stage breakdown
  const stageAggregates = React.useMemo(() => {
    const empty: Record<string, { count: number; value: number }> = {};
    const stageKeys: PipelineStage[] = ["new", "contacted", "qualified", "site_visit", "negotiation", "won", "lost"];
    for (const key of stageKeys) empty[key] = { count: 0, value: 0 };
    for (const l of rangedLeads) {
      if (empty[l.stage]) {
        empty[l.stage].count++;
        empty[l.stage].value += l.budget || 0;
      }
    }
    return empty;
  }, [rangedLeads]);

  const stages: { key: PipelineStage; label: string; count: number; value: number; color: string }[] = [
    { key: "new", label: "New Inflow", count: stageAggregates.new.count, value: stageAggregates.new.value, color: "bg-slate-500" },
    { key: "contacted", label: "Contacted", count: stageAggregates.contacted.count, value: stageAggregates.contacted.value, color: "bg-blue-600" },
    { key: "qualified", label: "Qualified", count: stageAggregates.qualified.count, value: stageAggregates.qualified.value, color: "bg-indigo-600" },
    { key: "site_visit", label: "Site Visit", count: stageAggregates.site_visit.count, value: stageAggregates.site_visit.value, color: "bg-amber-600" },
    { key: "negotiation", label: "Negotiation", count: stageAggregates.negotiation.count, value: stageAggregates.negotiation.value, color: "bg-purple-600" },
    { key: "won", label: "Won", count: stageAggregates.won.count, value: stageAggregates.won.value, color: "bg-emerald-600" },
    { key: "lost", label: "Lost", count: stageAggregates.lost.count, value: stageAggregates.lost.value, color: "bg-rose-500" },
  ];

  const displayedOpportunities = (activeStageFilter === "all" ? filteredLeads : filteredLeads.filter((l) => l.stage === activeStageFilter))
    .filter((l) => searchQuery === "" || l.personName.toLowerCase().includes(searchQuery.toLowerCase()) || l.projectName.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-1 sm:px-2">
      {/* 1. Header & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-border/70 shadow-subtle">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Executive Cockpit
            </h1>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Multi-project sales velocity, speed-to-lead SLA enforcement, and real-time revenue pipeline.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-border bg-secondary/40 text-xs font-medium text-foreground hover:bg-secondary transition-colors focus:outline-none"
          >
            <option value="this_month">This Month</option>
            <option value="last_30_days">Last 30 Days</option>
            <option value="this_quarter">This Quarter</option>
            <option value="all">All Time</option>
          </select>

          <select
            value={selectedRegionId}
            onChange={(e) => setSelectedRegionId(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-border bg-secondary/40 text-xs font-medium text-foreground hover:bg-secondary transition-colors focus:outline-none"
          >
            <option value="all">All Regions ({regions.length})</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-border bg-secondary/40 text-xs font-medium text-foreground hover:bg-secondary transition-colors focus:outline-none"
          >
            <option value="all">All Projects ({projects.length})</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {(selectedRegionId !== "all" || selectedProjectId !== "all" || selectedSalespersonId !== "all" || dateRange !== "this_month") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedRegionId("all");
                setSelectedSalespersonId("all");
                setSelectedProjectId("all");
                setDateRange("this_month");
                setActiveStageFilter("all");
              }}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* 2. Hero Metric Ribbon (4 Key Indicators with Generous Whitespace) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Pipeline Value */}
        <Card className="p-5 relative overflow-hidden border-border/80 bg-gradient-to-br from-card to-card/60 shadow-subtle hover:shadow-card transition-all">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            <span>Gross Pipeline</span>
            <Building2 className="h-4 w-4 text-primary/70" />
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-black text-foreground tracking-tight font-mono truncate">
            {formatCurrencyINR(totalPipelineValue)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-bold text-foreground">{openLeads}</span> active inquiries across {projects.length} towers
          </div>
        </Card>

        {/* Metric 2: SLA Response Health */}
        <Card className="p-5 relative overflow-hidden border-border/80 bg-gradient-to-br from-card to-card/60 shadow-subtle hover:shadow-card transition-all">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            <span>Speed-to-Lead SLA</span>
            <Zap className="h-4 w-4 text-amber-500/80" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {slaPercent}%
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">On-Time</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{overdueCount > 0 ? overdueCount + ' overdue' : 'All on track'}</span>
            {overdueCount > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 font-mono">
                {overdueCount} Breached
              </Badge>
            )}
          </div>
        </Card>

        {/* Metric 3: Active Negotiations & Site Visits */}
        <Card className="p-5 relative overflow-hidden border-border/80 bg-gradient-to-br from-card to-card/60 shadow-subtle hover:shadow-card transition-all">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            <span>High-Intent Visits</span>
            <Target className="h-4 w-4 text-indigo-500/80" />
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {siteVisits}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Site Visits Scheduled</span>
            <span className="font-semibold text-primary">{stagnantNegotiations.length} in final closure</span>
          </div>
        </Card>

        {/* Metric 4: Realized Revenue Won */}
        <Card className="p-5 relative overflow-hidden border-border/80 bg-gradient-to-br from-card to-card/60 shadow-subtle hover:shadow-card transition-all">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            <span>Closed Revenue</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500/80" />
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono truncate">
            {formatCurrencyINR(wonValue)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-bold text-foreground">{wonDeals}</span> booked units this period
          </div>
        </Card>
      </div>

      {/* 2.5 Today's Activity Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Calls Today", value: callsToday.toString(), icon: Phone, color: "text-blue-500" },
          { label: "Visits This Week", value: visitsThisWeek.toString(), icon: Target, color: "text-indigo-500" },
          { label: "Bookings This Month", value: bookingsThisMonth.toString(), icon: CheckCircle2, color: "text-emerald-500" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card/60 border border-border/60">
              <Icon className={`h-5 w-5 ${item.color}`} />
              <div>
                <div className="text-lg font-black font-mono text-foreground">{item.value}</div>
                <div className="text-[10px] text-muted-foreground font-medium">{item.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Segmented Navigation Tabs (Progressive Disclosure) */}
      <div className="flex items-center gap-2 border-b border-border/70 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("focus")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "focus"
              ? "bg-primary text-primary-foreground shadow-subtle"
              : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Flame className="h-3.5 w-3.5" />
          <span>Priority Action</span>
          {(atRiskDeals.length > 0 || overdueCount > 0) && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === "focus" ? "bg-white/20 text-white" : "bg-rose-500/20 text-rose-600"}`}>
              {atRiskDeals.length + overdueCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pipeline")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "pipeline"
              ? "bg-primary text-primary-foreground shadow-subtle"
              : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          <span>Deal Flow & Stages</span>
          <span className="text-[10px] opacity-70">({totalLeads})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("team")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "team"
              ? "bg-primary text-primary-foreground shadow-subtle"
              : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Sales Leaderboard</span>
          <span className="text-[10px] opacity-70">({salespeople.length})</span>
        </button>

        {reactivationLeads.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab("revival")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "revival"
                ? "bg-amber-600 text-white shadow-subtle"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Lead Revival</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-600/20 text-amber-800 dark:text-amber-200">
              {reactivationLeads.length}
            </span>
          </button>
        )}
      </div>

      {/* 4. Tab Contents */}

      {/* TAB 1: PRIORITY ACTION & EXECUTIVE RADAR */}
      {activeTab === "focus" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Left Column (7-cols): At-Risk Interventions & Hot Deals */}
          <div className="lg:col-span-7 space-y-4">
            {/* Materials Operations Cockpit Card */}
            {vertical === "building_materials" && (
              <Card className="p-5 border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/15 space-y-3.5 shadow-subtle">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                      ✓
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-foreground">Depot & Field Operations Cockpit</h2>
                      <p className="text-xs text-muted-foreground">Retail footfalls, Khata ledger dunning, site scouting & daily price boards</p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                    Live
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onNavigateToTab?.("footfall")}
                    className="p-2.5 rounded-lg border border-border bg-card hover:bg-secondary/40 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between text-muted-foreground group-hover:text-emerald-500">
                      <Footprints className="h-4 w-4" />
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                    <div className="font-mono font-bold text-sm text-foreground mt-1.5">4 Logged</div>
                    <span className="text-[10px] text-muted-foreground block truncate">Walk-in Log</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigateToTab?.("scouting")}
                    className="p-2.5 rounded-lg border border-border bg-card hover:bg-secondary/40 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between text-muted-foreground group-hover:text-emerald-500">
                      <Camera className="h-4 w-4" />
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                    <div className="font-mono font-bold text-sm text-foreground mt-1.5">3 Active</div>
                    <span className="text-[10px] text-muted-foreground block truncate">Site Radar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigateToTab?.("khata")}
                    className="p-2.5 rounded-lg border border-border bg-card hover:bg-secondary/40 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between text-muted-foreground group-hover:text-emerald-500">
                      <IndianRupee className="h-4 w-4" />
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                    <div className="font-mono font-bold text-sm text-foreground mt-1.5">₹10.67L</div>
                    <span className="text-[10px] text-muted-foreground block truncate">Khata Ledger</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigateToTab?.("rates")}
                    className="p-2.5 rounded-lg border border-border bg-card hover:bg-secondary/40 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between text-muted-foreground group-hover:text-emerald-500">
                      <TrendingUp className="h-4 w-4" />
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                    <div className="font-mono font-bold text-sm text-foreground mt-1.5">₹365/bag</div>
                    <span className="text-[10px] text-muted-foreground block truncate">Daily Rates</span>
                  </button>
                </div>
              </Card>
            )}

            {/* Urgent Interventions Card */}
            {(atRiskDeals.length > 0 || overdueCount > 0) && (
              <Card className="p-5 border-rose-200/80 bg-rose-50/20 dark:bg-rose-950/10 space-y-3 shadow-subtle">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-bold">
                      !
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-foreground">Urgent Interventions</h2>
                      <p className="text-xs text-muted-foreground">High-ticket deals stalling or exceeding SLA response limits</p>
                    </div>
                  </div>
                  {onNavigateToTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateToTab("tasks")}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>Task Board</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-2.5 pt-1">
                  {atRiskDeals.slice(0, 3).map((lead) => (
                    <div
                      key={lead.id}
                      {...actionCardProps(() => onSelectLead(lead), `Open at-risk lead ${lead.personName}`)}
                      className="p-3.5 rounded-xl border border-rose-200/80 bg-card hover:border-rose-300 cursor-pointer space-y-2 text-xs transition-all shadow-subtle"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">{lead.personName}</span>
                            <DealHealthBadge health="at_risk" reason={lead.dealHealthReason} />
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {lead.projectName} • Assigned to <strong>{lead.salespersonName}</strong>
                          </p>
                        </div>
                        <span className="font-bold font-mono text-sm text-foreground">
                          {formatCurrencyINR(lead.budget)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                        <span className="text-rose-700 font-medium">{lead.dealHealthReason || "Follow-up delayed"}</span>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <a
                            href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center h-6 px-2.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            WhatsApp
                          </a>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onSelectLead(lead)}
                            className="h-6 text-[11px] px-2"
                          >
                            Open Lead
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {overdueLeads.length > 0 && (
                    <>
                      <div className="pt-2 border-t border-rose-200/30">
                        <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">
                          Overdue Follow-ups ({overdueLeads.length})
                        </span>
                      </div>
                      {overdueLeads.map((lead) => (
                        <div
                          key={lead.id}
                          className="p-2.5 rounded-lg bg-rose-500/5 border border-rose-200/20 text-xs flex items-center justify-between"
                        >
                          <div className="min-w-0">
                            <span className="font-bold text-foreground">{lead.personName}</span>
                            <span className="text-muted-foreground ml-2">
                              Last: {lead.lastActivityAt ? new Date(lead.lastActivityAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center h-6 px-2 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20"
                            >
                              <MessageSquare className="h-3 w-3 mr-0.5" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </Card>
            )}

            {/* High-Value Active Opportunities */}
            <Card className="p-5 space-y-4 shadow-subtle border-border/80">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">VIP Active Opportunities</h3>
                  <p className="text-xs text-muted-foreground">High-budget buyers currently in active negotiations or qualified stages</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("pipeline")}
                  className="text-xs font-bold text-primary"
                >
                  View All ({filteredLeads.length})
                </Button>
              </div>

              <div className="space-y-2.5">
                {filteredLeads.slice(0, 5).map((lead) => (
                  <div
                    key={lead.id}
                    {...actionCardProps(() => onSelectLead(lead), `Open lead ${lead.personName}`)}
                    className="p-3.5 rounded-xl border border-border bg-card hover:bg-secondary/30 cursor-pointer transition-all flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground truncate">{lead.personName}</span>
                        <PipelineBadge stage={lead.stage} />
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        <span>{lead.projectName}</span>
                        <span>•</span>
                        <span>Rep: {lead.salespersonName}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-bold font-mono text-sm text-foreground">
                        {formatCurrencyINR(lead.budget)}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        Score: {lead.leadScore || 50}/100
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Inactive Leads — No Activity in 7+ Days */}
            {(() => {
              const sevenDaysAgo = new Date(Date.now() - 7 * 864e5);
              const inactiveLeads = rangedLeads.filter(
                (l) =>
                  l.stage !== "won" &&
                  l.stage !== "lost" &&
                  l.lastActivityAt &&
                  new Date(l.lastActivityAt).getTime() < sevenDaysAgo.getTime()
              );
              return inactiveLeads.length > 0 ? (
                <Card className="p-5 space-y-3 shadow-subtle border-border/80">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Inactive Leads</h3>
                      <p className="text-xs text-muted-foreground">
                        No activity in 7+ days — {inactiveLeads.length} need re-engagement
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {inactiveLeads.slice(0, 5).map((lead) => (
                      <div
                        key={lead.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/20 border border-border/40 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-foreground">{lead.personName}</span>
                          <span className="text-muted-foreground ml-2">{lead.projectName}</span>
                          <span className="text-muted-foreground ml-1">
                            • Last: {new Date(lead.lastActivityAt!).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center h-6 px-2 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20"
                          >
                            <MessageSquare className="h-3 w-3 mr-0.5" />
                            WhatsApp
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null;
            })()}

          </div>

          {/* Right Rail (5-cols): Live Touchpoint Activity & Quick Actions */}
          <div className="lg:col-span-5 space-y-4">
            {/* Live Touchpoints Stream */}
            <Card className="p-5 space-y-3 shadow-subtle border-border/80">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Live Touchpoints</h3>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">Real-Time Audit</span>
              </div>

              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {activities.slice(0, 7).map((act) => (
                  <div key={act.id} className="text-xs pb-3 border-b border-border/40 last:border-0 last:pb-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground flex items-center gap-1.5 capitalize">
                        {act.type === "call" && <Phone className="h-3 w-3 text-blue-600" />}
                        {act.type === "whatsapp" && <MessageSquare className="h-3 w-3 text-emerald-600" />}
                        {act.type === "site_visit" && <Building2 className="h-3 w-3 text-amber-600" />}
                        {act.personName}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(act.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {act.notes && (
                      <p className="text-[11px] text-muted-foreground bg-secondary/30 p-2 rounded-lg leading-relaxed">
                        &ldquo;{act.notes}&rdquo;
                      </p>
                    )}
                    <div className="text-[10px] text-muted-foreground flex items-center justify-between pt-0.5">
                      <span>By {act.userName}</span>
                      {act.scheduledFollowUpAt && (
                        <span className="text-primary font-semibold font-mono">Next: {act.scheduledFollowUpAt}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* AI Resurrection Quick Trigger */}
            {reactivationLeads.length > 0 && (
              <Card className="p-4 rounded-xl border-amber-300 bg-amber-500/10 dark:bg-amber-950/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                    <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span>{reactivationLeads.length} Dormant Leads Ready</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setResurrectionTargetLeadId(reactivationLeads[0]?.id);
                      setResurrectionModalOpen(true);
                    }}
                    className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold px-2.5"
                  >
                    Resurrect Now
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  AI matched dormant high-intent buyers with newly released units and price changes.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DEAL FLOW & PIPELINE STAGES */}
      {activeTab === "pipeline" && (
        <div className="space-y-6">
          {/* Conversion Funnel Bar */}
          <Card className="p-5 space-y-4 shadow-subtle border-border/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-foreground">Pipeline Stage Conversion Flow</h3>
                <p className="text-xs text-muted-foreground">Select a milestone stage to filter opportunities</p>
              </div>
              <div className="text-xs font-mono text-muted-foreground bg-secondary px-2.5 py-1 rounded-md">
                {totalLeads} Total Inquiries · {formatCurrencyINR(totalPipelineValue)}
              </div>
            </div>

            {/* Conversion Visual Bar */}
            <div className="h-3 w-full rounded-full bg-secondary flex overflow-hidden border border-border">
              {stages.map((st) => {
                const pct = totalLeads > 0 ? (st.count / totalLeads) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <div
                    key={st.key}
                    onClick={() => setActiveStageFilter(activeStageFilter === st.key ? "all" : st.key)}
                    className={`${st.color} h-full cursor-pointer hover:opacity-90 transition-all ${activeStageFilter === st.key ? "ring-2 ring-foreground" : ""}`}
                    style={{ width: `${pct}%` }}
                    title={`${st.label}: ${st.count} (${pct.toFixed(1)}%)`}
                  />
                );
              })}
            </div>

            {/* Stage Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1 text-xs">
              {stages.map((st) => {
                const isSelected = activeStageFilter === st.key;
                return (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => setActiveStageFilter(isSelected ? "all" : st.key)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-primary/10 border-primary text-foreground font-bold shadow-subtle"
                        : "bg-card border-border hover:bg-secondary/40 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`h-2 w-2 rounded-full ${st.color}`} />
                      <span className="text-[11px] font-semibold text-foreground truncate">{st.label}</span>
                    </div>
                    <div className="text-base font-bold font-mono text-foreground">{st.count}</div>
                    <div className="text-[10px] text-muted-foreground font-mono truncate">{formatCurrencyINR(st.value)}</div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Search & Leads List */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search buyer name, phone, project..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 rounded-lg border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                Showing {displayedOpportunities.length} opportunities
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayedOpportunities.map((lead) => (
                <div
                  key={lead.id}
                  {...actionCardProps(() => onSelectLead(lead), `Open lead ${lead.personName}`)}
                  className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 cursor-pointer shadow-subtle transition-all space-y-2.5 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-foreground">{lead.personName}</div>
                      <div className="text-[11px] text-muted-foreground">{lead.projectName}</div>
                    </div>
                    <span className="font-bold font-mono text-xs text-foreground bg-secondary px-2 py-0.5 rounded">
                      {formatCurrencyINR(lead.budget)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <PipelineBadge stage={lead.stage} />
                    <LeadScoreBadge score={lead.leadScore} label={lead.leadScoreLabel} />
                  </div>

                  <div className="text-[11px] text-muted-foreground bg-secondary/30 p-2 rounded line-clamp-2">
                    {lead.lastActivityText || "No touchpoints logged yet"}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                    <span>Rep: {lead.salespersonName}</span>
                    <span>Next: {lead.nextFollowUpAt || "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SALES TEAM PERFORMANCE LEADERBOARD */}
      {activeTab === "team" && (() => {
        const repLeadsMap = new Map<string, Lead[]>();
        for (const rep of salespeople) {
          repLeadsMap.set(rep.id, rangedLeads.filter((l) => l.salespersonId === rep.id));
        }

        return (
        <Card className="p-5 space-y-4 shadow-subtle border-border/80">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Sales Team Performance</h3>
              <p className="text-xs text-muted-foreground">Individual productivity, follow-up activity, and conversion rates</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider bg-secondary/30 border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Salesperson</th>
                  <th className="py-2.5 px-3">Region</th>
                  <th className="py-2.5 px-3">Deals</th>
                  <th className="py-2.5 px-3">Visits</th>
                  <th className="py-2.5 px-3">Follow-ups</th>
                  <th className="py-2.5 px-3">Revenue</th>
                  <th className="py-2.5 px-3">Conv. Rate</th>
                  <th className="py-2.5 px-3">Avg Response</th>
                  <th className="py-2.5 px-3">SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {salespeople.map((rep) => {
                  const repLeads = repLeadsMap.get(rep.id) || [];
                  const repWonValue = repLeads.filter((l) => l.stage === "won").reduce((a, c) => a + c.budget, 0);
                  const repVisits = repLeads.filter((l) => l.stage === "site_visit").length;
                  const repOverdue = repLeads.filter((l) => l.followUpStatus === "overdue").length;
                  const complianceScore = repLeads.length > 0 ? Math.max(70, Math.round(100 - (repOverdue / repLeads.length) * 100)) : 100;
                  const repFollowups = getFollowupsDone(rep.id);
                  const convRate = getConversionRate(repLeads);
                  const avgResponse = getAvgResponseTime(repLeads);

                  return (
                    <tr key={rep.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="py-3 px-3 font-bold text-foreground flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {rep.name.charAt(0)}
                        </div>
                        <span>{rep.name}</span>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">{rep.regionName || "NCR"}</td>
                      <td className="py-3 px-3 font-mono font-semibold text-foreground">{repLeads.length}</td>
                      <td className="py-3 px-3 font-mono text-foreground">{repVisits}</td>
                      <td className="py-3 px-3 font-mono font-semibold text-foreground">{repFollowups}</td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrencyINR(repWonValue)}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-foreground">
                        {convRate === "N/A" ? (
                          <span className="text-muted-foreground">N/A</span>
                        ) : (
                          convRate
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-foreground">
                        {avgResponse === null ? <span className="text-muted-foreground">—</span> : avgResponse}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                          complianceScore >= 90
                            ? "bg-emerald-500/10 text-emerald-600"
                            : complianceScore >= 75
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-rose-500/10 text-rose-600"
                        }`}>
                          {complianceScore}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        );
      })()}

      {/* TAB 4: AI LEAD REVIVAL & DORMANT RECOVERY */}
      {activeTab === "revival" && (
        <Card className="p-5 space-y-4 shadow-subtle border-amber-300 bg-amber-500/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-foreground">AI Lost-Lead Resurrection Radar</h3>
              <p className="text-xs text-muted-foreground">
                Matches dormant buyers with newly released units, price reductions, and custom tailored pitches.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setResurrectionTargetLeadId(reactivationLeads[0]?.id);
                setResurrectionModalOpen(true);
              }}
              className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Open Engine
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {reactivationLeads.map((lead) => (
              <div
                key={lead.id}
                className="p-4 rounded-xl border border-border bg-card space-y-2.5 text-xs hover:border-amber-400 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-foreground text-sm">{lead.personName}</div>
                    <div className="text-[11px] text-muted-foreground">{lead.projectName}</div>
                  </div>
                  <span className="font-bold font-mono text-xs text-foreground">
                    {formatCurrencyINR(lead.budget)}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-amber-500/10 text-[11px] space-y-1">
                  <span className="font-bold text-amber-700 dark:text-amber-400 block uppercase text-[10px]">
                    AI Match Insight:
                  </span>
                  <p className="text-foreground leading-relaxed">
                    {lead.recommendedAction || "Matched with newly released high-floor unit."}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-muted-foreground font-mono">{lead.daysInStage || 14}d dormant</span>
                  <Button
                    size="sm"
                    onClick={() => {
                      setResurrectionTargetLeadId(lead.id);
                      setResurrectionModalOpen(true);
                    }}
                    className="h-6 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    Resurrect
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal */}
      <AiResurrectionModal
        open={resurrectionModalOpen}
        onOpenChange={setResurrectionModalOpen}
        defaultLeadId={resurrectionTargetLeadId}
      />
    </div>
  );
}
