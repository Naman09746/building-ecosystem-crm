"use client";

import * as React from "react";
import {
  CheckCircle2,
  Phone,
  MessageSquare,
  Building2,
  Clock,
  Sparkles,
  Users,
  FileText,
  Timer,
} from "lucide-react";
import { useCRM } from "@repo/core/context/crm-context";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { ResponsiveModal } from "@repo/ui/components/responsive-modal";
import { VoiceNoteRecorder } from "@/components/crm/voice-note-recorder";
import { ActivityType } from "@repo/core/types/crm";
import { formatCurrencyINR, formatPhone } from "@repo/core/lib/utils";

interface QuickActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLeadId?: string;
}

export type StructuredOutcome =
  | "Connected"
  | "No Answer"
  | "Interested"
  | "Negotiating"
  | "Site Visit Booked"
  | "Call Back"
  | "Wrong Number"
  | "Not Interested";

const FOLLOW_UP_PRESETS: { label: string; value: string }[] = [
  { label: "Today 6 PM", value: "Today 6:00 PM" },
  { label: "Tomorrow 10 AM", value: "Tomorrow 10:00 AM" },
  { label: "In 3 Days", value: "In 3 Days, 10:00 AM" },
  { label: "Next Week", value: "Next Week, Monday 10:00 AM" },
];

function getTodayTime(hour: number, minute: number = 0): string {
  const now = new Date();
  now.setHours(hour, minute, 0, 0);
  return now.toISOString();
}

function getNextWeekMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = (7 - day + 1) % 7 || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(10, 0, 0, 0);
  return monday.toISOString();
}

export function QuickActivityModal({
  open,
  onOpenChange,
  defaultLeadId,
}: QuickActivityModalProps) {
  const { leads, logActivity } = useCRM();
  const [selectedLeadId, setSelectedLeadId] = React.useState<string>(defaultLeadId || "");
  const [activityType, setActivityType] = React.useState<ActivityType>("call");
  const [outcome, setOutcome] = React.useState<StructuredOutcome>("Connected");
  const [notes, setNotes] = React.useState("");
  const [followUpPreset, setFollowUpPreset] = React.useState<string>("Tomorrow 10:00 AM");
  const [customDateTime, setCustomDateTime] = React.useState<string>("");
  const [useCustom, setUseCustom] = React.useState(false);
  const [callDurationSeconds, setCallDurationSeconds] = React.useState(0);
  const [callTimerStarted, setCallTimerStarted] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (defaultLeadId) {
      setSelectedLeadId(defaultLeadId);
    } else if (leads.length > 0 && !selectedLeadId) {
      setSelectedLeadId(leads[0].id);
    }
  }, [defaultLeadId, leads, selectedLeadId]);

  React.useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (callTimerStarted && activityType === "call") {
      timer = setInterval(() => {
        setCallDurationSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callTimerStarted, activityType]);

  React.useEffect(() => {
    if (!callTimerStarted && activityType !== "call") {
      setCallDurationSeconds(0);
      setCallTimerStarted(false);
    }
  }, [activityType, callTimerStarted]);

  const activeLead = leads.find((l) => l.id === selectedLeadId) || leads[0];

  const structuredOutcomes: { id: StructuredOutcome; label: string }[] = [
    { id: "Connected", label: "Connected" },
    { id: "No Answer", label: "No Answer" },
    { id: "Interested", label: "Interested" },
    { id: "Negotiating", label: "Negotiating" },
    { id: "Site Visit Booked", label: "Site Visit" },
    { id: "Call Back", label: "Call Back" },
    { id: "Wrong Number", label: "Wrong Number" },
    { id: "Not Interested", label: "Not Interested" },
  ];

  const formatDuration = (totalSeconds: number): string => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getFollowUpValue = (): string | undefined => {
    if (outcome === "Not Interested" || outcome === "Wrong Number") return undefined;
    if (useCustom && customDateTime) return customDateTime;
    return followUpPreset;
  };

  const [validationError, setValidationError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLead) return;

    if (!notes.trim() || notes.trim().length < 3) {
      setValidationError("Mandatory: Please enter a conclusion note describing the outcome.");
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    await logActivity({
      leadId: activeLead.id,
      type: activityType,
      outcome: outcome === "Site Visit Booked"
        ? "site_visit_booked"
        : outcome === "Not Interested"
        ? "not_interested"
        : outcome === "Wrong Number"
        ? "wrong_number"
        : outcome === "No Answer"
        ? "ringing_no_response"
        : outcome === "Connected" || outcome === "Call Back" || outcome === "Negotiating"
        ? "call_back"
        : "interested",
      outcomeLabel: outcome,
      notes: notes.trim(),
      nextFollowUp: getFollowUpValue(),
      durationSeconds: activityType === "call" ? callDurationSeconds : undefined,
    });

    setIsSubmitting(false);
    onOpenChange(false);
    setNotes("");
    setCallDurationSeconds(0);
    setCallTimerStarted(false);
    setUseCustom(false);
    setCustomDateTime("");
  };

  React.useEffect(() => {
    if (outcome === "Site Visit Booked") {
      setFollowUpPreset("Site Visit · Tomorrow 11:00 AM");
    } else if (outcome === "Not Interested" || outcome === "Wrong Number") {
      // No follow-up needed
    } else if (!useCustom) {
      setFollowUpPreset("Tomorrow 10:00 AM");
    }
  }, [outcome, useCustom]);

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-[520px] p-5"
    >
      <div className="space-y-4">
        {/* Header with Buyer & Deal Info */}
        <div className="pb-3 border-b border-border flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-foreground">{activeLead?.personName}</h2>
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 flex-wrap">
              <span>{activeLead?.projectName}</span>
              <span>•</span>
              <span className="font-mono font-bold text-foreground">{formatCurrencyINR(activeLead?.budget || 0)}</span>
              {activeLead?.assignedUnitNumber && (
                <>
                  <span>•</span>
                  <span className="bg-secondary px-1.5 py-0.2 rounded font-mono text-[10px] text-foreground font-bold">
                    Unit {activeLead.assignedUnitNumber}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Quick Channel Pill */}
          <div className="flex items-center gap-1 bg-secondary/80 p-0.5 rounded-lg border border-border shrink-0">
            {[
              { type: "call" as ActivityType, icon: Phone, title: "Call" },
              { type: "whatsapp" as ActivityType, icon: MessageSquare, title: "WhatsApp" },
              { type: "site_visit" as ActivityType, icon: Building2, title: "Visit" },
              { type: "meeting" as ActivityType, icon: Users, title: "Meeting" },
              { type: "note" as ActivityType, icon: FileText, title: "Note" },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = activityType === item.type;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => {
                    setActivityType(item.type);
                    setCallTimerStarted(false);
                    setCallDurationSeconds(0);
                  }}
                  title={item.title}
                  className={`p-2 sm:p-1.5 rounded-md transition-all min-h-[36px] min-w-[36px] flex items-center justify-center ${
                    isSelected ? "bg-card text-foreground shadow-subtle" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Call Duration Timer */}
        {activityType === "call" && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Timer className="h-4 w-4 text-amber-400" />
            <span className={`font-mono text-xs font-bold ${callTimerStarted ? "text-amber-400" : "text-amber-300/70"}`}>
              {formatDuration(callDurationSeconds)}
            </span>
            {!callTimerStarted && (
              <button
                type="button"
                onClick={() => {
                  setCallTimerStarted(true);
                  setCallDurationSeconds(0);
                }}
                className="text-[10px] text-amber-400 underline ml-auto"
              >
                Start timer
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* What happened? 8-Pill Outcome Grid — 4 columns mobile */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">What happened?</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-1.5">
              {structuredOutcomes.map((item) => {
                const isSelected = outcome === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setOutcome(item.id);
                      if (item.id === "Site Visit Booked") {
                        setFollowUpPreset("Site Visit · Tomorrow 11:00 AM");
                        setUseCustom(false);
                      } else if (item.id === "Not Interested" || item.id === "Wrong Number") {
                        setUseCustom(false);
                      } else if (!useCustom) {
                        setFollowUpPreset("Tomorrow 10:00 AM");
                      }
                    }}
                    className={`h-9 sm:h-8 px-2 rounded-lg text-[10px] sm:text-xs font-semibold border transition-all text-center flex items-center justify-center min-h-[36px] ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-subtle font-bold"
                        : "border-border bg-card text-foreground hover:bg-secondary hover:border-border/80"
                    }`}
                  >
                    <span className="leading-tight">{item.label}</span>
                    {isSelected && <CheckCircle2 className="h-3 w-3 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes Input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="quick-notes" className="text-xs font-bold text-foreground">Notes</Label>
              <VoiceNoteRecorder
                buttonLabel="Dictate"
                onTranscribed={(transcriptText) => {
                  setNotes((prev) => (prev ? `${prev} ${transcriptText}` : transcriptText));
                }}
              />
            </div>
            <Input
              id="quick-notes"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                if (validationError && e.target.value.trim().length >= 3) {
                  setValidationError(null);
                }
              }}
              placeholder="e.g. Discussed cement/steel rates, confirmed 100 bags delivery for tomorrow"
              className={`h-10 sm:h-8 text-xs bg-secondary/30 focus:bg-card rounded-lg ${
                validationError ? "border-destructive ring-1 ring-destructive" : ""
              }`}
              autoFocus
            />
            {validationError && (
              <p className="text-[11px] text-destructive font-medium mt-1">{validationError}</p>
            )}
          </div>

          {/* Next Action Selector — Presets + Custom */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              Next follow-up action
            </Label>
            {(outcome !== "Not Interested" && outcome !== "Wrong Number") && (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {FOLLOW_UP_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => {
                        setFollowUpPreset(preset.value);
                        setUseCustom(false);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-semibold border transition-all ${
                        followUpPreset === preset.value && !useCustom
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:bg-secondary hover:border-border/80"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setUseCustom(true)}
                    className={`px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-semibold border transition-all ${
                      useCustom
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:bg-secondary hover:border-border/80"
                    }`}
                  >
                    Custom
                  </button>
                </div>
                {useCustom && (
                  <Input
                    type="datetime-local"
                    value={customDateTime}
                    onChange={(e) => setCustomDateTime(e.target.value)}
                    className="h-10 sm:h-8 text-xs bg-secondary/30 focus:bg-card rounded-lg"
                  />
                )}
              </>
            )}
            {outcome === "Not Interested" && (
              <span className="text-xs text-muted-foreground">No follow-up scheduled</span>
            )}
            {outcome === "Wrong Number" && (
              <span className="text-xs text-muted-foreground">No follow-up — invalid number</span>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                setCallDurationSeconds(0);
                setCallTimerStarted(false);
                setUseCustom(false);
                setCustomDateTime("");
              }}
              className="h-10 sm:h-8 text-xs font-semibold flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isSubmitting}
              className="h-10 sm:h-8 px-4 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary-hover shadow-subtle flex-1 sm:flex-none"
            >
              Save &amp; Schedule
            </Button>
          </div>
        </form>
      </div>
    </ResponsiveModal>
  );
}