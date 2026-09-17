"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { Bell, Shield, Save, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { NotificationPreferences } from "@repo/core/types/automation";

interface NotificationPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationPreferencesDialog({
  open,
  onOpenChange,
}: NotificationPreferencesDialogProps) {
  const [preferences, setPreferences] = React.useState<NotificationPreferences>({
    userId: "",
    orgId: "",
    leadAssignments: true,
    taskReminders: true,
    slaAlerts: true,
    dealHealthAlerts: true,
    billingNotifications: true,
    updatedAt: new Date().toISOString(),
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadPreferences() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/notifications/preferences");
        if (res.ok) {
          const json = await res.json();
          if (json.success && !cancelled) {
            setPreferences(json.data);
          }
        }
      } catch {
        // silent fallback
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadPreferences();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error?.message || "Failed to update notification preferences");
        return;
      }

      toast.success("Notification preferences saved successfully");
      onOpenChange(false);
    } catch {
      toast.error("Network error saving preferences");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 bg-card border-border shadow-2xl rounded-2xl">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <DialogTitle className="text-base font-bold text-foreground">
              Notification Preferences
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Control which in-app alerts and workflow notifications you receive.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs">Loading preferences...</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 pt-2 text-xs">
            <div className="space-y-3 divide-y divide-border/60">
              {/* Lead Assignments */}
              <div className="flex items-start justify-between gap-3 pt-2">
                <div className="space-y-0.5">
                  <label className="font-semibold text-foreground cursor-pointer" htmlFor="pref-leads">
                    Lead Assignments
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Get alerted whenever a new lead is assigned or routed to you.
                  </p>
                </div>
                <input
                  id="pref-leads"
                  type="checkbox"
                  checked={preferences.leadAssignments}
                  onChange={(e) =>
                    setPreferences({ ...preferences, leadAssignments: e.target.checked })
                  }
                  className="mt-1 h-4 w-4 rounded border-border text-primary cursor-pointer"
                />
              </div>

              {/* Task Reminders */}
              <div className="flex items-start justify-between gap-3 pt-3">
                <div className="space-y-0.5">
                  <label className="font-semibold text-foreground cursor-pointer" htmlFor="pref-tasks">
                    Task Reminders & Due Dates
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Alerts for assigned follow-up calls, site visits, and overdue tasks.
                  </p>
                </div>
                <input
                  id="pref-tasks"
                  type="checkbox"
                  checked={preferences.taskReminders}
                  onChange={(e) =>
                    setPreferences({ ...preferences, taskReminders: e.target.checked })
                  }
                  className="mt-1 h-4 w-4 rounded border-border text-primary cursor-pointer"
                />
              </div>

              {/* SLA Alerts */}
              <div className="flex items-start justify-between gap-3 pt-3">
                <div className="space-y-0.5">
                  <label className="font-semibold text-foreground cursor-pointer" htmlFor="pref-sla">
                    Speed-to-Lead & SLA Breaches
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Alerts when inbound leads remain untouched beyond the response window.
                  </p>
                </div>
                <input
                  id="pref-sla"
                  type="checkbox"
                  checked={preferences.slaAlerts}
                  onChange={(e) =>
                    setPreferences({ ...preferences, slaAlerts: e.target.checked })
                  }
                  className="mt-1 h-4 w-4 rounded border-border text-primary cursor-pointer"
                />
              </div>

              {/* Deal Health Alerts */}
              <div className="flex items-start justify-between gap-3 pt-3">
                <div className="space-y-0.5">
                  <label className="font-semibold text-foreground cursor-pointer" htmlFor="pref-health">
                    Deal Health & At-Risk Alerts
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Notifies you when active deals stall or lack touchpoints for &gt;5 days.
                  </p>
                </div>
                <input
                  id="pref-health"
                  type="checkbox"
                  checked={preferences.dealHealthAlerts}
                  onChange={(e) =>
                    setPreferences({ ...preferences, dealHealthAlerts: e.target.checked })
                  }
                  className="mt-1 h-4 w-4 rounded border-border text-primary cursor-pointer"
                />
              </div>

              {/* Billing Notifications */}
              <div className="flex items-start justify-between gap-3 pt-3">
                <div className="space-y-0.5">
                  <label className="font-semibold text-foreground cursor-pointer" htmlFor="pref-billing">
                    Billing & Subscription Receipts
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Invoices, subscription upgrades, and renewal confirmations.
                  </p>
                </div>
                <input
                  id="pref-billing"
                  type="checkbox"
                  checked={preferences.billingNotifications}
                  onChange={(e) =>
                    setPreferences({ ...preferences, billingNotifications: e.target.checked })
                  }
                  className="mt-1 h-4 w-4 rounded border-border text-primary cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>{isSaving ? "Saving..." : "Save Preferences"}</span>
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
