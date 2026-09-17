"use client";

import * as React from "react";
import {
  Phone,
  MessageSquare,
  Plus,
  CheckCircle2,
  Building2,
  Zap,
  Flame,
  User,
  Compass,
  FileSpreadsheet,
  Check,
  Sparkles,
  ShieldCheck,
  FileText,
  Workflow,
  Search,
  Footprints,
  Camera,
  IndianRupee,
  TrendingUp,
} from "lucide-react";
import { useCRM } from "@repo/core/context/crm-context";
import { Button } from "@repo/ui/components/button";
import { Badge } from "@repo/ui/components/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@repo/ui/components/card";
import { PipelineBadge, TaskStatusBadge, DealHealthBadge, LeadScoreBadge } from "@repo/ui/components/status-badge";
import { formatCurrencyINR, formatPhone } from "@repo/core/lib/utils";
import { Lead, Task } from "@repo/core/types/crm";
import { SellerOpportunitiesModal } from "@/components/verticals/real_estate/seller-opportunities-modal";
import { MeetingSummaryModal } from "@/components/crm/meeting-summary-modal";
import { NegotiationModal } from "@/components/crm/negotiation-modal";
import { SiteVisitDispatchModal } from "@/components/verticals/real_estate/site-visit-dispatch-modal";
import { CommissionModal } from "@/components/crm/commission-modal";
import { N8nIntegrationDrawer } from "@/components/crm/n8n-integration-drawer";
import { actionCardProps } from "@repo/ui/components/action-card";

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
    vertical,
  } = useCRM();

  const [activeTab, setActiveTab] = React.useState<"queue" | "buyers" | "tools">("queue");
  const [searchQuery, setSearchQuery] = React.useState("");

  const [isMeetingModalOpen, setIsMeetingModalOpen] = React.useState(false);
  const [isSellerModalOpen, setIsSellerModalOpen] = React.useState(false);
  const [isNegotiationOpen, setIsNegotiationOpen] = React.useState(false);
  const [isDispatchOpen, setIsDispatchOpen] = React.useState(false);
  const [isCommissionOpen, setIsCommissionOpen] = React.useState(false);
  const [isN8nDrawerOpen, setIsN8nDrawerOpen] = React.useState(false);
  const [selectedActionLead, setSelectedActionLead] = React.useState<Lead | null>(null);

  // Active tasks
  const overdueTasks = filteredTasks.filter((t) => t.status === "overdue");
  const dueTodayTasks = filteredTasks.filter((t) => t.status === "due_today");
  const completedTasks = filteredTasks.filter((t) => t.status === "completed");

  const siteVisitLeads = filteredLeads.filter((l) => l.stage === "site_visit");
  const activeLeads = React.useMemo(() => filteredLeads.filter((l) => l.stage !== "won" && l.stage !== "lost"), [filteredLeads]);
  const hotLeads = activeLeads.filter((l) => (l.leadScore || 0) >= 75);
  const hotPipelineValue = hotLeads.reduce((acc, l) => acc + l.budget, 0);

  const todayCallsCount = activities.filter((a) => a.userId === currentUser.id && a.type === "call").length;
  const callsTarget = 10;

  // Prioritized Next Actions
  const prioritizedNextActions = React.useMemo(() => {
    return [...activeLeads]
      .sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;
        if (a.followUpStatus === "overdue") scoreA += 500;
        if (b.followUpStatus === "overdue") scoreB += 500;
        if (a.stage === "site_visit") scoreA += 400;
        if (b.stage === "site_visit") scoreB += 400;
        if (a.dealHealth === "at_risk") scoreA += 300;
        if (b.dealHealth === "at_risk") scoreB += 300;
        return scoreB - scoreA;
      });
  }, [activeLeads]);

  const filteredBuyerList = filteredLeads.filter((l) =>
    searchQuery === "" ||
    l.personName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.projectName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toolCards = [
    {
      icon: Compass,
      color: "emerald",
      title: "Gate 2 Pass & Dispatch",
      desc: "Generate instant digital security gate passes and 30-min buyer dossier for site visits.",
      onClick: () => { setSelectedActionLead(filteredLeads[0] || null); setIsDispatchOpen(true); },
    },
    {
      icon: ShieldCheck,
      color: "purple",
      title: "Negotiation & Counter-Offers",
      desc: "Multi-party bidding tracker, developer discount ceilings, and real-time payment schedule planner.",
      onClick: () => { setSelectedActionLead(filteredLeads[0] || null); setIsNegotiationOpen(true); },
    },
    {
      icon: FileSpreadsheet,
      color: "amber",
      title: "Commission & Payout Ledger",
      desc: "Calculate developer slab payouts, CP splits, and GST TDS deductions on closed deals.",
      onClick: () => { setSelectedActionLead(filteredLeads[0] || null); setIsCommissionOpen(true); },
    },
    {
      icon: FileText,
      color: "primary",
      title: "AI Meeting Notes Structurer",
      desc: "Convert voice notes and rough call audio into clean structured action items and stage updates.",
      onClick: () => setIsMeetingModalOpen(true),
    },
    {
      icon: Sparkles,
      color: "amber",
      title: `Seller Match Radar (${sellerOpportunities.length})`,
      desc: "Proactive seller triggers: expiring leases, high ROI investors, and off-market listings.",
      onClick: () => setIsSellerModalOpen(true),
    },
    {
      icon: Workflow,
      color: "blue",
      title: "n8n Event Bus & Webhooks",
      desc: "Inspect 9 real estate webhooks: 99acres, MagicBricks, Meta Lead Ads, and WhatsApp Cloud.",
      onClick: () => setIsN8nDrawerOpen(true),
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 px-1 sm:px-2">
      {/* 1. Header & Pulse Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-md shadow-subtle">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Sales Cockpit · {currentUser.name}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            What should I do next?
          </h1>
          <p className="text-xs text-muted-foreground">
            {overdueTasks.length > 0
              ? `⚡ ${overdueTasks.length} overdue follow-up requiring immediate touchpoint.`
              : `All tasks on schedule. ${dueTodayTasks.length} calls queued for today.`}
          </p>
        </div>

        {/* Quick Log Action */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => onOpenQuickLog()}
            className="h-9 px-4 text-xs font-bold bg-primary text-primary-foreground shadow-subtle rounded-xl gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Log Quick Touchpoint</span>
          </Button>
        </div>
      </div>

      {/* Materials Quick Operations Bar (Field & Depot Reps) */}
      {vertical === "building_materials" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => onNavigateTab?.("footfall")}
            className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-left transition-all flex items-center gap-3 group"
          >
            <div className="h-9 w-9 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Footprints className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-xs text-foreground block truncate">Log Walk-in</span>
              <span className="text-[10px] text-muted-foreground block truncate">Offline counter visitor</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab?.("scouting")}
            className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-left transition-all flex items-center gap-3 group"
          >
            <div className="h-9 w-9 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Camera className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-xs text-foreground block truncate">Scout Site</span>
              <span className="text-[10px] text-muted-foreground block truncate">Photo + GPS lead</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab?.("khata")}
            className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-left transition-all flex items-center gap-3 group"
          >
            <div className="h-9 w-9 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <IndianRupee className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-xs text-foreground block truncate">Khata Ledger</span>
              <span className="text-[10px] text-muted-foreground block truncate">Contractor credit balance</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab?.("rates")}
            className="p-3 rounded-xl border border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 text-left transition-all flex items-center gap-3 group"
          >
            <div className="h-9 w-9 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-xs text-foreground block truncate">Daily Rates</span>
              <span className="text-[10px] text-muted-foreground block truncate">Wholesale rate board</span>
            </div>
          </button>
        </div>
      )}

      {/* 2. Hero Pulse Metrics (3 Key Numbers) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 sm:p-5 border-border/80 bg-gradient-to-br from-card to-card/60 shadow-subtle">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            <span>Pending Calls Today</span>
            <Phone className="h-4 w-4 text-primary/70" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {dueTodayTasks.length + overdueTasks.length}
            </span>
            <span className="text-xs text-muted-foreground">calls in queue</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Logged today: {todayCallsCount}/{callsTarget}</span>
            {overdueTasks.length > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                {overdueTasks.length} Overdue
              </Badge>
            )}
          </div>
        </Card>

        <Card className="p-4 sm:p-5 border-border/80 bg-gradient-to-br from-card to-card/60 shadow-subtle">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            <span>Site Visits Booked</span>
            <Building2 className="h-4 w-4 text-amber-500/80" />
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {siteVisitLeads.length}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Physical walkthroughs</span>
            <span className="font-semibold text-amber-600">High Intent</span>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 border-border/80 bg-gradient-to-br from-card to-card/60 shadow-subtle">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            <span>Hot Pipeline Value</span>
            <Flame className="h-4 w-4 text-orange-500/80" />
          </div>
          <div className="mt-3 text-xl sm:text-2xl font-black text-foreground tracking-tight font-mono truncate">
            {formatCurrencyINR(hotPipelineValue)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-bold text-foreground">{hotLeads.length}</span> VIP buyers with score &ge; 75
          </div>
        </Card>
      </div>

      {/* 3. Segmented Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border/70 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("queue")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "queue"
              ? "bg-primary text-primary-foreground shadow-subtle"
              : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Zap className="h-3.5 w-3.5" />
          <span>Action Queue</span>
          {(overdueTasks.length + dueTodayTasks.length) > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === "queue" ? "bg-white/20 text-white" : "bg-primary/20 text-primary"}`}>
              {overdueTasks.length + dueTodayTasks.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("buyers")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "buyers"
              ? "bg-primary text-primary-foreground shadow-subtle"
              : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <User className="h-3.5 w-3.5" />
          <span>My Active Buyers</span>
          <span className="text-[10px] opacity-70">({filteredLeads.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("tools")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "tools"
              ? "bg-primary text-primary-foreground shadow-subtle"
              : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Compass className="h-3.5 w-3.5" />
          <span>Closing Tools & Automations</span>
        </button>
      </div>

      {/* 4. Tab Contents */}

      {/* TAB 1: TODAY'S ACTION QUEUE */}
      {activeTab === "queue" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Priority Call Queue (7-cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="p-5 space-y-3 shadow-subtle border-border/80">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <h3 className="text-sm font-bold text-foreground">Priority Next Actions</h3>
                </div>
                <span className="text-xs font-mono text-muted-foreground">AI Prioritized</span>
              </div>

              <div className="space-y-3">
                {prioritizedNextActions.slice(0, 5).map((lead) => (
                  <div
                    key={lead.id}
                    className="p-3.5 rounded-xl border border-border bg-card hover:bg-secondary/20 transition-all space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{lead.personName}</span>
                          <PipelineBadge stage={lead.stage} />
                          <LeadScoreBadge score={lead.leadScore} label={lead.leadScoreLabel} />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {lead.projectName} • Budget: <strong className="font-mono text-foreground">{formatCurrencyINR(lead.budget)}</strong>
                        </p>
                      </div>
                      <DealHealthBadge health={lead.dealHealth} reason={lead.dealHealthReason} />
                    </div>

                    <div className="text-[11px] text-muted-foreground bg-secondary/30 p-2 rounded-lg leading-relaxed">
                      <strong>Next Action:</strong> {lead.recommendedAction || "Call buyer to confirm requirements."}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Due: {lead.nextFollowUpAt || "Today"}
                      </span>
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${lead.phone}`}
                          className="inline-flex items-center h-7 px-2.5 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border border-blue-500/20 transition-colors"
                        >
                          <Phone className="h-3 w-3 mr-1" />
                          Call
                        </a>
                        <a
                          href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center h-7 px-2.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          WhatsApp
                        </a>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onOpenQuickLog(lead.id)}
                          className="h-7 text-xs px-2.5"
                        >
                          Log
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column: Due Tasks Checklist & Daily Pulse (5-cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-5 space-y-3 shadow-subtle border-border/80">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Follow-up Checklist</h3>
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  {completedTasks.length}/{filteredTasks.length} Done
                </span>
              </div>

              <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                {filteredTasks.slice(0, 6).map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 rounded-xl border text-xs transition-all flex items-start justify-between gap-3 ${
                      task.status === "completed"
                        ? "bg-secondary/20 border-border/50 opacity-60 line-through"
                        : task.status === "overdue"
                        ? "bg-rose-50/20 border-rose-200"
                        : "bg-card border-border"
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-bold text-foreground truncate">{task.title}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <span>{task.personName}</span>
                        <span>•</span>
                        <span className="font-mono">{task.dueDate}</span>
                      </div>
                    </div>

                    {task.status !== "completed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => completeTask(task.id)}
                        className="h-6 text-[10px] px-2 shrink-0 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Done
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: MY ACTIVE BUYERS */}
      {activeTab === "buyers" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search buyer name, project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 rounded-lg border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {filteredBuyerList.length} Active Leads Assigned
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredBuyerList.map((lead) => (
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
                  <span>Due: {lead.nextFollowUpAt || "Today"}</span>
                  <DealHealthBadge health={lead.dealHealth} reason={lead.dealHealthReason} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TOOLS & CLOSING ROOM */}
      {activeTab === "tools" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {toolCards.map((tool) => {
            const Icon = tool.icon;
            const colorMap: Record<string, string> = {
              emerald: "bg-emerald-500/10 text-emerald-600",
              purple: "bg-purple-500/10 text-purple-600",
              amber: "bg-amber-500/10 text-amber-600",
              primary: "bg-primary/10 text-primary",
              blue: "bg-blue-500/10 text-blue-600",
            };
            const hoverMap: Record<string, string> = {
              emerald: "hover:border-emerald-500/50",
              purple: "hover:border-purple-500/50",
              amber: "hover:border-amber-500/50",
              primary: "hover:border-primary/50",
              blue: "hover:border-blue-500/50",
            };
            return (
              <Card
                key={tool.title}
                onClick={tool.onClick}
                className={`p-5 border-border ${hoverMap[tool.color]} cursor-pointer space-y-3 shadow-subtle hover:shadow-card transition-all`}
              >
                <div className={`h-9 w-9 rounded-xl ${colorMap[tool.color]} flex items-center justify-center`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{tool.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{tool.desc}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <SellerOpportunitiesModal
        isOpen={isSellerModalOpen}
        onClose={() => setIsSellerModalOpen(false)}
      />

      <MeetingSummaryModal
        isOpen={isMeetingModalOpen}
        onClose={() => setIsMeetingModalOpen(false)}
        lead={selectedActionLead}
      />

      <NegotiationModal
        open={isNegotiationOpen}
        onOpenChange={setIsNegotiationOpen}
        lead={selectedActionLead}
        unit={null}
      />

      <SiteVisitDispatchModal
        open={isDispatchOpen}
        onOpenChange={setIsDispatchOpen}
        lead={selectedActionLead}
        unit={null}
      />

      <CommissionModal
        open={isCommissionOpen}
        onOpenChange={setIsCommissionOpen}
        lead={selectedActionLead}
      />

      <N8nIntegrationDrawer
        open={isN8nDrawerOpen}
        onOpenChange={setIsN8nDrawerOpen}
      />
    </div>
  );
}
