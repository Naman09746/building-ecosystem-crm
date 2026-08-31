import { getServiceRoleClient, isLiveSupabaseAvailable } from "@/lib/server/supabase-server";
import { INITIAL_SITE_VISIT_BRIEFINGS, INITIAL_UNITS, INITIAL_LEADS, INITIAL_PROPERTY_FACTS } from "@/lib/mock-data";
import type { SiteVisitBriefing } from "@/types/crm";

export interface GenerateSiteVisitBriefingInput {
  leadId: string;
  unitId: string;
  activityId?: string;
  orgId: string;
  scheduledAt?: string;
}

export async function synthesizeSiteVisitBriefing(
  input: GenerateSiteVisitBriefingInput
): Promise<{ success: boolean; briefing?: SiteVisitBriefing; error?: string }> {
  const supabase = getServiceRoleClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    const existing = INITIAL_SITE_VISIT_BRIEFINGS.find(
      (b) => b.leadId === input.leadId || b.unitId === input.unitId
    );

    if (existing) {
      return { success: true, briefing: existing };
    }

    const lead = INITIAL_LEADS.find((l) => l.id === input.leadId);
    const unit = INITIAL_UNITS.find((u) => u.id === input.unitId);

    const briefing: SiteVisitBriefing = {
      id: `briefing-${Date.now()}`,
      orgId: input.orgId,
      leadId: input.leadId,
      leadName: lead?.personName || "Valued Buyer",
      leadPhone: lead?.phone || "+91 98100 00000",
      unitId: input.unitId,
      unitTitle: unit ? `${unit.projectName} • ${unit.tower}-${unit.unitNumber}` : "Luxury Residence",
      societyName: unit?.projectName || "Luxury Society",
      activityId: input.activityId,
      scheduledAt: input.scheduledAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      gateAccessProtocol: "Access via Visitor Gate. Pre-register buyer vehicle at kiosk. Collect physical visitor pass from security desk.",
      parkingInstructions: unit?.parkingType ? `Visitor parking permitted in designated ${unit.parkingType} bays.` : "Basement visitor bay B1.",
      ownerExpectationsSummary: unit?.askingPrice ? `Owner asking ₹${(unit.askingPrice / 10000000).toFixed(2)} Cr. Clear title, flexible payment schedule.` : "Clear title, standard terms.",
      buyerPreferencesSummary: lead?.configurationPreference ? `Buyer looking for ${lead.configurationPreference} with high floor & clear orientation.` : "High floor luxury buyer.",
      previousObjections: lead?.objections && lead.objections.length > 0 ? lead.objections : ["Annual maintenance costs", "Car parking slot allotment"],
      talkingPoints: [
        `Prime ${unit?.configuration || "luxury"} layout with superior cross-ventilation`,
        `Unobstructed panoramic balcony view`,
        `Exclusive society amenities and high tier security`,
      ],
      generatedByAi: true,
      createdAt: new Date().toISOString(),
    };

    return { success: true, briefing };
  }

  try {
    const [{ data: lead }, { data: unit }, { data: facts }, { data: rels }] = await Promise.all([
      supabase.from("leads").select("*").eq("org_id", input.orgId).eq("id", input.leadId).maybeSingle(),
      supabase.from("project_units").select("*, project:project_id (name, location, gated_security_type)").eq("org_id", input.orgId).eq("id", input.unitId).maybeSingle(),
      supabase.from("property_facts").select("*").eq("org_id", input.orgId).eq("entity_type", "unit").eq("entity_id", input.unitId),
      supabase.from("entity_relationships").select("*").eq("org_id", input.orgId).eq("target_type", "unit").eq("target_id", input.unitId).eq("is_current", true),
    ]);

    if (!unit) {
      return { success: false, error: "Unit not found" };
    }

    const project: any = Array.isArray((unit as any).project) ? (unit as any).project[0] : (unit as any).project;
    const projectName = project?.name || "Society";

    const gateFact = (facts || []).find((f: any) => f.category === "visitor_access_rules");
    const ownerFact = (facts || []).find((f: any) => f.category === "owner_preferences");
    const price = Number(unit.asking_price || unit.price || 0);

    const ownerRel = (rels || []).find((r: any) => r.relationship_type === "owns");

    const briefing: SiteVisitBriefing = {
      id: `briefing-${Date.now()}`,
      orgId: input.orgId,
      leadId: input.leadId,
      leadName: lead?.person_name || "Prospective Buyer",
      leadPhone: lead?.phone || "",
      unitId: input.unitId,
      unitTitle: `${projectName} • ${unit.tower}-${unit.unit_number} (Floor ${unit.floor})`,
      societyName: projectName,
      activityId: input.activityId,
      scheduledAt: input.scheduledAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      gateAccessProtocol: gateFact?.fact_statement || (unit.key_location ? `Keys at ${unit.key_location}. Register at Visitor Gate.` : "Access via Main Gate. Pre-register visitor vehicle."),
      parkingInstructions: unit.parking_type ? `${unit.parking_slots || 1} slots (${unit.parking_type}). Visitor parking in B1.` : "Designated visitor parking in basement.",
      ownerExpectationsSummary: ownerFact?.fact_statement || (ownerRel?.subject_name ? `Owner ${ownerRel.subject_name} is firm on ₹${(price / 10000000).toFixed(2)} Cr valuation.` : `Asking price ₹${(price / 10000000).toFixed(2)} Cr.`),
      buyerPreferencesSummary: lead?.configuration_preference ? `Prefers ${lead.configuration_preference}, budget ₹${(Number(lead.budget || 0) / 10000000).toFixed(2)} Cr.` : "Standard luxury buyer preferences.",
      previousObjections: (lead?.objections && lead.objections.length > 0) ? lead.objections : ["Pricing flexibility", "Club maintenance fee"],
      talkingPoints: [
        `Prime ${unit.configuration} layout with ${unit.super_area_sq_ft || 0} sq ft super area`,
        unit.facing ? `Orientation: ${unit.facing} facing with ample natural sunlight` : `High floor panoramic view`,
        `Direct elevator access and ${unit.balconies_count || 1} private balconies`,
        `Verified clear title with legal due diligence completed`,
      ],
      generatedByAi: true,
      createdAt: new Date().toISOString(),
    };

    return { success: true, briefing };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
