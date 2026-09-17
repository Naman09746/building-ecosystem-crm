"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { Badge } from "@repo/ui/components/badge";
import {
  Bell,
  AlertTriangle,
  Clock,
  Flame,
  ShieldAlert,
  CreditCard,
  UserCheck,
  CheckCheck,
  Check,
  Search,
  Filter,
  Inbox,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { NotificationItem, NotificationType } from "@repo/core/types/automation";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface NotificationsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationsDrawer({ open, onOpenChange }: NotificationsDrawerProps) {
  const router = useRouter();
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [totalCount, setTotalCount] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [category, setCategory] = React.useState<"all" | "unread" | "leads" | "tasks" | "billing" | "system">("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchNotifications = React.useCallback(async (p: number, cat: string) => {
    setIsLoading(true);
    try {
      let url = `/api/notifications?page=${p}&limit=20`;
      if (cat === "unread") {
        url += "&unread=true";
      } else if (cat !== "all") {
        url += `&category=${cat}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setNotifications(json.data.notifications || []);
          setUnreadCount(json.data.unreadCount || 0);
          setTotalCount(json.data.totalCount || 0);
          setTotalPages(json.data.totalPages || 1);
        }
      }
    } catch {
      // silent fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      fetchNotifications(page, category);
    }
  }, [open, page, category, fetchNotifications]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {
      toast.error("Failed to update notification");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications/mark-all-read", { method: "POST" });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }))
        );
        setUnreadCount(0);
        toast.success("All notifications marked as read");
      }
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const handleItemClick = (item: NotificationItem) => {
    if (!item.read) {
      handleMarkAsRead(item.id);
    }
    onOpenChange(false);
    if (item.link) {
      router.push(item.link);
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case "sla_breach":
        return <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />;
      case "manager_escalation":
        return <ShieldAlert className="h-4 w-4 text-destructive shrink-0" />;
      case "deal_at_risk":
        return <Flame className="h-4 w-4 text-rose-600 shrink-0" />;
      case "overdue_task":
      case "follow_up_overdue":
        return <Clock className="h-4 w-4 text-orange-600 shrink-0" />;
      case "lead_assigned":
      case "lead_created":
        return <UserCheck className="h-4 w-4 text-emerald-600 shrink-0" />;
      case "billing":
        return <CreditCard className="h-4 w-4 text-indigo-600 shrink-0" />;
      default:
        return <Bell className="h-4 w-4 text-primary shrink-0" />;
    }
  };

  const filtered = notifications.filter(
    (n) =>
      !searchQuery ||
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] p-0 flex flex-col bg-card border-border shadow-2xl rounded-2xl overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-border bg-secondary/20 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold text-foreground">
                  Alert Center & Notification History
                </DialogTitle>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                    {unreadCount} unread
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Centralized multi-tenant alert stream for leads, SLA breaches, and tasks.
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Mark all read</span>
            </Button>
          )}
        </DialogHeader>

        {/* Filter Controls & Search */}
        <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {(
              [
                { id: "all", label: "All" },
                { id: "unread", label: `Unread (${unreadCount})` },
                { id: "leads", label: "Leads & SLAs" },
                { id: "tasks", label: "Tasks" },
                { id: "billing", label: "Billing" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setCategory(tab.id);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  category === tab.id
                    ? "bg-card text-foreground font-bold shadow-2xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-48 sm:w-56">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-7 pl-8 pr-3 rounded-md border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/60">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              Loading notification records...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center space-y-2 text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto stroke-1 text-muted-foreground/50" />
              <p className="text-sm font-semibold text-foreground">You&apos;re all caught up</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No notifications matching the selected filter right now.
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`p-4 transition-all cursor-pointer flex items-start gap-3.5 hover:bg-secondary/30 ${
                  item.read ? "bg-card text-muted-foreground" : "bg-primary/5 text-foreground font-medium"
                }`}
              >
                <div className="mt-0.5 p-2 rounded-xl bg-card border border-border shadow-2xs">
                  {getTypeIcon(item.type)}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs ${!item.read ? "font-bold text-foreground" : "font-semibold text-foreground/80"}`}>
                      {item.title}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                      {new Date(item.createdAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {item.message}
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <Badge variant="outline" className="text-[10px] capitalize font-mono py-0 h-4">
                      {item.type.replace("_", " ")}
                    </Badge>
                    {item.priority === "urgent" && (
                      <Badge variant="destructive" className="text-[10px] py-0 h-4 uppercase font-bold">
                        Urgent
                      </Badge>
                    )}
                  </div>
                </div>

                {!item.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleMarkAsRead(item.id, e)}
                    className="h-7 px-2 text-xs font-semibold text-primary hover:text-primary/80 shrink-0"
                    title="Mark as read"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer Pagination */}
        <div className="p-3 border-t border-border bg-secondary/20 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing page <strong className="text-foreground">{page}</strong> of <strong className="text-foreground">{totalPages}</strong> ({totalCount} total alerts)
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 px-2 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              <span>Previous</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => p + 1)}
              className="h-7 px-2 text-xs"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
