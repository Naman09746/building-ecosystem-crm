import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
  handleValidationError,
  checkRateLimit,
} from "@repo/core/lib/server/api-security";
import {
  getApiAuthContext,
  getServiceRoleClient,
  isLiveSupabaseAvailable,
  MANAGER_ROLES,
} from "@repo/core/lib/server/supabase-server";
import { ingestInboundLead } from "@repo/core/lib/server/lead-ingestion";
import { z } from "zod";

const retryRequestSchema = z.object({
  eventId: z.string().uuid().optional(),
  idempotencyKey: z.string().max(255).optional(),
});

// GET /api/webhooks/retry - List failed or retryable webhook events for the tenant
export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Manager or owner access required", 403, "FORBIDDEN");
  }

  const supabase = getServiceRoleClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const { data: events, error } = await supabase
      .from("webhook_events")
      .select("id, provider, event_type, idempotency_key, status, retry_count, last_error, created_at, processed_at")
      .eq("org_id", auth.orgId)
      .in("status", ["failed", "retryable", "dead_letter"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[WEBHOOK_RETRY_GET_ERROR]", error.message);
      return apiError("Failed to fetch webhook events", 500, "DB_QUERY_ERROR");
    }

    return apiSuccess(events || [], 200);
  } catch {
    return apiError("Internal server error", 500, "SERVER_ERROR");
  }
}

// POST /api/webhooks/retry - Safe, idempotent retry of failed inbound events
export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Manager or owner access required", 403, "FORBIDDEN");
  }

  const rateCheck = checkRateLimit(`webhook_retry_${auth.userId}`, 20, 60_000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded for webhook retry", 429, "RATE_LIMIT_EXCEEDED");
  }

  const supabase = getServiceRoleClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const body = await req.json();
    const parsed = retryRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid request payload", 400, "INVALID_REQUEST");
    }

    const { eventId, idempotencyKey } = parsed.data;
    if (!eventId && !idempotencyKey) {
      return apiError("Either eventId or idempotencyKey must be provided", 400, "INVALID_REQUEST");
    }

    let query = supabase
      .from("webhook_events")
      .select("*")
      .eq("org_id", auth.orgId);

    if (eventId) query = query.eq("id", eventId);
    else if (idempotencyKey) query = query.eq("idempotency_key", idempotencyKey);

    const { data: event, error: fetchErr } = await query.maybeSingle();

    if (fetchErr || !event) {
      return apiError("Webhook event not found", 404, "NOT_FOUND");
    }

    if (event.status === "processed") {
      return apiSuccess({ status: "already_processed", leadId: event.lead_id }, 200);
    }

    const retryCount = (event.retry_count || 0) + 1;

    // Determine payload details for re-ingestion
    const payload = event.payload || {};
    let personName = "Inbound Prospect";
    let phone = "+919999999999";
    let budget: any = null;
    let config: any = null;

    if (event.provider === "meta_ads") {
      const change = payload?.entry?.[0]?.changes?.[0]?.value;
      personName = change?.full_name || "Meta Lead Prospect";
      phone = change?.phone_number || "+919811099234";
      budget = change?.budget;
      config = change?.configuration || change?.bhk;
    } else if (event.provider === "whatsapp") {
      const contact = payload?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0];
      const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      personName = contact?.profile?.name || "WhatsApp Contact";
      phone = message?.from || "+919811099234";
    }

    const ingestionResult = await ingestInboundLead({
      orgId: auth.orgId,
      source: event.provider === "meta_ads" ? "Meta Lead Ads (Retry)" : "WhatsApp Inbound (Retry)",
      personName,
      phone,
      budget,
      configuration: config,
      externalLeadId: event.idempotency_key,
      rawPayload: payload,
    });

    if (ingestionResult.success) {
      await supabase
        .from("webhook_events")
        .update({
          status: "processed",
          retry_count: retryCount,
          lead_id: ingestionResult.leadId,
          person_id: ingestionResult.personId,
          last_error: null,
          processed_at: new Date().toISOString(),
        })
        .eq("id", event.id);

      return apiSuccess({
        status: "retry_successful",
        leadId: ingestionResult.leadId,
        retryCount,
      }, 200);
    } else {
      const nextStatus = retryCount >= 5 ? "dead_letter" : "retryable";
      await supabase
        .from("webhook_events")
        .update({
          status: nextStatus,
          retry_count: retryCount,
          last_error: ingestionResult.error || ingestionResult.reason,
          processed_at: new Date().toISOString(),
        })
        .eq("id", event.id);

      return apiSuccess({
        status: "retry_failed",
        nextStatus,
        reason: ingestionResult.reason || ingestionResult.error,
        retryCount,
      }, 200);
    }
  } catch (err) {
    return handleValidationError(err);
  }
}
