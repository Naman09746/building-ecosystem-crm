import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
} from "@repo/core/lib/server/api-security";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
} from "@repo/core/lib/server/supabase-server";

const DEFAULT_STAGES = [
  { slug: "new", name: "New Inbound", sortOrder: 1 },
  { slug: "contacted", name: "Contacted", sortOrder: 2 },
  { slug: "qualified", name: "Qualified Buyer", sortOrder: 3 },
  { slug: "site_visit", name: "Site Visit Scheduled", sortOrder: 4 },
  { slug: "negotiation", name: "Commercial Negotiation", sortOrder: 5 },
  { slug: "won", name: "Booked & Won", sortOrder: 6 },
  { slug: "lost", name: "Lost / Inactive", sortOrder: 7 },
];

// GET /api/pipeline-stages - Dynamic pipeline stages for caller's organization
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
    const { data: stages, error } = await supabase
      .from("pipeline_stages")
      .select("id, org_id, name, slug, sort_order, color")
      .eq("org_id", auth.orgId)
      .order("sort_order", { ascending: true });

    if (error || !stages || stages.length === 0) {
      // Fall back to default stages
      const fallback = DEFAULT_STAGES.map((s, idx) => ({
        id: `stg-${s.slug}`,
        orgId: auth.orgId,
        name: s.name,
        slug: s.slug,
        sortOrder: s.sortOrder,
        color: undefined,
      }));
      return apiSuccess(fallback, 200);
    }

    const formatted = stages.map((s: any) => ({
      id: s.id,
      orgId: s.org_id,
      name: s.name,
      slug: s.slug,
      sortOrder: s.sort_order,
      color: s.color,
    }));

    return apiSuccess(formatted, 200);
  } catch {
    return apiError("Failed to fetch pipeline stages", 500, "SERVER_ERROR");
  }
}
