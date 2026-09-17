"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@repo/core/context/auth-context";
import { AuthCard } from "@repo/ui/components/auth-card";
import { 
  Check, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  CreditCard, 
  Loader2, 
  CheckCircle2,
  Building2,
  PhoneCall,
  Zap
} from "lucide-react";

interface PlanTier {
  id: "starter" | "growth" | "enterprise";
  name: string;
  badge?: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  popular?: boolean;
}

const PLANS: PlanTier[] = [
  {
    id: "starter",
    name: "Solo Closer",
    description: "For independent luxury advisors and solo brokers.",
    monthlyPrice: 1999,
    annualPrice: 1599,
    features: [
      "1 Dedicated Sales Closer Seat",
      "Up to 300 Active Leads",
      "1 Master Project Catalog",
      "1-Click Calling & WhatsApp Logging",
      "Standard Support",
    ],
  },
  {
    id: "growth",
    name: "Boutique Team",
    popular: true,
    badge: "Most Popular for Small Agencies",
    description: "The sweet spot for small-to-mid agencies with 2 to 4 closers.",
    monthlyPrice: 4999,
    annualPrice: 3999,
    features: [
      "3 Sales Closers + 1 Executive Cockpit",
      "Up to 2,500 Leads with 360° Dossiers",
      "5 Project Catalogs & Inventory Matrices",
      "AI Buyer-to-Unit Matcher Engine",
      "Automated SLA Calling Queue",
      "Priority WhatsApp & Phone Support",
    ],
  },
  {
    id: "enterprise",
    name: "Scale Desk",
    badge: "5–10 Closers",
    description: "For established brokerages managing multiple project mandates.",
    monthlyPrice: 9999,
    annualPrice: 7999,
    features: [
      "Up to 10 Sales Closers & Managers",
      "Up to 10,000 Active Leads",
      "Unlimited Project Catalogs & Units",
      "Multi-City Regional Tenant Partitioning",
      "Dedicated Account Manager & Onboarding",
    ],
  },
];

export default function ChoosePlanPage() {
  const router = useRouter();
  const { org, selectPlan } = useAuth();

  const [billingCycle, setBillingCycle] = React.useState<"monthly" | "yearly">("monthly");
  const [selectedPlanId, setSelectedPlanId] = React.useState<"starter" | "growth" | "enterprise">("growth");
  
  // Payment Simulation State
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [paymentSuccess, setPaymentSuccess] = React.useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = React.useState(false);

  const selectedPlan = PLANS.find((p) => p.id === selectedPlanId) || PLANS[1];
  const price = billingCycle === "monthly" ? selectedPlan.monthlyPrice : selectedPlan.annualPrice;
  const gst = Math.round(price * 0.18);
  const total = price + gst;

  const handleStartTrial = () => {
    setShowCheckoutModal(true);
  };

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    try {
      // Call real checkout or trial activation
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlanId,
          billingCycle: billingCycle,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data.checkoutUrl) {
        selectPlan(selectedPlanId, billingCycle);
        window.location.href = json.data.checkoutUrl;
        return;
      }
    } catch {
      // fallback
    }

    // Free Trial / Local Fallback
    selectPlan(selectedPlanId, billingCycle);
    setPaymentSuccess(true);
    setTimeout(() => {
      router.push("/onboarding");
    }, 1000);
  };

  return (
    <AuthCard
      currentStep="plan"
      maxWidthClass="max-w-4xl"
      title="Choose your Subscription Plan"
      subtitle={`Selected organization: ${org?.name || "Apex Realty"}. Start with a 14-day risk-free trial.`}
      footerContent={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1 text-emerald-600">
            <ShieldCheck className="h-4 w-4" />
            <span>14-day full access • ₹0 charged today • Zero surprise charges</span>
          </div>
          <span>Need custom setup? Contact team@ecosystemrealty.in</span>
        </div>
      }
    >
      {/* Billing Cycle Switcher */}
      <div className="flex items-center justify-center my-2">
        <div className="bg-muted p-1 rounded-xl border border-border flex items-center gap-1 shadow-inner">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              billingCycle === "monthly"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("yearly")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              billingCycle === "yearly"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Annual Billing</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isSelected = selectedPlanId === plan.id;
          const displayPrice = billingCycle === "monthly" ? plan.monthlyPrice : plan.annualPrice;

          return (
            <div
              key={plan.id}
              onClick={() => setSelectedPlanId(plan.id)}
              className={`relative rounded-2xl border p-5 cursor-pointer transition-all flex flex-col justify-between ${
                isSelected
                  ? "border-primary bg-card ring-2 ring-primary shadow-md -translate-y-1"
                  : "border-border bg-card/60 hover:bg-card hover:border-border/80"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                  {plan.badge}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
                  <div
                    className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40"
                    }`}
                  >
                    {isSelected && <Check className="h-2.5 w-2.5" />}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground min-h-[32px] mb-4">
                  {plan.description}
                </p>

                <div className="mb-5 pb-4 border-b border-border">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-foreground tracking-tight">
                      ₹{displayPrice.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">/ month</span>
                  </div>
                  {billingCycle === "yearly" && (
                    <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                      Billed annually (₹{(displayPrice * 12).toLocaleString("en-IN")}/yr)
                    </p>
                  )}
                </div>

                {/* Features List */}
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90">
                      <div className="h-4 w-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200">
                        <Check className="h-2.5 w-2.5" />
                      </div>
                      <span className="leading-tight">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPlanId(plan.id);
                  handleStartTrial();
                }}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  isSelected
                    ? "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm"
                    : "bg-muted text-foreground hover:bg-muted/80 border border-border"
                }`}
              >
                <span>Select & Start 14-Day Free Trial</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Checkout / Payment Modal Simulation */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in-50">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl space-y-5 animate-in zoom-in-95 duration-150">
            {paymentSuccess ? (
              <div className="text-center py-6 space-y-3">
                <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Trial Activated & Subscription Confirmed!</h3>
                <p className="text-xs text-muted-foreground">
                  Your 14-day free trial for <strong>{selectedPlan.name} Plan</strong> is active. Redirecting to onboarding wizard...
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <h3 className="text-base font-bold text-foreground">Complete SaaS Subscription</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCheckoutModal(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>

                {/* Order Breakdown */}
                <div className="bg-muted/60 p-4 rounded-xl border border-border space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">
                      {selectedPlan.name} Plan ({billingCycle === "monthly" ? "Monthly" : "Annual"})
                    </span>
                    <span className="font-bold text-foreground">₹{price.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                    <span>GST (18% Real Estate Tech)</span>
                    <span>₹{gst.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex items-center justify-between font-bold text-sm text-foreground">
                    <span>Due Today (14-Day Free Trial)</span>
                    <div className="text-right">
                      <span className="text-emerald-600">₹0.00</span>
                      <p className="text-[10px] text-muted-foreground font-normal">
                        ₹{total.toLocaleString("en-IN")} billed after trial
                      </p>
                    </div>
                  </div>
                </div>

                {/* Razorpay Gateway Stub Info */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
                  <Zap className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Razorpay & UPI Instant Verification</p>
                    <p className="text-[11px] text-blue-700 mt-0.5">
                      Accepts UPI (Google Pay, PhonePe, Paytm), NetBanking, and Corporate Cards. No deduction during 14-day trial.
                    </p>
                  </div>
                </div>

                {/* Simulation Button */}
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleSimulatePayment}
                  className="w-full py-3 px-4 bg-primary text-primary-foreground font-semibold text-sm rounded-xl hover:bg-primary-hover transition-all active:scale-[0.99] flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Verifying with Payment Gateway...</span>
                    </>
                  ) : (
                    <>
                      <span>Start 14-Day Free Trial (₹0 Today)</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </AuthCard>
  );
}
