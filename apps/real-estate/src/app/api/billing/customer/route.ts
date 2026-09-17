import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, MANAGER_ROLES, getServiceRoleClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";
import { updateBillingProfileSchema } from "@repo/core/lib/server/validations";

// POST /api/billing/customer - Update organization GSTIN, legal name, and billing contact info
export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }
  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Only managers and owners can update billing details", 403, "FORBIDDEN");
  }

  const supabase = getServiceRoleClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiSuccess({ message: "Billing details updated (Simulated Mode)" }, 200);
  }

  try {
    const parsed = updateBillingProfileSchema.parse(await req.json());

    // 1. Update orgs table with GST details
    const orgUpdate: Record<string, any> = {};
    if (parsed.legalName !== undefined) orgUpdate.legal_name = parsed.legalName;
    if (parsed.gstin !== undefined) orgUpdate.gstin = parsed.gstin;
    if (parsed.billingEmail !== undefined) orgUpdate.billing_email = parsed.billingEmail;
    if (parsed.billingAddress !== undefined) orgUpdate.billing_address = parsed.billingAddress;

    if (Object.keys(orgUpdate).length > 0) {
      await supabase.from("orgs").update(orgUpdate).eq("id", auth.orgId);
    }

    // 2. Upsert billing_customers table
    const { data: customer, error: custErr } = await supabase
      .from("billing_customers")
      .upsert(
        {
          org_id: auth.orgId,
          provider: "simulated",
          provider_customer_id: `cust_${auth.orgId.slice(0, 8)}`,
          billing_name: parsed.legalName,
          billing_email: parsed.billingEmail,
          billing_phone: parsed.billingPhone,
          billing_address: parsed.billingAddress || {},
          gstin: parsed.gstin,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_id,provider" }
      )
      .select()
      .single();

    if (custErr) {
      console.warn("[BILLING_CUSTOMER_UPSERT_WARN]", custErr.message);
    }

    return apiSuccess(
      {
        message: "GST and billing profile updated successfully",
        customer,
      },
      200
    );
  } catch (err: any) {
    if (err && typeof err === "object" && "issues" in err) {
      return apiError("Invalid billing profile data", 422, "VALIDATION_ERROR", err.issues);
    }
    return apiError(err.message || "Failed to update billing details", 500, "SERVER_ERROR");
  }
}
