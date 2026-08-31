import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleValidationError } from "@/lib/server/api-security";
import { siteVisitBriefingInputSchema } from "@/lib/server/validations";
import { synthesizeSiteVisitBriefing } from "@/lib/server/site-visit-briefing";
import {
  getApiAuthContext,
  getServiceRoleClient,
  isLiveSupabaseAvailable,
} from "@/lib/server/supabase-server";
import { INITIAL_SITE_VISIT_BRIEFINGS } from "@/lib/mock-data";

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId");
  const unitId = searchParams.get("unitId");

  if (!leadId && !unitId) {
    return apiSuccess({ briefings: INITIAL_SITE_VISIT_BRIEFINGS });
  }

  const supabase = getServiceRoleClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    const found = INITIAL_SITE_VISIT_BRIEFINGS.find(
      (b) => (leadId && b.leadId === leadId) || (unitId && b.unitId === unitId)
    );
    return apiSuccess({ briefing: found || INITIAL_SITE_VISIT_BRIEFINGS[0] });
  }

  try {
    let query = supabase.from("site_visit_briefings").select("*").eq("org_id", auth.orgId);
    if (leadId) query = query.eq("lead_id", leadId);
    if (unitId) query = query.eq("unit_id", unitId);

    const { data, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) {
      return apiError(error.message, 500, "DB_QUERY_ERROR");
    }

    if (!data && leadId && unitId) {
      // Auto-synthesize on demand
      const res = await synthesizeSiteVisitBriefing({
        leadId,
        unitId,
        orgId: auth.orgId,
      });
      return apiSuccess({ briefing: res.briefing });
    }

    return apiSuccess({ briefing: data });
  } catch (err: any) {
    return apiError(err.message || "Failed to fetch site visit briefing", 500, "INTERNAL_ERROR");
  }
}

export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  try {
    const body = await req.json();
    const parsed = siteVisitBriefingInputSchema.safeParse(body);
    if (!parsed.success) {
      return handleValidationError(parsed.error);
    }

    const res = await synthesizeSiteVisitBriefing({
      leadId: parsed.data.leadId,
      unitId: parsed.data.unitId,
      activityId: parsed.data.activityId || undefined,
      orgId: auth.orgId,
      scheduledAt: parsed.data.scheduledAt,
    });

    if (!res.success || !res.briefing) {
      return apiError(res.error || "Failed to synthesize site visit briefing", 400, "BRIEFING_FAILED");
    }

    return apiSuccess({ briefing: res.briefing }, 201);
  } catch (err: any) {
    return apiError(err.message || "Failed to generate briefing", 500, "INTERNAL_ERROR");
  }
}
