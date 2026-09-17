import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
  handleValidationError,
  checkRateLimit,
} from "@repo/core/lib/server/api-security";
import { updateProjectUnitSchema } from "@repo/core/lib/server/validations";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
  MANAGER_ROLES,
} from "@repo/core/lib/server/supabase-server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/properties/units/[id] - Flat 360° Dossier
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id: unitId } = await params;
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const rateCheck = checkRateLimit(`get_unit_dossier_${auth.userId}`, 120, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded", 429, "RATE_LIMIT_EXCEEDED");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    // 1. Fetch unit with project and tower metadata
    const { data: unit, error: unitErr } = await supabase
      .from("project_units")
      .select(`
        *,
        project:project_id (
          id, name, developer, location, region_id, area_id,
          regions:region_id (name, code),
          area:area_id (name, city, tier)
        ),
        tower_entity:tower_id (id, name, total_floors, elevators_count, possession_date)
      `)
      .eq("id", unitId)
      .eq("org_id", auth.orgId)
      .single();

    if (unitErr || !unit) {
      return apiError("Unit not found", 404, "NOT_FOUND");
    }

    // 2. Fetch all entity relationships (owners, tenants, power of attorney, key holders)
    const { data: relationships } = await supabase
      .from("entity_relationships")
      .select("*")
      .eq("org_id", auth.orgId)
      .eq("target_type", "unit")
      .eq("target_id", unitId)
      .order("created_at", { ascending: false });

    // 3. Fetch property facts / sales memory
    const { data: facts } = await supabase
      .from("property_facts")
      .select(`*, profile:created_by (full_name)`)
      .eq("org_id", auth.orgId)
      .eq("entity_type", "unit")
      .eq("entity_id", unitId)
      .order("created_at", { ascending: false });

    // 4. Fetch price change history
    const { data: priceHistory } = await supabase
      .from("unit_price_history")
      .select("*")
      .eq("org_id", auth.orgId)
      .eq("unit_id", unitId)
      .order("created_at", { ascending: false });

    // 5. Query matching active buyers for this unit (same config or budget +/- 20%)
    const unitPrice = Number(unit.asking_price || unit.price || 0);
    const minBudget = unitPrice * 0.8;
    const maxBudget = unitPrice * 1.25;

    const { data: matchingLeads } = await supabase
      .from("leads")
      .select(`
        id, person_name, phone, budget, stage, lead_score_label,
        configuration_preference, salesperson_id,
        salesperson:salesperson_id (full_name)
      `)
      .eq("org_id", auth.orgId)
      .neq("stage", "lost")
      .neq("stage", "won")
      .gte("budget", minBudget)
      .lte("budget", maxBudget)
      .order("budget", { ascending: false })
      .limit(10);

    const dossier = {
      unit,
      relationships: relationships || [],
      facts: facts || [],
      priceHistory: priceHistory || [],
      matchingLeads: matchingLeads || [],
    };

    return apiSuccess(dossier, 200);
  } catch (err) {
    console.error("[UNIT_DOSSIER_EXCEPTION]", err);
    return apiError("Failed to build unit dossier", 500, "SERVER_ERROR");
  }
}

// PATCH /api/properties/units/[id] - Update unit details / intelligence
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id: unitId } = await params;
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Only owners and managers can update unit pricing and details", 403, "FORBIDDEN");
  }

  const rateCheck = checkRateLimit(`patch_unit_${auth.userId}`, 60, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded", 429, "RATE_LIMIT_EXCEEDED");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const body = await req.json();
    const parseResult = updateProjectUnitSchema.safeParse(body);
    if (!parseResult.success) {
      return handleValidationError(parseResult.error);
    }

    const patch = parseResult.data;
    const updatePayload: Record<string, any> = {};

    if (patch.unitType !== undefined) updatePayload.unit_type = patch.unitType;
    if (patch.tower !== undefined) updatePayload.tower = patch.tower;
    if (patch.unitNumber !== undefined) updatePayload.unit_number = patch.unitNumber;
    if (patch.floor !== undefined) updatePayload.floor = patch.floor;
    if (patch.configuration !== undefined) updatePayload.configuration = patch.configuration;
    if (patch.superAreaSqFt !== undefined) updatePayload.super_area_sq_ft = patch.superAreaSqFt;
    if (patch.carpetAreaSqFt !== undefined) updatePayload.carpet_area_sq_ft = patch.carpetAreaSqFt;
    if (patch.builtUpAreaSqFt !== undefined) updatePayload.built_up_area_sq_ft = patch.builtUpAreaSqFt;
    if (patch.balconiesCount !== undefined) updatePayload.balconies_count = patch.balconiesCount;
    if (patch.bathroomsCount !== undefined) updatePayload.bathrooms_count = patch.bathroomsCount;
    if (patch.parkingSlots !== undefined) updatePayload.parking_slots = patch.parkingSlots;
    if (patch.parkingType !== undefined) updatePayload.parking_type = patch.parkingType;
    if (patch.isCornerUnit !== undefined) updatePayload.is_corner_unit = patch.isCornerUnit;
    if (patch.furnishingStatus !== undefined) updatePayload.furnishing_status = patch.furnishingStatus;
    if (patch.physicalCondition !== undefined) updatePayload.physical_condition = patch.physicalCondition;
    if (patch.viewType !== undefined) updatePayload.view_type = patch.viewType;
    if (patch.price !== undefined) updatePayload.price = patch.price;
    if (patch.askingPrice !== undefined) updatePayload.asking_price = patch.askingPrice;
    if (patch.estimatedMarketPrice !== undefined) updatePayload.estimated_market_price = patch.estimatedMarketPrice;
    if (patch.lastTransactedPrice !== undefined) updatePayload.last_transacted_price = patch.lastTransactedPrice;
    if (patch.lastTransactedDate !== undefined) updatePayload.last_transacted_date = patch.lastTransactedDate;
    if (patch.maintenanceMonthly !== undefined) updatePayload.maintenance_monthly = patch.maintenanceMonthly;
    if (patch.expectedMonthlyRent !== undefined) updatePayload.expected_monthly_rent = patch.expectedMonthlyRent;
    if (patch.rentalYieldPct !== undefined) updatePayload.rental_yield_pct = patch.rentalYieldPct;
    if (patch.status !== undefined) updatePayload.status = patch.status;
    if (patch.occupancyStatus !== undefined) updatePayload.occupancy_status = patch.occupancyStatus;
    if (patch.sellerIntent !== undefined) updatePayload.seller_intent = patch.sellerIntent;
    if (patch.sellerTargetTimeline !== undefined) updatePayload.seller_target_timeline = patch.sellerTargetTimeline;
    if (patch.listingStatus !== undefined) updatePayload.listing_status = patch.listingStatus;
    if (patch.verificationStatus !== undefined) updatePayload.verification_status = patch.verificationStatus;
    if (patch.facing !== undefined) updatePayload.facing = patch.facing;
    if (patch.keyLocation !== undefined) updatePayload.key_location = patch.keyLocation;
    if (patch.unitAmenities !== undefined) updatePayload.unit_amenities = patch.unitAmenities;
    if (patch.notes !== undefined) updatePayload.notes = patch.notes;
    if (patch.assignedLeadId !== undefined) updatePayload.assigned_lead_id = patch.assignedLeadId;
    if (patch.assignedBuyerName !== undefined) updatePayload.assigned_buyer_name = patch.assignedBuyerName;

    const { data: updated, error } = await supabase
      .from("project_units")
      .update(updatePayload)
      .eq("id", unitId)
      .eq("org_id", auth.orgId)
      .select()
      .single();

    if (error) {
      console.error("[UNIT_UPDATE_ERROR]", error.code);
      return apiError("Failed to update unit", 500, "DB_UPDATE_ERROR");
    }

    return apiSuccess(updated, 200);
  } catch (err) {
    console.error("[UNIT_UPDATE_EXCEPTION]", err);
    return apiError("Failed to process unit update", 500, "SERVER_ERROR");
  }
}

// DELETE /api/properties/units/[id] - Remove unit
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id: unitId } = await params;
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Only managers and admins can delete units", 403, "FORBIDDEN");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const { error } = await supabase
      .from("project_units")
      .delete()
      .eq("id", unitId)
      .eq("org_id", auth.orgId);

    if (error) {
      console.error("[UNIT_DELETE_ERROR]", error.code);
      return apiError("Failed to delete unit", 500, "DB_DELETE_ERROR");
    }

    return apiSuccess({ deleted: true, unitId }, 200);
  } catch (err) {
    console.error("[UNIT_DELETE_EXCEPTION]", err);
    return apiError("Failed to process unit deletion", 500, "SERVER_ERROR");
  }
}
