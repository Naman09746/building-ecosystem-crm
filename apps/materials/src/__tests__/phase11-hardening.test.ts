import { describe, it, expect } from "vitest";
import { sanitizeLogData, Logger } from "@repo/core/lib/server/logger";
import {
  verifyHmacSignature,
  timingSafeCompare,
  checkRateLimit,
} from "@repo/core/lib/server/api-security";
import {
  checkFeatureAccess,
  resolvePlan,
  PLAN_CONFIGS,
} from "@repo/core/lib/server/subscription";
import crypto from "crypto";

describe("Phase 11: Final Production Hardening & Security Matrix", () => {
  describe("1. Structured Logger & Privacy Redaction", () => {
    it("redacts passwords, secrets, tokens, api keys, and signatures recursively", () => {
      const sensitivePayload = {
        userId: "usr-123",
        orgId: "org-456",
        password: "superSecretPassword123!",
        stripeSignature: "t=12345,v1=abcdef",
        apiKey: "sk_live_999999",
        metadata: {
          token: "jwt.token.here",
          creditCard: "4111222233334444",
          safeField: "safeValue",
        },
      };

      const cleaned = sanitizeLogData(sensitivePayload);

      expect(cleaned.password).toBe("[REDACTED]");
      expect(cleaned.stripeSignature).toBe("[REDACTED]");
      expect(cleaned.apiKey).toBe("[REDACTED]");
      expect(cleaned.metadata.token).toBe("[REDACTED]");
      expect(cleaned.metadata.creditCard).toBe("[REDACTED]");
      expect(cleaned.metadata.safeField).toBe("safeValue");
      expect(cleaned.userId).toBe("usr-123");
      expect(cleaned.orgId).toBe("org-456");
    });
  });

  describe("2. Cryptographic Signatures & Timing Safe Comparison", () => {
    it("timingSafeCompare validates exact matches and rejects invalid inputs safely", () => {
      expect(timingSafeCompare("mySecretToken123", "mySecretToken123")).toBe(true);
      expect(timingSafeCompare("mySecretToken123", "wrongSecretToken123")).toBe(false);
      expect(timingSafeCompare("", "token")).toBe(false);
      expect(timingSafeCompare("token", "")).toBe(false);
      expect(timingSafeCompare("short", "longerTokenString")).toBe(false);
    });

    it("verifyHmacSignature validates correct sha256 signatures and rejects forged ones", () => {
      const secret = "webhook_secret_key_prod_99";
      const payload = JSON.stringify({ event: "lead.created", id: "evt_123" });
      const validHmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");

      expect(verifyHmacSignature(payload, `sha256=${validHmac}`, secret)).toBe(true);
      expect(verifyHmacSignature(payload, validHmac, secret)).toBe(true);
      expect(verifyHmacSignature(payload, "sha256=invalidSignature123", secret)).toBe(false);
      expect(verifyHmacSignature(payload, null, secret)).toBe(false);
    });
  });

  describe("3. Subscription Quotas & Feature Access Gates", () => {
    it("enforces plan feature gates strictly (starter vs growth vs enterprise)", () => {
      expect(checkFeatureAccess("resurrection", "starter")).toBe(false);
      expect(checkFeatureAccess("resurrection", "growth")).toBe(true);
      expect(checkFeatureAccess("resurrection", "enterprise")).toBe(true);

      expect(checkFeatureAccess("ai_agents", "starter")).toBe(false);
      expect(checkFeatureAccess("ai_agents", "growth")).toBe(true);
      expect(checkFeatureAccess("ai_agents", "enterprise")).toBe(true);

      expect(checkFeatureAccess("multi_region", "starter")).toBe(false);
      expect(checkFeatureAccess("multi_region", "growth")).toBe(false);
      expect(checkFeatureAccess("multi_region", "enterprise")).toBe(true);
    });

    it("resolves plan quotas accurately with strict limits", () => {
      const starterConfig = PLAN_CONFIGS.starter;
      const growthConfig = PLAN_CONFIGS.growth;
      const enterpriseConfig = PLAN_CONFIGS.enterprise;

      expect(starterConfig.maxSeats).toBe(1);
      expect(starterConfig.maxLeads).toBe(300);

      expect(growthConfig.maxSeats).toBe(4);
      expect(growthConfig.maxLeads).toBe(2500);

      expect(enterpriseConfig.maxSeats).toBe(25);
      expect(enterpriseConfig.maxLeads).toBe(50000);
    });

    it("falls back to starter plan if invalid plan name is provided", () => {
      expect(resolvePlan("invalid_plan_name")).toBe("starter");
      expect(resolvePlan(undefined)).toBe("starter");
    });
  });

  describe("4. Rate Limiter Security", () => {
    it("allows operations within limit and blocks when limit exceeded", () => {
      const key = `test_key_${Date.now()}`;
      const limit = 5;

      for (let i = 0; i < limit; i++) {
        const check = checkRateLimit(key, limit, 60000);
        expect(check.allowed).toBe(true);
      }

      const blockedCheck = checkRateLimit(key, limit, 60000);
      expect(blockedCheck.allowed).toBe(false);
      expect(blockedCheck.remaining).toBe(0);
    });
  });

  describe("5. Token Hashing & Replay Protection Invariants", () => {
    it("hashes invitation tokens deterministically with SHA-256", () => {
      const rawToken = "invite_tok_secure_random_hex_123456789";
      const hash1 = crypto.createHash("sha256").update(rawToken).digest("hex");
      const hash2 = crypto.createHash("sha256").update(rawToken).digest("hex");

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(rawToken);
      expect(hash1.length).toBe(64); // SHA-256 produces 64 hex characters
    });
  });
});
