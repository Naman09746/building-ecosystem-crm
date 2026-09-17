import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@repo/core/lib/server/api-security";
import { withAuth } from "@repo/core/lib/server/with-auth";
import {
  calculateCostSheet,
  generateCostSheetWhatsAppText,
  type CostSheetParameters,
} from "@repo/core/lib/cost-sheet-calculator";
import { mapUnitRow } from "@repo/core/lib/persistence/crm-sync";

// GET /api/properties/units/[id]/cost-sheet
export const GET = withAuth(
  async (req, { auth, supabase, params }) => {
    const unitId = params?.id;
    if (!unitId) {
      return apiError("Unit ID parameter is required", 400, "BAD_REQUEST");
    }

    try {
      const { data: unitRow, error } = await supabase
        .from("project_units")
        .select("*, project:project_id(id, name, developer, location)")
        .eq("id", unitId)
        .eq("org_id", auth.orgId)
        .single();

      if (error || !unitRow) {
        return apiError("Unit not found", 404, "NOT_FOUND");
      }

      const unit = mapUnitRow(unitRow);
      const searchParams = req.nextUrl.searchParams;

      const customParams: Partial<CostSheetParameters> = {};
      if (searchParams.get("plan")) {
        customParams.paymentPlanType = searchParams.get("plan") as any;
      }
      if (searchParams.get("state")) {
        customParams.state = searchParams.get("state") as any;
      }
      if (searchParams.get("gender")) {
        customParams.buyerGender = searchParams.get("gender") as any;
      }
      if (searchParams.get("ready")) {
        customParams.isReadyToMove = searchParams.get("ready") === "true";
      }

      const breakdown = calculateCostSheet(unit, customParams);
      const whatsappText = generateCostSheetWhatsAppText(unit, breakdown, "Apex Realty Advisors");

      return apiSuccess({
        unitId: unit.id,
        unitNumber: unit.unitNumber,
        tower: unit.tower,
        projectName: unit.projectName,
        breakdown,
        whatsappShareText: whatsappText,
      });
    } catch (err: any) {
      return apiError(err.message || "Failed to generate cost sheet", 500, "INTERNAL_ERROR");
    }
  },
  {
    rateLimit: { limit: 120, windowMs: 60000, keyPrefix: "unit_cost_sheet_get" },
  }
);

// POST /api/properties/units/[id]/cost-sheet (for customized pricing parameters)
export const POST = withAuth(
  async (req, { auth, supabase, params }) => {
    const unitId = params?.id;
    if (!unitId) {
      return apiError("Unit ID parameter is required", 400, "BAD_REQUEST");
    }

    try {
      const body = await req.json().catch(() => ({}));
      const { data: unitRow, error } = await supabase
        .from("project_units")
        .select("*, project:project_id(id, name, developer, location)")
        .eq("id", unitId)
        .eq("org_id", auth.orgId)
        .single();

      if (error || !unitRow) {
        return apiError("Unit not found", 404, "NOT_FOUND");
      }

      const unit = mapUnitRow(unitRow);
      const breakdown = calculateCostSheet(unit, body);
      const whatsappText = generateCostSheetWhatsAppText(unit, breakdown, body.agencyName || "Apex Realty Advisors");

      return apiSuccess({
        unitId: unit.id,
        unitNumber: unit.unitNumber,
        tower: unit.tower,
        projectName: unit.projectName,
        parameters: body,
        breakdown,
        whatsappShareText: whatsappText,
      });
    } catch (err: any) {
      return apiError(err.message || "Failed to compute cost sheet", 500, "INTERNAL_ERROR");
    }
  },
  {
    rateLimit: { limit: 60, windowMs: 60000, keyPrefix: "unit_cost_sheet_post" },
  }
);
