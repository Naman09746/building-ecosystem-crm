import { describe, it, expect } from "vitest";
import {
  scoreUnitForLead,
  normalizeConfiguration,
  getMatchTier,
  findTopResurrectionCandidates,
  scanResurrectionOpportunitiesInMemory,
} from "@repo/core/lib/server/resurrection-engine";
import { Lead, Project, ProjectUnit } from "@repo/core/types/crm";

describe("Phase 10: Multi-Factor Resurrection Engine Suite", () => {
  const baseLead: Partial<Lead> = {
    id: "lead-1",
    orgId: "org-1",
    personName: "Vikram Malhotra",
    phone: "+919876543210",
    projectId: "proj-1",
    projectName: "The Grand Palm",
    regionId: "reg-gurgaon",
    budget: 35000000, // 3.5 Cr
    configurationPreference: "3 BHK Luxury",
    preferredFloor: "High floor (12 - 18)",
    facingPreference: "East",
    stage: "lost",
    daysInStage: 45,
    lostReason: "budget_too_high",
  };

  const baseProject: Partial<Project> = {
    id: "proj-1",
    orgId: "org-1",
    name: "The Grand Palm",
    location: "Golf Course Extension, Gurgaon",
    regionId: "reg-gurgaon",
  };

  const perfectUnit: Partial<ProjectUnit> = {
    id: "unit-101",
    orgId: "org-1",
    projectId: "proj-1",
    tower: "Tower A",
    unitNumber: "1402",
    floor: 14,
    configuration: "3 BHK Luxury",
    superAreaSqFt: 2150,
    price: 34500000, // 3.45 Cr (within 1.4% of budget)
    facing: "East",
    status: "available",
  };

  describe("Multi-Factor Scoring Engine", () => {
    it("1. Exact project + exact budget + exact configuration produces high score (90+)", () => {
      const match = scoreUnitForLead(baseLead, perfectUnit, baseProject);
      expect(match.score.total).toBeGreaterThanOrEqual(90);
      expect(match.score.tier).toBe("excellent");
      expect(match.score.project).toBe(40);
      expect(match.score.budget).toBe(30);
      expect(match.score.configuration).toBe(20);
      expect(match.score.floor).toBe(5);
      expect(match.score.facing).toBe(5);
      expect(match.reasons.length).toBeGreaterThanOrEqual(3);
    });

    it("2. Project mismatch lowers score", () => {
      const altProject: Partial<Project> = {
        id: "proj-2",
        orgId: "org-1",
        name: "Emerald Heights",
        regionId: "reg-noida",
      };
      const altUnit: Partial<ProjectUnit> = {
        ...perfectUnit,
        projectId: "proj-2",
      };

      const match = scoreUnitForLead(baseLead, altUnit, altProject);
      expect(match.score.project).toBe(0);
      expect(match.score.total).toBeLessThan(70);
    });

    it("3. Budget within 5% scores higher than budget within 20%", () => {
      const unitWithin5: Partial<ProjectUnit> = { ...perfectUnit, price: 34000000 }; // ~2.8% diff
      const unitWithin20: Partial<ProjectUnit> = { ...perfectUnit, price: 41000000 }; // ~17.1% diff

      const match5 = scoreUnitForLead(baseLead, unitWithin5, baseProject);
      const match20 = scoreUnitForLead(baseLead, unitWithin20, baseProject);

      expect(match5.score.budget).toBe(30);
      expect(match20.score.budget).toBe(10);
      expect(match5.score.total).toBeGreaterThan(match20.score.total);
    });

    it("4. Configuration mismatch receives zero configuration points", () => {
      const mismatchUnit: Partial<ProjectUnit> = {
        ...perfectUnit,
        configuration: "1 BHK Studio",
      };
      const match = scoreUnitForLead(baseLead, mismatchUnit, baseProject);
      expect(match.score.configuration).toBe(0);
    });

    it("5. Preferred facing match increases score", () => {
      const eastUnit: Partial<ProjectUnit> = { ...perfectUnit, facing: "East" };
      const westUnit: Partial<ProjectUnit> = { ...perfectUnit, facing: "West" };

      const matchEast = scoreUnitForLead(baseLead, eastUnit, baseProject);
      const matchWest = scoreUnitForLead(baseLead, westUnit, baseProject);

      expect(matchEast.score.facing).toBe(5);
      expect(matchWest.score.facing).toBe(0);
    });

    it("6. Preferred floor match increases score", () => {
      const highFloorUnit: Partial<ProjectUnit> = { ...perfectUnit, floor: 15 };
      const lowFloorUnit: Partial<ProjectUnit> = { ...perfectUnit, floor: 2 };

      const matchHigh = scoreUnitForLead(baseLead, highFloorUnit, baseProject);
      const matchLow = scoreUnitForLead(baseLead, lowFloorUnit, baseProject);

      expect(matchHigh.score.floor).toBe(5);
      expect(matchLow.score.floor).toBe(0);
    });

    it("7. Missing preference does not unfairly penalize the unit", () => {
      const leadNoPrefs: Partial<Lead> = {
        id: "lead-2",
        orgId: "org-1",
        personName: "Aarav Gupta",
        budget: 35000000,
        // No project, config, floor, or facing specified
      };

      const match = scoreUnitForLead(leadNoPrefs, perfectUnit, baseProject);
      // Neutral baseline points should be granted
      expect(match.score.project).toBe(25);
      expect(match.score.configuration).toBe(12);
      expect(match.score.floor).toBe(5);
      expect(match.score.facing).toBe(5);
      expect(match.score.total).toBeGreaterThanOrEqual(70);
    });

    it("8. Zero / null budget does not cause division by zero or crash", () => {
      const zeroBudgetLead: Partial<Lead> = { ...baseLead, budget: 0 };
      const nullBudgetLead: Partial<Lead> = { ...baseLead, budget: undefined };

      const matchZero = scoreUnitForLead(zeroBudgetLead, perfectUnit, baseProject);
      const matchNull = scoreUnitForLead(nullBudgetLead, perfectUnit, baseProject);

      expect(Number.isFinite(matchZero.score.total)).toBe(true);
      expect(Number.isFinite(matchNull.score.total)).toBe(true);
      expect(matchZero.score.budget).toBe(15);
    });

    it("9. Configuration normalization handles varied strings cleanly", () => {
      expect(normalizeConfiguration("3 BHK Luxury")).toBe("3bhk");
      expect(normalizeConfiguration("3BHK")).toBe("3bhk");
      expect(normalizeConfiguration("3 Bed Apartment")).toBe("3bhk");
      expect(normalizeConfiguration("4 BHK Penthouse")).toBe("4bhk");
      expect(normalizeConfiguration("Studio Residence")).toBe("1bhk");
      expect(normalizeConfiguration("Luxury Villa")).toBe("villa");
    });

    it("10. Match tiers are categorized accurately", () => {
      expect(getMatchTier(95).tier).toBe("excellent");
      expect(getMatchTier(80).tier).toBe("strong");
      expect(getMatchTier(65).tier).toBe("possible");
      expect(getMatchTier(45).tier).toBe("weak");
    });
  });

  describe("Inventory Candidate Search & Hard Filters", () => {
    it("11. Sold or booked units are strictly filtered out", () => {
      const unitsPool: Partial<ProjectUnit>[] = [
        { ...perfectUnit, id: "u-sold", status: "sold" },
        { ...perfectUnit, id: "u-booked", status: "booked" },
        { ...perfectUnit, id: "u-avail", status: "available" },
      ];

      const candidates = findTopResurrectionCandidates(baseLead, unitsPool, [baseProject]);
      expect(candidates.length).toBe(1);
      expect(candidates[0].unit.id).toBe("u-avail");
    });

    it("12. Units from another organization are never matched", () => {
      const crossOrgUnit: Partial<ProjectUnit> = {
        ...perfectUnit,
        id: "u-alien",
        orgId: "org-other-tenant",
        status: "available",
      };

      const candidates = findTopResurrectionCandidates(baseLead, [crossOrgUnit], [baseProject]);
      expect(candidates.length).toBe(0);
    });

    it("13. Deterministic score is reproducible", () => {
      const res1 = scoreUnitForLead(baseLead, perfectUnit, baseProject);
      const res2 = scoreUnitForLead(baseLead, perfectUnit, baseProject);
      expect(res1.score.total).toBe(res2.score.total);
      expect(res1.reasons).toEqual(res2.reasons);
    });
  });

  describe("Batch Scan & Cooldown Rules", () => {
    it("14. Opted-out leads are excluded from automated batch scans unless forced", () => {
      const leads: Lead[] = [
        {
          ...baseLead,
          id: "l-opted-out",
          lostReason: "opted_out",
        } as Lead,
      ];

      const normalScan = scanResurrectionOpportunitiesInMemory(leads, [perfectUnit as ProjectUnit], [baseProject as Project]);
      expect(normalScan.matchedCount).toBe(0);

      const forcedScan = scanResurrectionOpportunitiesInMemory(leads, [perfectUnit as ProjectUnit], [baseProject as Project], 14, 60, true);
      expect(forcedScan.matchedCount).toBe(1);
    });

    it("15. 30-day cooldown excludes recently resurrected leads", () => {
      const recentResurrectLead: Lead = {
        ...baseLead,
        id: "l-recent",
        lastResurrectedAt: new Date(Date.now() - 5 * 86400000).toISOString(), // 5 days ago
      } as Lead;

      const scan = scanResurrectionOpportunitiesInMemory([recentResurrectLead], [perfectUnit as ProjectUnit], [baseProject as Project]);
      expect(scan.matchedCount).toBe(0);

      const forcedScan = scanResurrectionOpportunitiesInMemory([recentResurrectLead], [perfectUnit as ProjectUnit], [baseProject as Project], 14, 60, true);
      expect(forcedScan.matchedCount).toBe(1);
    });
  });
});
