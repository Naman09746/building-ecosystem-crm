export type DateRangePreset =
  | "today"
  | "last_7_days"
  | "last_30_days"
  | "last_90_days"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "last_quarter"
  | "ytd"
  | "all"
  | "custom";

export interface PipelineSummaryAnalytics {
  totalLeads: number;
  activeLeads: number;
  wonLeads: number;
  lostLeads: number;
  totalPipelineValue: number;
  wonRevenue: number;
  avgDealValue: number;
  avgBudget: number;
  conversionRate: number;
}

export interface StageDistributionItem {
  slug: string;
  name: string;
  sortOrder: number;
  color: string;
  leadCount: number;
  stageValue: number;
  percentage: number;
}

export interface RepPerformanceItem {
  userId: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  regionId: string | null;
  regionName: string;
  totalAssigned: number;
  activeLeads: number;
  wonLeads: number;
  lostLeads: number;
  conversionRate: number;
  activePipelineValue: number;
  wonRevenue: number;
  avgDealValue: number;
  avgDaysToWon: number;
  callsCount: number;
  siteVisitsCount: number;
  meetingsCount: number;
  tasksTotal: number;
  tasksCompleted: number;
  tasksOverdue: number;
  slaComplianceRate: number;
}

export interface TimeSeriesDataPoint {
  date: string;
  label: string;
  leads: number;
  won: number;
  lost: number;
  revenue: number;
  visits: number;
  calls: number;
}

export interface PipelineVelocityStageItem {
  slug: string;
  name: string;
  sortOrder: number;
  color: string;
  count: number;
  value: number;
  avgDaysInStage: number;
  conversionPct: number;
}

export interface PipelineVelocityAnalytics {
  stages: PipelineVelocityStageItem[];
  avgSalesCycleDays: number;
  wonDealsEvaluated: number;
  totalLeadsEvaluated: number;
}

export interface DealHealthSummaryAnalytics {
  strongCount: number;
  neutralCount: number;
  atRiskCount: number;
  strongValue: number;
  neutralValue: number;
  atRiskValue: number;
  avgHealthScore: number;
}

export interface SlaSummaryAnalytics {
  totalTasks: number;
  upcomingTasks: number;
  dueTodayTasks: number;
  overdueTasks: number;
  completedTasks: number;
  overduePercentage: number;
  slaCompliancePercentage: number;
}

export interface ForecastAnalytics {
  currentPipelineValue: number;
  weightedPipelineValue: number;
  wonRevenue: number;
  projectedTotalRevenue: number;
  activeOpportunities: number;
}

export interface ExecutiveDashboardAnalytics {
  pipeline: PipelineSummaryAnalytics;
  stages: StageDistributionItem[];
  dealHealth: DealHealthSummaryAnalytics;
  forecast: ForecastAnalytics;
  reps: RepPerformanceItem[];
  timeSeries: TimeSeriesDataPoint[];
  velocity: PipelineVelocityAnalytics;
  sla: SlaSummaryAnalytics;
}
