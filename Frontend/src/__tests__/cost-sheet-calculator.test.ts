import { describe, it, expect } from "vitest";
import {
  calculateCostSheet,
  getDefaultCostParameters,
  getStandardStampDutyPct,
  generateCostSheetWhatsAppText,
} from "../lib/cost-sheet-calculator";
import { ProjectUnit } from "../types/crm";

const sampleUnit: ProjectUnit = {
  id: "unit-dlf-cam-1204",
  orgId: "org-dlf-partners",
  projectId: "proj-camellias",
  projectName: "The Camellias DLF 5",
  tower: "Tower 4",
  unitNumber: "1204",
  floor: 12,
  configuration: "4 BHK + Study + Servant",
  sizeSqFt: 7400,
  superAreaSqFt: 7400,
  carpetAreaSqFt: 5350,
  price: 450000000, // 45 Cr
  parkingSlots: 4,
  isCornerUnit: true,
  status: "available",
  occupancyStatus: "vacant",
  physicalCondition: "brand_new",
};

describe("Cost Sheet Calculator Engine", () => {
  it("calculates standard CLP cost sheet with correct Agreement Value & Taxes", () => {
    const breakdown = calculateCostSheet(sampleUnit, {
      baseRatePerSqFt: 60000,
      state: "haryana",
      buyerGender: "male",
      paymentPlanType: "clp",
      plcType: "golf_course_facing",
    });

    // Super area = 7400
    // BSP = 60,000 * 7400 = 44,40,00,000 (44.4 Cr)
    expect(breakdown.basicSalePrice).toBe(444000000);

    // Floor rise: floor 12, threshold 4 = 8 floors * ₹50/sqft = ₹400/sqft * 7400 = 29,60,000
    expect(breakdown.floorRiseCharges).toBe(2960000);

    // PLC: golf_course_facing = ₹500/sqft * 7400 = 37,00,000
    expect(breakdown.plcCharges).toBe(3700000);

    // Parking: 4 slots * 5,00,000 = 20,00,000
    expect(breakdown.carParkingCharges).toBe(2000000);

    // Net Agreement Value = 444000000 + 2960000 + 3700000 + 2000000 + 350000 + (150*7400=1110000)
    expect(breakdown.netAgreementValue).toBe(454120000);

    // GST (5% under construction)
    expect(breakdown.gstAmount).toBe(Math.round(454120000 * 0.05));

    // Haryana Male Stamp Duty (7%)
    expect(breakdown.stampDutyRatePct).toBe(7.0);
    expect(breakdown.stampDutyAmount).toBe(Math.round(454120000 * 0.07));

    // Milestones sum up to 100% of agreement value
    const sumMilestonesPct = breakdown.milestones.reduce((acc, m) => acc + m.percentage, 0);
    expect(sumMilestonesPct).toBe(100);

    const sumAgreementPayable = breakdown.milestones.reduce((acc, m) => acc + m.payableAgreementAmount, 0);
    expect(Math.round(sumAgreementPayable)).toBe(breakdown.netAgreementValue);
  });

  it("handles Ready to Move with 0% GST and female stamp duty discount", () => {
    const breakdown = calculateCostSheet(sampleUnit, {
      baseRatePerSqFt: 50000,
      isReadyToMove: true,
      state: "delhi",
      buyerGender: "female",
    });

    expect(breakdown.gstRatePct).toBe(0);
    expect(breakdown.gstAmount).toBe(0);
    expect(breakdown.stampDutyRatePct).toBe(4.0); // Delhi female stamp duty is 4%
  });

  it("applies down payment discount when plan is down_payment", () => {
    const standardBreakdown = calculateCostSheet(sampleUnit, {
      baseRatePerSqFt: 50000,
      paymentPlanType: "clp",
    });

    const dpBreakdown = calculateCostSheet(sampleUnit, {
      baseRatePerSqFt: 50000,
      paymentPlanType: "down_payment",
      downPaymentDiscountPct: 8,
    });

    // Base rate should be 8% lower: 50000 * 0.92 = 46000
    expect(dpBreakdown.baseRatePerSqFt).toBe(46000);
    expect(dpBreakdown.basicSalePrice).toBeLessThan(standardBreakdown.basicSalePrice);
    expect(dpBreakdown.milestones.length).toBe(3);
  });

  it("generates WhatsApp share message with accurate key metrics", () => {
    const breakdown = calculateCostSheet(sampleUnit, {
      baseRatePerSqFt: 60000,
      state: "haryana",
      buyerGender: "joint",
    });

    const msg = generateCostSheetWhatsAppText(sampleUnit, breakdown, "Apex Realty");
    expect(msg).toContain("OFFICIAL COST SHEET & PAYMENT PLAN");
    expect(msg).toContain("The Camellias DLF 5");
    expect(msg).toContain("Net Agreement Value");
    expect(msg).toContain("ALL-INCLUSIVE TOTAL COST");
  });
});
