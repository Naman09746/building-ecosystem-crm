"use client";

import * as React from "react";
import {
  Home,
  Users,
  Plus,
  ListTodo,
  Kanban,
  ChartNoAxesCombined,
  MoreHorizontal,
  Building2,
  Phone,
} from "lucide-react";
import { useCRM } from "@/context/crm-context";
import { NavMoreSheet } from "@/components/layout/nav-more-sheet";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenQuickLog: () => void;
}

export function BottomNav({
  activeTab,
  onSelectTab,
  onOpenQuickLog,
}: BottomNavProps) {
  const { currentUser } = useCRM();
  const [moreOpen, setMoreOpen] = React.useState(false);

  const isExecutive = ["owner", "admin", "boss", "manager"].includes(currentUser.role);

  // Field sales reps focus: Priorities Home, Assigned Leads, Quick Log FAB, Follow-up Queue, More
  // Executive/Boss focus: Executive Overview, Leads, Quick Log FAB, Deal Pipeline, More
  const navItems = isExecutive
    ? [
        { id: "overview", label: "Overview", icon: Home },
        { id: "leads", label: "Leads", icon: Users },
        { id: "pipeline", label: "Pipeline", icon: Kanban },
        { id: "reports", label: "Reports", icon: ChartNoAxesCombined },
      ]
    : [
        { id: "overview", label: "Today", icon: Home },
        { id: "leads", label: "My Leads", icon: Users },
        { id: "tasks", label: "Follow-ups", icon: ListTodo },
        { id: "projects", label: "Inventory", icon: Building2 },
      ];

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-card/98 backdrop-blur-md px-2 flex items-center justify-around z-40 shadow-elevated safe-area-pb"
        aria-label="Mobile Navigation"
      >
        {/* First 2 items */}
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex-1 flex flex-col items-center justify-center h-full py-1 min-h-[44px] transition-all",
                isActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center p-1 rounded-lg transition-all",
                  isActive ? "bg-primary/10" : ""
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}

        {/* Center Quick Action Hero Button (FAB) */}
        <div className="flex-1 flex items-center justify-center">
          <button
            type="button"
            onClick={onOpenQuickLog}
            className="flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg -translate-y-3 border-4 border-background active:scale-95 transition-transform"
            aria-label="Quick Log Call or Activity"
          >
            <Plus className="h-5 w-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Last 2 items (Item 3 + More button) */}
        {navItems.slice(2, 3).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex-1 flex flex-col items-center justify-center h-full py-1 min-h-[44px] transition-all",
                isActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center p-1 rounded-lg transition-all",
                  isActive ? "bg-primary/10" : ""
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}

        {/* More Drawer Trigger */}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex-1 flex flex-col items-center justify-center h-full py-1 min-h-[44px] transition-all",
            moreOpen || !navItems.some((n) => n.id === activeTab)
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div
            className={cn(
              "flex items-center justify-center p-1 rounded-lg transition-all",
              moreOpen || !navItems.some((n) => n.id === activeTab) ? "bg-primary/10" : ""
            )}
          >
            <MoreHorizontal className="h-4 w-4" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">More</span>
        </button>
      </nav>

      <NavMoreSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
      />
    </>
  );
}
