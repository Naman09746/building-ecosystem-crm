import { describe, it, expect } from "vitest";
import { timingSafeCompare, verifyHmacSignature } from "@repo/core/lib/server/api-security";
import crypto from "crypto";

describe("Webhook Security Primitives", () => {
  describe("timingSafeCompare", () => {
    it("should accept identical tokens", () => {
      expect(timingSafeCompare("secret-token-abc", "secret-token-abc")).toBe(true);
    });

    it("should reject different tokens of equal length", () => {
      expect(timingSafeCompare("secret-token-abc", "secret-token-abd")).toBe(false);
    });

    it("should reject different-length tokens without throwing", () => {
      expect(timingSafeCompare("short", "a-much-longer-token-value")).toBe(false);
      expect(timingSafeCompare("", "")).toBe(true); // equal empty strings
    });
  });

  describe("verifyHmacSignature (fail-closed)", () => {
    const secret = "test-webhook-secret";
    const body = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    const validSignature = crypto
      .createHmac("sha256", secret)
      .update(body, "utf8")
      .digest("hex");

    it("should verify a correctly signed payload", () => {
      expect(verifyHmacSignature(body, `sha256=${validSignature}`, secret)).toBe(true);
    });

    it("should fail closed when the signature header is missing", () => {
      expect(verifyHmacSignature(body, null, secret)).toBe(false);
    });

    it("should fail closed when the app secret is not configured (empty string)", () => {
      // This is the CRITICAL behavior: unset env vars must never allow unsigned payloads.
      expect(verifyHmacSignature(body, `sha256=${validSignature}`, "")).toBe(false);
    });

    it("should reject tampered payloads", () => {
      const tampered = body.replace("entry", "entryX");
      expect(verifyHmacSignature(tampered, `sha256=${validSignature}`, secret)).toBe(false);
    });

    it("should reject malformed signature headers without throwing", () => {
      expect(verifyHmacSignature(body, "not-a-signature", secret)).toBe(false);
      expect(verifyHmacSignature(body, "sha256=zzzz", secret)).toBe(false);
    });
  });
});
