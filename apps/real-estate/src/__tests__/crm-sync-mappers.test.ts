import { describe, it, expect, vi } from "vitest";
import {
  mapLeadRow,
  leadToRow,
  activityToRow,
  mapActivityRow,
  mapTaskRow,
  mapUnitRow,
  mapDocumentRow,
  mapPersonRow,
} from "@repo/core/lib/persistence/crm-sync";

const LEAD_ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  org_id: "22222222-2222-4222-8222-222222222222",
  person_id: "33333333-3333-4333-8333-333333333333",
  person_name: "Siddharth Verma",
  phone: "+919811099234",
  phone_normalized: "+919811099234",
  email: null,
  project_id: "44444444-4444-4444-8444-444444444444",
  project_name: "DLF The Camellias",
  region_id: null,
  region_name: "Gurgaon",
  salesperson_id: "55555555-5555-4555-8555-555555555555",
  budget: "38000000.00", // Postgres numeric arrives as string
  stage: "qualified",
  source: "Portal Inbound",
  lead_score: 92,
  lead_score_label: "Hot",
  deal_health: "strong",
  days_in_stage: 3,
  last_activity_text: "Call logged",
  last_activity_at: "2026-08-20T10:00:00Z",
  created_at: "2026-08-17T09:00:00Z",
  buying_signals: ["Budget verified"],
  objections: null,
};

describe("Lead row mapper", () => {
  it("maps a full DB row to the domain Lead shape", () => {
    const lead = mapLeadRow({ ...LEAD_ROW, salesperson: { full_name: "Rahul Sharma" } });
    expect(lead.id).toBe(LEAD_ROW.id);
    expect(lead.orgId).toBe(LEAD_ROW.org_id);
    expect(lead.salespersonName).toBe("Rahul Sharma");
    expect(lead.budget).toBe(38000000); // string numeric coerced to number
    expect(lead.stage).toBe("qualified");
    expect(lead.buyingSignals).toEqual(["Budget verified"]);
  });

  it("survives null joins and missing optional fields", () => {
    const lead = mapLeadRow({ ...LEAD_ROW, salesperson: null });
    expect(lead.salespersonName).toBe("");
    expect(lead.email).toBeUndefined();
    expect(lead.objections).toBeUndefined();
    expect(lead.lostAt).toBeUndefined();
  });

  it("falls back to created_at when last_activity_at is missing", () => {
    const lead = mapLeadRow({ ...LEAD_ROW, last_activity_at: null });
    expect(lead.lastActivityAt).toBe(LEAD_ROW.created_at);
  });
});

describe("leadToRow (domain -> DB)", () => {
  it("converts camelCase domain fields to snake_case columns", () => {
    const row = leadToRow({
      personName: "Test Buyer",
      phone: "+919810012345",
      budget: 10000000,
      stage: "new",
      leadScoreLabel: "Warm",
      lastActivityText: "Created",
      lostAt: undefined,
    } as any);
    expect(row.person_name).toBe("Test Buyer");
    expect(row.phone).toBe("+919810012345");
    expect(row.budget).toBe(10000000);
    expect(row.stage).toBe("new");
    expect(row.lead_score_label).toBe("Warm");
    expect(row.last_activity_text).toBe("Created");
    // undefined optionals are normalized to explicit null (so updates clear them)
    expect(row.lost_at).toBeNull();
  });
});

describe("Activity mappers", () => {
  it("coerces unknown/AI activity types to 'note'", () => {
    const mapped = mapActivityRow({
      id: "a1", org_id: "o1", lead_id: "l1", user_id: "u1", user_name: "Rep",
      person_name: "Buyer", type: "ai_agent", created_at: "2026-08-20T00:00:00Z",
    });
    expect(mapped.type).toBe("note");
  });

  it("preserves valid activity types", () => {
    const mapped = mapActivityRow({
      id: "a1", org_id: "o1", lead_id: "l1", user_id: "u1", user_name: "Rep",
      person_name: "Buyer", type: "booking", created_at: "2026-08-20T00:00:00Z",
    });
    expect(mapped.type).toBe("booking");
  });

  it("activityToRow serializes the client shape for insert", () => {
    const row = activityToRow({
      orgId: "o1", leadId: "l1", userId: "u1", userName: "Rep", personName: "Buyer",
      type: "call", outcomeLabel: "Connected", notes: "hello",
    });
    expect(row).toMatchObject({
      lead_id: "l1", user_id: "u1", user_name: "Rep", person_name: "Buyer",
      type: "call", outcome_label: "Connected", notes: "hello", duration_seconds: 0,
    });
  });

  it("REGRESSION: insertActivityRemote payload carries org_id (NOT NULL column)", async () => {
    const captured: any[] = [];
    const supabaseModule = await import("@repo/core/lib/supabase");
    const spy = vi.spyOn(supabaseModule, "getSupabaseClient").mockReturnValue({
      from: () => ({ insert: (payload: any) => { captured.push(payload); return { error: null }; } }),
    } as any);

    const { insertActivityRemote } = await import("@repo/core/lib/persistence/crm-sync");
    const ok = await insertActivityRemote(
      { orgId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", leadId: "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
        userId: "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f", userName: "Rep",
        personName: "Buyer", type: "call" }
    );
    expect(ok).toBe(true);
    expect(captured[0].org_id).toBe("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");
    spy.mockRestore();
  });

  it("REGRESSION: insertActivityRemote refuses to fire without any org_id", async () => {
    vi.resetModules();
    const { insertActivityRemote } = await import("@repo/core/lib/persistence/crm-sync");
    const ok = await insertActivityRemote(
      { orgId: "", leadId: "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
        userId: "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f", userName: "Rep", personName: "Buyer", type: "call" }
    );
    expect(ok).toBe(false);
  });
});

describe("Task / Unit / Document / Person mappers", () => {
  it("mapTaskRow embeds salesperson name", () => {
    const task = mapTaskRow(
      { id: "t1", org_id: "o1", lead_id: "l1", person_name: "B", phone: "p",
        title: "Follow up", due_date: "Today", status: "due_today", priority: "high" },
      "Rep Name"
    );
    expect(task.salespersonName).toBe("Rep Name");
    expect(task.dueDate).toBe("Today");
  });

  it("mapUnitRow coerces numeric price and embeds project name", () => {
    const unit = mapUnitRow(
      { id: "u1", org_id: "o1", project_id: "p1", tower: "A", unit_number: "A-1204",
        floor: 12, configuration: "3 BHK", super_area_sq_ft: "2450", price: "85000000.00",
        status: "available" },
      "Camellias"
    );
    expect(unit.price).toBe(85000000);
    expect(unit.sizeSqFt).toBe(2450);
    expect(unit.projectName).toBe("Camellias");
  });

  it("mapDocumentRow maps core vault fields", () => {
    const doc = mapDocumentRow({ id: "d1", org_id: "o1", title: "Brochure", file_url: "https://x/y.pdf", type: "brochure" });
    expect(doc.fileUrl).toBe("https://x/y.pdf");
    expect(doc.type).toBe("brochure");
  });

  it("mapPersonRow handles null budget", () => {
    const person = mapPersonRow({ id: "p1", org_id: "o1", name: "Buyer", phone: "+91...", budget: null, created_at: "2026-01-01T00:00:00Z" });
    expect(person.budget).toBeUndefined();
    expect(person.name).toBe("Buyer");
  });
});
