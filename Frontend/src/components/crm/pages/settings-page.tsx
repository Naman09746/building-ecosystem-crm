"use client";

import * as React from "react";
import {
  Settings as SettingsIcon,
  Save,
  Shield,
  Database,
  Bell,
  CheckCircle2,
  Building,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useCRM } from "@/context/crm-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { isManagerRole } from "@/lib/rbac";

export function SettingsPage() {
  const { currentUser } = useCRM();
  const isManager = isManagerRole(currentUser.role);

  const [orgName, setOrgName] = React.useState("");
  const [orgSlug, setOrgSlug] = React.useState("");
  const [orgPlan, setOrgPlan] = React.useState("growth");
  const [maxLeads, setMaxLeads] = React.useState(500);
  const [maxSeats, setMaxSeats] = React.useState(4);
  const [reactivationDays, setReactivationDays] = React.useState(45);
  const [autoAssignment, setAutoAssignment] = React.useState(true);
  const [speedToLeadAlerts, setSpeedToLeadAlerts] = React.useState(true);

  // SLA Configuration States
  const [newLeadResponseSlaHours, setNewLeadResponseSlaHours] = React.useState(2);
  const [inactiveLeadStaleDays, setInactiveLeadStaleDays] = React.useState(5);
  const [siteVisitStaleDays, setSiteVisitStaleDays] = React.useState(14);
  const [managerEscalationSlaHours, setManagerEscalationSlaHours] = React.useState(6);

  // Automation Execution Status
  const [automationStatus, setAutomationStatus] = React.useState<any>(null);
  const [isRunningSlaCheck, setIsRunningSlaCheck] = React.useState(false);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  // Load authoritative organization settings & automation status from database
  React.useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      try {
        const [res, autoRes] = await Promise.all([
          fetch("/api/orgs/settings"),
          fetch("/api/automation/status"),
        ]);

        if (res.ok) {
          const json = await res.json();
          if (json.success && !cancelled) {
            const org = json.data;
            setOrgName(org.name || "");
            setOrgSlug(org.slug || "");
            setOrgPlan(org.plan || "growth");
            setMaxLeads(org.max_leads || 500);
            setMaxSeats(org.max_seats || 4);
            setReactivationDays(org.reactivation_days || 45);

            const custom = org.custom_settings || {};
            if (custom.autoAssignment !== undefined) setAutoAssignment(custom.autoAssignment);
            if (custom.speedToLeadAlerts !== undefined) setSpeedToLeadAlerts(custom.speedToLeadAlerts);
            if (custom.new_lead_response_sla_hours !== undefined) setNewLeadResponseSlaHours(custom.new_lead_response_sla_hours);
            if (custom.inactive_lead_stale_days !== undefined) setInactiveLeadStaleDays(custom.inactive_lead_stale_days);
            if (custom.site_visit_stale_days !== undefined) setSiteVisitStaleDays(custom.site_visit_stale_days);
            if (custom.manager_escalation_sla_hours !== undefined) setManagerEscalationSlaHours(custom.manager_escalation_sla_hours);
          }
        }

        if (autoRes.ok) {
          const autoJson = await autoRes.json();
          if (autoJson.success && !cancelled) {
            setAutomationStatus(autoJson.data);
          }
        }
      } catch (err) {
        console.error("Failed to load org settings", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      toast.error("Organization name cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/orgs/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: orgName.trim(),
          reactivationDays: Number(reactivationDays) || 45,
          customSettings: {
            autoAssignment,
            speedToLeadAlerts,
            new_lead_response_sla_hours: Number(newLeadResponseSlaHours) || 2,
            inactive_lead_stale_days: Number(inactiveLeadStaleDays) || 5,
            site_visit_stale_days: Number(siteVisitStaleDays) || 14,
            manager_escalation_sla_hours: Number(managerEscalationSlaHours) || 6,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error?.message || "Failed to update organization settings");
        return;
      }

      setSaved(true);
      toast.success("Organization settings successfully saved to database");
      setTimeout(() => setSaved(false), 4000);
    } catch {
      toast.error("Network error updating settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerHealthCheck = async () => {
    setIsRunningSlaCheck(true);
    try {
      const res = await fetch("/api/automation/recompute", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error?.message || "Failed to trigger SLA check");
        return;
      }

      toast.success(
        `SLA recomputed: ${json.data?.stats?.leads_evaluated || 0} leads analyzed in ${json.data?.stats?.duration_ms || 0}ms.`
      );

      const autoRes = await fetch("/api/automation/status");
      if (autoRes.ok) {
        const autoJson = await autoRes.json();
        if (autoJson.success) setAutomationStatus(autoJson.data);
      }
    } catch {
      toast.error("Network error triggering SLA check");
    } finally {
      setIsRunningSlaCheck(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Organization & CRM Settings
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure organization branding, multi-tenant subscription quotas, and background SLA automation rules.
          </p>
        </div>

        {saved && (
          <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-xs font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
            Saved to Cloud Database
          </Badge>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4 text-xs">
        {/* Organization Profile */}
        <Card className="p-5 space-y-4 shadow-subtle border-border bg-card">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Building className="h-4 w-4 text-primary" /> Organization Profile & Quotas
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Primary entity credentials used for customer communication, domain resolution, and subscription quotas
            </CardDescription>
          </CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="font-bold text-foreground">Organization Legal Name *</label>
              <Input
                disabled={!isManager || isLoading}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Apex Realty Advisors Pvt. Ltd."
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-foreground">Tenant Domain / Slug</label>
              <Input value={`${orgSlug || "apex-realty"}.callcrm.in`} disabled className="bg-secondary/50 font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 border-t border-border/70">
            <div className="p-3 rounded-lg border border-border bg-secondary/30">
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">Current Plan</span>
              <span className="font-bold text-foreground capitalize font-mono text-sm">{orgPlan}</span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-secondary/30">
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">Lead Capacity</span>
              <span className="font-bold text-foreground font-mono text-sm">{maxLeads} Leads</span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-secondary/30">
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">Seat Allocation</span>
              <span className="font-bold text-foreground font-mono text-sm">{maxSeats} Team Members</span>
            </div>
          </div>
        </Card>

        {/* SLA & CRM Health Automation Card */}
        <Card className="p-5 space-y-4 shadow-subtle border-border bg-card">
          <CardHeader className="p-0 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Bell className="h-4 w-4 text-primary" /> SLA Monitoring & Deal Health Automation
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Thresholds evaluated automatically by the background cron worker every 2 hours
              </CardDescription>
            </div>

            {isManager && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTriggerHealthCheck}
                disabled={isRunningSlaCheck}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                <RotateCcw className={`h-3.5 w-3.5 ${isRunningSlaCheck ? "animate-spin text-primary" : ""}`} />
                <span>{isRunningSlaCheck ? "Analyzing CRM..." : "Run Health Check Now"}</span>
              </Button>
            )}
          </CardHeader>

          {/* Automation Summary Banner */}
          {automationStatus && (
            <div className="p-3 rounded-xl border border-border bg-secondary/30 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Cron Health:</span>
                <Badge variant={automationStatus.status === "healthy" ? "default" : "destructive"} className="text-[10px]">
                  {automationStatus.status}
                </Badge>
                <span className="text-muted-foreground text-[11px]">
                  • Last executed: {automationStatus.lastExecution ? new Date(automationStatus.lastExecution).toLocaleTimeString() : "Never"}
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span>At Risk Deals: <strong className="text-destructive">{automationStatus.summary?.atRiskDeals || 0}</strong></span>
                <span>Overdue Tasks: <strong className="text-amber-600">{automationStatus.summary?.overdueTasks || 0}</strong></span>
                <span>Unread Alerts: <strong className="text-primary">{automationStatus.summary?.unreadNotifications || 0}</strong></span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="font-bold text-foreground">New Lead Response SLA (Hours) *</label>
              <Input
                type="number"
                min={1}
                max={48}
                disabled={!isManager || isLoading}
                value={newLeadResponseSlaHours}
                onChange={(e) => setNewLeadResponseSlaHours(parseInt(e.target.value, 10) || 2)}
                className="font-mono"
              />
              <span className="text-[10px] text-muted-foreground">
                Alerts the assigned rep if no outreach activity is logged within this window.
              </span>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Manager Escalation Window (Hours) *</label>
              <Input
                type="number"
                min={1}
                max={72}
                disabled={!isManager || isLoading}
                value={managerEscalationSlaHours}
                onChange={(e) => setManagerEscalationSlaHours(parseInt(e.target.value, 10) || 6)}
                className="font-mono"
              />
              <span className="text-[10px] text-muted-foreground">
                Escalates to agency managers if an uncontacted lead remains untouched.
              </span>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Inactive Lead Stale Threshold (Days) *</label>
              <Input
                type="number"
                min={1}
                max={60}
                disabled={!isManager || isLoading}
                value={inactiveLeadStaleDays}
                onChange={(e) => setInactiveLeadStaleDays(parseInt(e.target.value, 10) || 5)}
                className="font-mono"
              />
              <span className="text-[10px] text-muted-foreground">
                Active deals with no recorded touchpoint for this many days become At Risk.
              </span>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Site Visit / Negotiation Stale Days *</label>
              <Input
                type="number"
                min={1}
                max={90}
                disabled={!isManager || isLoading}
                value={siteVisitStaleDays}
                onChange={(e) => setSiteVisitStaleDays(parseInt(e.target.value, 10) || 14)}
                className="font-mono"
              />
              <span className="text-[10px] text-muted-foreground">
                Deals stalled in site_visit or negotiation for longer than this become At Risk.
              </span>
            </div>
          </div>
        </Card>

        {/* Lead Automation & Speed-to-Lead Rules */}
        <Card className="p-5 space-y-4 shadow-subtle border-border bg-card">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Sparkles className="h-4 w-4 text-primary" /> Speed-to-Lead & Reactivation Parameters
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Automated triggers for dead lead reactivation and fast rep assignment
            </CardDescription>
          </CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="font-bold text-foreground">Lost Lead Reactivation Window (Days) *</label>
              <Input
                type="number"
                min={1}
                max={365}
                disabled={!isManager || isLoading}
                value={reactivationDays}
                onChange={(e) => setReactivationDays(parseInt(e.target.value, 10) || 45)}
                className="font-mono"
              />
              <span className="text-[10px] text-muted-foreground">
                Leads marked as Lost will resurface for outreach pitch review after this period.
              </span>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isManager || isLoading}
                  checked={speedToLeadAlerts}
                  onChange={(e) => setSpeedToLeadAlerts(e.target.checked)}
                  className="rounded border-border text-primary"
                />
                <span className="font-semibold text-foreground">
                  Enable Speed-to-Lead High-Priority Task Automation
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isManager || isLoading}
                  checked={autoAssignment}
                  onChange={(e) => setAutoAssignment(e.target.checked)}
                  className="rounded border-border text-primary"
                />
                <span className="font-semibold text-foreground">
                  Round-Robin Sales Representative Assignment on Inbound
                </span>
              </label>
            </div>
          </div>
        </Card>

        {/* Currency & Regional Formatting */}
        <Card className="p-5 space-y-4 shadow-subtle border-border bg-card">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm font-bold text-foreground">Default Currency & Timezone</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Standard format for budget inputs and lead follow-up reminders
            </CardDescription>
          </CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="font-bold text-foreground">Primary Currency</label>
              <Input defaultValue="INR (₹ Indian Rupee - Lakhs & Crores)" disabled className="bg-secondary/50" />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-foreground">Timezone</label>
              <Input defaultValue="Asia/Kolkata (IST +5:30)" disabled className="bg-secondary/50" />
            </div>
          </div>
        </Card>

        {isManager && (
          <div className="flex justify-end pt-2">
            <Button type="submit" size="sm" disabled={isSaving || isLoading} className="gap-1.5 font-semibold text-xs">
              <Save className="h-3.5 w-3.5" />
              <span>{isSaving ? "Saving to Database..." : "Save Settings"}</span>
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
