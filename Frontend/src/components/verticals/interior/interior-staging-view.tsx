"use client";

import * as React from "react";
import { Palette, Layers, Sparkles, CheckCircle2, Clock, Plus, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BoqItem {
  id: string;
  room: string;
  element: string;
  materialSpec: string;
  vendor: string;
  estimatedCost: number;
  status: "approved" | "client_review" | "in_production" | "installed";
}

const SAMPLE_BOQ: BoqItem[] = [
  { id: "boq-1", room: "Master Bedroom", element: "Walk-in Wardrobe", materialSpec: "Merino Fluted Laminate + Hafele Sliding System", vendor: "WoodCraft Studios", estimatedCost: 285000, status: "in_production" },
  { id: "boq-2", room: "Kitchen", element: "Modular Island Counter", materialSpec: "Kalinga Stone Quartz + BLUM Soft-Close Hardware", vendor: "Urban Kitchens", estimatedCost: 450000, status: "installed" },
  { id: "boq-3", room: "Living Area", element: "Custom TV Console & Paneling", materialSpec: "Teak Veneer with Brass Inlay Detailing", vendor: "DecoArtisans", estimatedCost: 195000, status: "approved" },
  { id: "boq-4", room: "Powder Room", element: "Vanity & Backlit Fluted Mirror", materialSpec: "Italian Statuario Marble + Kohler Matte Black Faucets", vendor: "MarbleCraft", estimatedCost: 85000, status: "client_review" },
];

export function InteriorStagingView() {
  const totalBudget = SAMPLE_BOQ.reduce((acc, curr) => acc + curr.estimatedCost, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-violet-500/10 text-violet-500 rounded-lg">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase font-medium">Active Fit-Outs</div>
            <div className="text-xl font-bold">6 Sites</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase font-medium">Total Project BOQ</div>
            <div className="text-xl font-bold">₹ {(totalBudget / 100000).toFixed(2)} Lakhs</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase font-medium">Factory Lead Time</div>
            <div className="text-xl font-bold">14 Days Avg</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase font-medium">Material Approvals</div>
            <div className="text-xl font-bold">85% Signed Off</div>
          </div>
        </div>
      </div>

      {/* BOQ Table */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Room-by-Room Bill of Quantities (BOQ)</h3>
            <p className="text-xs text-muted-foreground">Detailed material specifications, finishes & artisan vendor assignments</p>
          </div>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Room Spec
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3 font-semibold">Room & Element</th>
                <th className="p-3 font-semibold">Material Specification</th>
                <th className="p-3 font-semibold">Assigned Vendor</th>
                <th className="p-3 font-semibold">Estimate</th>
                <th className="p-3 font-semibold">Execution Status</th>
                <th className="p-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {SAMPLE_BOQ.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <div className="font-semibold text-foreground">{item.room}</div>
                    <div className="text-[11px] text-muted-foreground">{item.element}</div>
                  </td>
                  <td className="p-3 text-muted-foreground font-mono text-[11px]">{item.materialSpec}</td>
                  <td className="p-3 font-medium">{item.vendor}</td>
                  <td className="p-3 font-semibold text-foreground">₹ {item.estimatedCost.toLocaleString("en-IN")}</td>
                  <td className="p-3">
                    <Badge
                      variant="outline"
                      className={`text-[10px] capitalize ${
                        item.status === "installed"
                          ? "border-emerald-500 text-emerald-500 bg-emerald-500/10"
                          : item.status === "in_production"
                          ? "border-amber-500 text-amber-500 bg-amber-500/10"
                          : item.status === "approved"
                          ? "border-blue-500 text-blue-500 bg-blue-500/10"
                          : "border-muted-foreground text-muted-foreground"
                      }`}
                    >
                      {item.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <button className="px-2 py-1 bg-secondary hover:bg-secondary/80 text-foreground rounded text-[11px] font-medium transition-colors">
                      Moodboard Link
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
