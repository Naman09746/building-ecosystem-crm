import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError, handleValidationError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, getAuthenticatedServerClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";

const recordBidSchema = z.object({
  unitId: z.string().uuid(),
  leadId: z.string().uuid(),
  bidderType: z.enum(["buyer_offer", "seller_counter", "mediator_compromise"]),
  offeredPrice: z.number().positive(),
  proposedPaymentPlan: z.enum(["down_payment", "clp", "subvention", "flexi_50_50", "custom"]).default("clp"),
  tokenAmountProposed: z.number().optional(),
  tokenChequeAvailable: z.boolean().default(false),
  closingTimelineDays: z.number().default(45),
  specialConditions: z.array(z.string()).default([]),
  furnishingInclusions: z.string().optional(),
  carParksRequested: z.number().default(2),
  roundStatus: z.enum(["accepted", "rejected", "countered", "pending_review", "expired"]).default("pending_review"),
  rejectionReason: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const { id: dealId } = await params;
  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiSuccess([]);
  }

  const { data, error } = await supabase
    .from("negotiation_rounds")
    .select("*, recorder:profiles(full_name, role)")
    .eq("org_id", auth.orgId)
    .eq("deal_id", dealId)
    .order("round_number", { ascending: true });

  if (error) {
    return apiSuccess([]);
  }

  return apiSuccess(data || []);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const { id: dealId } = await params;

  try {
    const body = await req.json();
    const validated = recordBidSchema.parse(body);

    const supabase = await getAuthenticatedServerClient();
    if (!supabase || !isLiveSupabaseAvailable) {
      return apiSuccess({
        id: `mock-bid-${Date.now()}`,
        deal_id: dealId,
        org_id: auth.orgId,
        round_number: 1,
        ...validated,
      }, 201);
    }

    // Get current round count for this deal
    const { count } = await supabase
      .from("negotiation_rounds")
      .select("*", { count: "exact", head: true })
      .eq("org_id", auth.orgId)
      .eq("deal_id", dealId);

    const nextRoundNumber = (count || 0) + 1;

    // Fetch unit asking price to calculate price delta
    const { data: unit } = await supabase
      .from("project_units")
      .select("asking_price, price")
      .eq("id", validated.unitId)
      .single();

    const askPrice = unit?.asking_price || unit?.price || validated.offeredPrice;
    const priceDelta = validated.offeredPrice - askPrice;

    const { data, error } = await supabase
      .from("negotiation_rounds")
      .insert({
        org_id: auth.orgId,
        deal_id: dealId,
        unit_id: validated.unitId,
        lead_id: validated.leadId,
        round_number: nextRoundNumber,
        bidder_type: validated.bidderType,
        offered_price: validated.offeredPrice,
        price_delta_from_ask: priceDelta,
        proposed_payment_plan: validated.proposedPaymentPlan,
        token_amount_proposed: validated.tokenAmountProposed || null,
        token_cheque_available: validated.tokenChequeAvailable,
        closing_timeline_days: validated.closingTimelineDays,
        special_conditions: validated.specialConditions,
        furnishing_inclusions: validated.furnishingInclusions || null,
        car_parks_requested: validated.carParksRequested,
        round_status: validated.roundStatus,
        rejection_reason: validated.rejectionReason || null,
        recorded_by: auth.userId,
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
    return apiError(err.message || "Failed to record negotiation round", 500, "INTERNAL_ERROR");
  }
}
