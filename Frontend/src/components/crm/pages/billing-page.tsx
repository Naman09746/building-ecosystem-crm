"use client";

import * as React from "react";
import {
  CreditCard,
  ShieldCheck,
  Check,
  Zap,
  Building,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Download,
  FileSpreadsheet,
  X,
  Plus,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Users,
  Flame,
  CheckCircle2,
  Receipt,
  HelpCircle,
} from "lucide-react";
import { useCRM } from "@/context/crm-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { formatCurrencyINR } from "@/lib/utils";
import { PlanId, BillingCycle, BillingOverviewData, BillingInvoice, BillingRefund } from "@/types/billing";
import { toast } from "sonner";
import { isManagerRole } from "@/lib/rbac";

interface PlanItem {
  id: PlanId;
  name: string;
  badge?: string;
  description: string;
  monthlyPrice: number;
  annualMonthlyPrice: number;
  annualTotalPrice: number;
  maxSeats: number;
  maxLeads: number;
  maxProjects: number;
  features: string[];
  popular?: boolean;
}

const PLANS_DATA: PlanItem[] = [
  {
    id: "starter",
    name: "Solo Closer",
    badge: "Solo Broker",
    description: "For independent luxury advisors and solo brokers.",
    monthlyPrice: 1999,
    annualMonthlyPrice: 1599,
    annualTotalPrice: 19188,
    maxSeats: 1,
    maxLeads: 300,
    maxProjects: 1,
    features: [
      "1 Dedicated Sales Closer Seat",
      "Up to 300 Active Leads",
      "1 Master Project Catalog & Tower Map",
      "1-Click WhatsApp & Phone Outreach",
      "Speed-to-Lead 10-Second Countdown",
      "Standard Email Support",
    ],
  },
  {
    id: "growth",
    name: "Boutique Team",
    popular: true,
    badge: "Most Popular",
    description: "The sweet spot for small-to-mid agencies with 2 to 4 closers.",
    monthlyPrice: 4999,
    annualMonthlyPrice: 3999,
    annualTotalPrice: 47988,
    maxSeats: 4,
    maxLeads: 2500,
    maxProjects: 5,
    features: [
      "3 Sales Closers + 1 Executive Cockpit",
      "Up to 2,500 Leads with 360° Dossiers",
      "5 Project Catalogs & Inventory Matrices",
      "Aria AI Lead Scoring & Telemetry",
      "Dead Lead Resurrection Engine",
      "Automated Round-Robin Rep Routing",
      "Priority Phone & WhatsApp Support",
    ],
  },
  {
    id: "enterprise",
    name: "Scale Desk",
    badge: "High-Volume",
    description: "For established brokerages managing multiple project mandates.",
    monthlyPrice: 9999,
    annualMonthlyPrice: 7999,
    annualTotalPrice: 95988,
    maxSeats: 25,
    maxLeads: 50000,
    maxProjects: 100,
    features: [
      "Up to 25 Sales Closers & Managers",
      "Up to 50,000 Active Leads",
      "Unlimited Project Portfolios & Units",
      "Multi-City Regional Hub Scoping",
      "Dedicated Account Director & Onboarding",
      "Custom Webhook Ingestion & Webhooks",
      "99.9% SLA & Custom Data Retention",
    ],
  },
];

export function BillingPage() {
  const { currentUser } = useCRM();
  const isManager = isManagerRole(currentUser.role);

  const [billingData, setBillingData] = React.useState<BillingOverviewData | null>(null);
  const [invoices, setInvoices] = React.useState<BillingInvoice[]>([]);
  const [refunds, setRefunds] = React.useState<BillingRefund[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Billing Cycle Toggle
  const [billingCycle, setBillingCycle] = React.useState<BillingCycle>("monthly");

  // Dialog States
  const [isCheckoutLoading, setIsCheckoutLoading] = React.useState(false);
  const [planChangeModal, setPlanChangeModal] = React.useState<{ plan: PlanItem; cycle: BillingCycle } | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = React.useState(true);
  const [isCanceling, setIsCanceling] = React.useState(false);
  const [isReactivating, setIsReactivating] = React.useState(false);

  // Refund Modal State
  const [refundInvoice, setRefundInvoice] = React.useState<BillingInvoice | null>(null);
  const [refundAmount, setRefundAmount] = React.useState<string>("");
  const [refundReason, setRefundReason] = React.useState("");
  const [isRefunding, setIsRefunding] = React.useState(false);

  // GST & Profile Form State
  const [legalName, setLegalName] = React.useState("");
  const [gstin, setGstin] = React.useState("");
  const [billingEmail, setBillingEmail] = React.useState("");
  const [billingAddressLine, setBillingAddressLine] = React.useState("");
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);

  // Load authoritative billing data on mount
  const loadBilling = React.useCallback(async () => {
    try {
      const [subRes, invRes, refRes] = await Promise.all([
        fetch("/api/billing/subscription"),
        fetch("/api/billing/invoices"),
        fetch("/api/billing/refunds"),
      ]);

      if (subRes.ok) {
        const json = await subRes.json();
        if (json.success) {
          setBillingData(json.data);
          if (json.data.customer) {
            setLegalName(json.data.customer.billingName || "");
            setGstin(json.data.customer.gstin || "");
            setBillingEmail(json.data.customer.billingEmail || "");
            setBillingAddressLine(json.data.customer.billingAddress?.line1 || "");
          }
          if (json.data.subscription?.billingCycle) {
            setBillingCycle(json.data.subscription.billingCycle);
          }
        }
      }

      if (invRes.ok) {
        const invJson = await invRes.json();
        if (invJson.success) setInvoices(invJson.data);
      }

      if (refRes.ok) {
        const refJson = await refRes.json();
        if (refJson.success) setRefunds(refJson.data);
      }
    } catch (err) {
      console.error("Failed to load billing state", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  const currentSub = billingData?.subscription;
  const currentPlan = currentSub?.plan || "growth";
  const currentStatus = currentSub?.status || "trialing";
  const usage = billingData?.usage || { leadsUsed: 0, leadsLimit: 2500, seatsUsed: 1, seatsLimit: 4, projectsCount: 1 };

  // Handle Checkout / Upgrade Initiation
  const handleInitiateCheckout = async (targetPlan: PlanItem, targetCycle: BillingCycle) => {
    if (!isManager) {
      toast.error("Only administrators and managers can modify subscriptions");
      return;
    }

    setIsCheckoutLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: targetPlan.id,
          billingCycle: targetCycle,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error?.message || "Failed to initiate checkout");
        return;
      }

      setPlanChangeModal(null);

      if (json.data.checkoutUrl) {
        toast.info("Redirecting to secure payment checkout...");
        window.location.href = json.data.checkoutUrl;
      } else if (json.data.razorpayOptions) {
        toast.info("Opening Razorpay payment gateway...");
        // If razorpay script is loaded, trigger standard Razorpay modal
        const opt = json.data.razorpayOptions;
        const rzp = new (window as any).Razorpay({
          ...opt,
          handler: function (response: any) {
            toast.success("Payment received! Updating subscription...");
            window.location.href = `/billing/success?payment_id=${response.razorpay_payment_id}`;
          },
        });
        rzp.open();
      }
    } catch {
      toast.error("Network error during checkout initiation");
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  // Handle Cancellation
  const handleCancelSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCanceling(true);
    try {
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: cancelReason.trim(),
          cancelAtPeriodEnd,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error?.message || "Failed to cancel subscription");
        return;
      }

      toast.success(json.data.message);
      setIsCancelModalOpen(false);
      await loadBilling();
    } catch {
      toast.error("Network error canceling subscription");
    } finally {
      setIsCanceling(false);
    }
  };

  // Handle Reactivation
  const handleReactivateSubscription = async () => {
    setIsReactivating(true);
    try {
      const res = await fetch("/api/billing/reactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error?.message || "Failed to reactivate subscription");
        return;
      }

      toast.success(json.data.message || "Subscription reactivated successfully");
      await loadBilling();
    } catch {
      toast.error("Network error reactivating subscription");
    } finally {
      setIsReactivating(false);
    }
  };

  // Handle Refund Request
  const handleRequestRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundInvoice) return;

    const amountNum = parseFloat(refundAmount);
    if (!amountNum || amountNum <= 0) {
      toast.error("Please enter a valid positive refund amount");
      return;
    }

    setIsRefunding(true);
    try {
      const res = await fetch("/api/billing/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: refundInvoice.id,
          amount: amountNum,
          reason: refundReason.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error?.message || "Failed to process refund");
        return;
      }

      toast.success("Refund processed successfully");
      setRefundInvoice(null);
      setRefundAmount("");
      setRefundReason("");
      await loadBilling();
    } catch {
      toast.error("Network error processing refund");
    } finally {
      setIsRefunding(false);
    }
  };

  // Handle Save GST / Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/billing/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legalName: legalName.trim(),
          gstin: gstin.trim().toUpperCase() || undefined,
          billingEmail: billingEmail.trim() || undefined,
          billingAddress: {
            line1: billingAddressLine.trim(),
            country: "IN",
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error?.message || "Failed to update billing profile");
        return;
      }

      toast.success("GST and billing details saved");
      await loadBilling();
    } catch {
      toast.error("Network error saving profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Receipt Download
  const handleDownloadReceipt = async (inv: BillingInvoice) => {
    try {
      const res = await fetch(`/api/billing/invoices/${inv.id}/receipt`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error("Failed to generate receipt");
        return;
      }

      const receipt = json.data;
      const receiptContent = `
============================================================
              APEX CALLCRM TAX INVOICE / RECEIPT
============================================================
Invoice Number: ${receipt.invoiceNumber}
Date of Payment: ${new Date(receipt.paidAt).toLocaleDateString("en-IN")}
Status: ${receipt.status}

SELLER:
${receipt.seller.legalName}
${receipt.seller.address}
GSTIN: ${receipt.seller.gstin}
Email: ${receipt.seller.email}

BUYER:
${receipt.buyer.legalName}
GSTIN: ${receipt.buyer.gstin}
Billing Email: ${receipt.buyer.billingEmail}

ITEMS:
${receipt.lineItems.map((i: any) => `- ${i.description} (SAC: ${i.hsnSac}): ₹${i.total}`).join("\n")}

Subtotal: ₹${receipt.totalAmount - receipt.taxAmount}
GST (18%): ₹${receipt.taxAmount}
TOTAL AMOUNT PAID: ₹${receipt.totalAmount} (INR)
Payment Ref: ${receipt.paymentId}
============================================================
This is a computer-generated tax invoice.
      `.trim();

      const blob = new Blob([receiptContent], { type: "text/plain;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${receipt.invoiceNumber}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded Receipt ${receipt.invoiceNumber}`);
    } catch {
      toast.error("Error generating receipt download");
    }
  };

  const leadPercentage = Math.min(100, Math.round((usage.leadsUsed / (usage.leadsLimit || 1)) * 100));
  const seatPercentage = Math.min(100, Math.round((usage.seatsUsed / (usage.seatsLimit || 1)) * 100));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Subscription, Plans & Billing Dossier
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage multi-tier agency subscriptions, seat quotas, GST tax invoices, and real-time usage meters.
          </p>
        </div>

        {currentSub?.cancelAtPeriodEnd && (
          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 gap-1.5 py-1 px-3">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Scheduled for cancellation on {new Date(currentSub.currentPeriodEnd).toLocaleDateString()}</span>
          </Badge>
        )}
      </div>

      {/* 1. CURRENT SUBSCRIPTION & USAGE METERS BANNER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Plan Overview Card */}
        <Card className="lg:col-span-1 border-primary/30 bg-gradient-to-br from-card to-secondary/30 shadow-subtle flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Subscription</span>
              <Badge
                variant={
                  currentStatus === "active"
                    ? "default"
                    : currentStatus === "trialing"
                    ? "secondary"
                    : currentStatus === "past_due"
                    ? "destructive"
                    : "outline"
                }
                className="capitalize text-[11px] font-bold"
              >
                {currentSub?.cancelAtPeriodEnd ? "Ending Soon" : currentStatus}
              </Badge>
            </div>
            <CardTitle className="text-2xl font-extrabold text-foreground pt-1 flex items-center gap-2">
              <span>{PLANS_DATA.find((p) => p.id === currentPlan)?.name || currentPlan}</span>
            </CardTitle>
            <CardDescription className="text-xs">
              {currentSub?.billingCycle === "yearly" ? "Annual Billing Cycle (Discounted 20%)" : "Monthly Billing Cycle"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            <div className="p-3 rounded-xl border border-border bg-card/80 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <strong className="text-foreground">{formatCurrencyINR(currentSub?.amount || 4999)} / {currentSub?.billingCycle || "mo"}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Renewal Date:</span>
                <span className="text-foreground">{currentSub?.currentPeriodEnd ? new Date(currentSub.currentPeriodEnd).toLocaleDateString() : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gateway:</span>
                <span className="capitalize text-primary font-bold">{currentSub?.provider || "Stripe / Razorpay"}</span>
              </div>
            </div>

            {isManager && (
              <div className="flex items-center gap-2">
                {currentSub?.cancelAtPeriodEnd ? (
                  <Button
                    size="sm"
                    onClick={handleReactivateSubscription}
                    disabled={isReactivating}
                    className="w-full gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>{isReactivating ? "Reactivating..." : "Keep My Subscription"}</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsCancelModalOpen(true)}
                    className="w-full text-xs text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    Cancel Subscription
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Real-time Usage Meters Card */}
        <Card className="lg:col-span-2 border-border bg-card shadow-subtle">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <TrendingUp className="h-4 w-4 text-primary" /> Live Entitlement & Usage Meters
            </CardTitle>
            <CardDescription className="text-xs">
              Hard database-enforced limits for leads, sales seats, and project catalogs.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Leads Usage Meter */}
              <div className="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" /> Lead Capacity
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {usage.leadsUsed} / {usage.leadsLimit} ({leadPercentage}%)
                  </span>
                </div>
                <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      leadPercentage >= 90 ? "bg-destructive" : leadPercentage >= 70 ? "bg-amber-500" : "bg-primary"
                    }`}
                    style={{ width: `${leadPercentage}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground block">
                  {usage.leadsLimit - usage.leadsUsed} lead capacity remaining on current plan tier
                </span>
              </div>

              {/* Seats Usage Meter */}
              <div className="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-primary" /> Sales Seat Allocation
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {usage.seatsUsed} / {usage.seatsLimit} ({seatPercentage}%)
                  </span>
                </div>
                <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      seatPercentage >= 100 ? "bg-destructive" : "bg-emerald-600"
                    }`}
                    style={{ width: `${seatPercentage}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground block">
                  {usage.seatsLimit - usage.seatsUsed} team member seats available to invite
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-border/80 bg-secondary/20 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <span className="text-muted-foreground text-[11px]">
                  Need higher lead quotas or multi-regional enterprise partitioning? Upgrade your subscription instantly.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. PLAN COMPARISON & UPGRADE GRID */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-foreground">Available Agency Subscription Tiers</h2>
            <p className="text-xs text-muted-foreground">Select the plan tailored for your sales velocity and team structure.</p>
          </div>

          {/* Monthly / Annual Billing Toggle */}
          <div className="inline-flex p-1 rounded-xl bg-secondary/80 border border-border self-start sm:self-center shadow-inner">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                billingCycle === "monthly" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                billingCycle === "yearly" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS_DATA.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            const price = billingCycle === "monthly" ? plan.monthlyPrice : plan.annualMonthlyPrice;
            const totalPrice = billingCycle === "yearly" ? plan.annualTotalPrice : plan.monthlyPrice;

            return (
              <Card
                key={plan.id}
                className={`flex flex-col justify-between transition-all duration-200 hover:shadow-card border ${
                  isCurrent
                    ? "border-primary ring-2 ring-primary/40 bg-card shadow-subtle"
                    : plan.popular
                    ? "border-primary/50 bg-card/90"
                    : "border-border bg-card/60"
                }`}
              >
                <CardHeader className="pb-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{plan.name}</span>
                    {plan.badge && (
                      <Badge variant={plan.popular ? "default" : "outline"} className="text-[10px]">
                        {plan.badge}
                      </Badge>
                    )}
                  </div>
                  <div className="pt-2">
                    <span className="text-3xl font-extrabold text-foreground font-mono">{formatCurrencyINR(price)}</span>
                    <span className="text-xs text-muted-foreground font-mono"> / month</span>
                  </div>
                  {billingCycle === "yearly" && (
                    <span className="text-[10px] text-muted-foreground block font-mono">
                      Billed annually at {formatCurrencyINR(totalPrice)}/yr + GST
                    </span>
                  )}
                  <p className="text-xs text-muted-foreground pt-1">{plan.description}</p>
                </CardHeader>

                <CardContent className="space-y-4 pt-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-2 pt-2 border-t border-border/80 text-xs">
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <span className="text-[11px] text-foreground">{feat}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-border">
                    {isCurrent ? (
                      <Button disabled className="w-full h-8 text-xs font-bold bg-secondary text-foreground">
                        Current Plan
                      </Button>
                    ) : isManager ? (
                      <Button
                        size="sm"
                        onClick={() => setPlanChangeModal({ plan, cycle: billingCycle })}
                        className={`w-full h-8 text-xs font-semibold gap-1.5 ${
                          plan.popular
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "variant-outline"
                        }`}
                      >
                        <span>Switch to {plan.name}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button disabled className="w-full h-8 text-xs">
                        Managed by Admin
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 3. GST & LEGAL BILLING PROFILE CARD */}
      <Card className="border-border bg-card shadow-subtle">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Receipt className="h-4 w-4 text-primary" /> Tax Invoicing & GST Details (India)
          </CardTitle>
          <CardDescription className="text-xs">
            Provide official legal entity name and GSTIN to claim 18% Input Tax Credit on your CallCRM tax invoices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-foreground block mb-1">Legal Business Name *</label>
                <Input
                  disabled={!isManager || isSavingProfile}
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="e.g. Apex Realty Advisors Pvt. Ltd."
                />
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1">GSTIN (15 characters)</label>
                <Input
                  disabled={!isManager || isSavingProfile}
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 27AABCA1234A1Z5"
                  className="font-mono uppercase"
                />
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1">Accounts / Finance Email</label>
                <Input
                  type="email"
                  disabled={!isManager || isSavingProfile}
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  placeholder="e.g. finance@agency.com"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-foreground block mb-1">Registered Billing Address</label>
              <Input
                disabled={!isManager || isSavingProfile}
                value={billingAddressLine}
                onChange={(e) => setBillingAddressLine(e.target.value)}
                placeholder="e.g. 402 Trade Tower, Bandra Kurla Complex, Mumbai, Maharashtra 400051"
              />
            </div>

            {isManager && (
              <div className="flex justify-end pt-2">
                <Button type="submit" size="sm" disabled={isSavingProfile} className="h-8 text-xs font-semibold">
                  {isSavingProfile ? "Saving..." : "Save GST Profile"}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* 4. BILLING & INVOICE HISTORY TABLE */}
      <div className="space-y-3 pt-2">
        <h2 className="text-base font-bold text-foreground">Billing History & Tax Receipts</h2>
        {invoices.length === 0 ? (
          <Card className="p-8 text-center text-xs text-muted-foreground border-dashed border-border bg-card">
            No invoice records found. Invoices are generated automatically on checkout and recurring renewal.
          </Card>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-subtle">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date Paid</TableHead>
                  <TableHead>Plan & Interval</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono font-bold text-xs text-foreground">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString("en-IN") : new Date(inv.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs capitalize">
                      {inv.plan} • {inv.billingCycle}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-xs text-foreground">
                      {formatCurrencyINR(inv.amount)}
                      <span className="text-[10px] text-muted-foreground font-normal block font-sans">
                        (incl. 18% GST ₹{inv.taxAmount || Math.round(inv.amount * 0.18)})
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={inv.status === "paid" ? "default" : inv.status === "refunded" ? "outline" : "secondary"}
                        className={`text-[10px] capitalize ${
                          inv.status === "paid" ? "bg-emerald-600 hover:bg-emerald-700" : ""
                        }`}
                      >
                        {inv.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadReceipt(inv)}
                        className="h-7 text-xs px-2 gap-1 text-primary hover:text-primary"
                      >
                        <Download className="h-3 w-3" />
                        <span>Receipt</span>
                      </Button>
                      {isManager && (inv.status === "paid" || inv.status === "partially_refunded") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setRefundInvoice(inv);
                            setRefundAmount(String(inv.amount));
                            setRefundReason("");
                          }}
                          className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                        >
                          Refund
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* MODAL: PLAN CHANGE CONFIRMATION */}
      {planChangeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-border shadow-2xl bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-bold text-foreground">
                Confirm Subscription Change
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setPlanChangeModal(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl border border-border bg-secondary/40 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">New Plan:</span>
                  <strong className="text-foreground">{planChangeModal.plan.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Billing Cycle:</span>
                  <span className="capitalize text-foreground font-semibold">{planChangeModal.cycle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Price:</span>
                  <strong className="text-primary font-mono text-sm">
                    {formatCurrencyINR(
                      planChangeModal.cycle === "yearly"
                        ? planChangeModal.plan.annualTotalPrice
                        : planChangeModal.plan.monthlyPrice
                    )}{" "}
                    + GST
                  </strong>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Upgrades take effect immediately with full entitlement access. For annual plans, your next renewal date
                will be set to 1 year from today.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setPlanChangeModal(null)} className="h-8 text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={isCheckoutLoading}
                  onClick={() => handleInitiateCheckout(planChangeModal.plan, planChangeModal.cycle)}
                  className="h-8 text-xs font-semibold gap-1"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>{isCheckoutLoading ? "Initiating..." : "Proceed to Checkout"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: CANCELLATION DIALOG */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-border shadow-2xl bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-bold text-destructive flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" /> Cancel Subscription
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsCancelModalOpen(false)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCancelSubscription} className="space-y-3.5 text-xs">
                <p className="text-muted-foreground">
                  We are sorry to see you go. Please let us know the primary reason for canceling:
                </p>

                <textarea
                  rows={3}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Agency closing down / project inventory sold out / feature missing..."
                  className="w-full p-2.5 rounded border border-border bg-secondary/50 text-foreground text-xs"
                />

                <div className="space-y-2 p-3 rounded-lg border border-border bg-secondary/30">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="cancelType"
                      checked={cancelAtPeriodEnd}
                      onChange={() => setCancelAtPeriodEnd(true)}
                      className="text-primary"
                    />
                    <span className="font-semibold text-foreground">
                      Cancel at end of current billing cycle (Recommended — access until period end)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="cancelType"
                      checked={!cancelAtPeriodEnd}
                      onChange={() => setCancelAtPeriodEnd(false)}
                      className="text-primary"
                    />
                    <span className="font-semibold text-destructive">
                      Cancel immediately (downgrade to Starter tier right now)
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCancelModalOpen(false)}
                    className="h-8 text-xs"
                  >
                    Keep Subscription
                  </Button>
                  <Button
                    type="submit"
                    variant="destructive"
                    size="sm"
                    disabled={isCanceling}
                    className="h-8 text-xs font-semibold"
                  >
                    {isCanceling ? "Canceling..." : "Confirm Cancellation"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: REFUND REQUEST */}
      {refundInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-border shadow-2xl bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-bold text-foreground">
                Issue Refund for {refundInvoice.invoiceNumber}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setRefundInvoice(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRequestRefund} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-foreground block mb-1">Refund Amount (INR) *</label>
                  <Input
                    type="number"
                    required
                    min={1}
                    max={refundInvoice.amount}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Original invoice amount: {formatCurrencyINR(refundInvoice.amount)}
                  </span>
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">Reason for Refund *</label>
                  <textarea
                    rows={3}
                    required
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="e.g. Duplicate transaction / customer request"
                    className="w-full p-2.5 rounded border border-border bg-secondary/50 text-foreground text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRefundInvoice(null)}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="destructive"
                    size="sm"
                    disabled={isRefunding}
                    className="h-8 text-xs font-semibold"
                  >
                    {isRefunding ? "Processing..." : "Issue Refund"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
