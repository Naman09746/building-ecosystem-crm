import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, getServiceRoleClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";

// POST /api/notifications/mark-all-read - Mark all notifications as read for current user
export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const supabase = getServiceRoleClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiSuccess({ message: "All notifications marked as read (Simulated)" }, 200);
  }

  try {
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("notifications")
      .update({ read: true, read_at: nowIso })
      .eq("user_id", auth.userId)
      .eq("org_id", auth.orgId)
      .eq("read", false);

    if (error) {
      return apiError("Failed to mark notifications as read", 500, "DB_ERROR", error.message);
    }

    return apiSuccess({ message: "All notifications marked as read" }, 200);
  } catch (err: any) {
    return apiError(err.message || "Failed to mark notifications read", 500, "SERVER_ERROR");
  }
}
