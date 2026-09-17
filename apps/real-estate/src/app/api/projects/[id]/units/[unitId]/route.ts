import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
  handleValidationError,
} from "@repo/core/lib/server/api-security";
import { updateProjectUnitSchema } from "@repo/core/lib/server/validations";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
  MANAGER_ROLES,
} from "@repo/core/lib/server/supabase-server";

interface RouteParams {
  params: Promise<{ id: string; unitId: string }>;
}

// GET /api/projects/[id]/units/[unitId]
export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const { id: projectId, unitId } = await params;
  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const { data: unit, error } = await supabase
      .from("project_units")
      .select("*")
      .eq("id", unitId)
      .eq("project_id", projectId)
      .eq("org_id", auth.orgId)
      .maybeSingle();

    if (error || !unit) {
      return apiError("Unit not found", 404, "NOT_FOUND");
    }

    return apiSuccess(unit, 200);
  } catch {
    return apiError("Failed to fetch unit details", 500, "SERVER_ERROR");
  }
}

// PATCH /api/projects/[id]/units/[unitId] - Role-enforced unit updates
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const isManager = MANAGER_ROLES.includes(auth.role);
  const { id: projectId, unitId } = await params;
  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const rawBody = await req.json();
    const validated = updateProjectUnitSchema.parse(rawBody);

    // Salesperson security barrier: restricted from modifying commercial & architectural master specs
    if (!isManager) {
      if (
        validated.price !== undefined ||
        validated.configuration !== undefined ||
        validated.superAreaSqFt !== undefined ||
        validated.tower !== undefined ||
        validated.unitNumber !== undefined ||
        validated.floor !== undefined ||
        validated.facing !== undefined
      ) {
        return apiError(
          "Salespersons are not authorized to modify unit pricing or structural configuration",
          403,
          "FORBIDDEN"
        );
      }
    }

    const updatePayload: Record<string, any> = {};
    if (validated.status !== undefined) updatePayload.status = validated.status;
    if (validated.assignedLeadId !== undefined) updatePayload.assigned_lead_id = validated.assignedLeadId;
    if (validated.assignedBuyerName !== undefined) updatePayload.assigned_buyer_name = validated.assignedBuyerName;

    if (isManager) {
      if (validated.tower !== undefined) updatePayload.tower = validated.tower;
      if (validated.unitNumber !== undefined) updatePayload.unit_number = validated.unitNumber;
      if (validated.floor !== undefined) updatePayload.floor = validated.floor;
      if (validated.configuration !== undefined) updatePayload.configuration = validated.configuration;
      if (validated.superAreaSqFt !== undefined) updatePayload.super_area_sq_ft = validated.superAreaSqFt;
      if (validated.price !== undefined) updatePayload.price = validated.price;
      if (validated.facing !== undefined) updatePayload.facing = validated.facing;
    }

    const { data: updated, error } = await supabase
      .from("project_units")
      .update(updatePayload)
      .eq("id", unitId)
      .eq("project_id", projectId)
      .eq("org_id", auth.orgId)
      .select()
      .maybeSingle();

    if (error || !updated) {
      return apiError("Failed to update inventory unit", 400, "UPDATE_FAILED");
    }

    return apiSuccess(updated, 200);
  } catch (err) {
    return handleValidationError(err);
  }
}

// DELETE /api/projects/[id]/units/[unitId] - Manager only
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Only managers and admins can delete inventory units", 403, "FORBIDDEN");
  }

  const { id: projectId, unitId } = await params;
  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const { error } = await supabase
      .from("project_units")
      .delete()
      .eq("id", unitId)
      .eq("project_id", projectId)
      .eq("org_id", auth.orgId);

    if (error) {
      return apiError("Failed to delete unit", 500, "DELETE_ERROR");
    }

    return apiSuccess({ deleted: true, unitId }, 200);
  } catch {
    return apiError("Failed to process unit deletion", 500, "SERVER_ERROR");
  }
}
