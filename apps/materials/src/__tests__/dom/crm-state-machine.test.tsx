// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import * as React from "react";
import { AuthProvider } from "@repo/core/context/auth-context";
import { CRMProvider, useCRM } from "@repo/core/context/crm-context";
import { INITIAL_LEADS, INITIAL_TASKS } from "@repo/core/lib/mock-data";

// ============================================================================
// CRM STATE-MACHINE TESTS (demo mode: mock seed data, no Supabase configured)
// Covers the mutation logic that everything in the app depends on.
// ============================================================================

// NOTE: plain createElement instead of JSX — Next's tsconfig sets
// jsx:"preserve" which vitest's esbuild honors verbatim.
const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    AuthProvider,
    null,
    React.createElement(CRMProvider, null, children)
  );

function useTestCRM() {
  const ctx = useCRM();
  // Signal readiness once hydration effect has settled
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(t);
  }, []);
  return { ctx, ready };
}

async function setup() {
  const rendered = renderHook(() => useTestCRM(), { wrapper });
  await waitFor(() => expect(rendered.result.current.ready).toBe(true));
  return rendered;
}

describe("CRM state machine — updateLeadStage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("advances a lead to won and completes follow-ups", async () => {
    const { result } = await setup();
    const lead = result.current.ctx.leads[0];
    expect(lead.stage).not.toBe("won");

    let ok = false;
    await act(async () => {
      ok = await result.current.ctx.updateLeadStage(lead.id, "won");
    });

    expect(ok).toBe(true);
    const updated = result.current.ctx.leads.find((l) => l.id === lead.id)!;
    expect(updated.stage).toBe("won");
    expect(updated.daysInStage).toBe(0);
    expect(updated.followUpStatus).toBe("completed");
  });

  it("releases the assigned unit back to available when a deal is lost", async () => {
    const { result } = await setup();
    const ctx = result.current.ctx;
    const leadWithUnit = ctx.leads.find((l) => l.assignedUnitId);

    if (!leadWithUnit) {
      // Arrange: assign one first
      const lead = ctx.leads[0];
      const unit = ctx.units.find((u) => u.status === "available")!;
      await act(async () => {
        await ctx.assignUnitToLead(lead.id, unit.id);
      });
    }

    const target = result.current.ctx.leads.find((l) => l.assignedUnitId)!;
    const unitId = target.assignedUnitId!;

    await act(async () => {
      await result.current.ctx.updateLeadStage(target.id, "lost");
    });

    const releasedUnit = result.current.ctx.units.find((u) => u.id === unitId)!;
    expect(releasedUnit.status).toBe("available");

    const lostLead = result.current.ctx.leads.find((l) => l.id === target.id)!;
    expect(lostLead.lostAt).toBeTruthy();
  });
});

describe("CRM state machine — logActivity", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("auto-promotes stage on 'Site Visit Booked' and records the touchpoint", async () => {
    const { result } = await setup();
    const lead = result.current.ctx.leads.find(
      (l) => ["new", "contacted", "qualified"].includes(l.stage)
    )!;
    const activitiesBefore = result.current.ctx.activities.length;

    let ok = false;
    await act(async () => {
      ok = await result.current.ctx.logActivity({
        leadId: lead.id,
        type: "call",
        outcome: "site_visit_booked",
        outcomeLabel: "Site Visit Booked",
        notes: "Confirmed for Saturday",
      });
    });

    expect(ok).toBe(true);
    const fresh = result.current.ctx;
    const updated = fresh.leads.find((l) => l.id === lead.id)!;
    expect(updated.stage).toBe("site_visit");

    // Activity stream grew and newest entry references this lead
    expect(fresh.activities.length).toBe(activitiesBefore + 1);
    expect(fresh.activities[0].leadId).toBe(lead.id);
  });

  it("'Not Interested' marks the lead lost with neutral health", async () => {
    const { result } = await setup();
    const lead = result.current.ctx.leads.find(
      (l) => l.stage !== "won" && l.stage !== "lost"
    )!;

    await act(async () => {
      await result.current.ctx.logActivity({
        leadId: lead.id,
        type: "call",
        outcomeLabel: "Not Interested",
        notes: "Budget mismatch",
      });
    });

    const updated = result.current.ctx.leads.find((l) => l.id === lead.id)!;
    expect(updated.stage).toBe("lost");
    expect(updated.dealHealth).toBe("neutral");
  });

  it("creates a prioritized follow-up task when nextFollowUp is set", async () => {
    const { result } = await setup();
    const tasksBefore = result.current.ctx.tasks.length;
    const lead = result.current.ctx.leads[0];

    await act(async () => {
      await result.current.ctx.logActivity({
        leadId: lead.id,
        type: "whatsapp",
        notes: "Shared brochure",
        nextFollowUp: "Tomorrow, 11:00 AM",
      });
    });

    const freshTasks = result.current.ctx.tasks;
    expect(freshTasks.length).toBe(tasksBefore + 1);
    const newTask = freshTasks[0];
    expect(newTask.leadId).toBe(lead.id);
    expect(newTask.priority).toBe("high");
    expect(newTask.title).toContain("Follow-up commitment");
  });

  it("completes pending tasks for the lead after outreach", async () => {
    const { result } = await setup();
    const task = result.current.ctx.tasks.find((t) => t.status !== "completed")!;
    if (!task) return; // seed guarantee: tasks exist

    await act(async () => {
      await result.current.ctx.logActivity({ leadId: task.leadId, type: "call" });
    });

    const updated = result.current.ctx.tasks.find((t) => t.id === task.id)!;
    expect(updated.status).toBe("completed");
  });
});

describe("CRM state machine — createLead (demo path)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("deduplicates people by normalized phone and links the new lead", async () => {
    const { result } = await setup();
    const existingPerson = result.current.ctx.people[0];
    const leadsBefore = result.current.ctx.leads.length;

    let created!: Awaited<ReturnType<typeof result.current.ctx.createLead>>;
    await act(async () => {
      created = await result.current.ctx.createLead({
        personId: `per-${Date.now()}`,
        personName: existingPerson.name,
        phone: existingPerson.phone, // same phone -> dedup anchor
        projectId: result.current.ctx.projects[0].id,
        projectName: result.current.ctx.projects[0].name,
        regionId: result.current.ctx.projects[0].regionId,
        regionName: result.current.ctx.projects[0].regionName,
        salespersonId: "usr-1",
        salespersonName: "Rep",
        budget: 25000000,
        stage: "new",
        source: "Test Inbound",
      });
    });

    expect(result.current.ctx.leads.length).toBe(leadsBefore + 1);
    expect(created.personId).toBe(existingPerson.id); // linked to master contact
    expect(created.phoneNormalized).toBeTruthy();
  });
});

describe("CRM state machine — completeTask & bulk ops", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("completeTask closes the task and stamps the lead", async () => {
    const { result } = await setup();
    const task = result.current.ctx.tasks.find((t) => t.status !== "completed");
    if (!task) return;

    act(() => {
      result.current.ctx.completeTask(task.id);
    });

    expect(result.current.ctx.tasks.find((t) => t.id === task.id)!.status).toBe("completed");
    const lead = result.current.ctx.leads.find((l) => l.id === task.leadId);
    if (lead) {
      expect(lead.followUpStatus).toBe("completed");
    }
  });

  it("bulkScheduleFollowUp creates one task per selected lead", async () => {
    const { result } = await setup();
    const targets = result.current.ctx.filteredLeads.slice(0, 3);
    if (targets.length < 2) return;
    const before = result.current.ctx.tasks.length;

    let ok = false;
    await act(async () => {
      ok = await result.current.ctx.bulkScheduleFollowUp(
        targets.map((l) => l.id),
        "Tomorrow",
        "10:00 AM"
      );
    });

    expect(ok).toBe(true);
    expect(result.current.ctx.tasks.length).toBe(before + targets.length);
  });
});

describe("CRM state machine — reactivateLead", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("revives a lost lead to contacted and spawns a reactivation call task", async () => {
    const { result } = await setup();
    const ctx = result.current.ctx;
    const lostLead = ctx.reactivationLeads.find((l) => l.stage === "lost");
    if (!lostLead) return;

    const tasksBefore = ctx.tasks.length;
    let ok = false;
    await act(async () => {
      ok = await ctx.reactivateLead(lostLead.id, "New tower launch pitch");
    });

    expect(ok).toBe(true);
    const revived = ctx.leads.find((l) => l.id === lostLead.id)!;
    expect(revived.stage).toBe("contacted");
    expect(revived.daysInStage).toBe(0);
    expect(revived.lostAt).toBeUndefined();

    expect(ctx.tasks.length).toBe(tasksBefore + 1);
    expect(ctx.tasks[0].title).toContain("Reactivation Call");

    // Reappears in the activity trail
    expect(ctx.activities[0].outcomeLabel).toBe("Lead Reactivated");
  });
});
