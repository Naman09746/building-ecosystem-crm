import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
  handleValidationError,
  checkRateLimit,
} from "@/lib/server/api-security";
import { createPropertyFactSchema } from "@/lib/server/validations";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
} from "@/lib/server/supabase-server";

// GET /api/properties/facts - List property memory / sales facts
export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const rateCheck = checkRateLimit(`get_facts_${auth.userId}`, 120, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded", 429, "RATE_LIMIT_EXCEEDED");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const category = searchParams.get("category");
    const verificationTier = searchParams.get("verificationTier");

    let query = supabase
      .from("property_facts")
      .select(`*, profile:created_by (full_name)`)
      .eq("org_id", auth.orgId)
      .order("created_at", { ascending: false });

    if (entityType) query = query.eq("entity_type", entityType);
    if (entityId) query = query.eq("entity_id", entityId);
    if (category) query = query.eq("category", category);
    if (verificationTier) query = query.eq("verification_tier", verificationTier);

    const { data: facts, error } = await query;

    if (error) {
      console.error("[FACTS_GET_ERROR]", error.code);
      return apiError("Failed to fetch property facts", 500, "DB_QUERY_ERROR");
    }

    const formatted = (facts || []).map((f: any) => ({
      id: f.id,
      orgId: f.org_id,
      entityType: f.entity_type,
      entityId: f.entity_id,
      category: f.category,
      title: f.title,
      factStatement: f.fact_statement,
      verificationTier: f.verification_tier,
      confidencePct: f.confidence_pct,
      sourceReference: f.source_reference,
      expiresAt: f.expires_at,
      createdBy: f.created_by,
      createdByName: f.profile?.full_name || "Sales Rep",
      createdAt: f.created_at,
      updatedAt: f.updated_at,
    }));

    return apiSuccess(formatted, 200);
  } catch (err) {
    console.error("[FACTS_QUERY_EXCEPTION]", err);
    return apiError("Failed to process facts request", 500, "SERVER_ERROR");
  }
}

// POST /api/properties/facts - Add a structured property fact
export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const rateCheck = checkRateLimit(`post_fact_${auth.userId}`, 60, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded", 429, "RATE_LIMIT_EXCEEDED");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const body = await req.json();
    const parseResult = createPropertyFactSchema.safeParse(body);
    if (!parseResult.success) {
      return handleValidationError(parseResult.error);
    }

    const f = parseResult.data;

    const { data: created, error } = await supabase
      .from("property_facts")
      .insert({
        org_id: auth.orgId,
        entity_type: f.entityType,
        entity_id: f.entityId,
        category: f.category,
        title: f.title,
        fact_statement: f.factStatement,
        verification_tier: f.verificationTier,
        confidence_pct: f.confidencePct ?? 100,
        source_reference: f.sourceReference || null,
        expires_at: f.expiresAt || null,
        created_by: auth.userId,
      })
      .select(`*, profile:created_by (full_name)`)
      .single();

    if (error) {
      console.error("[FACT_INSERT_ERROR]", error.code);
      return apiError(error.message || "Failed to create fact", 400, "INSERT_FAILED");
    }

    return apiSuccess(created, 201);
  } catch (err) {
    console.error("[FACT_INSERT_EXCEPTION]", err);
    return apiError("Failed to process fact creation", 500, "SERVER_ERROR");
  }
}

// DELETE /api/properties/facts - Delete a fact
export async function DELETE(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const { searchParams } = new URL(req.url);
  const factId = searchParams.get("id");
  if (!factId) {
    return apiError("Fact ID is required in query params", 400, "BAD_REQUEST");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const { error } = await supabase
      .from("property_facts")
      .delete()
      .eq("id", factId)
      .eq("org_id", auth.orgId);

    if (error) {
      console.error("[FACT_DELETE_ERROR]", error.code);
      return apiError("Failed to delete fact", 500, "DB_DELETE_ERROR");
    }

    return apiSuccess({ deleted: true, id: factId }, 200);
  } catch (err) {
    console.error("[FACT_DELETE_EXCEPTION]", err);
    return apiError("Failed to process fact deletion", 500, "SERVER_ERROR");
  }
}
