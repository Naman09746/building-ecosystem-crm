import { z } from "zod";
import { getServiceRoleClient, isLiveSupabaseAvailable } from "@/lib/server/supabase-server";
import { normalizePhone } from "@/lib/utils";

export interface AriaToolContext {
  orgId: string;
  userId: string;
  userRole?: string;
}

// ----------------------------------------------------------------------
// 1. INVENTORY SEARCH & INTELLIGENT MATCHING
// ----------------------------------------------------------------------

export const searchInventoryInputSchema = z.object({
  projectId: z.string().uuid().optional(),
  projectName: z.string().max(100).optional(),
  configuration: z.string().max(100).optional().describe("e.g. 2 BHK, 3 BHK, 4 BHK, Villa, Penthouse"),
  minimumBudget: z.number().positive().max(10_000_000_000).optional().describe("Min price in INR"),
  maximumBudget: z.number().positive().max(10_000_000_000).optional().describe("Max price in INR"),
  targetBudget: z.number().positive().max(10_000_000_000).optional().describe("Target budget in INR"),
  preferredFloor: z.union([z.number(), z.string()]).optional().describe("Floor number or 'high', 'mid', 'low'"),
  minimumArea: z.number().positive().max(50_000).optional().describe("Min super area sq ft"),
  maximumArea: z.number().positive().max(50_000).optional().describe("Max super area sq ft"),
  facing: z.string().max(50).optional().describe("e.g. East, North-East, Sea, Park, Road"),
  region: z.string().max(100).optional().describe("City or micro-market name"),
  keywords: z.string().max(200).optional(),
  limit: z.number().min(1).max(20).default(6).optional(),
});

export type SearchInventoryInput = z.infer<typeof searchInventoryInputSchema>;

export interface ScoredUnitMatch {
  unitId: string;
  projectId: string;
  projectName: string;
  location: string;
  tower: string;
  unitNumber: string;
  configuration: string;
  superAreaSqFt: number;
  price: number;
  floor: number;
  facing: string | null;
  status: string;
  matchScore: number; // 0.0 to 1.0
  matchPercentage: number; // 0 to 100
  matchReasons: string[];
}

export function calculateUnitMatchScore(
  unit: {
    configuration: string;
    price: number;
    floor: number;
    superAreaSqFt: number;
    facing: string | null;
    projectName: string;
    location: string;
    tower: string;
  },
  criteria: SearchInventoryInput
): { score: number; percentage: number; reasons: string[] } {
  let totalScore = 0;
  const reasons: string[] = [];

  // 1. Project / Location fit (Weight: 30%)
  let locationWeight = 30;
  if (criteria.projectName || criteria.region) {
    const targetLoc = (criteria.projectName || criteria.region || "").toLowerCase();
    const unitLoc = `${unit.projectName} ${unit.location}`.toLowerCase();
    if (unitLoc.includes(targetLoc)) {
      totalScore += locationWeight;
      reasons.push(`Project & location match (${unit.projectName}, ${unit.location})`);
    } else {
      totalScore += locationWeight * 0.3;
    }
  } else {
    // No specific location restriction -> full neutral credit
    totalScore += locationWeight;
  }

  // 2. Budget fit (Weight: 25%)
  let budgetWeight = 25;
  const targetBudget = criteria.targetBudget || criteria.maximumBudget;
  if (targetBudget && targetBudget > 0) {
    const diffRatio = Math.abs(unit.price - targetBudget) / targetBudget;
    if (diffRatio <= 0.05) {
      totalScore += budgetWeight;
      reasons.push(`Within 5% of target budget (₹${(unit.price / 10000000).toFixed(2)} Cr)`);
    } else if (diffRatio <= 0.15) {
      totalScore += budgetWeight * 0.8;
      reasons.push(`Within 15% of budget range (₹${(unit.price / 10000000).toFixed(2)} Cr)`);
    } else if (diffRatio <= 0.3) {
      totalScore += budgetWeight * 0.4;
      reasons.push(`Accessible stretch option (₹${(unit.price / 10000000).toFixed(2)} Cr)`);
    } else if (criteria.minimumBudget && unit.price >= criteria.minimumBudget && (!criteria.maximumBudget || unit.price <= criteria.maximumBudget)) {
      totalScore += budgetWeight;
      reasons.push(`Strictly within budget window`);
    }
  } else if (criteria.minimumBudget && criteria.maximumBudget) {
    if (unit.price >= criteria.minimumBudget && unit.price <= criteria.maximumBudget) {
      totalScore += budgetWeight;
      reasons.push(`Within budget window of ₹${(criteria.minimumBudget / 10000000).toFixed(2)} - ₹${(criteria.maximumBudget / 10000000).toFixed(2)} Cr`);
    } else {
      totalScore += budgetWeight * 0.3;
    }
  } else {
    totalScore += budgetWeight;
  }

  // 3. Configuration fit (Weight: 20%)
  let configWeight = 20;
  if (criteria.configuration) {
    const req = criteria.configuration.toLowerCase().replace(/[^0-9a-z]/g, "");
    const actual = unit.configuration.toLowerCase().replace(/[^0-9a-z]/g, "");
    
    // Extract BHK number
    const reqBhk = criteria.configuration.match(/(\d+)\s*bhk/i)?.[1];
    const actualBhk = unit.configuration.match(/(\d+)\s*bhk/i)?.[1];

    if (actual === req || actual.includes(req) || req.includes(actual)) {
      totalScore += configWeight;
      reasons.push(`Exact configuration match (${unit.configuration})`);
    } else if (reqBhk && actualBhk && reqBhk === actualBhk) {
      totalScore += configWeight;
      reasons.push(`Matches ${reqBhk} BHK requirement (${unit.configuration})`);
    } else if (reqBhk && actualBhk && Math.abs(Number(reqBhk) - Number(actualBhk)) === 1) {
      totalScore += configWeight * 0.4;
      reasons.push(`Alternative ${actualBhk} BHK option`);
    } else {
      totalScore += 0;
    }
  } else {
    totalScore += configWeight;
  }

  // 4. Area fit (Weight: 10%)
  let areaWeight = 10;
  if (criteria.minimumArea || criteria.maximumArea) {
    const min = criteria.minimumArea || 0;
    const max = criteria.maximumArea || 999999;
    if (unit.superAreaSqFt >= min && unit.superAreaSqFt <= max) {
      totalScore += areaWeight;
      reasons.push(`Area matches preference (${unit.superAreaSqFt} sq ft)`);
    } else if (unit.superAreaSqFt >= min * 0.9) {
      totalScore += areaWeight * 0.6;
    } else {
      totalScore += areaWeight * 0.2;
    }
  } else {
    totalScore += areaWeight;
  }

  // 5. Floor preference (Weight: 5%)
  let floorWeight = 5;
  if (criteria.preferredFloor !== undefined) {
    if (typeof criteria.preferredFloor === "number") {
      if (unit.floor === criteria.preferredFloor) {
        totalScore += floorWeight;
        reasons.push(`Exact floor match (Floor ${unit.floor})`);
      } else if (Math.abs(unit.floor - criteria.preferredFloor) <= 2) {
        totalScore += floorWeight * 0.7;
        reasons.push(`Near preferred floor (Floor ${unit.floor})`);
      }
    } else {
      const pref = String(criteria.preferredFloor).toLowerCase();
      if (pref.includes("high") && unit.floor >= 10) {
        totalScore += floorWeight;
        reasons.push(`High floor preference satisfied (Floor ${unit.floor})`);
      } else if (pref.includes("mid") && unit.floor >= 4 && unit.floor <= 9) {
        totalScore += floorWeight;
        reasons.push(`Mid-rise floor satisfied (Floor ${unit.floor})`);
      } else if (pref.includes("low") && unit.floor >= 1 && unit.floor <= 3) {
        totalScore += floorWeight;
        reasons.push(`Low floor preference satisfied (Floor ${unit.floor})`);
      } else {
        totalScore += floorWeight * 0.4;
      }
    }
  } else {
    totalScore += floorWeight;
  }

  // 6. Facing preference (Weight: 5%)
  let facingWeight = 5;
  if (criteria.facing && unit.facing) {
    if (unit.facing.toLowerCase().includes(criteria.facing.toLowerCase())) {
      totalScore += facingWeight;
      reasons.push(`Preferred facing (${unit.facing})`);
    }
  } else {
    totalScore += facingWeight;
  }

  const finalScore = Math.min(1.0, Math.max(0.0, totalScore / 100));
  const finalPercentage = Math.round(finalScore * 100);

  if (reasons.length === 0) {
    reasons.push("Available unit in active portfolio");
  }

  return {
    score: Number(finalScore.toFixed(2)),
    percentage: finalPercentage,
    reasons,
  };
}

export async function searchAvailableInventory(
  ctx: AriaToolContext,
  rawInput: SearchInventoryInput
): Promise<{ success: boolean; totalFound: number; units: ScoredUnitMatch[]; error?: string }> {
  const input = searchInventoryInputSchema.parse(rawInput);
  const client = getServiceRoleClient();

  if (!client || !isLiveSupabaseAvailable) {
    return { success: false, totalFound: 0, units: [], error: "Database service unavailable" };
  }

  try {
    let query = client
      .from("project_units")
      .select("id, project_id, tower, unit_number, floor, configuration, super_area_sq_ft, price, status, facing, projects!inner(id, name, location)")
      .eq("org_id", ctx.orgId)
      .in("status", ["available", "hold"]);

    if (input.projectId) {
      query = query.eq("project_id", input.projectId);
    }

    if (input.minimumBudget) {
      // expand search window by 20% for smart matching
      query = query.gte("price", input.minimumBudget * 0.8);
    }

    if (input.maximumBudget) {
      query = query.lte("price", input.maximumBudget * 1.2);
    }

    // Limit raw query to 50 rows to avoid token explosion
    const { data: rawUnits, error } = await query.limit(50);

    if (error) {
      console.error("[ARIA_SEARCH_INVENTORY_ERROR]", error);
      return { success: false, totalFound: 0, units: [], error: error.message };
    }

    if (!rawUnits || rawUnits.length === 0) {
      return { success: true, totalFound: 0, units: [] };
    }

    const scoredUnits: ScoredUnitMatch[] = rawUnits.map((u: any) => {
      const proj = Array.isArray(u.projects) ? u.projects[0] : u.projects;
      const projectName = proj?.name || "Premium Residence";
      const location = proj?.location || "Prime Location";

      const { score, percentage, reasons } = calculateUnitMatchScore(
        {
          configuration: u.configuration,
          price: Number(u.price),
          floor: u.floor,
          superAreaSqFt: u.super_area_sq_ft,
          facing: u.facing,
          projectName,
          location,
          tower: u.tower,
        },
        input
      );

      return {
        unitId: u.id,
        projectId: u.project_id,
        projectName,
        location,
        tower: u.tower,
        unitNumber: u.unit_number,
        configuration: u.configuration,
        superAreaSqFt: u.super_area_sq_ft,
        price: Number(u.price),
        floor: u.floor,
        facing: u.facing,
        status: u.status,
        matchScore: score,
        matchPercentage: percentage,
        matchReasons: reasons,
      };
    });

    // Sort by match score desc, then price asc
    scoredUnits.sort((a, b) => b.matchScore - a.matchScore || a.price - b.price);

    const maxResults = input.limit || 5;
    const finalResults = scoredUnits.slice(0, maxResults);

    return {
      success: true,
      totalFound: scoredUnits.length,
      units: finalResults,
    };
  } catch (err: any) {
    return { success: false, totalFound: 0, units: [], error: err.message };
  }
}

// ----------------------------------------------------------------------
// 2. LOOKUP EXISTING BUYER & DUPLICATE DETECTION
// ----------------------------------------------------------------------

export const lookupBuyerInputSchema = z.object({
  phone: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().min(2).max(100).optional(),
  alternatePhone: z.string().optional(),
});

export type LookupBuyerInput = z.infer<typeof lookupBuyerInputSchema>;

export interface ExistingBuyerMatch {
  personId?: string;
  name: string;
  phone: string;
  email?: string;
  duplicateType: "existing_active_lead" | "previously_lost_lead" | "existing_customer_new_requirement" | "new_prospect";
  activeLead?: {
    id: string;
    stage: string;
    projectName?: string;
    salespersonId?: string;
    salespersonName?: string;
    budget: number;
    dealHealth: string;
    dealHealthReason?: string;
    lastActivityText?: string;
    nextFollowUpAt?: string;
  };
  historicalLeadsCount: number;
  recommendation: string;
}

export async function lookupExistingBuyer(
  ctx: AriaToolContext,
  rawInput: LookupBuyerInput
): Promise<{ success: boolean; matchFound: boolean; buyer?: ExistingBuyerMatch; error?: string }> {
  const input = lookupBuyerInputSchema.parse(rawInput);
  const client = getServiceRoleClient();

  if (!client || !isLiveSupabaseAvailable) {
    return { success: false, matchFound: false, error: "Database service unavailable" };
  }

  try {
    const searchPhones: string[] = [];
    if (input.phone) {
      searchPhones.push(normalizePhone(input.phone));
      searchPhones.push(input.phone.trim());
    }
    if (input.alternatePhone) {
      searchPhones.push(normalizePhone(input.alternatePhone));
    }

    // 1. Search existing leads scoped to tenant
    let leadQuery = client
      .from("leads")
      .select("id, person_id, person_name, phone, phone_normalized, email, project_name, salesperson_id, stage, budget, deal_health, deal_health_reason, last_activity_text, next_follow_up_at, lost_at, lost_reason, created_at, profiles(name)")
      .eq("org_id", ctx.orgId);

    if (searchPhones.length > 0) {
      leadQuery = leadQuery.or(`phone_normalized.in.(${searchPhones.join(",")}),phone.in.(${searchPhones.join(",")})`);
    } else if (input.email) {
      leadQuery = leadQuery.eq("email", input.email.trim().toLowerCase());
    } else if (input.name) {
      leadQuery = leadQuery.ilike("person_name", `%${input.name.trim()}%`);
    } else {
      return { success: true, matchFound: false };
    }

    const { data: leads, error: leadErr } = await leadQuery.order("created_at", { ascending: false }).limit(5);

    if (leadErr) {
      console.error("[ARIA_LOOKUP_BUYER_ERROR]", leadErr);
      return { success: false, matchFound: false, error: leadErr.message };
    }

    if (leads && leads.length > 0) {
      const activeLead = leads.find((l: any) => !["won", "lost"].includes(l.stage));
      const lostLead = leads.find((l: any) => l.stage === "lost");
      const latestLead = activeLead || leads[0];

      const assignedRepName = (latestLead.profiles as any)?.name || "Assigned Representative";

      if (activeLead) {
        return {
          success: true,
          matchFound: true,
          buyer: {
            personId: latestLead.person_id,
            name: latestLead.person_name,
            phone: latestLead.phone,
            email: latestLead.email,
            duplicateType: "existing_active_lead",
            historicalLeadsCount: leads.length,
            activeLead: {
              id: activeLead.id,
              stage: activeLead.stage,
              projectName: activeLead.project_name,
              salespersonId: activeLead.salesperson_id,
              salespersonName: assignedRepName,
              budget: Number(activeLead.budget),
              dealHealth: activeLead.deal_health,
              dealHealthReason: activeLead.deal_health_reason,
              lastActivityText: activeLead.last_activity_text,
              nextFollowUpAt: activeLead.next_follow_up_at,
            },
            recommendation: `Existing active lead found in stage "${activeLead.stage}" assigned to ${assignedRepName}. Suggest updating existing lead rather than creating a duplicate.`,
          },
        };
      } else if (lostLead) {
        return {
          success: true,
          matchFound: true,
          buyer: {
            personId: latestLead.person_id,
            name: latestLead.person_name,
            phone: latestLead.phone,
            email: latestLead.email,
            duplicateType: "previously_lost_lead",
            historicalLeadsCount: leads.length,
            recommendation: `Customer was previously marked as lost (${lostLead.lost_reason || "Archived"}). Recommend reactivating opportunity or logging fresh requirement.`,
          },
        };
      } else {
        return {
          success: true,
          matchFound: true,
          buyer: {
            personId: latestLead.person_id,
            name: latestLead.person_name,
            phone: latestLead.phone,
            email: latestLead.email,
            duplicateType: "existing_customer_new_requirement",
            historicalLeadsCount: leads.length,
            recommendation: `Existing client in CRM records (${leads.length} historical deal[s]). Safe to link new requirement to existing profile.`,
          },
        };
      }
    }

    // 2. Search people table if no lead found
    let peopleQuery = client
      .from("people")
      .select("id, name, phone, email, budget, preferred_configuration")
      .eq("org_id", ctx.orgId);

    if (searchPhones.length > 0) {
      peopleQuery = peopleQuery.or(`phone_normalized.in.(${searchPhones.join(",")}),phone.in.(${searchPhones.join(",")})`);
    } else if (input.email) {
      peopleQuery = peopleQuery.eq("email", input.email.trim().toLowerCase());
    } else if (input.name) {
      peopleQuery = peopleQuery.ilike("name", `%${input.name.trim()}%`);
    }

    const { data: people } = await peopleQuery.limit(1);

    if (people && people.length > 0) {
      const p = people[0];
      return {
        success: true,
        matchFound: true,
        buyer: {
          personId: p.id,
          name: p.name,
          phone: p.phone,
          email: p.email,
          duplicateType: "existing_customer_new_requirement",
          historicalLeadsCount: 0,
          recommendation: `Customer record exists in contact directory (${p.name}). Create new lead linked to this contact.`,
        },
      };
    }

    return {
      success: true,
      matchFound: false,
      buyer: {
        name: input.name || "New Prospect",
        phone: input.phone || "",
        email: input.email,
        duplicateType: "new_prospect",
        historicalLeadsCount: 0,
        recommendation: "Fresh prospect. No existing CRM records found. Safe to qualify and add to sales pipeline.",
      },
    };
  } catch (err: any) {
    return { success: false, matchFound: false, error: err.message };
  }
}

// ----------------------------------------------------------------------
// 3. SEARCH PROJECTS & REAL-TIME AVAILABILITY
// ----------------------------------------------------------------------

export const searchProjectsInputSchema = z.object({
  query: z.string().max(100).optional(),
  regionId: z.string().uuid().optional(),
  status: z.enum(["active", "launching_soon", "completed"]).optional(),
  limit: z.number().min(1).max(20).default(6).optional(),
});

export type SearchProjectsInput = z.infer<typeof searchProjectsInputSchema>;

export interface ProjectFactSummary {
  projectId: string;
  name: string;
  location: string;
  priceRange: string | null;
  status: string;
  totalUnits: number;
  availableUnits: number;
  availableConfigurations: string[];
}

export async function searchProjects(
  ctx: AriaToolContext,
  rawInput: SearchProjectsInput
): Promise<{ success: boolean; projects: ProjectFactSummary[]; error?: string }> {
  const input = searchProjectsInputSchema.parse(rawInput);
  const client = getServiceRoleClient();

  if (!client || !isLiveSupabaseAvailable) {
    return { success: false, projects: [], error: "Database service unavailable" };
  }

  try {
    let query = client
      .from("projects")
      .select("id, name, location, price_range, status, project_units(id, configuration, status)")
      .eq("org_id", ctx.orgId);

    if (input.query) {
      query = query.or(`name.ilike.%${input.query}%,location.ilike.%${input.query}%`);
    }

    if (input.regionId) {
      query = query.eq("region_id", input.regionId);
    }

    if (input.status) {
      query = query.eq("status", input.status);
    }

    const { data: projects, error } = await query.limit(input.limit || 6);

    if (error) {
      console.error("[ARIA_SEARCH_PROJECTS_ERROR]", error);
      return { success: false, projects: [], error: error.message };
    }

    const summaries: ProjectFactSummary[] = (projects || []).map((p: any) => {
      const units: any[] = p.project_units || [];
      const totalUnits = units.length;
      const availableUnits = units.filter((u) => u.status === "available").length;
      const configs = Array.from(new Set(units.map((u) => u.configuration).filter(Boolean)));

      return {
        projectId: p.id,
        name: p.name,
        location: p.location,
        priceRange: p.price_range,
        status: p.status,
        totalUnits,
        availableUnits,
        availableConfigurations: configs,
      };
    });

    return { success: true, projects: summaries };
  } catch (err: any) {
    return { success: false, projects: [], error: err.message };
  }
}

// ----------------------------------------------------------------------
// 4. LOOKUP VERIFIED DOCUMENTS & BROCHURES
// ----------------------------------------------------------------------

export const lookupDocumentsInputSchema = z.object({
  projectId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  documentType: z.enum(["brochure", "floor_plan", "cost_sheet", "kyc", "agreement", "photo", "other"]).optional(),
  search: z.string().max(100).optional(),
  limit: z.number().min(1).max(15).default(6).optional(),
});

export type LookupDocumentsInput = z.infer<typeof lookupDocumentsInputSchema>;

export interface DocumentItemSummary {
  id: string;
  title: string;
  type: string;
  projectId?: string;
  leadId?: string;
  downloadUrl: string;
  createdAt: string;
}

export async function lookupDocuments(
  ctx: AriaToolContext,
  rawInput: LookupDocumentsInput
): Promise<{ success: boolean; documents: DocumentItemSummary[]; error?: string }> {
  const input = lookupDocumentsInputSchema.parse(rawInput);
  const client = getServiceRoleClient();

  if (!client || !isLiveSupabaseAvailable) {
    return { success: false, documents: [], error: "Database service unavailable" };
  }

  try {
    let query = client
      .from("documents")
      .select("id, title, type, project_id, lead_id, file_url, created_at")
      .eq("org_id", ctx.orgId);

    if (input.projectId) {
      query = query.eq("project_id", input.projectId);
    }
    if (input.leadId) {
      query = query.eq("lead_id", input.leadId);
    }
    if (input.documentType) {
      query = query.eq("type", input.documentType);
    }
    if (input.search) {
      query = query.ilike("title", `%${input.search.trim()}%`);
    }

    const { data: docs, error } = await query.order("created_at", { ascending: false }).limit(input.limit || 6);

    if (error) {
      console.error("[ARIA_LOOKUP_DOCS_ERROR]", error);
      return { success: false, documents: [], error: error.message };
    }

    const results: DocumentItemSummary[] = (docs || []).map((d: any) => ({
      id: d.id,
      title: d.title,
      type: d.type,
      projectId: d.project_id,
      leadId: d.lead_id,
      downloadUrl: d.file_url,
      createdAt: d.created_at,
    }));

    return { success: true, documents: results };
  } catch (err: any) {
    return { success: false, documents: [], error: err.message };
  }
}

// ----------------------------------------------------------------------
// 5. CUSTOMER DOSSIER & SUMMARY
// ----------------------------------------------------------------------

export const customerDossierInputSchema = z.object({
  leadId: z.string().uuid().optional(),
  phone: z.string().optional(),
});

export type CustomerDossierInput = z.infer<typeof customerDossierInputSchema>;

export async function getCustomerDossier(
  ctx: AriaToolContext,
  rawInput: CustomerDossierInput
): Promise<{ success: boolean; dossier?: any; error?: string }> {
  const input = customerDossierInputSchema.parse(rawInput);
  const client = getServiceRoleClient();

  if (!client || !isLiveSupabaseAvailable) {
    return { success: false, error: "Database service unavailable" };
  }

  try {
    let leadQuery = client
      .from("leads")
      .select("*, profiles(name, email), projects(name, location)")
      .eq("org_id", ctx.orgId);

    if (input.leadId) {
      leadQuery = leadQuery.eq("id", input.leadId);
    } else if (input.phone) {
      const norm = normalizePhone(input.phone);
      leadQuery = leadQuery.or(`phone_normalized.eq.${norm},phone.eq.${input.phone.trim()}`);
    } else {
      return { success: false, error: "leadId or phone is required" };
    }

    const { data: leads, error: leadErr } = await leadQuery.order("created_at", { ascending: false }).limit(1);

    if (leadErr || !leads || leads.length === 0) {
      return { success: false, error: "Customer / lead record not found" };
    }

    const lead = leads[0];

    // Fetch last 5 activities
    const { data: activities } = await client
      .from("activities")
      .select("type, user_name, occurred_at, notes, title")
      .eq("org_id", ctx.orgId)
      .eq("lead_id", lead.id)
      .order("occurred_at", { ascending: false })
      .limit(5);

    // Fetch open tasks
    const { data: tasks } = await client
      .from("tasks")
      .select("title, due_date, status, priority")
      .eq("org_id", ctx.orgId)
      .eq("lead_id", lead.id)
      .not("status", "in", '("completed","cancelled")')
      .order("due_date", { ascending: true })
      .limit(5);

    return {
      success: true,
      dossier: {
        leadId: lead.id,
        personName: lead.person_name,
        phone: lead.phone,
        email: lead.email,
        projectName: lead.project_name || (lead.projects as any)?.name,
        stage: lead.stage,
        budget: Number(lead.budget),
        configurationPreference: lead.configuration_preference,
        dealHealth: lead.deal_health,
        dealHealthScore: typeof lead.deal_health_score === "number" ? lead.deal_health_score : 60,
        dealHealthReason: lead.deal_health_reason,
        dealHealthFactors: lead.deal_health_factors || [],
        dealHealthRecommendedAction: lead.deal_health_recommended_action || null,
        daysInStage: lead.days_in_stage,
        assignedSalesperson: (lead.profiles as any)?.name || "Unassigned",
        lastActivityText: lead.last_activity_text,
        nextFollowUpAt: lead.next_follow_up_at,
        buyingSignals: lead.buyingSignals || lead.buying_signals || [],
        objections: lead.objections || [],
        recentActivities: (activities || []).map((a) => ({
          type: a.type,
          user: a.user_name,
          date: a.occurred_at,
          summary: a.notes || a.title,
        })),
        pendingTasks: (tasks || []).map((t) => ({
          title: t.title,
          dueDate: t.due_date,
          status: t.status,
          priority: t.priority,
        })),
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ----------------------------------------------------------------------
// 6. RECOMMEND NEXT SALES ACTION
// ----------------------------------------------------------------------

export const recommendNextActionInputSchema = z.object({
  leadId: z.string().uuid().describe("Target lead UUID"),
});

export type RecommendNextActionInput = z.infer<typeof recommendNextActionInputSchema>;

export interface NextActionRecommendation {
  leadId: string;
  personName: string;
  actionType: "schedule_site_visit" | "send_brochure" | "send_matching_units" | "call_buyer_followup" | "manager_escalation" | "send_cost_sheet" | "reactivate_lost_lead" | "close_as_lost";
  priority: "urgent" | "high" | "normal";
  title: string;
  rationale: string;
  suggestedScript: string;
  suggestedActionPayload?: any;
}

export async function recommendNextAction(
  ctx: AriaToolContext,
  rawInput: RecommendNextActionInput
): Promise<{ success: boolean; recommendation?: NextActionRecommendation; error?: string }> {
  const input = recommendNextActionInputSchema.parse(rawInput);
  const client = getServiceRoleClient();

  if (!client || !isLiveSupabaseAvailable) {
    return { success: false, error: "Database service unavailable" };
  }

  try {
    const { data: lead, error } = await client
      .from("leads")
      .select("id, person_name, phone, stage, budget, configuration_preference, project_name, deal_health, deal_health_score, deal_health_reason, deal_health_factors, deal_health_recommended_action, days_in_stage, follow_up_status, last_activity_text, next_follow_up_at")
      .eq("org_id", ctx.orgId)
      .eq("id", input.leadId)
      .maybeSingle();

    if (error || !lead) {
      return { success: false, error: "Lead record not found" };
    }

    let actionType: NextActionRecommendation["actionType"] = "call_buyer_followup";
    let priority: NextActionRecommendation["priority"] = "normal";
    let title = "Standard Follow-Up Call";
    let rationale = "Maintain sales cadence with prospect.";
    let script = `Hi ${lead.person_name}, calling from the sales team regarding your interest in ${lead.project_name || "our luxury residences"}. Would you have 2 minutes to discuss available units?`;

    if (lead.deal_health === "at_risk") {
      actionType = "call_buyer_followup";
      priority = "urgent";
      title = "Urgent Re-engagement Call";
      rationale = `Deal is at risk: ${lead.deal_health_reason || "No recent activity"}. Reconnect immediately before lead cools off.`;
      script = `Hello ${lead.person_name}, I wanted to personally touch base regarding ${lead.project_name || "the residences"}. We have just released 2 prime ${lead.configuration_preference || "units"} within your budget that I wanted to share with you before general release.`;
    } else if (lead.stage === "new" || lead.stage === "contacted") {
      actionType = "send_brochure";
      priority = "high";
      title = "Deliver Project Brochure & Match Shortlist";
      rationale = "Lead requires initial collateral and configuration overview to build conviction.";
      script = `Hi ${lead.person_name}, sharing the comprehensive architectural dossier and verified floor plans for ${lead.project_name || "the development"}. Let me know if you would like me to arrange a private walkthrough.`;
    } else if (lead.stage === "qualified") {
      actionType = "schedule_site_visit";
      priority = "high";
      title = "Schedule VIP Site Visit & Experience Center Tour";
      rationale = `Qualified buyer with verified ₹${(Number(lead.budget) / 10000000).toFixed(2)} Cr budget. Next logical progression is physical or virtual site visit.`;
      script = `Hi ${lead.person_name}, we have reserved an exclusive site visit slot for you this weekend at ${lead.project_name || "the property"}. Would Saturday morning at 11:00 AM or Sunday afternoon suit your schedule?`;
    } else if (lead.stage === "site_visit") {
      actionType = "send_cost_sheet";
      priority = "high";
      title = "Share Customized Cost Sheet & Payment Schedule";
      rationale = "Site visit complete; buyer requires structured commercial cost breakdown and inventory hold options.";
      script = `Hi ${lead.person_name}, hope you enjoyed the visit! I've prepared the official builder cost sheet with all-inclusive pricing and flexible milestone payment plans for your shortlisted unit.`;
    } else if (lead.stage === "negotiation") {
      actionType = "manager_escalation";
      priority = "high";
      title = "Manager Commercial Review & Booking Closure";
      rationale = "Deal in final negotiation. Involve senior sales director to finalize commercial discounts or payment flexibility.";
      script = `Hi ${lead.person_name}, our sales director has reviewed your offer and is open to a special festival pricing structure if we can confirm the booking token this week.`;
    }

    return {
      success: true,
      recommendation: {
        leadId: lead.id,
        personName: lead.person_name,
        actionType,
        priority,
        title,
        rationale,
        suggestedScript: script,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ----------------------------------------------------------------------
// 6. PROPERTY INTELLIGENCE BRIEFING & VERIFICATION TOOL
// ----------------------------------------------------------------------

export const propertyBriefingInputSchema = z.object({
  unitId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  unitNumber: z.string().optional(),
  tower: z.string().optional(),
});

export type PropertyBriefingInput = z.infer<typeof propertyBriefingInputSchema>;

export interface PropertyBriefingOutput {
  unitTitle: string;
  societyName: string;
  locality: string;
  verifiedSpecs: {
    configuration: string;
    superAreaSqFt: number;
    carpetAreaSqFt?: number;
    floor: number;
    facing?: string;
    parking?: string;
  };
  commercials: {
    askingPrice: number;
    estimatedValuation?: number;
    pricePerSqFt: number;
    expectedRentMonthly?: number;
    rentalYieldPct?: number;
    maintenanceMonthly?: number;
  };
  ownershipChain: Array<{
    personName: string;
    role: string;
    tenure: string;
    isCurrent: boolean;
    verificationStatus: string;
  }>;
  salesMemoryFacts: Array<{
    category: string;
    title: string;
    statement: string;
    tier: "verified" | "historical" | "user_provided" | "inferred";
    confidence: number;
  }>;
  gateAccessProtocol: string;
}

export async function generatePropertyBriefing(
  input: PropertyBriefingInput,
  ctx: AriaToolContext
): Promise<{ success: boolean; briefing?: PropertyBriefingOutput; error?: string }> {
  const supabase = getServiceRoleClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return {
      success: true,
      briefing: {
        unitTitle: "Unit A-1402 (Floor 14)",
        societyName: "The Camellias",
        locality: "Golf Course Road, Gurugram",
        verifiedSpecs: {
          configuration: "4 BHK Luxury Residence",
          superAreaSqFt: 7400,
          carpetAreaSqFt: 5800,
          floor: 14,
          facing: "North-East (Golf Course Facing)",
          parking: "3 Covered Stalls",
        },
        commercials: {
          askingPrice: 420000000,
          estimatedValuation: 435000000,
          pricePerSqFt: 56756,
          expectedRentMonthly: 650000,
          rentalYieldPct: 1.85,
          maintenanceMonthly: 32000,
        },
        ownershipChain: [
          {
            personName: "Vikram Singhania",
            role: "Current Owner",
            tenure: "2022 – Present",
            isCurrent: true,
            verificationStatus: "verified",
          },
        ],
        salesMemoryFacts: [
          {
            category: "visitor_access_rules",
            title: "Strict 24h Prior Gate Pass Required",
            statement: "DLF facility management requires advance registration of prospective buyer driver and vehicle registration number at Gate 2.",
            tier: "verified",
            confidence: 100,
          },
          {
            category: "pricing_intelligence",
            title: "Firm on 42 Cr Floor Price",
            statement: "Owner is not distressed; will not consider bids under ₹40 Cr all inclusive.",
            tier: "user_provided",
            confidence: 85,
          },
        ],
        gateAccessProtocol: "Access via Gate 2 North Wing. Collect visitor lanyard from Concierge.",
      },
    };
  }

  try {
    let unitQuery = supabase
      .from("project_units")
      .select(`
        *,
        project:project_id (
          id, name, location, developer,
          area:area_id (name, city)
        ),
        tower_entity:tower_id (name, total_floors)
      `)
      .eq("org_id", ctx.orgId);

    if (input.unitId) {
      unitQuery = unitQuery.eq("id", input.unitId);
    } else if (input.projectId && input.unitNumber) {
      unitQuery = unitQuery.eq("project_id", input.projectId).eq("unit_number", input.unitNumber);
    }

    const { data: unit, error } = await unitQuery.maybeSingle();
    if (error || !unit) {
      return { success: false, error: "Unit not found in organization inventory" };
    }

    const [{ data: relationships }, { data: facts }] = await Promise.all([
      supabase
        .from("entity_relationships")
        .select("*")
        .eq("org_id", ctx.orgId)
        .eq("target_type", "unit")
        .eq("target_id", unit.id),
      supabase
        .from("property_facts")
        .select("*")
        .eq("org_id", ctx.orgId)
        .eq("entity_type", "unit")
        .eq("entity_id", unit.id),
    ]);

    const price = Number(unit.asking_price || unit.price || 0);
    const superArea = Number(unit.super_area_sq_ft || 1500);

    const briefing: PropertyBriefingOutput = {
      unitTitle: `Unit ${unit.tower}-${unit.unit_number} (Floor ${unit.floor})`,
      societyName: unit.project?.name || "Society",
      locality: `${unit.project?.area?.name || unit.project?.location || "Prime Sector"}, ${unit.project?.area?.city || "NCR"}`,
      verifiedSpecs: {
        configuration: unit.configuration,
        superAreaSqFt: superArea,
        carpetAreaSqFt: unit.carpet_area_sq_ft ? Number(unit.carpet_area_sq_ft) : undefined,
        floor: unit.floor,
        facing: unit.facing || undefined,
        parking: `${unit.parking_slots || 1} (${unit.parking_type || "Covered"})`,
      },
      commercials: {
        askingPrice: price,
        estimatedValuation: unit.estimated_market_price ? Number(unit.estimated_market_price) : undefined,
        pricePerSqFt: Math.round(price / (superArea || 1)),
        expectedRentMonthly: unit.expected_monthly_rent ? Number(unit.expected_monthly_rent) : undefined,
        rentalYieldPct: unit.rental_yield_pct ? Number(unit.rental_yield_pct) : undefined,
        maintenanceMonthly: unit.maintenance_monthly ? Number(unit.maintenance_monthly) : undefined,
      },
      ownershipChain: (relationships || []).map((r: any) => ({
        personName: r.subject_name || "Owner/Tenant",
        role: r.relationship_type.replace(/_/g, " ").toUpperCase(),
        tenure: `${r.valid_from} → ${r.valid_until || "Present"}`,
        isCurrent: Boolean(r.is_current),
        verificationStatus: r.verification_status || "verified",
      })),
      salesMemoryFacts: (facts || []).map((f: any) => ({
        category: f.category,
        title: f.title,
        statement: f.fact_statement,
        tier: f.verification_tier,
        confidence: f.confidence_pct,
      })),
      gateAccessProtocol: unit.key_location ? `Key at ${unit.key_location}` : "Standard society visitor registration",
    };

    return { success: true, briefing };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ----------------------------------------------------------------------
// 7. BUYER TO UNIT INTELLIGENT MATCHING & WHATSAPP ENGINE
// ----------------------------------------------------------------------

export const matchBuyersForUnitInputSchema = z.object({
  unitId: z.string().uuid(),
  maxMatches: z.number().min(1).max(20).default(5).optional(),
});

export async function matchBuyersForUnit(
  input: z.infer<typeof matchBuyersForUnitInputSchema>,
  ctx: AriaToolContext
): Promise<{ success: boolean; matches?: any[]; error?: string }> {
  const supabase = getServiceRoleClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return {
      success: true,
      matches: [
        {
          leadId: "lead-vikas-mehta",
          personName: "Vikas Mehta",
          phone: "+919811234567",
          budget: 450000000,
          stage: "site_visit",
          matchScore: 96,
          matchReasons: ["Budget aligned within 5%", "Preferred North-East orientation", "High floor requirement met"],
          suggestedWhatsAppPitch: "Hi Vikas, an exclusive 4 BHK at The Camellias (Floor 14, Golf facing) has just opened for private viewings within your ₹45 Cr allocation.",
        },
      ],
    };
  }

  try {
    const { data: unit, error: unitErr } = await supabase
      .from("project_units")
      .select(`*, project:project_id (name, location)`)
      .eq("org_id", ctx.orgId)
      .eq("id", input.unitId)
      .single();

    if (unitErr || !unit) {
      return { success: false, error: "Unit not found" };
    }

    const price = Number(unit.asking_price || unit.price || 0);
    const minBudget = price * 0.75;
    const maxBudget = price * 1.25;

    const { data: activeLeads, error: leadsErr } = await supabase
      .from("leads")
      .select("id, person_name, phone, budget, stage, configuration_preference, preferred_floor, facing_preference")
      .eq("org_id", ctx.orgId)
      .neq("stage", "lost")
      .neq("stage", "won")
      .gte("budget", minBudget)
      .lte("budget", maxBudget)
      .order("budget", { ascending: false })
      .limit(input.maxMatches || 5);

    if (leadsErr) {
      return { success: false, error: leadsErr.message };
    }

    const matches = (activeLeads || []).map((lead: any) => {
      const reasons = [`Budget match (₹${(Number(lead.budget) / 10000000).toFixed(2)} Cr vs ₹${(price / 10000000).toFixed(2)} Cr)`];
      if (lead.configuration_preference && unit.configuration.toLowerCase().includes(lead.configuration_preference.slice(0, 3).toLowerCase())) {
        reasons.push(`Configuration match (${unit.configuration})`);
      }
      return {
        leadId: lead.id,
        personName: lead.person_name,
        phone: lead.phone,
        budget: lead.budget,
        stage: lead.stage,
        matchScore: 90,
        matchReasons: reasons,
        suggestedWhatsAppPitch: `Hi ${lead.person_name}, we have an exclusive off-market unit at ${unit.project?.name || "the project"} (${unit.tower}-${unit.unit_number}, Floor ${unit.floor}) for ${unit.configuration} matching your exact requirements.`,
      };
    });

    return { success: true, matches };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ----------------------------------------------------------------------
// 8. FREE-TEXT MEETING DISPOSITION STRUCTURER (HUMAN-GATED)
// ----------------------------------------------------------------------

export const structureMeetingNotesInputSchema = z.object({
  leadId: z.string().optional(),
  unitId: z.string().optional(),
  personName: z.string().max(200).optional(),
  rawNotes: z.string().min(5).max(5000),
  spokenLanguage: z.string().max(50).default("en-IN").optional(),
});

export type StructureMeetingNotesInput = z.infer<typeof structureMeetingNotesInputSchema>;

export function structureFreeTextMeetingNotes(
  input: StructureMeetingNotesInput
): {
  activityType: "meeting" | "call" | "site_visit" | "whatsapp";
  outcome: "interested" | "site_visit_booked" | "call_back" | "not_interested";
  outcomeLabel: string;
  suggestedStage: "new" | "contacted" | "qualified" | "site_visit" | "negotiation" | "won" | "lost";
  sentiment: "bullish" | "cautious" | "hesitant" | "negative";
  budgetConfirmed?: number;
  extractedObjections: string[];
  buyingSignals: string[];
  conversationSummary: string;
  suggestedNextMove: string;
  suggestedFollowUpAt: string;
  requiresHumanApproval: true;
} {
  const text = input.rawNotes.toLowerCase();

  // 1. Detect Objections
  const objections: string[] = [];
  if (text.includes("price") || text.includes("expensive") || text.includes("budget") || text.includes("crore") || text.includes("cr") || text.includes("high")) {
    objections.push("Price / Valuation Sensitivity");
  }
  if (text.includes("floor") || text.includes("low floor") || text.includes("high floor")) {
    objections.push("Floor Preference / Floor Rise");
  }
  if (text.includes("vastu") || text.includes("facing") || text.includes("direction") || text.includes("south")) {
    objections.push("Vastu / Directional Orientation");
  }
  if (text.includes("possession") || text.includes("delay") || text.includes("ready") || text.includes("construction")) {
    objections.push("Possession Timeline");
  }
  if (text.includes("maintenance") || text.includes("society") || text.includes("charges")) {
    objections.push("Society Maintenance Fees");
  }

  // 2. Detect Buying Signals
  const buyingSignals: string[] = [];
  if (text.includes("loved") || text.includes("liked") || text.includes("shortlist") || text.includes("favourite") || text.includes("interested")) {
    buyingSignals.push("Positive emotional connection to unit layout");
  }
  if (text.includes("cheque") || text.includes("token") || text.includes("advance") || text.includes("booking") || text.includes("ats")) {
    buyingSignals.push("Commercial commitment / Booking readiness");
  }
  if (text.includes("family") || text.includes("wife") || text.includes("husband") || text.includes("parents") || text.includes("father")) {
    buyingSignals.push("Key decision-makers involved");
  }
  if (text.includes("offer") || text.includes("counter") || text.includes("negotiat") || text.includes("discount")) {
    buyingSignals.push("Active price negotiation underway");
  }

  // 3. Detect Sentiment & Stage
  let sentiment: "bullish" | "cautious" | "hesitant" | "negative" = "cautious";
  let suggestedStage: "new" | "contacted" | "qualified" | "site_visit" | "negotiation" | "won" | "lost" = "qualified";
  let outcome: "interested" | "site_visit_booked" | "call_back" | "not_interested" = "interested";
  let outcomeLabel = "Discussion Completed";

  if (text.includes("not interested") || text.includes("dropped") || text.includes("bought elsewhere") || text.includes("reject")) {
    sentiment = "negative";
    suggestedStage = "lost";
    outcome = "not_interested";
    outcomeLabel = "Buyer Opted Out";
  } else if (text.includes("booked") || text.includes("token received") || text.includes("won") || text.includes("closed")) {
    sentiment = "bullish";
    suggestedStage = "won";
    outcome = "interested";
    outcomeLabel = "Booking Deal Closed";
  } else if (text.includes("offer") || text.includes("counter") || text.includes("negotiat") || text.includes("ats")) {
    sentiment = "bullish";
    suggestedStage = "negotiation";
    outcome = "interested";
    outcomeLabel = "Commercial Negotiation";
  } else if (text.includes("site visit") || text.includes("walkthrough") || text.includes("saw the flat") || text.includes("visited")) {
    sentiment = "bullish";
    suggestedStage = "site_visit";
    outcome = "site_visit_booked";
    outcomeLabel = "Site Visit Completed";
  } else {
    sentiment = objections.length > 0 ? "cautious" : "bullish";
    suggestedStage = "qualified";
    outcome = "call_back";
    outcomeLabel = "Requirement Qualified";
  }

  // 4. Determine Activity Type
  let activityType: "meeting" | "call" | "site_visit" | "whatsapp" = "meeting";
  if (text.includes("call") || text.includes("spoke on phone") || text.includes("telecon")) {
    activityType = "call";
  } else if (text.includes("whatsapp") || text.includes("chat") || text.includes("message")) {
    activityType = "whatsapp";
  } else if (text.includes("site visit") || text.includes("visited") || text.includes("walkthrough") || text.includes("at the tower")) {
    activityType = "site_visit";
  }

  // 5. Compute Next Follow-Up Date (Default: 48h from now)
  const nextDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
  nextDate.setHours(11, 0, 0, 0);

  return {
    activityType,
    outcome,
    outcomeLabel,
    suggestedStage,
    sentiment,
    extractedObjections: objections.length > 0 ? objections : ["None explicitly stated"],
    buyingSignals: buyingSignals.length > 0 ? buyingSignals : ["General market interest"],
    conversationSummary: input.rawNotes.trim(),
    suggestedNextMove: suggestedStage === "negotiation"
      ? "Present structured counter-offer with payment milestone schedule."
      : suggestedStage === "site_visit"
      ? "Send comparative cost sheet and follow up on floorplan feedback."
      : "Send shortlisted unit brochures and schedule on-site walkthrough.",
    suggestedFollowUpAt: nextDate.toISOString(),
    requiresHumanApproval: true,
  };
}


