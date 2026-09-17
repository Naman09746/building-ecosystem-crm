import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
  handleValidationError,
  checkRateLimit,
} from "@repo/core/lib/server/api-security";
import {
  createEntityRelationshipSchema,
  updateEntityRelationshipSchema,
} from "@repo/core/lib/server/validations";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
} from "@repo/core/lib/server/supabase-server";

// GET /api/relationships - Query the temporal entity graph
export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const rateCheck = checkRateLimit(`get_rel_${auth.userId}`, 120, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded", 429, "RATE_LIMIT_EXCEEDED");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const { searchParams } = new URL(req.url);
    const targetType = searchParams.get("targetType");
    const targetId = searchParams.get("targetId");
    const subjectType = searchParams.get("subjectType");
    const subjectId = searchParams.get("subjectId");
    const isCurrent = searchParams.get("isCurrent");
    const limit = Math.min(Number(searchParams.get("limit") || 100), 200);

    let query = supabase
      .from("entity_relationships")
      .select("*")
      .eq("org_id", auth.orgId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (targetType) query = query.eq("target_type", targetType);
    if (targetId) query = query.eq("target_id", targetId);
    if (subjectType) query = query.eq("subject_type", subjectType);
    if (subjectId) query = query.eq("subject_id", subjectId);
    if (isCurrent !== null && isCurrent !== undefined) {
      query = query.eq("is_current", isCurrent === "true");
    }

    const { data: relationships, error } = await query;

    if (error) {
      console.error("[RELATIONSHIPS_GET_ERROR]", error.code);
      return apiError("Failed to fetch relationships", 500, "DB_QUERY_ERROR");
    }

    return apiSuccess(relationships || [], 200);
  } catch (err) {
    console.error("[RELATIONSHIPS_QUERY_EXCEPTION]", err);
    return apiError("Failed to process relationships request", 500, "SERVER_ERROR");
  }
}

// POST /api/relationships - Create a relationship edge
export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const rateCheck = checkRateLimit(`post_rel_${auth.userId}`, 60, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded", 429, "RATE_LIMIT_EXCEEDED");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const body = await req.json();
    const parseResult = createEntityRelationshipSchema.safeParse(body);
    if (!parseResult.success) {
      return handleValidationError(parseResult.error);
    }

    const rel = parseResult.data;

    const { data: created, error } = await supabase
      .from("entity_relationships")
      .insert({
        org_id: auth.orgId,
        subject_type: rel.subjectType,
        subject_id: rel.subjectId,
        subject_name: rel.subjectName || null,
        subject_phone: rel.subjectPhone || null,
        relationship_type: rel.relationshipType,
        target_type: rel.targetType,
        target_id: rel.targetId,
        target_name: rel.targetName || null,
        valid_from: rel.validFrom || new Date().toISOString().split("T")[0],
        valid_until: rel.validUntil || null,
        is_current: rel.isCurrent !== undefined ? rel.isCurrent : true,
        confidence_score: rel.confidenceScore ?? 100,
        verification_status: rel.verificationStatus || "verified",
        provenance_source: rel.provenanceSource || "salesperson_entry",
        commercial_terms: rel.commercialTerms || {},
        notes: rel.notes || null,
        created_by: auth.userId,
      })
      .select()
      .single();

    if (error) {
      console.error("[RELATIONSHIP_INSERT_ERROR]", error.code);
      return apiError(error.message || "Failed to record relationship", 400, "INSERT_FAILED");
    }

    return apiSuccess(created, 201);
  } catch (err) {
    console.error("[RELATIONSHIP_INSERT_EXCEPTION]", err);
    return apiError("Failed to process relationship creation", 500, "SERVER_ERROR");
  }
}

// PATCH /api/relationships - Update relationship
export async function PATCH(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const { searchParams } = new URL(req.url);
  const relationshipId = searchParams.get("id");
  if (!relationshipId) {
    return apiError("Relationship ID is required in query params", 400, "BAD_REQUEST");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const body = await req.json();
    const parseResult = updateEntityRelationshipSchema.safeParse(body);
    if (!parseResult.success) {
      return handleValidationError(parseResult.error);
    }

    const patch = parseResult.data;
    const updatePayload: Record<string, any> = {};

    if (patch.relationshipType !== undefined) updatePayload.relationship_type = patch.relationshipType;
    if (patch.validFrom !== undefined) updatePayload.valid_from = patch.validFrom;
    if (patch.validUntil !== undefined) updatePayload.valid_until = patch.validUntil;
    if (patch.isCurrent !== undefined) updatePayload.is_current = patch.isCurrent;
    if (patch.confidenceScore !== undefined) updatePayload.confidence_score = patch.confidenceScore;
    if (patch.verificationStatus !== undefined) updatePayload.verification_status = patch.verificationStatus;
    if (patch.provenanceSource !== undefined) updatePayload.provenance_source = patch.provenanceSource;
    if (patch.commercialTerms !== undefined) updatePayload.commercial_terms = patch.commercialTerms;
    if (patch.notes !== undefined) updatePayload.notes = patch.notes;

    const { data: updated, error } = await supabase
      .from("entity_relationships")
      .update(updatePayload)
      .eq("id", relationshipId)
      .eq("org_id", auth.orgId)
      .select()
      .single();

    if (error) {
      console.error("[RELATIONSHIP_UPDATE_ERROR]", error.code);
      return apiError("Failed to update relationship", 500, "DB_UPDATE_ERROR");
    }

    return apiSuccess(updated, 200);
  } catch (err) {
    console.error("[RELATIONSHIP_UPDATE_EXCEPTION]", err);
    return apiError("Failed to process relationship update", 500, "SERVER_ERROR");
  }
}

// DELETE /api/relationships - Delete relationship
export async function DELETE(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const { searchParams } = new URL(req.url);
  const relationshipId = searchParams.get("id");
  if (!relationshipId) {
    return apiError("Relationship ID is required in query params", 400, "BAD_REQUEST");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const { error } = await supabase
      .from("entity_relationships")
      .delete()
      .eq("id", relationshipId)
      .eq("org_id", auth.orgId);

    if (error) {
      console.error("[RELATIONSHIP_DELETE_ERROR]", error.code);
      return apiError("Failed to delete relationship", 500, "DB_DELETE_ERROR");
    }

    return apiSuccess({ deleted: true, id: relationshipId }, 200);
  } catch (err) {
    console.error("[RELATIONSHIP_DELETE_EXCEPTION]", err);
    return apiError("Failed to process relationship deletion", 500, "SERVER_ERROR");
  }
}
