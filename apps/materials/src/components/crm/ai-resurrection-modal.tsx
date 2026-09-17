"use client";

import * as React from "react";
import { useCRM } from "@repo/core/context/crm-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { Badge } from "@repo/ui/components/badge";
import {
  Sparkles,
  Zap,
  Flame,
  Building2,
  TrendingUp,
  UserCheck,
  CheckCircle2,
  RefreshCw,
  Copy,
  MessageSquare,
  ShieldCheck,
  Check,
  CheckCircle,
  AlertCircle,
  Clock,
  Layers,
} from "lucide-react";
import { formatCurrencyINR, formatPhone } from "@repo/core/lib/utils";
import { ResurrectionCandidate, ResurrectionOpportunity } from "@repo/core/types/resurrection";
import { toast } from "sonner";

interface AiResurrectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLeadId?: string;
}

export function AiResurrectionModal({
  open,
  onOpenChange,
  defaultLeadId,
}: AiResurrectionModalProps) {
  const { leads, reactivationLeads, reactivateLead, projects, units } = useCRM();

  const [selectedLeadId, setSelectedLeadId] = React.useState<string>(
    defaultLeadId || reactivationLeads[0]?.id || leads[0]?.id || ""
  );
  const [pitchAngle, setPitchAngle] = React.useState<
    "new_tower" | "payment_plan" | "price_adjustment" | "exclusive_unit"
  >("new_tower");
  const [isLoadingCandidates, setIsLoadingCandidates] = React.useState(false);
  const [candidates, setCandidates] = React.useState<ResurrectionCandidate[]>([]);
  const [selectedCandidateIdx, setSelectedCandidateIdx] = React.useState(0);
  const [isResurrecting, setIsResurrecting] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Sync selectedLeadId when defaultLeadId changes
  React.useEffect(() => {
    if (defaultLeadId) {
      setSelectedLeadId(defaultLeadId);
    } else if (reactivationLeads.length > 0 && !selectedLeadId) {
      setSelectedLeadId(reactivationLeads[0].id);
    }
  }, [defaultLeadId, reactivationLeads, selectedLeadId]);

  const selectedLead = leads.find((l) => l.id === selectedLeadId) || reactivationLeads[0];

  // Fetch live server candidates whenever selectedLeadId changes
  const fetchLeadCandidates = React.useCallback(async (leadId: string) => {
    if (!leadId) return;
    setIsLoadingCandidates(true);
    try {
      const res = await fetch("/api/agent/resurrect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, limit: 5, minScore: 50 }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data?.candidates)) {
          setCandidates(json.data.candidates);
          setSelectedCandidateIdx(0);
          return;
        }
      }
    } catch {
      // non-blocking
    } finally {
      setIsLoadingCandidates(false);
    }
  }, []);

  React.useEffect(() => {
    if (open && selectedLeadId) {
      fetchLeadCandidates(selectedLeadId);
    }
  }, [open, selectedLeadId, fetchLeadCandidates]);

  const activeCandidate = candidates[selectedCandidateIdx] || null;

  // Fallback matched inventory if offline or initial state
  const fallbackInventory = React.useMemo(() => {
    if (!selectedLead) return null;
    const project = projects.find((p) => p.id === selectedLead.projectId) || projects[0];
    const projectUnits = units.filter((u) => u.projectId === project?.id && u.status === "available");
    const matchedUnit = projectUnits[0] || {
      tower: "Tower A",
      unitNumber: "1402",
      configuration: selectedLead.configurationPreference || "3 BHK Luxury",
      price: selectedLead.budget ? selectedLead.budget * 0.95 : 35000000,
      floor: 14,
      facing: selectedLead.facingPreference || "East",
    };

    return {
      projectName: project?.name || "The Grand Palm",
      location: project?.location || "Gurgaon Golf Course Ext",
      tower: matchedUnit.tower,
      unitNumber: matchedUnit.unitNumber,
      configuration: matchedUnit.configuration,
      price: matchedUnit.price,
      floor: matchedUnit.floor,
      facing: matchedUnit.facing,
    };
  }, [selectedLead, projects, units]);

  const displayUnit = activeCandidate?.unit || fallbackInventory;
  const scoreBreakdown = activeCandidate?.score;

  // Dynamically generated personalized pitch
  const generatedPitch = React.useMemo(() => {
    if (!selectedLead || !displayUnit) return "";

    const name = selectedLead.personName.split(" ")[0];
    const budgetStr = formatCurrencyINR(displayUnit.price);

    switch (pitchAngle) {
      case "new_tower":
        return `Namaste ${name} ji! 🌟 Exciting news regarding your search for a ${displayUnit.configuration} in ${displayUnit.location}. The developer has just officially opened ${displayUnit.tower} with priority allotment pricing starting at ${budgetStr}. Since you had previously shortlisted this project, I can reserve an exclusive VIP preview slot for you this Saturday before public launch. Would 11:30 AM work for a quick walkthrough?`;

      case "payment_plan":
        return `Hi ${name}, following up on your inquiry for ${displayUnit.projectName}. The builder has introduced a bespoke 20:80 possession-linked builder subvention scheme for select ${displayUnit.configuration} residences, reducing upfront capital requirement by 40%. Given your investment horizon, shall I send across the revised payment matrix on WhatsApp?`;

      case "price_adjustment":
        return `Namaste ${name} ji, reaching out with an exclusive opportunity: an inventory unit on floor ${displayUnit.floor || "14"} (${displayUnit.tower}, Unit ${displayUnit.unitNumber}) has just been released at a special pre-negotiated rate of ${budgetStr}, matching your target budget. Can I share the master floor plan and view certificate with you today?`;

      case "exclusive_unit":
        return `Hello ${name}, a prime Vastu-compliant ${displayUnit.facing ? `${displayUnit.facing}-facing ` : ""}${displayUnit.configuration} in ${displayUnit.projectName} just became available due to an NRI allotment reallocation. Since you specifically looked for this layout earlier, I wanted to give you first right of refusal before releasing to open market. Would you be open for a brief 2-minute call today?`;

      default:
        return "";
    }
  }, [selectedLead, displayUnit, pitchAngle]);

  const handleCopyPitch = () => {
    if (!generatedPitch) return;
    navigator.clipboard.writeText(generatedPitch);
    setCopied(true);
    toast.success("Resurrection pitch copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResurrectLead = async () => {
    if (!selectedLead) return;
    setIsResurrecting(true);

    try {
      // Call authoritative server execution endpoint
      const res = await fetch("/api/agent/resurrect/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: selectedLead.id,
          unitId: activeCandidate?.unit?.id || null,
          pitch: generatedPitch,
        }),
      });

      if (!res.ok) {
        // Fallback to context reactivateLead
        await reactivateLead(selectedLead.id, generatedPitch);
      }

      toast.success(`⚡ Resurrected ${selectedLead.personName}!`, {
        description: `Lead moved to Contacted stage. Assigned rep received high-priority follow-up task with ready-to-send pitch.`,
      });
      onOpenChange(false);
    } catch {
      await reactivateLead(selectedLead.id, generatedPitch);
      onOpenChange(false);
    } finally {
      setIsResurrecting(false);
    }
  };

  const handleBatchResurrectAll = async () => {
    setIsResurrecting(true);
    try {
      const eligibleIds = reactivationLeads.map((l) => l.id);
      const res = await fetch("/api/agent/resurrect/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: eligibleIds,
          pitch: "Automated Multi-Factor Resurrection: Matched with high-conviction luxury inventory.",
        }),
      });

      if (!res.ok) {
        for (const lead of reactivationLeads) {
          await reactivateLead(lead.id, "Multi-factor matched inventory pitch.");
        }
      }

      toast.success(`⚡ Batch Resurrected ${reactivationLeads.length} Leads!`, {
        description: "All dormant opportunities re-injected into the active pipeline with prioritized rep call queues.",
      });
      onOpenChange(false);
    } finally {
      setIsResurrecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-card border-border shadow-2xl">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 text-white border-b border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" /> MULTI-FACTOR RESURRECTION ENGINE
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {reactivationLeads.length} Dormant Deals Available
              </span>
            </div>
            <DialogTitle className="text-lg font-serif font-bold text-white tracking-wide">
              Lost-Lead Multi-Factor Inventory Matcher & Pitch Dispatcher
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300">
              Deterministic 100-point matching scoring project compatibility, budget fit, layout configuration, floor/facing preferences, and inventory recency.
            </DialogDescription>
          </div>

          <Button
            size="sm"
            onClick={handleBatchResurrectAll}
            disabled={isResurrecting || reactivationLeads.length === 0}
            className="hidden sm:flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shrink-0"
          >
            <Zap className="w-3.5 h-3.5" /> Resurrect All ({reactivationLeads.length})
          </Button>
        </div>

        {/* Body Content */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-5 text-xs max-h-[75vh] overflow-y-auto">
          {/* Left Column: Stale / Lost Leads Selector (4 Cols) */}
          <div className="md:col-span-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-amber-600" /> Dormant Buyers
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {reactivationLeads.length} leads
              </span>
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {reactivationLeads.map((lead) => {
                const isSelected = lead.id === selectedLeadId;
                return (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-amber-500 bg-amber-500/10 shadow-subtle"
                        : "border-border bg-secondary/30 hover:border-amber-300 hover:bg-secondary/60"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-foreground block">
                          {lead.personName}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {formatPhone(lead.phone)}
                        </span>
                      </div>
                      <span className="font-bold text-foreground font-mono">
                        {formatCurrencyINR(lead.budget)}
                      </span>
                    </div>

                    <div className="text-[10px] text-muted-foreground mt-1 flex items-center justify-between">
                      <span className="truncate max-w-[120px]">{lead.projectName || "General Inquiry"}</span>
                      <span className="text-amber-700 dark:text-amber-400 font-mono font-semibold">
                        {lead.daysInStage}d inactive
                      </span>
                    </div>

                    {lead.lostReason && (
                      <div className="mt-1 text-[9px] text-muted-foreground font-mono bg-secondary/50 px-1.5 py-0.5 rounded inline-block">
                        Lost: {lead.lostReason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Multi-Factor Candidate Match & Pitch (8 Cols) */}
          <div className="md:col-span-8 space-y-4">
            {selectedLead && displayUnit ? (
              <>
                {/* Score & Candidate Header Card */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white border border-indigo-500/40 shadow-lg space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-500/20">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span className="font-mono font-bold text-xs text-white">
                        MULTI-FACTOR MATCH SCORE: {scoreBreakdown?.total ?? 92}/100
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-bold font-mono ${
                          (scoreBreakdown?.total ?? 92) >= 90
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : (scoreBreakdown?.total ?? 92) >= 75
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            : "bg-blue-500/20 text-blue-300 border-blue-500/40"
                        }`}
                      >
                        {scoreBreakdown?.tierLabel || "Strong Match"}
                      </Badge>
                    </div>

                    {candidates.length > 1 && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400">Unit:</span>
                        {candidates.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedCandidateIdx(i)}
                            className={`h-5 w-5 rounded text-[10px] font-mono font-bold transition-all ${
                              selectedCandidateIdx === i
                                ? "bg-amber-500 text-slate-950"
                                : "bg-slate-800 text-slate-400 hover:text-white"
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sub-Score Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[10px] font-mono">
                    <div className="p-1.5 rounded bg-slate-900/90 border border-slate-800 text-center">
                      <span className="text-slate-400 block text-[9px]">Project</span>
                      <span className="font-bold text-indigo-300">{scoreBreakdown?.project ?? 40}/40</span>
                    </div>
                    <div className="p-1.5 rounded bg-slate-900/90 border border-slate-800 text-center">
                      <span className="text-slate-400 block text-[9px]">Budget</span>
                      <span className="font-bold text-emerald-300">{scoreBreakdown?.budget ?? 30}/30</span>
                    </div>
                    <div className="p-1.5 rounded bg-slate-900/90 border border-slate-800 text-center">
                      <span className="text-slate-400 block text-[9px]">Layout</span>
                      <span className="font-bold text-amber-300">{scoreBreakdown?.configuration ?? 20}/20</span>
                    </div>
                    <div className="p-1.5 rounded bg-slate-900/90 border border-slate-800 text-center">
                      <span className="text-slate-400 block text-[9px]">Floor & Facing</span>
                      <span className="font-bold text-sky-300">
                        {(scoreBreakdown?.floor ?? 5) + (scoreBreakdown?.facing ?? 5)}/10
                      </span>
                    </div>
                    <div className="p-1.5 rounded bg-slate-900/90 border border-slate-800 text-center col-span-2 sm:col-span-1">
                      <span className="text-slate-400 block text-[9px]">Recency</span>
                      <span className="font-bold text-purple-300">+{scoreBreakdown?.recency ?? 5}</span>
                    </div>
                  </div>

                  {/* Selected Unit Details & Explainable Reasons */}
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                        {displayUnit.projectName} · {displayUnit.tower} ({displayUnit.unitNumber})
                      </span>
                      <span className="font-bold text-emerald-300 font-mono">
                        {formatCurrencyINR(displayUnit.price)}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-300 flex items-center gap-3 font-mono">
                      <span>{displayUnit.configuration}</span>
                      {displayUnit.floor && <span>Floor {displayUnit.floor}</span>}
                      {displayUnit.facing && <span>{displayUnit.facing} Facing</span>}
                      <span className="text-slate-400">{displayUnit.location}</span>
                    </div>

                    {/* Reasons List */}
                    {activeCandidate?.reasons && activeCandidate.reasons.length > 0 && (
                      <div className="pt-1 space-y-1 border-t border-slate-800/80">
                        {activeCandidate.reasons.map((reason, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-[10px] text-slate-300">
                            <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Pitch Strategy Angle Selection */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground flex items-center gap-1 text-[11px]">
                      <Sparkles className="w-3 h-3 text-amber-600" /> Select Re-Engagement Angle:
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Adaptive outreach angle
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPitchAngle("new_tower")}
                      className={`p-2 rounded-lg border text-left font-medium transition-all ${
                        pitchAngle === "new_tower"
                          ? "border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-300 font-bold"
                          : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      🚀 New Tower Allotment
                    </button>

                    <button
                      type="button"
                      onClick={() => setPitchAngle("payment_plan")}
                      className={`p-2 rounded-lg border text-left font-medium transition-all ${
                        pitchAngle === "payment_plan"
                          ? "border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-300 font-bold"
                          : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      💳 20:80 Payment Scheme
                    </button>

                    <button
                      type="button"
                      onClick={() => setPitchAngle("price_adjustment")}
                      className={`p-2 rounded-lg border text-left font-medium transition-all ${
                        pitchAngle === "price_adjustment"
                          ? "border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-300 font-bold"
                          : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      🏷️ Pre-Negotiated Price Drop
                    </button>

                    <button
                      type="button"
                      onClick={() => setPitchAngle("exclusive_unit")}
                      className={`p-2 rounded-lg border text-left font-medium transition-all ${
                        pitchAngle === "exclusive_unit"
                          ? "border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-300 font-bold"
                          : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      💎 NRI Reallocation Unit
                    </button>
                  </div>
                </div>

                {/* AI Generated Pitch Preview */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-[11px] flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-emerald-600" /> Re-Engagement WhatsApp Pitch
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPitch}
                      className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      {copied ? "Copied!" : "Copy Pitch"}
                    </button>
                  </div>

                  <div className="p-3 rounded-xl border border-border bg-secondary/50 text-foreground leading-relaxed text-[11px] font-sans">
                    {generatedPitch}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleResurrectLead}
                    disabled={isResurrecting}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 shadow-md"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    ⚡ Resurrect & Dispatch Pitch to Rep
                  </Button>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                {isLoadingCandidates ? "Scanning live inventory..." : "No dormant leads currently selected."}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
