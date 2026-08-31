"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Building2,
  Contact,
  Activity,
  Bot,
  ChartNoAxesCombined,
  Users,
  MapPin,
  CreditCard,
  Settings,
  ListTodo,
  Kanban,
  UserCheck,
  Shield,
  Layers,
  ChevronRight,
} from "lucide-react";
import { useCRM } from "@/context/crm-context";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NavMoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export function NavMoreSheet({
  open,
  onOpenChange,
  activeTab,
  onSelectTab,
}: NavMoreSheetProps) {
  const { currentUser } = useCRM();
  const isExecutive = ["owner", "admin", "boss", "manager"].includes(currentUser.role);

  const sections: NavSection[] = [
    {
      title: "Sales & Pipeline",
      items: [
        { id: "pipeline", label: "Deal Pipeline", icon: Kanban },
        { id: "tasks", label: "Follow-up Queue", icon: ListTodo },
        { id: "activities", label: "Touchpoint Activity", icon: Activity },
      ],
    },
    {
      title: "Property Intelligence",
      items: [
        { id: "projects", label: "Projects & Inventory", icon: Building2 },
        { id: "people", label: "People Directory", icon: Contact },
      ],
    },
    {
      title: "Intelligence & AI",
      items: [
        { id: "ai-agent", label: "Aria AI Agent", icon: Bot, badge: "LIVE" },
      ],
    },
    ...(isExecutive
      ? [
          {
            title: "Management & Admin",
            items: [
              { id: "reports", label: "Executive Reports", icon: ChartNoAxesCombined },
              { id: "users", label: "Team Directory", icon: Users },
              { id: "regions", label: "Regional Desks", icon: MapPin },
              { id: "billing", label: "Billing & Plans", icon: CreditCard },
              { id: "settings", label: "Settings", icon: Settings },
            ],
          },
        ]
      : [
          {
            title: "Account",
            items: [{ id: "settings", label: "My Settings", icon: Settings }],
          },
        ]),
  ];

  const handleSelect = (tabId: string) => {
    onSelectTab(tabId);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl px-4 py-5">
        <SheetHeader className="pb-3 text-left">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
              C
            </div>
            <SheetTitle className="text-base font-bold text-foreground">
              All Workspaces &amp; Tools
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            Switch between sales pipeline, properties, AI agents, and administrative tools.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 pt-2 overflow-y-auto max-h-[60vh] pb-6">
          {sections.map((section) => (
            <div key={section.title} className="space-y-1.5">
              <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item.id)}
                      className={cn(
                        "w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-all text-left min-h-[44px]",
                        isActive
                          ? "bg-primary text-primary-foreground border-primary shadow-subtle"
                          : "bg-secondary/40 hover:bg-secondary border-border text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                        <span className="font-semibold">{item.label}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {item.badge && (
                          <span
                            className={cn(
                              "text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border",
                              isActive
                                ? "bg-white/20 text-white border-white/30"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight className={cn("h-3.5 w-3.5", isActive ? "text-primary-foreground/70" : "text-muted-foreground/60")} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
