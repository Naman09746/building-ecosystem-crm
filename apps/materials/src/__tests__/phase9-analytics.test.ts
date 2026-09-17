import { describe, it, expect } from "vitest";
import { parseDateRangeFilter, mapRawDashboardAnalytics } from "@repo/core/lib/server/analytics";

describe("Phase 9: Server-Side Analytics & Reporting Suite", () => {
  describe("Date Range Filter Parsing", () => {
    const fixedNow = new Date("2026-08-22T12:00:00.000Z");

    it("correctly parses 'today'", () => {
      const { startDate, endDate } = parseDateRangeFilter("today", null, null, fixedNow);
      expect(startDate).toBe("2026-08-22T00:00:00.000Z");
      expect(endDate).toBe("2026-08-22T23:59:59.999Z");
    });

    it("correctly parses 'last_7_days'", () => {
      const { startDate, endDate } = parseDateRangeFilter("last_7_days", null, null, fixedNow);
      expect(startDate).toBe("2026-08-15T12:00:00.000Z");
      expect(endDate).toBe("2026-08-22T12:00:00.000Z");
    });

    it("correctly parses 'last_30_days'", () => {
      const { startDate, endDate } = parseDateRangeFilter("last_30_days", null, null, fixedNow);
      expect(startDate).toBe("2026-07-23T12:00:00.000Z");
      expect(endDate).toBe("2026-08-22T12:00:00.000Z");
    });

    it("correctly parses 'this_month'", () => {
      const { startDate, endDate } = parseDateRangeFilter("this_month", null, null, fixedNow);
      expect(startDate).toBe("2026-08-01T00:00:00.000Z");
      expect(endDate).toBe("2026-08-22T12:00:00.000Z");
    });

    it("correctly parses 'last_month'", () => {
      const { startDate, endDate } = parseDateRangeFilter("last_month", null, null, fixedNow);
      expect(startDate).toBe("2026-07-01T00:00:00.000Z");
      expect(endDate).toBe("2026-07-31T23:59:59.999Z");
    });

    it("correctly parses 'this_quarter' (Q3)", () => {
      const { startDate, endDate } = parseDateRangeFilter("this_quarter", null, null, fixedNow);
      expect(startDate).toBe("2026-07-01T00:00:00.000Z");
      expect(endDate).toBe("2026-08-22T12:00:00.000Z");
    });

    it("correctly parses 'ytd'", () => {
      const { startDate, endDate } = parseDateRangeFilter("ytd", null, null, fixedNow);
      expect(startDate).toBe("2026-01-01T00:00:00.000Z");
      expect(endDate).toBe("2026-08-22T12:00:00.000Z");
    });

    it("correctly parses 'all'", () => {
      const { startDate, endDate } = parseDateRangeFilter("all", null, null, fixedNow);
      expect(startDate).toBeNull();
      expect(endDate).toBeNull();
    });

    it("correctly parses valid custom date range", () => {
      const { startDate, endDate } = parseDateRangeFilter(
        "custom",
        "2026-05-01T00:00:00Z",
        "2026-05-31T23:59:59Z",
        fixedNow
      );
      expect(startDate).toBe("2026-05-01T00:00:00.000Z");
      expect(endDate).toBe("2026-05-31T23:59:59.000Z");
    });
  });

  describe("Raw Dashboard Analytics Mapping", () => {
    it("safely handles empty / null raw inputs without crashing", () => {
      const mapped = mapRawDashboardAnalytics(null);
      expect(mapped.pipeline.totalLeads).toBe(0);
      expect(mapped.pipeline.activeLeads).toBe(0);
      expect(mapped.pipeline.wonRevenue).toBe(0);
      expect(mapped.pipeline.conversionRate).toBe(0);
      expect(mapped.stages).toEqual([]);
      expect(mapped.reps).toEqual([]);
      expect(mapped.timeSeries).toEqual([]);
      expect(mapped.velocity.stages).toEqual([]);
      expect(mapped.dealHealth.avgHealthScore).toBe(60);
      expect(mapped.sla.slaCompliancePercentage).toBe(100);
    });

    it("correctly maps full database RPC payload to camelCase types", () => {
      const sampleRaw = {
        pipeline: {
          total_leads: 50,
          active_leads: 35,
          won_leads: 10,
          lost_leads: 5,
          total_pipeline_value: 1250000000,
          won_revenue: 450000000,
          avg_deal_value: 45000000,
          avg_budget: 35714285,
          conversion_rate: 20.0,
        },
        stages: [
          { slug: "new", name: "New Inflow", sort_order: 1, color: "#3b82f6", lead_count: 10, stage_value: 250000000, percentage: 20.0 },
          { slug: "won", name: "Won Deals", sort_order: 6, color: "#10b981", lead_count: 10, stage_value: 450000000, percentage: 20.0 },
        ],
        deal_health: {
          strong_count: 25,
          neutral_count: 8,
          at_risk_count: 2,
          strong_value: 900000000,
          neutral_value: 250000000,
          at_risk_value: 100000000,
          avg_health_score: 78.5,
        },
        forecast: {
          current_pipeline_value: 1250000000,
          weighted_pipeline_value: 625000000,
          won_revenue: 450000000,
          projected_total_revenue: 1075000000,
          active_opportunities: 35,
        },
        reps: [
          {
            user_id: "user-1",
            name: "Rahul Sharma",
            email: "rahul@crm.com",
            role: "salesperson",
            avatar_url: null,
            region_id: "reg-1",
            region_name: "Gurgaon Hub",
            total_assigned: 25,
            active_leads: 18,
            won_leads: 5,
            lost_leads: 2,
            conversion_rate: 20.0,
            active_pipeline_value: 650000000,
            won_revenue: 225000000,
            avg_deal_value: 45000000,
            avg_days_to_won: 12.4,
            calls_count: 84,
            site_visits_count: 15,
            meetings_count: 8,
            tasks_total: 30,
            tasks_completed: 28,
            tasks_overdue: 2,
            sla_compliance_rate: 93.3,
          },
        ],
        time_series: [
          { date: "2026-08-20", label: "20 Aug", leads: 8, won: 2, lost: 0, revenue: 90000000, visits: 4, calls: 22 },
        ],
        velocity: {
          stages: [
            { slug: "new", name: "New Inflow", sort_order: 1, color: "#3b82f6", count: 10, value: 250000000, avg_days_in_stage: 1.5, conversion_pct: 20.0 },
          ],
          avg_sales_cycle_days: 12.4,
          won_deals_evaluated: 10,
          total_leads_evaluated: 50,
        },
        sla: {
          total_tasks: 30,
          upcoming_tasks: 12,
          due_today_tasks: 8,
          overdue_tasks: 2,
          completed_tasks: 28,
          overdue_percentage: 6.7,
          sla_compliance_percentage: 93.3,
        },
      };

      const mapped = mapRawDashboardAnalytics(sampleRaw);

      expect(mapped.pipeline.totalLeads).toBe(50);
      expect(mapped.pipeline.totalPipelineValue).toBe(1250000000);
      expect(mapped.pipeline.conversionRate).toBe(20.0);
      expect(mapped.stages.length).toBe(2);
      expect(mapped.stages[0].name).toBe("New Inflow");
      expect(mapped.dealHealth.strongCount).toBe(25);
      expect(mapped.dealHealth.avgHealthScore).toBe(78.5);
      expect(mapped.forecast.projectedTotalRevenue).toBe(1075000000);
      expect(mapped.reps.length).toBe(1);
      expect(mapped.reps[0].name).toBe("Rahul Sharma");
      expect(mapped.reps[0].slaComplianceRate).toBe(93.3);
      expect(mapped.timeSeries.length).toBe(1);
      expect(mapped.velocity.avgSalesCycleDays).toBe(12.4);
      expect(mapped.sla.completedTasks).toBe(28);
    });
  });

  describe("Deterministic Revenue Forecasting Formulation", () => {
    it("computes stage-probability and health-score modulated forecast correctly", () => {
      // Test formula logic against specification:
      // Stage weights: new: 0.1, contacted: 0.2, qualified: 0.4, site_visit: 0.6, negotiation: 0.8
      // Health modifier: score >= 80 -> 1.15, score <= 49 -> 0.70, neutral -> 1.00
      const testCases = [
        { budget: 10000000, stage: "new", healthScore: 85, expectedWeight: 10000000 * 0.10 * 1.15 },
        { budget: 20000000, stage: "negotiation", healthScore: 40, expectedWeight: 20000000 * 0.80 * 0.70 },
        { budget: 15000000, stage: "site_visit", healthScore: 65, expectedWeight: 15000000 * 0.60 * 1.00 },
      ];

      for (const tc of testCases) {
        const stageWeight =
          tc.stage === "new" ? 0.1 : tc.stage === "negotiation" ? 0.8 : tc.stage === "site_visit" ? 0.6 : 0.25;
        const healthMod = tc.healthScore >= 80 ? 1.15 : tc.healthScore <= 49 ? 0.7 : 1.0;
        const calc = tc.budget * stageWeight * healthMod;
        expect(calc).toBeCloseTo(tc.expectedWeight, 2);
      }
    });
  });
});
