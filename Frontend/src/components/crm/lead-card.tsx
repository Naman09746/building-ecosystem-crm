"use client";

import * as React from "react";
import {
  Phone,
  MessageSquare,
  Plus,
  Building2,
  Calendar,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { Lead } from "@/types/crm";
import {
  PipelineBadge,
  TaskStatusBadge,
  DealHealthBadge,
  LeadScoreBadge,
} from "@/components/ui/status-badge";
import { formatCurrencyINR, formatPhone } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface LeadCardProps {
  lead: Lead;
  onSelect: (lead: Lead) => void;
  onLogActivity: (leadId: string) => void;
}

export function LeadCard({
  lead,
  onSelect,
  onLogActivity,
}: LeadCardProps) {
  return (
    <div
      onClick={() => onSelect(lead)}
      className="p-3.5 rounded-xl border border-border bg-card shadow-subtle hover:border-primary/40 active:scale-[0.99] transition-all space-y-3 cursor-pointer select-none"
    >
      {/* Top Row: Name, Score & Health */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-bold text-sm text-foreground tracking-tight truncate">
              {lead.personName}
            </h3>
            {lead.leadScore && (
              <LeadScoreBadge score={lead.leadScore} label={lead.leadScoreLabel} />
            )}
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            {formatPhone(lead.phone)}
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-1">
          <DealHealthBadge health={lead.dealHealth} />
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
        </div>
      </div>

      {/* Property & Budget Details */}
      <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-secondary/40 text-xs">
        <div>
          <span className="text-[10px] text-muted-foreground block font-medium">
            Project &amp; Unit
          </span>
          <span className="font-semibold text-foreground truncate block">
            {lead.projectName}
          </span>
          {lead.assignedUnitNumber && (
            <span className="text-[10px] font-mono text-muted-foreground">
              Unit {lead.assignedUnitNumber}
            </span>
          )}
        </div>

        <div>
          <span className="text-[10px] text-muted-foreground block font-medium">
            Budget
          </span>
          <span className="font-bold font-mono text-foreground text-xs block">
            {formatCurrencyINR(lead.budget)}
          </span>
          <span className="text-[10px] text-muted-foreground capitalize">
            {lead.configurationPreference || "Luxury Config"}
          </span>
        </div>
      </div>

      {/* Stage & Next Follow-up Info */}
      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
        <div className="flex items-center gap-1.5">
          <PipelineBadge stage={lead.stage} />
        </div>

        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span className="truncate max-w-[120px]">
            {lead.nextFollowUpAt || "No follow-up set"}
          </span>
          {lead.followUpStatus && (
            <TaskStatusBadge status={lead.followUpStatus} />
          )}
        </div>
      </div>

      {/* 44px Minimum Touch Action Row */}
      <div
        className="flex items-center gap-2 pt-1 border-t border-border/30"
        onClick={(e) => e.stopPropagation()}
      >
        <a
          href={`tel:${lead.phone}`}
          className="flex-1 flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs transition-colors"
        >
          <Phone className="h-3.5 w-3.5" />
          <span>Call</span>
        </a>

        <a
          href={`https://wa.me/${lead.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
            `Hi ${lead.personName}, following up regarding your interest in ${lead.projectName}. When is a good time for a quick 5-min briefing?`
          )}`}
          target="_blank"
          rel="noreferrer"
          aria-label={`WhatsApp ${lead.personName}`}
          className="flex-1 flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 border border-emerald-300 transition-colors"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>WhatsApp</span>
        </a>

        <button
          type="button"
          onClick={() => onLogActivity(lead.id)}
          className="flex items-center justify-center h-10 px-3.5 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 active:bg-secondary text-foreground border border-border transition-colors shrink-0"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          <span>Log</span>
        </button>
      </div>
    </div>
  );
}
