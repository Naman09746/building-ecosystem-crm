import { NextRequest } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { apiSuccess, apiError, handleValidationError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, getAuthenticatedServerClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";

const createDispatchSchema = z.object({
  leadId: z.string().uuid(),
  unitId: z.string().uuid(),
  projectId: z.string().uuid(),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime(),
  assignedSalespersonId: z.string().uuid().optional(),
  gateEntryName: z.string().default("Gate 2 (Visitors)"),
  digitalVisitorPassPin: z.string().optional(),
  visitorParkingBay: z.string().optional(),
  towerElevatorAccessCard: z.string().optional(),
  caretakerContactPhone: z.string().optional(),
  buyerReconfirmed: z.boolean().default(false),
  ownerAccessCleared: z.boolean().default(false),
  keysVerified: z.boolean().default(false),
  costSheetPrinted: z.boolean().default(false),
  backupUnitsSelected: z.array(z.string().uuid()).default([]),
  dispatchStatus: z.enum(["scheduled", "confirmed", "en_route", "in_progress", "completed", "rescheduled", "no_show", "cancelled"]).default("scheduled"),
});

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const repId = searchParams.get("repId");

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiSuccess([]);
  }

  let query = supabase
    .from("site_visit_dispatches")
    .select("*, lead:leads(person_name, phone, budget), unit:project_units(unit_number, tower, floor, price), project:projects(name, address), salesperson:profiles(full_name)")
    .eq("org_id", auth.orgId)
    .order("scheduled_start", { ascending: true });

  if (status) query = query.eq("dispatch_status", status);
  if (repId) query = query.eq("assigned_salesperson_id", repId);

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
    const validated = createDispatchSchema.parse(body);

    if (new Date(validated.scheduledEnd) <= new Date(validated.scheduledStart)) {
      return apiError("scheduledEnd must be after scheduledStart", 422, "INVALID_SCHEDULE");
    }
    const gatePin =
      validated.digitalVisitorPassPin ||
      crypto.randomInt(100000, 1000000).toString();

    const supabase = await getAuthenticatedServerClient();
    if (!supabase || !isLiveSupabaseAvailable) {
      return apiSuccess({
        id: `mock-dispatch-${Date.now()}`,
        org_id: auth.orgId,
        digital_visitor_pass_pin: gatePin,
        ...validated,
      }, 201);
    }

    const { data, error } = await supabase
      .from("site_visit_dispatches")
      .insert({
        org_id: auth.orgId,
        lead_id: validated.leadId,
        unit_id: validated.unitId,
        project_id: validated.projectId,
        scheduled_start: validated.scheduledStart,
        scheduled_end: validated.scheduledEnd,
        assigned_salesperson_id: validated.assignedSalespersonId || auth.userId,
        gate_entry_name: validated.gateEntryName,
        digital_visitor_pass_pin: gatePin,
        visitor_parking_bay: validated.visitorParkingBay || "Bay P2-14",
        tower_elevator_access_card: validated.towerElevatorAccessCard || null,
        caretaker_contact_phone: validated.caretakerContactPhone || null,
        buyer_reconfirmed: validated.buyerReconfirmed,
        owner_access_cleared: validated.ownerAccessCleared,
        keys_verified: validated.keysVerified,
        cost_sheet_printed: validated.costSheetPrinted,
        backup_units_selected: validated.backupUnitsSelected,
        dispatch_status: validated.dispatchStatus,
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
    return apiError(err.message || "Failed to create site visit dispatch", 500, "INTERNAL_ERROR");
  }
}
