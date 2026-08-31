import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
  handleValidationError,
  checkRateLimit,
} from "@/lib/server/api-security";
import { createProjectUnitSchema } from "@/lib/server/validations";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
  MANAGER_ROLES,
} from "@/lib/server/supabase-server";

// GET /api/properties/units - Filterable multi-criteria unit search
export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const rateCheck = checkRateLimit(`get_units_${auth.userId}`, 120, 60000);
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
    const towerId = searchParams.get("towerId");
    const configuration = searchParams.get("configuration");
    const status = searchParams.get("status");
    const occupancyStatus = searchParams.get("occupancyStatus");
    const sellerIntent = searchParams.get("sellerIntent");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const limit = Math.min(Number(searchParams.get("limit") || 100), 200);

    let query = supabase
      .from("project_units")
      .select(`
        *,
        project:project_id (id, name, location, developer, region_id, area_id),
        tower_entity:tower_id (id, name, total_floors)
      `)
      .eq("org_id", auth.orgId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (projectId) query = query.eq("project_id", projectId);
    if (towerId) query = query.eq("tower_id", towerId);
    if (configuration) query = query.eq("configuration", configuration);
    if (status) query = query.eq("status", status);
    if (occupancyStatus) query = query.eq("occupancy_status", occupancyStatus);
    if (sellerIntent) query = query.eq("seller_intent", sellerIntent);
    if (minPrice) query = query.gte("price", Number(minPrice));
    if (maxPrice) query = query.lte("price", Number(maxPrice));

    const { data: units, error } = await query;

    if (error) {
      console.error("[UNITS_GET_ERROR]", error.code);
      return apiError("Failed to fetch units", 500, "DB_QUERY_ERROR");
    }

    return apiSuccess(units || [], 200);
  } catch (err) {
    console.error("[UNITS_QUERY_EXCEPTION]", err);
    return apiError("Failed to process units query", 500, "SERVER_ERROR");
  }
}

// POST /api/properties/units - Create a new unit
export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Only managers and admins can add units", 403, "FORBIDDEN");
  }

  const rateCheck = checkRateLimit(`post_unit_${auth.userId}`, 60, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded", 429, "RATE_LIMIT_EXCEEDED");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const body = await req.json();
    const parseResult = createProjectUnitSchema.safeParse(body);
    if (!parseResult.success) {
      return handleValidationError(parseResult.error);
    }

    const u = parseResult.data;

    // Verify project exists in org
    const { data: proj, error: projErr } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", u.projectId)
      .eq("org_id", auth.orgId)
      .single();

    if (projErr || !proj) {
      return apiError("Project not found in organization", 404, "NOT_FOUND");
    }

    const { data: created, error } = await supabase
      .from("project_units")
      .insert({
        org_id: auth.orgId,
        project_id: u.projectId,
        tower_id: u.towerId || null,
        tower: u.tower,
        unit_number: u.unitNumber,
        floor: u.floor,
        configuration: u.configuration,
        unit_type: u.unitType || "apartment",
        super_area_sq_ft: u.superAreaSqFt || 1500,
        carpet_area_sq_ft: u.carpetAreaSqFt || null,
        built_up_area_sq_ft: u.builtUpAreaSqFt || null,
        balconies_count: u.balconiesCount || 1,
        bathrooms_count: u.bathroomsCount || 2,
        parking_slots: u.parkingSlots || 1,
        parking_type: u.parkingType || "covered",
        is_corner_unit: u.isCornerUnit || false,
        furnishing_status: u.furnishingStatus || "semi_furnished",
        physical_condition: u.physicalCondition || "good",
        view_type: u.viewType || null,
        price: u.price,
        asking_price: u.askingPrice || u.price,
        estimated_market_price: u.estimatedMarketPrice || null,
        maintenance_monthly: u.maintenanceMonthly || null,
        expected_monthly_rent: u.expectedMonthlyRent || null,
        status: u.status || "available",
        occupancy_status: u.occupancyStatus || "unknown",
        seller_intent: u.sellerIntent || "unknown",
        seller_target_timeline: u.sellerTargetTimeline || null,
        listing_status: u.listingStatus || "unlisted",
        verification_status: u.verificationStatus || "unverified",
        facing: u.facing || null,
        key_location: u.keyLocation || null,
        unit_amenities: u.unitAmenities || null,
        notes: u.notes || null,
      })
      .select(`*, project:project_id (name)`)
      .single();

    if (error) {
      console.error("[UNIT_INSERT_ERROR]", error.code);
      return apiError(error.message || "Failed to create unit", 400, "INSERT_FAILED");
    }

    return apiSuccess(created, 201);
  } catch (err) {
    console.error("[UNIT_INSERT_EXCEPTION]", err);
    return apiError("Failed to process unit creation", 500, "SERVER_ERROR");
  }
}
