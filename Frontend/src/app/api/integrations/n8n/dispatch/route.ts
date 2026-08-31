import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError, handleValidationError } from "@/lib/server/api-security";
import { getServiceRoleClient, isLiveSupabaseAvailable } from "@/lib/server/supabase-server";
import { emitDomainEvent } from "@/lib/server/domain-event-bus";
import { normalizePhone } from "@/lib/utils";

const n8nInboundPayloadSchema = z.object({
  sourceProvider: z.enum(["n8n", "meta_lead_ads", "whatsapp_api", "website_form", "portal_99acres", "portal_magicbricks", "google_calendar", "exotel"]),
  externalEventId: z.string().min(1, "External Event ID is required for idempotency"),
  eventType: z.enum(["lead_ingestion", "whatsapp_message", "ai_extraction_suggestion", "calendar_sync", "sla_escalation"]),
  orgId: z.string().uuid(),
  data: z.record(z.string(), z.any()),
  aiExtraction: z
    .object({
      confidenceScore: z.number().min(0).max(100).optional(),
      extractedIntent: z.string().optional(),
      extractedBudget: z.number().optional(),
      extractedConfiguration: z.string().optional(),
      extractedObjections: z.array(z.string()).optional(),
      requiresHumanApproval: z.boolean().default(true),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  // Service-to-service authentication (API Secret Header)
  const authHeader = req.headers.get("Authorization") || req.headers.get("X-CallCRM-Service-Key");
  const expectedSecret = process.env.N8N_SERVICE_SECRET || process.env.NEXTAUTH_SECRET || "callcrm_n8n_secret";

  const token = authHeader?.replace("Bearer ", "");
  if (!token || token !== expectedSecret) {
    return apiError("Unauthorized service access", 401, "UNAUTHORIZED");
  }

  try {
    const body = await req.json();
    const validated = n8nInboundPayloadSchema.parse(body);

    const supabase = getServiceRoleClient();
    if (!supabase || !isLiveSupabaseAvailable) {
      return apiSuccess({
        status: "processed_in_memory",
        externalEventId: validated.externalEventId,
        message: "Payload accepted by CallCRM",
      }, 200);
    }

    // 1. IDEMPOTENCY CHECK: Ensure duplicate webhooks from Meta/WhatsApp do not create duplicate records
    const { data: existingEvent } = await supabase
      .from("inbound_integration_events")
      .select("id, processing_status, resulting_entity_id")
      .eq("org_id", validated.orgId)
      .eq("source_provider", validated.sourceProvider)
      .eq("external_event_id", validated.externalEventId)
      .maybeSingle();

    if (existingEvent) {
      return apiSuccess({
        status: "duplicate_ignored",
        externalEventId: validated.externalEventId,
        existingEntityId: existingEvent.resulting_entity_id,
        message: "Event already processed previously",
      }, 200);
    }

    let resultingEntityId: string | undefined;
    let resultingEntityType = "lead";

    // 2. PROCESS INBOUND LEAD INGESTION
    if (validated.eventType === "lead_ingestion") {
      const rawPhone = validated.data.phone || validated.data.primaryPhone || "";
      const normalizedPhone = normalizePhone(rawPhone);
      const fullName = validated.data.fullName || validated.data.name || "Inbound Lead";

      // Deduplicate against People registry
      let personId: string;
      const { data: existingPerson } = await supabase
        .from("people")
        .select("id")
        .eq("org_id", validated.orgId)
        .eq("primary_phone", normalizedPhone)
        .maybeSingle();

      if (existingPerson) {
        personId = existingPerson.id;
      } else {
        const { data: newPerson } = await supabase
          .from("people")
          .insert({
            org_id: validated.orgId,
            full_name: fullName,
            primary_phone: normalizedPhone,
            email: validated.data.email || null,
            wealth_tier: "hni",
            source: validated.sourceProvider,
          })
          .select("id")
          .single();
        personId = newPerson?.id || `per-${Date.now()}`;
      }

      // Create Lead record
      const { data: newLead } = await supabase
        .from("leads")
        .insert({
          org_id: validated.orgId,
          person_id: personId,
          person_name: fullName,
          phone: rawPhone,
          phone_normalized: normalizedPhone,
          email: validated.data.email || null,
          budget: validated.data.budget || 10000000,
          stage: "new",
          source: validated.sourceProvider,
          configuration_preference: validated.data.configuration || "3 BHK",
          last_activity_text: `Ingested via n8n from ${validated.sourceProvider}`,
          last_activity_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      resultingEntityId = newLead?.id;

      // Emit LeadCreated event for downstream n8n triggers (e.g. Slack/WhatsApp alert)
      if (resultingEntityId) {
        await emitDomainEvent({
          orgId: validated.orgId,
          eventName: "LeadCreated",
          aggregateType: "lead",
          aggregateId: resultingEntityId,
          payload: {
            leadId: resultingEntityId,
            personId,
            fullName,
            phone: normalizedPhone,
            source: validated.sourceProvider,
            budget: validated.data.budget || 10000000,
          },
        });
      }
    }

    // 3. LOG TO INBOUND IDEMPOTENCY AUDIT TABLE
    await supabase.from("inbound_integration_events").insert({
      org_id: validated.orgId,
      source_provider: validated.sourceProvider,
      external_event_id: validated.externalEventId,
      event_type: validated.eventType,
      raw_payload: validated.data,
      sanitized_payload: validated.data,
      processing_status: "processed",
      resulting_entity_type: resultingEntityType,
      resulting_entity_id: resultingEntityId || null,
      ai_confidence_score: validated.aiExtraction?.confidenceScore || null,
      ai_extracted_intent: validated.aiExtraction?.extractedIntent || null,
      requires_human_approval: validated.aiExtraction?.requiresHumanApproval ?? false,
      is_human_approved: !(validated.aiExtraction?.requiresHumanApproval ?? false),
    });

    return apiSuccess({
      status: "processed",
      externalEventId: validated.externalEventId,
      resultingEntityId,
      resultingEntityType,
    }, 201);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return handleValidationError(err);
    }
    return apiError(err.message || "Failed to process n8n inbound payload", 500, "INTERNAL_ERROR");
  }
}
