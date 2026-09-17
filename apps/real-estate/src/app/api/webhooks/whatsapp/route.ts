import { NextRequest, NextResponse } from "next/server";
import {
  apiSuccess,
  apiError,
  verifyHmacSignature,
  timingSafeCompare,
} from "@repo/core/lib/server/api-security";
import { whatsappWebhookSchema } from "@repo/core/lib/server/validations";
import { getServiceRoleClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";
import { ingestInboundLead } from "@repo/core/lib/server/lead-ingestion";
import { normalizePhone } from "@repo/core/lib/utils";
import { createNotification } from "@repo/core/lib/server/notifications";

const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "";
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET || "";

const MAX_PAYLOAD_BYTES = 64 * 1024;
const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60; // 5 minutes

function isFreshWebhook(timestampSeconds: string | undefined): boolean {
  if (!timestampSeconds) return false;
  const ts = parseInt(timestampSeconds, 10);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  return Math.abs(now - ts) <= TIMESTAMP_TOLERANCE_SECONDS;
}

function senderNameSafe(name: string): string {
  return truncate(name.trim(), 100) || "WhatsApp Contact";
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// GET /api/webhooks/whatsapp - Meta Webhook Challenge Handshake
export async function GET(req: NextRequest) {
  if (!WHATSAPP_VERIFY_TOKEN) {
    console.error("[WHATSAPP_CONFIG_ERROR] WHATSAPP_VERIFY_TOKEN is not set");
    return apiError("Webhook verification is not configured", 503, "SERVICE_UNAVAILABLE");
  }

  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token") || "";
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && timingSafeCompare(token, WHATSAPP_VERIFY_TOKEN)) {
    return new NextResponse(challenge, { status: 200 });
  }

  return apiError("Verification token mismatch", 403, "FORBIDDEN");
}

// POST /api/webhooks/whatsapp - Inbound WhatsApp Message Ingestion Pipeline
export async function POST(req: NextRequest) {
  if (!WHATSAPP_APP_SECRET) {
    console.error("[WHATSAPP_CONFIG_ERROR] WHATSAPP_APP_SECRET is not set");
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
  const isValid = verifyHmacSignature(rawBody, signatureHeader, WHATSAPP_APP_SECRET);
  if (!isValid) {
    console.warn("[WHATSAPP_SECURITY_ALERT] Invalid HMAC signature detected!");
    return apiError("Invalid cryptographic payload signature", 401, "UNAUTHORIZED_WEBHOOK");
  }

  try {
    const jsonBody = JSON.parse(rawBody);
    const parsed = whatsappWebhookSchema.safeParse(jsonBody);

    if (!parsed.success) {
      return apiSuccess({ status: "ignored_non_message_event" }, 200);
    }

    const entry = parsed.data.entry[0]?.changes[0]?.value;
    const message = entry?.messages?.[0];
    const contact = entry?.contacts?.[0];

    if (!message || !contact) {
      return apiSuccess({ status: "acknowledged_no_message" }, 200);
    }

    // Replay protection: stale messages are dropped
    if (!isFreshWebhook(message.timestamp)) {
      console.warn("[WHATSAPP_SECURITY_ALERT] Stale or missing timestamp dropped");
      return apiSuccess({ status: "stale_event_dropped", messageId: message.id }, 200);
    }

    const supabase = getServiceRoleClient();
    if (!supabase || !isLiveSupabaseAvailable) {
      return apiError(
        "Backend database is not configured. Set SUPABASE_SERVICE_ROLE_KEY.",
        503,
        "SERVICE_UNAVAILABLE"
      );
    }

    // TENANT RESOLUTION: phone_number_id mapping in webhook_sources
    const phoneNumberId = entry?.metadata?.phone_number_id;
    const { data: source } = await supabase
      .from("webhook_sources")
      .select("org_id, project_id")
      .eq("provider", "whatsapp")
      .eq("external_id", phoneNumberId)
      .maybeSingle();

    if (!source) {
      try {
        await supabase.from("webhook_events").insert({
          org_id: null,
          provider: "whatsapp",
          event_type: "unmapped_source",
          idempotency_key: `wa_unmapped_${message.id}`,
          payload: { phone_number_id: phoneNumberId, message_id: message.id },
          status: "failed",
          error_message: "No webhook_sources mapping for phone_number_id",
          processed_at: new Date().toISOString(),
        });
      } catch {}
      return apiSuccess({ status: "unmapped_phone_number_id" }, 200);
    }

    // IDEMPOTENCY: durable lock enforced by unique idempotency_key on webhook_events
    const idempotencyKey = `wa_msg_${message.id}`;
    const { error: insertEventError } = await supabase.from("webhook_events").insert({
      org_id: source.org_id,
      provider: "whatsapp",
      event_type: "inbound_message",
      idempotency_key: idempotencyKey,
      payload: jsonBody,
      status: "processing",
    });

    if (insertEventError) {
      return apiSuccess({ status: "duplicate_dropped", messageId: message.id }, 200);
    }

    const senderName = senderNameSafe(contact.profile.name);
    const normalizedPhone = normalizePhone(message.from);
    const messageBody = message.text?.body || "[WhatsApp Media / Audio Message]";

    // Check if active lead exists
    const { data: existingLeads } = await supabase
      .from("leads")
      .select("id, person_id, stage, salesperson_id, project_name, profiles(name)")
      .eq("org_id", source.org_id)
      .eq("phone_normalized", normalizedPhone)
      .order("created_at", { ascending: false });

    const activeLead = existingLeads?.find((l) => !["won", "lost"].includes(l.stage));

    if (activeLead) {
      // Append conversation activity
      await supabase.from("activities").insert({
        org_id: source.org_id,
        lead_id: activeLead.id,
        person_id: activeLead.person_id,
        user_id: activeLead.salesperson_id || source.org_id,
        user_name: "WhatsApp Integration",
        person_name: senderName,
        type: "whatsapp",
        title: "Inbound WhatsApp Message",
        notes: truncate(`[WhatsApp Inbound Msg ${message.id}]: ${messageBody}`, 1900),
        occurred_at: new Date().toISOString(),
      });

      await supabase
        .from("leads")
        .update({
          last_activity_text: `WhatsApp: ${truncate(messageBody, 50)}`,
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", activeLead.id)
        .eq("org_id", source.org_id);

      if (activeLead.salesperson_id) {
        await createNotification({
          orgId: source.org_id,
          userId: activeLead.salesperson_id,
          title: `WhatsApp Message from ${senderName}`,
          message: truncate(messageBody, 120),
          type: "lead_assigned",
          priority: "high",
          entityType: "lead",
          entityId: activeLead.id,
          link: `/leads?id=${activeLead.id}`,
          dedupKey: `wa_notif_${message.id}`,
        });
      }

      await supabase
        .from("webhook_events")
        .update({
          status: "processed",
          lead_id: activeLead.id,
          person_id: activeLead.person_id,
          processed_at: new Date().toISOString(),
        })
        .eq("idempotency_key", idempotencyKey)
        .eq("org_id", source.org_id);

      return apiSuccess({
        status: "attached_to_existing_lead",
        leadId: activeLead.id,
        messageId: message.id,
      }, 200);
    }

    // If no active lead exists, ingest fresh lead into sales pipeline
    const ingestionResult = await ingestInboundLead({
      orgId: source.org_id,
      source: "WhatsApp Inbound",
      personName: senderName,
      phone: normalizedPhone,
      projectId: source.project_id || null,
      externalLeadId: message.id,
      rawPayload: jsonBody,
      customNotes: `WhatsApp Message: "${messageBody}"`,
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

    // Mark processed
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
      messageId: message.id,
    }, 200);
  } catch (err: any) {
    console.error("[WHATSAPP_PROCESSING_ERROR]", err);
    return apiSuccess({ status: "error_acknowledged" }, 200);
  }
}
