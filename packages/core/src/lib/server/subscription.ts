import { getServiceRoleClient, isLiveSupabaseAvailable } from "./supabase-server";
import { PlanId, BillingCycle, SubscriptionStatus, BillingProvider } from "../../types/billing";

export type { PlanId, BillingCycle, SubscriptionStatus, BillingProvider };

export interface PlanLimits {
  name: string;
  badge?: string;
  maxSeats: number;
  maxLeads: number;
  maxProjects: number;
  aiAgentsEnabled: boolean;
  resurrectionEngineEnabled: boolean;
  multiRegionEnabled: boolean;
  monthlyPriceINR: number;
  annualMonthlyPriceINR: number;
  annualTotalPriceINR: number;
}

export const PLAN_CONFIGS: Record<PlanId, PlanLimits> = {
  starter: {
    name: "Solo Closer",
    badge: "Solo Broker",
    maxSeats: 1,
    maxLeads: 300,
    maxProjects: 1,
    aiAgentsEnabled: false,
    resurrectionEngineEnabled: false,
    multiRegionEnabled: false,
    monthlyPriceINR: 1999,
    annualMonthlyPriceINR: 1599,
    annualTotalPriceINR: 19188,
  },
  growth: {
    name: "Boutique Team",
    badge: "Most Popular",
    maxSeats: 4,
    maxLeads: 2500,
    maxProjects: 5,
    aiAgentsEnabled: true,
    resurrectionEngineEnabled: true,
    multiRegionEnabled: false,
    monthlyPriceINR: 4999,
    annualMonthlyPriceINR: 3999,
    annualTotalPriceINR: 47988,
  },
  enterprise: {
    name: "Scale Desk",
    badge: "Large Agency",
    maxSeats: 25,
    maxLeads: 50000,
    maxProjects: 100,
    aiAgentsEnabled: true,
    resurrectionEngineEnabled: true,
    multiRegionEnabled: true,
    monthlyPriceINR: 9999,
    annualMonthlyPriceINR: 7999,
    annualTotalPriceINR: 95988,
  },
};

export const DEFAULT_PLAN: PlanId = "growth";

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && value in PLAN_CONFIGS;
}

export function resolvePlan(plan: unknown): PlanId {
  return isPlanId(plan) ? plan : "starter";
}

export function getPlanPrice(plan: PlanId, cycle: BillingCycle): number {
  const config = PLAN_CONFIGS[plan];
  return cycle === "yearly" ? config.annualTotalPriceINR : config.monthlyPriceINR;
}

export function isSubscriptionActive(
  status: SubscriptionStatus,
  gracePeriodUntil?: string | null
): boolean {
  if (status === "active" || status === "trialing") return true;
  if (status === "past_due" && gracePeriodUntil) {
    return new Date(gracePeriodUntil).getTime() > Date.now();
  }
  return false;
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  currentCount: number;
  maxLimit: number;
  plan: PlanId;
}

export function checkLeadQuota(currentLeadCount: number, plan: PlanId): QuotaCheckResult {
  const config = PLAN_CONFIGS[plan];

  if (currentLeadCount >= config.maxLeads) {
    return {
      allowed: false,
      reason: `Plan lead limit reached (${currentLeadCount}/${config.maxLeads}). Please upgrade to a higher tier.`,
      currentCount: currentLeadCount,
      maxLimit: config.maxLeads,
      plan,
    };
  }

  return {
    allowed: true,
    currentCount: currentLeadCount,
    maxLimit: config.maxLeads,
    plan,
  };
}

export type GatedFeature = "ai_agents" | "resurrection" | "multi_region";

export function checkFeatureAccess(feature: GatedFeature, plan: PlanId): boolean {
  const config = PLAN_CONFIGS[plan];
  if (feature === "ai_agents") return config.aiAgentsEnabled;
  if (feature === "resurrection") return config.resurrectionEngineEnabled;
  if (feature === "multi_region") return config.multiRegionEnabled;
  return false;
}

export interface UpdateSubscriptionParams {
  orgId: string;
  plan: PlanId;
  status: SubscriptionStatus;
  billingCycle?: BillingCycle;
  provider: BillingProvider;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  providerPlanId?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  trialStart?: string;
  trialEnd?: string;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: string;
  cancellationReason?: string;
  cancellationRequestedBy?: string;
  gracePeriodUntil?: string;
  amount?: number;
  currency?: string;
  latestPaymentId?: string;
  latestInvoiceId?: string;
}

/**
 * Upserts authoritative subscription state in public.subscriptions.
 * The PostgreSQL trigger trg_sync_org_subscription automatically keeps
 * public.orgs synchronized with plan, status, and quotas.
 */
export async function updateTenantSubscription(
  params: UpdateSubscriptionParams
): Promise<{ ok: boolean; simulated: boolean; data?: any; error?: string }> {
  if (!isLiveSupabaseAvailable) {
    console.warn("[SUBSCRIPTION] Simulated mode: subscription update not written to DB");
    return { ok: true, simulated: true };
  }

  const supabase = getServiceRoleClient();
  if (!supabase) {
    return { ok: false, simulated: false, error: "Database client unavailable" };
  }

  const amount = params.amount ?? getPlanPrice(params.plan, params.billingCycle || "monthly");
  const currency = params.currency ?? "INR";
  const now = new Date();
  const periodStart = params.currentPeriodStart ?? now.toISOString();
  const periodEnd =
    params.currentPeriodEnd ??
    new Date(now.getTime() + (params.billingCycle === "yearly" ? 365 : 30) * 86400000).toISOString();

  const record: Record<string, any> = {
    org_id: params.orgId,
    plan: params.plan,
    status: params.status,
    billing_cycle: params.billingCycle || "monthly",
    provider: params.provider,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    amount,
    currency,
    updated_at: now.toISOString(),
  };

  if (params.providerCustomerId !== undefined) record.provider_customer_id = params.providerCustomerId;
  if (params.providerSubscriptionId !== undefined) record.provider_subscription_id = params.providerSubscriptionId;
  if (params.providerPlanId !== undefined) record.provider_plan_id = params.providerPlanId;
  if (params.trialStart !== undefined) record.trial_start = params.trialStart;
  if (params.trialEnd !== undefined) record.trial_end = params.trialEnd;
  if (params.cancelAtPeriodEnd !== undefined) record.cancel_at_period_end = params.cancelAtPeriodEnd;
  if (params.canceledAt !== undefined) record.canceled_at = params.canceledAt;
  if (params.cancellationReason !== undefined) record.cancellation_reason = params.cancellationReason;
  if (params.cancellationRequestedBy !== undefined) record.cancellation_requested_by = params.cancellationRequestedBy;
  if (params.gracePeriodUntil !== undefined) record.grace_period_until = params.gracePeriodUntil;
  if (params.latestPaymentId !== undefined) record.latest_payment_id = params.latestPaymentId;
  if (params.latestInvoiceId !== undefined) record.latest_invoice_id = params.latestInvoiceId;

  const { data, error } = await supabase
    .from("subscriptions")
    .upsert(record, { onConflict: "org_id" })
    .select()
    .single();

  if (error) {
    console.error("[SUBSCRIPTION_UPDATE_ERROR]", error.message);
    return { ok: false, simulated: false, error: error.message };
  }

  return { ok: true, simulated: false, data };
}
