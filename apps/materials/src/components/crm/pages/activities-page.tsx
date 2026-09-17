"use client";

import * as React from "react";
import {
  Activity as ActivityIcon,
  Phone,
  MessageSquare,
  Building2,
  Calendar,
  User,
  Search,
  Filter,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useCRM } from "@repo/core/context/crm-context";
import { Badge } from "@repo/ui/components/badge";
import { Input } from "@repo/ui/components/input";
import { Button } from "@repo/ui/components/button";
import { QuickActivityModal } from "@/components/crm/quick-activity-modal";

export function ActivitiesPage() {
  const { activities, currentUser, leads } = useCRM();
  const [scope, setScope] = React.useState<"my" | "team">("my");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [search, setSearch] = React.useState("");
  const [quickLogOpen, setQuickLogOpen] = React.useState(false);
  const [quickLogLeadId, setQuickLogLeadId] = React.useState<string | undefined>();

  const filteredActivities = React.useMemo(() => {
    return activities.filter((act) => {
      // Scope Filter
      if (scope === "my" && act.userId !== currentUser.id) return false;

      // Type Filter
      if (typeFilter !== "all") {
        if (typeFilter === "calls" && act.type !== "call") return false;
        if (typeFilter === "whatsapp" && act.type !== "whatsapp") return false;
        if (typeFilter === "site_visits" && act.type !== "site_visit") return false;
        if (typeFilter === "bookings" && act.type !== "stage_change" && act.type !== "booking") return false;
      }

      // Search Filter
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchPerson = act.personName?.toLowerCase().includes(query);
        const matchUser = act.userName?.toLowerCase().includes(query);
        const matchNotes = act.notes?.toLowerCase().includes(query);
        const matchOutcome = act.outcomeLabel?.toLowerCase().includes(query);
        return matchPerson || matchUser || matchNotes || matchOutcome;
      }

      return true;
    });
  }, [activities, scope, typeFilter, search, currentUser]);

  const handleQuickLog = (leadId?: string) => {
    setQuickLogLeadId(leadId);
    setQuickLogOpen(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <ActivityIcon className="h-5 w-5 text-primary" />
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground">
              Activity History &amp; Timeline
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Operational sales narrative: What happened → What changed → What happens next?
          </p>
        </div>

        <Badge variant="outline" className="text-xs font-mono py-1 px-3 self-start sm:self-auto">
          {filteredActivities.length} Events Showing
        </Badge>
      </div>

      {/* Filter & Scope Toolbar */}
      <div className="p-3.5 rounded-xl border border-border bg-card shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        {/* Scope Toggle: My Activity | Team Activity */}
        <div className="inline-flex p-1 rounded-lg bg-secondary border border-border self-start">
          <button
            type="button"
            onClick={() => setScope("my")}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              scope === "my"
                ? "bg-card text-foreground shadow-subtle font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            My Activity
          </button>
          <button
            type="button"
            onClick={() => setScope("team")}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              scope === "team"
                ? "bg-card text-foreground shadow-subtle font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Team Activity
          </button>
        </div>

        {/* Activity Type Chips (Horizontally scrollable on mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: "all", label: "All Types" },
            { id: "calls", label: "Calls" },
            { id: "whatsapp", label: "WhatsApp" },
            { id: "site_visits", label: "Site Visits" },
            { id: "bookings", label: "Stage Changes" },
          ].map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setTypeFilter(type.id)}
              className={`h-8 px-3 rounded-lg text-xs font-medium border transition-all shrink-0 whitespace-nowrap ${
                typeFilter === type.id
                  ? "bg-primary text-primary-foreground border-primary font-bold shadow-subtle"
                  : "bg-secondary/60 text-muted-foreground border-border hover:bg-secondary hover:text-foreground"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-48">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activities..."
            className="pl-8 h-8 text-xs bg-secondary/40 rounded-lg"
          />
        </div>
      </div>

      {/* Actionable Narrative Activity Stream */}
      <div className="space-y-3">
        {filteredActivities.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground bg-card rounded-xl border border-dashed border-border">
            No activity logs match your filter criteria.
          </div>
        ) : (
          filteredActivities.map((act) => {
            const lead = leads.find((l) => l.id === act.leadId);

            return (
              <div
                key={act.id}
                className="p-3.5 sm:p-4 rounded-xl border border-border bg-card shadow-subtle space-y-3 text-xs transition-all hover:border-border/90"
              >
                {/* 1. Contact Header & Timestamp */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-foreground">{act.personName}</span>
                    {lead && (
                      <span className="text-muted-foreground text-xs font-mono">
                        • {lead.projectName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                    <span>by <strong>{act.userName}</strong></span>
                    <span>•</span>
                    <span>
                      {new Date(act.createdAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* 2. What Happened & What Changed */}
                <div className="p-2.5 rounded-lg bg-secondary/40 border border-border/40 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs capitalize flex items-center gap-1 text-foreground">
                      {act.type === "call" && <Phone className="h-3.5 w-3.5 text-blue-600" />}
                      {act.type === "whatsapp" && <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />}
                      {act.type === "site_visit" && <Building2 className="h-3.5 w-3.5 text-purple-600" />}
                      {act.type.replace("_", " ")}
                    </span>
                    {act.outcomeLabel && (
                      <Badge variant="secondary" className="text-[10px] font-bold py-0.5">
                        {act.outcomeLabel}
                      </Badge>
                    )}
                  </div>

                  {act.notes && (
                    <p className="text-foreground/90 text-xs font-medium leading-relaxed">
                      &ldquo;{act.notes}&rdquo;
                    </p>
                  )}
                </div>

                {/* 3. What Happens Next & 1-Click Outreach (44px touch targets on mobile) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 border-t border-border/40 text-xs">
                  <div>
                    {act.scheduledFollowUpAt ? (
                      <span className="text-amber-800 font-semibold font-mono flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        Next Action: {act.scheduledFollowUpAt}
                      </span>
                    ) : (
                      <span className="text-rose-700 font-semibold text-[11px] flex items-center gap-1.5 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        <AlertTriangle className="h-3 w-3 text-rose-600" />
                        Next step missing — Risk of deal stalling
                      </span>
                    )}
                  </div>

                  {lead && (
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${lead.phone}`}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center h-9 sm:h-7 px-3 sm:px-2 rounded-lg text-xs sm:text-[10px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                      >
                        <Phone className="h-3 w-3 mr-1" />
                        Call
                      </a>
                      <a
                        href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 sm:flex-none inline-flex items-center justify-center h-9 sm:h-7 px-3 sm:px-2 rounded-lg text-xs sm:text-[10px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        WhatsApp
                      </a>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-9 sm:h-7 px-2.5 text-xs sm:text-[10px] font-semibold shrink-0"
                        onClick={() => handleQuickLog(lead.id)}
                      >
                        Log Touchpoint
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <QuickActivityModal
        open={quickLogOpen}
        onOpenChange={setQuickLogOpen}
        defaultLeadId={quickLogLeadId}
      />
    </div>
  );
}
