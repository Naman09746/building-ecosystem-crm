"use client";

import * as React from "react";
import {
  Calculator,
  Download,
  Share2,
  Copy,
  Check,
  Building2,
  Sparkles,
  Percent,
  IndianRupee,
  Layers,
  Car,
  ShieldCheck,
  CheckCircle2,
  Printer,
  Clock,
  ArrowRight,
  RefreshCw,
  FileText,
  SlidersHorizontal,
  ChevronDown,
  Info,
  Calendar,
} from "lucide-react";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrencyINR } from "@/lib/utils";
import {
  calculateCostSheet,
  getDefaultCostParameters,
  generateCostSheetWhatsAppText,
  getStandardStampDutyPct,
  type CostSheetParameters,
  type CostSheetBreakdown,
  type IndianState,
  type PaymentPlanType,
} from "@/lib/cost-sheet-calculator";
import { useCRM } from "@/context/crm-context";
import type { ProjectUnit } from "@/types/crm";
import { toast } from "sonner";

interface CostSheetModalProps {
  unit: ProjectUnit | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CostSheetModal({ unit, isOpen, onClose }: CostSheetModalProps) {
  const { projects, currentUser, uploadDocument } = useCRM();

  // Local calculation parameters state
  const [params, setParams] = React.useState<CostSheetParameters | null>(null);
  const [isCopied, setIsCopied] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"summary" | "schedule" | "adjustments">("summary");
  const [isSavingDoc, setIsSavingDoc] = React.useState(false);

  // Initialize parameters whenever the unit changes or modal opens
  React.useEffect(() => {
    if (unit && isOpen) {
      const defaultP = getDefaultCostParameters(unit);
      setParams(defaultP);
    }
  }, [unit, isOpen]);

  // Compute breakdown in real time
  const breakdown: CostSheetBreakdown | null = React.useMemo(() => {
    if (!unit || !params) return null;
    return calculateCostSheet(unit, params);
  }, [unit, params]);

  if (!unit || !params || !breakdown) return null;

  const project = projects.find((p) => p.id === unit.projectId);

  const handleParamChange = <K extends keyof CostSheetParameters>(key: K, value: CostSheetParameters[K]) => {
    setParams((prev) => {
      if (!prev) return null;
      const updated = { ...prev, [key]: value };

      // Auto-adjust stamp duty when state or gender changes unless manually overridden
      if (key === "state" || key === "buyerGender") {
        const state = key === "state" ? (value as IndianState) : prev.state;
        const gender = key === "buyerGender" ? (value as "male" | "female" | "joint") : prev.buyerGender;
        updated.stampDutyPct = getStandardStampDutyPct(state, gender);
      }

      return updated;
    });
  };

  const handleCopySummary = async () => {
    try {
      const text = generateCostSheetWhatsAppText(unit, breakdown, "Apex Realty Advisors");
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success("Cost sheet summary copied to clipboard!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleShareWhatsApp = () => {
    const text = generateCostSheetWhatsAppText(unit, breakdown, "Apex Realty Advisors");
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveToDocuments = async () => {
    setIsSavingDoc(true);
    try {
      if (uploadDocument) {
        await uploadDocument({
          projectId: unit.projectId,
          title: `Cost Sheet - ${unit.tower} ${unit.unitNumber} (${breakdown.paymentPlanType.toUpperCase()})`,
          fileUrl: `https://generated-cost-sheet.internal/${unit.id}-${Date.now()}.pdf`,
          type: "cost_sheet",
        });
      }
      toast.success("Cost sheet snapshot logged in Documents!");
    } catch (e) {
      toast.error("Could not save document snapshot");
    } finally {
      setIsSavingDoc(false);
    }
  };

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Real Estate Cost Sheet & Payment Schedule"
      description={`${project?.name || unit.projectName} • ${unit.tower} - Unit ${unit.unitNumber} (${unit.configuration})`}
      className="max-w-5xl"
    >
      <div className="flex flex-col gap-6 py-2">
        {/* Top Control Bar: Payment Plan Selector & Key Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Payment Plan:</span>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: "clp", label: "CLP (Construction Linked)" },
                  { id: "subvention_10_90", label: "10:90 Subvention" },
                  { id: "subvention_20_80", label: "20:80 Flexi" },
                  { id: "down_payment", label: `Down Payment (-${params.downPaymentDiscountPct}%)` },
                ] as const
              ).map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => handleParamChange("paymentPlanType", plan.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    params.paymentPlanType === plan.id
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                      : "bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-transparent"
                  }`}
                >
                  {plan.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleParamChange("isReadyToMove", !params.isReadyToMove)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                params.isReadyToMove
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {params.isReadyToMove ? "Ready with OC (0% GST)" : "Under-Construction (5% GST)"}
            </button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("summary")}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === "summary"
                  ? "bg-slate-800 text-amber-300 border border-amber-500/30 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Commercial Cost Sheet
            </button>
            <button
              onClick={() => setActiveTab("schedule")}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === "schedule"
                  ? "bg-slate-800 text-amber-300 border border-amber-500/30 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Milestone Payment Schedule ({breakdown.milestones.length} Stages)
            </button>
            <button
              onClick={() => setActiveTab("adjustments")}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === "adjustments"
                  ? "bg-slate-800 text-amber-300 border border-amber-500/30 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Custom Pricing Inputs
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySummary}
              className="text-xs h-8 gap-1.5 border-slate-700 bg-slate-800/50 hover:bg-slate-800"
            >
              {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {isCopied ? "Copied" : "Copy"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareWhatsApp}
              className="text-xs h-8 gap-1.5 border-emerald-800/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60"
            >
              <Share2 className="h-3.5 w-3.5" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs h-8 gap-1.5 border-slate-700 bg-slate-800/50 hover:bg-slate-800"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / PDF
            </Button>
          </div>
        </div>

        {/* Tab 1: Commercial Cost Sheet Breakdown */}
        {activeTab === "summary" && (
          <div className="space-y-6 print:space-y-4">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Net Agreement Value</div>
                <div className="text-2xl font-bold text-slate-100 mt-1 font-mono">
                  {formatCurrencyINR(breakdown.netAgreementValue)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  BSP + Floor Rise + PLC + Parking + Club
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Govt Levies & Taxes</div>
                <div className="text-2xl font-bold text-amber-300 mt-1 font-mono">
                  {formatCurrencyINR(breakdown.totalGovernmentLevies)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  GST ({breakdown.gstRatePct}%) + Stamp Duty ({breakdown.stampDutyRatePct}%) + Reg
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 shadow-lg shadow-amber-950/20">
                <div className="text-xs text-amber-400 font-semibold uppercase tracking-wider">All-Inclusive Total Cost</div>
                <div className="text-2xl font-bold text-amber-200 mt-1 font-mono">
                  {formatCurrencyINR(breakdown.totalAllInclusiveCost)}
                </div>
                <div className="text-xs text-amber-400/70 mt-1">
                  Effective: ₹{breakdown.effectiveAllInclusivePerSqFt.toLocaleString("en-IN")}/sq.ft
                </div>
              </div>
            </div>

            {/* Line Item Breakdown Table */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-left font-medium text-slate-400">
                    <th className="py-2.5 px-4">Component</th>
                    <th className="py-2.5 px-4">Rate Basis</th>
                    <th className="py-2.5 px-4 text-right">Taxable Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {/* Basic Cost */}
                  <tr className="bg-slate-900/30 font-sans font-semibold text-slate-300">
                    <td colSpan={3} className="py-2 px-4 bg-slate-800/40 text-amber-400/90 text-xs">
                      1. Basic Consideration & Add-ons (Agreement Value)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 font-sans text-slate-300">
                      Basic Sale Price (BSP)
                      <span className="block text-[10px] text-slate-500 font-sans font-normal">
                        Super Area: {breakdown.superAreaSqFt} sq.ft (Carpet: {breakdown.carpetAreaSqFt} sq.ft)
                      </span>
                    </td>
                    <td className="py-2 px-4 text-slate-400">
                      ₹{breakdown.baseRatePerSqFt.toLocaleString("en-IN")}/sq.ft
                    </td>
                    <td className="py-2 px-4 text-right text-slate-200 font-medium">
                      {formatCurrencyINR(breakdown.basicSalePrice)}
                    </td>
                  </tr>

                  {breakdown.floorRiseCharges > 0 && (
                    <tr>
                      <td className="py-2 px-4 font-sans text-slate-300">
                        Floor Rise Premium
                        <span className="block text-[10px] text-slate-500 font-sans font-normal">
                          Floor {params.floorNumber} (Eligible above Floor {params.floorRiseThresholdFloor})
                        </span>
                      </td>
                      <td className="py-2 px-4 text-slate-400">
                        ₹{breakdown.floorRiseRatePerSqFt}/sq.ft
                      </td>
                      <td className="py-2 px-4 text-right text-slate-200">
                        {formatCurrencyINR(breakdown.floorRiseCharges)}
                      </td>
                    </tr>
                  )}

                  {breakdown.plcCharges > 0 && (
                    <tr>
                      <td className="py-2 px-4 font-sans text-slate-300">
                        Preferential Location Charge (PLC)
                        <span className="block text-[10px] text-slate-500 font-sans font-normal">
                          {params.plcType.replace(/_/g, " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-slate-400">
                        ₹{breakdown.plcRatePerSqFt}/sq.ft
                      </td>
                      <td className="py-2 px-4 text-right text-slate-200">
                        {formatCurrencyINR(breakdown.plcCharges)}
                      </td>
                    </tr>
                  )}

                  <tr>
                    <td className="py-2 px-4 font-sans text-slate-300">
                      Covered Car Parking Allotment
                    </td>
                    <td className="py-2 px-4 text-slate-400">
                      {params.coveredCarParkingCount} Slot(s) @ ₹{(params.carParkingCostPerSlot / 100000).toFixed(1)} L
                    </td>
                    <td className="py-2 px-4 text-right text-slate-200">
                      {formatCurrencyINR(breakdown.carParkingCharges)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2 px-4 font-sans text-slate-300">Club Membership Fee</td>
                    <td className="py-2 px-4 text-slate-400">One-time Mandatory</td>
                    <td className="py-2 px-4 text-right text-slate-200">
                      {formatCurrencyINR(breakdown.clubMembershipCharges)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2 px-4 font-sans text-slate-300">Power Backup & Infrastructure Charges</td>
                    <td className="py-2 px-4 text-slate-400">₹{params.powerBackupAndInfraPerSqFt}/sq.ft</td>
                    <td className="py-2 px-4 text-right text-slate-200">
                      {formatCurrencyINR(breakdown.powerBackupInfraCharges)}
                    </td>
                  </tr>

                  <tr className="bg-slate-800/30 font-semibold text-slate-100">
                    <td className="py-2.5 px-4 font-sans text-amber-200">Net Agreement Value (A)</td>
                    <td className="py-2.5 px-4 text-slate-400 font-normal">Total Taxable Consideration</td>
                    <td className="py-2.5 px-4 text-right text-amber-300 text-sm">
                      {formatCurrencyINR(breakdown.netAgreementValue)}
                    </td>
                  </tr>

                  {/* Government Taxes */}
                  <tr className="bg-slate-900/30 font-sans font-semibold text-slate-300">
                    <td colSpan={3} className="py-2 px-4 bg-slate-800/40 text-amber-400/90 text-xs">
                      2. Government Taxes & Stamp Duty
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 font-sans text-slate-300">
                      GST (Goods & Services Tax)
                      <span className="block text-[10px] text-slate-500 font-sans font-normal">
                        {params.isReadyToMove ? "Exempted (Ready with OC)" : "Standard Luxury Residential Rate"}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-slate-400">{breakdown.gstRatePct}% on Agreement Value</td>
                    <td className="py-2 px-4 text-right text-slate-200">
                      {formatCurrencyINR(breakdown.gstAmount)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2 px-4 font-sans text-slate-300">
                      Stamp Duty ({params.state.toUpperCase()} - {params.buyerGender.toUpperCase()})
                    </td>
                    <td className="py-2 px-4 text-slate-400">{breakdown.stampDutyRatePct}%</td>
                    <td className="py-2 px-4 text-right text-slate-200">
                      {formatCurrencyINR(breakdown.stampDutyAmount)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2 px-4 font-sans text-slate-300">Registration & Legal Charges</td>
                    <td className="py-2 px-4 text-slate-400">Sub-Registrar Fees</td>
                    <td className="py-2 px-4 text-right text-slate-200">
                      {formatCurrencyINR(breakdown.registrationAmount)}
                    </td>
                  </tr>

                  <tr className="bg-slate-800/30 font-semibold text-slate-100">
                    <td className="py-2.5 px-4 font-sans text-amber-200">Total Statutory Levies (B)</td>
                    <td className="py-2.5 px-4 text-slate-400 font-normal">Taxes & Stamp Duty</td>
                    <td className="py-2.5 px-4 text-right text-amber-300 text-sm">
                      {formatCurrencyINR(breakdown.totalGovernmentLevies)}
                    </td>
                  </tr>

                  {/* Possession Deposits */}
                  <tr className="bg-slate-900/30 font-sans font-semibold text-slate-300">
                    <td colSpan={3} className="py-2 px-4 bg-slate-800/40 text-amber-400/90 text-xs">
                      3. Possession Deposits & Sundries (Payable on Key Handover)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 font-sans text-slate-300">
                      Interest-Free Maintenance Security (IFMS)
                    </td>
                    <td className="py-2 px-4 text-slate-400">₹{params.ifmsRatePerSqFt}/sq.ft</td>
                    <td className="py-2 px-4 text-right text-slate-200">
                      {formatCurrencyINR(breakdown.ifmsAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 font-sans text-slate-300">Electricity Meter, Water & Administrative Handover</td>
                    <td className="py-2 px-4 text-slate-400">Fixed Deposit</td>
                    <td className="py-2 px-4 text-right text-slate-200">
                      {formatCurrencyINR(breakdown.possessionCharges)}
                    </td>
                  </tr>

                  <tr className="bg-slate-800/30 font-semibold text-slate-100">
                    <td className="py-2.5 px-4 font-sans text-amber-200">Total Possession Fund (C)</td>
                    <td className="py-2.5 px-4 text-slate-400 font-normal">Payable on Notice of Possession</td>
                    <td className="py-2.5 px-4 text-right text-amber-300 text-sm">
                      {formatCurrencyINR(breakdown.totalPossessionCharges)}
                    </td>
                  </tr>

                  {/* Grand Total */}
                  <tr className="bg-amber-950/40 font-bold text-slate-100 border-t-2 border-amber-500/40">
                    <td className="py-3 px-4 font-sans text-amber-300 text-sm">
                      🏆 Total All-Inclusive Acquisition Cost (A + B + C)
                    </td>
                    <td className="py-3 px-4 text-amber-400/80 font-normal text-xs">
                      Rate: ₹{breakdown.effectiveAllInclusivePerSqFt.toLocaleString("en-IN")}/sq.ft
                    </td>
                    <td className="py-3 px-4 text-right text-amber-200 text-base font-mono">
                      {formatCurrencyINR(breakdown.totalAllInclusiveCost)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Payment Milestone Schedule */}
        {activeTab === "schedule" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Calendar className="h-4 w-4 text-amber-400" />
                <span className="font-semibold">{breakdown.paymentPlanName}</span>
              </div>
              <div className="text-slate-400 font-mono">
                Total Agreement: {formatCurrencyINR(breakdown.netAgreementValue)}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-left font-medium text-slate-400">
                    <th className="py-2.5 px-4">#</th>
                    <th className="py-2.5 px-4">Milestone Event</th>
                    <th className="py-2.5 px-4">Timeline</th>
                    <th className="py-2.5 px-4 text-right">%</th>
                    <th className="py-2.5 px-4 text-right">Agreement Part</th>
                    <th className="py-2.5 px-4 text-right">GST ({breakdown.gstRatePct}%)</th>
                    <th className="py-2.5 px-4 text-right">Total Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {breakdown.milestones.map((m, idx) => (
                    <tr key={m.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-2.5 px-4 text-slate-500 font-sans">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-sans font-medium text-slate-200">
                        {m.stageName}
                        {m.possessionOtherCharges > 0 && (
                          <span className="block text-[10px] text-amber-400/80 font-sans">
                            Includes IFMS & Possession Charges ({formatCurrencyINR(m.possessionOtherCharges)})
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-sans text-slate-400">{m.dueTimelineDescription}</td>
                      <td className="py-2.5 px-4 text-right text-slate-300 font-semibold">{m.percentage}%</td>
                      <td className="py-2.5 px-4 text-right text-slate-300">
                        {formatCurrencyINR(m.payableAgreementAmount)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-400">
                        {formatCurrencyINR(m.taxAmount)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-amber-300 font-bold">
                        {formatCurrencyINR(m.totalPayable)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-800/50 font-bold border-t border-slate-700 font-mono">
                    <td colSpan={3} className="py-3 px-4 font-sans text-slate-200">Total Milestones Sum</td>
                    <td className="py-3 px-4 text-right text-amber-300">100%</td>
                    <td className="py-3 px-4 text-right text-slate-200">
                      {formatCurrencyINR(breakdown.netAgreementValue)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-200">
                      {formatCurrencyINR(breakdown.gstAmount)}
                    </td>
                    <td className="py-3 px-4 text-right text-amber-200 text-sm">
                      {formatCurrencyINR(
                        breakdown.netAgreementValue + breakdown.gstAmount + breakdown.totalPossessionCharges
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Custom Financial Adjustments */}
        {activeTab === "adjustments" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
            <div className="space-y-3">
              <h4 className="font-semibold text-amber-300 text-xs uppercase tracking-wider">Base & Area Controls</h4>
              
              <div>
                <label className="text-slate-400 block mb-1">Base Selling Price Rate (₹ / sq.ft)</label>
                <Input
                  type="number"
                  value={params.baseRatePerSqFt}
                  onChange={(e) => handleParamChange("baseRatePerSqFt", Number(e.target.value))}
                  className="bg-slate-950 border-slate-700 h-8 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Super Built-Up Area (sq.ft)</label>
                <Input
                  type="number"
                  value={params.superAreaSqFt}
                  onChange={(e) => handleParamChange("superAreaSqFt", Number(e.target.value))}
                  className="bg-slate-950 border-slate-700 h-8 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Floor Rise Rate (₹ / floor above threshold)</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Rate/sqft"
                    value={params.floorRiseRatePerFloor}
                    onChange={(e) => handleParamChange("floorRiseRatePerFloor", Number(e.target.value))}
                    className="bg-slate-950 border-slate-700 h-8 text-xs font-mono"
                  />
                  <Input
                    type="number"
                    placeholder="Threshold floor"
                    value={params.floorRiseThresholdFloor}
                    onChange={(e) => handleParamChange("floorRiseThresholdFloor", Number(e.target.value))}
                    className="bg-slate-950 border-slate-700 h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Preferential Location Charge (PLC)</label>
                <select
                  value={params.plcType}
                  onChange={(e) => handleParamChange("plcType", e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md h-8 px-2 text-xs text-slate-200"
                >
                  <option value="none">None (₹0)</option>
                  <option value="park_facing">Park / Garden Facing (₹200/sqft)</option>
                  <option value="corner_unit">Corner Unit (₹250/sqft)</option>
                  <option value="club_pool_facing">Club / Pool Facing (₹350/sqft)</option>
                  <option value="golf_course_facing">Golf Course View (₹500/sqft)</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-amber-300 text-xs uppercase tracking-wider">Taxes & State Levies</h4>

              <div>
                <label className="text-slate-400 block mb-1">State / Jurisdiction</label>
                <select
                  value={params.state}
                  onChange={(e) => handleParamChange("state", e.target.value as IndianState)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md h-8 px-2 text-xs text-slate-200"
                >
                  <option value="haryana">Haryana (Gurugram / Faridabad)</option>
                  <option value="delhi">Delhi NCT</option>
                  <option value="maharashtra">Maharashtra (Mumbai MMR / Pune)</option>
                  <option value="karnataka">Karnataka (Bengaluru)</option>
                  <option value="uttar_pradesh">Uttar Pradesh (Noida / Greater Noida)</option>
                  <option value="telangana">Telangana (Hyderabad)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Buyer Gender Profile</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["male", "female", "joint"] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => handleParamChange("buyerGender", g)}
                      className={`py-1 rounded text-xs capitalize ${
                        params.buyerGender === g
                          ? "bg-amber-500/30 text-amber-300 border border-amber-500/40"
                          : "bg-slate-950 text-slate-400 border border-slate-800"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Covered Car Parking Slots</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    value={params.coveredCarParkingCount}
                    onChange={(e) => handleParamChange("coveredCarParkingCount", Number(e.target.value))}
                    className="bg-slate-950 border-slate-700 h-8 text-xs font-mono"
                  />
                  <Input
                    type="number"
                    placeholder="Cost per slot"
                    value={params.carParkingCostPerSlot}
                    onChange={(e) => handleParamChange("carParkingCostPerSlot", Number(e.target.value))}
                    className="bg-slate-950 border-slate-700 h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Club Membership Charge (₹)</label>
                <Input
                  type="number"
                  value={params.clubMembershipCharges}
                  onChange={(e) => handleParamChange("clubMembershipCharges", Number(e.target.value))}
                  className="bg-slate-950 border-slate-700 h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-amber-400/80" />
            <span>Official RERA compliant calculation estimate. Stamp duty rates vary by district registry.</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveToDocuments}
              disabled={isSavingDoc}
              className="text-xs h-8 gap-1.5 border-slate-700 bg-slate-800/40"
            >
              <FileText className="h-3.5 w-3.5" />
              {isSavingDoc ? "Saving..." : "Save to Documents"}
            </Button>
            <Button
              size="sm"
              onClick={onClose}
              className="text-xs h-8 bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    </ResponsiveModal>
  );
}
