"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { useCRM } from "@repo/core/context/crm-context";
import { useAuth } from "@repo/core/context/auth-context";
import { BossOverview } from "@/components/crm/boss-overview";
import { SalespersonHome } from "@/components/crm/salesperson-home";
import { PipelineBoard } from "@/components/crm/pipeline-board";
import { QuickActivityModal } from "@/components/crm/quick-activity-modal";
import { GlobalSearchDialog } from "@/components/crm/global-search-dialog";
import { LeadDetailModal } from "@/components/crm/lead-detail-modal";
import { Lead } from "@repo/core/types/crm";
import { Loader2 } from "lucide-react";
import { LeadsPage } from "@/components/crm/pages/leads-page";
import { ReportsPage } from "@/components/crm/pages/reports-page";
import { ProjectsPage } from "@/components/verticals/real_estate/projects-view";
import { MaterialsCatalogView } from "@/components/verticals/materials/materials-catalog-view";
import { MaterialsFootfallView } from "@/components/verticals/materials/materials-footfall-view";
import { MaterialsScoutingView } from "@/components/verticals/materials/materials-scouting-view";
import { KhataLedgerView } from "@/components/verticals/materials/khata-ledger-view";
import { RateBoard } from "@/components/verticals/materials/rate-board";
import { PeoplePage } from "@/components/crm/pages/people-page";
import { ActivitiesPage } from "@/components/crm/pages/activities-page";
import { UsersPage } from "@/components/crm/pages/users-page";
import { RegionsPage } from "@/components/crm/pages/regions-page";
import { SettingsPage } from "@/components/crm/pages/settings-page";
import { TasksPage } from "@/components/crm/pages/tasks-page";
import { BillingPage } from "@/components/crm/pages/billing-page";
import { AiAgentCommandCenter } from "@/components/crm/ai-agent-command-center";
import { AiLeadBot } from "@/components/crm/ai-lead-bot";
import { DealersView } from "@/components/verticals/cement/dealers-view";
import { SitesView } from "@/components/verticals/cement/sites-view";
import { TargetsView } from "@/components/verticals/cement/targets-view";
import { CollectionsView } from "@/components/verticals/cement/collections-view";
import { ComplaintsView } from "@/components/verticals/cement/complaints-view";
import { SchemesView } from "@/components/verticals/cement/schemes-view";
import { useIsMobile } from "@/hooks/use-device";
import { isManagerRole } from "@repo/core/lib/rbac";

export function AppShell({
  initialTab,
  children,
}: {
  initialTab?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const { currentUser, leads, vertical } = useCRM();
  const { user, workflowStep, isLoading: authLoading } = useAuth();
  const isMobile = useIsMobile();

  // Tier 1: Owner, Manager (Executive & Oversight View)
  // Tier 2: Salesperson (Field Sales Cockpit)
  const isExecutive = isManagerRole(currentUser.role);

  // Auth gating — every CRM route shares this contract.
  React.useEffect(() => {
    if (authLoading) return;
    if (!user) {
      const isDemoSession = document.cookie.includes("ecosystemrealty_demo_session=1");
      if (!isDemoSession) {
        router.replace("/login");
      }
    }
  }, [user, authLoading, router]);

  // Navigation State with localStorage persistence
  const [activeTab, setActiveTabState] = React.useState<string>(initialTab || "overview");
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (initialTab) return; // deep-linked tab wins over persisted state
    try {
      const savedTab = localStorage.getItem("ecosystemrealty_active_tab");
      if (savedTab) {
        setActiveTabState(savedTab);
      }
      const savedCollapsed = localStorage.getItem("ecosystemrealty_sidebar_collapsed");
      if (savedCollapsed === "true") {
        setSidebarCollapsed(true);
      }
    } catch {}
  }, [initialTab]);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem("ecosystemrealty_active_tab", tab);
    } catch {}
  };

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("ecosystemrealty_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  // Modals state
  const [quickLogOpen, setQuickLogOpen] = React.useState(false);
  const [quickLogLeadId, setQuickLogLeadId] = React.useState<string | undefined>();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  const handleOpenLead = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailOpen(true);
  };

  const handleOpenQuickLog = (leadId?: string) => {
    setQuickLogLeadId(leadId);
    setQuickLogOpen(true);
  };

  // Global Keyboard Shortcuts (L, F, /, Esc)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isInput =
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.tagName === "SELECT" ||
          (active as HTMLElement).isContentEditable);

      // Esc closes open modals unconditionally
      if (e.key === "Escape") {
        if (quickLogOpen) setQuickLogOpen(false);
        if (detailOpen) setDetailOpen(false);
        if (searchOpen) setSearchOpen(false);
        if (mobileMenuOpen) setMobileMenuOpen(false);
        return;
      }

      // If user is typing in a form field, do not trigger single-key hotkeys
      if (isInput) return;

      if (e.key.toLowerCase() === "l" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleOpenQuickLog();
      } else if (e.key.toLowerCase() === "f" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setActiveTab("tasks");
      } else if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [quickLogOpen, detailOpen, searchOpen, mobileMenuOpen]);

  // Gate rendering until the session + onboarding workflow are resolved.
  if (authLoading || !user || workflowStep !== "app") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading sales cockpit...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-primary/10">
      {/* Desktop & Tablet Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        className="hidden md:flex"
      />

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-50 w-72 max-w-[85vw] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            <Sidebar
              activeTab={activeTab}
              onSelectTab={(tab) => {
                setActiveTab(tab);
                setMobileMenuOpen(false);
              }}
              className="h-full w-full"
            />
          </div>
        </div>
      )}

      {/* Main App Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <TopBar
          onOpenQuickLog={() => handleOpenQuickLog()}
          onOpenSearch={() => setSearchOpen(true)}
          onToggleMobileMenu={() => setMobileMenuOpen(true)}
        />

        {/* Dynamic Main Workspace Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 pb-24 md:pb-8">
          {children ? (
            children
          ) : (
            <>
              {activeTab === "overview" && (
                isExecutive ? (
                  <BossOverview
                    onSelectLead={handleOpenLead}
                    onNavigateToTab={setActiveTab}
                  />
                ) : (
                  <SalespersonHome
                    onOpenQuickLog={handleOpenQuickLog}
                    onSelectLead={handleOpenLead}
                    onNavigateTab={setActiveTab}
                  />
                )
              )}

              {activeTab === "ai-agent" && (
                <AiAgentCommandCenter onSelectLead={handleOpenLead} />
              )}

              {activeTab === "leads" && (
                <LeadsPage onSelectLead={handleOpenLead} onOpenQuickLog={handleOpenQuickLog} />
              )}

              {activeTab === "pipeline" && (
                <div className="space-y-6 max-w-7xl mx-auto">
                  <PipelineBoard onSelectLead={handleOpenLead} />
                </div>
              )}

              {activeTab === "tasks" && <TasksPage onSelectLead={handleOpenLead} onOpenQuickLog={handleOpenQuickLog} />}
              {activeTab === "footfall" && <MaterialsFootfallView />}
              {activeTab === "scouting" && <MaterialsScoutingView />}
              {activeTab === "khata" && <KhataLedgerView />}
              {activeTab === "rates" && <RateBoard />}
              {activeTab === "reports" && <ReportsPage />}
              {activeTab === "projects" && (
                vertical === "building_materials" ? <MaterialsCatalogView /> : <ProjectsPage />
              )}
              {activeTab === "people" && <PeoplePage />}
              {activeTab === "activities" && <ActivitiesPage />}
              {activeTab === "dealers" && <DealersView />}
              {activeTab === "sites" && <SitesView />}
              {activeTab === "targets" && <TargetsView />}
              {activeTab === "collections" && <CollectionsView />}
              {activeTab === "complaints" && <ComplaintsView />}
              {activeTab === "schemes" && <SchemesView />}
              {activeTab === "users" && <UsersPage />}
              {activeTab === "regions" && <RegionsPage />}
              {activeTab === "billing" && <BillingPage />}
              {activeTab === "settings" && <SettingsPage />}
            </>
          )}
        </main>

        {/* Mobile Bottom Navigation Bar (44px min touch targets & role-aware) */}
        <BottomNav
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenQuickLog={() => handleOpenQuickLog()}
        />
      </div>

      {/* Global Interactive Modals */}
      <QuickActivityModal
        open={quickLogOpen}
        onOpenChange={setQuickLogOpen}
        defaultLeadId={quickLogLeadId}
      />

      <GlobalSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelectLead={handleOpenLead}
        onNavigateTab={setActiveTab}
        onOpenQuickLog={() => handleOpenQuickLog()}
      />

      <LeadDetailModal
        lead={selectedLead}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onLogActivity={(id) => handleOpenQuickLog(id)}
      />

      {/* Floating Autonomous Lead Qualification Agent (Aria) */}
      <AiLeadBot
        onOpenLeadDetail={(leadId) => {
          const lead = leads.find((l) => l.id === leadId);
          if (lead) handleOpenLead(lead);
        }}
      />
    </div>
  );
}
