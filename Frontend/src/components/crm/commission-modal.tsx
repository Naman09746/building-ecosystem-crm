"use client";

import * as React from "react";
import {
  Calculator,
  IndianRupee,
  ShieldCheck,
  Percent,
  Receipt,
  FileCheck,
  Building2,
  Users,
  Copy,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import { useCRM } from "@/context/crm-context";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyINR } from "@/lib/utils";
import type { Lead, ProjectUnit, CommissionLedger } from "@/types/crm";
import { toast } from "sonner";

interface CommissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  unit?: ProjectUnit | null;
}

export function CommissionModal({
  open,
  onOpenChange,
  lead,
  unit,
}: CommissionModalProps) {
  const { currentUser, leads, units } = useCRM();

  const activeLead = lead || leads[0];
  const activeUnit = unit || units[0];

  const defaultDealValue = activeUnit?.askingPrice || activeUnit?.price || 150000000;

  // Calculation parameters
  const [dealValue, setDealValue] = React.useState<number>(defaultDealValue);
  const [buyerBrokeragePct, setBuyerBrokeragePct] = React.useState<number>(1.0);
  const [sellerBrokeragePct, setSellerBrokeragePct] = React.useState<number>(1.0);
  const [cpCommissionPct, setCpCommissionPct] = React.useState<number>(0.0);
  const [salespersonIncentivePct, setSalespersonIncentivePct] = React.useState<number>(10.0);
  const [managerOverridePct, setManagerOverridePct] = React.useState<number>(3.0);

  // Financial Computations
  const buyerBrokerage = (dealValue * buyerBrokeragePct) / 100;
  const sellerBrokerage = (dealValue * sellerBrokeragePct) / 100;
  const totalGrossBrokerage = buyerBrokerage + sellerBrokerage;

  // Indian Taxation: 18% GST (on brokerage service) & 1% TDS (Section 194H)
  const gstRate = 18.0;
  const gstAmount = (totalGrossBrokerage * gstRate) / 100;
  const tdsRate = 1.0;
  const tdsDeducted = (totalGrossBrokerage * tdsRate) / 100;
  const netBrokerageReceivable = totalGrossBrokerage + gstAmount - tdsDeducted;

  // Splits & Payouts
  const cpPayout = (totalGrossBrokerage * cpCommissionPct) / 100;
  const repIncentive = (totalGrossBrokerage * salespersonIncentivePct) / 100;
  const managerOverride = (totalGrossBrokerage * managerOverridePct) / 100;
  const companyNetRetention = totalGrossBrokerage - cpPayout - repIncentive - managerOverride;

  const handleCopyReceipt = () => {
    const summary = `CallCRM Commission & Brokerage Statement\nDeal Value: ${formatCurrencyINR(dealValue)}\nGross Brokerage (${buyerBrokeragePct + sellerBrokeragePct}%): ${formatCurrencyINR(totalGrossBrokerage)}\nGST (18%): +${formatCurrencyINR(gstAmount)}\nTDS (1% u/s 194H): -${formatCurrencyINR(tdsDeducted)}\nTotal Net Receivable: ${formatCurrencyINR(netBrokerageReceivable)}\nSalesperson Incentive (${salespersonIncentivePct}%): ${formatCurrencyINR(repIncentive)}\nCompany Net Retention: ${formatCurrencyINR(companyNetRetention)}`;
    navigator.clipboard.writeText(summary);
    toast.success("Brokerage breakdown copied to clipboard!");
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-[700px] p-0 overflow-hidden bg-slate-950 border border-slate-800 text-slate-100"
    >
      {/* Header */}
      <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10 font-mono text-[10px]">
              <Receipt className="h-3 w-3 mr-1" />
              Indian Real Estate Brokerage Ledger
            </Badge>
            <span className="text-xs text-slate-400 font-mono">Statutory GST & TDS Engine</span>
          </div>

          <div className="text-right font-mono">
            <span className="text-[10px] text-slate-400 uppercase block">Company Net Retention</span>
            <span className="text-sm font-bold text-amber-400">{formatCurrencyINR(companyNetRetention)}</span>
          </div>
        </div>

        <div className="mt-2">
          <h2 className="text-lg font-black text-slate-100">
            {activeUnit?.tower} • {activeUnit?.unitNumber} — Commission Statement
          </h2>
          <p className="text-xs text-slate-400">
            Buyer: <strong>{activeLead?.personName}</strong> • Agreed Deal Value: <strong className="font-mono text-slate-200">{formatCurrencyINR(dealValue)}</strong>
          </p>
        </div>
      </div>

      <div className="p-5 max-h-[70vh] overflow-y-auto space-y-5">
        {/* Deal Value Input */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 text-xs">
          <div className="space-y-1">
            <Label className="text-slate-300">Final Transacted Price (₹)</Label>
            <Input
              type="number"
              value={dealValue}
              onChange={(e) => setDealValue(parseFloat(e.target.value) || 0)}
              className="h-8 bg-slate-950 border-slate-700 text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-slate-300">Buyer Brokerage %</Label>
            <Input
              type="number"
              step="0.25"
              value={buyerBrokeragePct}
              onChange={(e) => setBuyerBrokeragePct(parseFloat(e.target.value) || 0)}
              className="h-8 bg-slate-950 border-slate-700 text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-slate-300">Seller Brokerage %</Label>
            <Input
              type="number"
              step="0.25"
              value={sellerBrokeragePct}
              onChange={(e) => setSellerBrokeragePct(parseFloat(e.target.value) || 0)}
              className="h-8 bg-slate-950 border-slate-700 text-xs font-mono"
            />
          </div>
        </div>

        {/* Invoice & Tax Breakdown */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Statutory Indian Invoice Breakdown
          </span>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Total Gross Brokerage ({buyerBrokeragePct + sellerBrokeragePct}%)</span>
              <span className="font-mono font-bold text-slate-100">{formatCurrencyINR(totalGrossBrokerage)}</span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span>+ GST (18.00% on Brokerage Services)</span>
              <span className="font-mono text-slate-300">+{formatCurrencyINR(gstAmount)}</span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span>- TDS Deducted at Source (1.00% u/s 194H)</span>
              <span className="font-mono text-rose-400">-{formatCurrencyINR(tdsDeducted)}</span>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-bold">
              <span className="text-amber-300">Net Brokerage Receivable (Invoice Total)</span>
              <span className="font-mono text-emerald-400 text-sm">{formatCurrencyINR(netBrokerageReceivable)}</span>
            </div>
          </div>
        </div>

        {/* Internal Commission Splits & Payouts */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Internal Commission Distribution
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
              <span className="text-[10px] uppercase text-slate-400 font-mono block">Sales Rep Incentive</span>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">{salespersonIncentivePct}%</span>
                <span className="font-mono font-bold text-emerald-400">{formatCurrencyINR(repIncentive)}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
              <span className="text-[10px] uppercase text-slate-400 font-mono block">Manager Override</span>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">{managerOverridePct}%</span>
                <span className="font-mono font-bold text-blue-400">{formatCurrencyINR(managerOverride)}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
              <span className="text-[10px] uppercase text-slate-400 font-mono block">Channel Partner Share</span>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">{cpCommissionPct}%</span>
                <span className="font-mono font-bold text-slate-400">{formatCurrencyINR(cpPayout)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyReceipt}
            className="h-8 text-xs border-slate-700 bg-slate-900 text-slate-300 gap-1.5"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Copy Ledger Summary</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              toast.success("Commission ledger registered & invoice queued for accounting!");
              onOpenChange(false);
            }}
            className="h-8 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Save & Approve Ledger</span>
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
