"use client";

import * as React from "react";
import {
  Bell,
  AlertTriangle,
  Clock,
  Flame,
  ShieldAlert,
  CreditCard,
  UserCheck,
  Check,
  CheckCheck,
  ExternalLink,
  Settings,
  Layers,
  Inbox,
} from "lucide-react";
import { NotificationItem, NotificationType } from "@repo/core/types/automation";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { useRouter } from "next/navigation";
import { useAuth } from "@repo/core/context/auth-context";
import { getSupabaseBrowserClient } from "@repo/core/lib/supabase";
import { NotificationPreferencesDialog } from "@/components/crm/notification-preferences-dialog";
import { NotificationsDrawer } from "@/components/crm/notifications-drawer";
import { toast } from "sonner";

export function NotificationBell() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [categoryFilter, setCategoryFilter] = React.useState<"all" | "unread" | "leads" | "tasks" | "billing">("all");
  const [showPreferences, setShowPreferences] = React.useState(false);
  const [showFullHistory, setShowFullHistory] = React.useState(false);

  const loadNotifications = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=20");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setNotifications(json.data.notifications || []);
          setUnreadCount(json.data.unreadCount || 0);
        }
      }
    } catch {
      // silent fallback
    }
  }, []);

  // 1. Initial load & polling fallback
  React.useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 30000);
    return () => clearInterval(timer);
  }, [loadNotifications]);

  // 2. Supabase Realtime channel subscription (User-Scoped)
  React.useEffect(() => {
    if (!authUser?.id) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`user_notifications_${authUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${authUser.id}`,
        },
        (payload: any) => {
          const newNotif = payload.new;
          if (newNotif) {
            setNotifications((prev) => [
              {
                id: newNotif.id,
                orgId: newNotif.org_id,
                userId: newNotif.user_id,
                title: newNotif.title,
                message: newNotif.message,
                type: newNotif.type,
                priority: newNotif.priority,
                entityType: newNotif.entity_type,
                entityId: newNotif.entity_id,
                link: newNotif.link,
                read: newNotif.read,
                createdAt: newNotif.created_at,
              },
              ...prev,
            ]);
            setUnreadCount((c) => c + 1);
            toast.info(newNotif.title, {
              description: newNotif.message,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${authUser.id}`,
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser?.id, loadNotifications]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() })));
        setUnreadCount(0);
        toast.success("All notifications marked as read");
      }
    } catch {
      toast.error("Failed to mark all read");
    }
  };

  const handleItemClick = (item: NotificationItem) => {
    if (!item.read) {
      fetch(`/api/notifications/${item.id}/read`, { method: "PATCH" }).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setIsOpen(false);
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

  const filtered = notifications.filter((n) => {
    if (categoryFilter === "unread") return !n.read;
    if (categoryFilter === "leads")
      return ["lead_created", "lead_assigned", "deal_at_risk", "sla_breach", "manager_escalation"].includes(n.type);
    if (categoryFilter === "tasks")
      return ["task_assigned", "task_overdue", "follow_up_due", "follow_up_overdue"].includes(n.type);
    if (categoryFilter === "billing") return n.type === "billing";
    return true;
  });

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-1.5 rounded-md border border-border bg-secondary/50 text-foreground hover:bg-secondary transition-all"
          aria-label="Open Notifications"
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <>
            {/* Backdrop dismiss */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

            {/* Notification Popover */}
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-card shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="p-3.5 border-b border-border bg-secondary/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">Alert Center</span>
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                      {unreadCount} new
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      <span>Mark all read</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      setShowPreferences(true);
                    }}
                    title="Notification preferences"
                    className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="px-3 py-1.5 border-b border-border/80 bg-muted/30 flex items-center gap-1 overflow-x-auto">
                {(
                  [
                    { id: "all", label: `All (${notifications.length})` },
                    { id: "unread", label: `Unread (${unreadCount})` },
                    { id: "leads", label: "Leads" },
                    { id: "tasks", label: "Tasks" },
                    { id: "billing", label: "Billing" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCategoryFilter(tab.id)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors shrink-0 ${
                      categoryFilter === tab.id
                        ? "bg-card text-foreground font-bold shadow-2xs border border-border/70"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Notification Items List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-border/60 text-xs">
                {filtered.length === 0 ? (
                  <div className="p-8 text-center space-y-2 text-muted-foreground">
                    <Inbox className="h-8 w-8 mx-auto stroke-1 text-muted-foreground/60" />
                    <p className="text-xs font-medium">All caught up! No notifications.</p>
                  </div>
                ) : (
                  filtered.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={`p-3 transition-colors cursor-pointer flex items-start gap-2.5 ${
                        item.read
                          ? "bg-card/40 hover:bg-secondary/40 text-muted-foreground"
                          : "bg-primary/5 hover:bg-primary/10 text-foreground font-medium"
                      }`}
                    >
                      <div className="mt-0.5">{getTypeIcon(item.type)}</div>

                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <p
                            className={`text-xs truncate ${
                              !item.read ? "font-bold text-foreground" : "text-foreground/80"
                            }`}
                          >
                            {item.title}
                          </p>
                          <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {item.message}
                        </p>
                      </div>

                      {!item.read && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(item.id, e)}
                          title="Mark as read"
                          className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground shrink-0"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-2 border-t border-border bg-secondary/20 flex items-center justify-between px-3 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setShowFullHistory(true);
                  }}
                  className="text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                >
                  <Layers className="h-3 w-3" />
                  <span>View all alert history</span>
                </button>

                <span className="text-[10px] text-muted-foreground font-mono">Real-time sync</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Preferences Dialog */}
      <NotificationPreferencesDialog open={showPreferences} onOpenChange={setShowPreferences} />

      {/* Full Alert Center Drawer */}
      <NotificationsDrawer open={showFullHistory} onOpenChange={setShowFullHistory} />
    </>
  );
}
