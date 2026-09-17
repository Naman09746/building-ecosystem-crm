import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext, MANAGER_ROLES, getServiceRoleClient, isLiveSupabaseAvailable } from "@repo/core/lib/server/supabase-server";
import { createRefundSchema } from "@repo/core/lib/server/validations";
import { createProviderRefund } from "@repo/core/lib/server/billing-provider";

// POST /api/billing/refunds - Request full or partial refund for a paid invoice
export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }
  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Only managers and owners can issue billing refunds", 403, "FORBIDDEN");
  }

  const supabase = getServiceRoleClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiSuccess({ message: "Refund processed (Simulated Mode)", refundId: `sim_rf_${Date.now()}` }, 200);
  }

  try {
    const parsed = createRefundSchema.parse(await req.json());

    // 1. Fetch target invoice and verify tenant ownership
    const { data: invoice } = await supabase
      .from("billing_invoices")
      .select("*")
      .eq("id", parsed.invoiceId)
      .eq("org_id", auth.orgId)
      .single();

    if (!invoice) {
      return apiError("Invoice not found or does not belong to organization", 404, "NOT_FOUND");
    }

    if (invoice.status !== "paid" && invoice.status !== "partially_refunded") {
      return apiError(`Cannot refund invoice with status '${invoice.status}'`, 400, "INVALID_INVOICE_STATUS");
    }

    // 2. Check total refunded amount so far
    const { data: existingRefunds } = await supabase
      .from("billing_refunds")
      .select("amount, status")
      .eq("invoice_id", invoice.id)
      .in("status", ["succeeded", "processing", "pending"]);

    const totalRefunded = (existingRefunds || []).reduce((sum, r) => sum + Number(r.amount), 0);
    const invoiceTotal = Number(invoice.amount);
    const refundableAmount = invoiceTotal - totalRefunded;

    if (parsed.amount > refundableAmount) {
      return apiError(
        `Refund amount (₹${parsed.amount}) exceeds remaining refundable balance (₹${refundableAmount})`,
        400,
        "REFUND_AMOUNT_EXCEEDED"
      );
    }

    // 3. Execute refund via payment provider
    const refundResult = await createProviderRefund(
      invoice.provider,
      invoice.provider_payment_id || invoice.id,
      parsed.amount,
      parsed.reason
    );

    if (!refundResult.ok) {
      return apiError(refundResult.error || "Payment provider refund execution failed", 500, "PROVIDER_REFUND_FAILED");
    }

    // 4. Insert refund record
    const { data: refundRecord, error: insertErr } = await supabase
      .from("billing_refunds")
      .insert({
        org_id: auth.orgId,
        invoice_id: invoice.id,
        provider: invoice.provider,
        provider_refund_id: refundResult.refundId,
        amount: parsed.amount,
        currency: invoice.currency,
        status: refundResult.status,
        reason: parsed.reason,
        requested_by: auth.userId,
        completed_at: refundResult.status === "succeeded" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("[REFUND_INSERT_ERROR]", insertErr);
    }

    // 5. Update invoice status
    const newTotalRefunded = totalRefunded + parsed.amount;
    const newInvoiceStatus = newTotalRefunded >= invoiceTotal ? "refunded" : "partially_refunded";

    await supabase
      .from("billing_invoices")
      .update({ status: newInvoiceStatus })
      .eq("id", invoice.id);

    return apiSuccess(
      {
        message: "Refund processed successfully",
        refund: refundRecord,
        newInvoiceStatus,
      },
      200
    );
  } catch (err: any) {
    if (err && typeof err === "object" && "issues" in err) {
      return apiError("Invalid refund payload", 422, "VALIDATION_ERROR", err.issues);
    }
    return apiError(err.message || "Failed to process refund", 500, "SERVER_ERROR");
  }
}

// GET /api/billing/refunds - List all refunds for caller's organization
export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const supabase = getServiceRoleClient();
  if (!supabase || !isLiveSupabaseAvailable) {
    return apiSuccess([], 200);
  }

  const { data: refunds } = await supabase
    .from("billing_refunds")
    .select("*, billing_invoices(invoice_number, amount, paid_at)")
    .eq("org_id", auth.orgId)
    .order("requested_at", { ascending: false });

  return apiSuccess(refunds || [], 200);
}
