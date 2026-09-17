import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, MANAGER_ROLES, getServiceRoleClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";

// POST /api/automation/recompute - Manager-triggered on-demand SLA & CRM Health recalculation for their tenant
export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }
  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Only managers and owners can trigger SLA recalculation", 403, "FORBIDDEN");
  }

  const supabase = getServiceRoleClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiSuccess({ message: "SLA recalculated (Simulated Mode)", stats: { leads_evaluated: 12, notifications_created: 0 } }, 200);
  }

  try {
    const { data, error } = await supabase.rpc("recompute_lead_health_and_slas", {
      p_org_id: auth.orgId,
    });

    if (error) {
      return apiError("Failed to recompute SLAs", 500, "RECOMPUTE_ERROR", error.message);
    }

    return apiSuccess(
      {
        message: "Organization lead health and SLAs successfully recomputed",
        stats: data,
      },
      200
    );
  } catch (err: any) {
    return apiError(err.message || "Failed to trigger recomputation", 500, "SERVER_ERROR");
  }
}
