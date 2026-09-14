import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/server/api-security";
import { verifyProviderWebhookSignature } from "@/lib/server/billing-provider";
import {
  updateTenantSubscription,
  resolvePlan,
  PlanId,
  BillingCycle,
  SubscriptionStatus,
} from "@/lib/server/subscription";
import { createNotification } from "@/lib/server/notifications";
import { getServiceRoleClient, isLiveSupabaseAvailable } from "@/lib/server/supabase-server";
import { MANAGER_ROLES } from "@/lib/server/rbac";

const BILLING_WEBHOOK_SECRET =
  process.env.BILLING_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET || "";

const MAX_PAYLOAD_BYTES = 128 * 1024;

export async function POST(req: NextRequest) {
  // FAIL CLOSED
  if (!BILLING_WEBHOOK_SECRET) {
    console.error("[BILLING_CONFIG_ERROR] BILLING_WEBHOOK_SECRET is not set");
    return apiError(
      "Billing webhook signature verification is required but not configured",
      503,
      "SERVICE_UNAVAILABLE"
    );
  }

  const rawBody = await req.text();
  if (rawBody.length > MAX_PAYLOAD_BYTES) {
    return apiError("Payload too large", 413, "PAYLOAD_TOO_LARGE");
  }

  const signatureHeader =
    req.headers.get("stripe-signature") || req.headers.get("x-razorpay-signature");

  if (!verifyProviderWebhookSignature(rawBody, signatureHeader, BILLING_WEBHOOK_SECRET)) {
    console.warn("[BILLING_SECURITY_ALERT] Invalid HMAC signature detected!");
    return apiError("Invalid cryptographic billing webhook signature", 401, "UNAUTHORIZED_WEBHOOK");
  }

  let jsonBody: any;
  try {
    jsonBody = JSON.parse(rawBody);
  } catch {
    return apiSuccess({ status: "ignored_malformed_payload" }, 200);
  }

  const eventId: string = jsonBody.id || jsonBody.event_id || `evt_${Date.now()}`;
  const eventType: string = jsonBody.type || jsonBody.event || "unknown";

  const supabase = getServiceRoleClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Backend database is not configured", 503, "SERVICE_UNAVAILABLE");
  }

  // IDEMPOTENCY FIRST: the unique index on webhook_events.idempotency_key guards against replays
  const idempotencyKey = `billing_${eventId}`;
  const { error: insertEventError } = await supabase.from("webhook_events").insert({
    provider: "billing",
    event_type: eventType,
    idempotency_key: idempotencyKey,
    payload: jsonBody,
    status: "pending",
  });

  if (insertEventError) {
    return apiSuccess({ status: "duplicate_dropped", eventId }, 200);
  }

  try {
    // ------------------------------------------------------------------------
    // 1. STRIPE EVENT PROCESSING
    // ------------------------------------------------------------------------
    if (jsonBody.object === "event" || jsonBody.type?.includes(".")) {
      const obj = jsonBody.data?.object || {};
      const orgId: string | undefined =
        obj.client_reference_id ||
        obj.metadata?.org_id ||
        obj.subscription_details?.metadata?.org_id;

      if (orgId) {
        const plan: PlanId = resolvePlan(obj.metadata?.plan_id);
        const cycle: BillingCycle = (obj.metadata?.billing_cycle as BillingCycle) || "monthly";

        // A. Checkout Completed / Initial Activation
        if (eventType === "checkout.session.completed") {
          const customerId = obj.customer;
          const subscriptionId = obj.subscription;
          const paymentIntentId = obj.payment_intent;
          const amountTotal = (obj.amount_total || 0) / 100;

          // Upsert customer
          if (customerId) {
            await supabase.from("billing_customers").upsert(
              {
                org_id: orgId,
                provider: "stripe",
                provider_customer_id: customerId,
                billing_email: obj.customer_details?.email,
                billing_name: obj.customer_details?.name,
                billing_address: obj.customer_details?.address || {},
              },
              { onConflict: "org_id,provider" }
            );
          }

          // Update subscription
          await updateTenantSubscription({
            orgId,
            plan,
            status: "active",
            billingCycle: cycle,
            provider: "stripe",
            providerCustomerId: customerId,
            providerSubscriptionId: subscriptionId,
            latestPaymentId: paymentIntentId,
            amount: amountTotal,
            currency: "INR",
          });

          // Record paid invoice
          const invoiceNum = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
          await supabase.from("billing_invoices").insert({
            org_id: orgId,
            invoice_number: invoiceNum,
            provider: "stripe",
            provider_payment_id: paymentIntentId,
            amount: amountTotal,
            tax_amount: Math.round(amountTotal * 0.18),
            currency: "INR",
            status: "paid",
            plan,
            billing_cycle: cycle,
            period_start: new Date().toISOString(),
            period_end: new Date(Date.now() + (cycle === "yearly" ? 365 : 30) * 86400000).toISOString(),
            billing_name: obj.customer_details?.name,
            billing_email: obj.customer_details?.email,
            paid_at: new Date().toISOString(),
          });

          // Emit In-App Billing Notification to Owners
          const { data: owners } = await supabase.from("profiles").select("user_id").eq("org_id", orgId).in("role", [...MANAGER_ROLES]);
          for (const o of owners || []) {
            await createNotification({
              orgId,
              userId: o.user_id,
              title: `Subscription Activated: ${plan.toUpperCase()}`,
              message: `Your organization has successfully upgraded to the ${plan} (${cycle}) subscription plan.`,
              type: "billing",
              priority: "high",
              entityType: "billing",
              link: "/billing",
              dedupKey: `notif_bill_sub_${orgId}_${Date.now()}_${o.user_id}`,
            });
          }
        }

        // B. Recurring Invoice Payment Succeeded
        else if (eventType === "invoice.payment_succeeded") {
          const subId = obj.subscription;
          const amountPaid = (obj.amount_paid || 0) / 100;
          const periodStart = obj.period_start ? new Date(obj.period_start * 1000).toISOString() : new Date().toISOString();
          const periodEnd = obj.period_end ? new Date(obj.period_end * 1000).toISOString() : new Date().toISOString();

          await updateTenantSubscription({
            orgId,
            plan,
            status: "active",
            billingCycle: cycle,
            provider: "stripe",
            providerSubscriptionId: subId,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
            latestPaymentId: obj.payment_intent,
            latestInvoiceId: obj.id,
            amount: amountPaid,
          });

          const invoiceNum = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
          await supabase.from("billing_invoices").insert({
            org_id: orgId,
            invoice_number: invoiceNum,
            provider: "stripe",
            provider_payment_id: obj.payment_intent,
            provider_invoice_id: obj.id,
            amount: amountPaid,
            tax_amount: Math.round(amountPaid * 0.18),
            currency: "INR",
            status: "paid",
            plan,
            billing_cycle: cycle,
            period_start: periodStart,
            period_end: periodEnd,
            paid_at: new Date().toISOString(),
            receipt_url: obj.hosted_invoice_url,
          });

          const { data: owners } = await supabase.from("profiles").select("user_id").eq("org_id", orgId).in("role", [...MANAGER_ROLES]);
          for (const o of owners || []) {
            await createNotification({
              orgId,
              userId: o.user_id,
              title: "Payment Received",
              message: `Recurring subscription payment of ₹${amountPaid.toLocaleString("en-IN")} was processed successfully.`,
              type: "billing",
              priority: "normal",
              entityType: "billing",
              link: "/billing",
              dedupKey: `notif_bill_pay_${obj.id || Date.now()}_${o.user_id}`,
            });
          }
        }

        // C. Payment Failed / Past Due
        else if (eventType === "invoice.payment_failed") {
          // Allow 7 days grace period before marking unpaid
          const graceEnd = new Date(Date.now() + 7 * 86400000).toISOString();
          await updateTenantSubscription({
            orgId,
            plan,
            status: "past_due",
            provider: "stripe",
            gracePeriodUntil: graceEnd,
          });

          const { data: owners } = await supabase.from("profiles").select("user_id").eq("org_id", orgId).in("role", [...MANAGER_ROLES]);
          for (const o of owners || []) {
            await createNotification({
              orgId,
              userId: o.user_id,
              title: "Payment Failed: Grace Period Active",
              message: "A scheduled subscription renewal charge failed. Please update your payment method within 7 days.",
              type: "billing",
              priority: "urgent",
              entityType: "billing",
              link: "/billing",
              dedupKey: `notif_bill_fail_${orgId}_${new Date().toISOString().slice(0, 10)}_${o.user_id}`,
            });
          }
        }

        // D. Subscription Canceled / Expired
        else if (eventType === "customer.subscription.deleted") {
          await updateTenantSubscription({
            orgId,
            plan: "starter",
            status: "canceled",
            provider: "stripe",
            canceledAt: new Date().toISOString(),
            cancellationReason: "Canceled by provider",
          });

          const { data: owners } = await supabase.from("profiles").select("user_id").eq("org_id", orgId).in("role", [...MANAGER_ROLES]);
          for (const o of owners || []) {
            await createNotification({
              orgId,
              userId: o.user_id,
              title: "Subscription Cancelled",
              message: "Your organization subscription has been downgraded to the Starter plan.",
              type: "billing",
              priority: "high",
              entityType: "billing",
              link: "/billing",
              dedupKey: `notif_bill_cancel_${orgId}_${Date.now()}_${o.user_id}`,
            });
          }
        }

        // E. Charge Refunded
        else if (eventType === "charge.refunded") {
          const charge = obj;
          const refundAmount = (charge.amount_refunded || 0) / 100;
          await supabase
            .from("billing_invoices")
            .update({ status: charge.refunded ? "refunded" : "partially_refunded" })
            .eq("provider_payment_id", charge.payment_intent);
        }
      }
    }

    // ------------------------------------------------------------------------
    // 2. RAZORPAY EVENT PROCESSING
    // ------------------------------------------------------------------------
    else if (jsonBody.entity === "event" || jsonBody.event?.startsWith("payment.") || jsonBody.event?.startsWith("subscription.")) {
      const payload = jsonBody.payload || {};
      const payment = payload.payment?.entity;
      const sub = payload.subscription?.entity;
      const orgId: string | undefined = payment?.notes?.org_id || sub?.notes?.org_id;

      if (orgId) {
        const plan: PlanId = resolvePlan(payment?.notes?.plan_id || sub?.notes?.plan_id);
        const cycle: BillingCycle = (payment?.notes?.billing_cycle || sub?.notes?.billing_cycle || "monthly") as BillingCycle;

        if (eventType === "payment.captured" || eventType === "subscription.activated" || eventType === "subscription.charged") {
          const amountINR = (payment?.amount || sub?.current_invoice?.amount || 0) / 100;
          await updateTenantSubscription({
            orgId,
            plan,
            status: "active",
            billingCycle: cycle,
            provider: "razorpay",
            providerSubscriptionId: sub?.id,
            latestPaymentId: payment?.id,
            amount: amountINR,
          });

          const invoiceNum = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
          await supabase.from("billing_invoices").insert({
            org_id: orgId,
            invoice_number: invoiceNum,
            provider: "razorpay",
            provider_payment_id: payment?.id,
            provider_invoice_id: sub?.id,
            amount: amountINR,
            tax_amount: Math.round(amountINR * 0.18),
            currency: "INR",
            status: "paid",
            plan,
            billing_cycle: cycle,
            period_start: new Date().toISOString(),
            period_end: new Date(Date.now() + (cycle === "yearly" ? 365 : 30) * 86400000).toISOString(),
            billing_name: payment?.notes?.name || payment?.email,
            billing_email: payment?.email,
            paid_at: new Date().toISOString(),
          });
        } else if (eventType === "subscription.pending" || eventType === "payment.failed") {
          const graceEnd = new Date(Date.now() + 7 * 86400000).toISOString();
          await updateTenantSubscription({
            orgId,
            plan,
            status: "past_due",
            provider: "razorpay",
            gracePeriodUntil: graceEnd,
          });
        } else if (eventType === "subscription.cancelled" || eventType === "subscription.halted") {
          await updateTenantSubscription({
            orgId,
            plan: "starter",
            status: "canceled",
            provider: "razorpay",
            canceledAt: new Date().toISOString(),
          });
        }
      }
    }

    // Mark webhook event processed
    await supabase
      .from("webhook_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("idempotency_key", idempotencyKey);

    return apiSuccess({ status: "processed", eventId }, 200);
  } catch (err: any) {
    console.error("[BILLING_WEBHOOK_PROCESSING_ERROR]", err);
    await supabase
      .from("webhook_events")
      .update({ status: "failed", error_message: err.message || "unexpected processing error" })
      .eq("idempotency_key", idempotencyKey);

    return apiSuccess({ status: "error_acknowledged" }, 200);
  }
}
