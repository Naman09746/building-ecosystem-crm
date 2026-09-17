import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError, handleValidationError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, getAuthenticatedServerClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";

const createComplaintSchema = z.object({
  reportedByDealerId: z.string().uuid().optional().nullable(),
  reportedByPhone: z.string().optional(),
  siteId: z.string().uuid().optional().nullable(),
  orderId: z.string().uuid().optional().nullable(),
  dispatchChallanId: z.string().uuid().optional().nullable(),
  complaintType: z.enum(["late_delivery","short_quantity","damaged_bags","wrong_grade","rate_difference","quality_doubt","service_behaviour"]),
  description: z.string().optional(),
  photoUrl: z.string().optional(),
  assignedToUserId: z.string().uuid().optional().nullable(),
  priority: z.enum(["low","medium","high"]).default("medium"),
});

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) return apiError("Authentication required", 401, "UNAUTHORIZED");
  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) return apiSuccess([]);
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  let query = supabase.from("complaints").select("*").eq("org_id", auth.orgId).order("created_at", { ascending: false }).limit(100);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return apiError(error.message, 500, "DB_ERROR");
  return apiSuccess(data || []);
}

export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) return apiError("Authentication required", 401, "UNAUTHORIZED");
  try {
    const body = await req.json();
    const v = createComplaintSchema.parse(body);
    const supabase = await getAuthenticatedServerClient();
    if (!supabase || !isLiveSupabaseAvailable) return apiSuccess({ id: `mock-cmp-${Date.now()}`, org_id: auth.orgId, case_no: `CMP-${Date.now()}`, status: "open", due_at: new Date(Date.now()+48*3600*1000).toISOString(), ...v }, 201);
    const { data, error } = await supabase.from("complaints").insert({ org_id: auth.orgId, reported_by_dealer_id: v.reportedByDealerId, reported_by_phone: v.reportedByPhone, site_id: v.siteId, order_id: v.orderId, dispatch_challan_id: v.dispatchChallanId, complaint_type: v.complaintType, description: v.description, photo_url: v.photoUrl, assigned_to_user_id: v.assignedToUserId, priority: v.priority }).select().single();
    if (error) return apiError(error.message, 500, "DB_ERROR");
    return apiSuccess(data, 201);
  } catch (err: any) {
    if (err instanceof z.ZodError) return handleValidationError(err);
    return apiError(err.message || "Failed to create complaint", 500, "INTERNAL_ERROR");
  }
}
