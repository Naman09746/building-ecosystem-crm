"use client";

import * as React from "react";
import {
  Gavel,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Plus,
  CheckCircle2,
  Lock,
  Clock,
  IndianRupee,
  FileCheck,
  Building2,
  User,
  ArrowRight,
} from "lucide-react";
import { useCRM } from "@/context/crm-context";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyINR, formatPhone } from "@/lib/utils";
import type { Lead, ProjectUnit, NegotiationRound } from "@/types/crm";
import { VoiceNoteRecorder } from "@/components/crm/voice-note-recorder";
import { toast } from "sonner";
import { isManagerRole } from "@/lib/rbac";

interface NegotiationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  unit?: ProjectUnit | null;
}

export function NegotiationModal({
  open,
  onOpenChange,
  lead,
  unit,
}: NegotiationModalProps) {
  const { currentUser, leads, units } = useCRM();

  const activeLead = lead || leads[0];
  const activeUnit = unit || units[0];

  const isManager = isManagerRole(currentUser.role);

  // Mock negotiation history for immediate responsive demonstration
  const [bids, setBids] = React.useState<NegotiationRound[]>([
    {
      id: "bid-1",
      orgId: "demo-org",
      dealId: "deal-1",
      unitId: activeUnit?.id || "unit-1",
      leadId: activeLead?.id || "lead-1",
      roundNumber: 1,
      bidderType: "buyer_offer",
      offeredPrice: (activeUnit?.askingPrice || activeUnit?.price || 150000000) * 0.92,
      priceDeltaFromAsk: -(activeUnit?.askingPrice || activeUnit?.price || 150000000) * 0.08,
      proposedPaymentPlan: "clp",
      tokenAmountProposed: 2500000,
      tokenChequeAvailable: true,
      closingTimelineDays: 45,
      specialConditions: ["Includes 2 covered parking slots", "Semi-furnished handover"],
      roundStatus: "countered",
      recordedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: "bid-2",
      orgId: "demo-org",
      dealId: "deal-1",
      unitId: activeUnit?.id || "unit-1",
      leadId: activeLead?.id || "lead-1",
      roundNumber: 2,
      bidderType: "seller_counter",
      offeredPrice: (activeUnit?.askingPrice || activeUnit?.price || 150000000) * 0.97,
      priceDeltaFromAsk: -(activeUnit?.askingPrice || activeUnit?.price || 150000000) * 0.03,
      proposedPaymentPlan: "clp",
      tokenAmountProposed: 5000000,
      tokenChequeAvailable: false,
      closingTimelineDays: 30,
      specialConditions: ["Seller keeps modular kitchen appliances", "Stamp duty by buyer"],
      roundStatus: "pending_review",
      recordedAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ]);

  // Form State for new bid
  const [bidderType, setBidderType] = React.useState<"buyer_offer" | "seller_counter">("buyer_offer");
  const [newOfferPrice, setNewOfferPrice] = React.useState<string>("");
  const [tokenAmount, setTokenAmount] = React.useState<string>("2500000");
  const [tokenAvailable, setTokenAvailable] = React.useState<boolean>(true);
  const [paymentPlan, setPaymentPlan] = React.useState<"clp" | "down_payment" | "subvention">("clp");
  const [closingDays, setClosingDays] = React.useState<string>("45");
  const [conditionsText, setConditionsText] = React.useState<string>("");
  const [negotiationVoiceNotes, setNegotiationVoiceNotes] = React.useState<string[]>([]);

  const askPrice = activeUnit?.askingPrice || activeUnit?.price || 150000000;
  // Confidential seller floor (e.g. 94% of ask) - protected for managers
  const sellerFloorPrice = Math.round(askPrice * 0.94);

  const latestBid = bids[bids.length - 1];
  const priceGap = latestBid ? Math.abs(latestBid.offeredPrice - askPrice) : 0;

  const handleRecordBid = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(newOfferPrice);
    if (!price || isNaN(price)) {
      toast.error("Please enter a valid offer price");
      return;
    }

    const newBid: NegotiationRound = {
      id: `bid-${Date.now()}`,
      orgId: currentUser.orgId,
      dealId: "deal-1",
      unitId: activeUnit?.id || "unit-1",
      leadId: activeLead?.id || "lead-1",
      roundNumber: bids.length + 1,
      bidderType,
      offeredPrice: price,
      priceDeltaFromAsk: price - askPrice,
      proposedPaymentPlan: paymentPlan,
      tokenAmountProposed: parseFloat(tokenAmount) || undefined,
      tokenChequeAvailable: tokenAvailable,
      closingTimelineDays: parseInt(closingDays) || 45,
      specialConditions: conditionsText ? conditionsText.split(",").map((s) => s.trim()) : [],
      roundStatus: "pending_review",
      recordedAt: new Date().toISOString(),
    };

    setBids((prev) => [...prev, newBid]);
    setNewOfferPrice("");
    setConditionsText("");
    toast.success(`Round ${newBid.roundNumber} recorded successfully!`);
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-[720px] p-0 overflow-hidden bg-slate-950 border border-slate-800 text-slate-100"
    >
      {/* Header */}
      <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/80 to-slate-950">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10 font-mono text-[10px]">
              <Gavel className="h-3 w-3 mr-1" />
              Chronological Bidding Ledger
            </Badge>
            <span className="text-xs text-slate-400 font-mono">Deal Room</span>
          </div>

          {/* SENSITIVE SELLER PRICE FLOOR (Masked for Junior Reps) */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            {isManager ? (
              <div className="px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Seller Floor: <strong>{formatCurrencyINR(sellerFloorPrice)}</strong></span>
              </div>
            ) : (
              <div className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-500 flex items-center gap-1" title="Confidential to Management">
                <Lock className="h-3.5 w-3.5 text-slate-600" />
                <span>Seller Floor: Protected</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-black text-slate-100">
              {activeUnit?.tower} • {activeUnit?.unitNumber} — Negotiation Ledger
            </h2>
            <p className="text-xs text-slate-400">
              Buyer: <strong>{activeLead?.personName}</strong> • Original Ask: <strong className="font-mono text-amber-300">{formatCurrencyINR(askPrice)}</strong>
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Current Bid Gap</span>
            <span className="font-mono font-bold text-sm text-rose-400">
              -{formatCurrencyINR(priceGap)}
            </span>
          </div>
        </div>
      </div>

      <div className="p-5 max-h-[70vh] overflow-y-auto space-y-5">
        {/* Chronological Bid History Rounds */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Bidding Timeline ({bids.length} Rounds)</span>
            <span className="text-[10px] font-mono text-slate-500">Audited & Timestamped</span>
          </div>

          <div className="space-y-2">
            {bids.map((bid) => {
              const isBuyer = bid.bidderType === "buyer_offer";
              return (
                <div
                  key={bid.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isBuyer
                      ? "bg-blue-950/20 border-blue-500/30"
                      : "bg-amber-950/20 border-amber-500/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`text-[10px] font-mono font-bold ${
                          isBuyer
                            ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                            : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        }`}
                      >
                        Round {bid.roundNumber} • {isBuyer ? "Buyer Offer" : "Seller Counter"}
                      </Badge>
                      <span className="text-xs font-mono font-bold text-slate-100">
                        {formatCurrencyINR(bid.offeredPrice)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      <span
                        className={
                          (bid.priceDeltaFromAsk || 0) < 0
                            ? "text-rose-400"
                            : "text-emerald-400"
                        }
                      >
                        {formatCurrencyINR(bid.priceDeltaFromAsk || 0)} from Ask
                      </span>
                      <span className="text-slate-500">• {new Date(bid.recordedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                    </div>
                  </div>

                  {/* Conditions & Inclusions */}
                  <div className="mt-2 text-xs text-slate-300 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                      Payment Plan: {bid.proposedPaymentPlan.toUpperCase()}
                    </span>
                    {bid.tokenAmountProposed && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-mono">
                        Token: {formatCurrencyINR(bid.tokenAmountProposed)} {bid.tokenChequeAvailable && "(Cheque Ready)"}
                      </span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                      Closing: {bid.closingTimelineDays} Days
                    </span>
                  </div>

                  {bid.specialConditions && bid.specialConditions.length > 0 && (
                    <div className="mt-1.5 text-[11px] text-slate-400 italic">
                      Conditions: {bid.specialConditions.join(" • ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Record New Bid Form */}
        <form onSubmit={handleRecordBid} className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-amber-400" />
              Record Counter-Offer or Buyer Bid
            </span>

            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setBidderType("buyer_offer")}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                  bidderType === "buyer_offer"
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Buyer Offer
              </button>
              <button
                type="button"
                onClick={() => setBidderType("seller_counter")}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                  bidderType === "seller_counter"
                    ? "bg-amber-600 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Seller Counter
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Offered Price (₹ INR)</Label>
              <Input
                type="number"
                value={newOfferPrice}
                onChange={(e) => setNewOfferPrice(e.target.value)}
                placeholder="e.g. 145000000"
                className="h-8 text-xs bg-slate-950 border-slate-700 font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Token Amount (₹)</Label>
              <Input
                type="number"
                value={tokenAmount}
                onChange={(e) => setTokenAmount(e.target.value)}
                placeholder="e.g. 2500000"
                className="h-8 text-xs bg-slate-950 border-slate-700 font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Payment Scheme</Label>
              <select
                value={paymentPlan}
                onChange={(e) => setPaymentPlan(e.target.value as any)}
                className="w-full h-8 px-2.5 text-xs bg-slate-950 border border-slate-700 rounded-md text-slate-200 focus:outline-none"
              >
                <option value="clp">Construction Linked (CLP)</option>
                <option value="down_payment">Down Payment Plan</option>
                <option value="subvention">10:90 Subvention</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-300">Special Terms & Inclusions (Comma-separated)</Label>
              <VoiceNoteRecorder
                buttonLabel="Dictate"
                onTranscribed={(text) => {
                  setConditionsText((prev) => (prev ? `${prev} ${text}` : text));
                }}
              />
            </div>
            <Input
              value={conditionsText}
              onChange={(e) => setConditionsText(e.target.value)}
              placeholder="e.g. All ACs included, 2 covered car parks, registry within 45 days"
              className="h-8 text-xs bg-slate-950 border-slate-700"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs border-slate-700 bg-slate-900 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-8 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Log Bid Round {bids.length + 1}</span>
            </Button>
          </div>
        </form>
      </div>
    </ResponsiveModal>
  );
}
