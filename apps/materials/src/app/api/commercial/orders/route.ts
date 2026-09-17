import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext } from "@repo/core/lib/server/supabase-server";
import { fetchOrders, createOrder } from "@repo/core/lib/server/commercial-actions";

export async function GET(req: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) return apiError("Authentication required", 401, "UNAUTHORIZED");
    const orgId = auth.orgId;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;

    const orders = await fetchOrders(orgId, status);
    return apiSuccess({ orders, count: orders.length });
  } catch (err: any) {
    console.error("[ORDERS_GET_ERROR]", err);
    return apiError(err.message || "Failed to fetch orders", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) return apiError("Authentication required", 401, "UNAUTHORIZED");
    const orgId = auth.orgId;

    const body = await req.json();
    if (!body.orderNumber || !Array.isArray(body.items) || body.items.length === 0) {
      return apiError("orderNumber and items array are required", 400);
    }

    const order = await createOrder({
      orgId,
      quoteId: body.quoteId,
      leadId: body.leadId,
      customerPersonId: body.customerPersonId,
      customerOrgId: body.customerOrgId,
      dealerId: body.dealerId,
      siteId: body.siteId,
      orderNumber: body.orderNumber,
      status: body.status || "confirmed",
      expectedDeliveryDate: body.expectedDeliveryDate,
      notes: body.notes,
      items: body.items,
    });

    return apiSuccess({ order }, 201);
  } catch (err: any) {
    console.error("[ORDERS_POST_ERROR]", err);
    return apiError(err.message || "Failed to create order", 500);
  }
}
