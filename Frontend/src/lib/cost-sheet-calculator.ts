import { ProjectUnit } from "@/types/crm";

export type IndianState = "haryana" | "maharashtra" | "karnataka" | "delhi" | "uttar_pradesh" | "telangana" | "other";

export type PaymentPlanType = "clp" | "subvention_10_90" | "subvention_20_80" | "down_payment" | "custom";

export interface CostSheetParameters {
  baseRatePerSqFt: number;
  superAreaSqFt: number;
  carpetAreaSqFt: number;
  floorNumber: number;
  floorRiseRatePerFloor: number; // e.g. ₹50/sqft per floor above floor 4
  floorRiseThresholdFloor: number; // e.g. 4
  plcRatePerSqFt: number; // Preferential Location Charge (Park/Corner/Pool)
  plcType: "none" | "park_facing" | "corner_unit" | "club_pool_facing" | "golf_course_facing";
  coveredCarParkingCount: number;
  carParkingCostPerSlot: number; // e.g. ₹5,00,000 per slot
  clubMembershipCharges: number; // e.g. ₹3,50,000
  powerBackupAndInfraPerSqFt: number; // e.g. ₹150/sqft
  ifmsRatePerSqFt: number; // Interest-Free Maintenance Security, e.g. ₹100/sqft
  isReadyToMove: boolean; // if true: 0% GST (with Completion/Occupancy Certificate)
  gstRatePct: number; // 5% for standard luxury residential under-construction
  state: IndianState;
  buyerGender: "male" | "female" | "joint";
  stampDutyPct: number;
  registrationCharges: number;
  possessionCharges: number; // Administrative, electricity/water meters, advance CAM
  paymentPlanType: PaymentPlanType;
  downPaymentDiscountPct: number; // e.g. 8% discount on BSP for 100% upfront
  customMilestones?: Array<{
    stageName: string;
    percentage: number;
    dueTimelineDescription: string;
  }>;
}

export interface PaymentMilestone {
  id: string;
  stageName: string;
  percentage: number;
  payableAgreementAmount: number;
  taxAmount: number;
  possessionOtherCharges: number;
  totalPayable: number;
  dueTimelineDescription: string;
}

export interface CostSheetBreakdown {
  // Area Details
  superAreaSqFt: number;
  carpetAreaSqFt: number;
  effectiveLoadingPct: number;

  // Base & Add-ons
  baseRatePerSqFt: number;
  basicSalePrice: number;
  floorRiseRatePerSqFt: number;
  floorRiseCharges: number;
  plcRatePerSqFt: number;
  plcCharges: number;
  carParkingCharges: number;
  clubMembershipCharges: number;
  powerBackupInfraCharges: number;

  // Agreement Value (Taxable)
  totalBasicCost: number; // BSP + Floor Rise + PLC
  totalAdditionalCost: number; // Parking + Club + Infra
  netAgreementValue: number; // Total Taxable Consideration

  // Taxes & Government Levies
  gstRatePct: number;
  gstAmount: number;
  stampDutyRatePct: number;
  stampDutyAmount: number;
  registrationAmount: number;
  totalGovernmentLevies: number;

  // Possession & Security (Non-Taxable/Payable on Offer of Possession)
  ifmsAmount: number;
  possessionCharges: number;
  totalPossessionCharges: number;

  // Final Aggregates
  totalAllInclusiveCost: number;
  effectiveAllInclusivePerSqFt: number;

  // Payment Schedule
  paymentPlanName: string;
  paymentPlanType: PaymentPlanType;
  milestones: PaymentMilestone[];
}

/**
 * Default Stamp Duty rates by Indian state and buyer registration profile
 */
export function getStandardStampDutyPct(state: IndianState, gender: "male" | "female" | "joint"): number {
  switch (state) {
    case "haryana": // Gurugram / Faridabad
      if (gender === "female") return 5.0;
      if (gender === "joint") return 6.0;
      return 7.0;
    case "delhi":
      if (gender === "female") return 4.0;
      if (gender === "joint") return 5.0;
      return 6.0;
    case "maharashtra": // Mumbai / Pune (5% stamp + 1% metro cess)
      return 6.0;
    case "karnataka": // Bengaluru (5% + 1% cess)
      return 5.6;
    case "uttar_pradesh": // Noida / Greater Noida (7% with ₹10k female discount)
      return 7.0;
    case "telangana": // Hyderabad
      return 7.5;
    default:
      return 6.0;
  }
}

/**
 * Standard milestone definitions for Indian real estate payment plans
 */
export function getStandardMilestones(
  planType: PaymentPlanType,
  agreementValue: number,
  gstAmount: number,
  ifmsAndPossession: number
): PaymentMilestone[] {
  switch (planType) {
    case "clp": {
      // 10-tier Construction Linked Payment Plan
      const clpTiers = [
        { name: "On Booking / Application Token", pct: 10, timeline: "Day 0" },
        { name: "Within 30 Days of Booking (Allotment)", pct: 10, timeline: "Within 30 Days" },
        { name: "On Commencement of Excavation & Foundation", pct: 10, timeline: "Stage 1 (Excavation)" },
        { name: "On Casting of Ground Floor Slab", pct: 10, timeline: "Stage 2 (GF Slab)" },
        { name: "On Casting of 5th Floor Slab", pct: 10, timeline: "Stage 3 (5th Floor)" },
        { name: "On Casting of 10th Floor Slab", pct: 10, timeline: "Stage 4 (10th Floor)" },
        { name: "On Casting of Top Superstructure Slab", pct: 10, timeline: "Superstructure Complete" },
        { name: "On Completion of Internal Brickwork & Plaster", pct: 10, timeline: "Interior Finishing" },
        { name: "On Completion of External Facade & Glazing", pct: 10, timeline: "Exterior Finishing" },
        { name: "On Notice of Possession & Registration", pct: 10, timeline: "Offer of Possession" },
      ];

      return clpTiers.map((tier, idx) => {
        const agreementPart = (agreementValue * tier.pct) / 100;
        const taxPart = (gstAmount * tier.pct) / 100;
        const isPossession = idx === clpTiers.length - 1;
        const otherCharges = isPossession ? ifmsAndPossession : 0;

        return {
          id: `clp-${idx + 1}`,
          stageName: tier.name,
          percentage: tier.pct,
          payableAgreementAmount: agreementPart,
          taxAmount: taxPart,
          possessionOtherCharges: otherCharges,
          totalPayable: agreementPart + taxPart + otherCharges,
          dueTimelineDescription: tier.timeline,
        };
      });
    }

    case "subvention_10_90": {
      return [
        {
          id: "sub-1",
          stageName: "On Booking & Registration of Agreement",
          percentage: 10,
          payableAgreementAmount: agreementValue * 0.1,
          taxAmount: gstAmount * 0.1,
          possessionOtherCharges: 0,
          totalPayable: (agreementValue * 0.1) + (gstAmount * 0.1),
          dueTimelineDescription: "Within 30 Days (Buyer Contribution)",
        },
        {
          id: "sub-2",
          stageName: "Bank Disbursement (Pre-EMI Subvented by Builder)",
          percentage: 80,
          payableAgreementAmount: agreementValue * 0.8,
          taxAmount: gstAmount * 0.8,
          possessionOtherCharges: 0,
          totalPayable: (agreementValue * 0.8) + (gstAmount * 0.8),
          dueTimelineDescription: "Construction Milestones (Bank Funded)",
        },
        {
          id: "sub-3",
          stageName: "On Notice of Possession & Key Handover",
          percentage: 10,
          payableAgreementAmount: agreementValue * 0.1,
          taxAmount: gstAmount * 0.1,
          possessionOtherCharges: ifmsAndPossession,
          totalPayable: (agreementValue * 0.1) + (gstAmount * 0.1) + ifmsAndPossession,
          dueTimelineDescription: "Offer of Possession (Final Settlement)",
        },
      ];
    }

    case "subvention_20_80": {
      return [
        {
          id: "sub20-1",
          stageName: "On Booking & Allotment Confirmation",
          percentage: 20,
          payableAgreementAmount: agreementValue * 0.2,
          taxAmount: gstAmount * 0.2,
          possessionOtherCharges: 0,
          totalPayable: (agreementValue * 0.2) + (gstAmount * 0.2),
          dueTimelineDescription: "Within 45 Days (Buyer Contribution)",
        },
        {
          id: "sub20-2",
          stageName: "Bank Disbursement across Construction",
          percentage: 70,
          payableAgreementAmount: agreementValue * 0.7,
          taxAmount: gstAmount * 0.7,
          possessionOtherCharges: 0,
          totalPayable: (agreementValue * 0.7) + (gstAmount * 0.7),
          dueTimelineDescription: "Linked to Slab Casting (Bank Funded)",
        },
        {
          id: "sub20-3",
          stageName: "On Offer of Possession & Handover",
          percentage: 10,
          payableAgreementAmount: agreementValue * 0.1,
          taxAmount: gstAmount * 0.1,
          possessionOtherCharges: ifmsAndPossession,
          totalPayable: (agreementValue * 0.1) + (gstAmount * 0.1) + ifmsAndPossession,
          dueTimelineDescription: "Offer of Possession",
        },
      ];
    }

    case "down_payment": {
      return [
        {
          id: "dp-1",
          stageName: "On Booking Token",
          percentage: 10,
          payableAgreementAmount: agreementValue * 0.1,
          taxAmount: gstAmount * 0.1,
          possessionOtherCharges: 0,
          totalPayable: (agreementValue * 0.1) + (gstAmount * 0.1),
          dueTimelineDescription: "Day 0",
        },
        {
          id: "dp-2",
          stageName: "Within 45 Days (Down Payment with Discount Benefit)",
          percentage: 85,
          payableAgreementAmount: agreementValue * 0.85,
          taxAmount: gstAmount * 0.85,
          possessionOtherCharges: 0,
          totalPayable: (agreementValue * 0.85) + (gstAmount * 0.85),
          dueTimelineDescription: "Within 45 Days",
        },
        {
          id: "dp-3",
          stageName: "On Offer of Possession & Registration",
          percentage: 5,
          payableAgreementAmount: agreementValue * 0.05,
          taxAmount: gstAmount * 0.05,
          possessionOtherCharges: ifmsAndPossession,
          totalPayable: (agreementValue * 0.05) + (gstAmount * 0.05) + ifmsAndPossession,
          dueTimelineDescription: "Offer of Possession",
        },
      ];
    }

    case "custom":
    default: {
      return [
        {
          id: "custom-1",
          stageName: "Initial Booking Payment",
          percentage: 25,
          payableAgreementAmount: agreementValue * 0.25,
          taxAmount: gstAmount * 0.25,
          possessionOtherCharges: 0,
          totalPayable: (agreementValue * 0.25) + (gstAmount * 0.25),
          dueTimelineDescription: "Booking Stage",
        },
        {
          id: "custom-2",
          stageName: "Mid-Term Construction Milestone",
          percentage: 50,
          payableAgreementAmount: agreementValue * 0.5,
          taxAmount: gstAmount * 0.5,
          possessionOtherCharges: 0,
          totalPayable: (agreementValue * 0.5) + (gstAmount * 0.5),
          dueTimelineDescription: "Structure Completion",
        },
        {
          id: "custom-3",
          stageName: "Final Possession & Registration",
          percentage: 25,
          payableAgreementAmount: agreementValue * 0.25,
          taxAmount: gstAmount * 0.25,
          possessionOtherCharges: ifmsAndPossession,
          totalPayable: (agreementValue * 0.25) + (gstAmount * 0.25) + ifmsAndPossession,
          dueTimelineDescription: "Possession Handover",
        },
      ];
    }
  }
}

/**
 * Initializes default parameters based on unit attributes
 */
export function getDefaultCostParameters(unit: ProjectUnit, custom?: Partial<CostSheetParameters>): CostSheetParameters {
  const superArea = unit.superAreaSqFt || unit.sizeSqFt || 2000;
  const carpetArea = unit.carpetAreaSqFt || Math.round(superArea * 0.72);
  const floorNum = unit.floor || 1;

  // Derive base rate per sqft from unit asking price if not provided
  let derivedBaseRate = 12500;
  if (unit.price && superArea > 0) {
    derivedBaseRate = Math.round(unit.price / superArea);
  }

  const state: IndianState = custom?.state ?? "haryana";
  const buyerGender = custom?.buyerGender ?? "male";
  const plcType = custom?.plcType ?? (unit.isCornerUnit ? "corner_unit" : "none");

  let defaultPlcRate = 0;
  if (custom?.plcRatePerSqFt !== undefined) {
    defaultPlcRate = custom.plcRatePerSqFt;
  } else if (plcType === "park_facing") {
    defaultPlcRate = 200;
  } else if (plcType === "corner_unit") {
    defaultPlcRate = 250;
  } else if (plcType === "club_pool_facing") {
    defaultPlcRate = 350;
  } else if (plcType === "golf_course_facing") {
    defaultPlcRate = 500;
  }

  return {
    baseRatePerSqFt: custom?.baseRatePerSqFt ?? derivedBaseRate,
    superAreaSqFt: custom?.superAreaSqFt ?? superArea,
    carpetAreaSqFt: custom?.carpetAreaSqFt ?? carpetArea,
    floorNumber: custom?.floorNumber ?? floorNum,
    floorRiseRatePerFloor: custom?.floorRiseRatePerFloor ?? 50, // ₹50/sqft per floor above 4th
    floorRiseThresholdFloor: custom?.floorRiseThresholdFloor ?? 4,
    plcRatePerSqFt: defaultPlcRate,
    plcType: plcType,
    coveredCarParkingCount: custom?.coveredCarParkingCount ?? (unit.parkingSlots || 2),
    carParkingCostPerSlot: custom?.carParkingCostPerSlot ?? 500000, // ₹5 Lakh per slot
    clubMembershipCharges: custom?.clubMembershipCharges ?? 350000, // ₹3.5 Lakh
    powerBackupAndInfraPerSqFt: custom?.powerBackupAndInfraPerSqFt ?? 150,
    ifmsRatePerSqFt: custom?.ifmsRatePerSqFt ?? 100, // ₹100/sqft
    isReadyToMove: custom?.isReadyToMove ?? (unit.physicalCondition === "brand_new" || unit.occupancyStatus === "vacant" ? false : false),
    gstRatePct: custom?.gstRatePct ?? 5.0,
    state,
    buyerGender,
    stampDutyPct: custom?.stampDutyPct ?? getStandardStampDutyPct(state, buyerGender),
    registrationCharges: custom?.registrationCharges ?? 50000,
    possessionCharges: custom?.possessionCharges ?? 100000,
    paymentPlanType: custom?.paymentPlanType ?? "clp",
    downPaymentDiscountPct: custom?.downPaymentDiscountPct ?? 8.0,
    ...custom,
  };
}

/**
 * Calculates complete Indian Real Estate Cost Sheet Breakdown
 */
export function calculateCostSheet(unit: ProjectUnit, customParams?: Partial<CostSheetParameters>): CostSheetBreakdown {
  const params = getDefaultCostParameters(unit, customParams);

  const superArea = Math.max(params.superAreaSqFt, 1);
  const carpetArea = Math.max(params.carpetAreaSqFt, 1);
  const loadingPct = ((superArea - carpetArea) / carpetArea) * 100;

  // 1. Basic Sale Price (BSP)
  let baseRate = params.baseRatePerSqFt;
  if (params.paymentPlanType === "down_payment" && params.downPaymentDiscountPct > 0) {
    baseRate = baseRate * (1 - params.downPaymentDiscountPct / 100);
  }
  const basicSalePrice = Math.round(baseRate * superArea);

  // 2. Floor Rise
  const eligibleFloors = Math.max(0, params.floorNumber - params.floorRiseThresholdFloor);
  const floorRiseRate = eligibleFloors * params.floorRiseRatePerFloor;
  const floorRiseCharges = Math.round(floorRiseRate * superArea);

  // 3. Preferential Location Charges (PLC)
  let plcRate = params.plcRatePerSqFt;
  if (plcRate === 0 && params.plcType !== "none") {
    if (params.plcType === "park_facing") plcRate = 200;
    if (params.plcType === "corner_unit") plcRate = 250;
    if (params.plcType === "club_pool_facing") plcRate = 350;
    if (params.plcType === "golf_course_facing") plcRate = 500;
  }
  const plcCharges = Math.round(plcRate * superArea);

  // 4. Car Parking & Club Charges
  const carParkingCharges = Math.round(params.coveredCarParkingCount * params.carParkingCostPerSlot);
  const clubMembershipCharges = Math.round(params.clubMembershipCharges);
  const powerBackupInfraCharges = Math.round(params.powerBackupAndInfraPerSqFt * superArea);

  // 5. Total Agreement Value (Taxable Consideration)
  const totalBasicCost = basicSalePrice + floorRiseCharges + plcCharges;
  const totalAdditionalCost = carParkingCharges + clubMembershipCharges + powerBackupInfraCharges;
  const netAgreementValue = totalBasicCost + totalAdditionalCost;

  // 6. GST Calculation
  // 0% for Ready-to-Move with OC, 5% standard luxury under-construction
  const effectiveGstPct = params.isReadyToMove ? 0 : params.gstRatePct;
  const gstAmount = Math.round((netAgreementValue * effectiveGstPct) / 100);

  // 7. Stamp Duty & Registration (Calculated on Net Agreement Value)
  const stampDutyRatePct = params.stampDutyPct > 0 ? params.stampDutyPct : getStandardStampDutyPct(params.state, params.buyerGender);
  const stampDutyAmount = Math.round((netAgreementValue * stampDutyRatePct) / 100);
  const registrationAmount = Math.round(params.registrationCharges);
  const totalGovernmentLevies = gstAmount + stampDutyAmount + registrationAmount;

  // 8. Non-Taxable / Possession Deposits (Payable on Possession)
  const ifmsAmount = Math.round(params.ifmsRatePerSqFt * superArea);
  const possessionCharges = Math.round(params.possessionCharges);
  const totalPossessionCharges = ifmsAmount + possessionCharges;

  // 9. All-Inclusive Total Cost of Acquisition
  const totalAllInclusiveCost = netAgreementValue + totalGovernmentLevies + totalPossessionCharges;
  const effectiveAllInclusivePerSqFt = Math.round(totalAllInclusiveCost / superArea);

  // 10. Payment Milestones Schedule
  const milestones = getStandardMilestones(
    params.paymentPlanType,
    netAgreementValue,
    gstAmount,
    totalPossessionCharges
  );

  const planNameMap: Record<PaymentPlanType, string> = {
    clp: "Construction Linked Payment Plan (CLP)",
    subvention_10_90: "10:90 Bank Subvention Scheme",
    subvention_20_80: "20:80 Builder Bank Flexi Plan",
    down_payment: `Down Payment Plan (${params.downPaymentDiscountPct}% Discounted)`,
    custom: "Custom Milestone Schedule",
  };

  return {
    superAreaSqFt: superArea,
    carpetAreaSqFt: carpetArea,
    effectiveLoadingPct: Math.round(loadingPct * 10) / 10,

    baseRatePerSqFt: Math.round(baseRate),
    basicSalePrice,
    floorRiseRatePerSqFt: floorRiseRate,
    floorRiseCharges,
    plcRatePerSqFt: plcRate,
    plcCharges,
    carParkingCharges,
    clubMembershipCharges,
    powerBackupInfraCharges,

    totalBasicCost,
    totalAdditionalCost,
    netAgreementValue,

    gstRatePct: effectiveGstPct,
    gstAmount,
    stampDutyRatePct,
    stampDutyAmount,
    registrationAmount,
    totalGovernmentLevies,

    ifmsAmount,
    possessionCharges,
    totalPossessionCharges,

    totalAllInclusiveCost,
    effectiveAllInclusivePerSqFt,

    paymentPlanName: planNameMap[params.paymentPlanType] || "Standard Payment Plan",
    paymentPlanType: params.paymentPlanType,
    milestones,
  };
}

/**
 * Formats a clean, high-conversion WhatsApp text summary of the cost sheet
 */
export function generateCostSheetWhatsAppText(
  unit: ProjectUnit,
  breakdown: CostSheetBreakdown,
  agencyName: string = "Apex Realty Advisors"
): string {
  const formatINR = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString("en-IN")}`;
  };

  return `*OFFICIAL COST SHEET & PAYMENT PLAN*
🏢 *Project:* ${unit.projectName || "Luxury Residence"}
📍 *Unit:* ${unit.tower} - Unit ${unit.unitNumber} (${unit.configuration})
📐 *Area:* ${breakdown.superAreaSqFt} Sq.Ft. Super Area | Floor: ${unit.floor || "High Floor"}

*COMMERCIAL BREAKDOWN:*
• Base Sale Price: ${formatINR(breakdown.basicSalePrice)} (@ ₹${breakdown.baseRatePerSqFt.toLocaleString("en-IN")}/sqft)
${breakdown.floorRiseCharges > 0 ? `• Floor Rise Charges: ${formatINR(breakdown.floorRiseCharges)}\n` : ""}${breakdown.plcCharges > 0 ? `• PLC Charges: ${formatINR(breakdown.plcCharges)}\n` : ""}• Car Parking Slots (${unit.parkingSlots || 2} Slots): ${formatINR(breakdown.carParkingCharges)}
• Club Membership: ${formatINR(breakdown.clubMembershipCharges)}
• Power Backup & Infra: ${formatINR(breakdown.powerBackupInfraCharges)}
━━━━━━━━━━━━━━━━━━
👉 *Net Agreement Value:* ${formatINR(breakdown.netAgreementValue)}

*GOVERNMENT TAXES & REGISTRATION:*
• GST (${breakdown.gstRatePct}%): ${formatINR(breakdown.gstAmount)}
• Stamp Duty (${breakdown.stampDutyRatePct}%): ${formatINR(breakdown.stampDutyAmount)}
• Registration & Legal: ${formatINR(breakdown.registrationAmount)}
• IFMS & Possession Fund: ${formatINR(breakdown.totalPossessionCharges)}
━━━━━━━━━━━━━━━━━━
🏆 *ALL-INCLUSIVE TOTAL COST:* ${formatINR(breakdown.totalAllInclusiveCost)}
(Effective Rate: ₹${breakdown.effectiveAllInclusivePerSqFt.toLocaleString("en-IN")}/sqft)

*PAYMENT PLAN: ${breakdown.paymentPlanName}*
• Booking Token (10%): ${formatINR(breakdown.milestones[0]?.totalPayable || 0)}
• Within 30-45 Days: ${formatINR(breakdown.milestones[1]?.totalPayable || 0)}
• Linked Milestones: Structured across construction slabs
• Offer of Possession: Final 10% + Stamp Duty + IFMS

_Generated exclusively by ${agencyName}. For official booking & inventory lock, please reply to this message._`;
}
