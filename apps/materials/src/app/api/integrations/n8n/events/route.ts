import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError, handleValidationError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, getAuthenticatedServerClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";

const registerEndpointSchema = z.object({
  name: z.string().default("n8n Webhook Bus"),
  endpointUrl: z.string().url("Valid webhook URL required"),
  secretToken: z.string().min(8, "Secret token must be at least 8 characters"),
  subscribedEvents: z.array(z.string()).default([
    "LeadCreated",
    "LeadAssigned",
    "LeadSLABreached",
    "SiteVisitScheduled",
    "MandateExpiring",
    "NegotiationAgreed",
    "CommissionCreated",
  ]),
});

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "pending";
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiSuccess([]);
  }

  let query = supabase
    .from("crm_domain_events")
    .select("*")
    .eq("org_id", auth.orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status !== "all") {
    query = query.eq("dispatch_status", status);
  }

  const { data, error } = await query;

  if (error) {
    return apiSuccess([]);
  }

  return apiSuccess(data || []);
}

export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  try {
    const body = await req.json();
    const validated = registerEndpointSchema.parse(body);

    const supabase = await getAuthenticatedServerClient();
    if (!supabase || !isLiveSupabaseAvailable) {
      return apiSuccess({
        id: `mock-endpoint-${Date.now()}`,
        org_id: auth.orgId,
        is_active: true,
        ...validated,
      }, 201);
    }

    const { data, error } = await supabase
      .from("integration_endpoints")
      .upsert({
        org_id: auth.orgId,
        name: validated.name,
        provider: "n8n",
        endpoint_url: validated.endpointUrl,
        secret_token: validated.secretToken,
        subscribed_events: validated.subscribedEvents,
        is_active: true,
        consecutive_failures: 0,
        circuit_breaker_tripped: false,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return apiError(error.message, 500, "DB_ERROR");
    }

    return apiSuccess(data, 201);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return handleValidationError(err);
    }
    return apiError(err.message || "Failed to register n8n endpoint", 500, "INTERNAL_ERROR");
  }
}
