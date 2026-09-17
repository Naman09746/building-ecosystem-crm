import { NextRequest, NextResponse } from "next/server";
import {
  apiSuccess,
  apiError,
  verifyHmacSignature,
  timingSafeCompare,
} from "@repo/core/lib/server/api-security";
import { metaLeadAdsWebhookSchema } from "@repo/core/lib/server/validations";
import { getServiceRoleClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";
import { ingestInboundLead } from "@repo/core/lib/server/lead-ingestion";

const META_VERIFY_TOKEN = process.env.META_LEAD_ADS_VERIFY_TOKEN || "";
const META_APP_SECRET = process.env.META_APP_SECRET || "";
const META_GRAPH_ACCESS_TOKEN = process.env.META_GRAPH_ACCESS_TOKEN || "";

const MAX_PAYLOAD_BYTES = 64 * 1024;
const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60; // 5 minutes

function isFreshWebhookTime(timeSeconds: number | undefined): boolean {
  if (typeof timeSeconds !== "number" || !Number.isFinite(timeSeconds)) return false;
  const now = Math.floor(Date.now() / 1000);
  return Math.abs(now - timeSeconds) <= TIMESTAMP_TOLERANCE_SECONDS;
}

/**
 * Fetches lead data from Meta Graph API
 */
async function fetchMetaLeadData(leadgenId: string, accessToken: string) {
  try {
    const url = `https://graph.facebook.com/v19.0/${leadgenId}?fields=id,created_time,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,form_id,field_data&access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.warn(`[META_GRAPH_API_WARNING] HTTP ${res.status} fetching leadgen_id=${leadgenId}`);
      return null;
    }

    return await res.json();
  } catch (err: any) {
    console.error(`[META_GRAPH_API_ERROR] Failed fetching leadgen_id=${leadgenId}:`, err.message);
    return null;
  }
}

/**
 * Parses field_data array from Meta Graph API response into key-value map
 */
function parseFieldData(fieldData: Array<{ name: string; values: string[] }>): Record<string, string> {
  const map: Record<string, string> = {};
  if (!Array.isArray(fieldData)) return map;

  for (const item of fieldData) {
    if (item.name && Array.isArray(item.values) && item.values.length > 0) {
      const key = item.name.toLowerCase().replace(/[^a-z0-9_]/g, "_");
      map[key] = item.values[0];
    }
  }
  return map;
}

// GET /api/webhooks/meta-lead-ads - Verification Handshake
export async function GET(req: NextRequest) {
  if (!META_VERIFY_TOKEN) {
    console.error("[META_CONFIG_ERROR] META_LEAD_ADS_VERIFY_TOKEN is not set");
    return apiError("Webhook verification is not configured", 503, "SERVICE_UNAVAILABLE");
  }

  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token") || "";
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && timingSafeCompare(token, META_VERIFY_TOKEN)) {
    return new NextResponse(challenge, { status: 200 });
  }

  return apiError("Meta Lead Ads verification token mismatch", 403, "FORBIDDEN");
}

// POST /api/webhooks/meta-lead-ads - Inbound Lead Ad Ingestion Pipeline
export async function POST(req: NextRequest) {
  if (!META_APP_SECRET) {
    console.error("[META_CONFIG_ERROR] META_APP_SECRET is not set");
    return apiError(
      "Webhook signature verification is required but not configured",
      503,
      "SERVICE_UNAVAILABLE"
    );
  }

  const rawBody = await req.text();
  if (rawBody.length > MAX_PAYLOAD_BYTES) {
    return apiError("Payload too large", 413, "PAYLOAD_TOO_LARGE");
  }

  const signatureHeader = req.headers.get("x-hub-signature-256");
  const isValid = verifyHmacSignature(rawBody, signatureHeader, META_APP_SECRET);
  if (!isValid) {
    console.warn("[META_SECURITY_ALERT] Invalid HMAC signature detected!");
    return apiError("Invalid cryptographic payload signature", 401, "UNAUTHORIZED_WEBHOOK");
  }

  try {
    const jsonBody = JSON.parse(rawBody);
    const parsed = metaLeadAdsWebhookSchema.safeParse(jsonBody);

    if (!parsed.success) {
      return apiSuccess({ status: "ignored_non_leadgen_event" }, 200);
    }

    const entry = parsed.data.entry[0];
    const change = entry?.changes[0]?.value;
    const leadgenId = change?.leadgen_id;
    const formId = change?.form_id;
    const pageId = change?.page_id;
    const adId = change?.ad_id;

    if (!leadgenId) {
      return apiSuccess({ status: "no_leadgen_id" }, 200);
    }

    // Replay protection
    if (!isFreshWebhookTime(entry?.time)) {
      console.warn("[META_SECURITY_ALERT] Stale or missing timestamp dropped");
      return apiSuccess({ status: "stale_event_dropped", leadgenId }, 200);
    }

    const supabase = getServiceRoleClient();
    if (!supabase || !isLiveSupabaseAvailable) {
      return apiError(
        "Backend database is not configured. Set SUPABASE_SERVICE_ROLE_KEY.",
        503,
        "SERVICE_UNAVAILABLE"
      );
    }

    // TENANT RESOLUTION: Page ID or Form ID mapping
    const { data: source } = await supabase
      .from("webhook_sources")
      .select("org_id, project_id, config")
      .eq("provider", "meta_ads")
      .or(`external_id.eq.${pageId},external_id.eq.${formId}`)
      .maybeSingle();

    if (!source) {
      try {
        await supabase.from("webhook_events").insert({
          org_id: null,
          provider: "meta_ads",
          event_type: "unmapped_source",
          idempotency_key: `meta_unmapped_${leadgenId}`,
          payload: { page_id: pageId, form_id: formId, leadgen_id: leadgenId },
          status: "failed",
          error_message: "No webhook_sources mapping for page_id or form_id",
          processed_at: new Date().toISOString(),
        });
      } catch {}
      return apiSuccess({ status: "unmapped_page_id" }, 200);
    }

    // IDEMPOTENCY: durable lock enforced by unique idempotency_key on webhook_events
    const idempotencyKey = `meta_leadgen_${leadgenId}`;
    const { error: insertEventError } = await supabase.from("webhook_events").insert({
      org_id: source.org_id,
      provider: "meta_ads",
      event_type: "leadgen_captured",
      idempotency_key: idempotencyKey,
      payload: jsonBody,
      status: "processing",
    });

    if (insertEventError) {
      return apiSuccess({ status: "duplicate_dropped", leadgenId }, 200);
    }

    // Graph API Lead Retrieval
    const token = (source.config as any)?.access_token || META_GRAPH_ACCESS_TOKEN;
    let metaLeadData: any = null;
    if (token) {
      metaLeadData = await fetchMetaLeadData(leadgenId, token);
    }

    // Extract field data from Graph API or fallback payload
    const fieldMap = metaLeadData?.field_data
      ? parseFieldData(metaLeadData.field_data)
      : parseFieldData((change as any)?.field_data || []);

    const personName =
      fieldMap.full_name ||
      fieldMap.first_name ||
      (change as any)?.full_name ||
      "Meta Lead Prospect";

    const phone =
      fieldMap.phone_number ||
      fieldMap.phone ||
      (change as any)?.phone_number ||
      "+919999999999";

    const email = fieldMap.email || (change as any)?.email || null;
    const city = fieldMap.city || fieldMap.location || null;
    const budget = fieldMap.budget || fieldMap.price_range || null;
    const configuration = fieldMap.configuration || fieldMap.bhk || fieldMap.property_type || null;

    // Transactional CRM Ingestion Pipeline
    const ingestionResult = await ingestInboundLead({
      orgId: source.org_id,
      source: "Meta Lead Ads",
      personName,
      phone,
      email,
      city,
      budget,
      configuration,
      projectId: source.project_id || null,
      externalLeadId: leadgenId,
      campaignId: metaLeadData?.campaign_id || null,
      campaignName: metaLeadData?.campaign_name || null,
      adsetId: metaLeadData?.adset_id || null,
      adsetName: metaLeadData?.adset_name || null,
      adId: adId || metaLeadData?.ad_id || null,
      adName: metaLeadData?.ad_name || null,
      formId: formId || metaLeadData?.form_id || null,
      rawPayload: jsonBody,
      customNotes: `Meta Leadgen ID: ${leadgenId}`,
    });

    if (!ingestionResult.success) {
      await supabase
        .from("webhook_events")
        .update({
          status: ingestionResult.reason === "LEAD_QUOTA_EXCEEDED" ? "failed" : "retryable",
          last_error: ingestionResult.error || ingestionResult.reason,
          processed_at: new Date().toISOString(),
        })
        .eq("idempotency_key", idempotencyKey)
        .eq("org_id", source.org_id);

      return apiSuccess({
        status: "ingestion_failed",
        reason: ingestionResult.reason || ingestionResult.error,
      }, 200);
    }

    // Mark event processed & link entities
    await supabase
      .from("webhook_events")
      .update({
        status: "processed",
        lead_id: ingestionResult.leadId,
        person_id: ingestionResult.personId,
        processed_at: new Date().toISOString(),
      })
      .eq("idempotency_key", idempotencyKey)
      .eq("org_id", source.org_id);

    return apiSuccess({
      status: "processed",
      leadId: ingestionResult.leadId,
      salespersonId: ingestionResult.salespersonId,
      isNewLead: ingestionResult.isNewLead,
      duplicateType: ingestionResult.duplicateType,
    }, 200);
  } catch (err: any) {
    console.error("[META_LEAD_ADS_ERROR]", err);
    return apiSuccess({ status: "error_acknowledged" }, 200);
  }
}
