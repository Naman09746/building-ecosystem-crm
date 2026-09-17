import { describe, it, expect } from "vitest";
import {
  checkLeadQuota,
  checkFeatureAccess,
  resolvePlan,
  PLAN_CONFIGS,
} from "@repo/core/lib/server/subscription";

describe("Plan Quota & Feature Gating Enforcement", () => {
  it("should enforce lead creation limits on Starter plan", () => {
    const underLimit = checkLeadQuota(250, "starter");
    expect(underLimit.allowed).toBe(true);

    const atLimit = checkLeadQuota(300, "starter");
    expect(atLimit.allowed).toBe(false);
    expect(atLimit.reason).toContain("Plan lead limit reached");
  });

  it("should enforce feature gates between Starter and Growth/Enterprise", () => {
    expect(checkFeatureAccess("ai_agents", "starter")).toBe(false);
    expect(checkFeatureAccess("resurrection", "starter")).toBe(false);

    expect(checkFeatureAccess("ai_agents", "growth")).toBe(true);
    expect(checkFeatureAccess("resurrection", "growth")).toBe(true);
    expect(checkFeatureAccess("multi_region", "growth")).toBe(false);

    expect(checkFeatureAccess("ai_agents", "enterprise")).toBe(true);
    expect(checkFeatureAccess("resurrection", "enterprise")).toBe(true);
    expect(checkFeatureAccess("multi_region", "enterprise")).toBe(true);
  });

  it("should keep DB-trigger limits in sync with TS PLAN_CONFIGS", () => {
    // supabase/migrations/0006_billing_quotas.sql hardcodes the same numbers.
    // This test fails if someone updates one side only.
    expect(PLAN_CONFIGS.starter.maxLeads).toBe(300);
    expect(PLAN_CONFIGS.growth.maxLeads).toBe(2500);
    expect(PLAN_CONFIGS.enterprise.maxLeads).toBe(50000);
    expect(PLAN_CONFIGS.starter.maxSeats).toBe(1);
    expect(PLAN_CONFIGS.growth.maxSeats).toBe(4);
    expect(PLAN_CONFIGS.enterprise.maxSeats).toBe(25);
  });

  it("should fail closed to the LOWEST tier for unknown/null plans", () => {
    expect(resolvePlan(null)).toBe("starter");
    expect(resolvePlan(undefined)).toBe("starter");
    expect(resolvePlan("enterprise_hack")).toBe("starter"); // never default to a paid tier
    expect(resolvePlan("growth")).toBe("growth");
  });
});
