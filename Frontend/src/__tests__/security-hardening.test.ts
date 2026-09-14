import { describe, it, expect } from "vitest";

// ============================================================================
// SECURITY REGRESSION TEST SUITE — PHASE 1 HARDENING
//
// Verifies authorization boundaries across Leads, People, Project Units,
// Documents, and Multi-Tenant Isolation for Salesperson vs Manager roles.
// ============================================================================

type UserRole = "owner" | "manager" | "salesperson";

interface AuthContext {
  userId: string;
  orgId: string;
  role: UserRole;
}

interface LeadRecord {
  id: string;
  orgId: string;
  salespersonId: string;
  stage: string;
  notes?: string;
  budget: number;
}

interface PersonRecord {
  id: string;
  orgId: string;
  name: string;
  phone: string;
}

interface ProjectUnitRecord {
  id: string;
  orgId: string;
  projectId: string;
  tower: string;
  unitNumber: string;
  floor: number;
  configuration: string;
  superAreaSqFt: number;
  price: number;
  status: "available" | "hold" | "site_visit" | "negotiation" | "booked" | "sold";
  assignedLeadId?: string;
  assignedBuyerName?: string;
}

interface DocumentRecord {
  id: string;
  orgId: string;
  title: string;
  fileUrl: string;
  type: string;
}

// ----------------------------------------------------------------------------
// Database Security Logic Emulators (Matching 0007_security_hardening.sql)
// ----------------------------------------------------------------------------

const MANAGER_ROLES = new Set<UserRole>(["owner", "manager"]);

function isManager(role: UserRole): boolean {
  return MANAGER_ROLES.has(role);
}

// 1. Lead Guard (trg_guard_lead_ownership_and_assignment)
function evaluateLeadUpdate(
  caller: AuthContext,
  currentLead: LeadRecord,
  patch: Partial<LeadRecord>
): { ok: boolean; error?: string; lead?: LeadRecord } {
  // Tenant boundary check (RLS + trigger)
  if (currentLead.orgId !== caller.orgId) {
    return { ok: false, error: "42501: TENANT_VIOLATION - Lead belongs to another organization" };
  }

  // Salesperson scoping: non-managers can only update their own assigned leads
  if (!isManager(caller.role) && currentLead.salespersonId !== caller.userId) {
    return { ok: false, error: "42501: RLS_DENIED - Salespersons can only update their own leads" };
  }

  // Tenant change forbidden
  if (patch.orgId && patch.orgId !== currentLead.orgId) {
    return { ok: false, error: "42501: TENANT_CHANGE_FORBIDDEN" };
  }

  // Lead ownership reassignment guard
  if (patch.salespersonId && patch.salespersonId !== currentLead.salespersonId) {
    if (!isManager(caller.role)) {
      return { ok: false, error: "42501: LEAD_REASSIGNMENT_FORBIDDEN: Only owners and managers can reassign leads" };
    }
  }

  const updated: LeadRecord = {
    ...currentLead,
    ...patch,
  };

  return { ok: true, lead: updated };
}

// 2. People Policy & Trigger Evaluation
function evaluatePersonMutation(
  caller: AuthContext,
  person: PersonRecord,
  action: "SELECT" | "INSERT" | "UPDATE" | "DELETE",
  patch?: Partial<PersonRecord>
): { ok: boolean; error?: string } {
  // Tenant boundary
  if (person.orgId !== caller.orgId) {
    return { ok: false, error: "42501: TENANT_VIOLATION" };
  }

  if (action === "DELETE") {
    if (!isManager(caller.role)) {
      return { ok: false, error: "42501: RLS_DENIED - Only managers can delete customer master records" };
    }
    return { ok: true };
  }

  if (action === "UPDATE") {
    if (patch?.orgId && patch.orgId !== person.orgId) {
      return { ok: false, error: "42501: TENANT_CHANGE_FORBIDDEN" };
    }
    return { ok: true };
  }

  return { ok: true };
}

// 3. Project Unit Guard (trg_guard_project_unit_update + RLS)
function evaluateProjectUnitMutation(
  caller: AuthContext,
  unit: ProjectUnitRecord,
  action: "SELECT" | "INSERT" | "UPDATE" | "DELETE",
  patch?: Partial<ProjectUnitRecord>
): { ok: boolean; error?: string; unit?: ProjectUnitRecord } {
  // Tenant boundary
  if (unit.orgId !== caller.orgId) {
    return { ok: false, error: "42501: TENANT_VIOLATION" };
  }

  if (action === "DELETE") {
    if (!isManager(caller.role)) {
      return { ok: false, error: "42501: RLS_DENIED - Only managers can delete inventory units" };
    }
    return { ok: true };
  }

  if (action === "INSERT") {
    if (!isManager(caller.role)) {
      return { ok: false, error: "42501: RLS_DENIED - Only managers can insert new inventory units" };
    }
    return { ok: true };
  }

  if (action === "UPDATE" && patch) {
    if (patch.orgId && patch.orgId !== unit.orgId) {
      return { ok: false, error: "42501: TENANT_CHANGE_FORBIDDEN" };
    }

    if (!isManager(caller.role)) {
      if (patch.price !== undefined && patch.price !== unit.price) {
        return { ok: false, error: "42501: UNIT_PRICE_UPDATE_FORBIDDEN" };
      }
      if (patch.configuration !== undefined && patch.configuration !== unit.configuration) {
        return { ok: false, error: "42501: UNIT_CONFIG_UPDATE_FORBIDDEN" };
      }
      if (patch.superAreaSqFt !== undefined && patch.superAreaSqFt !== unit.superAreaSqFt) {
        return { ok: false, error: "42501: UNIT_AREA_UPDATE_FORBIDDEN" };
      }
      if (
        (patch.tower !== undefined && patch.tower !== unit.tower) ||
        (patch.unitNumber !== undefined && patch.unitNumber !== unit.unitNumber) ||
        (patch.floor !== undefined && patch.floor !== unit.floor) ||
        (patch.projectId !== undefined && patch.projectId !== unit.projectId)
      ) {
        return { ok: false, error: "42501: UNIT_SPECS_UPDATE_FORBIDDEN" };
      }
    }

    return { ok: true, unit: { ...unit, ...patch } };
  }

  return { ok: true };
}

// 4. Document Policy Evaluation
function evaluateDocumentMutation(
  caller: AuthContext,
  doc: DocumentRecord,
  action: "SELECT" | "INSERT" | "UPDATE" | "DELETE"
): { ok: boolean; error?: string } {
  if (doc.orgId !== caller.orgId) {
    return { ok: false, error: "42501: TENANT_VIOLATION" };
  }

  if (action === "DELETE") {
    if (!isManager(caller.role)) {
      return { ok: false, error: "42501: RLS_DENIED - Only managers can delete documents" };
    }
  }

  return { ok: true };
}

// ============================================================================
// TEST SUITE EXECUTION
// ============================================================================

describe("Phase 1 Security Hardening: Database Authorization & RLS Regression Suite", () => {
  const ORG_A = "org-apex-realty";
  const ORG_B = "org-dlf-partners";

  const rep1: AuthContext = { userId: "usr-sales-rahul", orgId: ORG_A, role: "salesperson" };
  const rep2: AuthContext = { userId: "usr-sales-priya", orgId: ORG_A, role: "salesperson" };
  const manager: AuthContext = { userId: "usr-mgr-vikram", orgId: ORG_A, role: "manager" };
  const owner: AuthContext = { userId: "usr-owner-alok", orgId: ORG_A, role: "owner" };
  const repOrgB: AuthContext = { userId: "usr-rep-b", orgId: ORG_B, role: "salesperson" };

  const lead1: LeadRecord = {
    id: "lead-101",
    orgId: ORG_A,
    salespersonId: rep1.userId,
    stage: "qualified",
    notes: "Initial consultation done",
    budget: 35000000,
  };

  const person1: PersonRecord = {
    id: "person-101",
    orgId: ORG_A,
    name: "Siddharth Verma",
    phone: "+919811099234",
  };

  const unit1: ProjectUnitRecord = {
    id: "unit-101",
    orgId: ORG_A,
    projectId: "proj-1",
    tower: "Tower A",
    unitNumber: "1402",
    floor: 14,
    configuration: "3 BHK + Servant",
    superAreaSqFt: 2800,
    price: 38000000,
    status: "available",
  };

  const doc1: DocumentRecord = {
    id: "doc-101",
    orgId: ORG_A,
    title: "Magnolias Brochure.pdf",
    fileUrl: "https://storage.callcrm.in/magnolias.pdf",
    type: "brochure",
  };

  // --------------------------------------------------------------------------
  // 1. LEAD OWNERSHIP & REASSIGNMENT PROTECTION
  // --------------------------------------------------------------------------
  describe("1. Lead Ownership Protection on UPDATE", () => {
    it("1. Salesperson can update legitimate operational fields on own lead", () => {
      const res = evaluateLeadUpdate(rep1, lead1, {
        stage: "site_visit",
        notes: "Site visit booked for Sunday 4 PM",
      });
      expect(res.ok).toBe(true);
      expect(res.lead?.stage).toBe("site_visit");
      expect(res.lead?.notes).toBe("Site visit booked for Sunday 4 PM");
    });

    it("2. Salesperson CANNOT change salesperson_id to another sales rep", () => {
      const res = evaluateLeadUpdate(rep1, lead1, {
        salespersonId: rep2.userId,
      });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("LEAD_REASSIGNMENT_FORBIDDEN");
    });

    it("3. Salesperson CANNOT modify a lead assigned to another salesperson", () => {
      const res = evaluateLeadUpdate(rep2, lead1, {
        notes: "Trying to modify colleague's lead",
      });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("RLS_DENIED");
    });

    it("4. Manager / Owner CAN reassign lead to any salesperson", () => {
      const managerRes = evaluateLeadUpdate(manager, lead1, {
        salespersonId: rep2.userId,
      });
      expect(managerRes.ok).toBe(true);
      expect(managerRes.lead?.salespersonId).toBe(rep2.userId);

      const ownerRes = evaluateLeadUpdate(owner, lead1, {
        salespersonId: rep1.userId,
      });
      expect(ownerRes.ok).toBe(true);
      expect(ownerRes.lead?.salespersonId).toBe(rep1.userId);
    });

    it("5. Nobody can alter the org_id of a lead (cross-tenant transfer attack)", () => {
      const res = evaluateLeadUpdate(manager, lead1, {
        orgId: ORG_B,
      });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("TENANT_CHANGE_FORBIDDEN");
    });
  });

  // --------------------------------------------------------------------------
  // 2. PEOPLE (CUSTOMER MASTER DATA) RLS HARDENING
  // --------------------------------------------------------------------------
  describe("2. People (Contacts) RLS Hardening", () => {
    it("5. Salesperson can view and update people in their organization", () => {
      const selectRes = evaluatePersonMutation(rep1, person1, "SELECT");
      expect(selectRes.ok).toBe(true);

      const updateRes = evaluatePersonMutation(rep1, person1, "UPDATE", {
        name: "Siddharth Verma (VIP)",
      });
      expect(updateRes.ok).toBe(true);
    });

    it("6. Salesperson CANNOT delete a person record", () => {
      const res = evaluatePersonMutation(rep1, person1, "DELETE");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("RLS_DENIED");
    });

    it("7. Manager CAN delete a customer record when legitimately required", () => {
      const res = evaluatePersonMutation(manager, person1, "DELETE");
      expect(res.ok).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 3. PROJECT UNITS (INVENTORY) FIELD & DELETE PROTECTION
  // --------------------------------------------------------------------------
  describe("3. Project Units (Inventory) Mutation Hardening", () => {
    it("8. Salesperson CAN update operational fields (status, assignedLeadId, assignedBuyerName)", () => {
      const res = evaluateProjectUnitMutation(rep1, unit1, "UPDATE", {
        status: "negotiation",
        assignedLeadId: lead1.id,
        assignedBuyerName: "Siddharth Verma",
      });
      expect(res.ok).toBe(true);
      expect(res.unit?.status).toBe("negotiation");
      expect(res.unit?.assignedLeadId).toBe(lead1.id);
    });

    it("9. Salesperson CANNOT change unit price", () => {
      const res = evaluateProjectUnitMutation(rep1, unit1, "UPDATE", {
        price: 25000000, // Unauthorized discount attempt
      });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("UNIT_PRICE_UPDATE_FORBIDDEN");
    });

    it("10. Salesperson CANNOT change unit configuration", () => {
      const res = evaluateProjectUnitMutation(rep1, unit1, "UPDATE", {
        configuration: "4 BHK Duplex",
      });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("UNIT_CONFIG_UPDATE_FORBIDDEN");
    });

    it("11. Salesperson CANNOT change unit super area", () => {
      const res = evaluateProjectUnitMutation(rep1, unit1, "UPDATE", {
        superAreaSqFt: 4000,
      });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("UNIT_AREA_UPDATE_FORBIDDEN");
    });

    it("12. Salesperson CANNOT change core unit structural specifications (tower, unit number, floor)", () => {
      const res = evaluateProjectUnitMutation(rep1, unit1, "UPDATE", {
        tower: "Tower Penthouse",
        floor: 30,
      });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("UNIT_SPECS_UPDATE_FORBIDDEN");
    });

    it("13. Salesperson CANNOT delete an inventory unit", () => {
      const res = evaluateProjectUnitMutation(rep1, unit1, "DELETE");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("RLS_DENIED");
    });

    it("14. Manager CAN modify prices, structural fields, and delete inventory units", () => {
      const updateRes = evaluateProjectUnitMutation(manager, unit1, "UPDATE", {
        price: 41000000,
        configuration: "3 BHK + Servant (Modified)",
      });
      expect(updateRes.ok).toBe(true);
      expect(updateRes.unit?.price).toBe(41000000);

      const deleteRes = evaluateProjectUnitMutation(manager, unit1, "DELETE");
      expect(deleteRes.ok).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 4. DOCUMENTS RLS & DELETE PROTECTION
  // --------------------------------------------------------------------------
  describe("4. Documents RLS Hardening", () => {
    it("15. Salesperson can view and upload documents, but CANNOT delete documents", () => {
      const selectRes = evaluateDocumentMutation(rep1, doc1, "SELECT");
      expect(selectRes.ok).toBe(true);

      const insertRes = evaluateDocumentMutation(rep1, doc1, "INSERT");
      expect(insertRes.ok).toBe(true);

      const deleteRes = evaluateDocumentMutation(rep1, doc1, "DELETE");
      expect(deleteRes.ok).toBe(false);
      expect(deleteRes.error).toContain("RLS_DENIED");
    });

    it("16. Manager CAN delete documents", () => {
      const deleteRes = evaluateDocumentMutation(manager, doc1, "DELETE");
      expect(deleteRes.ok).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 5. TENANT ISOLATION (CROSS-ORG BOUNDARY DEFENSE)
  // --------------------------------------------------------------------------
  describe("5. Multi-Tenant Cross-Organization Isolation", () => {
    it("17. User from Org B CANNOT SELECT Org A leads", () => {
      const res = evaluateLeadUpdate(repOrgB, lead1, {});
      expect(res.ok).toBe(false);
      expect(res.error).toContain("TENANT_VIOLATION");
    });

    it("18. User from Org B CANNOT UPDATE Org A inventory units", () => {
      const res = evaluateProjectUnitMutation(repOrgB, unit1, "UPDATE", { status: "hold" });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("TENANT_VIOLATION");
    });

    it("19. User from Org B CANNOT DELETE Org A customer records", () => {
      const res = evaluatePersonMutation(repOrgB, person1, "DELETE");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("TENANT_VIOLATION");
    });
  });
});
