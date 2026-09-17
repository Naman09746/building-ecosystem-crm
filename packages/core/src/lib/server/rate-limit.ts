import { getServiceRoleClient } from "./supabase-server";
import { checkRateLimit } from "./api-security";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

/**
 * Two-tier rate limiter for cost-critical endpoints:
 *
 *   L1  In-memory token bucket — fast path, absorbs bursts and obvious floods
 *       without a DB roundtrip.
 *   L2  Postgres-backed fixed window via `consume_rate_limit` RPC — survives
 *       serverless cold starts and is consistent across instances.
 *
 * Degradation strategy: if the durable layer is unavailable we fall back to the
 * in-memory result (fail open to L1) so a DB hiccup never blocks legitimate
 * traffic — while still keeping the cheap local guard active.
 */
export async function checkRateLimitDurable(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60000
): Promise<RateLimitResult> {
  // L1 fast path
  const local = checkRateLimit(identifier, limit, windowMs);
  if (!local.allowed) return local;

  // L2 durable path
  const supabase = getServiceRoleClient();
  if (!supabase) return local;

  try {
    const { data, error } = await supabase.rpc("consume_rate_limit", {
      p_key: identifier,
      p_limit: limit,
      p_window_seconds: Math.ceil(windowMs / 1000),
    });
    if (error) throw error;
    const hitCount = typeof data === "number" ? data : 0;
    return {
      allowed: hitCount <= limit,
      remaining: Math.max(limit - hitCount, 0),
      resetMs: windowMs,
    };
  } catch {
    return local;
  }
}
