import crypto from "crypto";
import { PlanId, BillingCycle, BillingProvider } from "../../types/billing";
import { getPlanPrice, PLAN_CONFIGS } from "./subscription";

export interface CheckoutSessionParams {
  orgId: string;
  orgName: string;
  userId: string;
  userEmail: string;
  planId: PlanId;
  billingCycle: BillingCycle;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutSessionResult {
  provider: BillingProvider;
  sessionId: string;
  checkoutUrl?: string;
  amount: number;
  currency: string;
  planId: PlanId;
  billingCycle: BillingCycle;
  simulated?: boolean;
  razorpayOptions?: {
    keyId: string;
    orderId?: string;
    subscriptionId?: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    prefill: {
      email: string;
      name: string;
    };
  };
}

export interface RefundResult {
  ok: boolean;
  refundId?: string;
  amount: number;
  status: "succeeded" | "pending" | "failed";
  error?: string;
}

export function getActiveBillingProvider(): BillingProvider {
  if (process.env.STRIPE_SECRET_KEY) return "stripe";
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) return "razorpay";
  return "simulated";
}

/**
 * Creates a checkout session across Stripe, Razorpay, or Sandbox
 */
export async function createProviderCheckoutSession(
  params: CheckoutSessionParams
): Promise<CheckoutSessionResult> {
  const provider = getActiveBillingProvider();
  const priceINR = getPlanPrice(params.planId, params.billingCycle);
  const planName = PLAN_CONFIGS[params.planId]?.name || "Subscription";

  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const defaultSuccessUrl = `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}&plan=${params.planId}&cycle=${params.billingCycle}`;
  const defaultCancelUrl = `${origin}/billing/cancel?plan=${params.planId}`;

  const successUrl = params.successUrl || defaultSuccessUrl;
  const cancelUrl = params.cancelUrl || defaultCancelUrl;

  // 1. STRIPE PROVIDER
  if (provider === "stripe") {
    const stripeKey = process.env.STRIPE_SECRET_KEY!;
    const body = new URLSearchParams();
    body.append("payment_method_types[0]", "card");
    body.append("mode", "subscription");
    body.append("client_reference_id", params.orgId);
    body.append("customer_email", params.userEmail);
    body.append("metadata[org_id]", params.orgId);
    body.append("metadata[plan_id]", params.planId);
    body.append("metadata[billing_cycle]", params.billingCycle);
    body.append("metadata[user_id]", params.userId);
    body.append("success_url", successUrl.replace("{CHECKOUT_SESSION_ID}", "{CHECKOUT_SESSION_ID}"));
    body.append("cancel_url", cancelUrl);

    // Line item with server-controlled pricing
    body.append("line_items[0][price_data][currency]", "inr");
    body.append(
      "line_items[0][price_data][product_data][name]",
      `EcosystemRealty ${planName} Plan (${params.billingCycle === "yearly" ? "Annual" : "Monthly"})`
    );
    body.append(
      "line_items[0][price_data][recurring][interval]",
      params.billingCycle === "yearly" ? "year" : "month"
    );
    body.append("line_items[0][price_data][unit_amount]", String(priceINR * 100)); // paise
    body.append("line_items[0][quantity]", "1");

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || "Failed to create Stripe checkout session");
    }

    return {
      provider: "stripe",
      sessionId: data.id,
      checkoutUrl: data.url,
      amount: priceINR,
      currency: "INR",
      planId: params.planId,
      billingCycle: params.billingCycle,
    };
  }

  // 2. RAZORPAY PROVIDER
  if (provider === "razorpay") {
    const keyId = process.env.RAZORPAY_KEY_ID!;
    const keySecret = process.env.RAZORPAY_KEY_SECRET!;
    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;

    // Create Order for checkout
    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: priceINR * 100, // paise
        currency: "INR",
        receipt: `rcpt_${params.orgId.slice(0, 8)}_${Date.now()}`,
        notes: {
          org_id: params.orgId,
          plan_id: params.planId,
          billing_cycle: params.billingCycle,
          user_id: params.userId,
        },
      }),
    });

    const orderData = await orderRes.json();
    if (!orderRes.ok || orderData.error) {
      throw new Error(orderData.error?.description || "Failed to create Razorpay order");
    }

    return {
      provider: "razorpay",
      sessionId: orderData.id,
      amount: priceINR,
      currency: "INR",
      planId: params.planId,
      billingCycle: params.billingCycle,
      razorpayOptions: {
        keyId,
        orderId: orderData.id,
        amount: priceINR * 100,
        currency: "INR",
        name: `EcosystemRealty - ${params.orgName}`,
        description: `${planName} Subscription (${params.billingCycle})`,
        prefill: {
          email: params.userEmail,
          name: params.orgName,
        },
      },
    };
  }

  // 3. SANDBOX / SIMULATED PROVIDER (Guarantees 100% full lifecycle testing)
  const billingSecret = process.env.BILLING_WEBHOOK_SECRET;
  if (!billingSecret) {
    throw new Error("Billing sandbox unavailable: BILLING_WEBHOOK_SECRET is not configured");
  }

  const sandboxSessionId = `sim_cs_${crypto.randomBytes(16).toString("hex")}`;
  const hmac = crypto
    .createHmac("sha256", billingSecret)
    .update(`${params.orgId}:${params.planId}:${params.billingCycle}:${sandboxSessionId}`)
    .digest("hex");

  const checkoutUrl = `${origin}/billing/sandbox-confirm?session_id=${sandboxSessionId}&org_id=${params.orgId}&plan=${params.planId}&cycle=${params.billingCycle}&token=${hmac}`;

  return {
    provider: "simulated",
    sessionId: sandboxSessionId,
    checkoutUrl,
    amount: priceINR,
    currency: "INR",
    planId: params.planId,
    billingCycle: params.billingCycle,
    simulated: true,
  };
}

/**
 * Cancels a subscription at provider level
 */
export async function cancelProviderSubscription(
  provider: BillingProvider,
  providerSubscriptionId: string,
  cancelAtPeriodEnd: boolean
): Promise<{ ok: boolean; error?: string }> {
  if (provider === "simulated" || provider === "manual") {
    return { ok: true };
  }

  if (provider === "stripe") {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return { ok: false, error: "Stripe key not configured" };

    const body = new URLSearchParams();
    if (cancelAtPeriodEnd) {
      body.append("cancel_at_period_end", "true");
    }

    const endpoint = cancelAtPeriodEnd
      ? `https://api.stripe.com/v1/subscriptions/${providerSubscriptionId}`
      : `https://api.stripe.com/v1/subscriptions/${providerSubscriptionId}`;

    const res = await fetch(endpoint, {
      method: cancelAtPeriodEnd ? "POST" : "DELETE",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: cancelAtPeriodEnd ? body.toString() : undefined,
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return { ok: false, error: data.error?.message || "Stripe cancellation failed" };
    }
    return { ok: true };
  }

  if (provider === "razorpay") {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return { ok: false, error: "Razorpay keys not configured" };

    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
    const res = await fetch(
      `https://api.razorpay.com/v1/subscriptions/${providerSubscriptionId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cancel_at_cycle_end: cancelAtPeriodEnd ? 1 : 0,
        }),
      }
    );

    const data = await res.json();
    if (!res.ok || data.error) {
      return { ok: false, error: data.error?.description || "Razorpay cancellation failed" };
    }
    return { ok: true };
  }

  return { ok: true };
}

/**
 * Reactivates a subscription that was scheduled for period-end cancellation
 */
export async function reactivateProviderSubscription(
  provider: BillingProvider,
  providerSubscriptionId: string
): Promise<{ ok: boolean; error?: string }> {
  if (provider === "simulated" || provider === "manual") {
    return { ok: true };
  }

  if (provider === "stripe") {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return { ok: false, error: "Stripe key not configured" };

    const body = new URLSearchParams();
    body.append("cancel_at_period_end", "false");

    const res = await fetch(`https://api.stripe.com/v1/subscriptions/${providerSubscriptionId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return { ok: false, error: data.error?.message || "Stripe reactivation failed" };
    }
    return { ok: true };
  }

  return { ok: true };
}

/**
 * Executes a full or partial refund
 */
export async function createProviderRefund(
  provider: BillingProvider,
  paymentId: string,
  amountINR: number,
  reason?: string
): Promise<RefundResult> {
  if (provider === "simulated" || provider === "manual") {
    return {
      ok: true,
      refundId: `sim_rf_${crypto.randomBytes(12).toString("hex")}`,
      amount: amountINR,
      status: "succeeded",
    };
  }

  if (provider === "stripe") {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return { ok: false, amount: amountINR, status: "failed", error: "Stripe not configured" };

    const body = new URLSearchParams();
    body.append("payment_intent", paymentId);
    body.append("amount", String(Math.round(amountINR * 100))); // paise
    if (reason) body.append("reason", "requested_by_customer");

    const res = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return {
        ok: false,
        amount: amountINR,
        status: "failed",
        error: data.error?.message || "Stripe refund failed",
      };
    }

    return {
      ok: true,
      refundId: data.id,
      amount: amountINR,
      status: data.status === "succeeded" ? "succeeded" : "pending",
    };
  }

  if (provider === "razorpay") {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return { ok: false, amount: amountINR, status: "failed", error: "Razorpay keys missing" };
    }

    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
    const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amountINR * 100), // paise
        notes: { reason: reason || "Customer requested refund" },
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return {
        ok: false,
        amount: amountINR,
        status: "failed",
        error: data.error?.description || "Razorpay refund failed",
      };
    }

    return {
      ok: true,
      refundId: data.id,
      amount: amountINR,
      status: "succeeded",
    };
  }

  return {
    ok: true,
    refundId: `rf_${Date.now()}`,
    amount: amountINR,
    status: "succeeded",
  };
}

/**
 * Validates cryptographic webhook signatures for Stripe and Razorpay
 */
export function verifyProviderWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;

  // Stripe signature format: t=timestamp,v1=signature
  if (signatureHeader.includes("t=") && signatureHeader.includes("v1=")) {
    try {
      const parts = signatureHeader.split(",");
      const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2);
      const signature = parts.find((p) => p.startsWith("v1="))?.slice(3);

      if (!timestamp || !signature) return false;

      const payload = `${timestamp}.${rawBody}`;
      const expectedSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

      const sigBuf = Buffer.from(signature, "hex");
      const expBuf = Buffer.from(expectedSignature, "hex");
      if (sigBuf.length !== expBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, expBuf);
    } catch {
      return false;
    }
  }

  // Standard SHA-256 HMAC (Razorpay / generic)
  try {
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    const sigBuf = Buffer.from(signatureHeader, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}
