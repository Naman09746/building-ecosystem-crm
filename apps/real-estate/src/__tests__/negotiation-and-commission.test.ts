import { describe, it, expect } from "vitest";

// Negotiation calculation helper
function calculateNegotiationMetrics(askPrice: number, offerPrice: number, sellerFloorPrice: number) {
  const priceGapFromAsk = offerPrice - askPrice;
  const gapPercentage = ((offerPrice - askPrice) / askPrice) * 100;
  const isAboveFloor = offerPrice >= sellerFloorPrice;
  const floorDelta = offerPrice - sellerFloorPrice;

  return {
    priceGapFromAsk,
    gapPercentage: Math.round(gapPercentage * 100) / 100,
    isAboveFloor,
    floorDelta,
  };
}

// Indian Statutory Brokerage & Commission Ledger helper
interface CommissionInput {
  dealValue: number;
  buyerBrokeragePct: number;
  sellerBrokeragePct: number;
  cpCommissionPct: number;
  salespersonIncentivePct: number;
  managerOverridePct: number;
}

function calculateIndianCommissionLedger(input: CommissionInput) {
  const buyerBrokerage = (input.dealValue * input.buyerBrokeragePct) / 100;
  const sellerBrokerage = (input.dealValue * input.sellerBrokeragePct) / 100;
  const totalGrossBrokerage = buyerBrokerage + sellerBrokerage;

  const gstRate = 18.0;
  const gstAmount = (totalGrossBrokerage * gstRate) / 100;
  const tdsRate = 1.0;
  const tdsDeducted = (totalGrossBrokerage * tdsRate) / 100;
  const netBrokerageReceivable = totalGrossBrokerage + gstAmount - tdsDeducted;

  const cpPayout = (totalGrossBrokerage * input.cpCommissionPct) / 100;
  const repIncentive = (totalGrossBrokerage * input.salespersonIncentivePct) / 100;
  const managerOverride = (totalGrossBrokerage * input.managerOverridePct) / 100;
  const companyNetRetention = totalGrossBrokerage - cpPayout - repIncentive - managerOverride;

  return {
    buyerBrokerage,
    sellerBrokerage,
    totalGrossBrokerage,
    gstAmount,
    tdsDeducted,
    netBrokerageReceivable,
    cpPayout,
    repIncentive,
    managerOverride,
    companyNetRetention,
  };
}

describe("Negotiation Metrics & Bid Gap Engine", () => {
  it("calculates price gap from ask price and checks against seller floor", () => {
    const askPrice = 160000000; // 16 Cr
    const offerPrice = 148000000; // 14.8 Cr
    const sellerFloor = 150000000; // 15 Cr Floor

    const metrics = calculateNegotiationMetrics(askPrice, offerPrice, sellerFloor);

    expect(metrics.priceGapFromAsk).toBe(-12000000); // -1.2 Cr
    expect(metrics.gapPercentage).toBe(-7.5);
    expect(metrics.isAboveFloor).toBe(false); // Below 15 Cr Floor
    expect(metrics.floorDelta).toBe(-2000000); // 20 Lakhs deficit
  });

  it("identifies viable counter-offer exceeding seller floor", () => {
    const askPrice = 160000000;
    const counterOffer = 154000000; // 15.4 Cr
    const sellerFloor = 150000000;

    const metrics = calculateNegotiationMetrics(askPrice, counterOffer, sellerFloor);

    expect(metrics.isAboveFloor).toBe(true);
    expect(metrics.floorDelta).toBe(4000000); // +40 Lakhs above floor
  });
});

describe("Indian Statutory Brokerage & Commission Ledger Engine", () => {
  it("computes 1% buyer + 1% seller brokerage with 18% GST and 1% TDS on ₹10 Cr luxury sale", () => {
    const input: CommissionInput = {
      dealValue: 100000000, // ₹10 Cr
      buyerBrokeragePct: 1.0,
      sellerBrokeragePct: 1.0,
      cpCommissionPct: 0.0,
      salespersonIncentivePct: 10.0, // 10% of gross
      managerOverridePct: 3.0, // 3% of gross
    };

    const ledger = calculateIndianCommissionLedger(input);

    expect(ledger.buyerBrokerage).toBe(1000000); // 10 Lakhs
    expect(ledger.sellerBrokerage).toBe(1000000); // 10 Lakhs
    expect(ledger.totalGrossBrokerage).toBe(2000000); // 20 Lakhs (2%)
    expect(ledger.gstAmount).toBe(360000); // 18% GST = 3.6 Lakhs
    expect(ledger.tdsDeducted).toBe(20000); // 1% TDS = 20,000
    expect(ledger.netBrokerageReceivable).toBe(2340000); // 20L + 3.6L - 20k = 23.40 Lakhs

    expect(ledger.repIncentive).toBe(200000); // 10% of 20L = 2 Lakhs
    expect(ledger.managerOverride).toBe(60000); // 3% of 20L = 60,000
    expect(ledger.companyNetRetention).toBe(1740000); // 20L - 2L - 60k = 17.40 Lakhs
  });
});
