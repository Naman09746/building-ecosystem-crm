import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
  handleValidationError,
  checkRateLimit,
} from "@repo/core/lib/server/api-security";
import { createLeadSchema, idSchema } from "@repo/core/lib/server/validations";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
  MANAGER_ROLES,
} from "@repo/core/lib/server/supabase-server";

const LIMIT_MIN = 1;
const LIMIT_MAX = 100;

function parsePagination(searchParams: URLSearchParams): { page: number; limit: number } {
  const rawPage = parseInt(searchParams.get("page") || "1", 10);
  const rawLimit = parseInt(searchParams.get("limit") || "50", 10);
  return {
    page: Number.isFinite(rawPage) && rawPage > 0 ? Math.min(rawPage, 10_000) : 1,
    limit: Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, LIMIT_MIN), LIMIT_MAX)
      : 50,
  };
}

// GET /api/leads - Paginated, filtered, tenant-isolated (RLS + explicit org filter)
export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const rateCheck = checkRateLimit(`get_leads_${auth.userId}`, 120, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded for lead queries", 429, "RATE_LIMIT_EXCEEDED");
  }

  const searchParams = req.nextUrl.searchParams;
  const stage = searchParams.get("stage");
  const projectId = searchParams.get("projectId");
  const repId = searchParams.get("repId");
  const { page, limit } = parsePagination(searchParams);

  // Non-managers may only read their own leads (defense in depth alongside RLS)
  const canSeeAll = MANAGER_ROLES.includes(auth.role);
  if (repId && repId !== "all" && !canSeeAll && repId !== auth.userId) {
    return apiError("You do not have permission to view other reps' leads", 403, "FORBIDDEN");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError(
      "Backend database is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      503,
      "SERVICE_UNAVAILABLE"
    );
  }

  try {
    let query = supabase
      .from("leads")
      .select(
        `
        *,
        people:person_id (id, name, phone, phone_normalized, email, city),
        projects:project_id (id, name, location, price_range_label)
      `,
        { count: "exact" }
      )
      .eq("org_id", auth.orgId);

    if (stage && stage !== "all") query = query.eq("stage", stage);
    if (projectId && projectId !== "all") query = query.eq("project_id", projectId);
    if (repId && repId !== "all") query = query.eq("salesperson_id", repId);
    else if (!canSeeAll) query = query.eq("salesperson_id", auth.userId);

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order("lead_score", { ascending: false });

    const { data, error, count } = await query;
    if (error) {
      console.error("[LEADS_GET_ERROR]", error.code);
      return apiError("Failed to fetch leads", 500, "DB_QUERY_ERROR");
    }

    return apiSuccess(data || [], 200, {
      page,
      limit,
      total: count || 0,
    });
  } catch {
    return apiError("Failed to fetch lead opportunities", 500, "SERVER_ERROR");
  }
}

// POST /api/leads - Create lead with strict Zod validation, phone normalization & dedup
// org_id is ALWAYS taken from the verified session — never from the request body.
export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const rateCheck = checkRateLimit(`post_leads_${auth.userId}`, 30, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded for lead creation", 429, "RATE_LIMIT_EXCEEDED");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError(
      "Backend database is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      503,
      "SERVICE_UNAVAILABLE"
    );
  }

  try {
    const rawBody = await req.json();
    const validatedData = createLeadSchema.parse(rawBody);

    // 1. Normalize Phone
    const cleanedDigits = validatedData.phone.replace(/\D/g, "");
    const normalizedPhone =
      cleanedDigits.length === 10 ? `+91${cleanedDigits}` : `+${cleanedDigits}`;

    // 2. Find or create master person record (DEDUP ANCHOR), scoped to tenant
    let { data: existingPerson } = await supabase
      .from("people")
      .select("id")
      .eq("org_id", auth.orgId)
      .eq("phone_normalized", normalizedPhone)
      .maybeSingle();

    let personId = existingPerson?.id;

    if (!personId) {
      const { data: newPerson, error: personError } = await supabase
        .from("people")
        .insert({
          org_id: auth.orgId,
          name: validatedData.personName,
          phone: validatedData.phone,
          phone_normalized: normalizedPhone,
          email: validatedData.email || null,
          source: validatedData.source,
        })
        .select("id")
        .single();

      if (personError) {
        console.error("[PERSON_DEDUP_ERROR]", personError.code);
        return apiError("Failed to create contact record", 500, "PERSON_DEDUP_ERROR");
      }
      personId = newPerson.id;
    }

    // 3. Create Lead — server-controlled tenancy and ownership
    const { data: createdLead, error: leadError } = await supabase
      .from("leads")
      .insert({
        org_id: auth.orgId,
        person_id: personId,
        project_id: validatedData.projectId,
        salesperson_id:
          validatedData.assignedSalespersonId &&
          MANAGER_ROLES.includes(auth.role)
            ? validatedData.assignedSalespersonId
            : auth.userId,
        budget: validatedData.budget,
        stage: validatedData.stage,
        source: validatedData.source,
        configuration_preference: validatedData.configurationPreference || null,
        preferred_floor: validatedData.preferredFloor || null,
        facing_preference: validatedData.facingPreference || null,
        buyer_intent: validatedData.timeline || null,
        lead_score: validatedData.leadScore,
        lead_score_label: validatedData.leadScoreLabel,
        deal_health: validatedData.dealHealth,
        deal_health_reason: validatedData.dealHealthReason || null,
        suggested_next_move: validatedData.suggestedNextMove || null,
        last_activity_text: `Lead created via ${validatedData.source}`,
      })
      .select()
      .single();

    if (leadError) {
      console.error("[LEAD_CREATION_ERROR]", leadError.code);
      return apiError("Failed to create lead", 500, "LEAD_CREATION_ERROR");
    }

    return apiSuccess(createdLead, 201);
  } catch (err: unknown) {
    return handleValidationError(err);
  }
}
