import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError, handleValidationError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, getAuthenticatedServerClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";

const createTargetSchema = z.object({
  periodMonth: z.string().regex(/^\d{4}-\d{2}-01$/),
  targetMt: z.number().min(0),
  targetBags: z.number().int().min(0),
  level: z.enum(["company","state","region","area","salesperson","dealer"]),
  levelId: z.string().min(1),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) return apiError("Authentication required", 401, "UNAUTHORIZED");
  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) return apiSuccess([]);
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || new Date().toISOString().slice(0,7)+"-01";
  const { data, error } = await supabase.from("sales_targets").select("*").eq("org_id", auth.orgId).eq("period_month", period).order("level", { ascending: true });
  if (error) return apiError(error.message, 500, "DB_ERROR");
  // Enrich with achievement via RPC per row (N+1 but okay for <20 rows)
  const enriched = [];
  for (const t of (data || [])) {
    const { data: ach } = await supabase.rpc("get_target_achievement", { p_org_id: auth.orgId, p_period_month: t.period_month, p_level: t.level, p_level_id: t.level_id });
    const a = Array.isArray(ach) ? ach[0] : ach;
    enriched.push({ ...t, achievedBags: a?.achieved_bags || 0, achievedMt: a?.achieved_mt || 0, achievementPct: a?.achievement_pct || 0, pacePct: a?.pace_pct || 0 });
  }
  return apiSuccess(enriched);
}

export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) return apiError("Authentication required", 401, "UNAUTHORIZED");
  try {
    const body = await req.json();
    const v = createTargetSchema.parse(body);
    const supabase = await getAuthenticatedServerClient();
    if (!supabase || !isLiveSupabaseAvailable) return apiSuccess({ id: `mock-target-${Date.now()}`, org_id: auth.orgId, ...v }, 201);
    const { data, error } = await supabase.from("sales_targets").upsert({ org_id: auth.orgId, period_month: v.periodMonth, target_mt: v.targetMt, target_bags: v.targetBags, level: v.level, level_id: v.levelId, created_by: auth.userId, notes: v.notes }, { onConflict: "org_id,period_month,level,level_id" }).select().single();
    if (error) return apiError(error.message, 500, "DB_ERROR");
    return apiSuccess(data, 201);
  } catch (err: any) {
    if (err instanceof z.ZodError) return handleValidationError(err);
    return apiError(err.message || "Failed to create target", 500, "INTERNAL_ERROR");
  }
}
