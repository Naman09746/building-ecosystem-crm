import crypto from "crypto";
import { getServiceRoleClient, isLiveSupabaseAvailable } from "@/lib/server/supabase-server";
import { logger } from "@/lib/server/logger";

export type CrmDomainEventName =
  | "LeadCreated"
  | "LeadAssigned"
  | "LeadQualified"
  | "LeadSLAApproaching"
  | "LeadSLABreached"
  | "LeadRevived"
  | "RequirementUpdated"
  | "PropertyCreated"
  | "PropertyPriceChanged"
  | "ListingCreated"
  | "MandateCreated"
  | "MandateExpiring"
  | "SiteVisitScheduled"
  | "SiteVisitConfirmed"
  | "SiteVisitCompleted"
  | "SiteVisitCancelled"
  | "DealCreated"
  | "DealStageChanged"
  | "DealStalled"
  | "NegotiationUpdated"
  | "NegotiationAgreed"
  | "BookingCreated"
  | "PaymentStatusChanged"
  | "CommissionCreated"
  | "DocumentUploaded"
  | "DocumentExpiring"
  | "WhatsAppMessageReceived"
  | "WhatsAppMessageSent"
  | "AiSuggestionGenerated";

export type AggregateType =
  | "lead"
  | "person"
  | "property"
  | "listing"
  | "site_visit"
  | "deal"
  | "negotiation"
  | "commission"
  | "document"
  | "communication";

export interface EmitEventInput {
  orgId: string;
  eventName: CrmDomainEventName;
  aggregateType: AggregateType;
  aggregateId: string;
  payload: Record<string, any>;
  emittedBy?: string;
  idempotencyKey?: string;
}

export interface DomainEventRecord {
  id: string;
  orgId: string;
  eventName: CrmDomainEventName;
  aggregateType: AggregateType;
  aggregateId: string;
  payload: Record<string, any>;
  idempotencyKey: string;
  dispatchStatus: "pending" | "dispatched" | "delivered" | "failed" | "circuit_broken" | "dead_letter";
  retryCount: number;
  maxRetries: number;
  createdAt: string;
}

// In-Memory Fallback Queue when DB is in memory/demo mode
const inMemoryOutbox: DomainEventRecord[] = [];

/**
 * Emit a Domain Event to the CallCRM Transactional Outbox.
 * Core CRM business operations MUST succeed regardless of event dispatch outcome.
 */
export async function emitDomainEvent(input: EmitEventInput): Promise<{ success: boolean; eventId: string }> {
  const eventId = `evt_${crypto.randomUUID()}`;
  const idempotencyKey = input.idempotencyKey || `${input.orgId}_${input.eventName}_${input.aggregateId}_${Date.now()}`;

  const eventRecord: DomainEventRecord = {
    id: eventId,
    orgId: input.orgId,
    eventName: input.eventName,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    payload: {
      ...input.payload,
      _meta: {
        eventId,
        eventName: input.eventName,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        emittedAt: new Date().toISOString(),
        source: "CallCRM_Core_Domain",
      },
    },
    idempotencyKey,
    dispatchStatus: "pending",
    retryCount: 0,
    maxRetries: 5,
    createdAt: new Date().toISOString(),
  };

  try {
    const supabase = getServiceRoleClient();
    if (supabase && isLiveSupabaseAvailable) {
      await supabase.from("crm_domain_events").insert({
        id: eventRecord.id,
        org_id: eventRecord.orgId,
        event_name: eventRecord.eventName,
        aggregate_type: eventRecord.aggregateType,
        aggregate_id: eventRecord.aggregateId,
        payload: eventRecord.payload,
        idempotency_key: eventRecord.idempotencyKey,
        dispatch_status: "pending",
        emitted_by: input.emittedBy || null,
      });
    } else {
      inMemoryOutbox.push(eventRecord);
    }

    // Trigger non-blocking async dispatch in background (fire-and-forget)
    dispatchPendingOutboxEvents(input.orgId).catch((err) => {
      logger.warn("[EVENT_BUS_ASYNC_DISPATCH_WARN] Failed during background dispatch", { error: err.message });
    });

    return { success: true, eventId };
  } catch (err: any) {
    // Log warning but DO NOT fail core CRM transaction
    logger.error("[EVENT_BUS_EMIT_ERROR] Failed to save domain event to outbox", { error: err.message, eventName: input.eventName });
    inMemoryOutbox.push(eventRecord);
    return { success: true, eventId };
  }
}

/**
 * Dispatches pending outbox events to registered n8n webhook endpoints with circuit breaker protection.
 */
export async function dispatchPendingOutboxEvents(orgId: string): Promise<{ dispatched: number; failed: number }> {
  let dispatched = 0;
  let failed = 0;

  try {
    const supabase = getServiceRoleClient();
    if (!supabase || !isLiveSupabaseAvailable) {
      // In-memory dispatch simulation
      for (const event of inMemoryOutbox) {
        if (event.dispatchStatus === "pending") {
          event.dispatchStatus = "delivered";
          dispatched++;
        }
      }
      return { dispatched, failed: 0 };
    }

    // Fetch active n8n integration endpoints for this organization
    const { data: endpoints } = await supabase
      .from("integration_endpoints")
      .select("*")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .eq("circuit_breaker_tripped", false);

    if (!endpoints || endpoints.length === 0) {
      return { dispatched: 0, failed: 0 };
    }

    // Fetch up to 20 pending events
    const { data: pendingEvents } = await supabase
      .from("crm_domain_events")
      .select("*")
      .eq("org_id", orgId)
      .in("dispatch_status", ["pending", "failed"])
      .lte("next_retry_at", new Date().toISOString())
      .limit(20);

    if (!pendingEvents || pendingEvents.length === 0) {
      return { dispatched: 0, failed: 0 };
    }

    for (const event of pendingEvents) {
      for (const endpoint of endpoints) {
        // Check if endpoint is subscribed to this event
        if (endpoint.subscribed_events && !endpoint.subscribed_events.includes(event.event_name)) {
          continue;
        }

        const rawBody = JSON.stringify(event.payload);
        const signature = crypto
          .createHmac("sha256", endpoint.secret_token || "callcrm_n8n_secret")
          .update(rawBody)
          .digest("hex");

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second strict timeout

          const response = await fetch(endpoint.endpoint_url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CallCRM-Event": event.event_name,
              "X-CallCRM-Event-Id": event.id,
              "X-CallCRM-HMAC-SHA256": `sha256=${signature}`,
              "X-CallCRM-Org-Id": orgId,
            },
            body: rawBody,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            await supabase
              .from("crm_domain_events")
              .update({
                dispatch_status: "delivered",
                delivered_at: new Date().toISOString(),
                response_http_status: response.status,
              })
              .eq("id", event.id);

            await supabase
              .from("integration_endpoints")
              .update({
                consecutive_failures: 0,
                last_successful_delivery_at: new Date().toISOString(),
              })
              .eq("id", endpoint.id);

            dispatched++;
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } catch (deliveryErr: any) {
          failed++;
          const nextRetryCount = (event.retry_count || 0) + 1;
          const isDeadLetter = nextRetryCount >= (event.max_retries || 5);
          const backoffDelaySeconds = Math.pow(2, nextRetryCount) * 15; // 30s, 60s, 120s, 240s...
          const nextRetryAt = new Date(Date.now() + backoffDelaySeconds * 1000).toISOString();

          await supabase
            .from("crm_domain_events")
            .update({
              dispatch_status: isDeadLetter ? "dead_letter" : "failed",
              retry_count: nextRetryCount,
              next_retry_at: nextRetryAt,
              last_error_message: deliveryErr.message,
            })
            .eq("id", event.id);

          // Update consecutive failures on endpoint and trip circuit breaker if >= 5
          const newFailures = (endpoint.consecutive_failures || 0) + 1;
          const shouldTrip = newFailures >= 5;

          await supabase
            .from("integration_endpoints")
            .update({
              consecutive_failures: newFailures,
              circuit_breaker_tripped: shouldTrip,
              circuit_breaker_tripped_at: shouldTrip ? new Date().toISOString() : null,
              last_failed_delivery_at: new Date().toISOString(),
            })
            .eq("id", endpoint.id);
        }
      }
    }
  } catch (err: any) {
    logger.error("[EVENT_DISPATCH_BATCH_ERROR]", { error: err.message });
  }

  return { dispatched, failed };
}
