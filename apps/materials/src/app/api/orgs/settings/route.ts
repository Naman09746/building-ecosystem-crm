import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
  handleValidationError,
} from "@repo/core/lib/server/api-security";
import { updateOrgSettingsSchema } from "@repo/core/lib/server/validations";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
  MANAGER_ROLES,
} from "@repo/core/lib/server/supabase-server";

// GET /api/orgs/settings - Get organization settings and persistent state
export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const { data: org, error } = await supabase
      .from("orgs")
      .select("id, name, slug, plan, billing_cycle, trial_ends_at, setup_completed_at, team_size, primary_region, max_leads, max_seats, reactivation_days, custom_settings, created_at")
      .eq("id", auth.orgId)
      .single();

    if (error || !org) {
      return apiError("Organization not found", 404, "NOT_FOUND");
    }

    return apiSuccess(org, 200);
  } catch {
    return apiError("Failed to fetch organization settings", 500, "SERVER_ERROR");
  }
}

// PATCH /api/orgs/settings - Update organization settings / onboarding state
export async function PATCH(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Only owners and managers can modify organization settings", 403, "FORBIDDEN");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const rawBody = await req.json();
    const validated = updateOrgSettingsSchema.parse(rawBody);

    const updatePayload: Record<string, any> = {};
    if (validated.name !== undefined) updatePayload.name = validated.name;
    if (validated.reactivationDays !== undefined) updatePayload.reactivation_days = validated.reactivationDays;
    if (validated.teamSize !== undefined) updatePayload.team_size = validated.teamSize;
    if (validated.primaryRegion !== undefined) updatePayload.primary_region = validated.primaryRegion;
    if (validated.setupCompletedAt !== undefined) updatePayload.setup_completed_at = validated.setupCompletedAt;
    
    if (validated.customSettings !== undefined) {
      // Merge with existing custom settings if available
      const { data: currentOrg } = await supabase
        .from("orgs")
        .select("custom_settings")
        .eq("id", auth.orgId)
        .single();

      updatePayload.custom_settings = {
        ...(currentOrg?.custom_settings || {}),
        ...validated.customSettings,
      };
    }

    const { data: updated, error } = await supabase
      .from("orgs")
      .update(updatePayload)
      .eq("id", auth.orgId)
      .select("id, name, slug, plan, billing_cycle, trial_ends_at, setup_completed_at, team_size, primary_region, max_leads, max_seats, reactivation_days, custom_settings, created_at")
      .single();

    if (error || !updated) {
      console.error("[ORG_SETTINGS_UPDATE_ERROR]", error?.code);
      return apiError("Failed to update organization settings", 500, "DB_UPDATE_ERROR");
    }

    return apiSuccess(updated, 200);
  } catch (err) {
    return handleValidationError(err);
  }
}
