import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, getServiceRoleClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";

// GET /api/notifications - Retrieve authenticated user's notifications with category filters and pagination
export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const supabase = getServiceRoleClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    // Local / Sample Notifications
    return apiSuccess({
      unreadCount: 2,
      totalCount: 3,
      page: 1,
      totalPages: 1,
      notifications: [
        {
          id: "notif_sim_1",
          orgId: auth.orgId,
          userId: auth.userId,
          title: "SLA Alert: New Lead Needs Outreach",
          message: 'Lead "Vikramaditya Singhania" has not received initial outreach within the 2-hour response SLA.',
          type: "sla_breach",
          priority: "high",
          entityType: "lead",
          entityId: "lead_1",
          link: "/leads",
          read: false,
          createdAt: new Date(Date.now() - 1800000).toISOString(),
        },
        {
          id: "notif_sim_2",
          orgId: auth.orgId,
          userId: auth.userId,
          title: "High-Value Deal At Risk",
          message: 'High-value prospect "Dr. Sunita Kapoor" (₹2.8 Cr) has no logged activity for 6 days.',
          type: "deal_at_risk",
          priority: "urgent",
          entityType: "lead",
          entityId: "lead_2",
          link: "/leads",
          read: false,
          createdAt: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: "notif_sim_3",
          orgId: auth.orgId,
          userId: auth.userId,
          title: "Payment Processed: Growth Plan",
          message: "Your monthly Growth subscription invoice #INV-2026-0001 (₹3,999) has been settled successfully.",
          type: "billing",
          priority: "normal",
          entityType: "billing",
          link: "/billing",
          read: true,
          readAt: new Date(Date.now() - 86400000).toISOString(),
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
    });
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(5, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;
    const unreadOnly = searchParams.get("unread") === "true";
    const category = searchParams.get("category"); // 'leads' | 'tasks' | 'billing' | 'system'
    const type = searchParams.get("type");

    let query = supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("org_id", auth.orgId)
      .eq("user_id", auth.userId);

    if (unreadOnly) {
      query = query.eq("read", false);
    }

    if (type) {
      query = query.eq("type", type);
    } else if (category === "leads") {
      query = query.in("type", ["lead_created", "lead_assigned", "deal_at_risk", "sla_breach", "manager_escalation"]);
    } else if (category === "tasks") {
      query = query.in("type", ["task_assigned", "task_overdue", "follow_up_due", "follow_up_overdue"]);
    } else if (category === "billing") {
      query = query.eq("type", "billing");
    } else if (category === "system") {
      query = query.in("type", ["system", "security", "team_invitation"]);
    }

    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data: notifications, count: totalCount, error } = await query;
    if (error) {
      return apiError("Failed to fetch notifications", 500, "DB_ERROR", error.message);
    }

    const { count: unreadCount } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("org_id", auth.orgId)
      .eq("user_id", auth.userId)
      .eq("read", false);

    const mapped = (notifications || []).map((n) => ({
      id: n.id,
      orgId: n.org_id,
      userId: n.user_id,
      title: n.title,
      message: n.message,
      type: n.type,
      priority: n.priority,
      entityType: n.entity_type,
      entityId: n.entity_id,
      link: n.link,
      read: n.read,
      readAt: n.read_at,
      createdAt: n.created_at,
    }));

    return apiSuccess({
      unreadCount: unreadCount || 0,
      totalCount: totalCount || 0,
      page,
      limit,
      totalPages: Math.ceil((totalCount || 0) / limit) || 1,
      notifications: mapped,
    });
  } catch (err: any) {
    return apiError(err.message || "Failed to retrieve notifications", 500, "SERVER_ERROR");
  }
}
