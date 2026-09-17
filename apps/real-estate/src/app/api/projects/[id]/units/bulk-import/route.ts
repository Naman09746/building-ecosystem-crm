import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
  handleValidationError,
  checkRateLimit,
} from "@repo/core/lib/server/api-security";
import { bulkImportUnitsSchema } from "@repo/core/lib/server/validations";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
  MANAGER_ROLES,
} from "@repo/core/lib/server/supabase-server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/projects/[id]/units/bulk-import - Bulk inventory ingestion (Manager only)
export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Only managers and admins can bulk import inventory", 403, "FORBIDDEN");
  }

  const { id: projectId } = await params;
  const rateCheck = checkRateLimit(`bulk_unit_${auth.userId}`, 10, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded for bulk import", 429, "RATE_LIMIT_EXCEEDED");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const rawBody = await req.json();
    const validated = bulkImportUnitsSchema.parse({ ...rawBody, projectId });

    // Verify project belongs to caller's org
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("org_id", auth.orgId)
      .maybeSingle();

    if (!project) {
      return apiError("Target project not found in organization", 404, "NOT_FOUND");
    }

    const rowsToInsert = validated.units.map((u) => ({
      org_id: auth.orgId,
      project_id: projectId,
      tower: u.tower,
      unit_number: u.unitNumber,
      floor: u.floor,
      configuration: u.configuration,
      super_area_sq_ft: u.superAreaSqFt,
      price: u.price,
      status: u.status || "available",
      facing: u.facing || null,
      assigned_lead_id: u.assignedLeadId || null,
      assigned_buyer_name: u.assignedBuyerName || null,
    }));

    const { data: inserted, error } = await supabase
      .from("project_units")
      .insert(rowsToInsert)
      .select();

    if (error) {
      console.error("[BULK_UNITS_IMPORT_ERROR]", error.code);
      return apiError("Failed to bulk import inventory units", 500, "DB_INSERT_ERROR");
    }

    return apiSuccess(
      {
        count: inserted?.length || 0,
        units: inserted,
      },
      201
    );
  } catch (err) {
    return handleValidationError(err);
  }
}
