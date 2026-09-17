import { getAuthenticatedServerClient, getServiceRoleClient, isLiveSupabaseAvailable } from "./supabase-server";
import type { DispatchChallan, DispatchChallanStatus } from "../../types/commercial";
import { recordInventoryMovement } from "./inventory-actions";

export interface CreateDispatchChallanInput {
  orgId: string;
  orderId: string;
  challanNumber: string;
  vehicleNo?: string;
  driverName?: string;
  driverPhone?: string;
  locationName: string;
  notes?: string;
  items: Array<{
    orderItemId: string;
    catalogItemId: string;
    quantity: number;
  }>;
}

import { INITIAL_DISPATCH_CHALLANS } from "../mock-data";

let inMemoryChallans: DispatchChallan[] = [...INITIAL_DISPATCH_CHALLANS];

export async function fetchDispatchChallans(orgId?: string, orderId?: string): Promise<DispatchChallan[]> {
  const supabase = await getAuthenticatedServerClient() || getServiceRoleClient();

  if (supabase && isLiveSupabaseAvailable) {
    let query = supabase
      .from("dispatch_challans")
      .select("*, order:order_id(order_number, total_amount), items:dispatch_items(*, catalog_item:catalog_item_id(*))");
    if (orgId) query = query.eq("org_id", orgId);
    if (orderId) query = query.eq("order_id", orderId);

    const { data, error } = await query.order("dispatched_at", { ascending: false });
    if (!error && data) {
      return data.map((c: any) => ({
        id: c.id,
        orgId: c.org_id,
        orderId: c.order_id,
        challanNumber: c.challan_number,
        vehicleNo: c.vehicle_no,
        driverName: c.driver_name,
        driverPhone: c.driver_phone,
        status: c.status,
        dispatchedAt: c.dispatched_at,
        deliveredAt: c.delivered_at,
        notes: c.notes,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        order: c.order ? {
          orderNumber: c.order.order_number,
          totalAmount: Number(c.order.total_amount),
        } as any : undefined,
        items: (c.items || []).map((it: any) => ({
          id: it.id,
          challanId: it.challan_id,
          orderItemId: it.order_item_id,
          catalogItemId: it.catalog_item_id,
          quantity: Number(it.quantity),
          catalogItem: it.catalog_item ? {
            sku: it.catalog_item.sku,
            name: it.catalog_item.name,
            uom: it.catalog_item.uom,
          } as any : undefined,
        })),
      }));
    }
  }

  // In-memory fallback
  return inMemoryChallans.filter((c) => {
    if (orgId && c.orgId !== orgId) return false;
    if (orderId && c.orderId !== orderId) return false;
    return true;
  });
}

export async function createDispatchChallan(input: CreateDispatchChallanInput): Promise<DispatchChallan> {
  const supabase = await getAuthenticatedServerClient() || getServiceRoleClient();

  if (supabase && isLiveSupabaseAvailable) {
    // 1. Create dispatch challan
    const { data: challan, error: chErr } = await supabase
      .from("dispatch_challans")
      .insert({
        org_id: input.orgId,
        order_id: input.orderId,
        challan_number: input.challanNumber,
        vehicle_no: input.vehicleNo,
        driver_name: input.driverName,
        driver_phone: input.driverPhone,
        status: "in_transit",
        dispatched_at: new Date().toISOString(),
        notes: input.notes,
      })
      .select()
      .single();

    if (chErr) throw new Error(`Failed to create dispatch challan: ${chErr.message}`);

    // 2. Insert items
    if (input.items.length > 0) {
      const itemsToInsert = input.items.map((it) => ({
        challan_id: challan.id,
        order_item_id: it.orderItemId,
        catalog_item_id: it.catalogItemId,
        quantity: it.quantity,
      }));
      await supabase.from("dispatch_items").insert(itemsToInsert);

      // 3. Update order items fulfilled_quantity & inventory movements
      for (const it of input.items) {
        // Record inventory movement (reduction)
        await recordInventoryMovement({
          orgId: input.orgId,
          catalogItemId: it.catalogItemId,
          locationName: input.locationName,
          quantityChange: -it.quantity,
          movementType: "dispatch",
          referenceId: challan.id,
          notes: `Dispatched on Challan ${input.challanNumber}`,
        });

        // Update order_item fulfilled quantity
        const { data: orderItem } = await supabase
          .from("order_items")
          .select("fulfilled_quantity, quantity")
          .eq("id", it.orderItemId)
          .single();

        if (orderItem) {
          const updatedFulfilled = Number(orderItem.fulfilled_quantity || 0) + it.quantity;
          await supabase
            .from("order_items")
            .update({ fulfilled_quantity: updatedFulfilled })
            .eq("id", it.orderItemId);
        }
      }
    }

    return {
      id: challan.id,
      orgId: challan.org_id,
      orderId: challan.order_id,
      challanNumber: challan.challan_number,
      vehicleNo: challan.vehicle_no,
      driverName: challan.driver_name,
      driverPhone: challan.driver_phone,
      status: challan.status,
      dispatchedAt: challan.dispatched_at,
      notes: challan.notes,
      createdAt: challan.created_at,
      updatedAt: challan.updated_at,
      items: input.items.map((it, idx) => ({
        id: `chli-${Date.now()}-${idx}`,
        challanId: challan.id,
        orderItemId: it.orderItemId,
        catalogItemId: it.catalogItemId,
        quantity: it.quantity,
      })),
    };
  }

  // In-memory fallback
  const newChallan: DispatchChallan = {
    id: `chl-${Date.now()}`,
    orgId: input.orgId,
    orderId: input.orderId,
    challanNumber: input.challanNumber,
    vehicleNo: input.vehicleNo,
    driverName: input.driverName,
    driverPhone: input.driverPhone,
    status: "in_transit",
    dispatchedAt: new Date().toISOString(),
    notes: input.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: input.items.map((it, idx) => ({
      id: `chli-${Date.now()}-${idx}`,
      challanId: `chl-${Date.now()}`,
      orderItemId: it.orderItemId,
      catalogItemId: it.catalogItemId,
      quantity: it.quantity,
    })),
  };

  // Record movements & adjust stock
  for (const it of input.items) {
    await recordInventoryMovement({
      orgId: input.orgId,
      catalogItemId: it.catalogItemId,
      locationName: input.locationName,
      quantityChange: -it.quantity,
      movementType: "dispatch",
      referenceId: newChallan.id,
      notes: `Dispatched on Challan ${input.challanNumber}`,
    });
  }

  inMemoryChallans.unshift(newChallan);
  return newChallan;
}

export async function updateChallanStatus(id: string, status: DispatchChallanStatus): Promise<boolean> {
  const supabase = await getAuthenticatedServerClient() || getServiceRoleClient();

  if (supabase && isLiveSupabaseAvailable) {
    const updatePayload: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === "delivered") {
      updatePayload.delivered_at = new Date().toISOString();
    }
    const { error } = await supabase.from("dispatch_challans").update(updatePayload).eq("id", id);
    return !error;
  }

  const challan = inMemoryChallans.find((c) => c.id === id);
  if (challan) {
    challan.status = status;
    if (status === "delivered") challan.deliveredAt = new Date().toISOString();
    challan.updatedAt = new Date().toISOString();
    return true;
  }
  return false;
}
