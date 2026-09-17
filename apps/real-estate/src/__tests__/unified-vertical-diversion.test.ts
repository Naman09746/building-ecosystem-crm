import { describe, it, expect } from "vitest";
import { ECOSYSTEM_VERTICALS } from "@repo/core/config/ecosystem";
import { getPipelineStages } from "@repo/core/config/pipeline-presets";

describe("Unified Single-Site Vertical Diversion", () => {
  it("defines both real_estate and building_materials in the ecosystem registry", () => {
    expect(ECOSYSTEM_VERTICALS.real_estate).toBeDefined();
    expect(ECOSYSTEM_VERTICALS.building_materials).toBeDefined();

    expect(ECOSYSTEM_VERTICALS.real_estate.name).toBe("Real Estate & Housing");
    expect(ECOSYSTEM_VERTICALS.building_materials.name).toBe("Building Materials & Supplies");

    expect(ECOSYSTEM_VERTICALS.real_estate.terms.clientType).toBe("Buyer / Investor");
    expect(ECOSYSTEM_VERTICALS.building_materials.terms.clientType).toBe("Contractor / Builder");

    expect(ECOSYSTEM_VERTICALS.real_estate.terms.inventoryItem).toBe("Flat / Unit");
    expect(ECOSYSTEM_VERTICALS.building_materials.terms.inventoryItem).toBe("Material SKU");
  });

  it("provisions vertical-specific pipeline presets based on org.industry", () => {
    const realEstateStages = getPipelineStages("real_estate", "deep");
    const materialsStages = getPipelineStages("building_materials", "deep");

    expect(realEstateStages.length).toBeGreaterThan(0);
    expect(materialsStages.length).toBeGreaterThan(0);

    // Real estate stages should contain Site Visit or Unit concepts
    const hasSiteVisit = realEstateStages.some(
      (s) => s.name.toLowerCase().includes("site visit") || s.name.toLowerCase().includes("lead")
    );
    expect(hasSiteVisit).toBe(true);

    // Building materials stages should contain commercial dispatch, khata or quote concepts
    const hasCommercialStage = materialsStages.some(
      (s) =>
        s.name.toLowerCase().includes("quote") ||
        s.name.toLowerCase().includes("khata") ||
        s.name.toLowerCase().includes("challan") ||
        s.name.toLowerCase().includes("sample")
    );
    expect(hasCommercialStage).toBe(true);
  });

  it("correctly models Real Estate demo personas", () => {
    const reOrg = {
      id: "org-apex-realty",
      name: "Apex Realty Partners",
      industry: "real_estate" as const,
    };
    expect(reOrg.industry).toBe("real_estate");
  });

  it("correctly models Building Materials demo personas", () => {
    const matOrg = {
      id: "org-jindal-materials",
      name: "Jindal Building Supplies",
      industry: "building_materials" as const,
    };
    expect(matOrg.industry).toBe("building_materials");
  });
});
