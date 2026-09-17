import { NextRequest } from "next/server";
import { apiSuccess, apiError, checkRateLimit } from "@repo/core/lib/server/api-security";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
} from "@repo/core/lib/server/supabase-server";
import { parseDateRangeFilter } from "@repo/core/lib/server/analytics";

// GET /api/analytics/velocity - Pipeline velocity and dwell-time metrics
export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const rateCheck = checkRateLimit(`analytics_vel_${auth.userId}`, 60, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded for analytics", 429, "RATE_LIMIT_EXCEEDED");
  }

  const searchParams = req.nextUrl.searchParams;
  const range = searchParams.get("range");
  const startDateParam = searchParams.get("start_date");
  const endDateParam = searchParams.get("end_date");

  const { startDate, endDate } = parseDateRangeFilter(range, startDateParam, endDateParam);

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiSuccess({
      stages: [
        { slug: "new", name: "New Inflow", sortOrder: 1, color: "#3b82f6", count: 2, value: 56000000, avgDaysInStage: 1.2, conversionPct: 16.7 },
        { slug: "contacted", name: "Contacted", sortOrder: 2, color: "#6366f1", count: 2, value: 137000000, avgDaysInStage: 3.4, conversionPct: 16.7 },
        { slug: "qualified", name: "Qualified", sortOrder: 3, color: "#8b5cf6", count: 2, value: 93000000, avgDaysInStage: 4.1, conversionPct: 16.7 },
        { slug: "site_visit", name: "Site Visit", sortOrder: 4, color: "#ec4899", count: 2, value: 195000000, avgDaysInStage: 5.8, conversionPct: 16.7 },
        { slug: "negotiation", name: "Negotiation", sortOrder: 5, color: "#f59e0b", count: 1, value: 95000000, avgDaysInStage: 7.2, conversionPct: 8.3 },
        { slug: "won", name: "Won Deals", sortOrder: 6, color: "#10b981", count: 2, value: 160000000, avgDaysInStage: 14.5, conversionPct: 16.7 },
      ],
      avgSalesCycleDays: 14.5,
      wonDealsEvaluated: 2,
      totalLeadsEvaluated: 12,
    });
  }

  try {
    const { data: raw, error } = await supabase.rpc("get_pipeline_velocity_analytics", {
      p_org_id: auth.orgId,
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      return apiError(error.message || "Failed to fetch velocity analytics", 500, "DB_ERROR");
    }

    return apiSuccess({
      stages: (raw?.stages || []).map((s: any) => ({
        slug: s.slug,
        name: s.name,
        sortOrder: s.sort_order,
        color: s.color,
        count: Number(s.count || 0),
        value: Number(s.value || 0),
        avgDaysInStage: Number(s.avg_days_in_stage || 0),
        conversionPct: Number(s.conversion_pct || 0),
      })),
      avgSalesCycleDays: Number(raw?.avg_sales_cycle_days || 0),
      wonDealsEvaluated: Number(raw?.won_deals_evaluated || 0),
      totalLeadsEvaluated: Number(raw?.total_leads_evaluated || 0),
    });
  } catch (err: any) {
    return apiError(err.message || "Server error", 500, "SERVER_ERROR");
  }
}
