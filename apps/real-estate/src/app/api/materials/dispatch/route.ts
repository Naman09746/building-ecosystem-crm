import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext } from "@repo/core/lib/server/supabase-server";
import { fetchDispatchChallans, createDispatchChallan } from "@repo/core/lib/server/dispatch-actions";

export async function GET(req: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    const orgId = auth?.orgId || "org-1";

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId") || undefined;

    const challans = await fetchDispatchChallans(orgId, orderId);
    return apiSuccess({ challans, count: challans.length });
  } catch (err: any) {
    console.error("[DISPATCH_GET_ERROR]", err);
    return apiError(err.message || "Failed to fetch dispatch challans", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    const orgId = auth?.orgId || "org-1";

    const body = await req.json();
    if (!body.orderId || !body.challanNumber || !body.locationName || !Array.isArray(body.items) || body.items.length === 0) {
      return apiError("orderId, challanNumber, locationName, and at least one item are required", 400);
    }

    const challan = await createDispatchChallan({
      orgId,
      orderId: body.orderId,
      challanNumber: body.challanNumber,
      vehicleNo: body.vehicleNo,
      driverName: body.driverName,
      driverPhone: body.driverPhone,
      locationName: body.locationName,
      notes: body.notes,
      items: body.items,
    });

    return apiSuccess({ challan }, 201);
  } catch (err: any) {
    console.error("[DISPATCH_POST_ERROR]", err);
    return apiError(err.message || "Failed to create dispatch challan", 500);
  }
}
