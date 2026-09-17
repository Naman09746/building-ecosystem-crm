import { describe, it, expect } from "vitest";
import {
  createLeadSchema,
  createActivitySchema,
  resurrectScanSchema,
  aiAgentQualifySchema,
  phoneSchema
} from "@repo/core/lib/server/validations";

const VALID_UUID = "123e4567-e89b-42d3-a456-426614174000";

describe("Enterprise Inbound Zod Schemas Validation", () => {
  it("should validate and accept well-formed lead payload", () => {
    const validPayload = {
      personName: "Vikramaditya Singhania",
      phone: "+919810123456",
      projectId: VALID_UUID,
      budget: 35000000,
      stage: "new" as const,
      configurationPreference: "4 BHK Penthouse",
    };

    const result = createLeadSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("should reject negative budgets or malformed phone formats", () => {
    const invalidBudget = {
      personName: "Rahul",
      phone: "+919810123456",
      projectId: VALID_UUID,
      budget: -5000,
    };
    expect(createLeadSchema.safeParse(invalidBudget).success).toBe(false);

    const invalidPhone = {
      personName: "Rahul",
      phone: "123", // too short
      projectId: VALID_UUID,
      budget: 10000000,
    };
    expect(createLeadSchema.safeParse(invalidPhone).success).toBe(false);

    const absurdBudget = {
      personName: "Rahul",
      phone: "+919810123456",
      projectId: VALID_UUID,
      budget: Number.MAX_SAFE_INTEGER,
    };
    expect(createLeadSchema.safeParse(absurdBudget).success).toBe(false);
  });

  it("should reject non-UUID project and assignee identifiers", () => {
    const injectionAttempt = {
      personName: "Rahul Sharma",
      phone: "+919810123456",
      projectId: "proj-1); DROP TABLE leads;--",
      budget: 10000000,
    };
    expect(createLeadSchema.safeParse(injectionAttempt).success).toBe(false);
  });

  it("should enforce character length limits on notes and activity logs", () => {
    const oversizedNote = {
      type: "call" as const,
      notes: "a".repeat(2500), // Max limit is 2000
    };
    expect(createActivitySchema.safeParse(oversizedNote).success).toBe(false);
  });

  it("should reject activity metadata containing nested objects", () => {
    const badMetadata = {
      type: "note" as const,
      notes: "legitimate note",
      metadata: { evil: { deeply: { nested: true } } },
    };
    expect(createActivitySchema.safeParse(badMetadata).success).toBe(false);
  });

  it("should clamp resurrection scan threshold to a safe integer range", () => {
    // Valid
    expect(resurrectScanSchema.safeParse({ daysThreshold: 30 }).success).toBe(true);
    expect(resurrectScanSchema.safeParse({}).success).toBe(true); // default 14

    // PostgREST filter injection attempts must be rejected
    expect(
      resurrectScanSchema.safeParse({ daysThreshold: "0,infinity)" }).success
    ).toBe(false);
    expect(resurrectScanSchema.safeParse({ daysThreshold: 1.5 }).success).toBe(false);
    expect(resurrectScanSchema.safeParse({ daysThreshold: 0 }).success).toBe(false);
    expect(resurrectScanSchema.safeParse({ daysThreshold: 366 }).success).toBe(false);
    expect(resurrectScanSchema.safeParse({ daysThreshold: -5 }).success).toBe(false);
  });

  it("should validate AI autonomous qualification payload", () => {
    const validAiPayload = {
      buyerName: "Ananya Sharma",
      phone: "+919820011456",
      budgetINR: 85000000,
      preferredLocation: "Worli, Mumbai",
      configuration: "4 BHK Sea View",
      purchaseTimeline: "Within 60 Days",
      intentScore: 94,
      intentLevel: "Hot" as const,
      buyingSignals: ["Budget verified", "Ready for site walk"],
      recommendedAction: "Deliver VIP floor plans",
    };

    const result = aiAgentQualifySchema.safeParse(validAiPayload);
    expect(result.success).toBe(true);
  });
});
