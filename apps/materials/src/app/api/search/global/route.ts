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
} from "@repo/core/lib/server/supabase-server";
import type { SearchResultItem } from "@repo/core/types/crm";

// GET /api/search/global - Multi-entity global search across projects, units, leads, people
export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const rateCheck = checkRateLimit(`search_${auth.userId}`, 150, 60000);
  if (!rateCheck.allowed) {
    return apiError("Search rate limit exceeded", 429, "RATE_LIMIT_EXCEEDED");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").trim();
    const limit = Math.min(Number(searchParams.get("limit") || 25), 50);

    if (!query || query.length < 2) {
      return apiSuccess([], 200);
    }

    // Try database RPC first
    const { data: rpcResults, error: rpcError } = await supabase.rpc("search_crm_entities", {
      p_org_id: auth.orgId,
      p_query: query,
      p_limit: limit,
    });

    if (!rpcError && Array.isArray(rpcResults)) {
      const mapped: SearchResultItem[] = rpcResults.map((r: any) => ({
        id: r.id,
        entityType: r.entity_type,
        title: r.title,
        subtitle: r.subtitle || "",
        status: r.status,
        url: r.url,
        score: Number(r.relevance_score || 1.0),
        metadata: r.metadata || {},
      }));
      return apiSuccess(mapped, 200);
    }

    // Fallback: Parallel direct queries across tables
    const pattern = `%${query}%`;
    const [unitsRes, projectsRes, leadsRes, peopleRes] = await Promise.all([
      supabase
        .from("project_units")
        .select(`id, unit_number, tower, configuration, price, status, project:project_id (name)`)
        .eq("org_id", auth.orgId)
        .or(`unit_number.ilike.${pattern},tower.ilike.${pattern},configuration.ilike.${pattern}`)
        .limit(10),
      supabase
        .from("projects")
        .select(`id, name, developer, location, status`)
        .eq("org_id", auth.orgId)
        .or(`name.ilike.${pattern},developer.ilike.${pattern},location.ilike.${pattern}`)
        .limit(10),
      supabase
        .from("leads")
        .select(`id, person_name, phone, stage, project_name, budget`)
        .eq("org_id", auth.orgId)
        .or(`person_name.ilike.${pattern},phone.ilike.${pattern},project_name.ilike.${pattern}`)
        .limit(10),
      supabase
        .from("people")
        .select(`id, name, phone, email, city`)
        .eq("org_id", auth.orgId)
        .or(`name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`)
        .limit(10),
    ]);

    const results: SearchResultItem[] = [];

    (projectsRes.data || []).forEach((p: any) => {
      results.push({
        id: p.id,
        entityType: "project",
        title: p.name,
        subtitle: `${p.developer} • ${p.location}`,
        status: p.status,
        url: `/properties?projectId=${p.id}`,
        score: 1.0,
        metadata: { developer: p.developer, location: p.location },
      });
    });

    (unitsRes.data || []).forEach((u: any) => {
      const projName = (u.project as any)?.name || "Project";
      results.push({
        id: u.id,
        entityType: "unit",
        title: `Unit ${u.tower}-${u.unit_number}`,
        subtitle: `${projName} • ${u.configuration} • ₹${(Number(u.price) / 10000000).toFixed(2)} Cr`,
        status: u.status,
        url: `/properties?unitId=${u.id}`,
        score: 0.95,
        metadata: { projectName: projName, configuration: u.configuration, price: u.price },
      });
    });

    (leadsRes.data || []).forEach((l: any) => {
      results.push({
        id: l.id,
        entityType: "lead",
        title: l.person_name,
        subtitle: `${l.phone} • ${l.project_name || "General"} • ${l.stage.replace("_", " ").toUpperCase()}`,
        status: l.stage,
        url: `/?leadId=${l.id}`,
        score: 0.9,
        metadata: { phone: l.phone, stage: l.stage, budget: l.budget },
      });
    });

    (peopleRes.data || []).forEach((per: any) => {
      results.push({
        id: per.id,
        entityType: "person",
        title: per.name,
        subtitle: `${per.phone}${per.city ? ` • ${per.city}` : ""}`,
        url: `/?personPhone=${encodeURIComponent(per.phone)}`,
        score: 0.85,
        metadata: { phone: per.phone, email: per.email },
      });
    });

    return apiSuccess(results.slice(0, limit), 200);
  } catch (err) {
    console.error("[GLOBAL_SEARCH_EXCEPTION]", err);
    return apiError("Failed to execute search", 500, "SERVER_ERROR");
  }
}
