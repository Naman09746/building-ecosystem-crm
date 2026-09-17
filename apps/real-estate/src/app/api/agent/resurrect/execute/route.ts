import { NextRequest } from "next/server";
import { apiSuccess, apiError, checkRateLimit } from "@repo/core/lib/server/api-security";
import { executeResurrectionSchema } from "@repo/core/lib/server/validations";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
  MANAGER_ROLES,
} from "@repo/core/lib/server/supabase-server";
import { checkFeatureAccess, resolvePlan } from "@repo/core/lib/server/subscription";

// POST /api/agent/resurrect/execute - Approve & Execute Lead Resurrection
// Manager+ only: advances lead to contacted, dispatches calling task to rep, logs audit trail.
export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError(
      "Resurrection execution requires a manager or admin role",
      403,
      "FORBIDDEN"
    );
  }

  if (!checkFeatureAccess("resurrection", resolvePlan(auth.plan))) {
    return apiError(
      "The Resurrection Engine is not available on your current plan. Please upgrade.",
      402,
      "PLAN_UPGRADE_REQUIRED",
      { feature: "resurrection", plan: auth.plan }
    );
  }

  const rateCheck = checkRateLimit(`agent_resurrect_exec_${auth.userId}`, 30, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded for resurrection execution", 429, "RATE_LIMIT_EXCEEDED");
  }

  try {
    const rawBody = await req.json().catch(() => ({}));
    const { leadId, leadIds, unitId, pitch } = executeResurrectionSchema.parse(rawBody);

    const targetLeadIds = leadIds && leadIds.length > 0 ? leadIds : leadId ? [leadId] : [];

    if (targetLeadIds.length === 0) {
      return apiError("At least one leadId or leadIds array must be specified", 422, "VALIDATION_ERROR");
    }

    const supabase = await getAuthenticatedServerClient();
    if (!supabase || !isLiveSupabaseAvailable) {
      // Offline / simulation mock response
      return apiSuccess({
        resurrectedCount: targetLeadIds.length,
        results: targetLeadIds.map((id) => ({
          success: true,
          leadId: id,
          stage: "contacted",
          taskId: `tsk-sim-${Date.now()}`,
          activityId: `act-sim-${Date.now()}`,
          healthScore: 75,
          dealHealth: "neutral",
        })),
      });
    }

    const results = [];

    for (const id of targetLeadIds) {
      const { data, error } = await supabase.rpc("execute_lead_resurrection", {
        p_org_id: auth.orgId,
        p_lead_id: id,
        p_user_id: auth.userId,
        p_unit_id: unitId || null,
        p_pitch: pitch || null,
      });

      if (error) {
        console.error("[RESURRECT_EXECUTE_ERROR]", id, error.message);
        results.push({ success: false, leadId: id, error: error.message });
      } else {
        results.push(data || { success: true, leadId: id });
      }
    }

    const successfulCount = results.filter((r) => r.success).length;

    return apiSuccess({
      totalRequested: targetLeadIds.length,
      resurrectedCount: successfulCount,
      results,
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "issues" in err) {
      return apiError("Invalid resurrection execution parameters", 422, "VALIDATION_ERROR", (err as any).issues);
    }
    return apiError("Failed to execute resurrection", 500, "SERVER_ERROR");
  }
}
