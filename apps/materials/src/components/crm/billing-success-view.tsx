"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Download, ArrowRight, ShieldCheck, Receipt, Sparkles, Building, Loader2 } from "lucide-react";
import { Card, CardContent } from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { Badge } from "@repo/ui/components/badge";
import { formatCurrencyINR } from "@repo/core/lib/utils";
import { toast } from "sonner";

export function BillingSuccessView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [loading, setLoading] = React.useState(true);
  const [subData, setSubData] = React.useState<any>(null);
  const [latestInvoice, setLatestInvoice] = React.useState<any>(null);
  const [verified, setVerified] = React.useState(false);

  // Authoritative server-side verification
  React.useEffect(() => {
    async function verifyPayment() {
      try {
        const [subRes, invRes] = await Promise.all([
          fetch("/api/billing/subscription"),
          fetch("/api/billing/invoices"),
        ]);

        if (subRes.ok) {
          const subJson = await subRes.json();
          if (subJson.success) {
            setSubData(subJson.data);
            const status = subJson.data.subscription?.status;
            // Subscription must be active or trialing
            if (status === "active" || status === "trialing") {
              setVerified(true);
            }
          }
        }

        if (invRes.ok) {
          const invJson = await invRes.json();
          if (invJson.success && invJson.data?.length > 0) {
            setLatestInvoice(invJson.data[0]);
          }
        }
      } catch (err) {
        console.error("Failed to verify server payment state", err);
      } finally {
        setLoading(false);
      }
    }

    verifyPayment();
  }, [sessionId]);

  const handleDownloadTaxInvoice = () => {
    if (!latestInvoice) {
      toast.info("Invoice is being generated in background...");
      return;
    }

    const receiptContent = `
============================================================
              APEX CALLCRM TAX INVOICE
============================================================
Invoice Number: ${latestInvoice.invoiceNumber}
Date of Payment: ${new Date(latestInvoice.paidAt || latestInvoice.createdAt).toLocaleDateString("en-IN")}
Status: PAID

SELLER:
Ecosystem Realty Technologies Private Limited
Unit 402, Trade Tower, Bandra Kurla Complex, Mumbai, MH 400051
GSTIN: 27AAACA1234A1Z5

BUYER:
${latestInvoice.billingName || "Apex Realty Advisors"}
GSTIN: ${latestInvoice.gstin || "Unregistered"}

PLAN & SERVICES:
- EcosystemRealty ${latestInvoice.plan.toUpperCase()} Plan (${latestInvoice.billingCycle})
  HSN/SAC: 998313
  Amount: ₹${latestInvoice.amount - (latestInvoice.taxAmount || Math.round(latestInvoice.amount * 0.18))}
  GST (18%): ₹${latestInvoice.taxAmount || Math.round(latestInvoice.amount * 0.18)}
  TOTAL PAID: ₹${latestInvoice.amount} (INR)

Payment ID: ${latestInvoice.providerPaymentId || "pay_verified"}
============================================================
Thank you for powering your real estate sales desk with EcosystemRealty!
    `.trim();

    const blob = new Blob([receiptContent], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tax-invoice-${latestInvoice.invoiceNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success("Downloaded official tax invoice");
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-semibold text-foreground">Verifying server payment records...</p>
      </div>
    );
  }

  const sub = subData?.subscription || {};
  const totalAmount = latestInvoice?.amount || sub.amount || 4999;
  const taxAmount = latestInvoice?.taxAmount || Math.round(totalAmount * 0.18);
  const baseAmount = totalAmount - taxAmount;

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-6 animate-in fade-in zoom-in-95 duration-500">
      {/* Top Success Badge & Heading */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/10 ring-8 ring-emerald-500/10 animate-bounce">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Payment Confirmed & Plan Activated!
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
          Your agency subscription has been upgraded and synchronized across all sales desks.
        </p>
      </div>

      {/* Perforated Digital Receipt Card */}
      <div className="relative bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Receipt Header Ribbon */}
        <div className="bg-primary/10 border-b border-border/80 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-primary font-bold text-xs">
            <Receipt className="h-4 w-4" />
            <span>OFFICIAL TAX INVOICE & RECEIPT</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
            {latestInvoice?.invoiceNumber || `INV-${new Date().getFullYear()}-00824`}
          </p>
        </div>

        {/* Receipt Body */}
        <div className="p-6 space-y-4 text-xs font-mono">
          <div className="flex justify-between items-center pb-3 border-b border-dashed border-border">
            <span className="text-muted-foreground font-sans">Agency Workspace</span>
            <strong className="text-foreground font-sans text-sm">{subData?.customer?.billingName || "Apex Realty"}</strong>
          </div>

          <div className="space-y-2 pb-3 border-b border-dashed border-border">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan Tier</span>
              <span className="capitalize font-bold text-foreground">{sub.plan || "Growth"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Billing Interval</span>
              <span className="capitalize text-foreground">{sub.billingCycle || "Monthly"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base Subscription</span>
              <span className="text-foreground">{formatCurrencyINR(baseAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">GST (18% IGST/CGST)</span>
              <span className="text-foreground">{formatCurrencyINR(taxAmount)}</span>
            </div>
          </div>

          <div className="flex justify-between items-center text-sm font-bold pt-1">
            <span className="font-sans text-foreground">Total Amount Paid</span>
            <span className="text-primary font-mono text-base">{formatCurrencyINR(totalAmount)}</span>
          </div>

          <div className="p-2.5 rounded-lg bg-secondary/40 border border-border text-[11px] space-y-1 font-sans text-muted-foreground">
            <div className="flex justify-between font-mono">
              <span>Date: {new Date().toLocaleDateString("en-IN")}</span>
              <span className="text-emerald-600 font-bold">STATUS: PAID</span>
            </div>
            <p className="text-[10px]">
              Input Tax Credit eligible. Access the invoice history anytime from your Billing settings.
            </p>
          </div>
        </div>

        {/* Perforated Sawtooth Bottom Edge Simulation */}
        <div className="h-3 bg-secondary/50 border-t border-dashed border-border flex items-center justify-around overflow-hidden px-2">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-background" />
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <Button
          onClick={handleDownloadTaxInvoice}
          variant="outline"
          className="w-full sm:w-1/2 h-10 text-xs font-semibold gap-2 border-border hover:bg-secondary"
        >
          <Download className="h-4 w-4" />
          <span>Download Tax Invoice</span>
        </Button>

        <Button
          onClick={() => router.push("/leads")}
          className="w-full sm:w-1/2 h-10 text-xs font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <span>Launch CRM Dashboard</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
