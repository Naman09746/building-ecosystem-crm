import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, getAuthenticatedServerClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const supabase = await getAuthenticatedServerClient();

  if (!supabase || !isLiveSupabaseAvailable) {
    return apiSuccess({
      coreCrmStatus: "healthy",
      architectureMode: "separation_of_responsibilities",
      sourceOfTruth: "EcosystemRealty_PostgreSQL",
      outboxQueue: {
        pending: 0,
        failed: 0,
        delivered: 124,
      },
      n8nOrchestrator: {
        status: "standby_ready",
        circuitBreaker: "normal",
        lastSyncAt: new Date().toISOString(),
      },
      connectors: [
        { name: "WhatsApp Business API", provider: "n8n", status: "connected", failureCount: 0 },
        { name: "Meta Lead Ads Webhook", provider: "n8n", status: "connected", failureCount: 0 },
        { name: "Google Calendar Sync", provider: "n8n", status: "connected", failureCount: 0 },
        { name: "Property Portal Ingestion", provider: "n8n", status: "connected", failureCount: 0 },
      ],
    });
  }

  // Live Query from DB
  const [eventsResult, endpointsResult] = await Promise.all([
    supabase
      .from("crm_domain_events")
      .select("dispatch_status")
      .eq("org_id", auth.orgId),
    supabase
      .from("integration_endpoints")
      .select("*")
      .eq("org_id", auth.orgId),
  ]);

  const allEvents = eventsResult.data || [];
  const pendingCount = allEvents.filter((e) => e.dispatch_status === "pending").length;
  const failedCount = allEvents.filter((e) => e.dispatch_status === "failed" || e.dispatch_status === "dead_letter").length;
  const deliveredCount = allEvents.filter((e) => e.dispatch_status === "delivered").length;

  const endpoints = endpointsResult.data || [];
  const isAnyTripped = endpoints.some((ep) => ep.circuit_breaker_tripped);

  return apiSuccess({
    coreCrmStatus: "healthy",
    architectureMode: "separation_of_responsibilities",
    sourceOfTruth: "EcosystemRealty_PostgreSQL",
    outboxQueue: {
      pending: pendingCount,
      failed: failedCount,
      delivered: deliveredCount,
    },
    n8nOrchestrator: {
      status: isAnyTripped ? "degraded" : endpoints.length > 0 ? "active" : "standby_ready",
      circuitBreaker: isAnyTripped ? "tripped" : "normal",
      activeEndpointsCount: endpoints.filter((e) => e.is_active).length,
      lastSyncAt: endpoints[0]?.last_successful_delivery_at || new Date().toISOString(),
    },
    connectors: endpoints.map((ep) => ({
      id: ep.id,
      name: ep.name,
      provider: ep.provider,
      status: ep.circuit_breaker_tripped ? "tripped" : ep.is_active ? "connected" : "inactive",
      failureCount: ep.consecutive_failures,
      lastDelivery: ep.last_successful_delivery_at,
    })),
  });
}
