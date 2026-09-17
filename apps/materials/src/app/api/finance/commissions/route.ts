import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError, handleValidationError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, getAuthenticatedServerClient, isLiveSupabaseAvailable, MANAGER_ROLES } from "@repo/core/lib/server/supabase-server";

const createCommissionSchema = z.object({
  dealId: z.string().uuid(),
  unitId: z.string().uuid(),
  finalTransactedValue: z.number().positive(),
  bookingDate: z.string().optional(),
  registrationDate: z.string().optional(),
  buyerBrokeragePct: z.number().default(1.0),
  sellerBrokeragePct: z.number().default(1.0),
  channelPartnerOrgId: z.string().uuid().optional(),
  channelPartnerCommissionPct: z.number().default(0.0),
  salespersonUserId: z.string().uuid().optional(),
  salespersonIncentivePct: z.number().default(10.0),
  managerUserId: z.string().uuid().optional(),
  managerOverridePct: z.number().default(3.0),
  invoiceNumber: z.string().optional(),
  paymentStatus: z.enum(["unpaid", "partially_paid", "paid", "overdue", "written_off"]).default("unpaid"),
  amountCollected: z.number().default(0),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }
  if (!MANAGER_ROLES.includes(auth.role as any)) {
    return apiError("Only management can view commission ledgers", 403, "FORBIDDEN");
  }

  const supabase = await getAuthenticatedServerClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiSuccess([]);
  }

  const { data, error } = await supabase
    .from("commission_ledgers")
    .select("*, deal:deals(title, value), unit:project_units(unit_number, tower, price), rep:profiles!salesperson_user_id(full_name)")
    .eq("org_id", auth.orgId)
    .order("created_at", { ascending: false });

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

  // Only owners and managers can calculate or post commissions
  const isManagerial = MANAGER_ROLES.includes(auth.role as any);
  if (!isManagerial) {
    return apiError("Only management can post commission ledgers", 403, "FORBIDDEN");
  }

  try {
    const body = await req.json();
    const validated = createCommissionSchema.parse(body);

    const transactedValue = validated.finalTransactedValue;
    const buyerBrokerage = (transactedValue * validated.buyerBrokeragePct) / 100;
    const sellerBrokerage = (transactedValue * validated.sellerBrokeragePct) / 100;
    const totalGrossBrokerage = buyerBrokerage + sellerBrokerage;

    // Statutory Indian Taxes (18% GST added to invoice, 1% TDS deducted at source by builder/client)
    const gstRatePct = 18.0;
    const gstAmount = (totalGrossBrokerage * gstRatePct) / 100;
    const tdsRatePct = 1.0;
    const tdsDeducted = (totalGrossBrokerage * tdsRatePct) / 100;
    const netBrokerageReceivable = totalGrossBrokerage + gstAmount - tdsDeducted;

    // Splits — guard against >100% allocation and negative retention
    const totalSplitPct = validated.channelPartnerCommissionPct + validated.salespersonIncentivePct + validated.managerOverridePct;
    if (totalSplitPct > 90) return apiError("Combined commission splits must not exceed 90%", 422, "INVALID_SPLIT");
    const cpPayout = (totalGrossBrokerage * validated.channelPartnerCommissionPct) / 100;
    const repIncentive = (totalGrossBrokerage * validated.salespersonIncentivePct) / 100;
    const managerOverride = (totalGrossBrokerage * validated.managerOverridePct) / 100;
    const companyNetRetention = Math.max(0, totalGrossBrokerage - cpPayout - repIncentive - managerOverride);

    if (validated.amountCollected > netBrokerageReceivable) return apiError("amountCollected exceeds net receivable", 422, "INVALID_AMOUNT");
    const outstanding = netBrokerageReceivable - validated.amountCollected;

    const supabase = await getAuthenticatedServerClient();
    if (!supabase || !isLiveSupabaseAvailable) {
      return apiSuccess({
        id: `mock-comm-${Date.now()}`,
        org_id: auth.orgId,
        total_gross_brokerage: totalGrossBrokerage,
        net_brokerage_receivable: netBrokerageReceivable,
        company_net_retention: companyNetRetention,
        ...validated,
      }, 201);
    }

    const { data, error } = await supabase
      .from("commission_ledgers")
      .insert({
        org_id: auth.orgId,
        deal_id: validated.dealId,
        unit_id: validated.unitId,
        final_transacted_value: transactedValue,
        booking_date: validated.bookingDate || new Date().toISOString().split("T")[0],
        registration_date: validated.registrationDate || null,
        buyer_brokerage_pct: validated.buyerBrokeragePct,
        buyer_brokerage_amount: buyerBrokerage,
        seller_brokerage_pct: validated.sellerBrokeragePct,
        seller_brokerage_amount: sellerBrokerage,
        total_gross_brokerage: totalGrossBrokerage,
        gst_rate_pct: gstRatePct,
        gst_amount: gstAmount,
        tds_rate_pct: tdsRatePct,
        tds_deducted: tdsDeducted,
        net_brokerage_receivable: netBrokerageReceivable,
        channel_partner_org_id: validated.channelPartnerOrgId || null,
        channel_partner_commission_pct: validated.channelPartnerCommissionPct,
        channel_partner_payout: cpPayout,
        salesperson_user_id: validated.salespersonUserId || auth.userId,
        salesperson_incentive_pct: validated.salespersonIncentivePct,
        salesperson_incentive_amount: repIncentive,
        manager_user_id: validated.managerUserId || null,
        manager_override_pct: validated.managerOverridePct,
        manager_override_amount: managerOverride,
        company_net_retention: companyNetRetention,
        invoice_number: validated.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
        invoice_date: new Date().toISOString().split("T")[0],
        payment_status: validated.paymentStatus,
        amount_collected: validated.amountCollected,
        outstanding_balance: outstanding,
        notes: validated.notes || null,
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
    return apiError(err.message || "Failed to post commission ledger", 500, "INTERNAL_ERROR");
  }
}
