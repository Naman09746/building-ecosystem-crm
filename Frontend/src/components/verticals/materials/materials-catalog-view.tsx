"use client";

import * as React from "react";
import { Boxes, Truck, Receipt, CheckCircle2, PhoneCall, AlertCircle, FileText, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MaterialItem {
  id: string;
  sku: string;
  name: string;
  category: "cement" | "bricks" | "marble" | "tiles" | "sanitaryware" | "steel";
  unit: string;
  retailPrice: number;
  wholesalePrice: number;
  moq: number;
  stockQty: number;
  location: string;
}

const SAMPLE_MATERIALS: MaterialItem[] = [
  { id: "mat-1", sku: "CEM-OPC53-ULTR", name: "UltraTech OPC 53 Grade Cement (50kg Bag)", category: "cement", unit: "Bags", retailPrice: 420, wholesalePrice: 385, moq: 200, stockQty: 2400, location: "North Depot" },
  { id: "mat-2", sku: "BRK-RED-CLAY-01", name: "Grade-1 Machine-Pressed Red Clay Bricks", category: "bricks", unit: "Pcs", retailPrice: 10.5, wholesalePrice: 8.8, moq: 5000, stockQty: 85000, location: "Kiln Yard 3" },
  { id: "mat-3", sku: "MRB-ITL-STAT-18", name: "Italian Statuario Marble Slabs (18mm)", category: "marble", unit: "Sq.Ft.", retailPrice: 850, wholesalePrice: 720, moq: 500, stockQty: 4200, location: "Import Yard A" },
  { id: "mat-4", sku: "TIL-GVT-600X1200", name: "Kajaria 600x1200mm Glazed Vitrified Tiles", category: "tiles", unit: "Boxes", retailPrice: 1100, wholesalePrice: 940, moq: 50, stockQty: 620, location: "Central Warehouse" },
  { id: "mat-5", sku: "STL-TMT-550D-12", name: "Tata Tiscon 550D TMT Rebar (12mm)", category: "steel", unit: "Tonne", retailPrice: 68500, wholesalePrice: 64200, moq: 2, stockQty: 18, location: "Steel Stockyard" },
];

export function MaterialsCatalogView() {
  const [activeCategory, setActiveCategory] = React.useState<string>("all");
  const [search, setSearch] = React.useState("");

  const filtered = SAMPLE_MATERIALS.filter((m) => {
    const matchesCat = activeCategory === "all" || m.category === activeCategory;
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.sku.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase font-medium">Active SKUs</div>
            <div className="text-xl font-bold">148 SKUs</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase font-medium">Dispatches Today</div>
            <div className="text-xl font-bold">8 Trucks En Route</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-lg">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase font-medium">Contractor Credit</div>
            <div className="text-xl font-bold">₹ 42.6 L Outstanding</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-violet-500/10 text-violet-500 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase font-medium">Samples Pending</div>
            <div className="text-xl font-bold">5 Samples Dispatched</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1 w-full sm:w-auto">
          {["all", "cement", "bricks", "marble", "tiles", "steel"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80 text-muted-foreground"
              }`}
            >
              {cat === "all" ? "All Materials" : cat}
            </button>
          ))}
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search SKU or material..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 bg-background border border-border rounded-lg text-xs w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors whitespace-nowrap">
            <Plus className="w-3.5 h-3.5" /> Add Material SKU
          </button>
        </div>
      </div>

      {/* Materials SKU Table */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3 font-semibold">SKU & Item Name</th>
                <th className="p-3 font-semibold">Category</th>
                <th className="p-3 font-semibold">Wholesale Rate</th>
                <th className="p-3 font-semibold">Retail Rate</th>
                <th className="p-3 font-semibold">MOQ</th>
                <th className="p-3 font-semibold">Stock Available</th>
                <th className="p-3 font-semibold">Depot / Yard</th>
                <th className="p-3 font-semibold text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <div className="font-semibold text-foreground">{item.name}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">{item.sku}</div>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="capitalize text-[10px]">
                      {item.category}
                    </Badge>
                  </td>
                  <td className="p-3 font-semibold text-emerald-500">
                    ₹ {item.wholesalePrice.toLocaleString("en-IN")} / {item.unit}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    ₹ {item.retailPrice.toLocaleString("en-IN")}
                  </td>
                  <td className="p-3 font-medium">
                    {item.moq.toLocaleString("en-IN")} {item.unit}
                  </td>
                  <td className="p-3">
                    <span className={item.stockQty < item.moq * 2 ? "text-amber-500 font-semibold" : "text-foreground"}>
                      {item.stockQty.toLocaleString("en-IN")} {item.unit}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{item.location}</td>
                  <td className="p-3 text-right">
                    <button className="px-2 py-1 bg-secondary hover:bg-secondary/80 text-foreground rounded text-[11px] font-medium transition-colors">
                      WhatsApp Quote
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
