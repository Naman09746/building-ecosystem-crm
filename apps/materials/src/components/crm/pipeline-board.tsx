"use client";

import * as React from "react";
import { useCRM } from "@repo/core/context/crm-context";
import { Lead, PipelineStage } from "@repo/core/types/crm";
import { Badge } from "@repo/ui/components/badge";
import { Input } from "@repo/ui/components/input";
import { formatCurrencyINR, formatPhone } from "@repo/core/lib/utils";
import {
  Building2,
  Phone,
  MessageSquare,
  Search,
  Clock,
  ChevronRight,
  Filter,
} from "lucide-react";
import { PipelineBadge, DealHealthBadge, LeadScoreBadge } from "@repo/ui/components/status-badge";
import { useIsMobile } from "@/hooks/use-device";

const STAGES: { id: PipelineStage; label: string; headerColor: string; avgDays: number }[] = [
  { id: "new", label: "New Inflow", headerColor: "border-slate-300 bg-slate-100/70", avgDays: 2 },
  { id: "contacted", label: "Contacted", headerColor: "border-blue-300 bg-blue-50/70", avgDays: 3 },
  { id: "qualified", label: "Qualified", headerColor: "border-indigo-300 bg-indigo-50/70", avgDays: 5 },
  { id: "site_visit", label: "Site Visit", headerColor: "border-amber-300 bg-amber-50/70", avgDays: 7 },
  { id: "negotiation", label: "Negotiation", headerColor: "border-purple-300 bg-purple-50/70", avgDays: 10 },
  { id: "won", label: "Won Deals", headerColor: "border-emerald-300 bg-emerald-50/70", avgDays: 14 },
  { id: "lost", label: "Lost", headerColor: "border-rose-300 bg-rose-50/70", avgDays: 8 },
];

export function PipelineBoard({ onSelectLead }: { onSelectLead: (lead: Lead) => void }) {
  const { filteredLeads, updateLeadStage, projects } = useCRM();
  const isMobile = useIsMobile();

  const [search, setSearch] = React.useState("");
  const [healthFilter, setHealthFilter] = React.useState<string>("all");
  const [projectFilter, setProjectFilter] = React.useState<string>("all");
  const [activeMobileStage, setActiveMobileStage] = React.useState<PipelineStage>("new");

  const visibleLeads = filteredLeads.filter((l) => {
    const matchSearch =
      l.personName.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search) ||
      l.projectName.toLowerCase().includes(search.toLowerCase());
    const matchHealth = healthFilter === "all" || l.dealHealth === healthFilter;
    const matchProject = projectFilter === "all" || l.projectId === projectFilter;
    return matchSearch && matchHealth && matchProject;
  });

  const totalPipelineValue = visibleLeads.reduce((acc, curr) => acc + (curr.budget || 0), 0);

  return (
    <div className="space-y-4">
      {/* Top Bar with Metrics & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h2 className="text-base font-bold text-foreground">Deals &amp; Opportunities Pipeline</h2>
          <p className="text-xs text-muted-foreground">
            Multi-stage pipeline with Deal Health, SLA velocity, and value distribution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Active Pipeline</span>
            <span className="text-sm font-bold text-foreground font-mono">{formatCurrencyINR(totalPipelineValue)}</span>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {visibleLeads.length} Leads
          </Badge>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 rounded-xl border border-border bg-card shadow-subtle flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search deals..."
              className="pl-8 h-8 text-xs bg-secondary/40 rounded-lg"
            />
          </div>

          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-border bg-secondary/50 text-foreground font-medium text-xs focus:outline-none"
          >
            <option value="all">All Health</option>
            <option value="strong">🟢 Strong</option>
            <option value="neutral">⚪ Neutral</option>
            <option value="at_risk">🔴 At Risk</option>
          </select>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-border bg-secondary/50 text-foreground font-medium text-xs focus:outline-none"
          >
            <option value="all">All Projects ({projects.length})</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-muted-foreground font-mono hidden sm:inline">
          Showing {visibleLeads.length} deals
        </span>
      </div>

      {/* MOBILE ADAPTATION: Horizontal Stage Tabs + Active Stage Card List */}
      {isMobile ? (
        <div className="space-y-3">
          {/* Stage Switcher Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {STAGES.map((st) => {
              const count = visibleLeads.filter((l) => l.stage === st.id).length;
              const isActive = activeMobileStage === st.id;

              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setActiveMobileStage(st.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 min-h-[40px] ${
                    isActive
                      ? "bg-primary text-primary-foreground font-bold shadow-subtle"
                      : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{st.label}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isActive ? "bg-white/20 text-white" : "bg-card text-foreground"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Stage Leads Card List */}
          <div className="space-y-2.5">
            {visibleLeads.filter((l) => l.stage === activeMobileStage).length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground bg-card rounded-xl border border-dashed border-border">
                No deals currently in {STAGES.find((s) => s.id === activeMobileStage)?.label}.
              </div>
            ) : (
              visibleLeads
                .filter((l) => l.stage === activeMobileStage)
                .map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => onSelectLead(lead)}
                    className="p-3.5 rounded-xl border border-border bg-card shadow-subtle hover:border-primary/40 space-y-2.5 text-xs transition-all active:scale-[0.99] cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <div className="font-bold text-sm text-foreground">{lead.personName}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {formatPhone(lead.phone)}
                        </div>
                      </div>
                      <span className="font-bold text-foreground text-xs font-mono">
                        {formatCurrencyINR(lead.budget)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <LeadScoreBadge score={lead.leadScore} label={lead.leadScoreLabel} />
                      <DealHealthBadge health={lead.dealHealth} reason={lead.dealHealthReason} />
                    </div>

                    <div className="p-2 rounded-lg bg-secondary/40 text-[11px] flex items-center justify-between">
                      <span className="font-semibold text-foreground truncate">{lead.projectName}</span>
                      <span className="text-muted-foreground">Rep: {lead.salespersonName.split(" ")[0]}</span>
                    </div>

                    {/* Quick stage advance on mobile */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="pt-2 border-t border-border/40 flex items-center justify-between"
                    >
                      <span className="text-muted-foreground text-[11px]">Advance stage:</span>
                      <select
                        value={lead.stage}
                        onChange={(e) => updateLeadStage(lead.id, e.target.value as PipelineStage)}
                        className="text-xs font-semibold h-8 rounded-lg border border-border bg-secondary px-2 text-foreground focus:outline-none"
                      >
                        {STAGES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      ) : (
        /* DESKTOP VIEW: Multi-Column Kanban */
        <div className="flex gap-3.5 overflow-x-auto pb-4 pt-1">
          {STAGES.map((st) => {
            const stageLeads = visibleLeads.filter((l) => l.stage === st.id);
            const stageTotalValue = stageLeads.reduce((acc, curr) => acc + (curr.budget || 0), 0);

            return (
              <div
                key={st.id}
                className="w-72 shrink-0 rounded-xl border border-border bg-secondary/30 flex flex-col max-h-[75vh]"
              >
                {/* Column Header */}
                <div className={`p-3 rounded-t-xl border-b border-border/80 ${st.headerColor} flex items-center justify-between`}>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-foreground">{st.label}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        (avg {st.avgDays}d)
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono font-semibold">
                      {formatCurrencyINR(stageTotalValue)}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-mono font-bold">
                    {stageLeads.length}
                  </Badge>
                </div>

                {/* Column Cards */}
                <div className="p-2 space-y-2 overflow-y-auto flex-1">
                  {stageLeads.length === 0 ? (
                    <div className="p-4 text-center text-[11px] text-muted-foreground rounded-lg border border-dashed border-border/60">
                      No leads in this stage
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Open lead ${lead.personName}`}
                        onClick={() => onSelectLead(lead)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelectLead(lead);
                          }
                        }}
                        className={`p-3 rounded-lg border bg-card shadow-subtle hover:border-primary/50 cursor-pointer space-y-2 text-xs transition-all hover:shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          lead.dealHealth === "at_risk" ? "border-red-200" : "border-border"
                        }`}
                      >
                        {/* Top Row: Name & Budget */}
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <div className="font-bold text-foreground">{lead.personName}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {formatPhone(lead.phone)}
                            </div>
                          </div>
                          <span className="font-bold text-foreground text-xs font-mono">
                            {formatCurrencyINR(lead.budget)}
                          </span>
                        </div>

                        {/* Badges: Score & Health */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <LeadScoreBadge score={lead.leadScore} label={lead.leadScoreLabel} />
                          <DealHealthBadge health={lead.dealHealth} reason={lead.dealHealthReason} />
                        </div>

                        {/* Project & Rep */}
                        <div className="space-y-1 text-[11px] text-muted-foreground">
                          <div className="flex items-center gap-1 text-foreground font-medium truncate">
                            <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className="truncate">{lead.projectName}</span>
                            {lead.assignedUnitNumber && (
                              <span className="text-[10px] font-mono font-bold bg-secondary px-1 rounded">
                                Unit {lead.assignedUnitNumber}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span>{lead.regionName}</span>
                            <span>Rep: <strong>{lead.salespersonName.split(" ")[0]}</strong></span>
                          </div>
                        </div>

                        {/* Next Action Snippet if available */}
                        {lead.nextFollowUpAt && (
                          <div className="text-[10px] text-muted-foreground bg-secondary/40 p-1.5 rounded flex items-center gap-1">
                            <Clock className="h-3 w-3 text-primary shrink-0" />
                            <span className="truncate font-medium">{lead.nextFollowUpAt}</span>
                          </div>
                        )}

                        {/* Quick stage advance dropdown */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="pt-1.5 border-t border-border/50 flex items-center justify-between text-[11px]"
                        >
                          <span className="text-muted-foreground text-[10px]">Move to:</span>
                          <select
                            value={lead.stage}
                            onChange={(e) => updateLeadStage(lead.id, e.target.value as PipelineStage)}
                            className="text-[10px] font-semibold h-6 rounded border border-border bg-secondary px-1 text-foreground focus:outline-none"
                          >
                            {STAGES.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </select>
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
    </div>
  );
}
