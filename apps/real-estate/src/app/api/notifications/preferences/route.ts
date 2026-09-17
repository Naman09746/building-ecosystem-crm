import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, getServiceRoleClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";

// GET /api/notifications/preferences - Retrieve user's notification preferences
export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const supabase = getServiceRoleClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiSuccess({
      userId: auth.userId,
      orgId: auth.orgId,
      leadAssignments: true,
      taskReminders: true,
      slaAlerts: true,
      dealHealthAlerts: true,
      billingNotifications: true,
      updatedAt: new Date().toISOString(),
    });
  }

  try {
    const { data: pref, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", auth.userId)
      .eq("org_id", auth.orgId)
      .maybeSingle();

    if (error) {
      return apiError("Failed to fetch preferences", 500, "DB_ERROR", error.message);
    }

    if (!pref) {
      // Default preferences
      return apiSuccess({
        userId: auth.userId,
        orgId: auth.orgId,
        leadAssignments: true,
        taskReminders: true,
        slaAlerts: true,
        dealHealthAlerts: true,
        billingNotifications: true,
        updatedAt: new Date().toISOString(),
      });
    }

    return apiSuccess({
      userId: pref.user_id,
      orgId: pref.org_id,
      leadAssignments: pref.lead_assignments,
      taskReminders: pref.task_reminders,
      slaAlerts: pref.sla_alerts,
      dealHealthAlerts: pref.deal_health_alerts,
      billingNotifications: pref.billing_notifications,
      updatedAt: pref.updated_at,
    });
  } catch (err: any) {
    return apiError(err.message || "Failed to fetch notification preferences", 500, "SERVER_ERROR");
  }
}

// PATCH /api/notifications/preferences - Update user's notification preferences
export async function PATCH(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  try {
    const body = await req.json();
    const supabase = getServiceRoleClient();

    if (!supabase || !isLiveSupabaseAvailable) {
      return apiSuccess({ message: "Preferences updated (Simulated)" }, 200);
    }

    const payload: Record<string, any> = {
      user_id: auth.userId,
      org_id: auth.orgId,
      updated_at: new Date().toISOString(),
    };

    if (typeof body.leadAssignments === "boolean") payload.lead_assignments = body.leadAssignments;
    if (typeof body.taskReminders === "boolean") payload.task_reminders = body.taskReminders;
    if (typeof body.slaAlerts === "boolean") payload.sla_alerts = body.slaAlerts;
    if (typeof body.dealHealthAlerts === "boolean") payload.deal_health_alerts = body.dealHealthAlerts;
    if (typeof body.billingNotifications === "boolean") payload.billing_notifications = body.billingNotifications;

    const { data, error } = await supabase
      .from("notification_preferences")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      return apiError("Failed to update preferences", 500, "DB_ERROR", error.message);
    }

    return apiSuccess({
      message: "Notification preferences updated",
      preferences: {
        userId: data.user_id,
        orgId: data.org_id,
        leadAssignments: data.lead_assignments,
        taskReminders: data.task_reminders,
        slaAlerts: data.sla_alerts,
        dealHealthAlerts: data.deal_health_alerts,
        billingNotifications: data.billing_notifications,
        updatedAt: data.updated_at,
      },
    });
  } catch (err: any) {
    return apiError(err.message || "Failed to save notification preferences", 500, "SERVER_ERROR");
  }
}
