import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
  checkRateLimit,
} from "@repo/core/lib/server/api-security";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
  MANAGER_ROLES,
} from "@repo/core/lib/server/supabase-server";

// GET /api/audit-log - Immutable audit trail stream (Manager only)
export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Only managers and admins can inspect audit logs", 403, "FORBIDDEN");
  }

  const rateCheck = checkRateLimit(`audit_${auth.userId}`, 60, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded for audit inspection", 429, "RATE_LIMIT_EXCEEDED");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const { data: logs, error } = await supabase
      .from("audit_log")
      .select(`
        id,
        org_id,
        actor_id,
        action,
        entity_type,
        entity_id,
        diff,
        created_at,
        actor:actor_id (full_name, role)
      `)
      .eq("org_id", auth.orgId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("[AUDIT_LOG_FETCH_ERROR]", error.code);
      return apiError("Failed to fetch audit log", 500, "DB_QUERY_ERROR");
    }

    const formatted = (logs || []).map((l: any) => ({
      id: l.id,
      orgId: l.org_id,
      userId: l.actor_id || "system",
      userName: l.actor?.full_name || "System Automation",
      action: l.action,
      entityType: l.entity_type,
      entityId: l.entity_id,
      details: typeof l.diff === "object" ? JSON.stringify(l.diff) : String(l.diff || ""),
      timestamp: l.created_at,
    }));

    return apiSuccess(formatted, 200);
  } catch {
    return apiError("Failed to process audit log request", 500, "SERVER_ERROR");
  }
}
