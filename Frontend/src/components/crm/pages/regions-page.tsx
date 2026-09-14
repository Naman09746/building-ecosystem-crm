"use client";

import * as React from "react";
import { MapPin, Plus, Building2, Users, Edit2, Trash2, X } from "lucide-react";
import { useCRM } from "@/context/crm-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Region } from "@/types/crm";
import { toast } from "sonner";
import { isManagerRole } from "@/lib/rbac";

export function RegionsPage() {
  const {
    currentUser,
    regions,
    filteredLeads,
    users,
    projects,
    createRegion,
    updateRegion,
    deleteRegion,
  } = useCRM();

  const isManager = isManagerRole(currentUser.role);

  const [isOpen, setIsOpen] = React.useState(false);
  const [editingRegion, setEditingRegion] = React.useState<Region | null>(null);
  const [regionName, setRegionName] = React.useState("");
  const [regionCode, setRegionCode] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regionName.trim() || !regionCode.trim()) {
      toast.error("Please enter both region name and code");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRegion) {
        const success = await updateRegion(editingRegion.id, {
          name: regionName.trim(),
          code: regionCode.trim().toUpperCase(),
        });
        if (success) {
          setEditingRegion(null);
          setIsOpen(false);
        }
      } else {
        const created = await createRegion({
          name: regionName.trim(),
          code: regionCode.trim().toUpperCase(),
        });
        if (created) {
          setIsOpen(false);
          setRegionName("");
          setRegionCode("");
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Regional Operating Hubs
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Regional organizational dimensions for data scoping, territory permission enforcement, and performance reporting.
          </p>
        </div>

        {isManager && (
          <Button
            size="sm"
            onClick={() => {
              setEditingRegion(null);
              setRegionName("");
              setRegionCode("");
              setIsOpen(true);
            }}
            className="gap-1.5 shadow-subtle text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>Add Region</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {regions.map((r) => {
          const regionReps = users.filter((u) => u.regionId === r.id);
          const regionLeads = filteredLeads.filter((l) => l.regionId === r.id);
          const regionProjects = projects.filter((p) => p.regionId === r.id);

          return (
            <Card key={r.id} className="p-5 space-y-4 shadow-subtle border-border bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">{r.name} Hub</h3>
                  <span className="text-xs text-muted-foreground font-mono">Code: {r.code}</span>
                </div>
                <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary">
                  {r.code}
                </Badge>
              </div>

              <div className="space-y-2 p-3 rounded-lg border border-border bg-secondary/30 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Active Leads:</span>
                  <strong className="font-mono text-foreground">{regionLeads.length}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Assigned Sales Reps:</span>
                  <strong className="font-mono text-foreground">{regionReps.length}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Active Projects:</span>
                  <strong className="font-mono text-foreground">{regionProjects.length}</strong>
                </div>
              </div>

              {isManager && (
                <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (confirm(`Are you sure you want to delete "${r.name}" hub?`)) {
                        await deleteRegion(r.id);
                      }
                    }}
                    className="h-7 text-xs text-destructive hover:text-destructive px-2"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingRegion(r);
                      setRegionName(r.name);
                      setRegionCode(r.code);
                      setIsOpen(true);
                    }}
                    className="h-7 text-xs px-2 gap-1"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Configure</span>
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add / Edit Region Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-border shadow-2xl bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-bold text-foreground">
                {editingRegion ? "Configure Regional Hub" : "Add Regional Hub"}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-foreground block mb-1">Hub Name *</label>
                  <input
                    type="text"
                    required
                    value={regionName}
                    onChange={(e) => setRegionName(e.target.value)}
                    placeholder="e.g. Mumbai Metro / MMR"
                    className="w-full h-8 px-2.5 rounded border border-border bg-secondary/50 text-foreground font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">Region Code (2-5 characters) *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={regionCode}
                    onChange={(e) => setRegionCode(e.target.value.toUpperCase())}
                    placeholder="e.g. MUM"
                    className="w-full h-8 px-2.5 rounded border border-border bg-secondary/50 text-foreground font-mono font-medium uppercase"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isSubmitting} className="h-8 text-xs font-semibold">
                    {isSubmitting ? "Saving..." : editingRegion ? "Save Changes" : "Create Hub"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
