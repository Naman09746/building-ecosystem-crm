import {
  DateRangePreset,
  ExecutiveDashboardAnalytics,
  PipelineSummaryAnalytics,
  StageDistributionItem,
  RepPerformanceItem,
  TimeSeriesDataPoint,
  PipelineVelocityAnalytics,
  DealHealthSummaryAnalytics,
  ForecastAnalytics,
  SlaSummaryAnalytics,
} from "../../types/analytics";

/**
 * Resolves standard date range presets to UTC start/end timestamps.
 */
export function parseDateRangeFilter(
  preset?: string | null,
  customStart?: string | null,
  customEnd?: string | null,
  now: Date = new Date()
): { startDate: string | null; endDate: string | null } {
  if (customStart && customEnd) {
    const s = new Date(customStart);
    const e = new Date(customEnd);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
      return { startDate: s.toISOString(), endDate: e.toISOString() };
    }
  }

  const range = (preset || "this_month") as DateRangePreset;
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth(); // 0-indexed

  switch (range) {
    case "today": {
      const start = new Date(Date.UTC(currentYear, currentMonth, now.getUTCDate(), 0, 0, 0));
      const end = new Date(Date.UTC(currentYear, currentMonth, now.getUTCDate(), 23, 59, 59, 999));
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    case "last_7_days": {
      const start = new Date(now.getTime() - 7 * 86400000);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    case "last_30_days": {
      const start = new Date(now.getTime() - 30 * 86400000);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    case "last_90_days": {
      const start = new Date(now.getTime() - 90 * 86400000);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    case "this_month": {
      const start = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0));
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    case "last_month": {
      const start = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0));
      const end = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59, 999));
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    case "this_quarter": {
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      const start = new Date(Date.UTC(currentYear, quarterStartMonth, 1, 0, 0, 0));
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    case "last_quarter": {
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3 - 3;
      const start = new Date(Date.UTC(currentYear, quarterStartMonth, 1, 0, 0, 0));
      const end = new Date(Date.UTC(currentYear, quarterStartMonth + 3, 0, 23, 59, 59, 999));
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    case "ytd": {
      const start = new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0));
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    case "all":
    default:
      return { startDate: null, endDate: null };
  }
}

/**
 * Maps raw database snake_case analytics JSON to type-safe camelCase dashboard structures.
 */
export function mapRawDashboardAnalytics(raw: any): ExecutiveDashboardAnalytics {
  const p = raw?.pipeline || {};
  const pipeline: PipelineSummaryAnalytics = {
    totalLeads: Number(p.total_leads || 0),
    activeLeads: Number(p.active_leads || 0),
    wonLeads: Number(p.won_leads || 0),
    lostLeads: Number(p.lost_leads || 0),
    totalPipelineValue: Number(p.total_pipeline_value || 0),
    wonRevenue: Number(p.won_revenue || 0),
    avgDealValue: Number(p.avg_deal_value || 0),
    avgBudget: Number(p.avg_budget || 0),
    conversionRate: Number(p.conversion_rate || 0),
  };

  const stages: StageDistributionItem[] = (raw?.stages || []).map((s: any) => ({
    slug: s.slug || "unknown",
    name: s.name || s.slug,
    sortOrder: Number(s.sort_order || 99),
    color: s.color || "#6366f1",
    leadCount: Number(s.lead_count || 0),
    stageValue: Number(s.stage_value || 0),
    percentage: Number(s.percentage || 0),
  }));

  const dh = raw?.deal_health || {};
  const dealHealth: DealHealthSummaryAnalytics = {
    strongCount: Number(dh.strong_count || 0),
    neutralCount: Number(dh.neutral_count || 0),
    atRiskCount: Number(dh.at_risk_count || 0),
    strongValue: Number(dh.strong_value || 0),
    neutralValue: Number(dh.neutral_value || 0),
    atRiskValue: Number(dh.at_risk_value || 0),
    avgHealthScore: Number(dh.avg_health_score || 60),
  };

  const f = raw?.forecast || {};
  const forecast: ForecastAnalytics = {
    currentPipelineValue: Number(f.current_pipeline_value || 0),
    weightedPipelineValue: Number(f.weighted_pipeline_value || 0),
    wonRevenue: Number(f.won_revenue || 0),
    projectedTotalRevenue: Number(f.projected_total_revenue || 0),
    activeOpportunities: Number(f.active_opportunities || 0),
  };

  const reps: RepPerformanceItem[] = (raw?.reps || []).map((r: any) => ({
    userId: r.user_id,
    name: r.name || "Unknown",
    email: r.email || "",
    role: r.role || "salesperson",
    avatarUrl: r.avatar_url || null,
    regionId: r.region_id || null,
    regionName: r.region_name || "Unassigned",
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

  const timeSeries: TimeSeriesDataPoint[] = (raw?.time_series || []).map((t: any) => ({
    date: t.date,
    label: t.label || t.date,
    leads: Number(t.leads || 0),
    won: Number(t.won || 0),
    lost: Number(t.lost || 0),
    revenue: Number(t.revenue || 0),
    visits: Number(t.visits || 0),
    calls: Number(t.calls || 0),
  }));

  const v = raw?.velocity || {};
  const velocity: PipelineVelocityAnalytics = {
    stages: (v.stages || []).map((vs: any) => ({
      slug: vs.slug || "unknown",
      name: vs.name || vs.slug,
      sortOrder: Number(vs.sort_order || 99),
      color: vs.color || "#6366f1",
      count: Number(vs.count || 0),
      value: Number(vs.value || 0),
      avgDaysInStage: Number(vs.avg_days_in_stage || 0),
      conversionPct: Number(vs.conversion_pct || 0),
    })),
    avgSalesCycleDays: Number(v.avg_sales_cycle_days || 0),
    wonDealsEvaluated: Number(v.won_deals_evaluated || 0),
    totalLeadsEvaluated: Number(v.total_leads_evaluated || 0),
  };

  const s = raw?.sla || {};
  const sla: SlaSummaryAnalytics = {
    totalTasks: Number(s.total_tasks || 0),
    upcomingTasks: Number(s.upcoming_tasks || 0),
    dueTodayTasks: Number(s.due_today_tasks || 0),
    overdueTasks: Number(s.overdue_tasks || 0),
    completedTasks: Number(s.completed_tasks || 0),
    overduePercentage: Number(s.overdue_percentage || 0),
    slaCompliancePercentage: Number(s.sla_compliance_percentage || 100),
  };

  return {
    pipeline,
    stages,
    dealHealth,
    forecast,
    reps,
    timeSeries,
    velocity,
    sla,
  };
}
