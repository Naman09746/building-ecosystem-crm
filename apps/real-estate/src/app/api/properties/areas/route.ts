import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
  handleValidationError,
  checkRateLimit,
} from "@repo/core/lib/server/api-security";
import { createPropertyAreaSchema } from "@repo/core/lib/server/validations";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
  MANAGER_ROLES,
} from "@repo/core/lib/server/supabase-server";

// GET /api/properties/areas - List all localities / micro-markets for the tenant
export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const rateCheck = checkRateLimit(`get_areas_${auth.userId}`, 120, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded", 429, "RATE_LIMIT_EXCEEDED");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const { data: areas, error } = await supabase
      .from("property_areas")
      .select(`
        *,
        regions:region_id (id, name, code),
        projects:projects (id, name)
      `)
      .eq("org_id", auth.orgId)
      .order("name", { ascending: true });

    if (error) {
      console.error("[AREAS_GET_ERROR]", error.code);
      return apiError("Failed to fetch property areas", 500, "DB_QUERY_ERROR");
    }

    const formatted = (areas || []).map((a: any) => ({
      id: a.id,
      orgId: a.org_id,
      regionId: a.region_id,
      regionName: a.regions?.name || "",
      name: a.name,
      slug: a.slug,
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      tier: a.tier,
      description: a.description,
      projectsCount: Array.isArray(a.projects) ? a.projects.length : 0,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    }));

    return apiSuccess(formatted, 200);
  } catch (err) {
    console.error("[AREAS_QUERY_EXCEPTION]", err);
    return apiError("Failed to process areas request", 500, "SERVER_ERROR");
  }
}

// POST /api/properties/areas - Create a new locality / micro-market
export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Only managers and admins can configure property areas", 403, "FORBIDDEN");
  }

  const rateCheck = checkRateLimit(`post_area_${auth.userId}`, 30, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded", 429, "RATE_LIMIT_EXCEEDED");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const body = await req.json();
    const parseResult = createPropertyAreaSchema.safeParse(body);
    if (!parseResult.success) {
      return handleValidationError(parseResult.error);
    }

    const areaData = parseResult.data;
    const slug = areaData.slug || areaData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const { data: created, error } = await supabase
      .from("property_areas")
      .insert({
        org_id: auth.orgId,
        region_id: areaData.regionId || null,
        name: areaData.name,
        slug,
        city: areaData.city,
        state: areaData.state,
        pincode: areaData.pincode || null,
        tier: areaData.tier,
        description: areaData.description || null,
      })
      .select(`*, regions:region_id (name)`)
      .single();

    if (error) {
      console.error("[AREA_INSERT_ERROR]", error.code);
      return apiError(error.message || "Failed to create area", 400, "INSERT_FAILED");
    }

    return apiSuccess(created, 201);
  } catch (err) {
    console.error("[AREA_INSERT_EXCEPTION]", err);
    return apiError("Failed to process area creation", 500, "SERVER_ERROR");
  }
}
