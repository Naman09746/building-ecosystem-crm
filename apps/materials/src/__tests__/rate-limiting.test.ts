import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, checkIdempotency, saveIdempotency } from "@repo/core/lib/server/api-security";

describe("API Security & Rate Limiting Token Bucket", () => {
  it("should allow requests under the defined limit", () => {
    const testIp = `test_ip_${Date.now()}`;
    const res1 = checkRateLimit(testIp, 5, 10000);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(4);

    const res2 = checkRateLimit(testIp, 5, 10000);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(3);
  });

  it("should block requests that exceed limit and return remaining = 0", () => {
    const testIp = `test_flood_ip_${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      checkRateLimit(testIp, 3, 10000);
    }
    const blockedRes = checkRateLimit(testIp, 3, 10000);
    expect(blockedRes.allowed).toBe(false);
    expect(blockedRes.remaining).toBe(0);
  });
});

describe("Idempotency Engine (Duplicate Prevention)", () => {
  it("should cache and return responses for repeated idempotency keys", () => {
    const testKey = `idemp_${Date.now()}`;
    const testPayload = { leadId: "lead-123", status: "created" };

    expect(checkIdempotency(testKey)).toBeNull();

    saveIdempotency(testKey, testPayload, 60);

    const cached = checkIdempotency(testKey);
    expect(cached).toEqual(testPayload);
  });
});
