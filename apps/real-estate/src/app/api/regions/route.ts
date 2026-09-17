import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
  handleValidationError,
  checkRateLimit,
} from "@repo/core/lib/server/api-security";
import { createRegionSchema } from "@repo/core/lib/server/validations";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
  MANAGER_ROLES,
} from "@repo/core/lib/server/supabase-server";

// GET /api/regions - List regions with active leads count
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
    const { data: regions, error } = await supabase
      .from("regions")
      .select(`
        *,
        leads:leads (id, stage)
      `)
      .eq("org_id", auth.orgId)
      .order("name", { ascending: true });

    if (error) {
      return apiError("Failed to fetch regions", 500, "DB_QUERY_ERROR");
    }

    const formatted = (regions || []).map((r: any) => ({
      id: r.id,
      orgId: r.org_id,
      name: r.name,
      code: r.code,
      activeLeadsCount: (r.leads || []).filter((l: any) => l.stage !== "won" && l.stage !== "lost").length,
      createdAt: r.created_at,
    }));

    return apiSuccess(formatted, 200);
  } catch {
    return apiError("Failed to fetch regions", 500, "SERVER_ERROR");
  }
}

// POST /api/regions - Create region (Manager only)
export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Only managers and admins can create regional hubs", 403, "FORBIDDEN");
  }

  const rateCheck = checkRateLimit(`post_reg_${auth.userId}`, 20, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded", 429, "RATE_LIMIT_EXCEEDED");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const rawBody = await req.json();
    const validated = createRegionSchema.parse(rawBody);

    const { data: created, error } = await supabase
      .from("regions")
      .insert({
        org_id: auth.orgId,
        name: validated.name,
        code: validated.code.toUpperCase(),
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return apiError("A region with this code already exists in your organization", 409, "DUPLICATE_CODE");
      }
      return apiError("Failed to create region", 500, "DB_INSERT_ERROR");
    }

    return apiSuccess(created, 201);
  } catch (err) {
    return handleValidationError(err);
  }
}
