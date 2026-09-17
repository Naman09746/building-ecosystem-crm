import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError, handleValidationError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, getAuthenticatedServerClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";

const createDealerSchema = z.object({
  dealerCode: z.string().min(1),
  name: z.string().min(2),
  dealerType: z.enum(["cfa","stockist","dealer","retailer","sub_dealer"]),
  parentDealerId: z.string().uuid().optional().nullable(),
  regionId: z.string().uuid().optional().nullable(),
  state: z.string().optional(),
  district: z.string().optional(),
  taluka: z.string().optional(),
  beat: z.string().optional(),
  salespersonId: z.string().uuid().optional().nullable(),
  phone: z.string().optional(),
  gstin: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  status: z.enum(["active","dormant","blocked","new"]).default("active"),
});

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) return apiError("Authentication required", 401, "UNAUTHORIZED");
  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) return apiSuccess([]);
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const status = searchParams.get("status");
  const dealerType = searchParams.get("dealerType");
  let query = supabase.from("dealers").select("*").eq("org_id", auth.orgId).order("created_at", { ascending: false }).limit(100);
  if (q) query = query.or(`name.ilike.%${q}%,dealer_code.ilike.%${q}%,phone.ilike.%${q}%,city.ilike.%${q}%`);
  if (status) query = query.eq("status", status);
  if (dealerType) query = query.eq("dealer_type", dealerType);
  const { data, error } = await query;
  if (error) return apiError(error.message, 500, "DB_ERROR");
  return apiSuccess(data || []);
}

export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) return apiError("Authentication required", 401, "UNAUTHORIZED");
  try {
    const body = await req.json();
    const v = createDealerSchema.parse(body);
    const supabase = await getAuthenticatedServerClient();
    if (!supabase || !isLiveSupabaseAvailable) return apiSuccess({ id: `mock-dealer-${Date.now()}`, org_id: auth.orgId, ...v }, 201);
    const { data, error } = await supabase.from("dealers").insert({ org_id: auth.orgId, dealer_code: v.dealerCode, name: v.name, dealer_type: v.dealerType, parent_dealer_id: v.parentDealerId || null, region_id: v.regionId || null, state: v.state, district: v.district, taluka: v.taluka, beat: v.beat, salesperson_id: v.salespersonId || null, phone: v.phone, gstin: v.gstin, address: v.address, city: v.city, status: v.status }).select().single();
    if (error) return apiError(error.message, 500, "DB_ERROR");
    return apiSuccess(data, 201);
  } catch (err: any) {
    if (err instanceof z.ZodError) return handleValidationError(err);
    return apiError(err.message || "Failed to create dealer", 500, "INTERNAL_ERROR");
  }
}
