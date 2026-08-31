"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Filter, RotateCcw, Check } from "lucide-react";
import { Project, Region, User } from "@/types/crm";

export interface FilterState {
  stage: string;
  health: string;
  region: string;
  salesperson: string;
  project: string;
  sortBy: string;
}

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
  projects: Project[];
  regions: Region[];
  salespeople: User[];
  activeCount: number;
}

export function FilterSheet({
  open,
  onOpenChange,
  filters,
  onFilterChange,
  onReset,
  projects,
  regions,
  salespeople,
  activeCount,
}: FilterSheetProps) {
  const [localFilters, setLocalFilters] = React.useState<FilterState>(filters);

  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters, open]);

  const handleChange = (key: keyof FilterState, val: string) => {
    setLocalFilters((prev) => ({ ...prev, [key]: val }));
  };

  const handleApply = () => {
    onFilterChange(localFilters);
    onOpenChange(false);
  };

  const handleReset = () => {
    onReset();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] rounded-t-2xl px-4 py-5 flex flex-col">
        <SheetHeader className="pb-3 text-left shrink-0">
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <SheetTitle className="text-base font-bold text-foreground">
                Filter Leads
              </SheetTitle>
            </div>
            {activeCount > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                {activeCount} Active
              </span>
            )}
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            Narrow down leads by stage, health score, project, and regional desk.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">
          {/* Project */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Target Project</Label>
            <select
              value={localFilters.project}
              onChange={(e) => handleChange("project", e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-border bg-secondary/50 text-foreground font-medium text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Projects ({projects.length})</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Pipeline Stage */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Pipeline Stage</Label>
            <select
              value={localFilters.stage}
              onChange={(e) => handleChange("stage", e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-border bg-secondary/50 text-foreground font-medium text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Stages</option>
              <option value="new">New Inflow</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="site_visit">Site Visit</option>
              <option value="negotiation">Negotiation</option>
              <option value="won">Won Deals</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          {/* Deal Health */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Deal Health</Label>
            <select
              value={localFilters.health}
              onChange={(e) => handleChange("health", e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-border bg-secondary/50 text-foreground font-medium text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Health Conditions</option>
              <option value="strong">🟢 Strong (Actionable)</option>
              <option value="neutral">⚪ Neutral</option>
              <option value="at_risk">🔴 At Risk (SLA Breached)</option>
            </select>
          </div>

          {/* Region */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Regional Desk</Label>
            <select
              value={localFilters.region}
              onChange={(e) => handleChange("region", e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-border bg-secondary/50 text-foreground font-medium text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Regions ({regions.length})</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Salesperson */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Assigned Salesperson</Label>
            <select
              value={localFilters.salesperson}
              onChange={(e) => handleChange("salesperson", e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-border bg-secondary/50 text-foreground font-medium text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Representatives ({salespeople.length})</option>
              {salespeople.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Sorting Priority</Label>
            <select
              value={localFilters.sortBy}
              onChange={(e) => handleChange("sortBy", e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-border bg-secondary/50 text-foreground font-medium text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="score_desc">Lead Score (High to Low)</option>
              <option value="budget_desc">Budget (High to Low)</option>
              <option value="budget_asc">Budget (Low to High)</option>
              <option value="recent">Recently Active</option>
            </select>
          </div>
        </div>

        <SheetFooter className="pt-3 border-t border-border flex-row gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="flex-1 h-11 text-xs font-semibold gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>

          <Button
            type="button"
            onClick={handleApply}
            className="flex-1 h-11 text-xs font-semibold gap-1.5"
          >
            <Check className="h-3.5 w-3.5" />
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
