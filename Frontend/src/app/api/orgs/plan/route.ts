import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
  handleValidationError,
} from "@/lib/server/api-security";
import { planSchema } from "@/lib/server/validations";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
} from "@/lib/server/supabase-server";
import { isOwnerRole } from "@/lib/server/rbac";

// PATCH /api/orgs/plan - Persist selected plan and billing cycle (owner-only)
export async function PATCH(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  if (!isOwnerRole(auth.role)) {
    return apiError("Only organization owner can change plan", 403, "FORBIDDEN");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const rawBody = await req.json();
    const validated = planSchema.parse(rawBody);

    const trialEndsAt = validated.trialActive
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data: updated, error } = await supabase
      .from("orgs")
      .update({
        plan: validated.plan,
        billing_cycle: validated.billingCycle,
        trial_ends_at: trialEndsAt,
      })
      .eq("id", auth.orgId)
      .select("id, plan, billing_cycle, trial_ends_at")
      .single();

    if (error || !updated) {
      return apiError("Failed to persist plan selection", 500, "DB_UPDATE_ERROR");
    }

    return apiSuccess(updated, 200);
  } catch (err) {
    return handleValidationError(err);
  }
}
