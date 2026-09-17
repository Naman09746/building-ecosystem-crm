import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, MANAGER_ROLES, getServiceRoleClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";
import { reactivateSubscriptionSchema } from "@repo/core/lib/server/validations";
import { reactivateProviderSubscription } from "@repo/core/lib/server/billing-provider";
import { updateTenantSubscription } from "@repo/core/lib/server/subscription";

// POST /api/billing/reactivate - Resume / reactivate a subscription with scheduled cancellation
export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }
  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Only managers and owners can reactivate subscriptions", 403, "FORBIDDEN");
  }

  const supabase = getServiceRoleClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiSuccess({ message: "Subscription reactivated (Simulated Mode)" }, 200);
  }

  try {
    const parsed = reactivateSubscriptionSchema.parse(await req.json().catch(() => ({})));

    // Fetch subscription
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("org_id", auth.orgId)
      .single();

    if (!sub) {
      return apiError("No subscription record found", 404, "NOT_FOUND");
    }

    if (!sub.cancel_at_period_end && sub.status === "active") {
      return apiError("Subscription is already active and not scheduled for cancellation", 400, "ALREADY_ACTIVE");
    }

    // Call Provider Reactivation
    if (sub.provider_subscription_id) {
      const provRes = await reactivateProviderSubscription(
        sub.provider,
        sub.provider_subscription_id
      );
      if (!provRes.ok) {
        console.warn("[PROVIDER_REACTIVATE_WARNING]", provRes.error);
      }
    }

    // Update DB record
    await updateTenantSubscription({
      orgId: auth.orgId,
      plan: sub.plan,
      status: "active",
      billingCycle: sub.billing_cycle,
      provider: sub.provider,
      cancelAtPeriodEnd: false,
      canceledAt: undefined,
      cancellationReason: undefined,
    });

    return apiSuccess(
      {
        message: "Subscription successfully reactivated! Automatic renewal has been restored.",
        status: "active",
        plan: sub.plan,
      },
      200
    );
  } catch (err: any) {
    return apiError(err.message || "Failed to reactivate subscription", 500, "SERVER_ERROR");
  }
}
