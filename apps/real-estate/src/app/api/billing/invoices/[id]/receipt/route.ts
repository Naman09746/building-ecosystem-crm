import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, getServiceRoleClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";
import { PLAN_CONFIGS, PlanId } from "@repo/core/lib/server/subscription";

// GET /api/billing/invoices/[id]/receipt - Fetch receipt & tax invoice payload for download
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const { id } = await params;
  const supabase = getServiceRoleClient();

  if (!supabase || !isLiveSupabaseAvailable) {
    // Simulated receipt payload
    return apiSuccess({
      invoiceNumber: "INV-2026-0801",
      seller: {
        legalName: "Ecosystem Realty Technologies Private Limited",
        address: "Unit 402, Trade Tower, Bandra Kurla Complex, Mumbai, MH 400051",
        gstin: "27AAACA1234A1Z5",
        email: "billing@ecosystemrealty.in",
      },
      buyer: {
        legalName: "Apex Realty Advisors",
        gstin: "27AABCA5678B1Z2",
        billingEmail: "finance@apexrealty.com",
      },
      lineItems: [
        {
          description: "EcosystemRealty Boutique Team Subscription (Monthly)",
          hsnSac: "998313",
          amount: 4236.44,
          taxRate: 18,
          taxAmount: 762.56,
          total: 4999,
        },
      ],
      totalAmount: 4999,
      taxAmount: 762.56,
      currency: "INR",
      status: "PAID",
      paidAt: new Date().toISOString(),
      paymentMethod: "Card ending 4242",
      paymentId: "pay_simulated_receipt",
    });
  }

  try {
    const { data: inv, error } = await supabase
      .from("billing_invoices")
      .select("*, orgs(name, legal_name, gstin, billing_email, billing_address)")
      .eq("id", id)
      .eq("org_id", auth.orgId)
      .single();

    if (error || !inv) {
      return apiError("Invoice not found", 404, "NOT_FOUND");
    }

    const org = (inv as any).orgs || {};
    const planConfig = PLAN_CONFIGS[inv.plan as PlanId];
    const totalAmount = Number(inv.amount);
    const taxAmount = Number(inv.tax_amount || Math.round(totalAmount * 0.18));
    const subtotal = totalAmount - taxAmount;

    return apiSuccess({
      invoiceNumber: inv.invoice_number,
      seller: {
        legalName: "Ecosystem Realty Technologies Private Limited",
        address: "Unit 402, Trade Tower, Bandra Kurla Complex, Mumbai, MH 400051",
        gstin: "27AAACA1234A1Z5",
        email: "billing@ecosystemrealty.in",
      },
      buyer: {
        legalName: org.legal_name || org.name || inv.billing_name || "Valued Real Estate Customer",
        gstin: org.gstin || inv.gstin || "Unregistered",
        billingEmail: org.billing_email || inv.billing_email || "billing@customer.com",
        billingAddress: org.billing_address || {},
      },
      lineItems: [
        {
          description: `EcosystemRealty ${planConfig?.name || inv.plan} Plan (${inv.billing_cycle === "yearly" ? "Annual" : "Monthly"})`,
          hsnSac: "998313", // Information technology software services
          amount: subtotal,
          taxRate: 18,
          taxAmount,
          total: totalAmount,
        },
      ],
      totalAmount,
      taxAmount,
      currency: inv.currency,
      status: inv.status.toUpperCase(),
      paidAt: inv.paid_at || inv.created_at,
      paymentId: inv.provider_payment_id || inv.id,
      billingPeriod: {
        start: inv.period_start,
        end: inv.period_end,
      },
    });
  } catch (err: any) {
    return apiError("Failed to fetch receipt data", 500, "SERVER_ERROR", err.message);
  }
}
