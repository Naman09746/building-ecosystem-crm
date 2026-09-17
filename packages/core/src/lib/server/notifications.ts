import { getServiceRoleClient, isLiveSupabaseAvailable } from "./supabase-server";
import { NotificationType, NotificationPriority } from "../../types/automation";

export interface CreateNotificationParams {
  orgId: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority?: NotificationPriority;
  entityType?: "lead" | "task" | "project" | "document" | "billing" | "team" | "system";
  entityId?: string;
  link?: string;
  dedupKey?: string;
}

/**
 * Server-side helper to create an in-app notification for a user.
 * Validates user preferences, enforces idempotency, and logs safely.
 */
export async function createNotification(params: CreateNotificationParams): Promise<{ id?: string; skipped?: boolean }> {
  const supabase = getServiceRoleClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return { id: `sim_notif_${Date.now()}` };
  }

  try {
    // 1. Check user notification preferences
    const { data: pref } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", params.userId)
      .maybeSingle();

    if (pref) {
      if (params.type === "lead_assigned" && !pref.lead_assignments) return { skipped: true };
      if ((params.type === "task_assigned" || params.type === "task_overdue" || params.type === "follow_up_due") && !pref.task_reminders) return { skipped: true };
      if (params.type === "sla_breach" && !pref.sla_alerts) return { skipped: true };
      if (params.type === "deal_at_risk" && !pref.deal_health_alerts) return { skipped: true };
      if (params.type === "billing" && !pref.billing_notifications) return { skipped: true };
    }

    // 2. Insert notification with idempotency
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        org_id: params.orgId,
        user_id: params.userId,
        title: params.title,
        message: params.message,
        type: params.type,
        priority: params.priority || "normal",
        entity_type: params.entityType,
        entity_id: params.entityId,
        link: params.link,
        dedup_key: params.dedupKey,
      })
      .select("id")
      .single();

    if (error) {
      // If unique constraint violated on dedup_key, treat as safe idempotent skip
      if (error.code === "23505") {
        return { skipped: true };
      }
      console.error("[NOTIFICATION_CREATE_ERROR]", error.message);
      return { skipped: true };
    }

    return { id: data.id };
  } catch (err: any) {
    console.error("[NOTIFICATION_UNHANDLED_ERROR]", err);
    return { skipped: true };
  }
}
