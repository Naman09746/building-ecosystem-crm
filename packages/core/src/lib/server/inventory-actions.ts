import { getAuthenticatedServerClient, getServiceRoleClient, isLiveSupabaseAvailable } from "./supabase-server";
import type { InventoryStock, InventoryMovement, InventoryMovementType } from "../../types/commercial";

export interface RecordMovementInput {
  orgId: string;
  catalogItemId: string;
  locationName: string;
  batchLot?: string;
  quantityChange: number; // positive for receipt, negative for dispatch/adjustment
  movementType: InventoryMovementType;
  referenceId?: string;
  notes?: string;
}

import { INITIAL_INVENTORY_STOCK, INITIAL_INVENTORY_MOVEMENTS } from "../mock-data";

let inMemoryStock: InventoryStock[] = [...INITIAL_INVENTORY_STOCK];
let inMemoryMovements: InventoryMovement[] = [...INITIAL_INVENTORY_MOVEMENTS];

export async function fetchInventoryStock(orgId?: string, catalogItemId?: string): Promise<InventoryStock[]> {
  const supabase = await getAuthenticatedServerClient() || getServiceRoleClient();

  if (supabase && isLiveSupabaseAvailable) {
    let query = supabase.from("inventory_stock").select("*, catalog_item:catalog_item_id(*)");
    if (orgId) query = query.eq("org_id", orgId);
    if (catalogItemId) query = query.eq("catalog_item_id", catalogItemId);

    const { data, error } = await query.order("location_name", { ascending: true });
    if (!error && data) {
      return data.map((d: any) => ({
        id: d.id,
        orgId: d.org_id,
        catalogItemId: d.catalog_item_id,
        locationName: d.location_name,
        batchLot: d.batch_lot,
        quantity: Number(d.quantity),
        lastUpdated: d.last_updated,
        catalogItem: d.catalog_item ? {
          id: d.catalog_item.id,
          orgId: d.catalog_item.org_id,
          type: d.catalog_item.type,
          sku: d.catalog_item.sku,
          name: d.catalog_item.name,
          category: d.catalog_item.category,
          brand: d.catalog_item.brand,
          uom: d.catalog_item.uom,
          retailPrice: Number(d.catalog_item.retail_price),
          wholesalePrice: Number(d.catalog_item.wholesale_price),
          moq: Number(d.catalog_item.moq),
          specs: d.catalog_item.specs,
          isActive: d.catalog_item.is_active,
          createdAt: d.catalog_item.created_at,
          updatedAt: d.catalog_item.updated_at,
        } : undefined,
      }));
    }
  }

  // In-memory fallback
  return inMemoryStock.filter((s) => {
    if (orgId && s.orgId !== orgId) return false;
    if (catalogItemId && s.catalogItemId !== catalogItemId) return false;
    return true;
  });
}

export async function fetchInventoryMovements(orgId?: string, catalogItemId?: string): Promise<InventoryMovement[]> {
  const supabase = await getAuthenticatedServerClient() || getServiceRoleClient();

  if (supabase && isLiveSupabaseAvailable) {
    let query = supabase.from("inventory_movements").select("*, catalog_item:catalog_item_id(sku, name, uom)");
    if (orgId) query = query.eq("org_id", orgId);
    if (catalogItemId) query = query.eq("catalog_item_id", catalogItemId);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (!error && data) {
      return data.map((d: any) => ({
        id: d.id,
        orgId: d.org_id,
        catalogItemId: d.catalog_item_id,
        locationName: d.location_name,
        batchLot: d.batch_lot,
        quantityChange: Number(d.quantity_change),
        movementType: d.movement_type,
        referenceId: d.reference_id,
        notes: d.notes,
        createdAt: d.created_at,
      }));
    }
  }

  // In-memory fallback
  return inMemoryMovements.filter((m) => {
    if (orgId && m.orgId !== orgId) return false;
    if (catalogItemId && m.catalogItemId !== catalogItemId) return false;
    return true;
  });
}

export async function recordInventoryMovement(input: RecordMovementInput): Promise<InventoryMovement> {
  const supabase = await getAuthenticatedServerClient() || getServiceRoleClient();

  if (supabase && isLiveSupabaseAvailable) {
    // 1. Insert Movement in auditable ledger
    const { data: movement, error: movError } = await supabase
      .from("inventory_movements")
      .insert({
        org_id: input.orgId,
        catalog_item_id: input.catalogItemId,
        location_name: input.locationName,
        batch_lot: input.batchLot,
        quantity_change: input.quantityChange,
        movement_type: input.movementType,
        reference_id: input.referenceId,
        notes: input.notes,
      })
      .select()
      .single();

    if (movError) {
      throw new Error(`Failed to record inventory movement: ${movError.message}`);
    }

    // 2. Upsert / update inventory_stock for this location & lot
    const { data: existingStock } = await supabase
      .from("inventory_stock")
      .select("*")
      .eq("org_id", input.orgId)
      .eq("catalog_item_id", input.catalogItemId)
      .eq("location_name", input.locationName)
      .maybeSingle();

    if (existingStock) {
      const newQty = Math.max(0, Number(existingStock.quantity) + input.quantityChange);
      await supabase
        .from("inventory_stock")
        .update({
          quantity: newQty,
          last_updated: new Date().toISOString(),
        })
        .eq("id", existingStock.id);
    } else {
      await supabase
        .from("inventory_stock")
        .insert({
          org_id: input.orgId,
          catalog_item_id: input.catalogItemId,
          location_name: input.locationName,
          batch_lot: input.batchLot,
          quantity: Math.max(0, input.quantityChange),
          last_updated: new Date().toISOString(),
        });
    }

    return {
      id: movement.id,
      orgId: movement.org_id,
      catalogItemId: movement.catalog_item_id,
      locationName: movement.location_name,
      batchLot: movement.batch_lot,
      quantityChange: Number(movement.quantity_change),
      movementType: movement.movement_type,
      referenceId: movement.reference_id,
      notes: movement.notes,
      createdAt: movement.created_at,
    };
  }

  // In-memory fallback
  const newMov: InventoryMovement = {
    id: `mov-${Date.now()}`,
    orgId: input.orgId,
    catalogItemId: input.catalogItemId,
    locationName: input.locationName,
    batchLot: input.batchLot,
    quantityChange: input.quantityChange,
    movementType: input.movementType,
    referenceId: input.referenceId,
    notes: input.notes,
    createdAt: new Date().toISOString(),
  };
  inMemoryMovements.unshift(newMov);

  const existing = inMemoryStock.find(
    (s) => s.catalogItemId === input.catalogItemId && s.locationName === input.locationName
  );
  if (existing) {
    existing.quantity = Math.max(0, existing.quantity + input.quantityChange);
    existing.lastUpdated = new Date().toISOString();
  } else {
    inMemoryStock.push({
      id: `stk-${Date.now()}`,
      orgId: input.orgId,
      catalogItemId: input.catalogItemId,
      locationName: input.locationName,
      batchLot: input.batchLot,
      quantity: Math.max(0, input.quantityChange),
      lastUpdated: new Date().toISOString(),
    });
  }

  return newMov;
}
