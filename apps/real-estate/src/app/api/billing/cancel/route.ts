import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, MANAGER_ROLES, getServiceRoleClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";
import { cancelSubscriptionSchema } from "@repo/core/lib/server/validations";
import { cancelProviderSubscription } from "@repo/core/lib/server/billing-provider";
import { updateTenantSubscription } from "@repo/core/lib/server/subscription";

// POST /api/billing/cancel - Cancel caller's organization subscription
export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }
  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Only managers and owners can cancel subscriptions", 403, "FORBIDDEN");
  }

  const supabase = getServiceRoleClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiSuccess({ message: "Subscription cancellation scheduled (Simulated Mode)" }, 200);
  }

  try {
    const parsed = cancelSubscriptionSchema.parse(await req.json());

    // Fetch current subscription
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("org_id", auth.orgId)
      .single();

    if (!sub) {
      return apiError("No active subscription found to cancel", 404, "NOT_FOUND");
    }

    if (sub.status === "canceled") {
      return apiError("Subscription is already canceled", 400, "ALREADY_CANCELED");
    }

    // Call Provider Cancellation
    if (sub.providerSubscriptionId) {
      const provRes = await cancelProviderSubscription(
        sub.provider,
        sub.providerSubscriptionId,
        parsed.cancelAtPeriodEnd
      );
      if (!provRes.ok) {
        console.warn("[PROVIDER_CANCEL_WARNING]", provRes.error);
      }
    }

    const now = new Date().toISOString();

    if (parsed.cancelAtPeriodEnd) {
      // Schedule cancellation at current period end
      await updateTenantSubscription({
        orgId: auth.orgId,
        plan: sub.plan,
        status: sub.status,
        billingCycle: sub.billing_cycle,
        provider: sub.provider,
        cancelAtPeriodEnd: true,
        canceledAt: now,
        cancellationReason: parsed.reason || "Customer requested cancellation at period end",
        cancellationRequestedBy: auth.userId,
      });

      return apiSuccess(
        {
          message: "Subscription scheduled for cancellation at the end of the current billing cycle",
          cancelAtPeriodEnd: true,
          effectiveDate: sub.current_period_end,
        },
        200
      );
    } else {
      // Immediate cancellation
      await updateTenantSubscription({
        orgId: auth.orgId,
        plan: "starter",
        status: "canceled",
        billingCycle: sub.billing_cycle,
        provider: sub.provider,
        cancelAtPeriodEnd: false,
        canceledAt: now,
        cancellationReason: parsed.reason || "Immediate customer cancellation",
        cancellationRequestedBy: auth.userId,
      });

      return apiSuccess(
        {
          message: "Subscription canceled immediately and downgraded to starter tier",
          cancelAtPeriodEnd: false,
          effectiveDate: now,
        },
        200
      );
    }
  } catch (err: any) {
    if (err && typeof err === "object" && "issues" in err) {
      return apiError("Invalid cancellation payload", 422, "VALIDATION_ERROR", err.issues);
    }
    return apiError(err.message || "Failed to cancel subscription", 500, "SERVER_ERROR");
  }
}
