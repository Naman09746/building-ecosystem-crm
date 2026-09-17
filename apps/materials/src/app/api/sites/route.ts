import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError, handleValidationError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, getAuthenticatedServerClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";

const createSiteSchema = z.object({
  siteName: z.string().min(2),
  address: z.string().optional(),
  gpsLat: z.number().optional().nullable(),
  gpsLng: z.number().optional().nullable(),
  siteType: z.enum(["ihb","builder","infra","government"]).default("ihb"),
  stage: z.enum(["excavation","foundation","structure","finishing","roof"]).default("excavation"),
  estimatedTotalCementMt: z.number().optional().nullable(),
  estimatedTotalBags: z.number().int().optional().nullable(),
  currentBrand: z.enum(["ambuja","ultratech","acc","other"]).optional().nullable(),
  ownerName: z.string().optional(),
  ownerPhone: z.string().optional(),
  contractorName: z.string().optional(),
  contractorPhone: z.string().optional(),
  masonName: z.string().optional(),
  architectName: z.string().optional(),
  responsibleSalespersonId: z.string().uuid().optional().nullable(),
  dealerId: z.string().uuid().optional().nullable(),
  source: z.enum(["scouting","walkin","dealer_tip","other"]).optional(),
  status: z.enum(["active","completed","dormant"]).default("active"),
});

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) return apiError("Authentication required", 401, "UNAUTHORIZED");
  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) return apiSuccess([]);
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const stage = searchParams.get("stage");
  const brand = searchParams.get("brand");
  let query = supabase.from("construction_sites").select("*").eq("org_id", auth.orgId).order("next_visit_at", { ascending: true, nullsFirst: false }).limit(100);
  if (q) query = query.or(`site_name.ilike.%${q}%,address.ilike.%${q}%,contractor_name.ilike.%${q}%,owner_name.ilike.%${q}%`);
  if (stage) query = query.eq("stage", stage);
  if (brand) query = query.eq("current_brand", brand);
  const { data, error } = await query;
  if (error) return apiError(error.message, 500, "DB_ERROR");
  return apiSuccess(data || []);
}

export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) return apiError("Authentication required", 401, "UNAUTHORIZED");
  try {
    const body = await req.json();
    const v = createSiteSchema.parse(body);
    const supabase = await getAuthenticatedServerClient();
    if (!supabase || !isLiveSupabaseAvailable) return apiSuccess({ id: `mock-site-${Date.now()}`, org_id: auth.orgId, ...v }, 201);
    const nextVisit = new Date();
    if (v.stage === "foundation") nextVisit.setDate(nextVisit.getDate() + 7);
    else if (v.stage === "structure") nextVisit.setDate(nextVisit.getDate() + 14);
    else nextVisit.setDate(nextVisit.getDate() + 21);
    const { data, error } = await supabase.from("construction_sites").insert({
      org_id: auth.orgId,
      site_name: v.siteName,
      address: v.address,
      gps_lat: v.gpsLat,
      gps_lng: v.gpsLng,
      site_type: v.siteType,
      stage: v.stage,
      estimated_total_cement_mt: v.estimatedTotalCementMt,
      estimated_total_bags: v.estimatedTotalBags,
      current_brand: v.currentBrand,
      owner_name: v.ownerName,
      owner_phone: v.ownerPhone,
      contractor_name: v.contractorName,
      contractor_phone: v.contractorPhone,
      mason_name: v.masonName,
      architect_name: v.architectName,
      responsible_salesperson_id: v.responsibleSalespersonId || auth.userId,
      dealer_id: v.dealerId,
      source: v.source,
      status: v.status,
      next_visit_at: nextVisit.toISOString(),
    }).select().single();
    if (error) return apiError(error.message, 500, "DB_ERROR");
    return apiSuccess(data, 201);
  } catch (err: any) {
    if (err instanceof z.ZodError) return handleValidationError(err);
    return apiError(err.message || "Failed to create site", 500, "INTERNAL_ERROR");
  }
}
