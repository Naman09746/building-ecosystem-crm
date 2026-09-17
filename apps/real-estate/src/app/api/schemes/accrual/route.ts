import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, getAuthenticatedServerClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) return apiError("Authentication required", 401, "UNAUTHORIZED");
  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) return apiSuccess([]);
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || new Date().toISOString().slice(0,7)+"-01";
  const dealerId = searchParams.get("dealerId");
  if (dealerId) {
    const { data, error } = await supabase.rpc("get_scheme_accrual", { p_org_id: auth.orgId, p_period_month: period, p_dealer_id: dealerId });
    if (error) return apiError(error.message, 500, "DB_ERROR");
    const r = Array.isArray(data) ? data[0] : data;
    if (!r) return apiSuccess(null);
    return apiSuccess({ periodMonth: r.period_month, dealerId: r.dealer_id, dealerName: r.dealer_name, slabs: r.slabs, achievedBags: Number(r.achieved_bags), currentRate: Number(r.current_rate), accruedAmount: Number(r.accrued_amount), nextSlabMin: r.next_slab_min, bagsToNext: r.bags_to_next, nextRate: r.next_rate ? Number(r.next_rate) : null });
  }
  // org-wide: return per-dealer accruals
  const { data: dealers } = await supabase.from("dealers").select("id").eq("org_id", auth.orgId).limit(100);
  const results = [];
  for (const d of (dealers||[])) {
    const { data } = await supabase.rpc("get_scheme_accrual", { p_org_id: auth.orgId, p_period_month: period, p_dealer_id: d.id });
    const r = Array.isArray(data) ? data[0] : data;
    if (r) results.push({ dealerId: r.dealer_id, dealerName: r.dealer_name, achievedBags: Number(r.achieved_bags), currentRate: Number(r.current_rate), accruedAmount: Number(r.accrued_amount), nextSlabMin: r.next_slab_min, bagsToNext: r.bags_to_next, nextRate: r.next_rate ? Number(r.next_rate) : null });
  }
  return apiSuccess(results);
}
