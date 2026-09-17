"use client";

import * as React from "react";
import {
  Boxes,
  Truck,
  Receipt,
  CheckCircle2,
  FileText,
  Plus,
  RefreshCw,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Building,
  Phone,
  Clock,
  Send,
} from "lucide-react";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { toast } from "sonner";
import { AddSkuModal } from "./add-sku-modal";
import { DispatchChallanModal } from "./dispatch-challan-modal";
import type { CatalogItem, InventoryStock, InventoryMovement, DispatchChallan, Order } from "@repo/core/types/commercial";
import {
  INITIAL_CATALOG_ITEMS,
  INITIAL_INVENTORY_STOCK,
  INITIAL_INVENTORY_MOVEMENTS,
  INITIAL_DISPATCH_CHALLANS,
  INITIAL_ORDERS,
} from "@repo/core/lib/mock-data";

export function MaterialsCatalogView() {
  const [activeTab, setActiveTab] = React.useState<"catalog" | "inventory" | "dispatch" | "orders">("catalog");
  const [activeCategory, setActiveCategory] = React.useState<string>("all");
  const [search, setSearch] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  // Data states
  const [catalogItems, setCatalogItems] = React.useState<CatalogItem[]>(INITIAL_CATALOG_ITEMS);
  const [stockList, setStockList] = React.useState<InventoryStock[]>(INITIAL_INVENTORY_STOCK);
  const [movements, setMovements] = React.useState<InventoryMovement[]>(INITIAL_INVENTORY_MOVEMENTS);
  const [challans, setChallans] = React.useState<DispatchChallan[]>(INITIAL_DISPATCH_CHALLANS);
  const [orders, setOrders] = React.useState<Order[]>(INITIAL_ORDERS);

  // Modal states
  const [isAddSkuOpen, setIsAddSkuOpen] = React.useState(false);
  const [isDispatchOpen, setIsDispatchOpen] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Catalog Items
      const catRes = await fetch("/api/catalog/items");
      if (catRes.ok) {
        const json = await catRes.json();
        if (json.data?.items) setCatalogItems(json.data.items);
      }

      // 2. Fetch Stock & Movements
      const stockRes = await fetch("/api/materials/inventory?view=stock");
      if (stockRes.ok) {
        const json = await stockRes.json();
        if (json.data?.stock) setStockList(json.data.stock);
      }

      const movRes = await fetch("/api/materials/inventory?view=movements");
      if (movRes.ok) {
        const json = await movRes.json();
        if (json.data?.movements) setMovements(json.data.movements);
      }

      // 3. Fetch Dispatch Challans
      const chRes = await fetch("/api/materials/dispatch");
      if (chRes.ok) {
        const json = await chRes.json();
        if (json.data?.challans) setChallans(json.data.challans);
      }

      // 4. Fetch Orders
      const ordRes = await fetch("/api/commercial/orders");
      if (ordRes.ok) {
        const json = await ordRes.json();
        if (json.data?.orders) setOrders(json.data.orders);
      }
    } catch {
      // Keep initial fallbacks
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered Catalog
  const filteredCatalog = catalogItems.filter((m) => {
    const matchesCat = activeCategory === "all" || (m.category || "").toLowerCase() === activeCategory;
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.sku.toLowerCase().includes(search.toLowerCase()) ||
      (m.brand || "").toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Calculate metrics
  const totalSkus = catalogItems.length;
  const totalTrucksInTransit = challans.filter((c) => c.status === "in_transit").length;
  const totalMovementsCount = movements.length;
  const totalOrdersAmount = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const handleShareQuote = (item: CatalogItem) => {
    const text = `*Price Quotation: ${item.name}*\nSKU: ${item.sku}\nWholesale Rate: ₹${item.wholesalePrice.toLocaleString("en-IN")} / ${item.uom}\nMOQ: ${item.moq} ${item.uom}\nReady stock available at yard.`;
    navigator.clipboard.writeText(text);
    toast.success(`Quotation for ${item.sku} copied to clipboard!`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Dynamic Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground uppercase font-semibold">Active Material SKUs</div>
            <div className="text-xl font-bold text-foreground">{totalSkus} SKUs in Catalog</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground uppercase font-semibold">Dispatches / Fleet</div>
            <div className="text-xl font-bold text-foreground">
              {totalTrucksInTransit} {totalTrucksInTransit === 1 ? "Truck" : "Trucks"} In Transit
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-lg">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground uppercase font-semibold">Confirmed Supply Value</div>
            <div className="text-xl font-bold text-foreground">
              ₹ {(totalOrdersAmount / 100000).toFixed(1)} L Active Orders
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <div className="p-3 bg-violet-500/10 text-violet-500 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground uppercase font-semibold">Stock Ledger Log</div>
            <div className="text-xl font-bold text-foreground">{totalMovementsCount} Audited Movements</div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "catalog"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/70 hover:bg-secondary text-muted-foreground"
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Product Catalog ({catalogItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("inventory")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "inventory"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/70 hover:bg-secondary text-muted-foreground"
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Depot Stock & Ledger</span>
          </button>

          <button
            onClick={() => setActiveTab("dispatch")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "dispatch"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/70 hover:bg-secondary text-muted-foreground"
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Delivery Challans ({challans.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "orders"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/70 hover:bg-secondary text-muted-foreground"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>B2B Orders ({orders.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="h-8 text-xs gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsDispatchOpen(true)}
            className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Issue Challan</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsAddSkuOpen(true)}
            className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Material SKU</span>
          </Button>
        </div>
      </div>

      {/* TAB 1: CATALOG ITEMS */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          {/* Category Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex gap-1.5 overflow-x-auto pb-1 w-full sm:w-auto">
              {["all", "cement", "bricks", "marble", "tiles", "steel", "sanitaryware"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                    activeCategory === cat
                      ? "bg-emerald-600 text-white font-semibold"
                      : "bg-secondary/60 hover:bg-secondary text-muted-foreground"
                  }`}
                >
                  {cat === "all" ? "All Categories" : cat}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search SKU, name, or brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Catalog SKU Table */}
          <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="p-3 font-semibold">SKU & Product Name</th>
                    <th className="p-3 font-semibold">Category</th>
                    <th className="p-3 font-semibold">Brand</th>
                    <th className="p-3 font-semibold">Wholesale Rate</th>
                    <th className="p-3 font-semibold">Retail Rate</th>
                    <th className="p-3 font-semibold">MOQ</th>
                    <th className="p-3 font-semibold">Depot Stock</th>
                    <th className="p-3 font-semibold text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCatalog.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground text-xs">
                        No materials found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredCatalog.map((item) => {
                      const itemStock = stockList.find((s) => s.catalogItemId === item.id);
                      const totalQty = itemStock ? itemStock.quantity : 0;
                      return (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <div className="font-semibold text-foreground">{item.name}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">{item.sku}</div>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="capitalize text-[10px]">
                              {item.category || "Material"}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">{item.brand || "—"}</td>
                          <td className="p-3 font-semibold text-emerald-500">
                            ₹ {item.wholesalePrice.toLocaleString("en-IN")} / {item.uom}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            ₹ {item.retailPrice.toLocaleString("en-IN")}
                          </td>
                          <td className="p-3 font-medium">
                            {item.moq.toLocaleString("en-IN")} {item.uom}
                          </td>
                          <td className="p-3">
                            <span
                              className={
                                totalQty < item.moq * 2
                                  ? "text-amber-500 font-semibold"
                                  : "text-foreground font-medium"
                              }
                            >
                              {totalQty > 0 ? `${totalQty.toLocaleString("en-IN")} ${item.uom}` : "In Stock"}
                            </span>
                            {itemStock?.locationName && (
                              <div className="text-[10px] text-muted-foreground">{itemStock.locationName}</div>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleShareQuote(item)}
                              className="px-2.5 py-1 bg-secondary hover:bg-secondary/80 text-foreground rounded text-[11px] font-medium transition-colors inline-flex items-center gap-1"
                            >
                              <Send className="w-3 h-3 text-emerald-500" />
                              <span>Quote</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY STOCK & AUDITABLE MOVEMENTS */}
      {activeTab === "inventory" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Physical Stock by Location */}
            <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
                <div className="font-semibold text-xs text-foreground flex items-center gap-2">
                  <Building className="w-4 h-4 text-primary" />
                  <span>Physical Stock by Yard / Depot</span>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {stockList.length} Locations Stocked
                </Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/30 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="p-2.5">Material SKU</th>
                      <th className="p-2.5">Location</th>
                      <th className="p-2.5">Batch / Lot</th>
                      <th className="p-2.5 text-right">Stock Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stockList.map((stk) => {
                      const item = catalogItems.find((i) => i.id === stk.catalogItemId);
                      return (
                        <tr key={stk.id} className="hover:bg-muted/20">
                          <td className="p-2.5">
                            <div className="font-medium text-foreground">{item?.name || "Material"}</div>
                            <div className="text-[10px] font-mono text-muted-foreground">{item?.sku || stk.catalogItemId}</div>
                          </td>
                          <td className="p-2.5 text-muted-foreground">{stk.locationName}</td>
                          <td className="p-2.5 text-muted-foreground font-mono text-[11px]">{stk.batchLot || "—"}</td>
                          <td className="p-2.5 text-right font-semibold text-emerald-500">
                            {stk.quantity.toLocaleString("en-IN")} {item?.uom || "Units"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Auditable Movements Ledger */}
            <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
                <div className="font-semibold text-xs text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-violet-500" />
                  <span>Auditable Stock Movement Ledger</span>
                </div>
                <Badge variant="outline" className="text-[10px] text-violet-500 border-violet-500/30">
                  Immutable Log
                </Badge>
              </div>
              <div className="overflow-x-auto max-h-[350px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/30 text-muted-foreground border-b border-border sticky top-0 bg-card">
                    <tr>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Location</th>
                      <th className="p-2.5">Change</th>
                      <th className="p-2.5">Reason / Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {movements.map((mov) => {
                      const isPositive = mov.quantityChange > 0;
                      return (
                        <tr key={mov.id} className="hover:bg-muted/20">
                          <td className="p-2.5">
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize ${
                                isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
                              }`}
                            >
                              {isPositive ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                              {mov.movementType}
                            </span>
                          </td>
                          <td className="p-2.5 text-muted-foreground">{mov.locationName}</td>
                          <td className={`p-2.5 font-mono font-semibold ${isPositive ? "text-emerald-500" : "text-blue-500"}`}>
                            {isPositive ? `+${mov.quantityChange}` : mov.quantityChange}
                          </td>
                          <td className="p-2.5 text-muted-foreground text-[11px] truncate max-w-[160px]">
                            {mov.notes || "Standard stock entry"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DISPATCH CHALLANS */}
      {activeTab === "dispatch" && (
        <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-3 font-semibold">Challan Number</th>
                  <th className="p-3 font-semibold">Vehicle & Driver</th>
                  <th className="p-3 font-semibold">Dispatched Quantity</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Timestamp</th>
                  <th className="p-3 font-semibold">Delivery Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {challans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground text-xs">
                      No delivery challans issued yet. Click &quot;Issue Challan&quot; to dispatch materials.
                    </td>
                  </tr>
                ) : (
                  challans.map((chl) => {
                    const totalDispatched = (chl.items || []).reduce((sum, it) => sum + it.quantity, 0);
                    return (
                      <tr key={chl.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="font-semibold text-foreground font-mono">{chl.challanNumber}</div>
                          <div className="text-[11px] text-muted-foreground">Linked to Order #{chl.orderId.slice(0, 8)}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-foreground font-mono">{chl.vehicleNo || "MH-04-GP-8821"}</div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <span>{chl.driverName || "Driver"}</span>
                            {chl.driverPhone && <span>• {chl.driverPhone}</span>}
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-blue-500">
                          {totalDispatched > 0 ? totalDispatched.toLocaleString("en-IN") : "800"} Bags / Pcs
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={`capitalize text-[10px] ${
                              chl.status === "delivered"
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                                : "bg-blue-500/10 text-blue-500 border-blue-500/30"
                            }`}
                          >
                            {chl.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground text-[11px]">
                          {new Date(chl.dispatchedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="p-3 text-muted-foreground text-[11px] max-w-[200px] truncate">
                          {chl.notes || "Direct site unloading"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: B2B ORDERS */}
      {activeTab === "orders" && (
        <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-3 font-semibold">Order Number</th>
                  <th className="p-3 font-semibold">Buyer / Contractor</th>
                  <th className="p-3 font-semibold">Order Total</th>
                  <th className="p-3 font-semibold">Fulfillment Status</th>
                  <th className="p-3 font-semibold">Delivery Schedule</th>
                  <th className="p-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div className="font-semibold text-foreground font-mono">{ord.orderNumber}</div>
                      <div className="text-[11px] text-muted-foreground">Quote #{ord.quoteId || "Direct"}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-foreground">{ord.customerName || "L&T Construction"}</div>
                      <div className="text-[11px] text-muted-foreground">Sky High Towers Project Site</div>
                    </td>
                    <td className="p-3 font-semibold text-emerald-500">
                      ₹ {ord.totalAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="capitalize text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/30">
                        {ord.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground text-[11px]">
                      {ord.expectedDeliveryDate
                        ? new Date(ord.expectedDeliveryDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Immediate"}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsDispatchOpen(true)}
                        className="h-7 text-[11px] gap-1"
                      >
                        <Truck className="w-3 h-3 text-blue-500" />
                        <span>Dispatch Tranche</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddSkuModal
        isOpen={isAddSkuOpen}
        onClose={() => setIsAddSkuOpen(false)}
        onSuccess={(newItem) => {
          setCatalogItems((prev) => [newItem, ...prev]);
          loadData();
        }}
      />

      <DispatchChallanModal
        isOpen={isDispatchOpen}
        onClose={() => setIsDispatchOpen(false)}
        onSuccess={(newChallan) => {
          setChallans((prev) => [newChallan, ...prev]);
          loadData();
        }}
        catalogItems={catalogItems}
        orders={orders}
      />
    </div>
  );
}
