import { describe, it, expect, vi } from "vitest";
import { detectSellerSignals } from "@repo/core/lib/server/seller-intelligence";
import { synthesizeSiteVisitBriefing } from "@repo/core/lib/server/site-visit-briefing";
import {
  structureFreeTextMeetingNotes,
  calculateUnitMatchScore,
} from "@repo/core/lib/server/aria-tools";
import {
  createSellerOpportunitySchema,
  updateSellerOpportunitySchema,
  siteVisitBriefingInputSchema,
  freeTextMeetingSummarySchema,
  confirmMeetingDispositionSchema,
} from "@repo/core/lib/server/validations";
import { INITIAL_UNITS, INITIAL_LEADS } from "@repo/core/lib/mock-data";

describe("Phase 13 — Real Estate Intelligence & Automation Engine", () => {
  describe("1. Seller Intelligence & Signal Detection", () => {
    it("should detect seller signals including expiring tenancies and vacant units in simulation/mock mode", async () => {
      const result = await detectSellerSignals("org-dlf-partners");

      expect(result.detectedSignals.length).toBeGreaterThan(0);
      expect(result.totalScannedUnits).toBeGreaterThan(0);

      const tenancySignal = result.detectedSignals.find((s) => s.signalType === "tenancy_expiring");
      expect(tenancySignal).toBeDefined();
      expect(tenancySignal?.signalStrength).toBeGreaterThanOrEqual(80);
      expect(tenancySignal?.urgency).toBe("high");

      const vacantSignal = result.detectedSignals.find((s) => s.signalType === "vacant_unit");
      expect(vacantSignal).toBeDefined();
      expect(vacantSignal?.aiRationale).toContain("maintenance");
    });

    it("should validate createSellerOpportunitySchema with strict type checks", () => {
      const validPayload = {
        unitId: "unit-1402",
        signalType: "tenancy_expiring",
        signalStrength: 90,
        estimatedValuation: 420000000,
        suggestedPitch: "Exclusive pitch for DLF Camellias 4BHK",
        urgency: "high",
        status: "detected",
      };

      const parsed = createSellerOpportunitySchema.safeParse(validPayload);
      expect(parsed.success).toBe(true);

      const invalidPayload = {
        unitId: "unit-1402",
        signalType: "invalid_signal_type",
        signalStrength: 150, // exceeds max 100
      };
      const invalidParsed = createSellerOpportunitySchema.safeParse(invalidPayload);
      expect(invalidParsed.success).toBe(false);
    });
  });

  describe("2. Bi-Directional 100-Point Matching Engine", () => {
    it("should compute exact 100-point multi-factor match for aligned luxury buyer", () => {
      const unit = {
        configuration: "4 BHK Luxury Residence",
        price: 420000000, // 42 Cr
        floor: 14,
        superAreaSqFt: 7400,
        facing: "North-East",
        projectName: "The Camellias",
        location: "Golf Course Road, Gurugram",
        tower: "Tower A",
      };

      const criteria = {
        projectName: "The Camellias",
        configuration: "4 BHK",
        targetBudget: 420000000,
        preferredFloor: 14,
        minimumArea: 6000,
        maximumArea: 8000,
        facing: "North-East",
      };

      const match = calculateUnitMatchScore(unit, criteria);
      expect(match.percentage).toBeGreaterThanOrEqual(85);
      expect(match.score).toBeGreaterThanOrEqual(0.85);
      expect(match.reasons.some((r) => r.includes("Camellias"))).toBe(true);
      expect(match.reasons.some((r) => r.includes("budget"))).toBe(true);
      expect(match.reasons.some((r) => r.includes("configuration"))).toBe(true);
    });

    it("should penalize budget mismatch (>25% gap) gracefully", () => {
      const unit = {
        configuration: "3 BHK",
        price: 150000000, // 15 Cr
        floor: 5,
        superAreaSqFt: 2800,
        facing: "East",
        projectName: "Golf Heights",
        location: "Sector 65, Gurugram",
        tower: "Tower 1",
      };

      const criteria = {
        projectName: "Golf Heights",
        configuration: "3 BHK",
        targetBudget: 40000000, // 4 Cr (massive mismatch)
      };

      const match = calculateUnitMatchScore(unit, criteria);
      // Location (30) + Config (20) + Area (10) + Floor (5) + Facing (5) = 70, Budget = 0
      expect(match.percentage).toBeLessThanOrEqual(75);
      expect(match.percentage).toBeGreaterThanOrEqual(50);
    });
  });

  describe("3. 30-Minute Pre-Site-Visit Briefing Synthesizer", () => {
    it("should synthesize structured briefing with gate pass protocols and talking points", async () => {
      const result = await synthesizeSiteVisitBriefing({
        leadId: "lead-101",
        unitId: "unit-camellias-a1402",
        orgId: "org-dlf-partners",
      });

      expect(result.success).toBe(true);
      expect(result.briefing).toBeDefined();

      const b = result.briefing!;
      expect(b.gateAccessProtocol).toContain("Gate");
      expect(b.ownerExpectationsSummary).toBeDefined();
      expect(b.talkingPoints).toBeDefined();
      expect(b.talkingPoints!.length).toBeGreaterThan(0);
      expect(b.generatedByAi).toBe(true);
    });

    it("should validate siteVisitBriefingInputSchema correctly", () => {
      const parsed = siteVisitBriefingInputSchema.safeParse({
        leadId: "lead-101",
        unitId: "unit-1402",
      });
      expect(parsed.success).toBe(true);

      const invalid = siteVisitBriefingInputSchema.safeParse({
        leadId: "",
        unitId: "",
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("4. Free-Text Meeting Summarizer & Human Approval Gate", () => {
    it("should extract objections, buying signals, stage, and enforce requiresHumanApproval: true", () => {
      const rawNotes =
        "Met Mr. Singhal at DLF Camellias today. He loved the 14th floor layout and golf view. His wife loved the master bedroom, but they objected to the 42 Cr price, saying market in DLF 5 is around 38-40 Cr. We agreed to counter offer at 41 Cr by Tuesday.";

      const disposition = structureFreeTextMeetingNotes({
        rawNotes,
        personName: "Rajesh Singhal",
        leadId: "lead-101",
      });

      expect(disposition.requiresHumanApproval).toBe(true);
      expect(disposition.suggestedStage).toBe("negotiation");
      expect(disposition.extractedObjections.some((o) => o.includes("Price"))).toBe(true);
      expect(disposition.buyingSignals.length).toBeGreaterThan(0);
      expect(disposition.sentiment).toBe("bullish");
      expect(disposition.suggestedNextMove).toContain("counter-offer");
    });

    it("should classify lost buyer sentiment correctly when buyer opts out", () => {
      const rawNotes =
        "Customer not interested anymore. They bought a builder floor in Golf Course Extension directly from owner yesterday. Closed file.";

      const disposition = structureFreeTextMeetingNotes({
        rawNotes,
      });

      expect(disposition.requiresHumanApproval).toBe(true);
      expect(disposition.suggestedStage).toBe("lost");
      expect(disposition.sentiment).toBe("negative");
      expect(disposition.outcome).toBe("not_interested");
    });

    it("should validate confirmMeetingDispositionSchema with required human confirmation fields", () => {
      const payload = {
        leadId: "lead-101",
        activityType: "meeting",
        outcome: "interested",
        outcomeLabel: "Negotiation Meeting",
        suggestedStage: "negotiation",
        sentiment: "bullish",
        extractedObjections: ["Price / Valuation Sensitivity"],
        buyingSignals: ["Active price negotiation underway"],
        conversationSummary: "Met buyer and discussed 41 Cr counter offer.",
        suggestedNextMove: "Send revised payment milestone schedule.",
      };

      const parsed = confirmMeetingDispositionSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
    });
  });
});
