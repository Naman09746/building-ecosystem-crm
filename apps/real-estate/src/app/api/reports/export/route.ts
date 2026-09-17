import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  checkRateLimit,
} from "@repo/core/lib/server/api-security";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
  MANAGER_ROLES,
} from "@repo/core/lib/server/supabase-server";
import { parseDateRangeFilter, mapRawDashboardAnalytics } from "@repo/core/lib/server/analytics";

function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// GET /api/reports/export - Authoritative database-driven multi-section CSV analytics export
export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const rateCheck = checkRateLimit(`export_rep_${auth.userId}`, 10, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded for reports export", 429, "RATE_LIMIT_EXCEEDED");
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
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const { data: raw, error } = await supabase.rpc("get_executive_dashboard_analytics", {
      p_org_id: auth.orgId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_salesperson_id: salespersonIdParam || null,
      p_region_id: regionIdParam || null,
      p_project_id: projectIdParam || null,
    });

    if (error) {
      return apiError(error.message || "Failed to generate server analytics report", 500, "DB_ERROR");
    }

    const data = mapRawDashboardAnalytics(raw);

    // Generate comprehensive multi-section CSV report
    const lines: string[] = [];
    lines.push(`Ecosystem Realty Executive & Operational Analytics Report`);
    lines.push(`Generated At,${new Date().toISOString()}`);
    lines.push(`Organization ID,${auth.orgId}`);
    lines.push(`Reporting Period,${range || "This Month"}${startDate ? ` (${startDate.slice(0, 10)} to ${(endDate || new Date().toISOString()).slice(0, 10)})` : ""}`);
    lines.push(``);

    // SECTION 1: EXECUTIVE PIPELINE SUMMARY
    lines.push(`SECTION 1: EXECUTIVE PIPELINE SUMMARY`);
    lines.push(`Metric,Value`);
    lines.push(`Total Leads Inflow,${data.pipeline.totalLeads}`);
    lines.push(`Active Pipeline Deals,${data.pipeline.activeLeads}`);
    lines.push(`Won Closed Deals,${data.pipeline.wonLeads}`);
    lines.push(`Lost Deals,${data.pipeline.lostLeads}`);
    lines.push(`Overall Conversion Rate,${data.pipeline.conversionRate}%`);
    lines.push(`Active Pipeline Value (INR),${data.pipeline.totalPipelineValue}`);
    lines.push(`Won Revenue (INR),${data.pipeline.wonRevenue}`);
    lines.push(`Average Deal Size (INR),${data.pipeline.avgDealValue}`);
    lines.push(`Average Buyer Budget (INR),${data.pipeline.avgBudget}`);
    lines.push(`Projected Total Revenue (Weighted),${data.forecast.projectedTotalRevenue}`);
    lines.push(``);

    // SECTION 2: STAGE DISTRIBUTION & FUNNEL
    lines.push(`SECTION 2: PIPELINE STAGE DISTRIBUTION`);
    lines.push(`Order,Stage Name,Slug,Lead Count,Stage Value (INR),Share (%)`);
    data.stages.forEach((stage) => {
      lines.push(
        `${stage.sortOrder},${escapeCsvField(stage.name)},${escapeCsvField(stage.slug)},${stage.leadCount},${stage.stageValue},${stage.percentage}%`
      );
    });
    lines.push(``);

    // SECTION 3: SALES REPRESENTATIVE PERFORMANCE & SLA COMPLIANCE
    lines.push(`SECTION 3: SALES REPRESENTATIVE PERFORMANCE`);
    lines.push(`Representative,Role,Region Hub,Assigned Leads,Active Leads,Won Deals,Conv Rate (%),Won Revenue (INR),Active Pipeline (INR),Calls,Site Visits,Completed Tasks,Overdue Tasks,SLA Adherence (%)`);
    data.reps.forEach((rep) => {
      lines.push(
        `${escapeCsvField(rep.name)},${escapeCsvField(rep.role)},${escapeCsvField(rep.regionName)},${rep.totalAssigned},${rep.activeLeads},${rep.wonLeads},${rep.conversionRate}%,${rep.wonRevenue},${rep.activePipelineValue},${rep.callsCount},${rep.siteVisitsCount},${rep.tasksCompleted},${rep.tasksOverdue},${rep.slaComplianceRate}%`
      );
    });
    lines.push(``);

    // SECTION 4: DEAL HEALTH & RISK INTELLIGENCE
    lines.push(`SECTION 4: DEAL HEALTH & RISK INTELLIGENCE`);
    lines.push(`Health Category,Deals Count,Pipeline Value (INR),Average Health Score`);
    lines.push(`Strong,${data.dealHealth.strongCount},${data.dealHealth.strongValue},${data.dealHealth.avgHealthScore}`);
    lines.push(`Neutral,${data.dealHealth.neutralCount},${data.dealHealth.neutralValue},-`);
    lines.push(`At Risk,${data.dealHealth.atRiskCount},${data.dealHealth.atRiskValue},-`);
    lines.push(``);

    // SECTION 5: SLA COMPLIANCE SUMMARY
    lines.push(`SECTION 5: SLA COMPLIANCE SUMMARY`);
    lines.push(`Total Tasks,Upcoming,Due Today,Overdue,Completed,SLA Compliance Rate (%)`);
    lines.push(
      `${data.sla.totalTasks},${data.sla.upcomingTasks},${data.sla.dueTodayTasks},${data.sla.overdueTasks},${data.sla.completedTasks},${data.sla.slaCompliancePercentage}%`
    );

    const csvContent = lines.join("\r\n");
    const filename = `ecosystemrealty-analytics-report-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err: any) {
    return apiError(err.message || "Failed to generate analytics report", 500, "SERVER_ERROR");
  }
}
