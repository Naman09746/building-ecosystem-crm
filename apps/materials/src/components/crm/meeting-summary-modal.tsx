"use client";

import * as React from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Calendar,
  IndianRupee,
  MessageSquare,
  FileText,
  ShieldCheck,
  Send,
  Loader2,
  ArrowRight,
  Edit3,
} from "lucide-react";
import { useCRM } from "@repo/core/context/crm-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@repo/ui/components/dialog";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { PipelineBadge } from "@repo/ui/components/status-badge";
import { formatCurrencyINR } from "@repo/core/lib/utils";
import { VoiceNoteRecorder } from "@/components/crm/voice-note-recorder";
import type { Lead, PipelineStage, ActivityType, CallOutcome, StructuredMeetingDisposition } from "@repo/core/types/crm";
import { toast } from "sonner";

interface MeetingSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead | null;
}

export function MeetingSummaryModal({
  isOpen,
  onClose,
  lead,
}: MeetingSummaryModalProps) {
  const { leads, logActivity, updateLeadStage, vertical } = useCRM();

  const [selectedLeadId, setSelectedLeadId] = React.useState<string>(lead?.id || "");
  const [rawNotes, setRawNotes] = React.useState("");
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [proposal, setProposal] = React.useState<StructuredMeetingDisposition | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Editable proposal fields
  const [outcomeLabel, setOutcomeLabel] = React.useState("");
  const [suggestedStage, setSuggestedStage] = React.useState<PipelineStage>("qualified");
  const [followUpDate, setFollowUpDate] = React.useState("");
  const [notesSummary, setNotesSummary] = React.useState("");

  React.useEffect(() => {
    if (lead) {
      setSelectedLeadId(lead.id);
    } else if (leads.length > 0 && !selectedLeadId) {
      setSelectedLeadId(leads[0].id);
    }
  }, [lead, leads, selectedLeadId]);

  const currentLead = leads.find((l) => l.id === selectedLeadId);

  const handleAnalyzeNotes = async () => {
    if (!rawNotes.trim() || rawNotes.length < 5) {
      toast.error("Please enter descriptive meeting notes");
      return;
    }

    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/activities/meeting-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawNotes,
          leadId: selectedLeadId,
          personName: currentLead?.personName,
          vertical,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const p: StructuredMeetingDisposition = json.data?.proposal;
        if (p) {
          setProposal(p);
          setOutcomeLabel(p.outcomeLabel);
          setSuggestedStage(p.suggestedStage);
          setFollowUpDate(p.suggestedFollowUpAt ? p.suggestedFollowUpAt.split("T")[0] : "");
          setNotesSummary(p.conversationSummary);
          toast.success("AI has structured your meeting notes. Review below.");
        }
      } else {
        toast.error("Failed to analyze notes");
      }
    } catch {
      toast.error("Network error analyzing notes");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!currentLead) {
      toast.error("Please select a buyer lead");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/activities/meeting-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: currentLead.id,
          unitId: currentLead.unitId || currentLead.assignedUnitId || null,
          activityType: proposal?.activityType || "meeting",
          outcome: proposal?.outcome || "interested",
          outcomeLabel: outcomeLabel || "Discussion Completed",
          suggestedStage: suggestedStage,
          sentiment: proposal?.sentiment || "cautious",
          budgetConfirmed: proposal?.budgetConfirmed,
          extractedObjections: proposal?.extractedObjections || [],
          buyingSignals: proposal?.buyingSignals || [],
          conversationSummary: notesSummary || rawNotes,
          suggestedNextMove: proposal?.suggestedNextMove || "Follow up on requirements",
          scheduledFollowUpAt: followUpDate ? new Date(followUpDate).toISOString() : undefined,
          notes: rawNotes,
        }),
      });

      if (res.ok) {
        // Also log optimistic activity in UI context
        await logActivity({
          leadId: currentLead.id,
          unitId: currentLead.unitId,
          type: proposal?.activityType || "meeting",
          outcome: proposal?.outcome || "interested",
          outcomeLabel: outcomeLabel,
          notes: `${outcomeLabel}: ${notesSummary}`,
          nextFollowUp: followUpDate,
        });

        if (suggestedStage && suggestedStage !== currentLead.stage) {
          await updateLeadStage(currentLead.id, suggestedStage);
        }

        toast.success("Meeting disposition confirmed & state updated!");
        onClose();
        setRawNotes("");
        setProposal(null);
      } else {
        toast.error("Failed to save confirmed activity");
      }
    } catch {
      toast.error("Network error saving disposition");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto p-0 border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-border bg-gradient-to-r from-primary/10 via-card to-background">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 text-xs font-mono">
              <Sparkles className="h-3 w-3 mr-1" />
              Human-in-the-Loop AI Assistant
            </Badge>
            <span className="text-xs text-muted-foreground">Zero Autonomous State Mutation</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-foreground mt-1">
            Free-Text Meeting & Call Structurer
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Type or dictate raw notes in natural language. AI will extract objections, buying signals, and next moves for your approval.
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {/* Lead Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Select Buyer Lead</label>
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.personName} • {l.projectName} ({formatCurrencyINR(l.budget)}) — [{l.stage.toUpperCase()}]
                </option>
              ))}
            </select>
          </div>

          {/* Raw Text Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">Raw Meeting / Call Notes</label>
              <VoiceNoteRecorder
                buttonLabel="1-Tap Mic Dictation"
                onTranscribed={(transcriptText) => {
                  setRawNotes((prev) => (prev ? `${prev}\n${transcriptText}` : transcriptText));
                }}
              />
            </div>
            <textarea
              rows={4}
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              placeholder="e.g., Met Mr. Rajesh at The Camellias. Loved the 14th floor layout and golf view. Objected to the 42 Cr price, saying market in DLF 5 is around 38-40 Cr. Promised to send payment breakdown by Monday."
              className="w-full p-3 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
            />
          </div>

          {/* AI Structuring Trigger Button */}
          {!proposal && (
            <Button
              onClick={handleAnalyzeNotes}
              disabled={isAnalyzing || !rawNotes.trim()}
              className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Structuring Meeting Notes...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Structure Notes with Aria Intelligence</span>
                </>
              )}
            </Button>
          )}

          {/* Structured Proposal Card (Human Approval Gate) */}
          {proposal && (
            <Card className="border border-primary/30 bg-primary/5 shadow-md">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-foreground">AI Proposal (Human Review Required)</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono capitalize border-primary/30 text-primary">
                    Sentiment: {proposal.sentiment}
                  </Badge>
                </div>

                {/* Extracted Objections & Buying Signals */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-background border border-border space-y-1">
                    <span className="font-bold text-red-600 block">Extracted Objections:</span>
                    <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                      {proposal.extractedObjections.map((obj, i) => (
                        <li key={i}>{obj}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg bg-background border border-border space-y-1">
                    <span className="font-bold text-emerald-600 block">Buying Signals:</span>
                    <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                      {proposal.buyingSignals.map((sig, i) => (
                        <li key={i}>{sig}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Editable Proposed State Updates */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Outcome Label</label>
                    <input
                      type="text"
                      value={outcomeLabel}
                      onChange={(e) => setOutcomeLabel(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Suggested Stage</label>
                    <select
                      value={suggestedStage}
                      onChange={(e) => setSuggestedStage(e.target.value as any)}
                      className="w-full h-8 px-2 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {["new", "contacted", "qualified", "site_visit", "negotiation", "won", "lost"].map((st) => (
                        <option key={st} value={st}>
                          {st.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Follow-Up Date</label>
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full h-8 px-2 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    />
                  </div>
                </div>

                {/* Next Move Strategy */}
                <div className="p-3 rounded-lg bg-background border border-border text-xs space-y-1">
                  <span className="font-bold text-primary block">Recommended Next Move:</span>
                  <p className="text-muted-foreground leading-relaxed">{proposal.suggestedNextMove}</p>
                </div>

                {/* Human Confirmation Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setProposal(null)}
                    className="text-xs text-muted-foreground"
                  >
                    Discard & Re-type
                  </Button>
                  <Button
                    onClick={handleConfirmSave}
                    disabled={isSaving}
                    className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    <span>Approve & Save Activity</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
