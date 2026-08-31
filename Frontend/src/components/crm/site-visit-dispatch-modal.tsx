"use client";

import * as React from "react";
import {
  Compass,
  Key,
  ShieldCheck,
  QrCode,
  MapPin,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Copy,
  Phone,
  MessageSquare,
  Car,
  FileText,
  Share2,
} from "lucide-react";
import { useCRM } from "@/context/crm-context";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyINR, formatPhone } from "@/lib/utils";
import type { Lead, ProjectUnit, SiteVisitDispatch } from "@/types/crm";
import { toast } from "sonner";

interface SiteVisitDispatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  unit?: ProjectUnit | null;
}

export function SiteVisitDispatchModal({
  open,
  onOpenChange,
  lead,
  unit,
}: SiteVisitDispatchModalProps) {
  const { currentUser, leads, units, projects } = useCRM();

  const activeLead = lead || leads[0];
  const activeUnit = unit || units[0];
  const activeProject = projects.find((p) => p.id === activeUnit?.projectId) || projects[0];

  // Dispatch Operational State
  const [gatePin] = React.useState("842910");
  const [parkingBay, setParkingBay] = React.useState("Bay P2-14 (Visitor)");
  const [gateName, setGateName] = React.useState("Gate 2 — Golf Course Road Entrance");
  const [caretakerPhone, setCaretakerPhone] = React.useState("+91 98101 22345");

  // Checklist State
  const [buyerConfirmed, setBuyerConfirmed] = React.useState(true);
  const [ownerCleared, setOwnerCleared] = React.useState(true);
  const [keysVerified, setKeysVerified] = React.useState(true);
  const [costSheetPrinted, setCostSheetPrinted] = React.useState(false);

  // Post-visit debrief state
  const [debriefSentiment, setDebriefSentiment] = React.useState<string>("interested_needs_family");
  const [debriefNotes, setDebriefNotes] = React.useState<string>("");

  const handleCopyPass = () => {
    const text = `CallCRM Site Visit Gate Pass\nProject: ${activeProject?.name}\nUnit: ${activeUnit?.tower} • ${activeUnit?.unitNumber}\nGate: ${gateName}\nVisitor PIN: ${gatePin}\nParking: ${parkingBay}\nCaretaker Phone: ${caretakerPhone}`;
    navigator.clipboard.writeText(text);
    toast.success("Gate pass instructions copied to clipboard!");
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `*Site Visit Gate Clearance Pass*\n\nDear ${activeLead?.personName},\nHere are your access details for visiting *${activeProject?.name}*:\n\n📍 *Gate Entry:* ${gateName}\n🔑 *Visitor Access PIN:* ${gatePin}\n🚗 *Visitor Parking:* ${parkingBay}\n🏢 *Unit:* ${activeUnit?.tower} • ${activeUnit?.unitNumber}\n\nOur property specialist is ready at the lobby to receive you.`
    );
    const phone = (activeLead?.phone || "").replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-[680px] p-0 overflow-hidden bg-slate-950 border border-slate-800 text-slate-100"
    >
      {/* Header */}
      <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-950">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/10 font-mono text-[10px]">
              <ShieldCheck className="h-3 w-3 mr-1" />
              Operational Dispatch OS
            </Badge>
            <span className="text-xs text-slate-400 font-mono">30-Min Pre-Visit Intelligence</span>
          </div>

          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-mono">
            DISPATCH ACTIVE
          </Badge>
        </div>

        <div className="mt-2">
          <h2 className="text-lg font-black text-slate-100">
            {activeProject?.name} — {activeUnit?.tower} • {activeUnit?.unitNumber}
          </h2>
          <p className="text-xs text-slate-400">
            Client: <strong>{activeLead?.personName}</strong> ({formatPhone(activeLead?.phone || "")}) • Asking Price: <strong className="font-mono text-amber-300">{formatCurrencyINR(activeUnit?.askingPrice || activeUnit?.price || 0)}</strong>
          </p>
        </div>
      </div>

      <div className="p-5 max-h-[70vh] overflow-y-auto space-y-5">
        {/* Digital Gate Pass Card */}
        <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 uppercase tracking-wider">
              <QrCode className="h-4 w-4" />
              <span>Digital Visitor Gate Pass</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCopyPass}
                className="h-7 px-2 text-[10px] font-bold border-slate-700 bg-slate-900 text-slate-300 hover:text-white"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleShareWhatsApp}
                className="h-7 px-2 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1"
              >
                <MessageSquare className="h-3 w-3" />
                <span>Send to Client</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 font-mono block">Gate PIN Code</span>
              <span className="text-lg font-mono font-black text-emerald-400 tracking-wider">
                {gatePin}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 font-mono block">Designated Parking</span>
              <span className="text-xs font-bold text-slate-200 block truncate">
                {parkingBay}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 font-mono block">Caretaker / Guard</span>
              <span className="text-xs font-mono font-bold text-slate-200 block truncate">
                {caretakerPhone}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">{gateName}</span>
          </div>
        </div>

        {/* 5-Point Operational Pre-Visit Checklist */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Pre-Visit Verification Checklist
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <label className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/50 flex items-center gap-2.5 cursor-pointer hover:bg-slate-900">
              <input
                type="checkbox"
                checked={buyerConfirmed}
                onChange={(e) => setBuyerConfirmed(e.target.checked)}
                className="rounded border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span className={buyerConfirmed ? "text-slate-200 font-medium" : "text-slate-500"}>
                Buyer attendance re-confirmed (Call/WA)
              </span>
            </label>

            <label className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/50 flex items-center gap-2.5 cursor-pointer hover:bg-slate-900">
              <input
                type="checkbox"
                checked={ownerCleared}
                onChange={(e) => setOwnerCleared(e.target.checked)}
                className="rounded border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span className={ownerCleared ? "text-slate-200 font-medium" : "text-slate-500"}>
                Owner / RWA viewing notice cleared
              </span>
            </label>

            <label className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/50 flex items-center gap-2.5 cursor-pointer hover:bg-slate-900">
              <input
                type="checkbox"
                checked={keysVerified}
                onChange={(e) => setKeysVerified(e.target.checked)}
                className="rounded border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span className={keysVerified ? "text-slate-200 font-medium" : "text-slate-500"}>
                Physical keys verified with caretaker
              </span>
            </label>

            <label className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/50 flex items-center gap-2.5 cursor-pointer hover:bg-slate-900">
              <input
                type="checkbox"
                checked={costSheetPrinted}
                onChange={(e) => setCostSheetPrinted(e.target.checked)}
                className="rounded border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span className={costSheetPrinted ? "text-slate-200 font-medium" : "text-slate-500"}>
                Payment Plan / Cost Sheet ready
              </span>
            </label>
          </div>
        </div>

        {/* Post-Visit Debrief Form */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
            Post-Visit Debrief & Next Step
          </span>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400">Buyer Reaction Sentiment</label>
            <select
              value={debriefSentiment}
              onChange={(e) => setDebriefSentiment(e.target.value)}
              className="w-full h-8 px-2.5 text-xs bg-slate-950 border border-slate-700 rounded-md text-slate-200 focus:outline-none"
            >
              <option value="loved_it">🔥 Loved It — Ready to discuss price / token</option>
              <option value="interested_needs_family">👍 Interested — Needs decision from spouse / parents</option>
              <option value="hesitant_on_price">⚠️ Hesitant on price / floor rise</option>
              <option value="disliked_layout">❌ Disliked layout / facing</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400">Debrief Notes & Buyer Objections</label>
            <textarea
              rows={2}
              value={debriefNotes}
              onChange={(e) => setDebriefNotes(e.target.value)}
              placeholder="e.g. Liked 14th floor balcony view, wants to negotiate on car parking and club membership fees."
              className="w-full p-2.5 text-xs bg-slate-950 border border-slate-700 rounded-md text-slate-200 focus:outline-none"
            />
          </div>
        </div>

        {/* Action Controls */}
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
          <Button
            type="button"
            size="sm"
            onClick={() => {
              toast.success("Site visit debrief saved & lead activity updated!");
              onOpenChange(false);
            }}
            className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Confirm Debrief & Next Action</span>
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
