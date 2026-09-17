import { NextRequest } from "next/server";
import { apiSuccess, apiError, checkRateLimit } from "@repo/core/lib/server/api-security";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
  MANAGER_ROLES,
} from "@repo/core/lib/server/supabase-server";
import { parseDateRangeFilter, mapRawDashboardAnalytics } from "@repo/core/lib/server/analytics";

// GET /api/analytics/dashboard - Authoritative executive dashboard analytics
export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const rateCheck = checkRateLimit(`analytics_dash_${auth.userId}`, 60, 60000);
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

  // RBAC: Salespeople are strictly scoped to their own data
  if (!MANAGER_ROLES.includes(auth.role)) {
    salespersonIdParam = auth.userId;
  }

  const { startDate, endDate } = parseDateRangeFilter(range, startDateParam, endDateParam);

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    // Return structured default schema for offline / simulated environment
    const rawDefault = {
      pipeline: {
        total_leads: 12,
        active_leads: 9,
        won_leads: 2,
        lost_leads: 1,
        total_pipeline_value: 480000000,
        won_revenue: 160000000,
        avg_deal_value: 80000000,
        avg_budget: 53333333,
        conversion_rate: 16.7,
      },
      stages: [
        { slug: "new", name: "New Inflow", sort_order: 1, color: "#3b82f6", lead_count: 2, stage_value: 56000000, percentage: 16.7 },
        { slug: "contacted", name: "Contacted", sort_order: 2, color: "#6366f1", lead_count: 2, stage_value: 137000000, percentage: 16.7 },
        { slug: "qualified", name: "Qualified", sort_order: 3, color: "#8b5cf6", lead_count: 2, stage_value: 93000000, percentage: 16.7 },
        { slug: "site_visit", name: "Site Visit", sort_order: 4, color: "#ec4899", lead_count: 2, stage_value: 195000000, percentage: 16.7 },
        { slug: "negotiation", name: "Negotiation", sort_order: 5, color: "#f59e0b", lead_count: 1, stage_value: 95000000, percentage: 8.3 },
        { slug: "won", name: "Won Deals", sort_order: 6, color: "#10b981", lead_count: 2, stage_value: 160000000, percentage: 16.7 },
        { slug: "lost", name: "Lost", sort_order: 7, color: "#ef4444", lead_count: 1, stage_value: 160000000, percentage: 8.3 },
      ],
      deal_health: {
        strong_count: 6,
        neutral_count: 2,
        at_risk_count: 1,
        strong_value: 320000000,
        neutral_value: 65000000,
        at_risk_value: 95000000,
        avg_health_score: 72.4,
      },
      forecast: {
        current_pipeline_value: 480000000,
        weighted_pipeline_value: 236400000,
        won_revenue: 160000000,
        projected_total_revenue: 396400000,
        active_opportunities: 9,
      },
      reps: [
        {
          user_id: auth.userId,
          name: auth.fullName || "Rahul Sharma",
          email: auth.email,
          role: auth.role,
          avatar_url: null,
          region_id: null,
          region_name: "Gurgaon Hub",
          total_assigned: 12,
          active_leads: 9,
          won_leads: 2,
          lost_leads: 1,
          conversion_rate: 16.7,
          active_pipeline_value: 480000000,
          won_revenue: 160000000,
          avg_deal_value: 80000000,
          avg_days_to_won: 14.5,
          calls_count: 42,
          site_visits_count: 8,
          meetings_count: 5,
          tasks_total: 15,
          tasks_completed: 13,
          tasks_overdue: 2,
          sla_compliance_rate: 86.7,
        },
      ],
      time_series: [
        { date: "2026-08-16", label: "16 Aug", leads: 3, won: 0, lost: 0, revenue: 0, visits: 1, calls: 8 },
        { date: "2026-08-17", label: "17 Aug", leads: 4, won: 1, lost: 0, revenue: 90000000, visits: 2, calls: 12 },
        { date: "2026-08-18", label: "18 Aug", leads: 2, won: 0, lost: 0, revenue: 0, visits: 1, calls: 7 },
        { date: "2026-08-19", label: "19 Aug", leads: 5, won: 0, lost: 1, revenue: 0, visits: 3, calls: 14 },
        { date: "2026-08-20", label: "20 Aug", leads: 3, won: 1, lost: 0, revenue: 70000000, visits: 2, calls: 9 },
        { date: "2026-08-21", label: "21 Aug", leads: 6, won: 0, lost: 0, revenue: 0, visits: 4, calls: 16 },
        { date: "2026-08-22", label: "22 Aug", leads: 4, won: 0, lost: 0, revenue: 0, visits: 2, calls: 11 },
      ],
      velocity: {
        stages: [
          { slug: "new", name: "New Inflow", sort_order: 1, color: "#3b82f6", count: 2, value: 56000000, avg_days_in_stage: 1.2, conversion_pct: 16.7 },
          { slug: "contacted", name: "Contacted", sort_order: 2, color: "#6366f1", count: 2, value: 137000000, avg_days_in_stage: 3.4, conversion_pct: 16.7 },
          { slug: "qualified", name: "Qualified", sort_order: 3, color: "#8b5cf6", count: 2, value: 93000000, avg_days_in_stage: 4.1, conversion_pct: 16.7 },
          { slug: "site_visit", name: "Site Visit", sort_order: 4, color: "#ec4899", count: 2, value: 195000000, avg_days_in_stage: 5.8, conversion_pct: 16.7 },
          { slug: "negotiation", name: "Negotiation", sort_order: 5, color: "#f59e0b", count: 1, value: 95000000, avg_days_in_stage: 7.2, conversion_pct: 8.3 },
          { slug: "won", name: "Won Deals", sort_order: 6, color: "#10b981", count: 2, value: 160000000, avg_days_in_stage: 14.5, conversion_pct: 16.7 },
        ],
        avg_sales_cycle_days: 14.5,
        won_deals_evaluated: 2,
        total_leads_evaluated: 12,
      },
      sla: {
        total_tasks: 15,
        upcoming_tasks: 8,
        due_today_tasks: 5,
        overdue_tasks: 2,
        completed_tasks: 13,
        overdue_percentage: 13.3,
        sla_compliance_percentage: 86.7,
      },
    };
    return apiSuccess(mapRawDashboardAnalytics(rawDefault));
  }

  try {
    const { data: rawData, error } = await supabase.rpc("get_executive_dashboard_analytics", {
      p_org_id: auth.orgId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_salesperson_id: salespersonIdParam || null,
      p_region_id: regionIdParam || null,
      p_project_id: projectIdParam || null,
    });

    if (error) {
      return apiError(error.message || "Failed to execute dashboard analytics RPC", 500, "DB_ERROR");
    }

    return apiSuccess(mapRawDashboardAnalytics(rawData));
  } catch (err: any) {
    return apiError(err.message || "Server error while fetching analytics", 500, "SERVER_ERROR");
  }
}
