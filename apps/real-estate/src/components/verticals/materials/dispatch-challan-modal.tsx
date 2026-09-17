"use client";

import * as React from "react";
import { X, Truck, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { toast } from "sonner";
import type { CatalogItem, Order, DispatchChallan } from "@repo/core/types/commercial";

interface DispatchChallanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (challan: DispatchChallan) => void;
  catalogItems: CatalogItem[];
  orders: Order[];
}

export function DispatchChallanModal({
  isOpen,
  onClose,
  onSuccess,
  catalogItems,
  orders,
}: DispatchChallanModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form State
  const [selectedOrderId, setSelectedOrderId] = React.useState(orders[0]?.id || "");
  const [challanNumber, setChallanNumber] = React.useState(`DC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [vehicleNo, setVehicleNo] = React.useState("MH-04-GP-8821");
  const [driverName, setDriverName] = React.useState("Ramesh Yadav");
  const [driverPhone, setDriverPhone] = React.useState("+91 98201 12345");
  const [locationName, setLocationName] = React.useState("North Depot");
  const [selectedItemId, setSelectedItemId] = React.useState(catalogItems[0]?.id || "");
  const [dispatchQty, setDispatchQty] = React.useState("500");
  const [notes, setNotes] = React.useState("Direct site delivery - Gate 2 Unloading");

  React.useEffect(() => {
    if (orders.length > 0 && !selectedOrderId) {
      setSelectedOrderId(orders[0].id);
    }
    if (catalogItems.length > 0 && !selectedItemId) {
      setSelectedItemId(catalogItems[0].id);
    }
  }, [orders, catalogItems, selectedOrderId, selectedItemId]);

  if (!isOpen) return null;

  const currentOrder = orders.find((o) => o.id === selectedOrderId) || orders[0];
  const currentCatalogItem = catalogItems.find((i) => i.id === selectedItemId) || catalogItems[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(dispatchQty);
    if (!qty || qty <= 0) {
      toast.error("Please enter a valid dispatch quantity greater than 0");
      return;
    }

    setIsSubmitting(true);
    try {
      const orderItemId = currentOrder?.items?.[0]?.id || `ordi-${Date.now()}`;
      const catalogItemId = currentCatalogItem?.id || catalogItems[0]?.id || "cat-1";

      const res = await fetch("/api/materials/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrderId || currentOrder?.id || "ord-501",
          challanNumber: challanNumber.trim().toUpperCase(),
          vehicleNo: vehicleNo.trim().toUpperCase(),
          driverName: driverName.trim(),
          driverPhone: driverPhone.trim(),
          locationName: locationName.trim(),
          notes: notes.trim(),
          items: [
            {
              orderItemId,
              catalogItemId,
              quantity: qty,
            },
          ],
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to generate dispatch challan");
      }

      toast.success(`Challan ${json.data.challan.challanNumber} issued for ${qty} ${currentCatalogItem?.uom || 'units'}`);
      onSuccess(json.data.challan);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to issue dispatch challan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Issue Delivery Challan</h2>
              <p className="text-xs text-muted-foreground">Authorize site dispatch and record stock movement</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Challan Number <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={challanNumber}
                onChange={(e) => setChallanNumber(e.target.value)}
                required
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Link Order</label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber} ({o.customerName || "B2B Buyer"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Material SKU</label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {catalogItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Dispatch Quantity ({currentCatalogItem?.uom || "Units"}) <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                step="any"
                placeholder="500"
                value={dispatchQty}
                onChange={(e) => setDispatchQty(e.target.value)}
                required
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary font-semibold text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Truck / Vehicle No <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. MH-04-GP-8821"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                required
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Stock Depot / Yard</label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                required
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Driver Full Name</label>
              <input
                type="text"
                placeholder="Driver Name"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Driver Phone</label>
              <input
                type="text"
                placeholder="+91 98200 00000"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Site Delivery Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Unload at Tower C basement entry, test cubes collected"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating Challan...
                </>
              ) : (
                <>
                  <Truck className="w-3.5 h-3.5" />
                  Issue & Dispatch
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
