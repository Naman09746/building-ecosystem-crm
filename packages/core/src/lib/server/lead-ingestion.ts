import { getServiceRoleClient, isLiveSupabaseAvailable } from "./supabase-server";
import { normalizePhone } from "../utils";
import { createNotification } from "./notifications";

export interface InboundLeadParams {
  orgId: string;
  source: string;
  personName: string;
  phone: string;
  email?: string | null;
  city?: string | null;
  budget?: number | string | null;
  configuration?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  regionId?: string | null;
  externalLeadId?: string | null;
  campaignId?: string | null;
  campaignName?: string | null;
  adsetId?: string | null;
  adsetName?: string | null;
  adId?: string | null;
  adName?: string | null;
  formId?: string | null;
  formName?: string | null;
  rawPayload?: any;
  customNotes?: string | null;
}

export interface IngestionResult {
  success: boolean;
  leadId?: string;
  personId?: string;
  salespersonId?: string;
  salespersonName?: string;
  isNewLead: boolean;
  duplicateType?: "existing_active_lead" | "previously_lost_lead" | "existing_customer_new_requirement" | "new_prospect";
  reason?: string;
  error?: string;
}

/**
 * Normalizes configuration strings (e.g. "3bhk", "3 BHK", "3 Bedroom" -> "3 BHK")
 */
export function normalizeConfiguration(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const bhkMatch = trimmed.match(/(\d+)\s*(?:bhk|bedroom|bed|b)/i);
  if (bhkMatch) {
    const num = bhkMatch[1];
    if (trimmed.toLowerCase().includes("servant")) {
      return `${num} BHK + Servant`;
    }
    if (trimmed.toLowerCase().includes("study")) {
      return `${num} BHK + Study`;
    }
    return `${num} BHK`;
  }
  if (/villa/i.test(trimmed)) return "Luxury Villa";
  if (/penthouse/i.test(trimmed)) return "Sky Penthouse";
  if (/plot|land/i.test(trimmed)) return "Residential Plot";
  return trimmed;
}

/**
 * Parses numeric budget in INR from numbers, Crores, Lakhs, or strings
 */
export function normalizeBudget(raw?: number | string | null): number {
  if (typeof raw === "number" && !isNaN(raw) && raw > 0) {
    return Math.min(raw, 10_000_000_000);
  }
  if (!raw) return 0;

  const str = String(raw).trim().toLowerCase().replace(/,/g, "");
  
  // Check for Crores (e.g. "3.5 cr", "3.5 crore", "3.5crores")
  const crMatch = str.match(/([\d.]+)\s*(?:cr|crore|crores)/);
  if (crMatch) {
    const val = parseFloat(crMatch[1]);
    if (!isNaN(val)) return Math.min(val * 10_000_000, 10_000_000_000);
  }

  // Check for Lakhs (e.g. "85 l", "85 lakh", "85 lakhs")
  const lakhMatch = str.match(/([\d.]+)\s*(?:l|lakh|lakhs|lac|lacs)/);
  if (lakhMatch) {
    const val = parseFloat(lakhMatch[1]);
    if (!isNaN(val)) return Math.min(val * 100_000, 10_000_000_000);
  }

  // Extract raw digits
  const numMatch = str.replace(/[^\d.]/g, "");
  const parsed = parseFloat(numMatch);
  if (!isNaN(parsed) && parsed > 0) {
    // If user entered e.g. "3.5", interpret as 3.5 Cr if <= 100
    if (parsed <= 100) return parsed * 10_000_000;
    return Math.min(parsed, 10_000_000_000);
  }

  return 0;
}

/**
 * Centralized, transactional lead ingestion pipeline for Meta Lead Ads, WhatsApp, and Portals.
 */
export async function ingestInboundLead(params: InboundLeadParams): Promise<IngestionResult> {
  const supabase = getServiceRoleClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return {
      success: false,
      isNewLead: false,
      error: "Backend database unavailable",
    };
  }

  const {
    orgId,
    source,
    personName,
    phone,
    email,
    city,
    budget: rawBudget,
    configuration: rawConfig,
    projectId: rawProjectId,
    projectName: rawProjectName,
    regionId: rawRegionId,
    externalLeadId,
    campaignId,
    campaignName,
    adsetId,
    adsetName,
    adId,
    adName,
    formId,
    formName,
    rawPayload,
    customNotes,
  } = params;

  // 1. Normalization
  const cleanName = personName.trim() || "Inbound Prospect";
  const normalizedPhone = normalizePhone(phone);
  const cleanEmail = email ? email.trim().toLowerCase() : null;
  const budget = normalizeBudget(rawBudget);
  const configuration = normalizeConfiguration(rawConfig);

  try {
    // 2. Person Deduplication
    let personId: string | null = null;
    const { data: existingPerson } = await supabase
      .from("people")
      .select("id, name, phone, email, budget, preferred_configuration")
      .eq("org_id", orgId)
      .eq("phone_normalized", normalizedPhone)
      .maybeSingle();

    if (existingPerson) {
      personId = existingPerson.id;
      // Safely update empty fields without overwriting existing data
      const updates: any = {};
      if (!existingPerson.email && cleanEmail) updates.email = cleanEmail;
      if (!existingPerson.budget && budget > 0) updates.budget = budget;
      if (!existingPerson.preferred_configuration && configuration) updates.preferred_configuration = configuration;
      if (Object.keys(updates).length > 0) {
        await supabase.from("people").update(updates).eq("id", personId).eq("org_id", orgId);
      }
    } else {
      const { data: newPerson, error: personErr } = await supabase
        .from("people")
        .insert({
          org_id: orgId,
          name: cleanName,
          phone: phone.trim(),
          phone_normalized: normalizedPhone,
          email: cleanEmail,
          city: city?.trim() || null,
          source,
          budget: budget > 0 ? budget : null,
          preferred_configuration: configuration,
        })
        .select("id")
        .single();

      if (personErr) {
        console.error("[INGEST_PERSON_ERROR]", personErr.message);
        // If unique conflict on normalized phone occurred concurrently, re-fetch
        const { data: fallbackPerson } = await supabase
          .from("people")
          .select("id")
          .eq("org_id", orgId)
          .eq("phone_normalized", normalizedPhone)
          .maybeSingle();
        personId = fallbackPerson?.id || null;
      } else {
        personId = newPerson.id;
      }
    }

    if (!personId) {
      return { success: false, isNewLead: false, error: "Failed to resolve person record" };
    }

    // 3. Existing Lead Detection
    const { data: existingLeads } = await supabase
      .from("leads")
      .select("id, stage, salesperson_id, budget, project_name, project_id, region_id, profiles(name)")
      .eq("org_id", orgId)
      .or(`person_id.eq.${personId},phone_normalized.eq.${normalizedPhone}`)
      .order("created_at", { ascending: false });

    const activeLead = existingLeads?.find((l) => !["won", "lost"].includes(l.stage));
    const lostLead = existingLeads?.find((l) => l.stage === "lost");

    // 3A. Active Lead Exists: DO NOT duplicate. Append activity and notify rep.
    if (activeLead) {
      const repName = (activeLead.profiles as any)?.name || "Assigned Salesperson";

      // Append touchpoint activity
      await supabase.from("activities").insert({
        org_id: orgId,
        lead_id: activeLead.id,
        person_id: personId,
        user_id: activeLead.salesperson_id || orgId,
        user_name: "Aria Ingestion Bot",
        person_name: cleanName,
        type: source.toLowerCase().includes("whatsapp") ? "whatsapp" : "call",
        title: `Inbound Touchpoint via ${source}`,
        notes: `Inquiry received from ${source}${rawProjectName ? ` for ${rawProjectName}` : ""}. Budget: ₹${(budget / 10000000).toFixed(2)} Cr. ${customNotes || ""}`.trim(),
        occurred_at: new Date().toISOString(),
      });

      // Update last activity on lead
      await supabase
        .from("leads")
        .update({
          last_activity_text: `New inbound inquiry via ${source}`,
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", activeLead.id)
        .eq("org_id", orgId);

      // Notify rep
      if (activeLead.salesperson_id) {
        await createNotification({
          orgId,
          userId: activeLead.salesperson_id,
          title: `Inbound Activity on Active Lead: ${cleanName}`,
          message: `Prospect sent an inquiry via ${source}. Stage: ${activeLead.stage}.`,
          type: "lead_assigned",
          priority: "urgent",
          entityType: "lead",
          entityId: activeLead.id,
          link: `/leads?id=${activeLead.id}`,
          dedupKey: `inbound_${activeLead.id}_${Date.now()}`,
        });
      }

      return {
        success: true,
        leadId: activeLead.id,
        personId,
        salespersonId: activeLead.salesperson_id,
        salespersonName: repName,
        isNewLead: false,
        duplicateType: "existing_active_lead",
      };
    }

    // 4. Resolve Project & Region
    let finalProjectId = rawProjectId || null;
    let finalProjectName = rawProjectName || null;
    let finalRegionId = rawRegionId || null;
    let finalRegionName: string | null = null;

    if (!finalProjectId && formId) {
      // Check webhook_sources config for form -> project mapping
      const { data: sourceConfig } = await supabase
        .from("webhook_sources")
        .select("project_id, projects(id, name, region_id, regions(name))")
        .eq("org_id", orgId)
        .eq("external_id", formId)
        .maybeSingle();

      if (sourceConfig?.project_id) {
        finalProjectId = sourceConfig.project_id;
        finalProjectName = (sourceConfig.projects as any)?.name || null;
        finalRegionId = (sourceConfig.projects as any)?.region_id || null;
        finalRegionName = ((sourceConfig.projects as any)?.regions as any)?.name || null;
      }
    }

    if (!finalProjectId && rawProjectName) {
      const { data: matchedProj } = await supabase
        .from("projects")
        .select("id, name, region_id, regions(name)")
        .eq("org_id", orgId)
        .ilike("name", `%${rawProjectName.trim()}%`)
        .maybeSingle();

      if (matchedProj) {
        finalProjectId = matchedProj.id;
        finalProjectName = matchedProj.name;
        finalRegionId = matchedProj.region_id;
        finalRegionName = (matchedProj.regions as any)?.name || null;
      }
    }

    // 5. Atomic Salesperson Assignment (Round-Robin with PostgreSQL Row Lock)
    let assignedRepId: string | null = null;
    let assignedRepName = "Senior Property Advisor";

    try {
      const { data: assignResult, error: assignErr } = await supabase.rpc("assign_next_salesperson", {
        p_org_id: orgId,
        p_region_id: finalRegionId,
      });

      if (!assignErr && assignResult && assignResult.length > 0) {
        assignedRepId = assignResult[0].salesperson_id;
        assignedRepName = assignResult[0].salesperson_name;
      }
    } catch {
      // fallback handled below
    }

    // Fallback if RPC failed or returned empty
    if (!assignedRepId) {
      const { data: fallbackReps } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("org_id", orgId)
        .limit(1);

      if (fallbackReps && fallbackReps.length > 0) {
        assignedRepId = fallbackReps[0].user_id;
        assignedRepName = fallbackReps[0].full_name;
      }
    }

    // 6. Handle Reactivation vs Fresh Lead Creation
    let leadId: string;
    let isReactivation = false;

    if (lostLead) {
      // Reactivate lost lead
      isReactivation = true;
      leadId = lostLead.id;

      const { error: updateErr } = await supabase
        .from("leads")
        .update({
          stage: "qualified",
          budget: budget > 0 ? budget : lostLead.budget,
          configuration_preference: configuration || null,
          project_id: finalProjectId || lostLead.project_id,
          project_name: finalProjectName || lostLead.project_name,
          region_id: finalRegionId || lostLead.region_id,
          region_name: finalRegionName || null,
          salesperson_id: assignedRepId || lostLead.salesperson_id,
          source: `Reactivated via ${source}`,
          deal_health: "strong",
          deal_health_reason: `Reactivated by new inbound enquiry from ${source}`,
          last_activity_text: `Reactivated via ${source} inbound enquiry`,
          last_activity_at: new Date().toISOString(),
          lost_at: null,
          lost_reason: null,
          campaign_id: campaignId || null,
          campaign_name: campaignName || null,
          adset_id: adsetId || null,
          adset_name: adsetName || null,
          ad_id: adId || null,
          ad_name: adName || null,
          form_id: formId || null,
          form_name: formName || null,
          external_lead_id: externalLeadId || null,
          raw_inbound_payload: rawPayload || null,
          inbound_timestamp: new Date().toISOString(),
        })
        .eq("id", leadId)
        .eq("org_id", orgId);

      if (updateErr) {
        console.error("[LEAD_REACTIVATION_ERROR]", updateErr.message);
        return { success: false, isNewLead: false, error: updateErr.message };
      }
    } else {
      // Insert fresh lead (enforces trg_leads_quota in PostgreSQL)
      const { data: newLead, error: insertErr } = await supabase
        .from("leads")
        .insert({
          org_id: orgId,
          person_id: personId,
          project_id: finalProjectId,
          project_name: finalProjectName,
          region_id: finalRegionId,
          region_name: finalRegionName,
          salesperson_id: assignedRepId,
          person_name: cleanName,
          phone: phone.trim(),
          phone_normalized: normalizedPhone,
          email: cleanEmail,
          budget: budget > 0 ? budget : 0,
          stage: "new",
          source,
          lead_score: 85,
          lead_score_label: "Hot",
          deal_health: "strong",
          deal_health_reason: `Fresh inbound capture via ${source}`,
          configuration_preference: configuration,
          campaign_id: campaignId || null,
          campaign_name: campaignName || null,
          adset_id: adsetId || null,
          adset_name: adsetName || null,
          ad_id: adId || null,
          ad_name: adName || null,
          form_id: formId || null,
          form_name: formName || null,
          external_lead_id: externalLeadId || null,
          raw_inbound_payload: rawPayload || null,
          last_activity_text: `Lead captured from ${source}`,
          last_activity_at: new Date().toISOString(),
          next_follow_up_at: "Today, Immediate",
          follow_up_status: "due_today",
          buying_signals: [`Direct ${source} submission`, "Verified contact number"],
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error("[LEAD_CREATION_FAILED]", insertErr.message);
        if (insertErr.message.includes("LEAD_QUOTA_EXCEEDED")) {
          return {
            success: false,
            isNewLead: false,
            reason: "LEAD_QUOTA_EXCEEDED",
            error: "Organization has reached plan lead capacity. Upgrade required.",
          };
        }
        return { success: false, isNewLead: false, error: insertErr.message };
      }

      leadId = newLead.id;
    }

    // 7. Create Immediate Follow-Up Task
    if (assignedRepId) {
      await supabase.from("tasks").insert({
        org_id: orgId,
        lead_id: leadId,
        salesperson_id: assignedRepId,
        person_name: cleanName,
        phone: phone.trim(),
        title: `Contact new ${source} lead: ${cleanName}`,
        due_date: new Date().toISOString().split("T")[0],
        due_time: "Immediate (15m SLA)",
        priority: "high",
        status: "pending",
      });
    }

    // 8. Dispatch In-App Notification (Phase 5 System)
    if (assignedRepId) {
      await createNotification({
        orgId,
        userId: assignedRepId,
        title: `New ${source} Lead Assigned: ${cleanName}`,
        message: `${cleanName} submitted an enquiry for ${finalProjectName || "active inventory"}.${budget > 0 ? ` Budget: ₹${(budget / 10000000).toFixed(2)} Cr.` : ""}`,
        type: "lead_assigned",
        priority: "urgent",
        entityType: "lead",
        entityId: leadId,
        link: `/leads?id=${leadId}`,
        dedupKey: `lead_assigned_${leadId}`,
      });
    }

    // 9. Initial Activity & Audit Logging
    await supabase.from("activities").insert({
      org_id: orgId,
      lead_id: leadId,
      person_id: personId,
      user_id: assignedRepId || orgId,
      user_name: "Aria Ingestion Engine",
      person_name: cleanName,
      type: source.toLowerCase().includes("whatsapp") ? "whatsapp" : "ai_agent",
      title: isReactivation ? `Lead Reactivated via ${source}` : `Inbound Lead Ingested via ${source}`,
      notes: `Captured inbound lead with budget ₹${(budget / 10000000).toFixed(2)} Cr and config ${configuration || "Not specified"}. Assigned to ${assignedRepName}.`,
      occurred_at: new Date().toISOString(),
    });

    await supabase.from("audit_log").insert({
      org_id: orgId,
      actor_id: assignedRepId,
      action: isReactivation ? "LEAD_REACTIVATED" : "LEAD_INGESTED",
      entity_type: "leads",
      entity_id: leadId,
      diff: {
        source,
        externalLeadId,
        personName: cleanName,
        assignedSalesperson: assignedRepName,
        campaign: campaignName,
        form: formName,
      },
    });

    return {
      success: true,
      leadId,
      personId,
      salespersonId: assignedRepId || undefined,
      salespersonName: assignedRepName,
      isNewLead: !isReactivation,
      duplicateType: isReactivation ? "previously_lost_lead" : "new_prospect",
    };
  } catch (err: any) {
    console.error("[LEAD_INGESTION_FATAL_ERROR]", err);
    return {
      success: false,
      isNewLead: false,
      error: err.message || "Internal ingestion error",
    };
  }
}
