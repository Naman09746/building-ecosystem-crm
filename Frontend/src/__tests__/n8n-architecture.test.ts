import { describe, it, expect } from "vitest";
import crypto from "crypto";

// 1. HMAC-SHA256 Signature Helper matching server security
function signPayload(payload: Record<string, any>, secret: string): string {
  const raw = JSON.stringify(payload);
  return crypto.createHmac("sha256", secret).update(raw).digest("hex");
}

function verifyPayloadSignature(rawPayload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(rawPayload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
}

// 2. In-Memory Idempotency & Inbound Event Processor simulation
interface InboundEventLog {
  id: string;
  sourceProvider: string;
  externalEventId: string;
  status: "processed" | "duplicate_ignored";
  resultingLeadId?: string;
}

class InboundWebhookIdempotencyManager {
  private processedEvents = new Map<string, InboundEventLog>();
  private createdLeads: { id: string; fullName: string; phone: string }[] = [];

  processInboundLead(input: {
    sourceProvider: string;
    externalEventId: string;
    fullName: string;
    phone: string;
  }): { status: "processed" | "duplicate_ignored"; leadId: string } {
    const key = `${input.sourceProvider}:${input.externalEventId}`;
    if (this.processedEvents.has(key)) {
      const existing = this.processedEvents.get(key)!;
      return { status: "duplicate_ignored", leadId: existing.resultingLeadId! };
    }

    const newLeadId = `lead-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.createdLeads.push({ id: newLeadId, fullName: input.fullName, phone: input.phone });

    const log: InboundEventLog = {
      id: `evt-${Date.now()}`,
      sourceProvider: input.sourceProvider,
      externalEventId: input.externalEventId,
      status: "processed",
      resultingLeadId: newLeadId,
    };
    this.processedEvents.set(key, log);

    return { status: "processed", leadId: newLeadId };
  }

  getLeadCount(): number {
    return this.createdLeads.length;
  }
}

// 3. AI Safety Guardrail Validator
interface AiExtractionPayload {
  intent?: string;
  extractedBudget?: number;
  suggestedStage?: string;
  requiresHumanApproval: boolean;
}

function validateAiSafetyGuardrail(
  aiOutput: AiExtractionPayload,
  isHumanApproved: boolean
): { canMutateDatabase: boolean; reason: string } {
  if (aiOutput.requiresHumanApproval && !isHumanApproved) {
    return {
      canMutateDatabase: false,
      reason: "AI output is queued for human review. Direct database mutation is blocked.",
    };
  }
  return {
    canMutateDatabase: true,
    reason: "Approved by authorized human operator.",
  };
}

describe("CallCRM + n8n Separation-of-Responsibilities Architecture", () => {
  const SECRET = "callcrm_production_n8n_secret_2026";

  it("generates cryptographic HMAC-SHA256 signatures for outgoing domain events", () => {
    const eventPayload = {
      eventName: "LeadCreated",
      leadId: "lead-gurugram-884",
      personName: "Vikram Oberoi",
      budget: 150000000,
      timestamp: "2026-08-31T18:00:00.000Z",
    };

    const signature = signPayload(eventPayload, SECRET);
    expect(signature).toBeDefined();
    expect(signature.length).toBe(64); // SHA-256 hex string

    const raw = JSON.stringify(eventPayload);
    const isValid = verifyPayloadSignature(raw, signature, SECRET);
    expect(isValid).toBe(true);
  });

  it("enforces strict webhook idempotency to prevent duplicate leads on repeated Meta/n8n deliveries", () => {
    const manager = new InboundWebhookIdempotencyManager();

    const payload = {
      sourceProvider: "meta_lead_ads",
      externalEventId: "meta_ad_lead_9921448",
      fullName: "Ananya Deshmukh",
      phone: "+91 98200 11223",
    };

    // First arrival
    const firstAttempt = manager.processInboundLead(payload);
    expect(firstAttempt.status).toBe("processed");
    expect(firstAttempt.leadId).toBeDefined();
    expect(manager.getLeadCount()).toBe(1);

    // Duplicate webhook arrival (network retry / n8n re-trigger)
    const secondAttempt = manager.processInboundLead(payload);
    expect(secondAttempt.status).toBe("duplicate_ignored");
    expect(secondAttempt.leadId).toBe(firstAttempt.leadId); // Returns same lead ID
    expect(manager.getLeadCount()).toBe(1); // No duplicate lead record created!
  });

  it("enforces AI Safety Guardrail: prevents autonomous deal stage mutations without human approval", () => {
    const aiExtractionFromN8n: AiExtractionPayload = {
      intent: "Buyer wants to negotiate price",
      extractedBudget: 145000000,
      suggestedStage: "negotiation",
      requiresHumanApproval: true,
    };

    // Unapproved state
    const unapprovedCheck = validateAiSafetyGuardrail(aiExtractionFromN8n, false);
    expect(unapprovedCheck.canMutateDatabase).toBe(false);
    expect(unapprovedCheck.reason).toContain("blocked");

    // Human operator confirms suggestion
    const approvedCheck = validateAiSafetyGuardrail(aiExtractionFromN8n, true);
    expect(approvedCheck.canMutateDatabase).toBe(true);
    expect(approvedCheck.reason).toContain("Approved");
  });
});
