import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleValidationError } from "@/lib/server/api-security";
import { createSellerOpportunitySchema, updateSellerOpportunitySchema } from "@/lib/server/validations";
import { detectSellerSignals } from "@/lib/server/seller-intelligence";
import {
  getApiAuthContext,
  getServiceRoleClient,
  isLiveSupabaseAvailable,
} from "@/lib/server/supabase-server";
import { INITIAL_SELLER_OPPORTUNITIES } from "@/lib/mock-data";

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const { searchParams } = new URL(req.url);
  const scan = searchParams.get("scan") === "true";

  if (scan) {
    const result = await detectSellerSignals(auth.orgId);
    return apiSuccess({
      signals: result.detectedSignals,
      totalScanned: result.totalScannedUnits,
    });
  }

  const supabase = getServiceRoleClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiSuccess({ opportunities: INITIAL_SELLER_OPPORTUNITIES });
  }

  try {
    const { data, error } = await supabase
      .from("seller_opportunities")
      .select(`
        *,
        unit:unit_id (
          id, unit_number, tower, configuration, price, asking_price,
          project:project_id (name)
        ),
        owner:owner_id (id, name, phone)
      `)
      .eq("org_id", auth.orgId)
      .order("created_at", { ascending: false });

    if (error) {
      return apiError(error.message, 500, "DB_QUERY_ERROR");
    }

    const mapped = (data || []).map((row: any) => ({
      id: row.id,
      orgId: row.org_id,
      unitId: row.unit_id,
      unitTitle: row.unit ? `${row.unit.project?.name || "Society"} • ${row.unit.tower}-${row.unit.unit_number}` : "Unit",
      projectName: row.unit?.project?.name,
      tower: row.unit?.tower,
      unitNumber: row.unit?.unit_number,
      ownerId: row.owner_id,
      ownerName: row.owner?.name,
      ownerPhone: row.owner?.phone,
      signalType: row.signal_type,
      signalStrength: row.signal_strength,
      estimatedValuation: row.estimated_valuation ? Number(row.estimated_valuation) : undefined,
      suggestedPitch: row.suggested_pitch,
      urgency: row.urgency,
      status: row.status,
      assignedToUserId: row.assigned_to_user_id,
      aiRationale: row.ai_rationale,
      metadata: row.metadata,
      lastContactedAt: row.last_contacted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return apiSuccess({ opportunities: mapped });
  } catch (err: any) {
    return apiError(err.message || "Failed to fetch seller opportunities", 500, "INTERNAL_ERROR");
  }
}

export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  try {
    const body = await req.json();
    const parsed = createSellerOpportunitySchema.safeParse(body);
    if (!parsed.success) {
      return handleValidationError(parsed.error);
    }

    const supabase = getServiceRoleClient();
    if (!supabase || !isLiveSupabaseAvailable) {
      const newOpp = {
        id: `opp-${Date.now()}`,
        orgId: auth.orgId,
        unitId: parsed.data.unitId,
        ownerId: parsed.data.ownerId || undefined,
        signalType: parsed.data.signalType,
        signalStrength: parsed.data.signalStrength,
        estimatedValuation: parsed.data.estimatedValuation,
        suggestedPitch: parsed.data.suggestedPitch,
        urgency: parsed.data.urgency,
        status: parsed.data.status,
        assignedToUserId: parsed.data.assignedToUserId || auth.userId,
        aiRationale: parsed.data.aiRationale,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return apiSuccess({ opportunity: newOpp }, 201);
    }

    const { data, error } = await supabase
      .from("seller_opportunities")
      .insert({
        org_id: auth.orgId,
        unit_id: parsed.data.unitId,
        owner_id: parsed.data.ownerId || null,
        signal_type: parsed.data.signalType,
        signal_strength: parsed.data.signalStrength,
        estimated_valuation: parsed.data.estimatedValuation || null,
        suggested_pitch: parsed.data.suggestedPitch || null,
        urgency: parsed.data.urgency,
        status: parsed.data.status,
        assigned_to_user_id: parsed.data.assignedToUserId || auth.userId,
        ai_rationale: parsed.data.aiRationale || null,
        metadata: parsed.data.metadata || {},
      })
      .select()
      .single();

    if (error) {
      return apiError(error.message, 500, "DB_INSERT_ERROR");
    }

    return apiSuccess({ opportunity: data }, 201);
  } catch (err: any) {
    return apiError(err.message || "Failed to create seller opportunity", 500, "INTERNAL_ERROR");
  }
}
