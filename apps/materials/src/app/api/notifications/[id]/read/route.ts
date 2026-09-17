import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, getServiceRoleClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";

// PATCH /api/notifications/[id]/read - Mark a single notification as read
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const { id } = await params;
  const supabase = getServiceRoleClient();

  if (!supabase || !isLiveSupabaseAvailable) {
    return apiSuccess({ message: "Notification marked as read (Simulated)" }, 200);
  }

  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true, read_at: nowIso })
      .eq("id", id)
      .eq("user_id", auth.userId)
      .eq("org_id", auth.orgId)
      .select()
      .single();

    if (error || !data) {
      return apiError("Notification not found or access denied", 404, "NOT_FOUND");
    }

    return apiSuccess({ message: "Notification marked as read", notification: data }, 200);
  } catch (err: any) {
    return apiError(err.message || "Failed to update notification", 500, "SERVER_ERROR");
  }
}
