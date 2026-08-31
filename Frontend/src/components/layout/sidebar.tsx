"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Kanban,
  Contact,
  Building2,
  Activity,
  ListTodo,
  ChartNoAxesCombined,
  MapPin,
  Settings,
  CreditCard,
  Home,
  Shield,
  UserCheck,
  Bot,
  Sparkles,
} from "lucide-react";
import { useCRM } from "@/context/crm-context";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  className?: string;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
}

export function Sidebar({ className, activeTab, onSelectTab }: SidebarProps) {
  const pathname = usePathname();
  const { currentUser } = useCRM();

  // Role-Aware Navigation
  const isBoss = currentUser.role === "boss";

  const salesWorkspaceItems = [
    { id: "overview", label: isBoss ? "Executive Overview" : "Today's Priorities", href: "/", icon: isBoss ? LayoutDashboard : Home },
    { id: "leads", label: isBoss ? "All Leads" : "My Leads", href: "/leads", icon: Users },
    { id: "pipeline", label: "Deal Pipeline", href: "/pipeline", icon: Kanban },
    { id: "tasks", label: "Follow-up Queue", href: "/tasks", icon: ListTodo },
  ];

  const propertyIntelItems = [
    { id: "projects", label: "Projects & Societies", href: "/projects", icon: Building2 },
    { id: "people", label: "People Directory", href: "/people", icon: Contact },
    { id: "activities", label: "Touchpoint Activity", href: "/activities", icon: Activity },
  ];

  const intelligenceItems = [
    { id: "ai-agent", label: "Aria AI Agent", href: "/agent-live", icon: Bot, highlight: true },
  ];

  const adminNavItems = [
    { id: "reports", label: "Executive Reports", href: "/reports", icon: ChartNoAxesCombined },
    { id: "users", label: "Team Users", href: "/users", icon: Users },
    { id: "regions", label: "Regional Desks", href: "/regions", icon: MapPin },
    { id: "billing", label: "Billing & Plans", href: "/billing", icon: CreditCard },
    { id: "settings", label: "Settings", href: "/settings", icon: Settings },
  ];

  const handleNavClick = (id: string, e: React.MouseEvent) => {
    if (onSelectTab) {
      e.preventDefault();
      onSelectTab(id);
    }
  };

  return (
    <aside
      className={cn(
        "w-60 shrink-0 border-r border-border bg-card flex flex-col justify-between h-full select-none",
        className
      )}
    >
      {/* Top Organization Header */}
      <div className="overflow-y-auto">
        <div className="h-14 px-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-subtle">
              C
            </div>
            <div className="leading-none">
              <span className="font-semibold text-xs text-foreground tracking-tight block">
                CallCRM
              </span>
              <span className="text-[10px] text-muted-foreground">Apex Realty</span>
            </div>
          </div>

          <Badge variant={isBoss ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
            {isBoss ? "Boss" : "Sales"}
          </Badge>
        </div>

        {/* 4-Tier Navigation Taxonomy */}
        <div className="px-3 py-3 space-y-4">
          {/* TIER 1: SALES WORKSPACE */}
          <div className="space-y-1">
            <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Sales Workspace
            </div>
            {salesWorkspaceItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab ? activeTab === item.id : pathname === item.href;

              return (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleNavClick(item.id, e)}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-secondary text-foreground font-semibold shadow-subtle"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0 stroke-[1.75]" />
                    <span>{item.label}</span>
                  </div>
                </a>
              );
            })}
          </div>

          {/* TIER 2: PROPERTY INTELLIGENCE */}
          <div className="space-y-1">
            <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Property Intelligence
            </div>
            {propertyIntelItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab ? activeTab === item.id : pathname === item.href;

              return (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleNavClick(item.id, e)}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-secondary text-foreground font-semibold shadow-subtle"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0 stroke-[1.75]" />
                    <span>{item.label}</span>
                  </div>
                </a>
              );
            })}
          </div>

          {/* TIER 3: INTELLIGENCE & AUTOMATION */}
          <div className="space-y-1">
            <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Intelligence &amp; AI
            </div>
            {intelligenceItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab ? activeTab === item.id : pathname === item.href;

              return (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleNavClick(item.id, e)}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-secondary text-foreground font-semibold shadow-subtle"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={cn("h-4 w-4 shrink-0 stroke-[1.75]", item.highlight && "text-verdigris")} />
                    <span>{item.label}</span>
                  </div>
                  {item.highlight && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-verdigris-light text-verdigris border border-verdigris-border">
                      LIVE
                    </span>
                  )}
                </a>
              );
            })}
          </div>

          {/* TIER 4: MANAGEMENT & ADMIN (Boss only) */}
          {isBoss && (
            <div className="space-y-1">
              <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Management &amp; Admin
              </div>
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab ? activeTab === item.id : pathname === item.href;

                return (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={(e) => handleNavClick(item.id, e)}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
                      isActive
                        ? "bg-secondary text-foreground font-semibold"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 stroke-[1.75]" />
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Current User Identity */}
      <div className="p-3 border-t border-border bg-secondary/30 space-y-2 shrink-0">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Signed in as
        </div>

        <div className="flex items-center gap-1.5 py-1 px-2 rounded text-[11px] font-medium bg-card text-foreground border border-border">
          {isBoss ? (
            <Shield className="h-3 w-3 shrink-0 text-brass" />
          ) : (
            <UserCheck className="h-3 w-3 shrink-0 text-verdigris" />
          )}
          <span className="capitalize">{currentUser.role}</span>
        </div>

        <div className="text-[10px] text-muted-foreground text-center pt-0.5">
          Active: <span className="font-semibold text-foreground">{currentUser.name}</span>
          {currentUser.regionName && ` (${currentUser.regionName})`}
        </div>
      </div>
    </aside>
  );
}
