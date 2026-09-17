"use client";

import * as React from "react";
import { X, Plus, PackagePlus, Loader2 } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { toast } from "sonner";
import type { CatalogItem } from "@repo/core/types/commercial";

interface AddSkuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (item: CatalogItem) => void;
}

export function AddSkuModal({ isOpen, onClose, onSuccess }: AddSkuModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form State
  const [sku, setSku] = React.useState("");
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("cement");
  const [brand, setBrand] = React.useState("");
  const [uom, setUom] = React.useState("Bags");
  const [retailPrice, setRetailPrice] = React.useState("");
  const [wholesalePrice, setWholesalePrice] = React.useState("");
  const [moq, setMoq] = React.useState("100");
  const [initialStock, setInitialStock] = React.useState("1000");
  const [locationName, setLocationName] = React.useState("North Depot");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim() || !name.trim() || !uom.trim()) {
      toast.error("Please fill in all required fields (SKU, Name, UOM)");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create Catalog Item
      const res = await fetch("/api/catalog/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "material",
          sku: sku.trim().toUpperCase(),
          name: name.trim(),
          category,
          brand: brand.trim(),
          uom: uom.trim(),
          retailPrice: parseFloat(retailPrice) || 0,
          wholesalePrice: parseFloat(wholesalePrice) || 0,
          moq: parseFloat(moq) || 1,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to create catalog item");
      }

      const createdItem: CatalogItem = json.data.item;

      // 2. If initial stock is specified, record initial inventory movement
      const initStockQty = parseFloat(initialStock);
      if (initStockQty > 0 && createdItem.id) {
        await fetch("/api/materials/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            catalogItemId: createdItem.id,
            locationName: locationName.trim() || "Main Yard",
            quantityChange: initStockQty,
            movementType: "receipt",
            notes: "Initial stock intake on SKU registration",
          }),
        });
      }

      toast.success(`SKU ${createdItem.sku} created successfully`);
      onSuccess(createdItem);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to add SKU");
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
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Add Material SKU</h2>
              <p className="text-xs text-muted-foreground">Register a new product definition in the Shared Catalog</p>
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
                SKU Code <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. CEM-OPC53-AMBU"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                required
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs capitalize focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="cement">Cement</option>
                <option value="bricks">Bricks & AAC Blocks</option>
                <option value="marble">Marble & Granite</option>
                <option value="tiles">Tiles & Ceramics</option>
                <option value="steel">TMT Steel & Rebar</option>
                <option value="sanitaryware">Sanitaryware & Bath</option>
                <option value="other">Other Materials</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Material / Product Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Ambuja Plus Roof Special OPC 53 Grade Cement (50kg)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Brand / Manufacturer</label>
              <input
                type="text"
                placeholder="e.g. Ambuja Cements"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Unit of Measure (UOM) <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Bags, Pcs, Sq.Ft., Tonne"
                value={uom}
                onChange={(e) => setUom(e.target.value)}
                required
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Wholesale Rate (₹)</label>
              <input
                type="number"
                step="any"
                placeholder="380"
                value={wholesalePrice}
                onChange={(e) => setWholesalePrice(e.target.value)}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Retail Rate (₹)</label>
              <input
                type="number"
                step="any"
                placeholder="420"
                value={retailPrice}
                onChange={(e) => setRetailPrice(e.target.value)}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">MOQ</label>
              <input
                type="number"
                step="any"
                placeholder="100"
                value={moq}
                onChange={(e) => setMoq(e.target.value)}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Initial Physical Stock Intake */}
          <div className="p-3 bg-muted/40 border border-border/80 rounded-lg space-y-2">
            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span>📦 Initial Yard / Depot Stock</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Initial Quantity</label>
                <input
                  type="number"
                  step="any"
                  placeholder="1000"
                  value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value)}
                  className="w-full px-2.5 py-1 bg-background border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Stockyard Location</label>
                <input
                  type="text"
                  placeholder="North Depot / Yard A"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full px-2.5 py-1 bg-background border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving SKU...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Register SKU
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
