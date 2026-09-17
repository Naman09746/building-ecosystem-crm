import { NextRequest } from "next/server";
import { apiSuccess, apiError, checkRateLimit } from "@repo/core/lib/server/api-security";
import { resurrectScanSchema } from "@repo/core/lib/server/validations";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
  MANAGER_ROLES,
} from "@repo/core/lib/server/supabase-server";
import { checkFeatureAccess, resolvePlan } from "@repo/core/lib/server/subscription";
import {
  findTopResurrectionCandidates,
  scanResurrectionOpportunitiesInMemory,
} from "@repo/core/lib/server/resurrection-engine";
import { INITIAL_LEADS, INITIAL_UNITS, INITIAL_PROJECTS } from "@repo/core/lib/mock-data";

// POST /api/agent/resurrect - Production Multi-Factor Resurrection Scanner
// Manager+ only: scans eligible lost/stale leads against live inventory.
export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError(
      "Resurrection scanning requires a manager or admin role",
      403,
      "FORBIDDEN"
    );
  }

  // Plan feature gate — enforced server-side against the org's REAL plan
  if (!checkFeatureAccess("resurrection", resolvePlan(auth.plan))) {
    return apiError(
      "The Resurrection Engine is not available on your current plan. Please upgrade.",
      402,
      "PLAN_UPGRADE_REQUIRED",
      { feature: "resurrection", plan: auth.plan }
    );
  }

  const rateCheck = checkRateLimit(`agent_resurrect_${auth.userId}`, 30, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded for AI Resurrection scanner", 429, "RATE_LIMIT_EXCEEDED");
  }

  const startTime = Date.now();

  try {
    const rawBody = await req.json().catch(() => ({}));
    const { leadId, daysThreshold, minScore, limit, force } = resurrectScanSchema.parse(rawBody);

    const supabase = await getAuthenticatedServerClient();
    if (!supabase || !isLiveSupabaseAvailable) {
      // Offline / Simulated Fallback
      if (leadId) {
        const lead = INITIAL_LEADS.find((l) => l.id === leadId) || INITIAL_LEADS[0];
        const candidates = findTopResurrectionCandidates(lead, INITIAL_UNITS, INITIAL_PROJECTS, limit, minScore);
        return apiSuccess({
          leadId,
          personName: lead.personName,
          candidates,
          latencyMs: Date.now() - startTime,
        });
      }

      const scanResult = scanResurrectionOpportunitiesInMemory(
        INITIAL_LEADS,
        INITIAL_UNITS,
        INITIAL_PROJECTS,
        daysThreshold,
        minScore,
        force
      );

      return apiSuccess({
        ...scanResult,
        latencyMs: Date.now() - startTime,
      });
    }

    // 1. Single Lead Candidate Retrieval
    if (leadId) {
      const { data: candidates, error: candidateErr } = await supabase.rpc("find_resurrection_candidates", {
        p_org_id: auth.orgId,
        p_lead_id: leadId,
        p_limit: limit,
        p_min_score: minScore,
      });

      if (candidateErr) {
        console.error("[RESURRECT_CANDIDATE_RPC_ERROR]", candidateErr.message);
        return apiError("Failed to find resurrection candidates for lead", 500, "DB_ERROR");
      }

      // Log AI execution telemetry
      try {
        await supabase.from("ai_agent_executions").insert({
          org_id: auth.orgId,
          session_id: `resurrect_single_${Date.now()}`,
          agent_name: "lost_lead_resurrector",
          tool_invoked: "find_resurrection_candidates",
          tool_input: { leadId, limit, minScore },
          tool_output: { candidateCount: Array.isArray(candidates) ? candidates.length : 0 },
          latency_ms: Date.now() - startTime,
          status: "success",
          executed_by_user_id: auth.userId,
        });
      } catch {
        // Non-blocking telemetry
      }

      return apiSuccess({
        leadId,
        candidates: candidates || [],
        latencyMs: Date.now() - startTime,
      });
    }

    // 2. Batch Opportunity Scan
    const { data: scanData, error: scanErr } = await supabase.rpc("scan_resurrection_opportunities", {
      p_org_id: auth.orgId,
      p_days_threshold: daysThreshold,
      p_limit: limit,
      p_min_score: minScore,
      p_force: force,
    });

    if (scanErr) {
      console.error("[RESURRECT_BATCH_RPC_ERROR]", scanErr.message);
      return apiError("Failed to scan resurrection opportunities", 500, "DB_ERROR");
    }

    const result = scanData || { scannedCount: 0, matchedCount: 0, opportunities: [] };

    // Log AI execution telemetry
    try {
      await supabase.from("ai_agent_executions").insert({
        org_id: auth.orgId,
        session_id: `resurrect_batch_${Date.now()}`,
        agent_name: "lost_lead_resurrector",
        tool_invoked: "scan_resurrection_opportunities",
        tool_input: { daysThreshold, limit, minScore, force },
        tool_output: { matchedCount: result.matchedCount },
        latency_ms: Date.now() - startTime,
        status: "success",
        executed_by_user_id: auth.userId,
      });
    } catch {
      // Non-blocking telemetry
    }

    return apiSuccess({
      ...result,
      latencyMs: Date.now() - startTime,
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "issues" in err) {
      return apiError("Invalid scan parameters", 422, "VALIDATION_ERROR", (err as any).issues);
    }
    return apiError("Resurrection scan failed", 500, "AGENT_ERROR");
  }
}
