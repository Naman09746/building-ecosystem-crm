import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext } from "@repo/core/lib/server/supabase-server";
import { fetchInventoryStock, fetchInventoryMovements, recordInventoryMovement } from "@repo/core/lib/server/inventory-actions";

export async function GET(req: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    const orgId = auth?.orgId || "org-1";

    const { searchParams } = new URL(req.url);
    const catalogItemId = searchParams.get("catalogItemId") || undefined;
    const view = searchParams.get("view") || "stock"; // "stock" or "movements"

    if (view === "movements") {
      const movements = await fetchInventoryMovements(orgId, catalogItemId);
      return apiSuccess({ movements, count: movements.length });
    }

    const stock = await fetchInventoryStock(orgId, catalogItemId);
    return apiSuccess({ stock, count: stock.length });
  } catch (err: any) {
    console.error("[INVENTORY_GET_ERROR]", err);
    return apiError(err.message || "Failed to fetch inventory", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    const orgId = auth?.orgId || "org-1";

    const body = await req.json();
    if (!body.catalogItemId || !body.locationName || !body.quantityChange || !body.movementType) {
      return apiError("catalogItemId, locationName, quantityChange, and movementType are required", 400);
    }

    const movement = await recordInventoryMovement({
      orgId,
      catalogItemId: body.catalogItemId,
      locationName: body.locationName,
      batchLot: body.batchLot,
      quantityChange: Number(body.quantityChange),
      movementType: body.movementType,
      referenceId: body.referenceId,
      notes: body.notes,
    });

    return apiSuccess({ movement }, 201);
  } catch (err: any) {
    console.error("[INVENTORY_POST_ERROR]", err);
    return apiError(err.message || "Failed to record inventory movement", 500);
  }
}
