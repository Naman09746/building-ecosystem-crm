"use client";

import * as React from "react";
import {
  Footprints,
  Phone,
  User,
  Building,
  CheckCircle2,
  Clock,
  IndianRupee,
  Sparkles,
  AlertCircle,
  FileText,
  Send,
  Plus,
} from "lucide-react";
import { useCRM } from "@repo/core/context/crm-context";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { VoiceNoteRecorder } from "@/components/crm/voice-note-recorder";
import { toast } from "sonner";
import type {
  MaterialsFootfall,
  FootfallIntent,
  FootfallConclusion,
  FootfallVisitType,
} from "@repo/core/types/materials-extensions";

interface FootfallCaptureFormProps {
  onSaved?: (footfall: MaterialsFootfall) => void;
  defaultOutlet?: string;
}

const INTENT_OPTIONS: { id: FootfallIntent; label: string }[] = [
  { id: "price_check", label: "Price / Rate Check" },
  { id: "bulk_order", label: "Bulk Order Inq" },
  { id: "sample_request", label: "Sample Request" },
  { id: "credit_khata", label: "Khata / Credit" },
  { id: "general", label: "General Inq" },
  { id: "complaint", label: "Complaint / Return" },
];

const CONCLUSION_OPTIONS: { id: FootfallConclusion; label: string; color: string }[] = [
  { id: "quote_given", label: "Quote Given", color: "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { id: "order_placed", label: "Order Booked", color: "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { id: "needs_follow_up", label: "Needs Follow-up", color: "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { id: "payment_received", label: "Payment Received", color: "border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  { id: "browsing", label: "Just Browsing", color: "border-zinc-400 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400" },
  { id: "lost", label: "Lost / Rejected", color: "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400" },
];

const QUICK_FOLLOWUPS = [
  { label: "Today 6 PM", value: "Today 6:00 PM" },
  { label: "Tomorrow 10 AM", value: "Tomorrow 10:00 AM" },
  { label: "In 2 Days", value: "In 2 Days, 10:00 AM" },
];

export function FootfallCaptureForm({ onSaved, defaultOutlet = "Main Yard / Depot" }: FootfallCaptureFormProps) {
  const { leads, logActivity } = useCRM();

  const [outletName, setOutletName] = React.useState(defaultOutlet);
  const [personName, setPersonName] = React.useState("");
  const [personPhone, setPersonPhone] = React.useState("");
  const [visitType, setVisitType] = React.useState<FootfallVisitType>("walk_in");
  const [intent, setIntent] = React.useState<FootfallIntent>("price_check");
  const [conclusion, setConclusion] = React.useState<FootfallConclusion>("quote_given");
  const [conclusionNotes, setConclusionNotes] = React.useState("");
  const [estimatedValue, setEstimatedValue] = React.useState("");
  const [followUp, setFollowUp] = React.useState("Tomorrow 10:00 AM");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Phone quick auto-fill from existing leads/contacts
  const handlePhoneChange = (val: string) => {
    setPersonPhone(val);
    if (val.length >= 10) {
      const match = leads.find((l) => l.phone?.includes(val) || l.phone?.replace(/\D/g, "") === val.replace(/\D/g, ""));
      if (match && !personName) {
        setPersonName(match.personName);
        toast.info(`Recognized existing customer: ${match.personName}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim()) {
      setErrorMsg("Customer name is required.");
      return;
    }
    if (!conclusionNotes.trim() || conclusionNotes.trim().length < 5) {
      setErrorMsg("Mandatory: Please write a conclusion note for this walk-in.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const newRecord: MaterialsFootfall = {
        id: crypto.randomUUID(),
        orgId: "org-materials-default",
        outletName,
        personName: personName.trim(),
        personPhone: personPhone.trim() || undefined,
        visitType,
        intent,
        conclusion,
        conclusionNotes: conclusionNotes.trim(),
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
        followUpDate: conclusion !== "lost" && conclusion !== "browsing" ? followUp : undefined,
        visitedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      // Also log as CRM activity if matching lead exists or create lightweight record
      const matchedLead = leads.find((l) => l.phone && personPhone && l.phone.includes(personPhone));
      if (matchedLead) {
        await logActivity({
          leadId: matchedLead.id,
          type: "site_visit",
          outcome: conclusion === "lost" ? "not_interested" : conclusion === "needs_follow_up" ? "call_back" : "interested",
          outcomeLabel: `Walk-in: ${conclusion}`,
          notes: `[Outlet Walk-in: ${outletName}] ${conclusionNotes.trim()}`,
          nextFollowUp: followUp,
        });
      }

      toast.success(`Logged walk-in visitor: ${personName.trim()}`);
      if (onSaved) onSaved(newRecord);

      // Reset form
      setPersonName("");
      setPersonPhone("");
      setConclusionNotes("");
      setEstimatedValue("");
      setConclusion("quote_given");
      setIntent("price_check");
    } catch (err: any) {
      toast.error(err?.message || "Failed to log walk-in visitor");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card text-card-foreground rounded-xl border border-border p-4 sm:p-6 shadow-subtle">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <Footprints className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Rapid Walk-in Visitor Logger</h3>
            <p className="text-xs text-muted-foreground">Capture offline depot footfall with mandatory conclusion notes</p>
          </div>
        </div>
        <span className="text-xs bg-secondary px-2.5 py-1 rounded-full font-mono text-muted-foreground hidden sm:inline">
          {outletName}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 pt-4">
        {/* Row 1: Outlet & Visit Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-semibold text-foreground">Depot / Yard Location</Label>
            <Input
              value={outletName}
              onChange={(e) => setOutletName(e.target.value)}
              placeholder="e.g. Main Yard / Depot"
              className="h-9 text-xs bg-secondary/30 mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-foreground">Visit Channel</Label>
            <div className="grid grid-cols-3 gap-1 mt-1">
              {[
                { id: "walk_in" as FootfallVisitType, label: "Walk-in" },
                { id: "phone_inquiry" as FootfallVisitType, label: "Phone" },
                { id: "referral" as FootfallVisitType, label: "Referral" },
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVisitType(v.id)}
                  className={`h-9 rounded-md text-xs font-semibold border transition-all ${
                    visitType === v.id
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-border bg-secondary/30 text-foreground hover:bg-secondary"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Customer Phone & Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-emerald-500" />
              Customer Mobile No. (Auto-detects known contractors)
            </Label>
            <Input
              type="tel"
              value={personPhone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="e.g. 9876543210"
              className="h-9 text-xs font-mono bg-secondary/30 mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-emerald-500" />
              Customer / Contractor Name *
            </Label>
            <Input
              value={personName}
              onChange={(e) => {
                setPersonName(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="e.g. Ramesh Sharma (Sharma Builders)"
              className="h-9 text-xs bg-secondary/30 mt-1"
              required
            />
          </div>
        </div>

        {/* Row 3: Intent */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Visitor Purpose / Intent</Label>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5">
            {INTENT_OPTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setIntent(item.id)}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border text-center transition-all ${
                  intent === item.id
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold"
                    : "border-border bg-secondary/20 text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 4: Conclusion (Mandatory) */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Interaction Conclusion *
            </span>
            <span className="text-[10px] text-muted-foreground">Select outcome</span>
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {CONCLUSION_OPTIONS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setConclusion(c.id)}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all flex items-center justify-between ${
                  conclusion === c.id
                    ? `${c.color} ring-1 ring-emerald-500/50`
                    : "border-border bg-secondary/20 text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <span>{c.label}</span>
                {conclusion === c.id && <CheckCircle2 className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        </div>

        {/* Row 5: Mandatory Conclusion Notes with Voice Dictation */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="footfall-notes" className="text-xs font-semibold text-foreground">
              Conclusion Summary & Discussion Notes *
            </Label>
            <VoiceNoteRecorder
              buttonLabel="Voice Dictate"
              onTranscribed={(transcript) => {
                setConclusionNotes((prev) => (prev ? `${prev} ${transcript}` : transcript));
                if (errorMsg) setErrorMsg(null);
              }}
            />
          </div>
          <textarea
            id="footfall-notes"
            rows={2}
            value={conclusionNotes}
            onChange={(e) => {
              setConclusionNotes(e.target.value);
              if (errorMsg && e.target.value.trim().length >= 5) setErrorMsg(null);
            }}
            placeholder="e.g. Inquired about UltraTech Cement 500 bags for G+2 bungalow in Sector 48. Offered ₹370/bag. Needs sample on Thursday."
            className="w-full text-xs bg-secondary/30 border border-border focus:border-emerald-500 focus:bg-background rounded-lg p-2.5 outline-none transition-colors resize-none placeholder:text-muted-foreground/60"
            required
          />
        </div>

        {/* Row 6: Follow-up & Deal Value */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {conclusion !== "lost" && conclusion !== "browsing" && (
            <div>
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-emerald-500" />
                Auto-Schedule Follow-up
              </Label>
              <div className="flex gap-1.5 mt-1">
                {QUICK_FOLLOWUPS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFollowUp(f.value)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${
                      followUp === f.value
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-border bg-secondary/30 text-foreground hover:bg-secondary"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <IndianRupee className="h-3.5 w-3.5 text-emerald-500" />
              Estimated Order Value (Optional)
            </Label>
            <Input
              type="number"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              placeholder="e.g. 185000"
              className="h-9 text-xs bg-secondary/30 mt-1 font-mono"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="text-xs text-destructive flex items-center gap-1.5 font-medium bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        <div className="pt-2 flex items-center justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-10 px-6 gap-2 shadow-sm"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Save Walk-in & Log Conclusion</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
