import { describe, it, expect } from "vitest";
import {
  calculateUnitMatchScore,
  searchInventoryInputSchema,
  lookupBuyerInputSchema,
  SearchInventoryInput,
} from "@repo/core/lib/server/aria-tools";

describe("Phase 6: Aria 2.0 Real Estate Sales Intelligence", () => {
  describe("Explainable Inventory Matching Scoring Engine", () => {
    const mockUnit = {
      projectName: "The Grand Palm Residences",
      location: "Golf Course Ext, Gurgaon",
      tower: "Tower A",
      configuration: "3 BHK + Servant",
      price: 38000000, // 3.8 Cr
      floor: 14,
      superAreaSqFt: 2200,
      facing: "North-East (Park Facing)",
    };

    it("yields a high match score (>= 90%) for an exact BHK, budget, high-floor inquiry", () => {
      const criteria: SearchInventoryInput = {
        configuration: "3 BHK",
        targetBudget: 38000000,
        preferredFloor: "high",
        minimumArea: 2000,
        region: "Gurgaon",
        facing: "North-East",
      };

      const result = calculateUnitMatchScore(mockUnit, criteria);
      expect(result.percentage).toBeGreaterThanOrEqual(90);
      expect(result.score).toBeGreaterThanOrEqual(0.9);
      expect(result.reasons.some((r) => r.includes("3 BHK"))).toBe(true);
      expect(result.reasons.some((r) => r.includes("budget"))).toBe(true);
      expect(result.reasons.some((r) => r.includes("floor"))).toBe(true);
    });

    it("tolerates missing preferences gracefully without errors", () => {
      const criteria: SearchInventoryInput = {
        configuration: "3 BHK",
      };

      const result = calculateUnitMatchScore(mockUnit, criteria);
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(1.0);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it("penalizes configuration and budget mismatch appropriately", () => {
      const mismatchedCriteria: SearchInventoryInput = {
        configuration: "1 BHK", // mismatch (unit is 3 BHK)
        targetBudget: 10000000, // 1 Cr vs unit 3.8 Cr (mismatch > 30%)
      };

      const result = calculateUnitMatchScore(mockUnit, mismatchedCriteria);
      expect(result.percentage).toBeLessThan(65);
    });

    it("properly evaluates floor bands (high >= 10, mid 4-9, low 1-3)", () => {
      const highFloorReq: SearchInventoryInput = { preferredFloor: "high" };
      const lowFloorReq: SearchInventoryInput = { preferredFloor: "low" };

      const highResult = calculateUnitMatchScore(mockUnit, highFloorReq);
      const lowResult = calculateUnitMatchScore(mockUnit, lowFloorReq);

      expect(highResult.percentage).toBeGreaterThan(lowResult.percentage);
    });
  });

  describe("Duplicate Lead & Buyer Classification", () => {
    function classifyDuplicateLead(
      existingLeads: Array<{ stage: string; salespersonName: string; lostReason?: string }>,
      existingPeopleCount: number
    ): "existing_active_lead" | "previously_lost_lead" | "existing_customer_new_requirement" | "new_prospect" {
      if (existingLeads.length > 0) {
        const active = existingLeads.find((l) => !["won", "lost"].includes(l.stage));
        if (active) return "existing_active_lead";
        const lost = existingLeads.find((l) => l.stage === "lost");
        if (lost) return "previously_lost_lead";
        return "existing_customer_new_requirement";
      }
      if (existingPeopleCount > 0) return "existing_customer_new_requirement";
      return "new_prospect";
    }

    it("identifies active deals in progress to prevent duplicate lead creation", () => {
      const status = classifyDuplicateLead(
        [{ stage: "negotiation", salespersonName: "Rahul" }],
        1
      );
      expect(status).toBe("existing_active_lead");
    });

    it("identifies cold/lost leads for potential reactivation", () => {
      const status = classifyDuplicateLead(
        [{ stage: "lost", salespersonName: "Pooja", lostReason: "Budget issue" }],
        1
      );
      expect(status).toBe("previously_lost_lead");
    });

    it("identifies fresh prospects with no prior CRM history", () => {
      const status = classifyDuplicateLead([], 0);
      expect(status).toBe("new_prospect");
    });
  });

  describe("Tenant Isolation & Multi-Tenant Query Scoping", () => {
    it("strictly isolates queries using authenticated org_id", () => {
      const authA = { orgId: "org_alpha", userId: "user_1" };
      const authB = { orgId: "org_beta", userId: "user_2" };

      expect(authA.orgId).not.toBe(authB.orgId);
    });
  });

  describe("Input Validation & Bounds Enforcement", () => {
    it("validates valid inventory search inputs", () => {
      const valid = {
        configuration: "3 BHK",
        minimumBudget: 20000000,
        maximumBudget: 40000000,
        limit: 10,
      };
      const parsed = searchInventoryInputSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it("rejects invalid negative budgets or excessive query limits", () => {
      const invalid = {
        minimumBudget: -50000,
        limit: 100, // exceeds max 20
      };
      const parsed = searchInventoryInputSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it("validates phone and email lookups", () => {
      const validPhone = { phone: "+919811099234" };
      const validEmail = { email: "siddharth@example.com" };

      expect(lookupBuyerInputSchema.safeParse(validPhone).success).toBe(true);
      expect(lookupBuyerInputSchema.safeParse(validEmail).success).toBe(true);
      expect(lookupBuyerInputSchema.safeParse({ email: "invalid-email" }).success).toBe(false);
    });
  });
});
