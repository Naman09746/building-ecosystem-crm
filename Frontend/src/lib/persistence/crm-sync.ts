"use client";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { mapCanonicalRole } from "@/lib/server/rbac";
import type {
  Activity,
  ActivityType,
  CRMDocument,
  Lead,
  Person,
  PipelineStage,
  Project,
  ProjectTower,
  ProjectUnit,
  PropertyArea,
  ExternalOrganization,
  EntityRelationship,
  PropertyFact,
  UnitPriceHistory,
  Region,
  Task,
  User,
  UserRole,
} from "@/types/crm";

// ============================================================================
// CLIENT-SIDE PERSISTENCE BRIDGE
// Hydrates CRM state from Supabase (RLS-enforced) and mirrors mutations.
// The in-memory context state stays the UI source of truth; every mutation is
// written through optimistically and reconciled on failure via toast + console.
// ============================================================================

export const isSyncEnabled = () => Boolean(getSupabaseClient() && isSupabaseConfigured);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(v: string | null | undefined): boolean {
  return !!v && UUID_RE.test(v);
}

type AnyRow = Record<string, any>;

const num = (v: any): number => (v === null || v === undefined ? 0 : Number(v));
const str = (v: any): string => (v === null || v === undefined ? "" : String(v));

const VALID_ACTIVITY_TYPES: ActivityType[] = [
  "call", "meeting", "site_visit", "whatsapp", "note", "stage_change", "booking",
];

function mapActivityType(t: string): ActivityType {
  return VALID_ACTIVITY_TYPES.includes(t as ActivityType) ? (t as ActivityType) : "note";
}

// ---------------------------------------------------------------- Leads ----

export function mapLeadRow(row: AnyRow): Lead {
  return {
    id: str(row.id),
    orgId: str(row.org_id),
    personId: str(row.person_id ?? ""),
    personName: str(row.person_name),
    phone: str(row.phone),
    phoneNormalized: row.phone_normalized ? str(row.phone_normalized) : undefined,
    email: row.email ? str(row.email) : undefined,
    projectId: str(row.project_id ?? ""),
    projectName: str(row.project_name),
    regionId: str(row.region_id ?? ""),
    regionName: row.region_name ? str(row.region_name) : "",
    salespersonId: str(row.salesperson_id ?? ""),
    salespersonName: row.salesperson?.full_name ? str(row.salesperson.full_name) : "",
    budget: num(row.budget),
    stage: (row.stage ?? "new") as PipelineStage,
    stageId: row.stage_id ? str(row.stage_id) : undefined,
    source: str(row.source ?? "Portal Inbound"),
    dealType: row.deal_type ?? "primary_sale",
    leadScore: num(row.lead_score),
    leadScoreLabel: (row.lead_score_label ?? "Warm") as Lead["leadScoreLabel"],
    dealHealth: (row.deal_health ?? "neutral") as Lead["dealHealth"],
    dealHealthScore: typeof row.deal_health_score === "number" ? row.deal_health_score : 60,
    dealHealthReason: row.deal_health_reason ? str(row.deal_health_reason) : undefined,
    dealHealthFactors: Array.isArray(row.deal_health_factors) ? row.deal_health_factors : [],
    dealHealthRecommendedAction: row.deal_health_recommended_action ? str(row.deal_health_recommended_action) : undefined,
    dealHealthCalculatedAt: row.deal_health_calculated_at ? str(row.deal_health_calculated_at) : undefined,
    recommendedAction: (row.deal_health_recommended_action || row.recommended_action) ? str(row.deal_health_recommended_action || row.recommended_action) : undefined,
    configurationPreference: row.configuration_preference ? str(row.configuration_preference) : undefined,
    preferredFloor: row.preferred_floor ? str(row.preferred_floor) : undefined,
    facingPreference: row.facing_preference ? str(row.facing_preference) : undefined,
    parkingRequirement: row.parking_requirement ? str(row.parking_requirement) : undefined,
    buyerIntent: row.buyer_intent ? str(row.buyer_intent) : undefined,
    decisionMakers: row.decision_makers ? str(row.decision_makers) : undefined,
    buyingSignals: Array.isArray(row.buying_signals) ? row.buying_signals : undefined,
    objections: Array.isArray(row.objections) ? row.objections : undefined,
    lastConversationSummary: row.last_conversation_summary ? str(row.last_conversation_summary) : undefined,
    suggestedNextMove: row.suggested_next_move ? str(row.suggested_next_move) : undefined,
    assignedUnitId: row.assigned_unit_id ? str(row.assigned_unit_id) : undefined,
    assignedUnitNumber: row.assigned_unit_number ? str(row.assigned_unit_number) : undefined,
    unitId: row.unit_id ? str(row.unit_id) : undefined,
    daysInStage: num(row.days_in_stage),
    stageEnteredAt: row.stage_entered_at ? str(row.stage_entered_at) : undefined,
    lastActivityText: str(row.last_activity_text ?? "Lead created"),
    lastActivityAt: str(row.last_activity_at ?? row.created_at ?? new Date().toISOString()),
    nextFollowUpAt: row.next_follow_up_at ? str(row.next_follow_up_at) : undefined,
    followUpStatus: row.follow_up_status ?? "upcoming",
    lostAt: row.lost_at ? str(row.lost_at) : undefined,
    lostReason: row.lost_reason ? str(row.lost_reason) : undefined,
    lastResurrectedAt: row.last_resurrected_at ? str(row.last_resurrected_at) : undefined,
    resurrectionCount: typeof row.resurrection_count === "number" ? row.resurrection_count : 0,
    notes: row.notes ? str(row.notes) : undefined,
    createdAt: str(row.created_at ?? new Date().toISOString()),
  };
}

const LEAD_SELECT = `*, salesperson:salesperson_id (full_name)`;

export async function fetchLeads(): Promise<Lead[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_SELECT)
    .order("last_activity_at", { ascending: false })
    .limit(500);
  if (error) {
    console.error("[SYNC] Failed to load leads:", error.code);
    return null;
  }
  return (data || []).map(mapLeadRow);
}

export function leadToRow(lead: Partial<Lead>): AnyRow {
  const row: AnyRow = {};
  const set = (col: string, val: any) => {
    if (val !== undefined) row[col] = val;
  };
  set("person_name", lead.personName);
  set("phone", lead.phone);
  set("phone_normalized", lead.phoneNormalized);
  set("email", lead.email || null);
  set("project_id", lead.projectId || null);
  set("project_name", lead.projectName);
  set("region_id", lead.regionId || null);
  set("region_name", lead.regionName);
  set("salesperson_id", lead.salespersonId || null);
  set("budget", lead.budget);
  set("stage", lead.stage);
  set("source", lead.source);
  set("deal_type", lead.dealType || "primary_sale");
  set("lead_score", lead.leadScore);
  set("lead_score_label", lead.leadScoreLabel);
  set("deal_health", lead.dealHealth);
  set("deal_health_score", lead.dealHealthScore ?? 60);
  set("deal_health_reason", lead.dealHealthReason || null);
  set("deal_health_factors", lead.dealHealthFactors || []);
  set("deal_health_recommended_action", lead.dealHealthRecommendedAction || lead.recommendedAction || null);
  set("recommended_action", lead.dealHealthRecommendedAction || lead.recommendedAction || null);
  set("configuration_preference", lead.configurationPreference || null);
  set("preferred_floor", lead.preferredFloor || null);
  set("facing_preference", lead.facingPreference || null);
  set("buyer_intent", lead.buyerIntent || null);
  set("decision_makers", lead.decisionMakers || null);
  set("buying_signals", lead.buyingSignals || null);
  set("objections", lead.objections || null);
  set("last_conversation_summary", lead.lastConversationSummary || null);
  set("suggested_next_move", lead.suggestedNextMove || null);
  set("assigned_unit_id", lead.assignedUnitId || null);
  set("assigned_unit_number", lead.assignedUnitNumber || null);
  set("unit_id", lead.unitId || lead.assignedUnitId || null);
  set("days_in_stage", lead.daysInStage);
  set("last_activity_text", lead.lastActivityText);
  set("last_activity_at", lead.lastActivityAt);
  set("next_follow_up_at", lead.nextFollowUpAt || null);
  set("follow_up_status", lead.followUpStatus);
  set("lost_at", lead.lostAt ?? null);
  set("lost_reason", lead.lostReason || null);
  set("last_resurrected_at", lead.lastResurrectedAt || null);
  set("resurrection_count", lead.resurrectionCount);
  return row;
}

export async function updateLeadRemote(leadId: string, patch: Partial<Lead>): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !isUuid(leadId)) return false;
  const { error } = await supabase.from("leads").update(leadToRow(patch)).eq("id", leadId);
  if (error) {
    console.error("[SYNC] Failed to update lead:", error.code);
    return false;
  }
  return true;
}

// ------------------------------------------------------------- Activities ----

export function mapActivityRow(row: AnyRow): Activity {
  return {
    id: str(row.id),
    orgId: str(row.org_id),
    leadId: str(row.lead_id),
    projectId: row.project_id ? str(row.project_id) : undefined,
    unitId: row.unit_id ? str(row.unit_id) : undefined,
    personId: row.person_id ? str(row.person_id) : undefined,
    personName: str(row.person_name),
    userId: str(row.user_id),
    userName: str(row.user_name),
    type: mapActivityType(str(row.type)),
    durationSeconds: num(row.duration_seconds),
    outcome: row.outcome ? (row.outcome as Activity["outcome"]) : undefined,
    outcomeLabel: row.outcome_label ? str(row.outcome_label) : undefined,
    notes: row.notes ? str(row.notes) : undefined,
    scheduledFollowUpAt: row.scheduled_follow_up_at ? str(row.scheduled_follow_up_at) : undefined,
    occurredAt: str(row.occurred_at ?? row.created_at),
    createdAt: str(row.created_at ?? new Date().toISOString()),
  };
}

export async function fetchActivities(): Promise<Activity[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(500);
  if (error) {
    console.error("[SYNC] Failed to load activities:", error.code);
    return null;
  }
  return (data || []).map(mapActivityRow);
}

export function activityToRow(act: Omit<Activity, "id" | "createdAt"> & { id?: string }): AnyRow {
  return {
    lead_id: act.leadId || null,
    project_id: act.projectId || null,
    unit_id: act.unitId || null,
    person_id: act.personId || null,
    user_id: act.userId,
    user_name: act.userName,
    person_name: act.personName,
    type: act.type,
    duration_seconds: act.durationSeconds || 0,
    outcome: act.outcome || null,
    outcome_label: act.outcomeLabel || null,
    notes: act.notes || null,
    scheduled_follow_up_at: act.scheduledFollowUpAt || null,
    occurred_at: act.occurredAt || new Date().toISOString(),
  };
}

export async function insertActivityRemote(activity: Omit<Activity, "id" | "createdAt"> & { id?: string }): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  const org_id = activity.orgId;
  if (!org_id || !isUuid(org_id)) return false;
  if (!isUuid(activity.userId)) return false;
  if (activity.leadId && !isUuid(activity.leadId)) return false;
  const { error } = await supabase.from("activities").insert({ ...activityToRow(activity), org_id });
  if (error) {
    console.error("[SYNC] Failed to log activity:", error.code);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------- Tasks ----

export function mapTaskRow(row: AnyRow, salespersonName?: string): Task {
  return {
    id: str(row.id),
    orgId: str(row.org_id),
    leadId: str(row.lead_id),
    personName: str(row.person_name),
    phone: str(row.phone),
    projectName: row.project_name ? str(row.project_name) : "",
    salespersonId: str(row.salesperson_id),
    salespersonName: salespersonName || "",
    title: str(row.title),
    dueDate: str(row.due_date),
    dueTime: row.due_time ? str(row.due_time) : undefined,
    status: row.status ?? "upcoming",
    priority: row.priority ?? "medium",
    createdFromActivityId: row.created_from_activity_id ? str(row.created_from_activity_id) : undefined,
  };
}

export async function fetchTasks(): Promise<Task[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("tasks")
    .select(`*, salesperson:salesperson_id (full_name)`)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) {
    console.error("[SYNC] Failed to load tasks:", error.code);
    return null;
  }
  return (data || []).map((row: AnyRow) => mapTaskRow(row, row.salesperson?.full_name));
}

export async function insertTaskRemote(task: Omit<Task, "id"> & { id?: string }): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !isUuid(task.orgId)) return false;
  const { error } = await supabase.from("tasks").insert({
    org_id: task.orgId,
    lead_id: task.leadId,
    salesperson_id: task.salespersonId,
    person_name: task.personName,
    phone: task.phone,
    project_name: task.projectName || null,
    title: task.title,
    due_date: task.dueDate,
    due_time: task.dueTime || null,
    status: task.status,
    priority: task.priority,
    created_from_activity_id: task.createdFromActivityId || null,
  });
  if (error) {
    console.error("[SYNC] Failed to create task:", error.code);
    return false;
  }
  return true;
}

export async function completeTaskRemote(taskId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !isUuid(taskId)) return false;
  const { error } = await supabase.from("tasks").update({ status: "completed" }).eq("id", taskId);
  if (error) {
    console.error("[SYNC] Failed to complete task:", error.code);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------- Units ----

export function mapUnitRow(row: AnyRow, projectName?: string): ProjectUnit {
  return {
    id: str(row.id),
    orgId: str(row.org_id),
    projectId: str(row.project_id),
    projectName: projectName || "",
    towerId: row.tower_id ? str(row.tower_id) : undefined,
    tower: str(row.tower),
    unitNumber: str(row.unit_number),
    floor: num(row.floor),
    configuration: str(row.configuration),
    unitType: row.unit_type ?? "apartment",
    sizeSqFt: num(row.super_area_sq_ft),
    superAreaSqFt: row.super_area_sq_ft ? num(row.super_area_sq_ft) : undefined,
    carpetAreaSqFt: row.carpet_area_sq_ft ? num(row.carpet_area_sq_ft) : undefined,
    builtUpAreaSqFt: row.built_up_area_sq_ft ? num(row.built_up_area_sq_ft) : undefined,
    balconiesCount: row.balconies_count !== null && row.balconies_count !== undefined ? num(row.balconies_count) : 1,
    bathroomsCount: row.bathrooms_count !== null && row.bathrooms_count !== undefined ? num(row.bathrooms_count) : 2,
    parkingSlots: row.parking_slots !== null && row.parking_slots !== undefined ? num(row.parking_slots) : 1,
    parkingType: row.parking_type ?? "covered",
    isCornerUnit: Boolean(row.is_corner_unit),
    furnishingStatus: row.furnishing_status ?? "semi_furnished",
    physicalCondition: row.physical_condition ?? "good",
    viewType: row.view_type ? str(row.view_type) : undefined,
    price: num(row.price),
    askingPrice: row.asking_price ? num(row.asking_price) : undefined,
    estimatedMarketPrice: row.estimated_market_price ? num(row.estimated_market_price) : undefined,
    lastTransactedPrice: row.last_transacted_price ? num(row.last_transacted_price) : undefined,
    lastTransactedDate: row.last_transacted_date ? str(row.last_transacted_date) : undefined,
    maintenanceMonthly: row.maintenance_monthly ? num(row.maintenance_monthly) : undefined,
    expectedMonthlyRent: row.expected_monthly_rent ? num(row.expected_monthly_rent) : undefined,
    rentalYieldPct: row.rental_yield_pct ? num(row.rental_yield_pct) : undefined,
    status: row.status ?? "available",
    occupancyStatus: row.occupancy_status ?? "unknown",
    sellerIntent: row.seller_intent ?? "unknown",
    sellerTargetTimeline: row.seller_target_timeline ? str(row.seller_target_timeline) : undefined,
    listingStatus: row.listing_status ?? "unlisted",
    verificationStatus: row.verification_status ?? "unverified",
    lastVerifiedAt: row.last_verified_at ? str(row.last_verified_at) : undefined,
    verifiedByUserId: row.verified_by_user_id ? str(row.verified_by_user_id) : undefined,
    keyLocation: row.key_location ? str(row.key_location) : undefined,
    unitAmenities: Array.isArray(row.unit_amenities) ? row.unit_amenities : undefined,
    notes: row.notes ? str(row.notes) : undefined,
    assignedLeadId: row.assigned_lead_id ? str(row.assigned_lead_id) : undefined,
    assignedBuyerName: row.assigned_buyer_name ? str(row.assigned_buyer_name) : undefined,
    facing: row.facing ? str(row.facing) : undefined,
    createdAt: row.created_at ? str(row.created_at) : undefined,
    updatedAt: row.updated_at ? str(row.updated_at) : undefined,
  };
}

export function unitToRow(unit: Partial<ProjectUnit>): AnyRow {
  const row: AnyRow = {};
  const set = (col: string, val: any) => {
    if (val !== undefined) row[col] = val;
  };
  set("project_id", unit.projectId);
  set("tower_id", unit.towerId || null);
  set("tower", unit.tower);
  set("unit_number", unit.unitNumber);
  set("floor", unit.floor);
  set("configuration", unit.configuration);
  set("unit_type", unit.unitType || "apartment");
  set("super_area_sq_ft", unit.superAreaSqFt || unit.sizeSqFt);
  set("carpet_area_sq_ft", unit.carpetAreaSqFt || null);
  set("built_up_area_sq_ft", unit.builtUpAreaSqFt || null);
  set("balconies_count", unit.balconiesCount);
  set("bathrooms_count", unit.bathroomsCount);
  set("parking_slots", unit.parkingSlots);
  set("parking_type", unit.parkingType);
  set("is_corner_unit", unit.isCornerUnit);
  set("furnishing_status", unit.furnishingStatus);
  set("physical_condition", unit.physicalCondition);
  set("view_type", unit.viewType || null);
  set("price", unit.price);
  set("asking_price", unit.askingPrice || unit.price);
  set("estimated_market_price", unit.estimatedMarketPrice || null);
  set("last_transacted_price", unit.lastTransactedPrice || null);
  set("last_transacted_date", unit.lastTransactedDate || null);
  set("maintenance_monthly", unit.maintenanceMonthly || null);
  set("expected_monthly_rent", unit.expectedMonthlyRent || null);
  set("rental_yield_pct", unit.rentalYieldPct || null);
  set("status", unit.status);
  set("occupancyStatus", unit.occupancyStatus);
  set("seller_intent", unit.sellerIntent);
  set("seller_target_timeline", unit.sellerTargetTimeline || null);
  set("listing_status", unit.listingStatus);
  set("verification_status", unit.verificationStatus);
  set("facing", unit.facing || null);
  set("assigned_lead_id", unit.assignedLeadId || null);
  set("assigned_buyer_name", unit.assignedBuyerName || null);
  set("key_location", unit.keyLocation || null);
  set("unit_amenities", unit.unitAmenities || null);
  set("notes", unit.notes || null);
  return row;
}

export async function fetchUnits(): Promise<ProjectUnit[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("project_units")
    .select(`*, project:project_id (name)`)
    .limit(1000);
  if (error) {
    console.error("[SYNC] Failed to load units:", error.code);
    return null;
  }
  return (data || []).map((row: AnyRow) => mapUnitRow(row, row.project?.name));
}

export async function updateUnitRemote(
  unitId: string,
  patch: Partial<ProjectUnit>
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !isUuid(unitId)) return false;
  const { error } = await supabase.from("project_units").update(unitToRow(patch)).eq("id", unitId);
  if (error) {
    console.error("[SYNC] Failed to update unit:", error.code);
    return false;
  }
  return true;
}

export async function insertUnitRemote(
  unit: Omit<ProjectUnit, "id" | "orgId" | "projectName" | "sizeSqFt">,
  orgId: string
): Promise<ProjectUnit | null> {
  const supabase = getSupabaseClient();
  if (!supabase || !isUuid(orgId)) return null;
  const { data, error } = await supabase
    .from("project_units")
    .insert({
      org_id: orgId,
      ...unitToRow(unit as Partial<ProjectUnit>),
    })
    .select(`*, project:project_id (name)`)
    .single();

  if (error || !data) {
    console.error("[SYNC] Failed to insert unit:", error?.code);
    return null;
  }
  return mapUnitRow(data, data.project?.name);
}

export async function deleteUnitRemote(unitId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  const { error } = await supabase.from("project_units").delete().eq("id", unitId);
  if (error) {
    console.error("[SYNC] Failed to delete unit:", error.code);
    return false;
  }
  return true;
}

// ------------------------------------------------------------- Documents ----

export function mapDocumentRow(row: AnyRow): CRMDocument {
  return {
    id: str(row.id),
    orgId: str(row.org_id),
    projectId: row.project_id ? str(row.project_id) : undefined,
    leadId: row.lead_id ? str(row.lead_id) : undefined,
    title: str(row.title),
    fileUrl: str(row.file_url),
    type: row.type ?? "brochure",
    createdAt: str(row.created_at ?? new Date().toISOString()),
  };
}

export async function fetchDocuments(): Promise<CRMDocument[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("[SYNC] Failed to load documents:", error.code);
    return null;
  }
  return (data || []).map(mapDocumentRow);
}

export async function insertDocumentRemote(
  doc: Pick<CRMDocument, "title" | "fileUrl" | "type"> & { projectId?: string; leadId?: string; orgId?: string }
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  const org_id = doc.orgId;
  if (!org_id || !isUuid(org_id)) return false;
  const { error } = await supabase.from("documents").insert({
    org_id,
    project_id: doc.projectId || null,
    lead_id: doc.leadId || null,
    title: doc.title,
    file_url: doc.fileUrl,
    type: doc.type,
  });
  if (error) {
    console.error("[SYNC] Failed to upload document record:", error.code);
    return false;
  }
  return true;
}

export async function deleteDocumentRemote(docId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !isUuid(docId)) return false;
  const { error } = await supabase.from("documents").delete().eq("id", docId);
  if (error) {
    console.error("[SYNC] Failed to delete document:", error.code);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------- People ----

export function mapPersonRow(row: AnyRow): Person {
  return {
    id: str(row.id),
    orgId: str(row.org_id),
    name: str(row.name),
    phone: str(row.phone),
    phoneNormalized: row.phone_normalized ? str(row.phone_normalized) : undefined,
    email: row.email ? str(row.email) : undefined,
    city: row.city ? str(row.city) : undefined,
    source: row.source ? str(row.source) : undefined,
    occupation: row.occupation ? str(row.occupation) : undefined,
    address: row.address ? str(row.address) : undefined,
    vipTier: row.vip_tier ?? "standard",
    tags: Array.isArray(row.tags) ? row.tags : undefined,
    preferredConfiguration: row.preferred_configuration ? str(row.preferred_configuration) : undefined,
    budget: row.budget !== null && row.budget !== undefined ? num(row.budget) : undefined,
    createdAt: str(row.created_at ?? new Date().toISOString()),
    updatedAt: row.updated_at ? str(row.updated_at) : undefined,
  };
}

export async function fetchPeople(): Promise<Person[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("people")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    console.error("[SYNC] Failed to load people:", error.code);
    return null;
  }
  return (data || []).map(mapPersonRow);
}

// ------------------------------------------------------------- Projects ----

export function mapProjectRow(row: AnyRow, regionName?: string, areaName?: string): Project {
  return {
    id: str(row.id),
    orgId: str(row.org_id),
    name: str(row.name),
    developer: str(row.developer),
    location: str(row.location),
    regionId: str(row.region_id ?? ""),
    regionName: regionName || "",
    areaId: row.area_id ? str(row.area_id) : undefined,
    areaName: areaName || row.area?.name || "",
    societyType: row.society_type ?? "gated_community",
    totalTowers: row.total_towers ? num(row.total_towers) : 1,
    totalUnitsCount: row.total_units_count ? num(row.total_units_count) : 0,
    possessionYear: row.possession_year ? num(row.possession_year) : undefined,
    gatedSecurityType: row.gated_security_type ?? "3_tier",
    reraRegistrationNumber: row.rera_registration_number ? str(row.rera_registration_number) : undefined,
    masterAmenities: Array.isArray(row.master_amenities) ? row.master_amenities : undefined,
    maintenanceContactPhone: row.maintenance_contact_phone ? str(row.maintenance_contact_phone) : undefined,
    societyOfficeAddress: row.society_office_address ? str(row.society_office_address) : undefined,
    priceRange: row.price_range ? str(row.price_range) : "",
    status: (row.status ?? "active") as Project["status"],
    activeLeadsCount: num(row.active_leads_count),
    siteVisitsCount: 0,
  };
}

export function projectToRow(p: Partial<Project>): AnyRow {
  const row: AnyRow = {};
  const set = (col: string, val: any) => {
    if (val !== undefined) row[col] = val;
  };
  set("name", p.name);
  set("developer", p.developer);
  set("location", p.location);
  set("region_id", p.regionId || null);
  set("area_id", p.areaId || null);
  set("society_type", p.societyType || "gated_community");
  set("total_towers", p.totalTowers || 1);
  set("total_units_count", p.totalUnitsCount || 0);
  set("possession_year", p.possessionYear || null);
  set("gated_security_type", p.gatedSecurityType || "3_tier");
  set("rera_registration_number", p.reraRegistrationNumber || null);
  set("master_amenities", p.masterAmenities || null);
  set("maintenance_contact_phone", p.maintenanceContactPhone || null);
  set("society_office_address", p.societyOfficeAddress || null);
  set("price_range", p.priceRange || null);
  set("status", p.status || "active");
  return row;
}

export async function fetchProjects(): Promise<Project[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("projects")
    .select(`*, region:region_id (name), area:area_id (name)`)
    .order("name")
    .limit(200);
  if (error) {
    console.error("[SYNC] Failed to load projects:", error.code);
    return null;
  }
  return (data || []).map((row: AnyRow) => mapProjectRow(row, row.region?.name, row.area?.name));
}

export async function insertProjectRemote(p: Partial<Project>, orgId: string): Promise<Project | null> {
  const supabase = getSupabaseClient();
  if (!supabase || !isUuid(orgId)) return null;
  const { data, error } = await supabase
    .from("projects")
    .insert({
      org_id: orgId,
      ...projectToRow(p),
    })
    .select(`*, region:region_id (name), area:area_id (name)`)
    .single();

  if (error || !data) {
    console.error("[SYNC] Failed to insert project:", error?.code);
    return null;
  }
  return mapProjectRow(data, data.region?.name, data.area?.name);
}

export async function updateProjectRemote(projectId: string, patch: Partial<Project>): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !isUuid(projectId)) return false;
  const { error } = await supabase.from("projects").update(projectToRow(patch)).eq("id", projectId);
  if (error) {
    console.error("[SYNC] Failed to update project:", error.code);
    return false;
  }
  return true;
}

export async function deleteProjectRemote(projectId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !isUuid(projectId)) return false;
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) {
    console.error("[SYNC] Failed to delete project:", error.code);
    return false;
  }
  return true;
}

// ------------------------------------------------------------- Areas ----

export function mapAreaRow(row: AnyRow, regionName?: string): PropertyArea {
  return {
    id: str(row.id),
    orgId: str(row.org_id),
    regionId: row.region_id ? str(row.region_id) : undefined,
    regionName: regionName || row.region?.name || "",
    name: str(row.name),
    slug: str(row.slug),
    city: str(row.city ?? "Gurugram"),
    state: str(row.state ?? "Haryana"),
    pincode: row.pincode ? str(row.pincode) : undefined,
    tier: row.tier ?? "luxury",
    description: row.description ? str(row.description) : undefined,
    createdAt: row.created_at ? str(row.created_at) : undefined,
    updatedAt: row.updated_at ? str(row.updated_at) : undefined,
  };
}

export async function fetchAreas(): Promise<PropertyArea[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("property_areas")
    .select(`*, region:region_id (name)`)
    .order("name");
  if (error) {
    console.error("[SYNC] Failed to load property areas:", error.code);
    return null;
  }
  return (data || []).map((row: AnyRow) => mapAreaRow(row, row.region?.name));
}

// ------------------------------------------------------------- Towers ----

export function mapTowerRow(row: AnyRow, projectName?: string): ProjectTower {
  return {
    id: str(row.id),
    orgId: str(row.org_id),
    projectId: str(row.project_id),
    projectName: projectName || row.project?.name || "",
    name: str(row.name),
    towerCode: row.tower_code ? str(row.tower_code) : undefined,
    totalFloors: num(row.total_floors || 1),
    unitsPerFloor: row.units_per_floor ? num(row.units_per_floor) : 4,
    elevatorsCount: row.elevators_count ? num(row.elevators_count) : 2,
    possessionDate: row.possession_date ? str(row.possession_date) : undefined,
    constructionStatus: row.construction_status ?? "ready",
    facingDirection: row.facing_direction ? str(row.facing_direction) : undefined,
    notes: row.notes ? str(row.notes) : undefined,
    createdAt: row.created_at ? str(row.created_at) : undefined,
    updatedAt: row.updated_at ? str(row.updated_at) : undefined,
  };
}

export async function fetchTowers(): Promise<ProjectTower[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("project_towers")
    .select(`*, project:project_id (name)`)
    .order("name");
  if (error) {
    console.error("[SYNC] Failed to load towers:", error.code);
    return null;
  }
  return (data || []).map((row: AnyRow) => mapTowerRow(row, row.project?.name));
}

// -------------------------------------------------- External Organizations ----

export function mapExternalOrgRow(row: AnyRow): ExternalOrganization {
  return {
    id: str(row.id),
    orgId: str(row.org_id),
    name: str(row.name),
    orgType: row.org_type ?? "developer",
    phone: row.phone ? str(row.phone) : undefined,
    email: row.email ? str(row.email) : undefined,
    website: row.website ? str(row.website) : undefined,
    officeAddress: row.office_address ? str(row.office_address) : undefined,
    city: row.city ? str(row.city) : undefined,
    gstin: row.gstin ? str(row.gstin) : undefined,
    reraId: row.rera_id ? str(row.rera_id) : undefined,
    notes: row.notes ? str(row.notes) : undefined,
    createdAt: row.created_at ? str(row.created_at) : undefined,
    updatedAt: row.updated_at ? str(row.updated_at) : undefined,
  };
}

export async function fetchExternalOrgs(): Promise<ExternalOrganization[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("external_organizations")
    .select("*")
    .order("name");
  if (error) {
    console.error("[SYNC] Failed to load external orgs:", error.code);
    return null;
  }
  return (data || []).map(mapExternalOrgRow);
}

// -------------------------------------------------- Entity Relationships ----

export function mapRelationshipRow(row: AnyRow): EntityRelationship {
  return {
    id: str(row.id),
    orgId: str(row.org_id),
    subjectType: row.subject_type,
    subjectId: str(row.subject_id),
    subjectName: row.subject_name ? str(row.subject_name) : undefined,
    subjectPhone: row.subject_phone ? str(row.subject_phone) : undefined,
    relationshipType: row.relationship_type,
    targetType: row.target_type,
    targetId: str(row.target_id),
    targetName: row.target_name ? str(row.target_name) : undefined,
    validFrom: row.valid_from ? str(row.valid_from) : undefined,
    validUntil: row.valid_until ? str(row.valid_until) : undefined,
    isCurrent: Boolean(row.is_current),
    confidenceScore: num(row.confidence_score ?? 100),
    verificationStatus: row.verification_status ?? "verified",
    provenanceSource: str(row.provenance_source ?? "salesperson_entry"),
    verifiedAt: row.verified_at ? str(row.verified_at) : undefined,
    verifiedBy: row.verified_by ? str(row.verified_by) : undefined,
    commercialTerms: row.commercial_terms || {},
    notes: row.notes ? str(row.notes) : undefined,
    createdBy: row.created_by ? str(row.created_by) : undefined,
    createdAt: str(row.created_at ?? new Date().toISOString()),
    updatedAt: row.updated_at ? str(row.updated_at) : undefined,
  };
}

export async function fetchRelationships(): Promise<EntityRelationship[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("entity_relationships")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) {
    console.error("[SYNC] Failed to load entity relationships:", error.code);
    return null;
  }
  return (data || []).map(mapRelationshipRow);
}

// -------------------------------------------------- Property Facts / Memory ----

export function mapFactRow(row: AnyRow): PropertyFact {
  return {
    id: str(row.id),
    orgId: str(row.org_id),
    entityType: row.entity_type,
    entityId: str(row.entity_id),
    category: row.category,
    title: str(row.title),
    factStatement: str(row.fact_statement),
    verificationTier: row.verification_tier ?? "verified",
    confidencePct: num(row.confidence_pct ?? 100),
    sourceReference: row.source_reference ? str(row.source_reference) : undefined,
    expiresAt: row.expires_at ? str(row.expires_at) : undefined,
    createdBy: row.created_by ? str(row.created_by) : undefined,
    createdByName: row.profile?.full_name ? str(row.profile.full_name) : undefined,
    createdAt: str(row.created_at ?? new Date().toISOString()),
    updatedAt: row.updated_at ? str(row.updated_at) : undefined,
  };
}

export async function fetchPropertyFacts(): Promise<PropertyFact[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("property_facts")
    .select(`*, profile:created_by (full_name)`)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    console.error("[SYNC] Failed to load property facts:", error.code);
    return null;
  }
  return (data || []).map(mapFactRow);
}

// -------------------------------------------------- Regions & Users ----

export function mapRegionRow(row: AnyRow): Region {
  return {
    id: str(row.id),
    orgId: str(row.org_id),
    name: str(row.name),
    code: str(row.code),
  };
}

export async function fetchRegions(): Promise<Region[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("regions").select("*").order("name");
  if (error) {
    console.error("[SYNC] Failed to load regions:", error.code);
    return null;
  }
  return (data || []).map(mapRegionRow);
}

export async function insertRegionRemote(r: { name: string; code: string }, orgId: string): Promise<Region | null> {
  const supabase = getSupabaseClient();
  if (!supabase || !isUuid(orgId)) return null;
  const { data, error } = await supabase
    .from("regions")
    .insert({
      org_id: orgId,
      name: r.name,
      code: r.code.toUpperCase(),
    })
    .select()
    .single();

  if (error || !data) {
    console.error("[SYNC] Failed to insert region:", error?.code);
    return null;
  }
  return mapRegionRow(data);
}

export async function updateRegionRemote(regionId: string, patch: Partial<Region>): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !isUuid(regionId)) return false;
  const updatePayload: Record<string, any> = {};
  if (patch.name !== undefined) updatePayload.name = patch.name;
  if (patch.code !== undefined) updatePayload.code = patch.code.toUpperCase();

  const { error } = await supabase.from("regions").update(updatePayload).eq("id", regionId);
  if (error) {
    console.error("[SYNC] Failed to update region:", error.code);
    return false;
  }
  return true;
}

export async function deleteRegionRemote(regionId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  const { error } = await supabase.from("regions").delete().eq("id", regionId);
  if (error) {
    console.error("[SYNC] Failed to delete region:", error.code);
    return false;
  }
  return true;
}

export function mapDbRoleToClient(dbRole: string | null | undefined): UserRole {
  return mapCanonicalRole(dbRole) as UserRole;
}

function mapProfileRow(row: AnyRow, regionName?: string): User {
  return {
    id: str(row.user_id),
    orgId: str(row.org_id),
    name: str(row.full_name),
    email: "",
    phone: row.phone ? str(row.phone) : "",
    role: mapDbRoleToClient(row.role),
    regionId: row.region_id ? str(row.region_id) : undefined,
    regionName: regionName,
    avatarUrl: row.avatar_url ? str(row.avatar_url) : undefined,
  };
}

export async function fetchUsers(): Promise<User[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select(`*, region:region_id (name)`)
    .order("full_name")
    .limit(100);
  if (error) {
    console.error("[SYNC] Failed to load team:", error.code);
    return null;
  }
  return (data || []).map((row: AnyRow) => mapProfileRow(row, row.region?.name));
}

async function fetchCurrentOrgId(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return data?.org_id ? str(data.org_id) : null;
}

async function seedIfEmpty(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { count, error } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true });

  if (error) return;
  if ((count ?? 0) > 0) return;

  const { error: rpcError } = await supabase.rpc("seed_organization_sample_data");
  if (rpcError) {
    console.error("[SYNC] Sample seeding failed:", rpcError.code);
  }
}

// ------------------------------------------------------------- Full load ----

export interface CrmHydration {
  orgId: string | null;
  leads: Lead[];
  activities: Activity[];
  tasks: Task[];
  units: ProjectUnit[];
  documents: CRMDocument[];
  people: Person[];
  projects: Project[];
  regions: Region[];
  users: User[];
  areas?: PropertyArea[];
  towers?: ProjectTower[];
  externalOrgs?: ExternalOrganization[];
  relationships?: EntityRelationship[];
  propertyFacts?: PropertyFact[];
}

export async function hydrateCrmData(): Promise<CrmHydration | null> {
  if (!isSyncEnabled()) return null;

  // Demo users have no real Supabase session — all data comes from local mocks
  if (typeof document !== "undefined" && document.cookie.includes("callcrm_demo_session=1")) {
    return null;
  }

  try {
    await seedIfEmpty();

    const [
      orgId,
      leads,
      activities,
      tasks,
      units,
      documents,
      people,
      projects,
      regions,
      users,
      areas,
      towers,
      externalOrgs,
      relationships,
      propertyFacts,
    ] = await Promise.all([
      fetchCurrentOrgId(),
      fetchLeads(),
      fetchActivities(),
      fetchTasks(),
      fetchUnits(),
      fetchDocuments(),
      fetchPeople(),
      fetchProjects(),
      fetchRegions(),
      fetchUsers(),
      fetchAreas().catch(() => null),
      fetchTowers().catch(() => null),
      fetchExternalOrgs().catch(() => null),
      fetchRelationships().catch(() => null),
      fetchPropertyFacts().catch(() => null),
    ]);

    if (leads === null || projects === null) return null;
    return {
      orgId,
      leads,
      activities: activities || [],
      tasks: tasks || [],
      units: units || [],
      documents: documents || [],
      people: people || [],
      projects,
      regions: regions || [],
      users: users || [],
      areas: areas || [],
      towers: towers || [],
      externalOrgs: externalOrgs || [],
      relationships: relationships || [],
      propertyFacts: propertyFacts || [],
    };
  } catch (e) {
    console.error("[SYNC] Hydration failed");
    return null;
  }
}
