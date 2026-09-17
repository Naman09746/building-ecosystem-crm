import { NextRequest } from "next/server";
import crypto from "crypto";
import { apiSuccess, apiError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, getServiceRoleClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";
import { updateTenantSubscription, PlanId, BillingCycle, getPlanPrice } from "@repo/core/lib/server/subscription";

// POST /api/billing/sandbox-confirm - Verifies sandbox session token and confirms payment
export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  try {
    const body = await req.json();
    const { sessionId, planId, billingCycle, token } = body;

    if (!sessionId || !planId || !billingCycle || !token) {
      return apiError("Missing required confirmation parameters", 400, "BAD_REQUEST");
    }

    // Verify token cryptographic signature
    const secret = process.env.BILLING_WEBHOOK_SECRET;
    if (!secret) {
      return apiError("Billing sandbox unavailable: secret unconfigured", 503, "SERVICE_UNAVAILABLE");
    }

    const expectedHmac = crypto
      .createHmac("sha256", secret)
      .update(`${auth.orgId}:${planId}:${billingCycle}:${sessionId}`)
      .digest("hex");

    if (token !== expectedHmac) {
      return apiError("Invalid cryptographic sandbox token", 403, "FORBIDDEN");
    }

    const price = getPlanPrice(planId as PlanId, billingCycle as BillingCycle);
    const now = new Date();
    const periodEnd = new Date(now.getTime() + (billingCycle === "yearly" ? 365 : 30) * 86400000);

    // 1. Update subscription
    await updateTenantSubscription({
      orgId: auth.orgId,
      plan: planId as PlanId,
      status: "active",
      billingCycle: billingCycle as BillingCycle,
      provider: "simulated",
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      amount: price,
      currency: "INR",
      latestPaymentId: `pay_${sessionId.slice(0, 16)}`,
    });

    // 2. Insert Invoice
    const supabase = getServiceRoleClient();
    const invoiceNum = `INV-${now.getFullYear()}-${Date.now().toString().slice(-6)}`;

    if (supabase && isLiveSupabaseAvailable) {
      await supabase.from("billing_invoices").insert({
        org_id: auth.orgId,
        invoice_number: invoiceNum,
        provider: "simulated",
        provider_payment_id: `pay_${sessionId.slice(0, 16)}`,
        amount: price,
        tax_amount: Math.round(price * 0.18),
        currency: "INR",
        status: "paid",
        plan: planId,
        billing_cycle: billingCycle,
        period_start: now.toISOString(),
        period_end: periodEnd.toISOString(),
        paid_at: now.toISOString(),
      });
    }

    return apiSuccess(
      {
        message: "Sandbox payment successfully confirmed and subscription activated",
        planId,
        billingCycle,
        invoiceNumber: invoiceNum,
        sessionId,
      },
      200
    );
  } catch (err: any) {
    return apiError(err.message || "Failed to confirm sandbox session", 500, "SERVER_ERROR");
  }
}
