"use client";

import * as React from "react";
import { HardHat, Hammer, AlertTriangle, Users, Calendar, Plus, FileSpreadsheet } from "lucide-react";
import { Badge } from "@repo/ui/components/badge";

interface SiteMilestone {
  id: string;
  siteName: string;
  milestone: string;
  targetDate: string;
  completionPct: number;
  laborCount: number;
  materialStatus: "sufficient" | "refill_needed" | "delayed";
}

const SAMPLE_MILESTONES: SiteMilestone[] = [
  { id: "ms-1", siteName: "The Grand Residency (Tower B)", milestone: "4th Floor Slab Casting", targetDate: "15 Sep 2026", completionPct: 85, laborCount: 42, materialStatus: "sufficient" },
  { id: "ms-2", siteName: "Aura Commercial Hub", milestone: "Basement Raft Waterproofing", targetDate: "20 Sep 2026", completionPct: 60, laborCount: 28, materialStatus: "refill_needed" },
  { id: "ms-3", siteName: "Silver Greens Villas", milestone: "External Brickwork & Plaster", targetDate: "28 Sep 2026", completionPct: 30, laborCount: 19, materialStatus: "sufficient" },
  { id: "ms-4", siteName: "Skyline Heights", milestone: "Excavation & Shoring", targetDate: "12 Oct 2026", completionPct: 95, laborCount: 14, materialStatus: "sufficient" },
];

export function ContractorSiteView() {
  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-orange-500/10 text-orange-500 rounded-lg">
            <HardHat className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase font-medium">Active Sites</div>
            <div className="text-xl font-bold">4 Projects</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase font-medium">Daily Site Labor</div>
            <div className="text-xl font-bold">103 Workers</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg">
            <Hammer className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase font-medium">R.A. Bills Certified</div>
            <div className="text-xl font-bold">₹ 1.84 Cr YTD</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-lg">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase font-medium">Material Indents</div>
            <div className="text-xl font-bold">2 Indents Pending</div>
          </div>
        </div>
      </div>

      {/* Milestones & Daily Site Progress Table */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Site Progress & Civil Milestones</h3>
            <p className="text-xs text-muted-foreground">Work breakdown structure, daily headcount, and material procurement status</p>
          </div>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Log Daily Site Report (DSR)
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3 font-semibold">Project & Site</th>
                <th className="p-3 font-semibold">Current Milestone</th>
                <th className="p-3 font-semibold">Progress</th>
                <th className="p-3 font-semibold">Target Date</th>
                <th className="p-3 font-semibold">Active Crew</th>
                <th className="p-3 font-semibold">Material Health</th>
                <th className="p-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {SAMPLE_MILESTONES.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-semibold text-foreground">{item.siteName}</td>
                  <td className="p-3 text-muted-foreground">{item.milestone}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-orange-500 h-full rounded-full"
                          style={{ width: `${item.completionPct}%` }}
                        />
                      </div>
                      <span className="font-semibold text-foreground">{item.completionPct}%</span>
                    </div>
                  </td>
                  <td className="p-3 font-mono text-[11px] text-muted-foreground">{item.targetDate}</td>
                  <td className="p-3 font-medium">{item.laborCount} Workers</td>
                  <td className="p-3">
                    <Badge
                      variant="outline"
                      className={`text-[10px] capitalize ${
                        item.materialStatus === "sufficient"
                          ? "border-emerald-500 text-emerald-500 bg-emerald-500/10"
                          : "border-amber-500 text-amber-500 bg-amber-500/10"
                      }`}
                    >
                      {item.materialStatus.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <button className="px-2 py-1 bg-secondary hover:bg-secondary/80 text-foreground rounded text-[11px] font-medium transition-colors">
                      File DSR
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
