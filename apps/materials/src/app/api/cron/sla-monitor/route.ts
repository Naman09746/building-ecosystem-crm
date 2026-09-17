import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@repo/core/lib/server/api-security";
import { getServiceRoleClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";

// GET /api/cron/sla-monitor - Scheduled background cron endpoint for CRM health & SLA recalculation
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // 1. Platform Authorization Check - strictly fail closed across all environments
  if (!cronSecret) {
    console.error("[CRON_CONFIG_ERROR] CRON_SECRET is not configured on server");
    return apiError("Cron secret is not configured on server", 503, "CRON_CONFIG_REQUIRED");
  }

  const isAuthorized = authHeader === `Bearer ${cronSecret}`;
  if (!isAuthorized) {
    console.warn("[CRON_SECURITY_ALERT] Unauthorized attempt to invoke /api/cron/sla-monitor");
    return apiError("Unauthorized cron invocation", 401, "UNAUTHORIZED_CRON");
  }

  // 2. Reject arbitrary client-supplied organization IDs for public security
  if (req.nextUrl.searchParams.has("org_id") || req.nextUrl.searchParams.has("p_org_id")) {
    return apiError("Arbitrary tenant IDs cannot be supplied to the platform cron endpoint", 400, "INVALID_PARAM");
  }

  const supabase = getServiceRoleClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    // Local / Dev Fallback
    return apiSuccess(
      {
        message: "SLA monitor executed in local simulated mode",
        simulated: true,
        orgsProcessed: 1,
        orgsFailed: 0,
        leadsChecked: 12,
        leadsUpdated: 2,
        followupsMarkedOverdue: 1,
        dealsMarkedAtRisk: 1,
        notificationsCreated: 1,
      },
      200
    );
  }

  try {
    // 3. Fetch active organizations to process with tenant isolation
    const { data: activeOrgs, error: orgsError } = await supabase
      .from("orgs")
      .select("id, name")
      .in("subscription_status", ["active", "trialing", "past_due"]);

    if (orgsError) {
      console.error("[CRON_ORGS_FETCH_ERROR]", orgsError.message);
      return apiError("Failed to fetch active tenants for SLA monitoring", 500, "DB_ERROR", orgsError.message);
    }

    const orgs = activeOrgs || [];
    let totalLeadsChecked = 0;
    let totalLeadsUpdated = 0;
    let totalFollowupsOverdue = 0;
    let totalDealsAtRisk = 0;
    let totalNotificationsCreated = 0;
    let orgsProcessed = 0;
    let orgsFailed = 0;
    const failures: { orgId: string; orgName: string; error: string }[] = [];

    // 4. Process each organization in isolation (Org B failure does NOT block Org C)
    for (const org of orgs) {
      try {
        const { data, error } = await supabase.rpc("recompute_lead_health_and_slas", {
          p_org_id: org.id,
        });

        if (error) {
          console.error(`[CRON_ORG_FAIL] SLA recompute failed for org ${org.name} (${org.id}):`, error.message);
          orgsFailed++;
          failures.push({ orgId: org.id, orgName: org.name, error: error.message });
          continue;
        }

        orgsProcessed++;
        totalLeadsChecked += data?.leads_checked || 0;
        totalLeadsUpdated += data?.leads_updated || 0;
        totalFollowupsOverdue += data?.followups_marked_overdue || 0;
        totalDealsAtRisk += data?.deals_marked_at_risk || 0;
        totalNotificationsCreated += data?.notifications_created || 0;
      } catch (err: any) {
        console.error(`[CRON_ORG_EXCEPTION] Unhandled exception for org ${org.name} (${org.id}):`, err);
        orgsFailed++;
        failures.push({ orgId: org.id, orgName: org.name, error: err.message || "Unknown error" });
      }
    }

    return apiSuccess(
      {
        message: "CRM health and SLA states recomputed across active tenants",
        summary: {
          orgsTotal: orgs.length,
          orgsProcessed,
          orgsFailed,
          leadsChecked: totalLeadsChecked,
          leadsUpdated: totalLeadsUpdated,
          followupsMarkedOverdue: totalFollowupsOverdue,
          dealsMarkedAtRisk: totalDealsAtRisk,
          notificationsCreated: totalNotificationsCreated,
          failures: failures.length > 0 ? failures : undefined,
        },
      },
      200
    );
  } catch (err: any) {
    console.error("[CRON_UNHANDLED_ERROR]", err);
    return apiError(err.message || "Unhandled error during cron execution", 500, "SERVER_ERROR");
  }
}
