import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
  handleValidationError,
  checkRateLimit,
} from "@repo/core/lib/server/api-security";
import { importLeadsBatchSchema } from "@repo/core/lib/server/validations";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
} from "@repo/core/lib/server/supabase-server";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+91${digits.slice(1)}`;
  return raw.startsWith("+") ? raw : `+${digits}`;
}

// POST /api/leads/import - Ingest real estate leads from CSV with deduplication & quota protection
export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const rateCheck = checkRateLimit(`import_leads_${auth.userId}`, 10, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded for lead import", 429, "RATE_LIMIT_EXCEEDED");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const rawBody = await req.json();
    const validated = importLeadsBatchSchema.parse(rawBody);

    // 1. Check current lead count against plan quota
    const { data: orgInfo } = await supabase
      .from("orgs")
      .select("max_leads")
      .eq("id", auth.orgId)
      .single();

    const maxLeads = orgInfo?.max_leads || 500;

    const { count: currentLeadCount } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("org_id", auth.orgId);

    const availableSlots = maxLeads - (currentLeadCount || 0);
    if (availableSlots <= 0) {
      return apiError(
        `Lead quota reached (${currentLeadCount}/${maxLeads}). Please upgrade your plan to import more leads.`,
        402,
        "LEAD_QUOTA_EXCEEDED"
      );
    }

    // 2. Fetch default project if not provided
    const { data: defaultProject } = await supabase
      .from("projects")
      .select("id, name, region_id")
      .eq("org_id", auth.orgId)
      .limit(1)
      .maybeSingle();

    let importedCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;
    const errors: Array<{ row: number; error: string }> = [];

    // Process leads in batches
    for (let i = 0; i < validated.leads.length; i++) {
      if (importedCount >= availableSlots) {
        errors.push({
          row: i + 1,
          error: `Lead quota limit reached (${maxLeads} leads max). Subsequent rows skipped.`,
        });
        failedCount += validated.leads.length - i;
        break;
      }

      const row = validated.leads[i];
      const normalizedPhone = normalizePhone(row.phone);

      try {
        // Step A: Deduplicate person in contact master
        let personId: string | null = null;
        const { data: existingPerson } = await supabase
          .from("people")
          .select("id, name")
          .eq("org_id", auth.orgId)
          .eq("phone_normalized", normalizedPhone)
          .maybeSingle();

        if (existingPerson) {
          personId = existingPerson.id;
        } else {
          const { data: newPerson, error: personErr } = await supabase
            .from("people")
            .insert({
              org_id: auth.orgId,
              name: row.personName,
              phone: row.phone,
              phone_normalized: normalizedPhone,
              email: row.email || null,
              source: row.source || "CSV Import",
              budget: row.budget,
              preferred_configuration: row.configurationPreference || null,
            })
            .select("id")
            .single();

          if (personErr || !newPerson) {
            errors.push({ row: i + 1, error: "Failed to create contact master entry" });
            failedCount++;
            continue;
          }
          personId = newPerson.id;
        }

        // Step B: Check if lead for this person already exists in an active stage
        const targetProjectId = row.projectId || defaultProject?.id;
        if (!targetProjectId) {
          errors.push({ row: i + 1, error: "No valid project found in organization" });
          failedCount++;
          continue;
        }

        const { data: existingLead } = await supabase
          .from("leads")
          .select("id")
          .eq("org_id", auth.orgId)
          .eq("person_id", personId)
          .eq("project_id", targetProjectId)
          .not("stage", "in", '("won","lost")')
          .maybeSingle();

        if (existingLead) {
          duplicateCount++;
          continue;
        }

        // Step C: Insert Lead
        const { error: leadErr } = await supabase
          .from("leads")
          .insert({
            org_id: auth.orgId,
            person_id: personId,
            project_id: targetProjectId,
            salesperson_id: auth.userId,
            budget: row.budget,
            stage: row.stage || "new",
            source: row.source || "CSV Import",
            configuration_preference: row.configurationPreference || null,
            preferred_floor: row.preferredFloor || null,
            facing_preference: row.facingPreference || null,
            last_activity_text: "Lead imported via CSV batch",
            last_activity_at: new Date().toISOString(),
          });

        if (leadErr) {
          errors.push({ row: i + 1, error: leadErr.message || "Failed to insert lead" });
          failedCount++;
        } else {
          importedCount++;
        }
      } catch (err: any) {
        errors.push({ row: i + 1, error: err?.message || "Unexpected row processing error" });
        failedCount++;
      }
    }

    return apiSuccess(
      {
        totalRows: validated.leads.length,
        imported: importedCount,
        duplicates: duplicateCount,
        failed: failedCount,
        errors,
      },
      200
    );
  } catch (err) {
    return handleValidationError(err);
  }
}
