import { describe, it, expect, beforeEach } from "vitest";
import { fetchCatalogItems, createCatalogItem } from "@repo/core/lib/server/catalog-actions";
import { fetchInventoryStock, fetchInventoryMovements, recordInventoryMovement } from "@repo/core/lib/server/inventory-actions";
import { fetchOrders, createOrder } from "@repo/core/lib/server/commercial-actions";
import { fetchDispatchChallans, createDispatchChallan } from "@repo/core/lib/server/dispatch-actions";

describe("Commercial Core & Building Materials Domain", () => {
  const orgId = "test-org-1";

  it("creates and retrieves a new Material SKU in shared core catalog", async () => {
    const newItem = await createCatalogItem({
      orgId,
      sku: `CEM-TEST-${Date.now()}`,
      name: "UltraTech Super Weather Shield Cement",
      category: "cement",
      brand: "UltraTech",
      uom: "Bags",
      retailPrice: 450,
      wholesalePrice: 410,
      moq: 150,
      specs: { weatherProof: true },
    });

    expect(newItem).toBeDefined();
    expect(newItem.id).toBeTruthy();
    expect(newItem.retailPrice).toBe(450);
    expect(newItem.wholesalePrice).toBe(410);

    const items = await fetchCatalogItems({ orgId, category: "cement" });
    const found = items.find((i) => i.id === newItem.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe("UltraTech Super Weather Shield Cement");
  });

  it("records inventory stock and immutable movement ledger entry", async () => {
    const catalogItem = await createCatalogItem({
      orgId,
      sku: `BRK-TEST-${Date.now()}`,
      name: "High Density AAC Blocks 600x200x150",
      category: "bricks",
      uom: "Pcs",
      retailPrice: 65,
      wholesalePrice: 52,
      moq: 1000,
    });

    // 1. Initial Receipt Movement (+2000 Pcs)
    const mov = await recordInventoryMovement({
      orgId,
      catalogItemId: catalogItem.id,
      locationName: "South Kiln Yard",
      batchLot: "LOT-AAC-01",
      quantityChange: 2000,
      movementType: "receipt",
      notes: "Initial factory production batch",
    });

    expect(mov.id).toBeTruthy();
    expect(mov.quantityChange).toBe(2000);

    // 2. Check stock level
    const stockList = await fetchInventoryStock(orgId, catalogItem.id);
    const stock = stockList.find((s) => s.catalogItemId === catalogItem.id && s.locationName === "South Kiln Yard");
    expect(stock).toBeDefined();
    expect(stock?.quantity).toBe(2000);

    // 3. Check movement ledger
    const movements = await fetchInventoryMovements(orgId, catalogItem.id);
    expect(movements.length).toBeGreaterThanOrEqual(1);
    expect(movements[0].movementType).toBe("receipt");
  });

  it("creates a B2B Commercial Order and issues a Delivery Challan with automated inventory reduction", async () => {
    // 1. Create SKU
    const item = await createCatalogItem({
      orgId,
      sku: `STL-TEST-${Date.now()}`,
      name: "Jindal Panther 550D TMT Rebar (16mm)",
      category: "steel",
      uom: "Tonne",
      retailPrice: 72000,
      wholesalePrice: 66000,
      moq: 5,
    });

    // 2. Seed stock (+50 Tonne)
    await recordInventoryMovement({
      orgId,
      catalogItemId: item.id,
      locationName: "Central Steel Yard",
      quantityChange: 50,
      movementType: "receipt",
      notes: "Mill delivery",
    });

    // 3. Create Commercial Order (for 20 Tonne)
    const order = await createOrder({
      orgId,
      orderNumber: `ORD-TEST-${Date.now()}`,
      items: [
        {
          catalogItemId: item.id,
          quantity: 20,
          unitPrice: 66000,
          notes: "Phase 1 foundation supply",
        },
      ],
    });

    expect(order.totalAmount).toBe(1320000);
    expect(order.items?.length).toBe(1);

    // 4. Issue Delivery Challan for Partial Dispatch (10 Tonne)
    const challan = await createDispatchChallan({
      orgId,
      orderId: order.id,
      challanNumber: `DC-TEST-${Date.now()}`,
      vehicleNo: "DL-01-AB-1234",
      driverName: "Suraj Pal",
      driverPhone: "+91 98111 22334",
      locationName: "Central Steel Yard",
      notes: "Morning delivery - Tranche 1",
      items: [
        {
          orderItemId: order.items![0].id,
          catalogItemId: item.id,
          quantity: 10,
        },
      ],
    });

    expect(challan.id).toBeTruthy();
    expect(challan.status).toBe("in_transit");

    // 5. Verify stock was decremented from 50 to 40
    const updatedStock = await fetchInventoryStock(orgId, item.id);
    const yardStock = updatedStock.find((s) => s.locationName === "Central Steel Yard");
    expect(yardStock?.quantity).toBe(40);

    // 6. Verify movement ledger logged negative quantity dispatch
    const updatedMovements = await fetchInventoryMovements(orgId, item.id);
    const dispatchMov = updatedMovements.find((m) => m.movementType === "dispatch");
    expect(dispatchMov).toBeDefined();
    expect(dispatchMov?.quantityChange).toBe(-10);
  });
});
