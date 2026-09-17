import { describe, it, expect } from "vitest";
import { computeDealHealth, DealHealthLeadInput, DealHealthTaskInput, DealHealthActivityInput } from "@repo/core/lib/server/deal-health";

describe("Phase 8 — Deterministic Deal Health Engine", () => {
  const fixedNow = new Date("2026-08-22T12:00:00.000Z");

  const createLead = (overrides: Partial<DealHealthLeadInput> = {}): DealHealthLeadInput => ({
    id: "lead-test-001",
    stage: "qualified",
    createdAt: new Date("2026-08-01T12:00:00.000Z").toISOString(),
    lastActivityAt: new Date("2026-08-21T12:00:00.000Z").toISOString(), // 1 day ago
    stageEnteredAt: new Date("2026-08-20T12:00:00.000Z").toISOString(), // 2 days in stage
    daysInStage: 2,
    ...overrides,
  });

  it("evaluates activity recency increments and penalties accurately", () => {
    // 1. Within 24h: base(60) + 20 = 80 (strong)
    const lead24h = createLead({
      lastActivityAt: new Date("2026-08-22T02:00:00.000Z").toISOString(), // 10h ago
    });
    const res24h = computeDealHealth(lead24h, [], [], fixedNow);
    expect(res24h.score).toBe(80);
    expect(res24h.status).toBe("strong");
    expect(res24h.factors.some((f) => f.type === "activity_recency" && f.impact === 20)).toBe(true);

    // 2. Within 2 days (48h): base(60) + 15 = 75 (neutral)
    const lead2d = createLead({
      lastActivityAt: new Date("2026-08-20T14:00:00.000Z").toISOString(), // 46h ago
    });
    const res2d = computeDealHealth(lead2d, [], [], fixedNow);
    expect(res2d.score).toBe(75);
    expect(res2d.status).toBe("neutral");
    expect(res2d.factors.some((f) => f.type === "activity_recency" && f.impact === 15)).toBe(true);

    // 3. Within 5 days: base(60) + 8 = 68 (neutral)
    const lead5d = createLead({
      lastActivityAt: new Date("2026-08-18T12:00:00.000Z").toISOString(), // 4 days ago
    });
    const res5d = computeDealHealth(lead5d, [], [], fixedNow);
    expect(res5d.score).toBe(68);
    expect(res5d.status).toBe("neutral");

    // 4. Inactivity 6-10 days: base(60) - 10 = 50 (neutral)
    const lead8d = createLead({
      lastActivityAt: new Date("2026-08-14T12:00:00.000Z").toISOString(), // 8 days ago
    });
    const res8d = computeDealHealth(lead8d, [], [], fixedNow);
    expect(res8d.score).toBe(50);
    expect(res8d.factors.some((f) => f.type === "inactivity" && f.impact === -10)).toBe(true);

    // 5. Prolonged Inactivity > 10 days: base(60) - 20 = 40 (at_risk)
    const lead15d = createLead({
      lastActivityAt: new Date("2026-08-07T12:00:00.000Z").toISOString(), // 15 days ago
    });
    const res15d = computeDealHealth(lead15d, [], [], fixedNow);
    expect(res15d.score).toBe(40);
    expect(res15d.status).toBe("at_risk");
    expect(res15d.factors.some((f) => f.type === "inactivity" && f.impact === -20)).toBe(true);
  });

  it("penalizes overdue tasks with bounded reductions", () => {
    const baseLead = createLead({
      lastActivityAt: new Date("2026-08-22T04:00:00.000Z").toISOString(), // within 24h: +20 (score 80)
    });

    // 1 Overdue: 80 - 10 = 70
    const oneOverdue: DealHealthTaskInput[] = [{ status: "overdue" }];
    const res1 = computeDealHealth(baseLead, oneOverdue, [], fixedNow);
    expect(res1.score).toBe(70);

    // 2 Overdue: 80 - 20 = 60
    const twoOverdue: DealHealthTaskInput[] = [{ status: "overdue" }, { status: "overdue" }];
    const res2 = computeDealHealth(baseLead, twoOverdue, [], fixedNow);
    expect(res2.score).toBe(60);

    // 3+ Overdue: 80 - 30 = 50
    const fourOverdue: DealHealthTaskInput[] = [
      { status: "overdue" },
      { status: "overdue" },
      { status: "overdue" },
      { status: "overdue" },
    ];
    const res3 = computeDealHealth(baseLead, fourOverdue, [], fixedNow);
    expect(res3.score).toBe(50);
    expect(res3.factors.some((f) => f.type === "overdue_tasks" && f.impact === -30)).toBe(true);
  });

  it("penalizes stage stagnation in a stage-aware manner", () => {
    // Negotiation > 14 days without movement: base(60) + recency(20) - stagnation(20) = 60
    const stalledNegLead = createLead({
      stage: "negotiation",
      daysInStage: 18,
      lastActivityAt: new Date("2026-08-21T12:00:00.000Z").toISOString(),
    });
    const resNeg = computeDealHealth(stalledNegLead, [], [], fixedNow);
    expect(resNeg.factors.some((f) => f.type === "stage_stagnation" && f.impact === -20)).toBe(true);

    // Site visit > 10 days without movement: -15
    const stalledVisitLead = createLead({
      stage: "site_visit",
      daysInStage: 12,
      lastActivityAt: new Date("2026-08-21T12:00:00.000Z").toISOString(),
    });
    const resVisit = computeDealHealth(stalledVisitLead, [], [], fixedNow);
    expect(resVisit.factors.some((f) => f.type === "stage_stagnation" && f.impact === -15)).toBe(true);

    // Stalled initial outreach in 'new' stage > 7 days: -15
    const stalledNewLead = createLead({
      stage: "new",
      daysInStage: 9,
      lastActivityAt: new Date("2026-08-21T12:00:00.000Z").toISOString(),
    });
    const resNew = computeDealHealth(stalledNewLead, [], [], fixedNow);
    expect(resNew.factors.some((f) => f.type === "stage_stagnation" && f.impact === -15)).toBe(true);
  });

  it("rewards positive sales signals: site visit, inbound response, and scheduled follow-up", () => {
    const lead = createLead({
      lastActivityAt: new Date("2026-08-20T12:00:00.000Z").toISOString(), // +15
    });

    const activities: DealHealthActivityInput[] = [
      { type: "site_visit", occurredAt: new Date("2026-08-19T10:00:00.000Z").toISOString() }, // +15
      { type: "whatsapp", occurredAt: new Date("2026-08-21T16:00:00.000Z").toISOString(), metadata: { inbound: true } }, // +10
    ];

    const tasks: DealHealthTaskInput[] = [{ status: "upcoming", dueDate: "2026-08-24" }]; // +5

    // Base 60 + 15 (recency) + 15 (site visit) + 10 (inbound) + 5 (scheduled) = 105 -> clamped to 100
    const res = computeDealHealth(lead, tasks, activities, fixedNow);
    expect(res.score).toBe(100);
    expect(res.status).toBe("strong");
    expect(res.factors.some((f) => f.type === "recent_site_visit")).toBe(true);
    expect(res.factors.some((f) => f.type === "buyer_engagement")).toBe(true);
    expect(res.factors.some((f) => f.type === "scheduled_followup")).toBe(true);
  });

  it("strictly clamps scores within 0 to 100", () => {
    // Underflow test: severe penalties
    const severeLead = createLead({
      lastActivityAt: new Date("2026-07-01T12:00:00.000Z").toISOString(), // -20
      stage: "negotiation",
      daysInStage: 30, // -20
    });
    const severeTasks: DealHealthTaskInput[] = [
      { status: "overdue" },
      { status: "overdue" },
      { status: "overdue" }, // -30
    ];
    // Base 60 - 20 - 20 - 30 = -10 -> clamped to 0
    const resSevere = computeDealHealth(severeLead, severeTasks, [], fixedNow);
    expect(resSevere.score).toBe(0);
    expect(resSevere.status).toBe("at_risk");

    // Overflow test: excessive bonuses
    const maxLead = createLead({
      lastActivityAt: new Date("2026-08-22T10:00:00.000Z").toISOString(), // +20
    });
    const maxActivities: DealHealthActivityInput[] = [
      { type: "site_visit", occurredAt: new Date("2026-08-21T10:00:00.000Z").toISOString() }, // +15
      { type: "whatsapp", occurredAt: new Date("2026-08-22T08:00:00.000Z").toISOString() }, // +10
      { type: "booking", occurredAt: new Date("2026-08-20T10:00:00.000Z").toISOString() }, // +10
    ];
    const maxTasks: DealHealthTaskInput[] = [{ status: "upcoming" }]; // +5
    // Base 60 + 20 + 15 + 10 + 10 + 5 = 120 -> clamped to 100
    const resMax = computeDealHealth(maxLead, maxTasks, maxActivities, fixedNow);
    expect(resMax.score).toBe(100);
    expect(resMax.status).toBe("strong");
  });

  it("Scenario A — STRONG: active communication, site visit, zero overdue tasks", () => {
    const lead = createLead({
      stage: "site_visit",
      daysInStage: 3,
      lastActivityAt: new Date("2026-08-21T18:00:00.000Z").toISOString(),
    });
    const activities: DealHealthActivityInput[] = [
      { type: "site_visit", occurredAt: new Date("2026-08-20T14:00:00.000Z").toISOString() },
    ];
    const tasks: DealHealthTaskInput[] = [{ status: "upcoming", dueDate: "2026-08-24" }];

    const res = computeDealHealth(lead, tasks, activities, fixedNow);
    expect(res.status).toBe("strong");
    expect(res.score).toBeGreaterThanOrEqual(80);
  });

  it("Scenario B — NEUTRAL: standard cadence, no overdue tasks, activity within 3 days", () => {
    const lead = createLead({
      stage: "qualified",
      daysInStage: 4,
      lastActivityAt: new Date("2026-08-19T12:00:00.000Z").toISOString(), // 3 days ago (+8)
    });
    const tasks: DealHealthTaskInput[] = [{ status: "upcoming" }]; // +5

    // Base 60 + 8 + 5 = 73
    const res = computeDealHealth(lead, tasks, [], fixedNow);
    expect(res.status).toBe("neutral");
    expect(res.score).toBe(73);
  });

  it("Scenario C — AT RISK: 8 days inactivity, 2 overdue tasks, negotiation stalled for 17 days", () => {
    const lead = createLead({
      stage: "negotiation",
      daysInStage: 17, // -20
      lastActivityAt: new Date("2026-08-14T12:00:00.000Z").toISOString(), // 8 days ago (-10)
    });
    const tasks: DealHealthTaskInput[] = [
      { status: "overdue" },
      { status: "overdue" }, // -20
    ];

    // Base 60 - 10 (inactivity) - 20 (overdue) - 20 (negotiation stagnation) = 10
    const res = computeDealHealth(lead, tasks, [], fixedNow);
    expect(res.status).toBe("at_risk");
    expect(res.score).toBe(10);
    expect(res.recommendedAction).toBeDefined();
    expect(res.recommendedAction.length).toBeGreaterThan(10);
  });

  it("Scenario D — RECOVERED: transitions from at-risk to strong upon response and task completion", () => {
    // 1. Initially At Risk
    const leadAtRisk = createLead({
      stage: "negotiation",
      daysInStage: 16, // -20
      lastActivityAt: new Date("2026-08-14T12:00:00.000Z").toISOString(), // -10
    });
    const initialTasks: DealHealthTaskInput[] = [{ status: "overdue" }, { status: "overdue" }]; // -20
    const initialRes = computeDealHealth(leadAtRisk, initialTasks, [], fixedNow);
    expect(initialRes.status).toBe("at_risk");

    // 2. Buyer responds, tasks completed, new follow-up scheduled
    const recoveredLead = createLead({
      stage: "negotiation",
      daysInStage: 16, // -20
      lastActivityAt: new Date("2026-08-22T10:00:00.000Z").toISOString(), // +20 (within 24h)
    });
    const recoveredActivities: DealHealthActivityInput[] = [
      { type: "whatsapp", occurredAt: new Date("2026-08-22T10:00:00.000Z").toISOString(), metadata: { inbound: true } }, // +10
      { type: "meeting", occurredAt: new Date("2026-08-22T09:00:00.000Z").toISOString() }, // +10
    ];
    const recoveredTasks: DealHealthTaskInput[] = [
      { status: "completed" },
      { status: "completed" },
      { status: "upcoming", dueDate: "2026-08-23" }, // +5
    ];

    // Base 60 + 20 (recency) - 20 (stagnation) + 10 (inbound) + 10 (meeting) + 5 (upcoming) = 85
    const recoveredRes = computeDealHealth(recoveredLead, recoveredTasks, recoveredActivities, fixedNow);
    expect(recoveredRes.status).toBe("strong");
    expect(recoveredRes.score).toBe(85);
  });

  it("Scenario E & F — Won and Lost terminal stage handling", () => {
    const wonLead = createLead({ stage: "won" });
    const wonRes = computeDealHealth(wonLead, [], [], fixedNow);
    expect(wonRes.score).toBe(100);
    expect(wonRes.status).toBe("strong");

    const lostLead = createLead({ stage: "lost" });
    const lostRes = computeDealHealth(lostLead, [], [], fixedNow);
    expect(lostRes.score).toBe(0);
    expect(lostRes.status).toBe("neutral");
  });

  it("Scoring Determinism: Identical inputs always produce the exact same result", () => {
    const lead = createLead({
      stage: "site_visit",
      daysInStage: 6,
      lastActivityAt: new Date("2026-08-21T08:00:00.000Z").toISOString(),
    });
    const tasks: DealHealthTaskInput[] = [{ status: "overdue" }];
    const activities: DealHealthActivityInput[] = [
      { type: "site_visit", occurredAt: new Date("2026-08-20T10:00:00.000Z").toISOString() },
    ];

    const run1 = computeDealHealth(lead, tasks, activities, fixedNow);
    const run2 = computeDealHealth(lead, tasks, activities, fixedNow);

    expect(run1).toEqual(run2);
  });
});
