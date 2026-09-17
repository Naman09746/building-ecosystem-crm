"use client";

import * as React from "react";
import {
  MessageSquare,
  Send,
  Sparkles,
  Building2,
  Calendar,
  CreditCard,
  Flame,
  CheckCircle2,
  Copy,
  ExternalLink,
} from "lucide-react";
import { useCRM } from "@repo/core/context/crm-context";
import { Lead } from "@repo/core/types/crm";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { formatCurrencyINR } from "@repo/core/lib/utils";
import { toast } from "sonner";

interface WhatsAppActionModalProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WhatsAppActionModal({
  lead,
  open,
  onOpenChange,
}: WhatsAppActionModalProps) {
  const { logActivity, currentUser } = useCRM();

  const [selectedTemplate, setSelectedTemplate] = React.useState<
    "brochure" | "site_visit" | "cost_sheet" | "reactivation"
  >("brochure");
  const [customMessage, setCustomMessage] = React.useState("");

  // Re-compute default template text when lead or template changes
  React.useEffect(() => {
    if (!lead) return;

    const repName = currentUser?.name || lead.salespersonName || "Relationship Manager";
    const cleanPhone = lead.phone.replace(/\D/g, "");

    let text = "";
    if (selectedTemplate === "brochure") {
      text = `Namaste ${lead.personName},\n\nThis is ${repName} from Apex Realty. Following up on your interest in *${lead.projectName}* (${lead.regionName}).\n\nI have attached the master digital brochure, unit layouts (${lead.configurationPreference || "3/4 BHK Luxury"}), and pricing structure (${formatCurrencyINR(lead.budget)}).\n\nWould you like me to reserve a priority slot for an exclusive site walkthrough this weekend?\n\nWarm regards,\n${repName}\nApex Realty Advisors`;
    } else if (selectedTemplate === "site_visit") {
      text = `Dear ${lead.personName},\n\nLooking forward to hosting you for the private site walkthrough at *${lead.projectName}*.\n\n📍 *Location*: ${lead.projectName} Experience Centre, ${lead.regionName}\n🗓 *Scheduled Time*: This Saturday / Sunday, 11:30 AM\n👔 *Host*: ${repName} (${currentUser?.phone || "+91 98101 23456"})\n\nValet parking is reserved for your vehicle. Please let me know if you need assistance with directions.\n\nRegards,\n${repName}`;
    } else if (selectedTemplate === "cost_sheet") {
      text = `Namaste ${lead.personName},\n\nAs discussed, here is the tentative payment milestone & cost sheet breakdown for *${lead.projectName}*:\n\n• Unit Type: ${lead.configurationPreference || "Luxury Residence"}\n• Indicative Value: ${formatCurrencyINR(lead.budget)}\n• Booking Token: 10%\n• Payment Plan: 20:80 / Construction Linked\n\nShall we schedule a brief 10-minute call today to review the bank subvention and floor-rise incentives?\n\nBest regards,\n${repName}`;
    } else if (selectedTemplate === "reactivation") {
      text = `Hello ${lead.personName},\n\nTrust you are doing well! We have just received an exclusive allocation of high-floor inventory at *${lead.projectName}* with premium park and skyline views that matches your exact requirement.\n\nGiven the strong demand and limited units, I wanted to share this VIP priority window with you before open release.\n\nCould we connect today for 5 minutes?\n\nWarm regards,\n${repName}`;
    }

    setCustomMessage(text);
  }, [lead, selectedTemplate, currentUser]);

  if (!lead) return null;

  const handleSendWhatsApp = async () => {
    const cleanPhone = lead.phone.replace(/\D/g, "");
    const waUrl = `https://wa.me/${cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`}?text=${encodeURIComponent(customMessage)}`;

    // Open WhatsApp
    window.open(waUrl, "_blank", "noopener,noreferrer");

    // Automatically log WhatsApp Activity in timeline
    await logActivity({
      leadId: lead.id,
      type: "whatsapp",
      outcomeLabel: `WhatsApp: ${selectedTemplate.toUpperCase().replace("_", " ")}`,
      notes: customMessage.slice(0, 180) + (customMessage.length > 180 ? "..." : ""),
      nextFollowUp: selectedTemplate === "site_visit" ? "Saturday, 11:30 AM" : "Tomorrow, 3:00 PM",
    });

    onOpenChange(false);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(customMessage);
    toast.success("Message copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[92vh] overflow-y-auto p-6 space-y-4 rounded-2xl border border-border shadow-modal">
        <DialogHeader className="pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  WhatsApp Sales Assistant
                  <span className="text-xs font-normal text-muted-foreground font-mono">
                    ({lead.personName})
                  </span>
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground">
                  High-converting luxury templates with 1-click dispatch & activity logging
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Template Selector Pills */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Select Sales Touchpoint Template
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "brochure", label: "Brochure & Specs", icon: Building2 },
              { id: "site_visit", label: "Site Visit Invite", icon: Calendar },
              { id: "cost_sheet", label: "Cost & Payment", icon: CreditCard },
              { id: "reactivation", label: "VIP Reactivation", icon: Flame },
            ].map((tmpl) => {
              const Icon = tmpl.icon;
              const isSelected = selectedTemplate === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setSelectedTemplate(tmpl.id as any)}
                  className={`p-2 rounded-xl border text-left transition-all text-xs flex flex-col gap-1 ${
                    isSelected
                      ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold shadow-xs"
                      : "bg-card border-border hover:bg-secondary text-foreground"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isSelected ? "text-emerald-600" : "text-muted-foreground"}`} />
                  <span className="text-[11px] leading-tight">{tmpl.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive WhatsApp Chat Bubble Preview */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              WhatsApp Message Preview (Editable)
            </label>
            <button
              type="button"
              onClick={handleCopyText}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium"
            >
              <Copy className="h-3 w-3" />
              Copy
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#e5ddd5] dark:bg-[#111b21] border border-border/80 relative">
            <div className="max-w-[90%] ml-auto bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-2xl rounded-tr-xs p-3 shadow-xs text-xs space-y-2 font-sans leading-relaxed">
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={9}
                className="w-full bg-transparent border-0 resize-none focus:outline-none text-xs text-inherit placeholder:text-muted-foreground font-sans leading-relaxed"
              />
              <div className="text-[10px] text-right opacity-60 font-mono flex items-center justify-end gap-1">
                <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                <span>✓✓</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-border flex items-center justify-between gap-3">
          <span className="text-[11px] text-muted-foreground">
            Target: <strong>{lead.phone}</strong>
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSendWhatsApp}
              className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
            >
              <Send className="h-3.5 w-3.5" />
              Send on WhatsApp & Log
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
