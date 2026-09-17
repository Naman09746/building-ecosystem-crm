import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
  handleValidationError,
} from "@repo/core/lib/server/api-security";
import { updateRegionSchema } from "@repo/core/lib/server/validations";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
  MANAGER_ROLES,
} from "@repo/core/lib/server/supabase-server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/regions/[id]
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Only managers and admins can update regions", 403, "FORBIDDEN");
  }

  const { id: regionId } = await params;
  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const rawBody = await req.json();
    const validated = updateRegionSchema.parse(rawBody);

    const updatePayload: Record<string, any> = {};
    if (validated.name !== undefined) updatePayload.name = validated.name;
    if (validated.code !== undefined) updatePayload.code = validated.code.toUpperCase();

    const { data: updated, error } = await supabase
      .from("regions")
      .update(updatePayload)
      .eq("id", regionId)
      .eq("org_id", auth.orgId)
      .select()
      .maybeSingle();

    if (error || !updated) {
      return apiError("Failed to update region", 400, "UPDATE_FAILED");
    }

    return apiSuccess(updated, 200);
  } catch (err) {
    return handleValidationError(err);
  }
}

// DELETE /api/regions/[id]
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Only managers and admins can delete regions", 403, "FORBIDDEN");
  }

  const { id: regionId } = await params;
  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    // Check if region is assigned to active projects or leads
    const { data: activeProjects } = await supabase
      .from("projects")
      .select("id")
      .eq("region_id", regionId)
      .eq("org_id", auth.orgId)
      .limit(1);

    if (activeProjects && activeProjects.length > 0) {
      return apiError(
        "Cannot delete region with associated active projects. Reassign projects before deleting.",
        400,
        "DEPENDENCY_CONFLICT"
      );
    }

    const { error } = await supabase
      .from("regions")
      .delete()
      .eq("id", regionId)
      .eq("org_id", auth.orgId);

    if (error) {
      return apiError("Failed to delete region", 500, "DELETE_ERROR");
    }

    return apiSuccess({ deleted: true, regionId }, 200);
  } catch {
    return apiError("Failed to process region deletion", 500, "SERVER_ERROR");
  }
}
