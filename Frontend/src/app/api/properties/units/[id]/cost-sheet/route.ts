import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
  checkRateLimit,
} from "@/lib/server/api-security";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
} from "@/lib/server/supabase-server";
import {
  calculateCostSheet,
  generateCostSheetWhatsAppText,
  type CostSheetParameters,
} from "@/lib/cost-sheet-calculator";
import { mapUnitRow } from "@/lib/persistence/crm-sync";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/properties/units/[id]/cost-sheet
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id: unitId } = await params;
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const rateCheck = checkRateLimit(`unit_cost_sheet_${auth.userId}`, 120, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded", 429, "RATE_LIMIT_EXCEEDED");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
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
}

// POST /api/properties/units/[id]/cost-sheet (for customized pricing parameters)
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: unitId } = await params;
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const rateCheck = checkRateLimit(`unit_cost_sheet_post_${auth.userId}`, 60, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded", 429, "RATE_LIMIT_EXCEEDED");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
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
}
