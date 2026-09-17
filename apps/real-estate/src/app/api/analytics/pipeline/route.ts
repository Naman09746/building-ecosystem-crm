import { NextRequest } from "next/server";
import { apiSuccess, apiError, checkRateLimit } from "@repo/core/lib/server/api-security";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
  MANAGER_ROLES,
} from "@repo/core/lib/server/supabase-server";
import { parseDateRangeFilter } from "@repo/core/lib/server/analytics";

// GET /api/analytics/pipeline - Authoritative pipeline & stage metrics
export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const rateCheck = checkRateLimit(`analytics_pipe_${auth.userId}`, 60, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded for analytics", 429, "RATE_LIMIT_EXCEEDED");
  }

  const searchParams = req.nextUrl.searchParams;
  const range = searchParams.get("range");
  const startDateParam = searchParams.get("start_date");
  const endDateParam = searchParams.get("end_date");
  const regionIdParam = searchParams.get("region_id");
  const projectIdParam = searchParams.get("project_id");
  let salespersonIdParam = searchParams.get("salesperson_id");

  if (!MANAGER_ROLES.includes(auth.role)) {
    salespersonIdParam = auth.userId;
  }

  const { startDate, endDate } = parseDateRangeFilter(range, startDateParam, endDateParam);

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiSuccess({
      summary: {
        totalLeads: 12,
        activeLeads: 9,
        wonLeads: 2,
        lostLeads: 1,
        totalPipelineValue: 480000000,
        wonRevenue: 160000000,
        avgDealValue: 80000000,
        avgBudget: 53333333,
        conversionRate: 16.7,
      },
      stages: [
        { slug: "new", name: "New Inflow", sortOrder: 1, color: "#3b82f6", leadCount: 2, stageValue: 56000000, percentage: 16.7 },
        { slug: "contacted", name: "Contacted", sortOrder: 2, color: "#6366f1", leadCount: 2, stageValue: 137000000, percentage: 16.7 },
        { slug: "qualified", name: "Qualified", sortOrder: 3, color: "#8b5cf6", leadCount: 2, stageValue: 93000000, percentage: 16.7 },
        { slug: "site_visit", name: "Site Visit", sortOrder: 4, color: "#ec4899", leadCount: 2, stageValue: 195000000, percentage: 16.7 },
        { slug: "negotiation", name: "Negotiation", sortOrder: 5, color: "#f59e0b", leadCount: 1, stageValue: 95000000, percentage: 8.3 },
        { slug: "won", name: "Won Deals", sortOrder: 6, color: "#10b981", leadCount: 2, stageValue: 160000000, percentage: 16.7 },
        { slug: "lost", name: "Lost", sortOrder: 7, color: "#ef4444", leadCount: 1, stageValue: 160000000, percentage: 8.3 },
      ],
      dealHealth: {
        strongCount: 6,
        neutralCount: 2,
        atRiskCount: 1,
        strongValue: 320000000,
        neutralValue: 65000000,
        atRiskValue: 95000000,
        avgHealthScore: 72.4,
      },
      forecast: {
        currentPipelineValue: 480000000,
        weightedPipelineValue: 236400000,
        wonRevenue: 160000000,
        projectedTotalRevenue: 396400000,
        activeOpportunities: 9,
      },
    });
  }

  try {
    const { data: raw, error } = await supabase.rpc("get_pipeline_analytics", {
      p_org_id: auth.orgId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_salesperson_id: salespersonIdParam || null,
      p_region_id: regionIdParam || null,
      p_project_id: projectIdParam || null,
    });

    if (error) {
      return apiError(error.message || "Failed to fetch pipeline analytics", 500, "DB_ERROR");
    }

    return apiSuccess({
      summary: {
        totalLeads: Number(raw?.summary?.total_leads || 0),
        activeLeads: Number(raw?.summary?.active_leads || 0),
        wonLeads: Number(raw?.summary?.won_leads || 0),
        lostLeads: Number(raw?.summary?.lost_leads || 0),
        totalPipelineValue: Number(raw?.summary?.total_pipeline_value || 0),
        wonRevenue: Number(raw?.summary?.won_revenue || 0),
        avgDealValue: Number(raw?.summary?.avg_deal_value || 0),
        avgBudget: Number(raw?.summary?.avg_budget || 0),
        conversionRate: Number(raw?.summary?.conversion_rate || 0),
      },
      stages: (raw?.stages || []).map((s: any) => ({
        slug: s.slug,
        name: s.name,
        sortOrder: s.sort_order,
        color: s.color,
        leadCount: s.lead_count,
        stageValue: s.stage_value,
        percentage: s.percentage,
      })),
      dealHealth: {
        strongCount: Number(raw?.deal_health?.strong_count || 0),
        neutralCount: Number(raw?.deal_health?.neutral_count || 0),
        atRiskCount: Number(raw?.deal_health?.at_risk_count || 0),
        strongValue: Number(raw?.deal_health?.strong_value || 0),
        neutralValue: Number(raw?.deal_health?.neutral_value || 0),
        atRiskValue: Number(raw?.deal_health?.at_risk_value || 0),
        avgHealthScore: Number(raw?.deal_health?.avg_health_score || 60),
      },
      forecast: {
        currentPipelineValue: Number(raw?.forecast?.current_pipeline_value || 0),
        weightedPipelineValue: Number(raw?.forecast?.weighted_pipeline_value || 0),
        wonRevenue: Number(raw?.forecast?.won_revenue || 0),
        projectedTotalRevenue: Number(raw?.forecast?.projected_total_revenue || 0),
        activeOpportunities: Number(raw?.forecast?.active_opportunities || 0),
      },
    });
  } catch (err: any) {
    return apiError(err.message || "Server error", 500, "SERVER_ERROR");
  }
}
