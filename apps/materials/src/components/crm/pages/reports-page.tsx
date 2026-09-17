"use client";

import * as React from "react";
import {
  ChartNoAxesCombined,
  Download,
  Calendar,
  Filter,
  Award,
  Target,
  FileSpreadsheet,
  CheckCircle2,
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { useCRM } from "@repo/core/context/crm-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { Badge } from "@repo/ui/components/badge";
import { formatCurrencyINR } from "@repo/core/lib/utils";
import { AreaTrendChart } from "@/components/crm/charts/area-trend-chart";
import { ConversionFunnel } from "@/components/crm/charts/conversion-funnel";
import { CircularProgress } from "@/components/crm/charts/circular-progress";
import { ActivityHeatmap } from "@/components/crm/charts/activity-heatmap";
import { ExecutiveDashboardAnalytics } from "@repo/core/types/analytics";
import { toast } from "sonner";

export function ReportsPage() {
  const { dateRange, setDateRange } = useCRM();
  const [exporting, setExporting] = React.useState(false);
  const [exported, setExported] = React.useState(false);
  const [analytics, setAnalytics] = React.useState<ExecutiveDashboardAnalytics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchAnalytics = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/dashboard?range=${dateRange}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load analytics");
      }
      setAnalytics(json.data);
    } catch (err: any) {
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  React.useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExport = async (type: "analytics" | "leads" = "analytics") => {
    setExporting(true);
    try {
      const endpoint = type === "analytics" ? `/api/reports/export?range=${dateRange}` : "/api/leads/export";
      const res = await fetch(endpoint);
      if (!res.ok) {
        toast.error("Failed to generate export file");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        type === "analytics"
          ? `ecosystemrealty-analytics-report-${new Date().toISOString().slice(0, 10)}.csv`
          : `ecosystemrealty-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setExported(true);
      toast.success("CSV export downloaded successfully");
      setTimeout(() => setExported(false), 3000);
    } catch {
      toast.error("Network error during CSV export");
    } finally {
      setExporting(false);
    }
  };

  // Convert server velocity stages to ConversionFunnel format
  const funnelStages = React.useMemo(() => {
    if (!analytics?.velocity?.stages || analytics.velocity.stages.length === 0) {
      return [
        { name: "Total Inflow", count: analytics?.pipeline?.totalLeads || 0, value: analytics?.pipeline?.totalPipelineValue || 0, conversionPct: 100, color: "bg-slate-800" },
        { name: "Deals Won", count: analytics?.pipeline?.wonLeads || 0, value: analytics?.pipeline?.wonRevenue || 0, conversionPct: analytics?.pipeline?.conversionRate || 0, color: "bg-emerald-600" },
      ];
    }
    const maxCount = analytics.velocity.stages[0]?.count || 1;
    return analytics.velocity.stages.map((st, idx, arr) => {
      const prevCount = idx === 0 ? maxCount : arr[idx - 1].count;
      const dropOffPct = prevCount > 0 ? Number((((prevCount - st.count) / prevCount) * 100).toFixed(1)) : 0;
      return {
        name: st.name,
        count: st.count,
        value: st.value,
        conversionPct: st.conversionPct,
        color: st.slug === "won" ? "bg-emerald-600" : st.slug === "lost" ? "bg-rose-600" : "bg-primary",
        dropOffPct: dropOffPct > 0 ? dropOffPct : undefined,
      };
    });
  }, [analytics]);

  // Convert time series data to AreaTrendChart format
  const trendData = React.useMemo(() => {
    if (!analytics?.timeSeries || analytics.timeSeries.length === 0) {
      return [];
    }
    return analytics.timeSeries.map((t) => ({
      label: t.label,
      leads: t.leads,
      visits: t.visits,
      deals: t.won,
    }));
  }, [analytics]);

  // Regional breakdown derived from rep metrics
  const regionalHubs = React.useMemo(() => {
    if (!analytics?.reps || analytics.reps.length === 0) return [];
    const map = new Map<string, { name: string; leads: number; value: number; won: number }>();
    analytics.reps.forEach((rep) => {
      const hub = rep.regionName || "General Hub";
      const existing = map.get(hub) || { name: hub, leads: 0, value: 0, won: 0 };
      existing.leads += rep.activeLeads;
      existing.value += rep.activePipelineValue;
      existing.won += rep.wonLeads;
      map.set(hub, existing);
    });
    const colors = ["#0f172a", "#2563eb", "#059669", "#d97706", "#7c3aed"];
    return Array.from(map.values()).map((h, i) => ({
      ...h,
      quotaPct: Math.min(100, Math.max(10, Math.round((h.won / Math.max(1, h.leads)) * 100) + 40)),
      color: colors[i % colors.length],
    }));
  }, [analytics]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Page Header with Export / Date Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <ChartNoAxesCombined className="h-5 w-5 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Executive Analytics & Pipeline Intelligence
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Authoritative, database-aggregated operational metrics and sales team performance.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="h-8 px-2.5 rounded-md border border-border bg-card text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="today">Today</option>
            <option value="last_7_days">Last 7 Days</option>
            <option value="last_30_days">Last 30 Days</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="last_quarter">Last Quarter</option>
            <option value="ytd">Year-to-Date</option>
            <option value="all">All Time</option>
          </select>

          <Button
            size="sm"
            variant="outline"
            onClick={fetchAnalytics}
            disabled={loading}
            className="h-8 text-xs font-semibold gap-1.5"
            title="Refresh analytics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleExport("leads")}
            disabled={exporting}
            className="h-8 text-xs font-semibold gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Leads</span>
          </Button>

          <Button
            size="sm"
            onClick={() => handleExport("analytics")}
            disabled={exporting}
            className="h-8 text-xs font-semibold gap-1.5"
          >
            {exported ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                <span>Downloaded</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Export Report</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={fetchAnalytics} className="h-7 text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Row 0: Authoritative Pipeline KPI Scorecard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl border border-border bg-card shadow-subtle space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground block">Active Pipeline</span>
          <span className="text-xl font-bold font-mono text-foreground">
            {loading ? "..." : analytics?.pipeline?.activeLeads ?? 0}
          </span>
          <span className="text-[10px] text-muted-foreground block">
            Val: {formatCurrencyINR(analytics?.pipeline?.totalPipelineValue || 0)}
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card shadow-subtle space-y-1">
          <span className="text-[11px] font-semibold text-emerald-700 block">Won Revenue</span>
          <span className="text-xl font-bold font-mono text-emerald-800">
            {loading ? "..." : formatCurrencyINR(analytics?.pipeline?.wonRevenue || 0)}
          </span>
          <span className="text-[10px] text-muted-foreground block">
            {analytics?.pipeline?.wonLeads ?? 0} closed deals
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card shadow-subtle space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground block">Conversion Rate</span>
          <span className="text-xl font-bold font-mono text-foreground">
            {loading ? "..." : `${analytics?.pipeline?.conversionRate ?? 0}%`}
          </span>
          <span className="text-[10px] text-muted-foreground block">Lead-to-Won ratio</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card shadow-subtle space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground block">Avg Deal Size</span>
          <span className="text-xl font-bold font-mono text-foreground">
            {loading ? "..." : formatCurrencyINR(analytics?.pipeline?.avgDealValue || 0)}
          </span>
          <span className="text-[10px] text-muted-foreground block">Per closed token</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card shadow-subtle space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground block">Projected Revenue</span>
          <span className="text-xl font-bold font-mono text-foreground">
            {loading ? "..." : formatCurrencyINR(analytics?.forecast?.projectedTotalRevenue || 0)}
          </span>
          <span className="text-[10px] text-muted-foreground block">Weighted forecast</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card shadow-subtle space-y-1">
          <span className="text-[11px] font-semibold text-amber-700 block">SLA Compliance</span>
          <span className="text-xl font-bold font-mono text-foreground">
            {loading ? "..." : `${analytics?.sla?.slaCompliancePercentage ?? 100}%`}
          </span>
          <span className="text-[10px] text-rose-600 block">
            {analytics?.sla?.overdueTasks ?? 0} overdue tasks
          </span>
        </div>
      </div>

      {/* Row 1: Pipeline Conversion Funnel & Lead Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 p-5 rounded-xl border border-border bg-card shadow-subtle space-y-4">
          <ConversionFunnel
            stages={funnelStages}
            overallConversionPct={analytics?.pipeline?.conversionRate}
          />
        </div>

        <div className="lg:col-span-6 p-5 rounded-xl border border-border bg-card shadow-subtle space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Inflow & Velocity Telemetry</h3>
              <p className="text-xs text-muted-foreground">Historical lead inflow vs physical site visits</p>
            </div>
            <Badge variant="secondary" className="text-[10px] font-mono">Server Aggregation</Badge>
          </div>
          <AreaTrendChart data={trendData.length > 0 ? trendData : undefined} />
        </div>
      </div>

      {/* Row 2: Regional Performance & Activity Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Regional Hub Distribution */}
        <div className="lg:col-span-5 p-5 rounded-xl border border-border bg-card shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Regional Target Execution</h3>
              <p className="text-xs text-muted-foreground">Active pipeline distribution across territory hubs</p>
            </div>
            <Target className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="space-y-3">
            {regionalHubs.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground bg-secondary/30 rounded-lg">
                No regional data available for this date filter.
              </div>
            ) : (
              regionalHubs.map((hub) => (
                <div
                  key={hub.name}
                  className="p-3 rounded-lg border border-border bg-secondary/30 flex items-center justify-between gap-3 text-xs"
                >
                  <CircularProgress
                    value={hub.quotaPct}
                    size={52}
                    strokeWidth={4.5}
                    color={hub.color}
                    label={hub.name}
                    sublabel={`${hub.leads} active leads`}
                  />
                  <div className="text-right">
                    <div className="font-bold text-foreground font-mono">{formatCurrencyINR(hub.value)}</div>
                    <div className="text-[10px] text-muted-foreground">{hub.won} won deals</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Deal Health & SLA Matrix */}
        <div className="lg:col-span-7 p-5 rounded-xl border border-border bg-card shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Deal Health & Risk Distribution</h3>
              <p className="text-xs text-muted-foreground">Deterministic deal health metrics (Phase 8 Engine)</p>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              Avg Health: {analytics?.dealHealth?.avgHealthScore ?? 60}/100
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-1">
              <span className="text-[10px] font-bold uppercase text-emerald-800 block">Strong Velocity</span>
              <span className="text-xl font-bold font-mono text-emerald-800">
                {analytics?.dealHealth?.strongCount ?? 0}
              </span>
              <span className="text-[10px] text-muted-foreground block font-mono">
                {formatCurrencyINR(analytics?.dealHealth?.strongValue || 0)}
              </span>
            </div>

            <div className="p-3 rounded-lg border border-border bg-secondary/30 space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Neutral / Standard</span>
              <span className="text-xl font-bold font-mono text-foreground">
                {analytics?.dealHealth?.neutralCount ?? 0}
              </span>
              <span className="text-[10px] text-muted-foreground block font-mono">
                {formatCurrencyINR(analytics?.dealHealth?.neutralValue || 0)}
              </span>
            </div>

            <div className="p-3 rounded-lg border border-red-200 bg-red-50/40 dark:bg-red-950/20 space-y-1">
              <span className="text-[10px] font-bold uppercase text-red-800 block">At Risk</span>
              <span className="text-xl font-bold font-mono text-red-800">
                {analytics?.dealHealth?.atRiskCount ?? 0}
              </span>
              <span className="text-[10px] text-muted-foreground block font-mono">
                {formatCurrencyINR(analytics?.dealHealth?.atRiskValue || 0)}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <ActivityHeatmap />
          </div>
        </div>
      </div>

      {/* Row 3: Live Sales Rep Leaderboard & SLA Compliance Scorecard */}
      <div className="p-5 rounded-xl border border-border bg-card shadow-subtle space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              Sales Representative Performance & SLA Compliance Scorecard
            </h3>
            <p className="text-xs text-muted-foreground">
              Authoritative rep telemetry: calls, visits, won revenue, conversion rate, and task SLA compliance.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {analytics?.reps?.length || 0} Reps Active
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground uppercase text-[10px] font-bold text-left">
                <th className="pb-2.5 pl-2">Rank & Rep</th>
                <th className="pb-2.5">Region Hub</th>
                <th className="pb-2.5">Assigned</th>
                <th className="pb-2.5">Calls Logged</th>
                <th className="pb-2.5">Site Visits</th>
                <th className="pb-2.5">Follow-up SLA</th>
                <th className="pb-2.5">Won Deals</th>
                <th className="pb-2.5">Conv. Rate</th>
                <th className="pb-2.5 pr-2 text-right">Total Won Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {!analytics?.reps || analytics.reps.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-muted-foreground">
                    No sales representative performance data found.
                  </td>
                </tr>
              ) : (
                analytics.reps.map((rep, idx) => (
                  <tr key={rep.userId} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-3 pl-2 font-semibold text-foreground flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary border border-border text-[10px] font-bold">
                        #{idx + 1}
                      </span>
                      <span>{rep.name}</span>
                    </td>
                    <td className="py-3 text-muted-foreground">{rep.regionName}</td>
                    <td className="py-3 font-mono font-medium">{rep.totalAssigned}</td>
                    <td className="py-3 font-mono font-medium">{rep.callsCount}</td>
                    <td className="py-3 font-mono font-semibold text-amber-800">{rep.siteVisitsCount}</td>
                    <td className="py-3 font-mono font-bold text-emerald-700">
                      {rep.slaComplianceRate}%
                    </td>
                    <td className="py-3 font-mono font-bold text-emerald-800">{rep.wonLeads}</td>
                    <td className="py-3 font-mono font-bold text-foreground">{rep.conversionRate}%</td>
                    <td className="py-3 pr-2 text-right font-mono font-bold text-foreground">
                      {formatCurrencyINR(rep.wonRevenue)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
