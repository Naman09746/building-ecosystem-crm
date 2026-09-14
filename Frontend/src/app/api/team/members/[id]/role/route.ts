import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
  handleValidationError,
} from "@/lib/server/api-security";
import { updateUserRoleSchema } from "@/lib/server/validations";
import {
  getApiAuthContext,
  getServiceRoleClient,
  isLiveSupabaseAvailable,
  MANAGER_ROLES,
} from "@/lib/server/supabase-server";
import { isOwnerRole } from "@/lib/server/rbac";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/team/members/[id]/role - Modify user role and region
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Only owners and managers can modify roles", 403, "FORBIDDEN");
  }

  const { id: targetUserId } = await params;
  const serviceClient = getServiceRoleClient();
  if (!serviceClient || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const rawBody = await req.json();
    const validated = updateUserRoleSchema.parse(rawBody);

    if (targetUserId === auth.userId) {
      return apiError("You cannot change your own role", 400, "SELF_ROLE_CHANGE_FORBIDDEN");
    }

    // Owner transfers are strictly owner-only.
    if (validated.role === "owner" && !isOwnerRole(auth.role)) {
      return apiError("Only the current owner can transfer ownership", 403, "FORBIDDEN");
    }

    // Target must belong to caller's org
    const { data: targetProfile, error: profileFetchErr } = await serviceClient
      .from("profiles")
      .select("user_id, org_id, role")
      .eq("user_id", targetUserId)
      .eq("org_id", auth.orgId)
      .maybeSingle();

    if (profileFetchErr || !targetProfile) {
      return apiError("Team member not found in your organization", 404, "NOT_FOUND");
    }

    if (targetProfile.role === "owner" && !isOwnerRole(auth.role)) {
      return apiError("Only the owner can edit another owner profile", 403, "FORBIDDEN");
    }

    // Check if target is last owner and being demoted
    if (targetProfile.role === "owner" && validated.role !== "owner") {
      const { count: ownerCount } = await serviceClient
        .from("profiles")
        .select("user_id", { count: "exact", head: true })
        .eq("org_id", auth.orgId)
        .eq("role", "owner");

      if (ownerCount !== null && ownerCount <= 1) {
        return apiError(
          "Cannot demote the sole organization owner. Assign a new owner first.",
          400,
          "LAST_OWNER_PROTECTION"
        );
      }
    }

    const updatePayload: Record<string, any> = {
      role: validated.role,
      updated_at: new Date().toISOString(),
    };
    if (validated.regionId !== undefined) {
      updatePayload.region_id = validated.regionId;
    }

    const { data: updated, error: updateErr } = await serviceClient
      .from("profiles")
      .update(updatePayload)
      .eq("user_id", targetUserId)
      .eq("org_id", auth.orgId)
      .select("user_id, role, region_id")
      .single();

    if (updateErr) {
      console.error("[ROLE_UPDATE_ERROR]", updateErr);
      return apiError("Failed to update member role", 500, "DB_UPDATE_ERROR");
    }

    return apiSuccess(updated, 200);
  } catch (err) {
    return handleValidationError(err);
  }
}
