import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@repo/core/lib/server/api-security";
import {
  getApiAuthContext,
  getServiceRoleClient,
  isLiveSupabaseAvailable,
} from "@repo/core/lib/server/supabase-server";

export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const supabase = getServiceRoleClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiSuccess({
      success: true,
      staleFactsCount: 2,
      staleUnitsCount: 1,
      message: "Scanned and flagged stale property knowledge (simulation mode).",
    });
  }

  try {
    const { data, error } = await supabase.rpc("scan_and_flag_stale_property_knowledge", {
      p_org_id: auth.orgId,
    });

    if (error) {
      return apiError(error.message, 500, "RPC_ERROR");
    }

    const row = data?.[0] || { stale_facts_count: 0, stale_units_count: 0 };
    return apiSuccess({
      success: true,
      staleFactsCount: row.stale_facts_count,
      staleUnitsCount: row.stale_units_count,
      message: `Scanned and flagged ${row.stale_facts_count} stale facts and ${row.stale_units_count} stale units.`,
    });
  } catch (err: any) {
    return apiError(err.message || "Failed to scan stale property knowledge", 500, "INTERNAL_ERROR");
  }
}
