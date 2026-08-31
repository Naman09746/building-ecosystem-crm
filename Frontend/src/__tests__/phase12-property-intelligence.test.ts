import { describe, it, expect } from "vitest";
import {
  createPropertyAreaSchema,
  createProjectTowerSchema,
  createProjectUnitSchema,
  createEntityRelationshipSchema,
  createPropertyFactSchema,
  globalSearchQuerySchema,
} from "@/lib/server/validations";
import {
  mapAreaRow,
  mapTowerRow,
  mapExternalOrgRow,
  mapRelationshipRow,
  mapFactRow,
  mapUnitRow,
  unitToRow,
} from "@/lib/persistence/crm-sync";
import {
  generatePropertyBriefing,
  matchBuyersForUnit,
  propertyBriefingInputSchema,
} from "@/lib/server/aria-tools";

describe("Phase 12: Real Estate Intelligence Layer", () => {
  describe("1. Schema Validations", () => {
    it("validates PropertyArea with slug, tier, and pincode", () => {
      const parsed = createPropertyAreaSchema.safeParse({
        name: "Golf Course Road",
        slug: "golf-course-road",
        city: "Gurugram",
        state: "Haryana",
        pincode: "122002",
        tier: "ultra_luxury",
        description: "India's highest-valued residential strip",
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.tier).toBe("ultra_luxury");
      }
    });

    it("validates ProjectTower with floor count and construction status", () => {
      const parsed = createProjectTowerSchema.safeParse({
        projectId: "11111111-1111-1111-1111-111111111111",
        name: "Tower 4",
        towerCode: "T4",
        totalFloors: 38,
        unitsPerFloor: 2,
        elevatorsCount: 4,
        constructionStatus: "ready",
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.totalFloors).toBe(38);
      }
    });

    it("validates Extended ProjectUnit with luxury Indian metrics and seller intent", () => {
      const parsed = createProjectUnitSchema.safeParse({
        projectId: "11111111-1111-1111-1111-111111111111",
        tower: "Tower A",
        unitNumber: "1402",
        floor: 14,
        configuration: "4 BHK Penthouse",
        unitType: "penthouse",
        superAreaSqFt: 7400,
        carpetAreaSqFt: 5800,
        balconiesCount: 3,
        parkingSlots: 3,
        isCornerUnit: true,
        price: 420000000,
        askingPrice: 420000000,
        maintenanceMonthly: 32000,
        expectedMonthlyRent: 650000,
        sellerIntent: "evaluating_market",
        status: "available",
        verificationStatus: "verified",
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.price).toBe(420000000);
        expect(parsed.data.isCornerUnit).toBe(true);
      }
    });

    it("validates EntityRelationship temporal graph edge", () => {
      const parsed = createEntityRelationshipSchema.safeParse({
        subjectType: "person",
        subjectId: "22222222-2222-2222-2222-222222222222",
        subjectName: "Vikram Singhania",
        subjectPhone: "+919810011223",
        relationshipType: "current_owner",
        targetType: "unit",
        targetId: "33333333-3333-3333-3333-333333333333",
        validFrom: "2023-01-15",
        isCurrent: true,
        confidenceScore: 100,
        verificationStatus: "verified",
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.relationshipType).toBe("current_owner");
      }
    });

    it("validates PropertyFact with verification tier taxonomy", () => {
      const parsed = createPropertyFactSchema.safeParse({
        entityType: "unit",
        entityId: "33333333-3333-3333-3333-333333333333",
        category: "visitor_access_rules",
        title: "24h Gate Notice",
        factStatement: "Visitor entry requires prior gate pass registration at reception.",
        verificationTier: "verified",
        confidencePct: 100,
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.verificationTier).toBe("verified");
      }
    });

    it("validates Global Search query parameter constraints", () => {
      const valid = globalSearchQuerySchema.safeParse({ q: "Camellias", limit: 15 });
      expect(valid.success).toBe(true);

      const invalid = globalSearchQuerySchema.safeParse({ q: "a" }); // min 2 chars
      expect(invalid.success).toBe(false);
    });
  });

  describe("2. Persistence Mappers & Hydration", () => {
    it("maps DB row to PropertyArea domain model", () => {
      const area = mapAreaRow(
        {
          id: "area-1",
          org_id: "org-1",
          region_id: "reg-1",
          name: "Golf Course Road",
          slug: "golf-course-road",
          city: "Gurugram",
          state: "Haryana",
          pincode: "122002",
          tier: "ultra_luxury",
        },
        "Delhi NCR"
      );

      expect(area.id).toBe("area-1");
      expect(area.regionName).toBe("Delhi NCR");
      expect(area.tier).toBe("ultra_luxury");
    });

    it("maps DB row to ProjectTower domain model", () => {
      const tower = mapTowerRow(
        {
          id: "tow-1",
          org_id: "org-1",
          project_id: "proj-1",
          name: "Tower B",
          total_floors: 32,
          units_per_floor: 4,
          elevators_count: 3,
          construction_status: "ready",
        },
        "The Magnolias"
      );

      expect(tower.name).toBe("Tower B");
      expect(tower.projectName).toBe("The Magnolias");
      expect(tower.totalFloors).toBe(32);
    });

    it("maps DB row to EntityRelationship with temporal flags", () => {
      const rel = mapRelationshipRow({
        id: "rel-1",
        org_id: "org-1",
        subject_type: "person",
        subject_id: "per-1",
        subject_name: "Rahul Mehra",
        relationship_type: "current_owner",
        target_type: "unit",
        target_id: "unit-1",
        valid_from: "2022-06-01",
        valid_until: null,
        is_current: true,
        confidence_score: 100,
        verification_status: "verified",
      });

      expect(rel.isCurrent).toBe(true);
      expect(rel.relationshipType).toBe("current_owner");
      expect(rel.subjectName).toBe("Rahul Mehra");
    });

    it("maps DB row to PropertyFact with verification tier", () => {
      const fact = mapFactRow({
        id: "fact-1",
        org_id: "org-1",
        entity_type: "unit",
        entity_id: "unit-1",
        category: "pricing_intelligence",
        title: "Owner Floor Price",
        fact_statement: "Owner will not sell below 35 Cr",
        verification_tier: "user_provided",
        confidence_pct: 80,
      });

      expect(fact.category).toBe("pricing_intelligence");
      expect(fact.verificationTier).toBe("user_provided");
    });

    it("correctly transforms Unit domain model to SQL row shape", () => {
      const row = unitToRow({
        projectId: "proj-1",
        tower: "Tower A",
        unitNumber: "101",
        floor: 1,
        configuration: "3 BHK",
        price: 25000000,
        askingPrice: 26000000,
        status: "available",
        isCornerUnit: true,
        sellerIntent: "urgent_liquidation",
      });

      expect(row.project_id).toBe("proj-1");
      expect(row.asking_price).toBe(26000000);
      expect(row.is_corner_unit).toBe(true);
      expect(row.seller_intent).toBe("urgent_liquidation");
    });
  });

  describe("3. Aria Property Intelligence Tools", () => {
    it("generates structured property briefing with specs, commercials, and gate rules", async () => {
      const res = await generatePropertyBriefing(
        { unitNumber: "1402", tower: "Tower A" },
        { orgId: "org-1", userId: "usr-1" }
      );

      expect(res.success).toBe(true);
      expect(res.briefing).toBeDefined();
      if (res.briefing) {
        expect(res.briefing.verifiedSpecs.configuration).toBeTruthy();
        expect(res.briefing.commercials.askingPrice).toBeGreaterThan(0);
        expect(res.briefing.salesMemoryFacts.length).toBeGreaterThan(0);
        expect(res.briefing.gateAccessProtocol).toBeTruthy();
      }
    });

    it("matches active buyers for a unit with customized WhatsApp pitch", async () => {
      const res = await matchBuyersForUnit(
        { unitId: "11111111-1111-1111-1111-111111111111", maxMatches: 3 },
        { orgId: "org-1", userId: "usr-1" }
      );

      expect(res.success).toBe(true);
      expect(res.matches).toBeDefined();
      if (res.matches && res.matches.length > 0) {
        const firstMatch = res.matches[0];
        expect(firstMatch.personName).toBeTruthy();
        expect(firstMatch.matchScore).toBeGreaterThan(80);
        expect(firstMatch.suggestedWhatsAppPitch).toContain("The Camellias");
      }
    });
  });
});
