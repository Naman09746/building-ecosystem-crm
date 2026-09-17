import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  checkRateLimit,
} from "@repo/core/lib/server/api-security";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
  MANAGER_ROLES,
} from "@repo/core/lib/server/supabase-server";

function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// GET /api/leads/export - Stream authorized leads as CSV
export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const rateCheck = checkRateLimit(`export_leads_${auth.userId}`, 5, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded for exports. Please wait a moment.", 429, "RATE_LIMIT_EXCEEDED");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    let query = supabase
      .from("leads")
      .select(`
        id,
        budget,
        stage,
        source,
        lead_score,
        deal_health,
        configuration_preference,
        preferred_floor,
        facing_preference,
        assigned_unit_number,
        last_activity_text,
        last_activity_at,
        created_at,
        person:person_id (name, phone, phone_normalized, email),
        project:project_id (name, location),
        salesperson:salesperson_id (full_name)
      `)
      .eq("org_id", auth.orgId)
      .order("created_at", { ascending: false });

    // Non-managers only export leads assigned to them
    if (!MANAGER_ROLES.includes(auth.role)) {
      query = query.eq("salesperson_id", auth.userId);
    }

    const { data: leads, error } = await query;
    if (error) {
      console.error("[LEADS_EXPORT_ERROR]", error.code);
      return apiError("Failed to generate leads export", 500, "DB_QUERY_ERROR");
    }

    const headers = [
      "Lead ID",
      "Buyer Name",
      "Phone",
      "Email",
      "Project",
      "Location",
      "Sales Representative",
      "Stage",
      "Budget (INR)",
      "Configuration",
      "Preferred Floor",
      "Facing",
      "Assigned Unit",
      "Lead Score",
      "Deal Health",
      "Source",
      "Last Activity",
      "Last Activity Date",
      "Created Date",
    ];

    const rows = (leads || []).map((l: any) => [
      escapeCsvField(l.id),
      escapeCsvField(l.person?.name || "Unknown"),
      escapeCsvField(l.person?.phone || ""),
      escapeCsvField(l.person?.email || ""),
      escapeCsvField(l.project?.name || ""),
      escapeCsvField(l.project?.location || ""),
      escapeCsvField(l.salesperson?.full_name || "Unassigned"),
      escapeCsvField(l.stage),
      escapeCsvField(l.budget),
      escapeCsvField(l.configuration_preference || ""),
      escapeCsvField(l.preferred_floor || ""),
      escapeCsvField(l.facing_preference || ""),
      escapeCsvField(l.assigned_unit_number || ""),
      escapeCsvField(l.lead_score),
      escapeCsvField(l.deal_health),
      escapeCsvField(l.source || ""),
      escapeCsvField(l.last_activity_text || ""),
      escapeCsvField(l.last_activity_at || ""),
      escapeCsvField(l.created_at),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const filename = `ecosystemrealty-leads-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    console.error("[EXPORT_LEADS_EXCEPTION]", err);
    return apiError("Failed to generate leads export", 500, "SERVER_ERROR");
  }
}
