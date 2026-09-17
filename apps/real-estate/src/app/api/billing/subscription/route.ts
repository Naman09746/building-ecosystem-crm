import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, getServiceRoleClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";
import { PLAN_CONFIGS, PlanId, DEFAULT_PLAN } from "@repo/core/lib/server/subscription";

// GET /api/billing/subscription - Returns caller's org subscription and real usage meters
export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const supabase = getServiceRoleClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    // Local / Dev Fallback
    const plan = DEFAULT_PLAN;
    const limits = PLAN_CONFIGS[plan];
    return apiSuccess({
      subscription: {
        id: "sub_local_dev",
        orgId: auth.orgId,
        plan,
        status: "trialing",
        billingCycle: "monthly",
        provider: "simulated",
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
        cancelAtPeriodEnd: false,
        currency: "INR",
        amount: limits.monthlyPriceINR,
      },
      customer: null,
      usage: {
        leadsUsed: 12,
        leadsLimit: limits.maxLeads,
        seatsUsed: 1,
        seatsLimit: limits.maxSeats,
        projectsCount: 2,
      },
      plans: PLAN_CONFIGS,
    });
  }

  try {
    // 1. Fetch Subscription record
    let { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("org_id", auth.orgId)
      .maybeSingle();

    // Auto-provision default subscription record if missing
    if (!subscription) {
      const { data: orgData } = await supabase
        .from("orgs")
        .select("plan, billing_cycle, subscription_status, is_active")
        .eq("id", auth.orgId)
        .single();

      const plan: PlanId = orgData?.plan || DEFAULT_PLAN;
      const limits = PLAN_CONFIGS[plan];

      const { data: newSub } = await supabase
        .from("subscriptions")
        .insert({
          org_id: auth.orgId,
          plan,
          status: orgData?.subscription_status || "trialing",
          billing_cycle: orgData?.billing_cycle || "monthly",
          provider: "simulated",
          amount: limits.monthlyPriceINR,
          currency: "INR",
        })
        .select()
        .single();

      subscription = newSub;
    }

    // 2. Fetch Customer / GST profile
    const { data: customer } = await supabase
      .from("billing_customers")
      .select("*")
      .eq("org_id", auth.orgId)
      .maybeSingle();

    // 3. Fetch Real Usage Counts
    const { count: leadsCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("org_id", auth.orgId);

    const { count: seatsCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("org_id", auth.orgId);

    const { count: projectsCount } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("org_id", auth.orgId);

    const planId: PlanId = subscription?.plan || DEFAULT_PLAN;
    const planLimits = PLAN_CONFIGS[planId];

    return apiSuccess({
      subscription: {
        id: subscription.id,
        orgId: subscription.org_id,
        plan: subscription.plan,
        status: subscription.status,
        billingCycle: subscription.billing_cycle,
        provider: subscription.provider,
        providerCustomerId: subscription.provider_customer_id,
        providerSubscriptionId: subscription.provider_subscription_id,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at,
        cancellationReason: subscription.cancellation_reason,
        gracePeriodUntil: subscription.grace_period_until,
        currency: subscription.currency,
        amount: Number(subscription.amount),
        latestPaymentId: subscription.latest_payment_id,
        latestInvoiceId: subscription.latest_invoice_id,
        createdAt: subscription.created_at,
        updatedAt: subscription.updated_at,
      },
      customer: customer
        ? {
            id: customer.id,
            orgId: customer.org_id,
            provider: customer.provider,
            providerCustomerId: customer.provider_customer_id,
            billingName: customer.billing_name,
            billingEmail: customer.billing_email,
            billingPhone: customer.billing_phone,
            billingAddress: customer.billing_address,
            gstin: customer.gstin,
          }
        : null,
      usage: {
        leadsUsed: leadsCount || 0,
        leadsLimit: planLimits.maxLeads,
        seatsUsed: seatsCount || 1,
        seatsLimit: planLimits.maxSeats,
        projectsCount: projectsCount || 0,
      },
      plans: PLAN_CONFIGS,
    });
  } catch (err: any) {
    return apiError("Failed to fetch subscription state", 500, "SERVER_ERROR", err.message);
  }
}
