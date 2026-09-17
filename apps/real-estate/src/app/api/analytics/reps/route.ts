import { NextRequest } from "next/server";
import { apiSuccess, apiError, checkRateLimit } from "@repo/core/lib/server/api-security";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
  MANAGER_ROLES,
} from "@repo/core/lib/server/supabase-server";
import { parseDateRangeFilter } from "@repo/core/lib/server/analytics";

// GET /api/analytics/reps - Sales rep performance & leaderboard analytics
export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const rateCheck = checkRateLimit(`analytics_reps_${auth.userId}`, 60, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded for analytics", 429, "RATE_LIMIT_EXCEEDED");
  }

  const searchParams = req.nextUrl.searchParams;
  const range = searchParams.get("range");
  const startDateParam = searchParams.get("start_date");
  const endDateParam = searchParams.get("end_date");
  let salespersonIdParam = searchParams.get("salesperson_id");

  if (!MANAGER_ROLES.includes(auth.role)) {
    salespersonIdParam = auth.userId;
  }

  const { startDate, endDate } = parseDateRangeFilter(range, startDateParam, endDateParam);

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiSuccess([
      {
        userId: auth.userId,
        name: auth.fullName || "Rahul Sharma",
        email: auth.email,
        role: auth.role,
        avatarUrl: null,
        regionId: null,
        regionName: "Gurgaon Hub",
        totalAssigned: 12,
        activeLeads: 9,
        wonLeads: 2,
        lostLeads: 1,
        conversionRate: 16.7,
        activePipelineValue: 480000000,
        wonRevenue: 160000000,
        avgDealValue: 80000000,
        avgDaysToWon: 14.5,
        callsCount: 42,
        siteVisitsCount: 8,
        meetingsCount: 5,
        tasksTotal: 15,
        tasksCompleted: 13,
        tasksOverdue: 2,
        slaComplianceRate: 86.7,
      },
    ]);
  }

  try {
    const { data: raw, error } = await supabase.rpc("get_rep_performance_analytics", {
      p_org_id: auth.orgId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_salesperson_id: salespersonIdParam || null,
    });

    if (error) {
      return apiError(error.message || "Failed to fetch rep analytics", 500, "DB_ERROR");
    }

    const reps = (raw || []).map((r: any) => ({
      userId: r.user_id,
      name: r.name,
      email: r.email,
      role: r.role,
      avatarUrl: r.avatar_url,
      regionId: r.region_id,
      regionName: r.region_name,
      totalAssigned: Number(r.total_assigned || 0),
      activeLeads: Number(r.active_leads || 0),
      wonLeads: Number(r.won_leads || 0),
      lostLeads: Number(r.lost_leads || 0),
      conversionRate: Number(r.conversion_rate || 0),
      activePipelineValue: Number(r.active_pipeline_value || 0),
      wonRevenue: Number(r.won_revenue || 0),
      avgDealValue: Number(r.avg_deal_value || 0),
      avgDaysToWon: Number(r.avg_days_to_won || 0),
      callsCount: Number(r.calls_count || 0),
      siteVisitsCount: Number(r.site_visits_count || 0),
      meetingsCount: Number(r.meetings_count || 0),
      tasksTotal: Number(r.tasks_total || 0),
      tasksCompleted: Number(r.tasks_completed || 0),
      tasksOverdue: Number(r.tasks_overdue || 0),
      slaComplianceRate: Number(r.sla_compliance_rate || 100),
    }));

    return apiSuccess(reps);
  } catch (err: any) {
    return apiError(err.message || "Server error", 500, "SERVER_ERROR");
  }
}
