"use client";

import * as React from "react";
import {
  TrendingUp,
  Clock,
  User,
  Phone,
  MessageSquare,
  Sparkles,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Send,
} from "lucide-react";
import { useCRM } from "@repo/core/context/crm-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@repo/ui/components/dialog";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { formatCurrencyINR, formatPhone } from "@repo/core/lib/utils";
import type { SellerOpportunity, SellerOpportunityStatus } from "@repo/core/types/crm";
import { toast } from "sonner";

interface SellerOpportunitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUnit?: (unitId: string) => void;
}

export function SellerOpportunitiesModal({
  isOpen,
  onClose,
  onSelectUnit,
}: SellerOpportunitiesModalProps) {
  const {
    sellerOpportunities,
    updateSellerOpportunityStatus,
    convertOpportunityToResaleListing,
    users,
  } = useCRM();

  const [selectedOpp, setSelectedOpp] = React.useState<SellerOpportunity | null>(null);
  const [filterSignal, setFilterSignal] = React.useState<string>("all");
  const [customAskingPrice, setCustomAskingPrice] = React.useState<string>("");

  const filteredOpps = React.useMemo(() => {
    return sellerOpportunities.filter((opp) => {
      if (filterSignal !== "all" && opp.signalType !== filterSignal) return false;
      return true;
    });
  }, [sellerOpportunities, filterSignal]);

  const handleConvertToListing = async (opp: SellerOpportunity) => {
    const price = customAskingPrice ? Number(customAskingPrice) : opp.estimatedValuation;
    const success = await convertOpportunityToResaleListing(opp.id, price);
    if (success) {
      if (onSelectUnit) {
        onSelectUnit(opp.unitId);
      }
      onClose();
    }
  };

  const handleWhatsAppPitch = (opp: SellerOpportunity) => {
    const text = `*Private Real Estate Advisory — ${opp.projectName || "Luxury Society"}*\n\n` +
      `Hello ${opp.ownerName || "Sir/Madam"},\n\n` +
      `${opp.suggestedPitch || "We have verified prospective buyers seeking ready units in your tower."}\n\n` +
      `Estimated Market Valuation: ${formatCurrencyINR(opp.estimatedValuation || 0)}\n\n` +
      `Would you like to review our recent transaction comp report?`;

    const phone = opp.ownerPhone ? opp.ownerPhone.replace(/[^0-9]/g, "") : "";
    const url = phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-y-auto p-0 border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-border bg-gradient-to-r from-amber-500/10 via-card to-background">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-500/10 text-xs font-mono">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Seller Intelligence Engine
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Proactive secondary resale signals
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                <span>Seller Opportunities & Resale Signals</span>
                <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                  {sellerOpportunities.length} Active
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground">
                Detects expiring tenancies, long-term investor holding thresholds, vacant flats, and owner valuation inquiries before competitors.
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1">
            {[
              { id: "all", label: "All Signals" },
              { id: "tenancy_expiring", label: "Tenancy Expiring (<60d)" },
              { id: "vacant_unit", label: "Vacant Units" },
              { id: "valuation_request", label: "Valuation Inquiries" },
              { id: "investor_exit_window", label: "Investor Exit Thresholds" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterSignal(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  filterSignal === f.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Opportunity List */}
          <div className="lg:col-span-7 space-y-3">
            {filteredOpps.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-xl">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">No seller signals in this category</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Run a property memory scan or select another filter.
                </p>
              </div>
            ) : (
              filteredOpps.map((opp) => {
                const isSelected = selectedOpp?.id === opp.id;
                const isUrgent = opp.urgency === "urgent" || opp.urgency === "high";

                return (
                  <div
                    key={opp.id}
                    onClick={() => {
                      setSelectedOpp(opp);
                      setCustomAskingPrice(opp.estimatedValuation ? String(opp.estimatedValuation) : "");
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                        : "border-border bg-card hover:border-border/80 hover:bg-secondary/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-primary">
                            {opp.unitTitle || `${opp.projectName} • ${opp.tower}-${opp.unitNumber}`}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] capitalize ${
                              isUrgent
                                ? "border-red-500/30 text-red-600 bg-red-500/10"
                                : "border-blue-500/30 text-blue-600 bg-blue-500/10"
                            }`}
                          >
                            {opp.urgency}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {opp.ownerName || "Owner"}
                          </span>
                          {opp.ownerPhone && (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="h-3 w-3" /> {formatPhone(opp.ownerPhone)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          Est. Valuation
                        </span>
                        <span className="text-sm font-black font-mono text-emerald-600">
                          {formatCurrencyINR(opp.estimatedValuation || 0)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 p-2 rounded bg-secondary/50 border border-border/50 text-xs text-foreground/90 leading-relaxed">
                      <span className="font-semibold text-primary mr-1">Signal:</span>
                      {opp.suggestedPitch || opp.aiRationale}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                      <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-amber-500" /> Score: {opp.signalStrength}/100
                      </span>

                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-mono uppercase bg-secondary text-secondary-foreground"
                        >
                          {opp.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Deep Opportunity Action Panel */}
          <div className="lg:col-span-5">
            {selectedOpp ? (
              <Card className="border border-border bg-gradient-to-b from-secondary/40 to-card shadow-sm sticky top-0">
                <CardContent className="p-5 space-y-4">
                  <div className="border-b border-border pb-3">
                    <span className="text-[10px] font-mono font-bold uppercase text-primary tracking-wider">
                      Selected Opportunity Action
                    </span>
                    <h3 className="text-base font-bold text-foreground mt-0.5">
                      {selectedOpp.unitTitle || `${selectedOpp.projectName} • ${selectedOpp.tower}-${selectedOpp.unitNumber}`}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Owner: {selectedOpp.ownerName || "Direct Owner"} • {selectedOpp.ownerPhone || "Contact on File"}
                    </p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-3 rounded-lg bg-background border border-border space-y-1.5">
                      <span className="font-bold text-foreground flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Strategy Rationale:
                      </span>
                      <p className="text-muted-foreground leading-relaxed">
                        {selectedOpp.aiRationale || "High capital appreciation threshold reached. Recommended approach is presenting recent registered floor sales in the same tower."}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">
                        Asking Price / Mandate Valuation (INR)
                      </label>
                      <input
                        type="number"
                        value={customAskingPrice}
                        onChange={(e) => setCustomAskingPrice(e.target.value)}
                        placeholder="e.g. 420000000"
                        className="w-full h-8 px-3 text-xs font-mono bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <Button
                      onClick={() => handleConvertToListing(selectedOpp)}
                      className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Convert to Exclusive Resale Mandate</span>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => handleWhatsAppPitch(selectedOpp)}
                      className="w-full h-9 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 text-xs font-semibold gap-1.5"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>WhatsApp Owner Valuation Pitch</span>
                    </Button>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => updateSellerOpportunityStatus(selectedOpp.id, "contacted")}
                        className="h-8 text-xs font-medium"
                      >
                        Mark Contacted
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateSellerOpportunityStatus(selectedOpp.id, "dismissed")}
                        className="h-8 text-xs text-muted-foreground hover:text-red-500"
                      >
                        Dismiss Signal
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="p-8 text-center border border-dashed border-border rounded-xl bg-secondary/20">
                <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">Select an opportunity</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click any seller signal on the left to review AI rationale, valuation, and 1-click list in inventory.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
