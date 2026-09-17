import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@repo/core/lib/server/api-security";
import {
  isLiveSupabaseAvailable,
  getAuthenticatedServerClient,
  getApiAuthContext,
  MANAGER_ROLES,
} from "@repo/core/lib/server/supabase-server";

// GET /api/health - System Health
// Public surface returns the minimum needed for uptime probes.
// Verbose diagnostics (latency, memory, uptime) require an authenticated
// manager/admin session.
export async function GET(req: NextRequest) {
  const verbose = req.nextUrl.searchParams.get("verbose") === "1";
  const startTime = Date.now();

  let dbStatus: "healthy" | "degraded" | "unconfigured" = "unconfigured";

  if (isLiveSupabaseAvailable) {
    try {
      const supabase = await getAuthenticatedServerClient();
      if (supabase) {
        // Canonical table is `orgs`
        const { error } = await supabase.from("orgs").select("id").limit(1);
        dbStatus = error ? "degraded" : "healthy";
      }
    } catch {
      dbStatus = "degraded";
    }
  }

  if (!verbose) {
    return apiSuccess({
      status: dbStatus === "healthy" ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
    }, 200);
  }

  // Verbose mode: authenticated managers only
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }
  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Manager or admin role required", 403, "FORBIDDEN");
  }

  let dbLatencyMs = 0;
  if (isLiveSupabaseAvailable) {
    try {
      const dbStart = Date.now();
      const supabase = await getAuthenticatedServerClient();
      if (supabase) {
        await supabase.from("orgs").select("id").limit(1);
        dbLatencyMs = Date.now() - dbStart;
      }
    } catch {}
  }

  const memoryUsage = process.memoryUsage();

  return apiSuccess({
    status: dbStatus === "healthy" ? "ok" : "degraded",
    environment: process.env.NODE_ENV || "development",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    services: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        provider: "Supabase PostgreSQL",
      },
      aiEngine: {
        configured: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY),
        model: "gemini-2.5-flash",
      },
      webhooks: {
        whatsapp: process.env.WHATSAPP_APP_SECRET ? "ready" : "unconfigured",
        metaLeadAds: process.env.META_APP_SECRET ? "ready" : "unconfigured",
      },
      memory: {
        rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
        heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      },
    },
    totalLatencyMs: Date.now() - startTime,
  }, 200);
}
