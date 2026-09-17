import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, MANAGER_ROLES, getServiceRoleClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";
import { createCheckoutSessionSchema } from "@repo/core/lib/server/validations";
import { createProviderCheckoutSession, getActiveBillingProvider } from "@repo/core/lib/server/billing-provider";
import { getPlanPrice, PLAN_CONFIGS } from "@repo/core/lib/server/subscription";

// POST /api/billing/checkout - Initiate plan checkout / subscription for caller's org
export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }
  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Only managers and owners can initiate billing changes", 403, "FORBIDDEN");
  }

  // Rate Limiting
  const rateLimitModule = await import("@repo/core/lib/server/rate-limit");
  const rateCheck = await rateLimitModule.checkRateLimitDurable(
    `checkout_${auth.userId}`,
    10,
    60_000
  );
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded for checkout requests", 429, "RATE_LIMIT_EXCEEDED");
  }

  try {
    const parsed = createCheckoutSessionSchema.parse(await req.json());
    const supabase = getServiceRoleClient();

    let orgName = "Apex Realty";
    let userEmail = "owner@agency.com";

    if (supabase && isLiveSupabaseAvailable) {
      // Resolve org details & check existing subscription
      const { data: orgData } = await supabase
        .from("orgs")
        .select("name, plan, subscription_status")
        .eq("id", auth.orgId)
        .single();

      if (orgData) {
        orgName = orgData.name;
        // Prevent duplicate subscription if already active on same plan
        if (orgData.plan === parsed.planId && orgData.subscription_status === "active") {
          return apiError(
            `Organization is already actively subscribed to the ${PLAN_CONFIGS[parsed.planId].name} plan`,
            400,
            "DUPLICATE_ACTIVE_SUBSCRIPTION"
          );
        }
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", auth.userId)
        .single();

      if (profile?.full_name) {
        orgName = orgData?.name || profile.full_name;
      }
    }

    const sessionResult = await createProviderCheckoutSession({
      orgId: auth.orgId,
      orgName,
      userId: auth.userId,
      userEmail,
      planId: parsed.planId,
      billingCycle: parsed.billingCycle,
      successUrl: parsed.successUrl,
      cancelUrl: parsed.cancelUrl,
    });

    return apiSuccess(
      {
        provider: sessionResult.provider,
        sessionId: sessionResult.sessionId,
        checkoutUrl: sessionResult.checkoutUrl,
        amount: sessionResult.amount,
        currency: sessionResult.currency,
        planId: sessionResult.planId,
        billingCycle: sessionResult.billingCycle,
        simulated: sessionResult.simulated,
        razorpayOptions: sessionResult.razorpayOptions,
      },
      200
    );
  } catch (err: any) {
    if (err && typeof err === "object" && "issues" in err) {
      return apiError("Invalid checkout payload", 422, "VALIDATION_ERROR", err.issues);
    }
    return apiError(err.message || "Failed to create checkout session", 500, "CHECKOUT_ERROR");
  }
}
