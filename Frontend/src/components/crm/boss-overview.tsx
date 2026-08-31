"use client";

import * as React from "react";
import {
  TrendingUp,
  Building2,
  Users,
  CheckCircle2,
  Calendar,
  Clock,
  Filter,
  RefreshCw,
  Phone,
  MessageSquare,
  ChevronRight,
  Target,
  Flame,
  AlertTriangle,
  ShieldAlert,
  ArrowUpRight,
  Sparkles,
  ExternalLink,
  Search,
  Check,
  Zap,
} from "lucide-react";
import { useCRM } from "@/context/crm-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PipelineBadge, TaskStatusBadge, DealHealthBadge, LeadScoreBadge } from "@/components/ui/status-badge";
import { formatCurrencyINR, formatPhone } from "@/lib/utils";
import { Lead, PipelineStage } from "@/types/crm";
import { AiResurrectionModal } from "@/components/crm/ai-resurrection-modal";
import { actionCardProps } from "@/components/ui/action-card";

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

  // Aggregate Metrics
  const totalLeads = serverAnalytics?.summary?.totalLeads ?? rangedLeads.length;
  const totalPipelineValue = serverAnalytics?.summary?.pipelineValue ?? rangedLeads.reduce((acc, l) => acc + (l.budget || 0), 0);
  const openLeads = serverAnalytics?.summary?.openLeads ?? rangedLeads.filter((l) => l.stage !== "won" && l.stage !== "lost").length;
  const wonDeals = serverAnalytics?.summary?.wonDeals ?? rangedLeads.filter((l) => l.stage === "won").length;
  const wonValue = serverAnalytics?.summary?.wonRevenue ?? rangedLeads.filter((l) => l.stage === "won").reduce((acc, l) => acc + (l.budget || 0), 0);
  const overdueCount = serverAnalytics?.summary?.overdueFollowups ?? rangedLeads.filter((l) => l.followUpStatus === "overdue").length;
  const siteVisits = serverAnalytics?.summary?.siteVisitsCount ?? rangedLeads.filter((l) => l.stage === "site_visit").length;

  const salespeople = users.filter((u) => u.role === "salesperson");

  // Priority Attention Items
  const overdueLeads = rangedLeads.filter((l) => l.followUpStatus === "overdue");
  const atRiskDeals = rangedLeads.filter((l) => l.dealHealth === "at_risk");
  const upcomingSiteVisits = rangedLeads.filter((l) => l.stage === "site_visit");
  const stagnantNegotiations = rangedLeads.filter((l) => l.stage === "negotiation" && l.daysInStage >= 3);

  // Stage breakdown
  const stages: { key: PipelineStage; label: string; count: number; value: number; color: string }[] = [
    { key: "new", label: "New Inflow", count: rangedLeads.filter((l) => l.stage === "new").length, value: rangedLeads.filter((l) => l.stage === "new").reduce((a, c) => a + c.budget, 0), color: "bg-slate-500" },
    { key: "contacted", label: "Contacted", count: rangedLeads.filter((l) => l.stage === "contacted").length, value: rangedLeads.filter((l) => l.stage === "contacted").reduce((a, c) => a + c.budget, 0), color: "bg-blue-600" },
    { key: "qualified", label: "Qualified", count: rangedLeads.filter((l) => l.stage === "qualified").length, value: rangedLeads.filter((l) => l.stage === "qualified").reduce((a, c) => a + c.budget, 0), color: "bg-indigo-600" },
    { key: "site_visit", label: "Site Visit", count: rangedLeads.filter((l) => l.stage === "site_visit").length, value: rangedLeads.filter((l) => l.stage === "site_visit").reduce((a, c) => a + c.budget, 0), color: "bg-amber-600" },
    { key: "negotiation", label: "Negotiation", count: rangedLeads.filter((l) => l.stage === "negotiation").length, value: rangedLeads.filter((l) => l.stage === "negotiation").reduce((a, c) => a + c.budget, 0), color: "bg-purple-600" },
    { key: "won", label: "Won", count: rangedLeads.filter((l) => l.stage === "won").length, value: rangedLeads.filter((l) => l.stage === "won").reduce((a, c) => a + c.budget, 0), color: "bg-emerald-600" },
    { key: "lost", label: "Lost", count: rangedLeads.filter((l) => l.stage === "lost").length, value: rangedLeads.filter((l) => l.stage === "lost").reduce((a, c) => a + c.budget, 0), color: "bg-rose-500" },
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
              {overdueCount === 0 ? "100%" : `${Math.max(60, 100 - overdueCount * 5)}%`}
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">On-Time</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Response target: &lt; 5 mins</span>
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
            <span>Physical Walkthroughs</span>
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
            {/* Urgent Interventions Card */}
            {(atRiskDeals.length > 0 || overdueCount > 0) && (
              <Card className="p-5 border-rose-200/80 bg-rose-50/20 dark:bg-rose-950/10 space-y-3 shadow-subtle">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-bold">
                      !
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-foreground">Action Center · Urgent Interventions</h2>
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
      {activeTab === "team" && (
        <Card className="p-5 space-y-4 shadow-subtle border-border/80">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Sales Rep Productivity & Conversion Rates</h3>
              <p className="text-xs text-muted-foreground">Individual closer performance, SLA compliance, and pipeline velocity</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider bg-secondary/30 border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Salesperson</th>
                  <th className="py-2.5 px-3">Region</th>
                  <th className="py-2.5 px-3">Active Deals</th>
                  <th className="py-2.5 px-3">Site Visits Done</th>
                  <th className="py-2.5 px-3">Revenue Closed</th>
                  <th className="py-2.5 px-3">SLA Compliance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {salespeople.map((rep) => {
                  const repLeads = rangedLeads.filter((l) => l.salespersonId === rep.id);
                  const repWonValue = repLeads.filter((l) => l.stage === "won").reduce((a, c) => a + c.budget, 0);
                  const repVisits = repLeads.filter((l) => l.stage === "site_visit").length;
                  const repOverdue = repLeads.filter((l) => l.followUpStatus === "overdue").length;
                  const complianceScore = repLeads.length > 0 ? Math.max(70, Math.round(100 - (repOverdue / repLeads.length) * 100)) : 100;

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
                      <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrencyINR(repWonValue)}
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
      )}

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
