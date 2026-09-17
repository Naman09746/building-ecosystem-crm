"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CreditCard, ShieldCheck, CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { formatCurrencyINR } from "@repo/core/lib/utils";
import { toast } from "sonner";
import { Suspense } from "react";

function SandboxConfirmContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionId = searchParams.get("session_id");
  const orgId = searchParams.get("org_id");
  const plan = searchParams.get("plan") || "growth";
  const cycle = searchParams.get("cycle") || "monthly";
  const token = searchParams.get("token");

  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const planNameMap: Record<string, string> = {
    starter: "Solo Closer",
    growth: "Boutique Team",
    enterprise: "Scale Desk",
  };

  const amountMap: Record<string, { monthly: number; yearly: number }> = {
    starter: { monthly: 1999, yearly: 19188 },
    growth: { monthly: 4999, yearly: 47988 },
    enterprise: { monthly: 9999, yearly: 95988 },
  };

  const amount = amountMap[plan]?.[cycle === "yearly" ? "yearly" : "monthly"] || 4999;
  const taxAmount = Math.round(amount * 0.18);
  const totalAmount = amount + taxAmount;

  const handleConfirmPayment = async () => {
    if (!sessionId || !token) {
      setError("Missing cryptographic session signature");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/sandbox-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          planId: plan,
          billingCycle: cycle,
          token,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message || "Failed to confirm sandbox payment");
        return;
      }

      toast.success("Payment verified! Activating plan...");
      router.push(`/billing/success?session_id=${sessionId}&plan=${plan}&cycle=${cycle}`);
    } catch {
      setError("Network failure connecting to billing confirmation endpoint");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-primary/40 shadow-2xl bg-card">
        <CardHeader className="text-center pb-3 space-y-1">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
            <CreditCard className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-extrabold text-foreground">
            EcosystemRealty Secure Payment Gateway
          </CardTitle>
          <CardDescription className="text-xs">
            Test / Sandbox Environment • Cryptographically Signed Session
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-xs">
          {/* Plan & Pricing Breakdown */}
          <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-2 font-mono">
            <div className="flex justify-between text-foreground">
              <span className="font-sans text-muted-foreground">Selected Plan:</span>
              <strong>{planNameMap[plan] || plan} ({cycle})</strong>
            </div>
            <div className="flex justify-between text-foreground">
              <span className="font-sans text-muted-foreground">Base Amount:</span>
              <span>{formatCurrencyINR(amount)}</span>
            </div>
            <div className="flex justify-between text-foreground">
              <span className="font-sans text-muted-foreground">GST (18%):</span>
              <span>{formatCurrencyINR(taxAmount)}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between text-sm font-bold text-primary">
              <span className="font-sans">Total Payable:</span>
              <span>{formatCurrencyINR(totalAmount)}</span>
            </div>
          </div>

          {/* Simulated Card Details */}
          <div className="p-3 rounded-lg border border-border bg-card space-y-1.5 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Simulated Payment Verification</span>
            </div>
            <p>
              In sandbox testing mode, this will execute the real database subscription transition, create real
              `billing_invoices` audit records, and synchronize all lead/seat quota triggers.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive flex items-center gap-2 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <Button
              onClick={handleConfirmPayment}
              disabled={isProcessing}
              className="w-full h-10 text-xs font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing & Verifying Payment...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Authorize & Complete Payment</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => router.push(`/billing/cancel?plan=${plan}`)}
              disabled={isProcessing}
              className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel Payment & Return
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SandboxConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <SandboxConfirmContent />
    </Suspense>
  );
}
