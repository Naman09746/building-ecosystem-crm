import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
  handleValidationError,
  checkRateLimit,
} from "@repo/core/lib/server/api-security";
import { createProjectUnitSchema } from "@repo/core/lib/server/validations";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
  MANAGER_ROLES,
} from "@repo/core/lib/server/supabase-server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/units - List units for a project
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
    const { data: units, error } = await supabase
      .from("project_units")
      .select("*")
      .eq("project_id", projectId)
      .eq("org_id", auth.orgId)
      .order("tower", { ascending: true })
      .order("floor", { ascending: true })
      .order("unit_number", { ascending: true });

    if (error) {
      return apiError("Failed to fetch project units", 500, "DB_QUERY_ERROR");
    }

    return apiSuccess(units || [], 200);
  } catch {
    return apiError("Failed to fetch project units", 500, "SERVER_ERROR");
  }
}

// POST /api/projects/[id]/units - Create a single inventory unit (Manager/Admin only)
export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Only managers and admins can create inventory units", 403, "FORBIDDEN");
  }

  const { id: projectId } = await params;
  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const rawBody = await req.json();
    const validated = createProjectUnitSchema.parse({ ...rawBody, projectId });

    const { data: createdUnit, error } = await supabase
      .from("project_units")
      .insert({
        org_id: auth.orgId,
        project_id: projectId,
        tower: validated.tower,
        unit_number: validated.unitNumber,
        floor: validated.floor,
        configuration: validated.configuration,
        super_area_sq_ft: validated.superAreaSqFt,
        price: validated.price,
        status: validated.status,
        facing: validated.facing || null,
        assigned_lead_id: validated.assignedLeadId || null,
        assigned_buyer_name: validated.assignedBuyerName || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[UNIT_CREATE_ERROR]", error.code);
      return apiError("Failed to create inventory unit", 500, "DB_INSERT_ERROR");
    }

    return apiSuccess(createdUnit, 201);
  } catch (err) {
    return handleValidationError(err);
  }
}
