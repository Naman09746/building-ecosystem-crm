import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
  handleValidationError,
  checkRateLimit,
} from "@repo/core/lib/server/api-security";
import { createProjectTowerSchema } from "@repo/core/lib/server/validations";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
  MANAGER_ROLES,
} from "@repo/core/lib/server/supabase-server";

// GET /api/properties/towers - List towers (optionally filtered by projectId)
export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const rateCheck = checkRateLimit(`get_towers_${auth.userId}`, 120, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded", 429, "RATE_LIMIT_EXCEEDED");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    let query = supabase
      .from("project_towers")
      .select(`
        *,
        project:project_id (id, name),
        units:project_units (id, status)
      `)
      .eq("org_id", auth.orgId)
      .order("name", { ascending: true });

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    const { data: towers, error } = await query;

    if (error) {
      console.error("[TOWERS_GET_ERROR]", error.code);
      return apiError("Failed to fetch towers", 500, "DB_QUERY_ERROR");
    }

    const formatted = (towers || []).map((t: any) => {
      const units = t.units || [];
      return {
        id: t.id,
        orgId: t.org_id,
        projectId: t.project_id,
        projectName: t.project?.name || "",
        name: t.name,
        towerCode: t.tower_code,
        totalFloors: t.total_floors,
        unitsPerFloor: t.units_per_floor,
        elevatorsCount: t.elevators_count,
        possessionDate: t.possession_date,
        constructionStatus: t.construction_status,
        facingDirection: t.facing_direction,
        notes: t.notes,
        totalUnitsCount: units.length,
        availableUnitsCount: units.filter((u: any) => u.status === "available").length,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      };
    });

    return apiSuccess(formatted, 200);
  } catch (err) {
    console.error("[TOWERS_QUERY_EXCEPTION]", err);
    return apiError("Failed to process towers request", 500, "SERVER_ERROR");
  }
}

// POST /api/properties/towers - Create a new tower in a project
export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Only managers and admins can create towers", 403, "FORBIDDEN");
  }

  const rateCheck = checkRateLimit(`post_tower_${auth.userId}`, 30, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded", 429, "RATE_LIMIT_EXCEEDED");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const body = await req.json();
    const parseResult = createProjectTowerSchema.safeParse(body);
    if (!parseResult.success) {
      return handleValidationError(parseResult.error);
    }

    const t = parseResult.data;

    // Verify project belongs to tenant
    const { data: proj, error: projErr } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", t.projectId)
      .eq("org_id", auth.orgId)
      .single();

    if (projErr || !proj) {
      return apiError("Society / Project not found in organization", 404, "NOT_FOUND");
    }

    const { data: created, error } = await supabase
      .from("project_towers")
      .insert({
        org_id: auth.orgId,
        project_id: t.projectId,
        name: t.name,
        tower_code: t.towerCode || null,
        total_floors: t.totalFloors,
        units_per_floor: t.unitsPerFloor,
        elevators_count: t.elevatorsCount,
        possession_date: t.possessionDate || null,
        construction_status: t.constructionStatus,
        facing_direction: t.facingDirection || null,
        notes: t.notes || null,
      })
      .select(`*, project:project_id (name)`)
      .single();

    if (error) {
      console.error("[TOWER_INSERT_ERROR]", error.code);
      return apiError(error.message || "Failed to create tower", 400, "INSERT_FAILED");
    }

    return apiSuccess(created, 201);
  } catch (err) {
    console.error("[TOWER_INSERT_EXCEPTION]", err);
    return apiError("Failed to process tower creation", 500, "SERVER_ERROR");
  }
}
