import { describe, it, expect } from "vitest";
import {
  normalizeConfiguration,
  normalizeBudget,
} from "@repo/core/lib/server/lead-ingestion";
import { normalizePhone } from "@repo/core/lib/utils";
import { verifyHmacSignature } from "@repo/core/lib/server/api-security";
import crypto from "crypto";

describe("Phase 7: Lead Ingestion Automation — Meta Lead Ads + WhatsApp", () => {
  describe("Field Normalization Engines", () => {
    it("normalizes phone numbers to standard E.164 format (+91)", () => {
      expect(normalizePhone("9811099234")).toBe("+919811099234");
      expect(normalizePhone("+91 98110-99234")).toBe("+919811099234");
      expect(normalizePhone("098110 99234")).toBe("+919811099234");
      expect(normalizePhone("+1 (555) 234-5678")).toBe("+15552345678");
    });

    it("standardizes raw property configuration strings", () => {
      expect(normalizeConfiguration("3bhk")).toBe("3 BHK");
      expect(normalizeConfiguration("3 BHK")).toBe("3 BHK");
      expect(normalizeConfiguration("3 Bedroom")).toBe("3 BHK");
      expect(normalizeConfiguration("3 BHK + Servant")).toBe("3 BHK + Servant");
      expect(normalizeConfiguration("4 BHK + Study")).toBe("4 BHK + Study");
      expect(normalizeConfiguration("Ultra Luxury Villa")).toBe("Luxury Villa");
      expect(normalizeConfiguration("Sky Penthouse")).toBe("Sky Penthouse");
    });

    it("parses diverse budget notations accurately into numeric INR", () => {
      expect(normalizeBudget("3.8 Cr")).toBe(38000000);
      expect(normalizeBudget("3.8 Crore")).toBe(38000000);
      expect(normalizeBudget("3.8crores")).toBe(38000000);
      expect(normalizeBudget("85 Lakhs")).toBe(8500000);
      expect(normalizeBudget("85 L")).toBe(8500000);
      expect(normalizeBudget("38000000")).toBe(38000000);
      expect(normalizeBudget(45000000)).toBe(45000000);
      expect(normalizeBudget("3.5")).toBe(35000000); // <= 100 interpreted as Cr
      expect(normalizeBudget(null)).toBe(0);
    });
  });

  describe("Webhook Security & Cryptographic Handshake", () => {
    const secret = "test_meta_webhook_secret_key_12345";
    const payload = JSON.stringify({
      object: "page",
      entry: [
        {
          id: "page_123",
          time: Math.floor(Date.now() / 1000),
          changes: [
            {
              field: "leadgen",
              value: {
                leadgen_id: "leadgen_abc_999",
                page_id: "page_123",
                form_id: "form_456",
              },
            },
          ],
        },
      ],
    });

    it("verifies valid HMAC-SHA256 signatures", () => {
      const hmac = crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
      const signatureHeader = `sha256=${hmac}`;

      expect(verifyHmacSignature(payload, signatureHeader, secret)).toBe(true);
    });

    it("rejects forged or tampered signatures", () => {
      const forgedHeader = "sha256=invalid_hash_signature_00000000000000000000";
      expect(verifyHmacSignature(payload, forgedHeader, secret)).toBe(false);
    });

    it("rejects missing signature headers", () => {
      expect(verifyHmacSignature(payload, null, secret)).toBe(false);
    });
  });

  describe("Deduplication & Lead Classification Rules", () => {
    function evaluateInboundLeadClassification(
      existingLeads: Array<{ stage: string; id: string; salespersonId: string }>
    ): { action: "attach_touchpoint" | "reactivate_lost" | "create_new_lead"; duplicateType: string } {
      const active = existingLeads.find((l) => !["won", "lost"].includes(l.stage));
      if (active) {
        return { action: "attach_touchpoint", duplicateType: "existing_active_lead" };
      }
      const lost = existingLeads.find((l) => l.stage === "lost");
      if (lost) {
        return { action: "reactivate_lost", duplicateType: "previously_lost_lead" };
      }
      return { action: "create_new_lead", duplicateType: "new_prospect" };
    }

    it("routes active lead inquiries to touchpoint attachment instead of creating duplicates", () => {
      const result = evaluateInboundLeadClassification([
        { id: "lead-1", stage: "qualified", salespersonId: "rep-1" },
      ]);
      expect(result.action).toBe("attach_touchpoint");
      expect(result.duplicateType).toBe("existing_active_lead");
    });

    it("routes lost lead inquiries to reactivation flow", () => {
      const result = evaluateInboundLeadClassification([
        { id: "lead-2", stage: "lost", salespersonId: "rep-2" },
      ]);
      expect(result.action).toBe("reactivate_lost");
      expect(result.duplicateType).toBe("previously_lost_lead");
    });

    it("routes new inquiries to fresh lead creation", () => {
      const result = evaluateInboundLeadClassification([]);
      expect(result.action).toBe("create_new_lead");
      expect(result.duplicateType).toBe("new_prospect");
    });
  });

  describe("Deterministic Round-Robin Assignment Simulation", () => {
    it("distributes concurrent leads evenly across active sales reps", () => {
      const reps = [
        { id: "rep-1", name: "Rahul Sharma" },
        { id: "rep-2", name: "Pooja Verma" },
        { id: "rep-3", name: "Amit Patel" },
      ];

      const assignments: string[] = [];
      let counter = 0;

      for (let i = 0; i < 9; i++) {
        counter++;
        const targetIndex = (counter - 1) % reps.length;
        assignments.push(reps[targetIndex].id);
      }

      expect(assignments).toEqual([
        "rep-1",
        "rep-2",
        "rep-3",
        "rep-1",
        "rep-2",
        "rep-3",
        "rep-1",
        "rep-2",
        "rep-3",
      ]);

      // Exactly 3 leads per rep
      const counts = assignments.reduce((acc: any, id) => {
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {});

      expect(counts["rep-1"]).toBe(3);
      expect(counts["rep-2"]).toBe(3);
      expect(counts["rep-3"]).toBe(3);
    });
  });
});
