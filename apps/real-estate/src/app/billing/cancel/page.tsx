"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { XCircle, ArrowLeft, RefreshCw, HelpCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { Suspense } from "react";

function BillingCancelContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "growth";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border shadow-2xl bg-card text-center">
        <CardHeader className="pb-3 space-y-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <XCircle className="h-8 w-8" />
          </div>
          <CardTitle className="text-xl font-bold text-foreground">
            Checkout Incomplete
          </CardTitle>
          <CardDescription className="text-xs">
            No charges were made to your account. Your current subscription tier and data remain unchanged.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-xs">
          <p className="text-muted-foreground">
            If you encountered an issue with your payment method or need assistance selecting the right plan for your
            team, our support desk is ready to help.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => router.push("/billing")}
              className="w-full sm:w-1/2 h-9 text-xs font-semibold gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Plans</span>
            </Button>

            <Button
              onClick={() => router.push("/leads")}
              className="w-full sm:w-1/2 h-9 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <span>Go to Leads</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function BillingCancelPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" />}>
      <BillingCancelContent />
    </Suspense>
  );
}
