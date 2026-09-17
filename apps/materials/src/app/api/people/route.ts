import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError, checkRateLimit, handleValidationError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, getAuthenticatedServerClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";
import { normalizePhone } from "@repo/core/lib/utils";

const createPersonSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  primaryPhone: z.string().min(10, "Valid phone number required"),
  secondaryPhone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  secondaryEmail: z.string().email().optional().or(z.literal("")),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  preferredLanguage: z.string().default("en"),
  nationality: z.string().default("Indian"),
  isNri: z.boolean().default(false),
  residentCity: z.string().optional(),
  residentAddress: z.string().optional(),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format").optional().or(z.literal("")),
  aadhaarLast4: z.string().length(4).optional().or(z.literal("")),
  wealthTier: z.enum(["uhni", "hni", "mass_affluent", "retail", "institutional"]).default("hni"),
  primaryProfession: z.string().optional(),
  companyName: z.string().optional(),
  designation: z.string().optional(),
  primaryTags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  isVip: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";
  const wealthTier = searchParams.get("wealthTier");
  const isVip = searchParams.get("isVip");

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiSuccess([]);
  }

  let dbQuery = supabase
    .from("people")
    .select("*, leads:leads(id, project_name, budget, stage, created_at)")
    .eq("org_id", auth.orgId)
    .order("created_at", { ascending: false });

  if (query) {
    dbQuery = dbQuery.or(
      `full_name.ilike.%${query}%,primary_phone.ilike.%${query}%,email.ilike.%${query}%,pan_number.ilike.%${query}%`
    );
  }

  if (wealthTier) {
    dbQuery = dbQuery.eq("wealth_tier", wealthTier);
  }

  if (isVip === "true") {
    dbQuery = dbQuery.eq("is_vip", true);
  }

  const { data, error } = await dbQuery.limit(50);

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
    const validated = createPersonSchema.parse(body);

    const normalizedPhone = normalizePhone(validated.primaryPhone);

    const supabase = await getAuthenticatedServerClient();
    if (!supabase || !isLiveSupabaseAvailable) {
      return apiSuccess({
        id: `mock-person-${Date.now()}`,
        org_id: auth.orgId,
        full_name: validated.fullName,
        primary_phone: normalizedPhone,
        ...validated,
      }, 201);
    }

    // Check for duplicate phone in same organization
    const { data: existing } = await supabase
      .from("people")
      .select("id, full_name, primary_phone")
      .eq("org_id", auth.orgId)
      .eq("primary_phone", normalizedPhone)
      .maybeSingle();

    if (existing) {
      return apiError(
        `Person with phone ${normalizedPhone} already exists (${existing.full_name})`,
        409,
        "DUPLICATE_PERSON",
        { existingId: existing.id }
      );
    }

    const { data, error } = await supabase
      .from("people")
      .insert({
        org_id: auth.orgId,
        full_name: validated.fullName,
        primary_phone: normalizedPhone,
        secondary_phone: validated.secondaryPhone,
        whatsapp_number: validated.whatsappNumber || normalizedPhone,
        email: validated.email || null,
        secondary_email: validated.secondaryEmail || null,
        avatar_url: validated.avatarUrl || null,
        preferred_language: validated.preferredLanguage,
        nationality: validated.nationality,
        is_nri: validated.isNri,
        resident_city: validated.residentCity,
        resident_address: validated.residentAddress,
        pan_number: validated.panNumber ? validated.panNumber.toUpperCase() : null,
        aadhaar_last4: validated.aadhaarLast4 || null,
        wealth_tier: validated.wealthTier,
        primary_profession: validated.primaryProfession,
        company_name: validated.companyName,
        designation: validated.designation,
        primary_tags: validated.primaryTags,
        notes: validated.notes,
        is_vip: validated.isVip,
        created_by: auth.userId,
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
    return apiError(err.message || "Failed to create person", 500, "INTERNAL_ERROR");
  }
}
