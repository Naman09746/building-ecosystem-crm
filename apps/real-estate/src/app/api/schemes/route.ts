import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError, handleValidationError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, getAuthenticatedServerClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";

const slabSchema = z.object({ minBags: z.number().int().min(0), maxBags: z.number().int().nullable(), ratePerBag: z.number().min(0) });
const createSchemeSchema = z.object({
  dealerId: z.string().uuid().nullable().optional(),
  periodMonth: z.string().regex(/^\d{4}-\d{2}-01$/),
  name: z.string().default("Monthly Volume Scheme"),
  slabs: z.array(slabSchema).min(1),
});

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) return apiError("Authentication required", 401, "UNAUTHORIZED");
  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) return apiSuccess([]);
  const period = new URL(req.url).searchParams.get("period") || new Date().toISOString().slice(0,7)+"-01";
  const { data, error } = await supabase.from("dealer_schemes").select("*").eq("org_id", auth.orgId).eq("period_month", period).order("created_at", { ascending: false });
  if (error) return apiError(error.message, 500, "DB_ERROR");
  return apiSuccess((data||[]).map((r:any)=>({ id:r.id, orgId:r.org_id, dealerId:r.dealer_id, periodMonth:r.period_month, name:r.name, slabs: (r.slabs||[]).map((s:any)=>({ minBags:s.min_bags ?? s.minBags, maxBags:s.max_bags ?? s.maxBags, ratePerBag:s.rate_per_bag ?? s.ratePerBag })), createdAt:r.created_at })));
}

export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) return apiError("Authentication required", 401, "UNAUTHORIZED");
  try {
    const body = await req.json();
    const v = createSchemeSchema.parse(body);
    const supabase = await getAuthenticatedServerClient();
    if (!supabase || !isLiveSupabaseAvailable) return apiSuccess({ id: `mock-scheme-${Date.now()}`, org_id: auth.orgId, ...v }, 201);
    const dbSlabs = v.slabs.map(s=>({ min_bags:s.minBags, max_bags:s.maxBags, rate_per_bag:s.ratePerBag }));
    const { data, error } = await supabase.from("dealer_schemes").upsert({ org_id: auth.orgId, dealer_id: v.dealerId || null, period_month: v.periodMonth, name: v.name, slabs: dbSlabs, created_by: auth.userId }, { onConflict: "org_id,dealer_id,period_month" }).select().single();
    if (error) return apiError(error.message, 500, "DB_ERROR");
    return apiSuccess(data, 201);
  } catch (err:any) {
    if (err instanceof z.ZodError) return handleValidationError(err);
    return apiError(err.message || "Failed to create scheme", 500, "INTERNAL_ERROR");
  }
}
