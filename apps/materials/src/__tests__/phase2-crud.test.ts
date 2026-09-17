import { describe, it, expect } from "vitest";
import {
  createProjectSchema,
  updateProjectSchema,
  createProjectUnitSchema,
  updateProjectUnitSchema,
  bulkImportUnitsSchema,
  createRegionSchema,
  updateRegionSchema,
  createInvitationSchema,
  updateUserRoleSchema,
  updateOrgSettingsSchema,
  importLeadsBatchSchema,
  createDocumentSchema,
} from "@repo/core/lib/server/validations";

const VALID_UUID = "123e4567-e89b-42d3-a456-426614174000";

describe("Phase 2 Core CRUD & System Validation Schemas", () => {
  // 1. Projects
  describe("Project Schemas", () => {
    it("should accept valid project creation payload", () => {
      const payload = {
        name: "The Grand Pinnacle",
        developer: "Prestige Group",
        location: "Worli Sea Face, Mumbai",
        regionId: VALID_UUID,
        priceRange: "₹4.5 Cr - ₹12.5 Cr",
        status: "active" as const,
      };
      const result = createProjectSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should reject project creation without required name, developer, location", () => {
      expect(createProjectSchema.safeParse({ name: "" }).success).toBe(false);
      expect(createProjectSchema.safeParse({ name: "Proj", developer: "" }).success).toBe(false);
    });

    it("should allow partial updates to projects", () => {
      const updatePayload = {
        priceRange: "₹5 Cr - ₹15 Cr",
        status: "completed" as const,
      };
      const result = updateProjectSchema.safeParse(updatePayload);
      expect(result.success).toBe(true);
    });
  });

  // 2. Units
  describe("Unit & Inventory Schemas", () => {
    it("should validate and accept unit creation", () => {
      const unitPayload = {
        projectId: VALID_UUID,
        tower: "Tower A",
        unitNumber: "1402",
        floor: 14,
        configuration: "3 BHK Luxury",
        superAreaSqFt: 1850,
        price: 25000000,
        facing: "North-East Sea Facing",
        status: "available" as const,
      };
      const result = createProjectUnitSchema.safeParse(unitPayload);
      expect(result.success).toBe(true);
    });

    it("should reject negative prices, floors or absurd square footage", () => {
      expect(
        createProjectUnitSchema.safeParse({
          projectId: VALID_UUID,
          tower: "Tower A",
          unitNumber: "101",
          floor: 1,
          configuration: "3 BHK",
          superAreaSqFt: -100,
          price: 10000000,
        }).success
      ).toBe(false);

      expect(
        createProjectUnitSchema.safeParse({
          projectId: VALID_UUID,
          tower: "Tower A",
          unitNumber: "101",
          floor: 1,
          configuration: "3 BHK",
          superAreaSqFt: 1500,
          price: -500,
        }).success
      ).toBe(false);
    });

    it("should validate bulk import unit payloads", () => {
      const bulkPayload = {
        projectId: VALID_UUID,
        units: [
          {
            tower: "Tower A",
            unitNumber: "101",
            floor: 1,
            configuration: "3 BHK",
            superAreaSqFt: 1850,
            price: 25000000,
            status: "available" as const,
          },
          {
            tower: "Tower A",
            unitNumber: "102",
            floor: 1,
            configuration: "3 BHK",
            superAreaSqFt: 1850,
            price: 25000000,
            status: "available" as const,
          },
        ],
      };
      const result = bulkImportUnitsSchema.safeParse(bulkPayload);
      expect(result.success).toBe(true);
    });
  });

  // 3. Regions
  describe("Region Schemas", () => {
    it("should accept valid regional hub definition", () => {
      const valid = { name: "Mumbai Metro", code: "MMR" };
      expect(createRegionSchema.safeParse(valid).success).toBe(true);
    });

    it("should reject region with invalid or empty code", () => {
      expect(createRegionSchema.safeParse({ name: "Mumbai", code: "" }).success).toBe(false);
      expect(createRegionSchema.safeParse({ name: "Mumbai", code: "TOOLONGCODEHERE" }).success).toBe(false);
    });
  });

  // 4. Team Invitations & Roles
  describe("Team Invitation & Role Schemas", () => {
    it("should validate valid team invitation payload", () => {
      const valid = {
        email: "rep@agency.com",
        role: "salesperson" as const,
        regionId: VALID_UUID,
      };
      expect(createInvitationSchema.safeParse(valid).success).toBe(true);
    });

    it("should reject invalid email formats or disallowed roles", () => {
      expect(createInvitationSchema.safeParse({ email: "invalid-email", role: "salesperson" }).success).toBe(false);
      expect(createInvitationSchema.safeParse({ email: "test@agency.com", role: "superadmin_hacker" }).success).toBe(false);
    });

    it("should validate role update schema", () => {
      const valid = {
        role: "manager" as const,
        regionId: VALID_UUID,
      };
      expect(updateUserRoleSchema.safeParse(valid).success).toBe(true);
    });
  });

  // 5. Organization Settings
  describe("Org Settings Schemas", () => {
    it("should validate organization settings updates", () => {
      const payload = {
        name: "Apex Realty Advisors Pvt. Ltd.",
        reactivationDays: 60,
        customSettings: {
          autoAssignment: true,
          speedToLeadAlerts: true,
        },
      };
      expect(updateOrgSettingsSchema.safeParse(payload).success).toBe(true);
    });

    it("should reject reactivation window outside [1, 365] days", () => {
      expect(updateOrgSettingsSchema.safeParse({ reactivationDays: 0 }).success).toBe(false);
      expect(updateOrgSettingsSchema.safeParse({ reactivationDays: 400 }).success).toBe(false);
    });
  });

  // 6. Lead Batch Import
  describe("Lead Import Batch Schemas", () => {
    it("should validate batch of imported leads with normalized phones", () => {
      const batch = {
        leads: [
          {
            personName: "Sunil Mittal",
            phone: "+919811122334",
            email: "sunil@example.com",
            budget: 45000000,
            stage: "new" as const,
            source: "CSV Import",
          },
          {
            personName: "Kavita Reddy",
            phone: "+919822233445",
            budget: 28000000,
            stage: "qualified" as const,
          },
        ],
      };
      const result = importLeadsBatchSchema.safeParse(batch);
      expect(result.success).toBe(true);
    });

    it("should reject batches exceeding 500 records at once", () => {
      const largeBatch = {
        leads: Array(501).fill({
          personName: "Test",
          phone: "+919800000000",
        }),
      };
      expect(importLeadsBatchSchema.safeParse(largeBatch).success).toBe(false);
    });
  });

  // 7. Document Vault
  describe("Document Vault Schema", () => {
    it("should validate document metadata creation", () => {
      const validDoc = {
        title: "PAN Card - Vikramaditya",
        type: "kyc" as const,
        fileUrl: "https://storage.supabase.co/v1/object/public/crm-documents/org-123/kyc/pan.pdf",
        leadId: VALID_UUID,
        projectId: VALID_UUID,
        fileSizeBytes: 204800,
        mimeType: "application/pdf",
      };
      expect(createDocumentSchema.safeParse(validDoc).success).toBe(true);
    });
  });
});
