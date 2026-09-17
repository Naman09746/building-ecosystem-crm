import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError, handleValidationError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, getAuthenticatedServerClient, isLiveSupabaseAvailable, MANAGER_ROLES } from "@repo/core/lib/server/supabase-server";

const createListingSchema = z.object({
  unitId: z.string().uuid("Valid unit ID required"),
  listingType: z.enum(["exclusive_mandate", "semi_exclusive", "open_market", "builder_direct", "pocket_listing"]).default("exclusive_mandate"),
  listingStatus: z.enum(["active", "soft_hold", "under_token", "under_negotiation", "sold", "withdrawn", "expired"]).default("active"),
  askingPrice: z.number().positive("Asking price must be positive"),
  expectedPrice: z.number().positive("Expected price must be positive"),
  minimumAcceptablePrice: z.number().positive("Minimum acceptable price floor required"),
  priceNegotiable: z.boolean().default(true),
  maintenanceChargesMonthly: z.number().optional(),
  mandateStartDate: z.string().optional(),
  mandateEndDate: z.string().optional(),
  sellerBrokeragePct: z.number().default(1.0),
  buyerBrokeragePct: z.number().default(1.0),
  keysHeldBy: z.enum(["agency_custody", "society_guard", "owner", "tenant", "caretaker"]).default("owner"),
  keyLocationDetails: z.string().optional(),
  viewingNoticeRequired: z.enum(["instant", "2_hours", "same_day", "24_hours"]).default("2_hours"),
  gateVisitorInstructions: z.string().optional(),
  portalSyndicationAllowed: z.boolean().default(true),
  socialMediaAllowed: z.boolean().default(true),
  ownerPersonId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const { searchParams } = new URL(req.url);
  const unitId = searchParams.get("unitId");
  const status = searchParams.get("status");

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiSuccess([]);
  }

  let query = supabase
    .from("property_listings_masked")
    .select("*, unit:project_units(unit_number, tower, floor, configuration, super_area_sq_ft, price), owner:people(full_name, primary_phone)")
    .eq("org_id", auth.orgId)
    .order("created_at", { ascending: false });

  if (unitId) query = query.eq("unit_id", unitId);
  if (status) query = query.eq("listing_status", status);

  const { data, error } = await query;

  if (error) {
    return apiSuccess([]);
  }

  // SENSITIVE SECURITY FILTER: Mask minimum_acceptable_price for salespeople
  const isManagerial = MANAGER_ROLES.includes(auth.role);

  const sanitized = (data || []).map((item: any) => {
    if (!isManagerial) {
      const { minimum_acceptable_price, ...safeRest } = item;
      return {
        ...safeRest,
        minimum_acceptable_price: null,
        isPriceFloorMasked: true,
      };
    }
    return item;
  });

  return apiSuccess(sanitized);
}

export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Only owners and managers can create property listing mandates", 403, "FORBIDDEN");
  }

  try {
    const body = await req.json();
    const validated = createListingSchema.parse(body);

    const supabase = await getAuthenticatedServerClient();
    if (!supabase || !isLiveSupabaseAvailable) {
      return apiSuccess({
        id: `mock-listing-${Date.now()}`,
        org_id: auth.orgId,
        ...validated,
      }, 201);
    }

    const { data, error } = await supabase
      .from("property_listings")
      .insert({
        org_id: auth.orgId,
        unit_id: validated.unitId,
        listing_type: validated.listingType,
        listing_status: validated.listingStatus,
        asking_price: validated.askingPrice,
        expected_price: validated.expectedPrice,
        minimum_acceptable_price: validated.minimumAcceptablePrice,
        price_negotiable: validated.priceNegotiable,
        maintenance_charges_monthly: validated.maintenanceChargesMonthly || null,
        mandate_start_date: validated.mandateStartDate || new Date().toISOString().split("T")[0],
        mandate_end_date: validated.mandateEndDate || new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
        seller_brokerage_pct: validated.sellerBrokeragePct,
        buyer_brokerage_pct: validated.buyerBrokeragePct,
        keys_held_by: validated.keysHeldBy,
        key_location_details: validated.keyLocationDetails || null,
        viewing_notice_required: validated.viewingNoticeRequired,
        gate_visitor_instructions: validated.gateVisitorInstructions || null,
        portal_syndication_allowed: validated.portalSyndicationAllowed,
        social_media_allowed: validated.socialMediaAllowed,
        owner_person_id: validated.ownerPersonId || null,
        assigned_agent_id: auth.userId,
        notes: validated.notes || null,
      })
      .select()
      .single();

    if (error) {
      return apiError(error.message, 500, "DB_ERROR");
    }

    return apiSuccess(data, 201);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return handleValidationError(err);
    }
    return apiError(err.message || "Failed to create listing", 500, "INTERNAL_ERROR");
  }
}
