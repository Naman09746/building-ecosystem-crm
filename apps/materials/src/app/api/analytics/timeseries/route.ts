import { NextRequest } from "next/server";
import { apiSuccess, apiError, checkRateLimit } from "@repo/core/lib/server/api-security";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
  MANAGER_ROLES,
} from "@repo/core/lib/server/supabase-server";
import { parseDateRangeFilter } from "@repo/core/lib/server/analytics";

// GET /api/analytics/timeseries - Time-series trend telemetry
export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const rateCheck = checkRateLimit(`analytics_ts_${auth.userId}`, 60, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded for analytics", 429, "RATE_LIMIT_EXCEEDED");
  }

  const searchParams = req.nextUrl.searchParams;
  const range = searchParams.get("range");
  const interval = searchParams.get("interval") || "day";
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
    return apiSuccess([
      { date: "2026-08-16", label: "16 Aug", leads: 3, won: 0, lost: 0, revenue: 0, visits: 1, calls: 8 },
      { date: "2026-08-17", label: "17 Aug", leads: 4, won: 1, lost: 0, revenue: 90000000, visits: 2, calls: 12 },
      { date: "2026-08-18", label: "18 Aug", leads: 2, won: 0, lost: 0, revenue: 0, visits: 1, calls: 7 },
      { date: "2026-08-19", label: "19 Aug", leads: 5, won: 0, lost: 1, revenue: 0, visits: 3, calls: 14 },
      { date: "2026-08-20", label: "20 Aug", leads: 3, won: 1, lost: 0, revenue: 70000000, visits: 2, calls: 9 },
      { date: "2026-08-21", label: "21 Aug", leads: 6, won: 0, lost: 0, revenue: 0, visits: 4, calls: 16 },
      { date: "2026-08-22", label: "22 Aug", leads: 4, won: 0, lost: 0, revenue: 0, visits: 2, calls: 11 },
    ]);
  }

  try {
    const { data: raw, error } = await supabase.rpc("get_time_series_analytics", {
      p_org_id: auth.orgId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_interval: interval,
      p_salesperson_id: salespersonIdParam || null,
      p_region_id: regionIdParam || null,
      p_project_id: projectIdParam || null,
    });

    if (error) {
      return apiError(error.message || "Failed to fetch time series", 500, "DB_ERROR");
    }

    const series = (raw || []).map((t: any) => ({
      date: t.date,
      label: t.label,
      leads: Number(t.leads || 0),
      won: Number(t.won || 0),
      lost: Number(t.lost || 0),
      revenue: Number(t.revenue || 0),
      visits: Number(t.visits || 0),
      calls: Number(t.calls || 0),
    }));

    return apiSuccess(series);
  } catch (err: any) {
    return apiError(err.message || "Server error", 500, "SERVER_ERROR");
  }
}
