import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimitDurable } from "@repo/core/lib/server/rate-limit";

// Mock the service-role client factory so no env vars are needed.
const rpcMock = vi.fn() as any;
vi.mock("@repo/core/lib/server/supabase-server", () => ({
  getServiceRoleClient: () =>
    rpcMock.enabled
      ? { rpc: (...args: any[]) => rpcMock(...args) }
      : null,
}));

const uniqueKey = (name: string) => `test_rl_${name}_${Date.now()}_${Math.random().toString(36).slice(2)}`;

describe("checkRateLimitDurable", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    rpcMock.enabled = true;
  });

  it("blocks at L1 (memory) without touching the durable layer when flooded", async () => {
    const key = uniqueKey("l1block");
    rpcMock.enabled = false; // even with no DB, memory limiter must hold
    for (let i = 0; i < 3; i++) {
      await checkRateLimitDurable(key, 3, 60_000);
    }
    const blocked = await checkRateLimitDurable(key, 3, 60_000);
    expect(blocked.allowed).toBe(false);
  });

  it("allows while under the durable limit and blocks once exceeded", async () => {
    const key = uniqueKey("durable");
    let count = 0;
    rpcMock.mockImplementation(async () => {
      count += 1;
      return { data: count, error: null };
    });

    const first = await checkRateLimitDurable(key, 2, 60_000);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);

    const second = await checkRateLimitDurable(key, 2, 60_000);
    expect(second.allowed).toBe(true);

    const third = await checkRateLimitDurable(key, 2, 60_000);
    expect(third.allowed).toBe(false);
  });

  it("falls back to the in-memory result when the RPC errors", async () => {
    const key = uniqueKey("rpcfail");
    rpcMock.mockImplementation(async () => ({
      data: null,
      error: { message: "rpc unavailable" },
    }));

    const result = await checkRateLimitDurable(key, 5, 60_000);
    // Durable layer failed -> degrade to L1 which allowed the first request
    expect(result.allowed).toBe(true);
  });

  it("uses memory-only mode when no service-role client is configured", async () => {
    rpcMock.enabled = false;
    const key = uniqueKey("noservice");
    const result = await checkRateLimitDurable(key, 10, 60_000);
    expect(result.allowed).toBe(true);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
