"use client";

import * as React from "react";
import {
  Search,
  Users,
  Building2,
  User,
  Phone,
  ArrowRight,
  Home,
  Plus,
  ListTodo,
  Columns3,
  Layers,
  Sparkles,
  Command,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { useCRM } from "@repo/core/context/crm-context";
import { Lead, Project } from "@repo/core/types/crm";
import { Dialog, DialogContent } from "@repo/ui/components/dialog";
import { PipelineBadge, DealHealthBadge, LeadScoreBadge, UnitStatusBadge } from "@repo/ui/components/status-badge";
import { formatCurrencyINR, formatPhone } from "@repo/core/lib/utils";

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectLead: (lead: Lead) => void;
  onNavigateTab?: (tab: string) => void;
  onOpenQuickLog?: () => void;
  onOpenCreateLead?: () => void;
}

interface CommandItem {
  id: string;
  category: "command" | "lead" | "project" | "unit" | "person";
  title: string;
  subtitle?: string;
  badge?: string;
  icon: any;
  action: () => void;
  lead?: Lead;
}

export function GlobalSearchDialog({
  open,
  onOpenChange,
  onSelectLead,
  onNavigateTab,
  onOpenQuickLog,
  onOpenCreateLead,
}: GlobalSearchDialogProps) {
  const { leads, projects, units, people, setSelectedProjectId } = useCRM();
  const [query, setQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [serverResults, setServerResults] = React.useState<any[]>([]);

  // Keyboard shortcut listener for Cmd+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange]);

  // Reset search when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setServerResults([]);
    }
  }, [open]);

  // Server-side debounced search query
  React.useEffect(() => {
    if (!query || query.trim().length < 2) {
      setServerResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/global?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setServerResults(json.data);
          }
        }
      } catch {
        // Fallback gracefully to local context items
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Build unified search items
  const items: CommandItem[] = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list: CommandItem[] = [];

    // 1. Static & Dynamic Commands
    const commands: CommandItem[] = [
      {
        id: "cmd-create-lead",
        category: "command",
        title: "Create New Lead Entry",
        subtitle: "Add fresh real-estate buyer inquiry",
        icon: Plus,
        action: () => {
          onOpenChange(false);
          if (onNavigateTab) onNavigateTab("leads");
          if (onOpenCreateLead) onOpenCreateLead();
        },
      },
      {
        id: "cmd-log-call",
        category: "command",
        title: "Log Call / WhatsApp Activity",
        subtitle: "10-second rapid touchpoint recording",
        icon: Phone,
        action: () => {
          onOpenChange(false);
          if (onOpenQuickLog) onOpenQuickLog();
        },
      },
      {
        id: "cmd-overdue",
        category: "command",
        title: "Show Overdue Calling Queue",
        subtitle: "Critical follow-ups needing instant outreach",
        badge: "🔴 Urgency",
        icon: AlertTriangle,
        action: () => {
          onOpenChange(false);
          if (onNavigateTab) onNavigateTab("tasks");
        },
      },
      {
        id: "cmd-pipeline",
        category: "command",
        title: "Go to Sales Pipeline Board",
        subtitle: "Kanban deal distribution & stage matrix",
        icon: Columns3,
        action: () => {
          onOpenChange(false);
          if (onNavigateTab) onNavigateTab("pipeline");
        },
      },
      {
        id: "cmd-inventory",
        category: "command",
        title: "Open Unit Inventory Matrix",
        subtitle: "Tower → Floor → Unit availability grid",
        icon: Layers,
        action: () => {
          onOpenChange(false);
          if (onNavigateTab) onNavigateTab("projects");
        },
      },
      {
        id: "cmd-reports",
        category: "command",
        title: "Go to Executive Analytics & Reports",
        subtitle: "Conversion bottlenecks and rep SLAs",
        icon: TrendingUp,
        action: () => {
          onOpenChange(false);
          if (onNavigateTab) onNavigateTab("reports");
        },
      },
    ];

    if (q) {
      commands.forEach((c) => {
        if (c.title.toLowerCase().includes(q) || (c.subtitle && c.subtitle.toLowerCase().includes(q))) {
          list.push(c);
        }
      });
    } else {
      list.push(...commands.slice(0, 4));
    }

    // 2. Matched Leads
    leads.forEach((l) => {
      if (
        !q ||
        l.personName.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        l.projectName.toLowerCase().includes(q) ||
        (l.assignedUnitNumber && l.assignedUnitNumber.toLowerCase().includes(q))
      ) {
        list.push({
          id: `lead-${l.id}`,
          category: "lead",
          title: l.personName,
          subtitle: `${formatPhone(l.phone)} • ${l.projectName} ${l.assignedUnitNumber ? `(Unit ${l.assignedUnitNumber})` : ""} • ${formatCurrencyINR(l.budget)}`,
          badge: l.stage.toUpperCase(),
          icon: User,
          lead: l,
          action: () => {
            onOpenChange(false);
            onSelectLead(l);
          },
        });
      }
    });

    // 3. Matched Projects
    projects.forEach((p) => {
      if (!q || p.name.toLowerCase().includes(q) || p.regionName.toLowerCase().includes(q) || p.developer.toLowerCase().includes(q)) {
        list.push({
          id: `proj-${p.id}`,
          category: "project",
          title: `Open ${p.name}`,
          subtitle: `${p.regionName} • ${p.developer} • Price: ${p.priceRange}`,
          badge: `${p.activeLeadsCount} Leads`,
          icon: Building2,
          action: () => {
            onOpenChange(false);
            setSelectedProjectId(p.id);
            if (onNavigateTab) onNavigateTab("projects");
          },
        });
      }
    });

    // 4. Matched Units
    if (q) {
      units.forEach((u) => {
        if (
          u.unitNumber.toLowerCase().includes(q) ||
          u.tower.toLowerCase().includes(q) ||
          (u.assignedBuyerName && u.assignedBuyerName.toLowerCase().includes(q))
        ) {
          list.push({
            id: `unit-${u.id}`,
            category: "unit",
            title: `Unit ${u.tower}-${u.unitNumber}`,
            subtitle: `${u.projectName} • ${u.configuration} • ${formatCurrencyINR(u.askingPrice || u.price)} ${u.assignedBuyerName ? `• Buyer: ${u.assignedBuyerName}` : ""}`,
            badge: u.status.toUpperCase(),
            icon: Home,
            action: () => {
              onOpenChange(false);
              setSelectedProjectId(u.projectId);
              if (onNavigateTab) onNavigateTab("projects");
            },
          });
        }
      });
    }

    return list;
  }, [query, leads, projects, units, onNavigateTab, onOpenCreateLead, onOpenQuickLog, onSelectLead, setSelectedProjectId, onOpenChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < items.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : items.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[selectedIndex]) {
        items[selectedIndex].action();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 border border-border bg-card shadow-2xl overflow-hidden rounded-xl">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-secondary/30">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search leads, projects, towers, units, phone numbers, or actions... (Cmd+K)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            autoFocus
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded border border-border bg-secondary text-muted-foreground">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1 divide-y divide-border/30">
          {items.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No matching results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            items.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;

              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors pt-2 ${
                    isSelected ? "bg-primary/10 text-foreground" : "hover:bg-secondary/60 text-foreground/90"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-md shrink-0 ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground truncate">{item.title}</span>
                        {item.badge && (
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase ${
                              item.badge.includes("URGENCY")
                                ? "border-red-500/30 text-red-600 bg-red-500/10"
                                : "border-border bg-secondary text-muted-foreground"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{item.subtitle}</p>
                      )}
                    </div>
                  </div>

                  <ArrowRight
                    className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                      isSelected ? "text-primary translate-x-0.5" : "text-muted-foreground/40"
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-secondary/50 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
          <span>EcosystemRealty Global Entity Index</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
