import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
  handleValidationError,
  checkRateLimit,
} from "@repo/core/lib/server/api-security";
import { createProjectSchema } from "@repo/core/lib/server/validations";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
  MANAGER_ROLES,
} from "@repo/core/lib/server/supabase-server";

// GET /api/projects - List projects for the caller's organization with aggregate metrics
export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const rateCheck = checkRateLimit(`get_proj_${auth.userId}`, 120, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded for projects query", 429, "RATE_LIMIT_EXCEEDED");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const { data: projects, error } = await supabase
      .from("projects")
      .select(`
        *,
        regions:region_id (id, name, code),
        units:project_units (id, status, price),
        leads:leads (id, stage)
      `)
      .eq("org_id", auth.orgId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[PROJECTS_GET_ERROR]", error.code);
      return apiError("Failed to fetch projects", 500, "DB_QUERY_ERROR");
    }

    // Format with computed stats
    const formatted = (projects || []).map((p: any) => {
      const unitsList = p.units || [];
      const leadsList = p.leads || [];
      return {
        id: p.id,
        orgId: p.org_id,
        name: p.name,
        developer: p.developer,
        location: p.location,
        regionId: p.region_id,
        regionName: p.regions?.name || "General Region",
        priceRange: p.price_range || "Price on Request",
        status: p.status,
        totalUnits: unitsList.length,
        availableUnitsCount: unitsList.filter((u: any) => u.status === "available").length,
        bookedUnitsCount: unitsList.filter((u: any) => u.status === "booked" || u.status === "sold").length,
        activeLeadsCount: leadsList.filter((l: any) => l.stage !== "won" && l.stage !== "lost").length,
        siteVisitsCount: leadsList.filter((l: any) => l.stage === "site_visit").length,
        createdAt: p.created_at,
      };
    });

    return apiSuccess(formatted, 200);
  } catch (err) {
    console.error("[PROJECTS_QUERY_EXCEPTION]", err);
    return apiError("Failed to process projects request", 500, "SERVER_ERROR");
  }
}

// POST /api/projects - Create a new real estate project (Manager/Admin/Owner only)
export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Only managers and admins can create projects", 403, "FORBIDDEN");
  }

  const rateCheck = checkRateLimit(`post_proj_${auth.userId}`, 30, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded for project creation", 429, "RATE_LIMIT_EXCEEDED");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const rawBody = await req.json();
    const validated = createProjectSchema.parse(rawBody);

    const { data: createdProject, error } = await supabase
      .from("projects")
      .insert({
        org_id: auth.orgId,
        name: validated.name,
        developer: validated.developer,
        location: validated.location,
        region_id: validated.regionId || null,
        price_range: validated.priceRange || null,
        status: validated.status,
      })
      .select()
      .single();

    if (error) {
      console.error("[PROJECT_CREATE_ERROR]", error.code);
      return apiError("Failed to create project", 500, "DB_INSERT_ERROR");
    }

    return apiSuccess(createdProject, 201);
  } catch (err) {
    return handleValidationError(err);
  }
}
