import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
  handleValidationError,
  checkRateLimit,
} from "@repo/core/lib/server/api-security";
import { updateProjectSchema } from "@repo/core/lib/server/validations";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
  MANAGER_ROLES,
} from "@repo/core/lib/server/supabase-server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]
export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const { id: projectId } = await params;
  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const { data: project, error } = await supabase
      .from("projects")
      .select(`
        *,
        regions:region_id (id, name, code),
        units:project_units (*)
      `)
      .eq("id", projectId)
      .eq("org_id", auth.orgId)
      .maybeSingle();

    if (error || !project) {
      return apiError("Project not found", 404, "NOT_FOUND");
    }

    return apiSuccess(project, 200);
  } catch {
    return apiError("Failed to fetch project details", 500, "SERVER_ERROR");
  }
}

// PATCH /api/projects/[id]
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Only managers and admins can update projects", 403, "FORBIDDEN");
  }

  const { id: projectId } = await params;
  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const rawBody = await req.json();
    const validated = updateProjectSchema.parse(rawBody);

    const updatePayload: Record<string, any> = {};
    if (validated.name !== undefined) updatePayload.name = validated.name;
    if (validated.developer !== undefined) updatePayload.developer = validated.developer;
    if (validated.location !== undefined) updatePayload.location = validated.location;
    if (validated.regionId !== undefined) updatePayload.region_id = validated.regionId;
    if (validated.priceRange !== undefined) updatePayload.price_range = validated.priceRange;
    if (validated.status !== undefined) updatePayload.status = validated.status;

    const { data: updated, error } = await supabase
      .from("projects")
      .update(updatePayload)
      .eq("id", projectId)
      .eq("org_id", auth.orgId)
      .select()
      .maybeSingle();

    if (error || !updated) {
      return apiError("Failed to update project", 400, "UPDATE_FAILED");
    }

    return apiSuccess(updated, 200);
  } catch (err) {
    return handleValidationError(err);
  }
}

// DELETE /api/projects/[id] - Safe deletion check
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Only managers and admins can delete projects", 403, "FORBIDDEN");
  }

  const { id: projectId } = await params;
  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    // Check for active booked/sold units or active leads
    const { data: activeUnits } = await supabase
      .from("project_units")
      .select("id")
      .eq("project_id", projectId)
      .eq("org_id", auth.orgId)
      .in("status", ["booked", "sold", "negotiation"]);

    if (activeUnits && activeUnits.length > 0) {
      return apiError(
        "Cannot delete project with booked or active negotiation units. Archive the project instead.",
        400,
        "DEPENDENCY_CONFLICT"
      );
    }

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId)
      .eq("org_id", auth.orgId);

    if (error) {
      return apiError("Failed to delete project", 500, "DELETE_ERROR");
    }

    return apiSuccess({ deleted: true, projectId }, 200);
  } catch {
    return apiError("Failed to process project deletion", 500, "SERVER_ERROR");
  }
}
