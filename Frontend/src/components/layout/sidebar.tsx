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
  ChevronDown,
  Check,
  Boxes,
  Palette,
  Compass,
  HardHat,
} from "lucide-react";
import { useCRM } from "@/context/crm-context";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { isManagerRole, roleLabel } from "@/lib/rbac";

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
  const { currentUser, users, switchActiveUser, vertical, complexityMode, verticalProfile, getTerm } = useCRM();
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  // Role-Aware Navigation (Consolidated Tier 1: Owner/Manager vs Tier 2: Salesperson)
  const isExecutive = isManagerRole(currentUser.role);

  const inventoryIcon =
    vertical === "building_materials"
      ? Boxes
      : vertical === "interior_furniture"
      ? Palette
      : vertical === "architecture_design"
      ? Compass
      : vertical === "contractor_builder"
      ? HardHat
      : Building2;

  const salesWorkspaceItems = [
    { 
      id: "overview", 
      label: isExecutive 
        ? verticalProfile?.primaryNav[0]?.label || "Executive Overview" 
        : "Today's Priorities", 
      href: "/", 
      icon: isExecutive ? LayoutDashboard : Home 
    },
    { 
      id: "leads", 
      label: isExecutive 
        ? verticalProfile?.terms.leadLabel + "s" || "All Leads" 
        : "My Leads", 
      href: "/leads", 
      icon: Users 
    },
    { 
      id: "pipeline", 
      label: (verticalProfile?.terms.dealLabel ? `${verticalProfile.terms.dealLabel} Pipeline` : "Deal Pipeline"), 
      href: "/pipeline", 
      icon: Kanban 
    },
    { 
      id: "tasks", 
      label: verticalProfile?.primaryNav[3]?.label || "Follow-up Queue", 
      href: "/tasks", 
      icon: ListTodo 
    },
  ];

  const propertyIntelItems = [
    { 
      id: "projects", 
      label: verticalProfile?.inventoryNav.label || "Projects & Inventory", 
      href: "/projects", 
      icon: inventoryIcon 
    },
    { id: "people", label: "People Directory", href: "/people", icon: Contact },
    { id: "activities", label: "Touchpoint Activity", href: "/activities", icon: Activity },
  ];

  const adminNavItems = [
    { id: "reports", label: "Executive Reports", href: "/reports", icon: ChartNoAxesCombined },
    { id: "users", label: "Team Users", href: "/users", icon: Users },
    ...(complexityMode === "simple" ? [] : [{ id: "regions", label: "Regional Desks", href: "/regions", icon: MapPin }]),
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
        "shrink-0 border-r border-border bg-card flex flex-col justify-between h-full select-none transition-all duration-200 ease-in-out relative",
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
                  <span className="text-[10px] text-muted-foreground truncate block">
                    {verticalProfile?.badge || "Building Ecosystem"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {complexityMode === "simple" && (
                  <Badge variant="outline" className="text-[8px] px-1 py-0 border-emerald-500/40 text-emerald-500 font-mono">
                    Lite
                  </Badge>
                )}
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

        {/* 3-Tier Navigation Taxonomy */}
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

          {/* Management section */}
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

      {/* Current User Identity & Role Switcher */}
      <div className={cn("border-t border-border bg-secondary/30 shrink-0 relative", collapsed ? "p-2" : "p-2.5")}>
        {!collapsed ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
              <span>Signed In As</span>
              <span className="text-[9px] text-primary font-mono lowercase">switch</span>
            </div>

            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center justify-between gap-1.5 p-2 rounded-lg text-left bg-card text-foreground border border-border hover:border-primary/40 transition-all shadow-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={cn(
                    "h-6 w-6 rounded-md flex items-center justify-center shrink-0 text-xs font-bold",
                    isExecutive
                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                      : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                  )}
                >
                  {isExecutive ? (
                    <Shield className="h-3.5 w-3.5 text-amber-700" />
                  ) : (
                    <UserCheck className="h-3.5 w-3.5 text-emerald-700" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-xs text-foreground truncate leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground capitalize truncate leading-tight">
                    {currentUser.role === "salesperson"
                      ? `Salesperson • ${currentUser.regionName || "NCR"}`
                      : "Owner / Manager"}
                  </div>
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform",
                  userMenuOpen && "rotate-180"
                )}
              />
            </button>

            {/* User & Role Switcher Dropdown */}
            {userMenuOpen && (
              <div className="absolute bottom-full left-2 right-2 mb-1 bg-card border border-border rounded-xl shadow-xl py-1.5 z-50 text-xs space-y-1 animate-in fade-in-50 slide-in-from-bottom-2">
                <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60">
                  Switch Role / Persona
                </div>

                <div className="max-h-52 overflow-y-auto space-y-0.5 px-1">
                  {users.map((u) => {
                    const isSelected = currentUser.id === u.id;
                    const isUserExec = isManagerRole(u.role);

                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          switchActiveUser(u.id);
                          setUserMenuOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors",
                          isSelected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={cn(
                              "h-5 w-5 rounded flex items-center justify-center shrink-0 text-[10px]",
                              isUserExec ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
                            )}
                          >
                            {isUserExec ? "👑" : "⚡"}
                          </div>
                          <div className="truncate">
                            <div className="text-xs truncate">{u.name}</div>
                            <div className="text-[10px] text-muted-foreground capitalize">
                              {u.role === "salesperson"
                                ? `Salesperson (${u.regionName || "Hub"})`
                                : `${roleLabel(u.role)} (${u.regionName || "All Regions"})`}
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex justify-center w-full"
            title={`${currentUser.name} (${currentUser.role}) — Click to switch`}
          >
            <div className="h-7 w-7 rounded-full bg-secondary text-foreground flex items-center justify-center font-bold text-xs border border-border">
              {currentUser.name.slice(0, 1).toUpperCase()}
            </div>
          </button>
        )}
      </div>
    </aside>
  );
}
