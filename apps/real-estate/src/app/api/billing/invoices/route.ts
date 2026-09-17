import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, getServiceRoleClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";

// GET /api/billing/invoices - Retrieve all billing invoices and receipts for the caller's organization
export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const supabase = getServiceRoleClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    // Local / Sandbox sample invoice
    return apiSuccess(
      [
        {
          id: "inv_sample_1",
          orgId: auth.orgId,
          invoiceNumber: "INV-2026-0801",
          provider: "simulated",
          providerPaymentId: "pay_simulated_initial",
          amount: 4999,
          taxAmount: 899.82,
          currency: "INR",
          status: "paid",
          plan: "growth",
          billingCycle: "monthly",
          periodStart: new Date(Date.now() - 30 * 86400000).toISOString(),
          periodEnd: new Date().toISOString(),
          billingName: "Apex Realty Advisors",
          billingEmail: "finance@apexrealty.com",
          paidAt: new Date(Date.now() - 30 * 86400000).toISOString(),
          receiptUrl: "#",
          createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        },
      ],
      200
    );
  }

  try {
    const { data: invoices, error } = await supabase
      .from("billing_invoices")
      .select("*")
      .eq("org_id", auth.orgId)
      .order("created_at", { ascending: false });

    if (error) {
      return apiError("Failed to fetch invoices", 500, "DB_ERROR", error.message);
    }

    const mapped = (invoices || []).map((inv) => ({
      id: inv.id,
      orgId: inv.org_id,
      subscriptionId: inv.subscription_id,
      invoiceNumber: inv.invoice_number,
      provider: inv.provider,
      providerPaymentId: inv.provider_payment_id,
      providerInvoiceId: inv.provider_invoice_id,
      amount: Number(inv.amount),
      taxAmount: Number(inv.tax_amount || 0),
      currency: inv.currency,
      status: inv.status,
      plan: inv.plan,
      billingCycle: inv.billing_cycle,
      periodStart: inv.period_start,
      periodEnd: inv.period_end,
      billingName: inv.billing_name,
      billingEmail: inv.billing_email,
      gstin: inv.gstin,
      paidAt: inv.paid_at,
      receiptUrl: inv.receipt_url,
      createdAt: inv.created_at,
    }));

    return apiSuccess(mapped, 200);
  } catch (err: any) {
    return apiError(err.message || "Failed to retrieve billing history", 500, "SERVER_ERROR");
  }
}
