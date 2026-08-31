"use client";

import * as React from "react";
import {
  ListTodo,
  Plus,
  CheckCircle2,
  Phone,
  MessageSquare,
  Clock,
  Building2,
  AlertTriangle,
  Search,
  CheckCircle,
  CalendarCheck,
  ChevronRight,
} from "lucide-react";
import { useCRM } from "@/context/crm-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TaskStatusBadge } from "@/components/ui/status-badge";
import { formatPhone } from "@/lib/utils";
import { QuickActivityModal } from "@/components/crm/quick-activity-modal";
import { Lead } from "@/types/crm";

interface TasksPageProps {
  onSelectLead?: (lead: Lead) => void;
  onOpenQuickLog?: (leadId?: string) => void;
}

export function TasksPage({ onSelectLead, onOpenQuickLog }: TasksPageProps = {}) {
  const { filteredTasks, completeTask, users, leads } = useCRM();
  const [filter, setFilter] = React.useState<"all" | "overdue" | "due_today" | "upcoming" | "completed">("all");
  const [search, setSearch] = React.useState("");
  const [repFilter, setRepFilter] = React.useState("all");
  const [quickLogOpen, setQuickLogOpen] = React.useState(false);
  const [quickLogLeadId, setQuickLogLeadId] = React.useState<string | undefined>();

  const salespeople = users.filter((u) => u.role === "salesperson");

  const overdueCount = filteredTasks.filter((t) => t.status === "overdue").length;
  const dueTodayCount = filteredTasks.filter((t) => t.status === "due_today").length;
  const upcomingCount = filteredTasks.filter((t) => t.status === "upcoming").length;
  const completedCount = filteredTasks.filter((t) => t.status === "completed").length;

  // Today's completion progress metric
  const todayTotal = dueTodayCount + overdueCount + completedCount;
  const todayProgressPercent = todayTotal > 0 ? Math.round((completedCount / todayTotal) * 100) : 100;

  // Sort: Overdue first (ordered by budget desc), then due_today (by budget desc), then upcoming, then completed
  const sortedTasks = React.useMemo(() => {
    return [...filteredTasks]
      .filter((t) => {
        const matchFilter = filter === "all" || t.status === filter;
        const matchSearch =
          t.personName.toLowerCase().includes(search.toLowerCase()) ||
          t.phone.includes(search) ||
          t.projectName.toLowerCase().includes(search.toLowerCase()) ||
          t.title.toLowerCase().includes(search.toLowerCase());
        const matchRep = repFilter === "all" || t.salespersonId === repFilter;
        return matchFilter && matchSearch && matchRep;
      })
      .sort((a, b) => {
        const priorityOrder: Record<string, number> = { overdue: 0, due_today: 1, upcoming: 2, completed: 3 };
        const orderDiff = (priorityOrder[a.status] ?? 4) - (priorityOrder[b.status] ?? 4);
        if (orderDiff !== 0) return orderDiff;

        // If same status, sort by associated lead budget descending
        const leadA = leads.find((l) => l.id === a.leadId);
        const leadB = leads.find((l) => l.id === b.leadId);
        return (leadB?.budget || 0) - (leadA?.budget || 0);
      });
  }, [filteredTasks, filter, search, repFilter, leads]);

  const handleLog = (leadId: string) => {
    if (onOpenQuickLog) {
      onOpenQuickLog(leadId);
    } else {
      setQuickLogLeadId(leadId);
      setQuickLogOpen(true);
    }
  };

  const handleLeadClick = (leadId: string) => {
    if (!onSelectLead) return;
    const lead = leads.find((l) => l.id === leadId);
    if (lead) onSelectLead(lead);
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header with Today's Calling Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-primary" />
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground">
              Follow-up &amp; Outreach Queue
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ranked list prioritizing overdue SLAs and high-ticket buyers with 1-tap dialer.
          </p>
        </div>

        {/* Priority Summary Badges */}
        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <div className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{overdueCount} Overdue</span>
            </div>
          )}
          <div className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
            {dueTodayCount} Due Today
          </div>
        </div>
      </div>

      {/* Today's Calling Progress Banner */}
      <div className="p-3.5 rounded-xl border border-border bg-card shadow-subtle space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-bold text-foreground">Outreach Progress:</span>
            <span className="font-semibold text-muted-foreground">
              {completedCount} of {todayTotal} logged ({todayProgressPercent}%)
            </span>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground font-bold">
            {dueTodayCount + overdueCount} remaining
          </span>
        </div>
        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
            style={{ width: `${todayProgressPercent}%` }}
          />
        </div>
      </div>

      {/* Filter Toolbar (Horizontally scrollable on mobile) */}
      <div className="p-3 rounded-xl border border-border bg-card shadow-subtle space-y-2.5 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search buyer, phone, task..."
              className="pl-8 h-9 text-xs bg-secondary/40 rounded-xl"
            />
          </div>

          <select
            value={repFilter}
            onChange={(e) => setRepFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-border bg-secondary/50 text-foreground font-medium text-xs focus:outline-none shrink-0"
          >
            <option value="all">All Sales Reps</option>
            {salespeople.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Segment Pills (Scrollable) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: "all", label: `All (${filteredTasks.length})` },
            { id: "overdue", label: `🔴 Overdue (${overdueCount})` },
            { id: "due_today", label: `🟠 Due Today (${dueTodayCount})` },
            { id: "upcoming", label: `🔵 Upcoming (${upcomingCount})` },
            { id: "completed", label: `🟢 Done (${completedCount})` },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 min-h-[34px] ${
                filter === item.id
                  ? "bg-primary text-primary-foreground font-bold shadow-subtle"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Calling Queue List */}
      <div className="space-y-3">
        {sortedTasks.length === 0 ? (
          <div className="p-10 rounded-xl border border-dashed border-border bg-card text-center text-xs text-muted-foreground">
            No follow-ups found for the selected filter.
          </div>
        ) : (
          sortedTasks.map((task, idx) => {
            const isDone = task.status === "completed";
            const lead = leads.find((l) => l.id === task.leadId);

            return (
              <div
                key={task.id}
                className={`p-3.5 sm:p-4 rounded-xl border shadow-subtle transition-all space-y-3 text-xs ${
                  task.status === "overdue"
                    ? "border-rose-300 bg-rose-50/20"
                    : isDone
                    ? "border-border/60 bg-secondary/20 opacity-75"
                    : "border-border bg-card hover:border-border/90"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Instant Complete Checkbox (44px touch container) */}
                    <button
                      type="button"
                      onClick={() => completeTask(task.id)}
                      disabled={isDone}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        isDone
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-border hover:border-primary hover:bg-primary/10 active:scale-95"
                      }`}
                      title={isDone ? "Task Completed" : "Mark Complete"}
                    >
                      {isDone ? <CheckCircle className="h-4 w-4" /> : null}
                    </button>

                    <div
                      className="min-w-0 cursor-pointer"
                      onClick={() => handleLeadClick(task.leadId)}
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-secondary text-muted-foreground">
                          #{idx + 1}
                        </span>
                        <span className={`font-bold text-sm text-foreground hover:underline ${isDone ? "line-through text-muted-foreground" : ""}`}>
                          {task.personName}
                        </span>
                        <TaskStatusBadge status={task.status} />
                      </div>
                      <span className="text-muted-foreground font-mono text-[11px] block mt-0.5">
                        {formatPhone(task.phone)} · {task.projectName}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    {task.dueTime && (
                      <span className="font-mono text-[11px] font-bold text-primary flex items-center gap-1 justify-end">
                        <Clock className="h-3 w-3" />
                        {task.dueTime}
                      </span>
                    )}
                  </div>
                </div>

                {/* Why this follow-up matters & Recommended Next Action */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-lg bg-secondary/40 border border-border/40 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Why this matters:
                    </span>
                    <p className="text-foreground/90 font-medium leading-relaxed">
                      {lead?.dealHealthReason || task.title || "Follow-up required to maintain sales momentum."}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-primary block">
                      Recommended Action:
                    </span>
                    <p className="text-foreground font-semibold leading-relaxed">
                      {lead?.suggestedNextMove || lead?.recommendedAction || "Call customer to align next milestone."}
                    </p>
                  </div>
                </div>

                {/* 1-Click Calling & Outreach Actions (44px Touch Rows on Mobile) */}
                {!isDone && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
                    <span className="text-[11px] text-muted-foreground font-mono">
                      Rep: <strong>{task.salespersonName}</strong>
                    </span>

                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${task.phone}`}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center h-10 sm:h-8 px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5 mr-1" />
                        Call
                      </a>

                      <a
                        href={`https://wa.me/${task.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                          `Hi ${task.personName}, following up regarding your requirement in ${task.projectName}. When would you like to discuss next steps?`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 sm:flex-none inline-flex items-center justify-center h-10 sm:h-8 px-3 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors"
                      >
                        <MessageSquare className="h-3.5 w-3.5 mr-1" />
                        WhatsApp
                      </a>

                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-10 sm:h-8 px-3 text-xs font-medium shrink-0"
                        onClick={() => handleLog(task.leadId)}
                      >
                        Log Touchpoint
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <QuickActivityModal
        open={quickLogOpen}
        onOpenChange={setQuickLogOpen}
        defaultLeadId={quickLogLeadId}
      />
    </div>
  );
}
