import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, getAuthenticatedServerClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";

export async function GET(_req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) return apiError("Authentication required", 401, "UNAUTHORIZED");
  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) return apiSuccess({ sites: [], orders: {}, collections: [], targets: [] });
  const { data, error } = await supabase.rpc("get_morning_screens", { p_org_id: auth.orgId });
  if (error) return apiError(error.message, 500, "DB_ERROR");
  return apiSuccess(data);
}
