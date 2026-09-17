"use client";

import * as React from "react";
import { Kanban, Plus, Filter } from "lucide-react";
import { useCRM } from "@repo/core/context/crm-context";
import { PipelineBoard } from "@/components/crm/pipeline-board";
import { LeadDetailModal } from "@/components/crm/lead-detail-modal";
import { QuickActivityModal } from "@/components/crm/quick-activity-modal";
import { Lead } from "@repo/core/types/crm";

export function PipelinePage() {
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [quickLogOpen, setQuickLogOpen] = React.useState(false);
  const [quickLogLeadId, setQuickLogLeadId] = React.useState<string | undefined>();

  const handleOpenLead = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailOpen(true);
  };

  const handleLogActivity = (leadId: string) => {
    setQuickLogLeadId(leadId);
    setQuickLogOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Kanban className="h-5 w-5 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Sales Pipeline & Opportunity Board
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time Kanban workflow with instant stage transitions and Indian pricing.
          </p>
        </div>
      </div>

      {/* Interactive Kanban Board */}
      <PipelineBoard onSelectLead={handleOpenLead} />

      {/* Modals */}
      <LeadDetailModal
        lead={selectedLead}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onLogActivity={handleLogActivity}
      />

      <QuickActivityModal
        open={quickLogOpen}
        onOpenChange={setQuickLogOpen}
        defaultLeadId={quickLogLeadId}
      />
    </div>
  );
}
