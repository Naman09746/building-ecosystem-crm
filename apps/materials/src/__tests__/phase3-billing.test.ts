import { describe, it, expect } from "vitest";
import crypto from "crypto";
import {
  resolvePlan,
  checkLeadQuota,
  checkFeatureAccess,
  isSubscriptionActive,
  getPlanPrice,
  PLAN_CONFIGS,
} from "@repo/core/lib/server/subscription";
import {
  createProviderCheckoutSession,
  verifyProviderWebhookSignature,
} from "@repo/core/lib/server/billing-provider";
import {
  createCheckoutSessionSchema,
  cancelSubscriptionSchema,
  createRefundSchema,
  updateBillingProfileSchema,
} from "@repo/core/lib/server/validations";

describe("Phase 3: Billing & Subscription Domain Logic", () => {
  describe("Plan Configuration & Quota Math", () => {
    it("resolves unknown plans to starter (fail closed)", () => {
      expect(resolvePlan("enterprise")).toBe("enterprise");
      expect(resolvePlan("growth")).toBe("growth");
      expect(resolvePlan("starter")).toBe("starter");
      expect(resolvePlan("unlimited_hacker_plan")).toBe("starter");
      expect(resolvePlan(null)).toBe("starter");
      expect(resolvePlan(undefined)).toBe("starter");
    });

    it("calculates prices accurately for monthly and annual cycles", () => {
      expect(getPlanPrice("starter", "monthly")).toBe(1999);
      expect(getPlanPrice("starter", "yearly")).toBe(19188);
      expect(getPlanPrice("growth", "monthly")).toBe(4999);
      expect(getPlanPrice("growth", "yearly")).toBe(47988);
      expect(getPlanPrice("enterprise", "monthly")).toBe(9999);
      expect(getPlanPrice("enterprise", "yearly")).toBe(95988);
    });

    it("enforces lead quota boundaries correctly", () => {
      const underQuota = checkLeadQuota(150, "starter");
      expect(underQuota.allowed).toBe(true);

      const atQuota = checkLeadQuota(300, "starter");
      expect(atQuota.allowed).toBe(false);
      expect(atQuota.reason).toContain("Plan lead limit reached");

      const growthUnder = checkLeadQuota(2499, "growth");
      expect(growthUnder.allowed).toBe(true);

      const growthOver = checkLeadQuota(2500, "growth");
      expect(growthOver.allowed).toBe(false);
    });

    it("gates enterprise features according to plan configuration", () => {
      expect(checkFeatureAccess("ai_agents", "starter")).toBe(false);
      expect(checkFeatureAccess("ai_agents", "growth")).toBe(true);
      expect(checkFeatureAccess("ai_agents", "enterprise")).toBe(true);

      expect(checkFeatureAccess("multi_region", "starter")).toBe(false);
      expect(checkFeatureAccess("multi_region", "growth")).toBe(false);
      expect(checkFeatureAccess("multi_region", "enterprise")).toBe(true);
    });

    it("evaluates subscription active status with grace periods", () => {
      expect(isSubscriptionActive("active")).toBe(true);
      expect(isSubscriptionActive("trialing")).toBe(true);
      expect(isSubscriptionActive("canceled")).toBe(false);
      expect(isSubscriptionActive("unpaid")).toBe(false);

      // Past due with active grace period (7 days in future)
      const futureGrace = new Date(Date.now() + 7 * 86400000).toISOString();
      expect(isSubscriptionActive("past_due", futureGrace)).toBe(true);

      // Past due with expired grace period
      const expiredGrace = new Date(Date.now() - 86400000).toISOString();
      expect(isSubscriptionActive("past_due", expiredGrace)).toBe(false);
    });
  });

  describe("Payment Provider Abstraction & Cryptography", () => {
    it("creates cryptographically verifiable sandbox checkout sessions", async () => {
      process.env.BILLING_WEBHOOK_SECRET = process.env.BILLING_WEBHOOK_SECRET || "test_billing_secret_123456";
      const session = await createProviderCheckoutSession({
        orgId: "00000000-0000-0000-0000-000000000001",
        orgName: "Harness Realty",
        userId: "user_test_123",
        userEmail: "owner@test.local",
        planId: "growth",
        billingCycle: "yearly",
      });

      expect(session.provider).toBe("simulated");
      expect(session.amount).toBe(47988);
      expect(session.currency).toBe("INR");
      expect(session.sessionId).toMatch(/^sim_cs_/);
      expect(session.checkoutUrl).toContain("session_id=");
      expect(session.checkoutUrl).toContain("token=");
    });

    it("verifies HMAC SHA-256 webhook signatures correctly", () => {
      const secret = "test_webhook_secret_key_123";
      const payload = JSON.stringify({ event: "payment.captured", id: "pay_123" });
      const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

      const isValid = verifyProviderWebhookSignature(payload, signature, secret);
      expect(isValid).toBe(true);

      const isInvalid = verifyProviderWebhookSignature(payload, "wrong_signature", secret);
      expect(isInvalid).toBe(false);
    });

    it("verifies Stripe timestamped webhook signatures correctly", () => {
      const secret = "whsec_stripe_test_secret";
      const payload = JSON.stringify({ id: "evt_stripe_1", type: "checkout.session.completed" });
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signedPayload = `${timestamp}.${payload}`;
      const sig = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
      const header = `t=${timestamp},v1=${sig}`;

      const isValid = verifyProviderWebhookSignature(payload, header, secret);
      expect(isValid).toBe(true);

      const isTampered = verifyProviderWebhookSignature(payload + "tamper", header, secret);
      expect(isTampered).toBe(false);
    });
  });

  describe("Billing Validation Schemas", () => {
    it("validates createCheckoutSessionSchema", () => {
      const valid = createCheckoutSessionSchema.safeParse({
        planId: "growth",
        billingCycle: "yearly",
      });
      expect(valid.success).toBe(true);

      const invalidPlan = createCheckoutSessionSchema.safeParse({
        planId: "invalid_plan",
      });
      expect(invalidPlan.success).toBe(false);
    });

    it("validates cancelSubscriptionSchema", () => {
      const valid = cancelSubscriptionSchema.safeParse({
        reason: "Cost cutting",
        cancelAtPeriodEnd: true,
      });
      expect(valid.success).toBe(true);
    });

    it("validates createRefundSchema", () => {
      const valid = createRefundSchema.safeParse({
        invoiceId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        amount: 4999,
        reason: "Customer requested cancellation within 24h",
      });
      expect(valid.success).toBe(true);

      const negativeAmount = createRefundSchema.safeParse({
        invoiceId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        amount: -500,
        reason: "Invalid negative",
      });
      expect(negativeAmount.success).toBe(false);
    });

    it("validates Indian GSTIN format in updateBillingProfileSchema", () => {
      const validGstin = updateBillingProfileSchema.safeParse({
        legalName: "Apex Realty Pvt Ltd",
        gstin: "27AAACA1234A1Z5",
        billingEmail: "finance@apex.com",
      });
      expect(validGstin.success).toBe(true);

      const invalidGstin = updateBillingProfileSchema.safeParse({
        gstin: "INVALID_GSTIN_123",
      });
      expect(invalidGstin.success).toBe(false);
    });
  });
});
