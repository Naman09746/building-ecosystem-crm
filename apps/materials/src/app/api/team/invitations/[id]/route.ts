import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
} from "@repo/core/lib/server/api-security";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
  MANAGER_ROLES,
} from "@repo/core/lib/server/supabase-server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// DELETE /api/team/invitations/[id] - Revoke invitation
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Only managers and admins can revoke invitations", 403, "FORBIDDEN");
  }

  const { id: inviteId } = await params;
  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const { error } = await supabase
      .from("invitations")
      .delete()
      .eq("id", inviteId)
      .eq("org_id", auth.orgId);

    if (error) {
      return apiError("Failed to revoke invitation", 500, "DB_DELETE_ERROR");
    }

    return apiSuccess({ revoked: true, inviteId }, 200);
  } catch {
    return apiError("Failed to process invitation revocation", 500, "SERVER_ERROR");
  }
}
