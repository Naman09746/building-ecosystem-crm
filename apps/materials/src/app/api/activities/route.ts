import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
  handleValidationError,
  checkRateLimit,
} from "@repo/core/lib/server/api-security";
import { createActivitySchema } from "@repo/core/lib/server/validations";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
} from "@repo/core/lib/server/supabase-server";

const LIMIT_MIN = 1;
const LIMIT_MAX = 200;

// GET /api/activities - Retrieve immutable audit stream (tenant-scoped)
export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const rateCheck = checkRateLimit(`get_act_${auth.userId}`, 120, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded for activity stream", 429, "RATE_LIMIT_EXCEEDED");
  }

  const searchParams = req.nextUrl.searchParams;
  const leadId = searchParams.get("leadId");
  const projectId = searchParams.get("projectId");
  const rawLimit = parseInt(searchParams.get("limit") || "50", 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, LIMIT_MIN), LIMIT_MAX)
    : 50;

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError(
      "Backend database is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      503,
      "SERVICE_UNAVAILABLE"
    );
  }

  try {
    let query = supabase
      .from("activities")
      .select("*")
      .eq("org_id", auth.orgId)
      .order("occurred_at", { ascending: false })
      .limit(limit);

    if (leadId) query = query.eq("lead_id", leadId);
    if (projectId) query = query.eq("project_id", projectId);

    const { data, error } = await query;
    if (error) {
      console.error("[ACTIVITIES_GET_ERROR]", error.code);
      return apiError("Failed to fetch activity stream", 500, "DB_QUERY_ERROR");
    }

    return apiSuccess(data || [], 200);
  } catch {
    return apiError("Failed to fetch activity stream", 500, "SERVER_ERROR");
  }
}

// POST /api/activities - Log touchpoint & stamp the lead's last activity
// user_id/user_name are taken from the verified session — never from the body.
export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const rateCheck = checkRateLimit(`post_act_${auth.userId}`, 60, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded for logging activity", 429, "RATE_LIMIT_EXCEEDED");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError(
      "Backend database is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      503,
      "SERVICE_UNAVAILABLE"
    );
  }

  try {
    const rawBody = await req.json();
    const validatedData = createActivitySchema.parse(rawBody);

    // Resolve the lead within THIS tenant only; person_name is derived server-side
    let personName = validatedData.personName?.slice(0, 200) || "";
    let leadPhone: string | null = null;

    if (validatedData.leadId) {
      const { data: lead } = await supabase
        .from("leads")
        .select("person_name, phone")
        .eq("org_id", auth.orgId)
        .eq("id", validatedData.leadId)
        .maybeSingle();

      if (!lead) {
        return apiError("Lead not found in your organization", 404, "LEAD_NOT_FOUND");
      }
      personName = lead.person_name;
      leadPhone = lead.phone;
    }

    if (!personName && !validatedData.personId) {
      return apiError("An activity must reference a lead or a known person", 400, "INVALID_REQUEST");
    }

    // Insert immutable activity row
    const { data: activity, error: actError } = await supabase
      .from("activities")
      .insert({
        org_id: auth.orgId,
        lead_id: validatedData.leadId || null,
        project_id: validatedData.projectId || null,
        person_id: validatedData.personId || null,
        user_id: auth.userId,
        user_name: auth.fullName,
        person_name: personName || "Unknown Contact",
        type: validatedData.type,
        outcome: validatedData.outcome || null,
        outcome_label: validatedData.outcomeLabel || null,
        notes: validatedData.notes,
        duration_seconds: validatedData.durationSeconds,
        scheduled_follow_up_at: validatedData.scheduledFollowUpAt || null,
      })
      .select()
      .single();

    if (actError) {
      console.error("[ACTIVITY_LOG_ERROR]", actError.code);
      return apiError("Failed to log activity", 500, "ACTIVITY_LOG_ERROR");
    }

    // Update lead's last_activity_at timestamp (scoped to tenant + ownership)
    if (validatedData.leadId) {
      await supabase
        .from("leads")
        .update({ last_activity_at: new Date().toISOString() })
        .eq("org_id", auth.orgId)
        .eq("id", validatedData.leadId);
    }

    return apiSuccess(activity, 201);
  } catch (err: unknown) {
    return handleValidationError(err);
  }
}
