"use client";

import * as React from "react";
import {
  Phone,
  MessageSquare,
  Plus,
  CheckCircle2,
  Calendar,
  Clock,
  Building2,
  AlertCircle,
  TrendingUp,
  Target,
  Zap,
  Flame,
  User,
  ArrowRight,
  ShieldAlert,
  Compass,
  FileSpreadsheet,
  Check,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  Key,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { useCRM } from "@/context/crm-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PipelineBadge, TaskStatusBadge, DealHealthBadge, LeadScoreBadge } from "@/components/ui/status-badge";
import { formatCurrencyINR, formatPhone } from "@/lib/utils";
import { Lead, Task, SiteVisitBriefing } from "@/types/crm";
import { SellerOpportunitiesModal } from "@/components/crm/seller-opportunities-modal";
import { MeetingSummaryModal } from "@/components/crm/meeting-summary-modal";

interface SalespersonHomeProps {
  onOpenQuickLog: (leadId?: string) => void;
  onSelectLead: (lead: Lead) => void;
  onNavigateTab?: (tab: string) => void;
}

export function SalespersonHome({
  onOpenQuickLog,
  onSelectLead,
  onNavigateTab,
}: SalespersonHomeProps) {
  const {
    currentUser,
    filteredLeads,
    filteredTasks,
    completeTask,
    activities,
    sellerOpportunities,
    siteVisitBriefings,
    getSiteVisitBriefing,
    scanStaleFacts,
  } = useCRM();

  const [isMeetingModalOpen, setIsMeetingModalOpen] = React.useState(false);
  const [isSellerModalOpen, setIsSellerModalOpen] = React.useState(false);
  const [activeBriefing, setActiveBriefing] = React.useState<SiteVisitBriefing | null>(null);

  // Active tasks for this salesperson
  const overdueTasks = filteredTasks.filter((t) => t.status === "overdue");
  const dueTodayTasks = filteredTasks.filter((t) => t.status === "due_today");
  const upcomingTasks = filteredTasks.filter((t) => t.status === "upcoming");
  const completedTasks = filteredTasks.filter((t) => t.status === "completed");

  // Real follow-up closure rate: completed vs all closed-or-breached commitments.
  const slaRate = React.useMemo(() => {
    const denominator = completedTasks.length + overdueTasks.length;
    if (denominator === 0) return null;
    return Math.round((completedTasks.length / denominator) * 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTasks]);

  // Scheduled site visits
  const siteVisitLeads = filteredLeads.filter((l) => l.stage === "site_visit");

  // Hot pipeline value (Lead Score >= 75 and active)
  const hotLeads = filteredLeads.filter((l) => (l.leadScore || 0) >= 75 && l.stage !== "won" && l.stage !== "lost");
  const hotPipelineValue = hotLeads.reduce((acc, l) => acc + l.budget, 0);

  // Calls logged today by this rep
  const todayCallsCount = activities.filter((a) => a.userId === currentUser.id && a.type === "call").length;
  const callsTarget = 10;

  // Handler for 30-min pre-site visit briefing
  const handleOpenBriefing = async (lead: Lead) => {
    const unitId = lead.unitId || lead.assignedUnitId || "unit-camellias-a1402";
    const briefing = await getSiteVisitBriefing(lead.id, unitId);
    if (briefing) {
      setActiveBriefing(briefing);
    }
  };

  // Intelligent Next Best Actions prioritization:
  // 1. Overdue high-value leads
  // 2. Confirmed site visits
  // 3. Hot qualified leads
  // 4. Negotiation / closing opportunities
  // 5. Other due follow-ups
  const prioritizedNextActions = React.useMemo(() => {
    return [...filteredLeads]
      .filter((l) => l.stage !== "won" && l.stage !== "lost")
      .sort((a, b) => {
        const getPriorityScore = (lead: Lead) => {
          let score = 0;
          if (lead.followUpStatus === "overdue") score += 500;
          if (lead.stage === "site_visit") score += 400;
          if (lead.dealHealth === "at_risk") {
            score += 350 + (100 - (lead.dealHealthScore ?? 50));
          } else if (lead.dealHealth === "strong") {
            score += (lead.dealHealthScore ?? 80);
          }
          if (lead.stage === "negotiation") score += 250;
          if (lead.leadScore >= 90) score += 200;
          if (lead.followUpStatus === "due_today") score += 150;
          score += (lead.budget / 10000000); // Deal value factor
          return score;
        };
        return getPriorityScore(b) - getPriorityScore(a);
      });
  }, [filteredLeads]);

  // Today's Sales Timeline Queue items dynamically derived from tasks & leads
  const timelineQueue = React.useMemo(() => {
    const activeTasks = filteredTasks.filter((t) => t.status !== "completed");
    if (activeTasks.length === 0) return [];

    return activeTasks.slice(0, 5).map((task) => {
      const lead = filteredLeads.find((l) => l.id === task.leadId);
      return {
        time: task.dueTime || (task.status === "overdue" ? "09:30 AM" : "11:30 AM"),
        leadName: task.personName,
        phone: task.phone,
        type: task.status === "overdue" ? "Call · Overdue" : task.title.toLowerCase().includes("site") ? "Site Visit" : "Call · Due",
        projectName: task.projectName,
        unit: lead?.assignedUnitNumber ? `Unit ${lead.assignedUnitNumber}` : undefined,
        status: task.status as "overdue" | "due_today" | "upcoming",
        leadId: task.leadId,
        notes: lead?.dealHealthReason || task.title,
      };
    });
  }, [filteredTasks, filteredLeads]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* 1. TOP HEADER WITH 'WHAT SHOULD I DO NEXT?' IMMEDIATE BANNER */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Sales Command • {currentUser.name}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            What should I do next?
          </h1>
          <p className="text-xs text-muted-foreground">
            {overdueTasks.length > 0
              ? `You have ${overdueTasks.length} overdue high-value lead requiring immediate rescue touchpoint.`
              : `All daily follow-up commitments on schedule. ${dueTodayTasks.length} calls queued for today.`}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsSellerModalOpen(true)}
            className="h-10 px-3 text-xs font-semibold border-amber-500/40 text-amber-600 hover:bg-amber-500/10 flex items-center gap-1.5 rounded-xl"
          >
            <Sparkles className="h-4 w-4" />
            <span>Seller Signals ({sellerOpportunities.length})</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsMeetingModalOpen(true)}
            className="h-10 px-3 text-xs font-semibold border-primary/40 text-primary hover:bg-primary/10 flex items-center gap-1.5 rounded-xl"
          >
            <FileText className="h-4 w-4" />
            <span>AI Meeting Structurer</span>
          </Button>

          <Button
            size="lg"
            onClick={() => onOpenQuickLog()}
            className="h-10 px-4 text-xs font-semibold shadow-subtle bg-primary text-primary-foreground hover:bg-primary-hover flex items-center gap-2 rounded-xl"
          >
            <Plus className="h-4 w-4" />
            <span>+ Log Activity</span>
          </Button>
        </div>
      </div>

      {/* 2. COMPACT 'TODAY' OPERATIONAL SUMMARY METRIC BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Overdue Actions */}
        <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
          overdueTasks.length > 0 ? "border-rose-300 bg-rose-50/50" : "border-border bg-card shadow-subtle"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Overdue
            </span>
            <span className="h-2 w-2 rounded-full bg-rose-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-foreground font-mono">{overdueTasks.length}</span>
            <span className="text-[10px] text-muted-foreground block">Requires instant call</span>
          </div>
        </div>

        {/* Due Today */}
        <div className="p-3.5 rounded-xl border border-border bg-card shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Due Today
            </span>
            <span className="h-2 w-2 rounded-full bg-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-foreground font-mono">{dueTodayTasks.length}</span>
            <span className="text-[10px] text-muted-foreground block">{todayCallsCount} / {callsTarget} completed</span>
          </div>
        </div>

        {/* Upcoming Site Visits */}
        <div className="p-3.5 rounded-xl border border-border bg-card shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1">
              <Compass className="h-3.5 w-3.5" />
              Site Visits
            </span>
            <span className="h-2 w-2 rounded-full bg-purple-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-foreground font-mono">{siteVisitLeads.length}</span>
            <span className="text-[10px] text-muted-foreground block">Tours booked this wk</span>
          </div>
        </div>

        {/* Hot Pipeline Value */}
        <div className="p-3.5 rounded-xl border border-border bg-card shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-rose-500" />
              Hot Pipeline
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-foreground font-mono">{formatCurrencyINR(hotPipelineValue)}</span>
            <span className="text-[10px] text-muted-foreground block">{hotLeads.length} active buyers</span>
          </div>
        </div>

        {/* SLA Adherence */}
        <div className="p-3.5 rounded-xl border border-border bg-card shadow-subtle flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              SLA Adherence
            </span>
          </div>
          <div className="mt-2">
            <span className={`text-2xl font-bold font-mono ${slaRate === null ? "text-muted-foreground" : slaRate >= 90 ? "text-emerald-600" : slaRate >= 70 ? "text-amber-600" : "text-rose-600"}`}>
              {slaRate === null ? "—" : `${slaRate}%`}
            </span>
            <span className="text-[10px] text-muted-foreground block">Follow-ups closed</span>
          </div>
        </div>
      </div>

      {/* 3. TWO-COLUMN OPERATIONAL COCKPIT: NEXT BEST ACTIONS & TODAY SALES TIMELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: NEXT BEST ACTIONS (Most Important Operational Section) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Next Best Actions (Prioritized)</h2>
            </div>
            <span className="text-xs text-muted-foreground font-mono">{prioritizedNextActions.length} Actions Ready</span>
          </div>

          <div className="space-y-3">
            {prioritizedNextActions.slice(0, 4).map((lead, idx) => {
              const isOverdue = lead.followUpStatus === "overdue";
              const isSiteVisit = lead.stage === "site_visit";

              return (
                <div
                  key={lead.id}
                  className={`p-4 rounded-xl border transition-all space-y-3 ${
                    isOverdue
                      ? "border-rose-300 bg-rose-50/30"
                      : isSiteVisit
                      ? "border-purple-300 bg-purple-50/20"
                      : "border-border bg-card shadow-subtle hover:border-border/90"
                  }`}
                >
                  {/* Lead Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-foreground">{lead.personName}</span>
                        <LeadScoreBadge score={lead.leadScore} label={lead.leadScoreLabel} />
                        <DealHealthBadge health={lead.dealHealth} score={lead.dealHealthScore} reason={lead.dealHealthReason} showScore />
                        <PipelineBadge stage={lead.stage} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 font-mono">
                        <span>{lead.projectName}</span>
                        {lead.assignedUnitNumber && (
                          <span className="bg-secondary px-1.5 py-0.2 rounded text-[10px] font-bold text-foreground">
                            Unit {lead.assignedUnitNumber}
                          </span>
                        )}
                        <span>•</span>
                        <span className="font-bold text-foreground">{formatCurrencyINR(lead.budget)}</span>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-secondary text-muted-foreground shrink-0">
                      #{idx + 1} Priority
                    </span>
                  </div>

                  {/* 2. Key Sales Context: Pitch Unit & Timing */}
                  <div className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-primary/5 border border-primary/10">
                    <span className="font-semibold text-primary">
                      🎯 Pitch: <strong>{lead.projectName}</strong>
                      {lead.assignedUnitNumber ? ` · Unit ${lead.assignedUnitNumber}` : ""}
                      {lead.configurationPreference ? ` (${lead.configurationPreference})` : ""}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-muted-foreground">
                      Follow-up: {lead.nextFollowUpAt || "Today"}
                    </span>
                  </div>

                  {/* 3. Operational Intel: Why it matters, Last Interaction & Suggested Move */}
                  <div className="p-2.5 rounded-lg bg-secondary/40 border border-border/40 text-xs space-y-1.5">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Why this matters:
                      </span>
                      <p className="text-foreground/90 font-medium leading-relaxed">
                        {lead.dealHealthReason || "High priority customer engagement target."}
                      </p>
                    </div>

                    {lead.lastConversationSummary && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          Last interaction:
                        </span>
                        <p className="text-muted-foreground text-[11px] leading-relaxed italic">
                          &ldquo;{lead.lastConversationSummary}&rdquo;
                        </p>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] uppercase font-bold text-primary block">
                        Suggested Next Action:
                      </span>
                      <p className="text-foreground font-semibold leading-relaxed">
                        {lead.suggestedNextMove || lead.recommendedAction || "Call customer to align next milestone."}
                      </p>
                    </div>
                  </div>

                  {/* 4. 1-Click Operational Action Bar */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                    <button
                      type="button"
                      onClick={() => onSelectLead(lead)}
                      className="text-primary font-semibold hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <span>Open 360° Dossier</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isSiteVisit && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-[11px] font-bold border-purple-500/40 text-purple-600 hover:bg-purple-500/10 flex items-center gap-1"
                          onClick={() => handleOpenBriefing(lead)}
                        >
                          <Compass className="h-3 w-3" />
                          <span>Pre-Visit Briefing</span>
                        </Button>
                      )}
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
                        onClick={() => onOpenQuickLog(lead.id)}
                      >
                        Log Touchpoint
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 Columns: TODAY SALES ACTIVITY TIMELINE */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-bold text-foreground">Today&apos;s Sales Timeline</h2>
            </div>
            <span className="text-xs text-muted-foreground font-mono">{timelineQueue.length} Scheduled</span>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-subtle space-y-3">
            <p className="text-[11px] text-muted-foreground pb-2 border-b border-border">
              Structured queue of today&apos;s customer touchpoints. Complete each item with 1-click.
            </p>

            <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {timelineQueue.map((item, i) => {
                const isOverdue = item.status === "overdue";
                const isDue = item.status === "due_today";

                return (
                  <div key={i} className="relative space-y-1 text-xs">
                    {/* Timeline Node Dot */}
                    <div className={`absolute -left-[19px] top-1 h-3 w-3 rounded-full border-2 border-card ${
                      isOverdue ? "bg-rose-500" : isDue ? "bg-amber-500" : "bg-emerald-500"
                    }`} />

                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-foreground text-xs">{item.time}</span>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        isOverdue
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {item.type}
                      </span>
                    </div>

                    <div className="font-bold text-foreground text-sm flex items-center justify-between">
                      <span>{item.leadName}</span>
                      <span className="text-[11px] text-muted-foreground font-normal">{item.projectName}</span>
                    </div>

                    <div className="text-[11px] text-muted-foreground">
                      {item.notes} {item.unit && `(${item.unit})`}
                    </div>

                    {/* Fast Quick-Action Row */}
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <a
                        href={`tel:${item.phone}`}
                        className="inline-flex items-center justify-center h-6 px-2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                      >
                        <Phone className="h-2.5 w-2.5 mr-1" />
                        Call
                      </a>
                      <a
                        href={`https://wa.me/${item.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center h-6 px-2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                      >
                        <MessageSquare className="h-2.5 w-2.5 mr-1" />
                        WhatsApp
                      </a>
                      <button
                        type="button"
                        onClick={() => onOpenQuickLog(item.leadId)}
                        className="h-6 px-2 rounded text-[10px] font-semibold bg-secondary text-foreground hover:bg-secondary/80 border border-border"
                      >
                        Log
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Intelligence Modals */}
      <SellerOpportunitiesModal
        isOpen={isSellerModalOpen}
        onClose={() => setIsSellerModalOpen(false)}
      />

      <MeetingSummaryModal
        isOpen={isMeetingModalOpen}
        onClose={() => setIsMeetingModalOpen(false)}
      />

      {/* 30-Minute Pre-Visit Briefing Modal */}
      {activeBriefing && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setActiveBriefing(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl space-y-4 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border pb-3 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-purple-600 tracking-wider">
                  Site Visit Pre-Briefing (30m Prior)
                </span>
                <h3 className="text-xl font-bold text-foreground">{activeBriefing.unitTitle}</h3>
                <p className="text-muted-foreground text-xs">
                  Buyer: {activeBriefing.leadName} • {activeBriefing.societyName}
                </p>
              </div>
              <button
                onClick={() => setActiveBriefing(null)}
                className="text-muted-foreground hover:text-foreground font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Gate Access Protocol */}
            <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200/60 space-y-1">
              <span className="font-bold text-purple-900 flex items-center gap-1.5">
                <Key className="h-4 w-4 text-purple-600" />
                Security & Gate 2 Pass Protocol:
              </span>
              <p className="text-purple-950 font-medium leading-relaxed">
                {activeBriefing.gateAccessProtocol}
              </p>
              {activeBriefing.parkingInstructions && (
                <p className="text-purple-800 text-[11px] mt-1">
                  🚗 <strong>Parking:</strong> {activeBriefing.parkingInstructions}
                </p>
              )}
            </div>

            {/* Owner Expectations */}
            <div className="p-3.5 rounded-xl bg-secondary/60 border border-border space-y-1">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <User className="h-4 w-4 text-primary" />
                Owner Price Non-Negotiables:
              </span>
              <p className="text-muted-foreground leading-relaxed">
                {activeBriefing.ownerExpectationsSummary}
              </p>
            </div>

            {/* Talking Points & Objections */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-200/60 space-y-1.5">
                <span className="font-bold text-emerald-800 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                  Key Talking Points:
                </span>
                <ul className="list-disc list-inside text-emerald-950 space-y-1">
                  {activeBriefing.talkingPoints?.map((tp, idx) => (
                    <li key={idx}>{tp}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/40 border border-amber-200/60 space-y-1.5">
                <span className="font-bold text-amber-800 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  Anticipated Objections:
                </span>
                <ul className="list-disc list-inside text-amber-950 space-y-1">
                  {activeBriefing.previousObjections?.map((obj, idx) => (
                    <li key={idx}>{obj}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
              <Button
                onClick={() => setActiveBriefing(null)}
                className="h-8 px-4 text-xs font-semibold"
              >
                Close Briefing
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



