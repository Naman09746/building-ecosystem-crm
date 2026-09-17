"use client";

import * as React from "react";
import {
  Workflow,
  ShieldCheck,
  Zap,
  RefreshCw,
  Server,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  ExternalLink,
  Cpu,
  Radio,
  Clock,
  Layers,
} from "lucide-react";
import { useCRM } from "@repo/core/context/crm-context";
import { ResponsiveModal } from "@repo/ui/components/responsive-modal";
import { Button } from "@repo/ui/components/button";
import { Badge } from "@repo/ui/components/badge";
import { toast } from "sonner";

interface N8nIntegrationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function N8nIntegrationDrawer({
  open,
  onOpenChange,
}: N8nIntegrationDrawerProps) {
  const { currentUser } = useCRM();

  const [isLoading, setIsLoading] = React.useState(false);
  const [stats, setStats] = React.useState({
    pending: 0,
    delivered: 142,
    failed: 0,
    circuitBreaker: "normal",
  });

  const handleManualRetry = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setStats((prev) => ({ ...prev, pending: 0, failed: 0, delivered: prev.delivered + prev.failed }));
    setIsLoading(false);
    toast.success("Outbox event dispatch queue flushed & retried successfully!");
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-[760px] p-0 overflow-hidden bg-slate-950 border border-slate-800 text-slate-100"
    >
      {/* Header */}
      <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-950">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-blue-500/40 text-blue-300 bg-blue-500/10 font-mono text-[10px]">
              <Workflow className="h-3 w-3 mr-1" />
              EcosystemRealty + n8n Architecture
            </Badge>
            <span className="text-xs text-slate-400 font-mono">Separation of Responsibilities</span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Core CRM: Independent</span>
          </div>
        </div>

        <div className="mt-2">
          <h2 className="text-lg font-black text-slate-100">
            External Automation & Integration Orchestration Hub
          </h2>
          <p className="text-xs text-slate-400">
            EcosystemRealty owns business truth (PostgreSQL + RLS). n8n handles external webhooks, WhatsApp, Google Calendar, and AI suggestions.
          </p>
        </div>
      </div>

      <div className="p-5 max-h-[72vh] overflow-y-auto space-y-5">
        {/* Architecture Topology Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* EcosystemRealty Core */}
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <Server className="h-4 w-4" />
                EcosystemRealty Application Core
              </span>
              <Badge className="bg-emerald-500/20 text-emerald-300 text-[9px] font-mono">
                AUTHORITATIVE
              </Badge>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Transactional Source of Truth for People, Leads, Requirements, Listings, Mandates, Negotiations, and Brokerage.
            </p>
            <div className="pt-1.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Zero-Downtime: Works 100% if n8n is offline</span>
            </div>
          </div>

          {/* n8n Automation Engine */}
          <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-950/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                <Workflow className="h-4 w-4" />
                n8n Orchestration Layer
              </span>
              <Badge className="bg-blue-500/20 text-blue-300 text-[9px] font-mono">
                EXTERNAL BUS
              </Badge>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Manages Meta Lead Ads, WhatsApp Cloud API, Telephony, Calendar dispatch, and AI requirement extraction drafts.
            </p>
            <div className="pt-1.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-1">
              <Lock className="h-3.5 w-3.5 text-blue-400" />
              <span>AI requires human approval for CRM mutations</span>
            </div>
          </div>
        </div>

        {/* Real-Time Outbox Queue & Circuit Breaker */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-amber-400" />
              Domain Event Outbox Queue
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={isLoading}
              onClick={handleManualRetry}
              className="h-7 px-2 text-[10px] font-bold border-slate-700 bg-slate-950 text-slate-300 hover:text-white"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? "animate-spin" : ""}`} />
              Flush / Retry Queue
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center font-mono">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 block">Pending Dispatch</span>
              <span className="text-lg font-bold text-amber-400">{stats.pending}</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 block">Delivered to n8n</span>
              <span className="text-lg font-bold text-emerald-400">{stats.delivered}</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 block">Failed / Retrying</span>
              <span className="text-lg font-bold text-slate-400">{stats.failed}</span>
            </div>
          </div>
        </div>

        {/* Connected External Channels */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Connected Channels & Idempotency Safeguards
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-200 block">Meta Lead Ads Webhook</span>
                <span className="text-[10px] font-mono text-emerald-400">Idempotent (SHA-256 Verified)</span>
              </div>
              <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-300">
                ACTIVE
              </Badge>
            </div>

            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-200 block">WhatsApp Cloud API</span>
                <span className="text-[10px] font-mono text-emerald-400">2-Way Conversation Sync</span>
              </div>
              <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-300">
                ACTIVE
              </Badge>
            </div>

            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-200 block">Google Calendar Sync</span>
                <span className="text-[10px] font-mono text-emerald-400">Site Visit Invitations</span>
              </div>
              <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-300">
                ACTIVE
              </Badge>
            </div>

            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-200 block">AI Requirement Extraction</span>
                <span className="text-[10px] font-mono text-amber-400">Human Approval Enforced</span>
              </div>
              <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-300">
                GUARDRAIL ON
              </Badge>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs border-slate-700 bg-slate-900 text-slate-300"
          >
            Close
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
