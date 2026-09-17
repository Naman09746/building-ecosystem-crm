import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, MANAGER_ROLES, getServiceRoleClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";

// GET /api/automation/status - Returns automation health metrics and recent execution history for managers
export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }
  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Only managers and owners can inspect automation health", 403, "FORBIDDEN");
  }

  const supabase = getServiceRoleClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiSuccess({
      lastExecution: new Date(Date.now() - 3600000).toISOString(),
      status: "healthy",
      summary: {
        atRiskDeals: 2,
        overdueTasks: 1,
        slaBreaches: 0,
        unreadNotifications: 3,
      },
      recentLogs: [
        {
          id: "log_sim_1",
          jobName: "sla_health_monitor",
          status: "success",
          leadsEvaluated: 12,
          overdueTasksDetected: 1,
          slaBreachesDetected: 0,
          notificationsCreated: 1,
          durationMs: 45,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
    });
  }

  try {
    // 1. Fetch recent automation logs
    const { data: logs } = await supabase
      .from("automation_logs")
      .select("*")
      .or(`org_id.eq.${auth.orgId},org_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(10);

    // 2. Fetch active metrics & health distribution
    const { count: atRiskCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("org_id", auth.orgId)
      .eq("deal_health", "at_risk");

    const { count: strongCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("org_id", auth.orgId)
      .eq("deal_health", "strong");

    const { count: neutralCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("org_id", auth.orgId)
      .eq("deal_health", "neutral");

    const { count: overdueTaskCount } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("org_id", auth.orgId)
      .eq("status", "overdue");

    const { count: unreadNotifCount } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("org_id", auth.orgId)
      .eq("read", false);

    const lastLog = logs?.[0];

    return apiSuccess({
      lastExecution: lastLog?.created_at || null,
      status: lastLog?.status === "failed" ? "degraded" : "healthy",
      summary: {
        atRiskDeals: atRiskCount || 0,
        strongDeals: strongCount || 0,
        neutralDeals: neutralCount || 0,
        totalActiveDeals: (atRiskCount || 0) + (strongCount || 0) + (neutralCount || 0),
        overdueTasks: overdueTaskCount || 0,
        slaBreaches: lastLog?.sla_breaches_detected || 0,
        unreadNotifications: unreadNotifCount || 0,
      },
      recentLogs: (logs || []).map((l) => ({
        id: l.id,
        jobName: l.job_name,
        status: l.status,
        leadsEvaluated: l.leads_evaluated,
        overdueTasksDetected: l.overdue_tasks_detected,
        slaBreachesDetected: l.sla_breaches_detected,
        notificationsCreated: l.notifications_created,
        durationMs: l.duration_ms,
        createdAt: l.created_at,
      })),
    });
  } catch (err: any) {
    return apiError(err.message || "Failed to fetch automation health", 500, "SERVER_ERROR");
  }
}
