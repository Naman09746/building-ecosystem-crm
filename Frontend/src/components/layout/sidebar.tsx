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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useCRM } from "@/context/crm-context";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  className?: string;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  className,
  activeTab,
  onSelectTab,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const { currentUser } = useCRM();

  // Role-Aware Navigation (Consolidated Tier 1: Boss/Admin/Owner/Manager vs Tier 2: Salesperson/Closer)
  const isExecutive = ["owner", "admin", "boss", "manager"].includes(currentUser.role);

  const salesWorkspaceItems = [
    { id: "overview", label: isExecutive ? "Executive Overview" : "Today's Priorities", href: "/", icon: isExecutive ? LayoutDashboard : Home },
    { id: "leads", label: isExecutive ? "All Leads" : "My Leads", href: "/leads", icon: Users },
    { id: "pipeline", label: "Deal Pipeline", href: "/pipeline", icon: Kanban },
    { id: "tasks", label: "Follow-up Queue", href: "/tasks", icon: ListTodo },
  ];

  const propertyIntelItems = [
    { id: "projects", label: "Projects & Inventory", href: "/projects", icon: Building2 },
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
        "shrink-0 border-r border-border bg-card flex flex-col justify-between h-full select-none transition-all duration-200 ease-in-out",
        collapsed ? "w-16" : "w-60",
        className
      )}
    >
      {/* Top Organization Header */}
      <div className="overflow-y-auto overflow-x-hidden">
        <div className={cn("h-14 px-3 border-b border-border flex items-center justify-between", collapsed && "justify-center px-2")}>
          {!collapsed ? (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-subtle shrink-0">
                  C
                </div>
                <div className="leading-none truncate">
                  <span className="font-semibold text-xs text-foreground tracking-tight block truncate">
                    CallCRM
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">Apex Realty</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Badge variant={isExecutive ? "default" : "secondary"} className="text-[9px] px-1.5 py-0 capitalize">
                  {currentUser.role}
                </Badge>
                {onToggleCollapse && (
                  <button
                    type="button"
                    onClick={onToggleCollapse}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    title="Collapse Sidebar"
                  >
                    <PanelLeftClose className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={onToggleCollapse}
                className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-subtle hover:opacity-90"
                title="Expand Sidebar"
              >
                C
              </button>
            </div>
          )}
        </div>

        {/* 4-Tier Navigation Taxonomy */}
        <div className={cn("py-3 space-y-4", collapsed ? "px-2" : "px-3")}>
          {/* TIER 1: SALES WORKSPACE */}
          <div className="space-y-1">
            {!collapsed && (
              <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Sales Workspace
              </div>
            )}
            {salesWorkspaceItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab ? activeTab === item.id : pathname === item.href;

              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={(e) => handleNavClick(item.id, e)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center rounded-lg text-xs font-medium transition-colors cursor-pointer min-h-[36px]",
                    collapsed ? "justify-center p-2" : "justify-between px-2.5 py-1.5",
                    isActive
                      ? "bg-secondary text-foreground font-semibold shadow-subtle"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0 stroke-[1.75]" />
                    {!collapsed && <span>{item.label}</span>}
                  </div>
                </a>
              );
            })}
          </div>

          {/* TIER 2: PROPERTY INTELLIGENCE */}
          <div className="space-y-1">
            {!collapsed && (
              <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Property Intelligence
              </div>
            )}
            {propertyIntelItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab ? activeTab === item.id : pathname === item.href;

              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={(e) => handleNavClick(item.id, e)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center rounded-lg text-xs font-medium transition-colors cursor-pointer min-h-[36px]",
                    collapsed ? "justify-center p-2" : "justify-between px-2.5 py-1.5",
                    isActive
                      ? "bg-secondary text-foreground font-semibold shadow-subtle"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0 stroke-[1.75]" />
                    {!collapsed && <span>{item.label}</span>}
                  </div>
                </a>
              );
            })}
          </div>

          {/* TIER 3: INTELLIGENCE & AI */}
          <div className="space-y-1">
            {!collapsed && (
              <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Intelligence &amp; AI
              </div>
            )}
            {intelligenceItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab ? activeTab === item.id : pathname === item.href;

              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={(e) => handleNavClick(item.id, e)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center rounded-lg text-xs font-medium transition-colors cursor-pointer min-h-[36px]",
                    collapsed ? "justify-center p-2" : "justify-between px-2.5 py-1.5",
                    isActive
                      ? "bg-secondary text-foreground font-semibold shadow-subtle"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={cn("h-4 w-4 shrink-0 stroke-[1.75]", item.highlight && "text-verdigris")} />
                    {!collapsed && <span>{item.label}</span>}
                  </div>
                  {!collapsed && item.highlight && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-verdigris-light text-verdigris border border-verdigris-border">
                      LIVE
                    </span>
                  )}
                </a>
              );
            })}
          </div>

          {/* TIER 4: MANAGEMENT & ADMIN (Boss / Owner / Admin / Manager) */}
          {isExecutive && (
            <div className="space-y-1">
              {!collapsed && (
                <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Management &amp; Admin
                </div>
              )}
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab ? activeTab === item.id : pathname === item.href;

                return (
                  <a
                    key={item.id}
                    href={item.href}
                    onClick={(e) => handleNavClick(item.id, e)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center rounded-lg text-xs font-medium transition-colors cursor-pointer min-h-[36px]",
                      collapsed ? "justify-center p-2" : "justify-between px-2.5 py-1.5",
                      isActive
                        ? "bg-secondary text-foreground font-semibold"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 shrink-0 stroke-[1.75]" />
                      {!collapsed && <span>{item.label}</span>}
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Current User Identity */}
      <div className={cn("border-t border-border bg-secondary/30 shrink-0", collapsed ? "p-2" : "p-3 space-y-2")}>
        {!collapsed ? (
          <>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Signed in as
            </div>

            <div className="flex items-center gap-1.5 py-1 px-2 rounded text-[11px] font-medium bg-card text-foreground border border-border">
              {isExecutive ? (
                <Shield className="h-3 w-3 shrink-0 text-brass" />
              ) : (
                <UserCheck className="h-3 w-3 shrink-0 text-verdigris" />
              )}
              <span className="capitalize">{currentUser.role}</span>
            </div>

            <div className="text-[10px] text-muted-foreground text-center pt-0.5 truncate">
              Active: <span className="font-semibold text-foreground">{currentUser.name}</span>
              {currentUser.regionName && ` (${currentUser.regionName})`}
            </div>
          </>
        ) : (
          <div className="flex justify-center" title={`${currentUser.name} (${currentUser.role})`}>
            <div className="h-7 w-7 rounded-full bg-secondary text-foreground flex items-center justify-center font-bold text-xs border border-border">
              {currentUser.name.slice(0, 1).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
