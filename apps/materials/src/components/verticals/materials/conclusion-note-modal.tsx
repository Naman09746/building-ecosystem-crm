"use client";

import * as React from "react";
import {
  FileText,
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar,
  IndianRupee,
  Mic,
  AlertCircle,
  X,
  ArrowRight,
  Send,
} from "lucide-react";
import { useCRM } from "@repo/core/context/crm-context";
import { ResponsiveModal } from "@repo/ui/components/responsive-modal";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { VoiceNoteRecorder } from "@/components/crm/voice-note-recorder";
import { toast } from "sonner";
import { formatCurrencyINR } from "@repo/core/lib/utils";

export type MaterialsConclusionOutcome =
  | "quote_shared"
  | "order_confirmed"
  | "sample_sent"
  | "khata_credit_discussed"
  | "bargaining_rates"
  | "follow_up_needed"
  | "not_interested"
  | "rate_too_high";

interface ConclusionOption {
  id: MaterialsConclusionOutcome;
  label: string;
  badgeColor: string;
  defaultFollowUp: string;
}

const CONCLUSION_OPTIONS: ConclusionOption[] = [
  { id: "quote_shared", label: "Quote / Rates Shared", badgeColor: "bg-blue-500/10 text-blue-500 border-blue-500/20", defaultFollowUp: "Tomorrow 10:00 AM" },
  { id: "order_confirmed", label: "Supply Order Confirmed", badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", defaultFollowUp: "In 2 Days, 10:00 AM" },
  { id: "sample_sent", label: "Sample Dispatched", badgeColor: "bg-purple-500/10 text-purple-500 border-purple-500/20", defaultFollowUp: "In 3 Days, 11:00 AM" },
  { id: "khata_credit_discussed", label: "Credit/Khata Discussed", badgeColor: "bg-amber-500/10 text-amber-500 border-amber-500/20", defaultFollowUp: "Tomorrow 4:00 PM" },
  { id: "bargaining_rates", label: "Negotiating Price/MOQ", badgeColor: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20", defaultFollowUp: "Today 6:00 PM" },
  { id: "follow_up_needed", label: "Follow-up Required", badgeColor: "bg-orange-500/10 text-orange-500 border-orange-500/20", defaultFollowUp: "Tomorrow 10:00 AM" },
  { id: "rate_too_high", label: "Lost: Rate Too High", badgeColor: "bg-red-500/10 text-red-500 border-red-500/20", defaultFollowUp: "" },
  { id: "not_interested", label: "Not Interested", badgeColor: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20", defaultFollowUp: "" },
];

const QUICK_FOLLOWUPS = [
  { label: "Today 6 PM", value: "Today 6:00 PM" },
  { label: "Tomorrow 10 AM", value: "Tomorrow 10:00 AM" },
  { label: "In 2 Days", value: "In 2 Days, 10:00 AM" },
  { label: "Next Week", value: "Next Week, Monday 10:00 AM" },
];

export interface ConclusionNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetName: string;
  targetPhone?: string;
  leadId?: string;
  channel?: string;
  onSave?: (conclusion: {
    outcome: MaterialsConclusionOutcome;
    outcomeLabel: string;
    notes: string;
    nextFollowUp?: string;
    estimatedValue?: number;
  }) => Promise<void> | void;
}

export function ConclusionNoteModal({
  open,
  onOpenChange,
  targetName,
  targetPhone,
  leadId,
  channel = "Call / Meeting",
  onSave,
}: ConclusionNoteModalProps) {
  const { logActivity, leads } = useCRM();
  const [selectedOutcome, setSelectedOutcome] = React.useState<MaterialsConclusionOutcome>("quote_shared");
  const [notes, setNotes] = React.useState("");
  const [followUp, setFollowUp] = React.useState("Tomorrow 10:00 AM");
  const [useCustomFollowUp, setUseCustomFollowUp] = React.useState(false);
  const [customDateTime, setCustomDateTime] = React.useState("");
  const [estimatedValue, setEstimatedValue] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const matchedLead = leadId ? leads.find((l) => l.id === leadId) : undefined;

  const handleOutcomeChange = (opt: ConclusionOption) => {
    setSelectedOutcome(opt.id);
    if (opt.defaultFollowUp) {
      setFollowUp(opt.defaultFollowUp);
      setUseCustomFollowUp(false);
    } else {
      setFollowUp("");
    }
    setValidationError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim() || notes.trim().length < 5) {
      setValidationError("Mandatory: Please write a conclusion note (at least 5 characters).");
      toast.error("Conclusion note is mandatory after every conversation.");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedOpt = CONCLUSION_OPTIONS.find((o) => o.id === selectedOutcome);
      const nextFollowUpDate = useCustomFollowUp && customDateTime ? customDateTime : followUp || undefined;
      const numValue = estimatedValue ? parseFloat(estimatedValue) : undefined;

      if (onSave) {
        await onSave({
          outcome: selectedOutcome,
          outcomeLabel: selectedOpt?.label || selectedOutcome,
          notes: notes.trim(),
          nextFollowUp: nextFollowUpDate,
          estimatedValue: numValue,
        });
      } else if (matchedLead) {
        await logActivity({
          leadId: matchedLead.id,
          type: "note",
          outcome: selectedOutcome === "not_interested" || selectedOutcome === "rate_too_high"
            ? "not_interested"
            : selectedOutcome === "follow_up_needed"
            ? "call_back"
            : "interested",
          outcomeLabel: selectedOpt?.label || selectedOutcome,
          notes: `[Conclusion Note - ${channel}] ${notes.trim()}`,
          nextFollowUp: nextFollowUpDate,
        });
      }

      toast.success("Conclusion note & follow-up task recorded!");
      setNotes("");
      setEstimatedValue("");
      setValidationError(null);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save conclusion note");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-[540px] p-0 overflow-hidden"
    >
      <div className="bg-card text-card-foreground border-b border-border p-5">
        <div className="flex items-center justify-between pb-3 border-b border-border/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Mandatory Conclusion Note
              </span>
            </div>
            <h2 className="text-lg font-bold text-foreground mt-0.5">{targetName || "Contact"}</h2>
            {targetPhone && (
              <p className="text-xs text-muted-foreground font-mono">{targetPhone}</p>
            )}
          </div>
          <div className="text-right">
            <span className="text-xs bg-secondary px-2 py-1 rounded-md text-muted-foreground font-medium">
              Channel: {channel}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 pt-4">
          {/* Step 1: Structured Conclusion */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>1. What was the conversation conclusion? *</span>
              <span className="text-[10px] text-muted-foreground">Select one outcome</span>
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {CONCLUSION_OPTIONS.map((opt) => {
                const isSelected = selectedOutcome === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleOutcomeChange(opt)}
                    className={`p-2 rounded-lg border text-left text-[11px] font-semibold transition-all flex flex-col justify-between min-h-[52px] ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500"
                        : "border-border bg-secondary/30 text-foreground hover:bg-secondary/70"
                    }`}
                  >
                    <span className="leading-tight">{opt.label}</span>
                    {isSelected && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-1 self-end" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Mandatory Conclusion Notes with Dictation */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="conclusion-text" className="text-xs font-bold text-foreground">
                2. Key Discussion & Agreements *
              </Label>
              <VoiceNoteRecorder
                buttonLabel="Voice Dictate"
                onTranscribed={(transcript) => {
                  setNotes((prev) => (prev ? `${prev} ${transcript}` : transcript));
                  setValidationError(null);
                }}
              />
            </div>
            <textarea
              id="conclusion-text"
              rows={3}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                if (validationError && e.target.value.trim().length >= 5) {
                  setValidationError(null);
                }
              }}
              placeholder="e.g. Quoted ₹365/bag for UltraTech OPC 53 Grade. Needs 200 bags delivered to Sector 62 on Friday. Payment 50% advance."
              className="w-full text-xs bg-secondary/40 border border-border focus:border-emerald-500 focus:bg-background rounded-lg p-2.5 outline-none transition-colors resize-none placeholder:text-muted-foreground/60"
              autoFocus
            />
            {validationError && (
              <p className="text-[11px] text-destructive font-medium flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {validationError}
              </p>
            )}
          </div>

          {/* Step 3: Next Follow-up Schedule */}
          {selectedOutcome !== "not_interested" && selectedOutcome !== "rate_too_high" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-emerald-500" />
                3. Next Follow-up Task
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_FOLLOWUPS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      setFollowUp(preset.value);
                      setUseCustomFollowUp(false);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${
                      followUp === preset.value && !useCustomFollowUp
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-border bg-secondary/30 text-foreground hover:bg-secondary"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setUseCustomFollowUp(true)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${
                    useCustomFollowUp
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-border bg-secondary/30 text-foreground hover:bg-secondary"
                  }`}
                >
                  Custom Time
                </button>
              </div>
              {useCustomFollowUp && (
                <Input
                  type="datetime-local"
                  value={customDateTime}
                  onChange={(e) => setCustomDateTime(e.target.value)}
                  className="h-8 text-xs bg-secondary/30 focus:bg-card mt-1.5"
                />
              )}
            </div>
          )}

          {/* Optional Estimated Value */}
          <div className="flex items-center gap-2 bg-secondary/20 p-2.5 rounded-lg border border-border/70">
            <IndianRupee className="h-4 w-4 text-emerald-500 shrink-0" />
            <div className="flex-1">
              <Label htmlFor="estimated-deal-value" className="text-[11px] text-muted-foreground block">
                Estimated Order / Deal Value (Optional)
              </Label>
              <Input
                id="estimated-deal-value"
                type="number"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                placeholder="e.g. 75000"
                className="h-7 text-xs bg-transparent border-0 p-0 focus-visible:ring-0 placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-border flex items-center justify-between">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-xs text-muted-foreground hover:text-foreground font-medium px-2 py-1"
            >
              Cancel
            </button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 h-9 gap-1.5 shadow-sm"
            >
              {isSubmitting ? (
                "Saving Conclusion..."
              ) : (
                <>
                  <span>Save Conclusion & Schedule Task</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </ResponsiveModal>
  );
}
