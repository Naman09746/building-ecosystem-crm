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

// GET /api/team/invitations - List invitations for current organization (Manager only)
export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Only managers and admins can view team invitations", 403, "FORBIDDEN");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const { data: invites, error } = await supabase
      .from("invitations")
      .select(`
        id,
        org_id,
        email,
        role,
        region_id,
        status,
        expires_at,
        created_at,
        regions:region_id (name)
      `)
      .eq("org_id", auth.orgId)
      .order("created_at", { ascending: false });

    if (error) {
      return apiError("Failed to fetch invitations", 500, "DB_QUERY_ERROR");
    }

    const formatted = (invites || []).map((inv: any) => ({
      id: inv.id,
      orgId: inv.org_id,
      email: inv.email,
      role: inv.role,
      regionId: inv.region_id,
      regionName: inv.regions?.name || null,
      status: inv.status,
      expiresAt: inv.expires_at,
      createdAt: inv.created_at,
    }));

    return apiSuccess(formatted, 200);
  } catch {
    return apiError("Failed to fetch team invitations", 500, "SERVER_ERROR");
  }
}
