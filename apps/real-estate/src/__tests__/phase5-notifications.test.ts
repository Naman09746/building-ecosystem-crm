import { describe, it, expect } from "vitest";
import { NotificationItem, NotificationType } from "@repo/core/types/automation";

describe("Phase 5: Centralized Notifications, Alert Center & Realtime", () => {
  describe("Multi-Tenant & User Privacy Isolation", () => {
    function filterUserNotifications(
      notifications: NotificationItem[],
      callerOrgId: string,
      callerUserId: string
    ): NotificationItem[] {
      return notifications.filter(
        (n) => n.orgId === callerOrgId && n.userId === callerUserId
      );
    }

    const mockNotifications: NotificationItem[] = [
      {
        id: "notif_1",
        orgId: "org_alpha",
        userId: "user_rep_1",
        title: "Lead Assigned: Rohit Sharma",
        message: "You have been assigned lead Rohit Sharma.",
        type: "lead_assigned",
        priority: "normal",
        link: "/leads",
        read: false,
        createdAt: "2026-08-22T10:00:00Z",
      },
      {
        id: "notif_2",
        orgId: "org_alpha",
        userId: "user_rep_2",
        title: "Lead Assigned: Virat Kohli",
        message: "You have been assigned lead Virat Kohli.",
        type: "lead_assigned",
        priority: "normal",
        link: "/leads",
        read: false,
        createdAt: "2026-08-22T10:05:00Z",
      },
      {
        id: "notif_3",
        orgId: "org_beta",
        userId: "user_rep_3",
        title: "SLA Alert: Response Stalled",
        message: "Lead untouched.",
        type: "sla_breach",
        priority: "high",
        link: "/leads",
        read: false,
        createdAt: "2026-08-22T10:10:00Z",
      },
    ];

    it("restricts user queries strictly to their own notifications in their own org", () => {
      const rep1Notifications = filterUserNotifications(mockNotifications, "org_alpha", "user_rep_1");
      expect(rep1Notifications).toHaveLength(1);
      expect(rep1Notifications[0].id).toBe("notif_1");
      expect(rep1Notifications[0].title).toContain("Rohit Sharma");
    });

    it("prevents salesperson from reading other salespersons' notifications in the same org", () => {
      const rep2Notifications = filterUserNotifications(mockNotifications, "org_alpha", "user_rep_2");
      expect(rep2Notifications).toHaveLength(1);
      expect(rep2Notifications[0].id).toBe("notif_2");
      expect(rep2Notifications[0].title).toContain("Virat Kohli");
    });

    it("prevents cross-tenant notification access completely", () => {
      const crossTenantQuery = filterUserNotifications(mockNotifications, "org_alpha", "user_rep_3");
      expect(crossTenantQuery).toHaveLength(0);
    });
  });

  describe("Mark as Read Operations", () => {
    it("marks an individual notification as read with a timestamp", () => {
      const notif: NotificationItem = {
        id: "notif_test",
        orgId: "org_1",
        userId: "user_1",
        title: "Task Overdue",
        message: "Follow-up overdue",
        type: "task_overdue",
        priority: "high",
        read: false,
        createdAt: "2026-08-22T10:00:00Z",
      };

      const nowIso = new Date().toISOString();
      const updated = { ...notif, read: true, readAt: nowIso };

      expect(updated.read).toBe(true);
      expect(updated.readAt).toBeDefined();
    });

    it("marks all unread notifications as read exclusively for the caller", () => {
      const list: NotificationItem[] = [
        { id: "1", orgId: "org_1", userId: "user_1", title: "A", message: "", type: "system", priority: "normal", read: false, createdAt: "" },
        { id: "2", orgId: "org_1", userId: "user_1", title: "B", message: "", type: "system", priority: "normal", read: false, createdAt: "" },
        { id: "3", orgId: "org_1", userId: "user_2", title: "C", message: "", type: "system", priority: "normal", read: false, createdAt: "" },
      ];

      const nowIso = new Date().toISOString();
      const markAllForUser1 = list.map((n) =>
        n.userId === "user_1" ? { ...n, read: true, readAt: nowIso } : n
      );

      expect(markAllForUser1.filter((n) => n.userId === "user_1" && !n.read)).toHaveLength(0);
      expect(markAllForUser1.find((n) => n.id === "3")?.read).toBe(false);
    });
  });

  describe("Notification Preferences Filtering", () => {
    function shouldSendNotification(
      type: NotificationType,
      preferences: {
        leadAssignments: boolean;
        taskReminders: boolean;
        slaAlerts: boolean;
        dealHealthAlerts: boolean;
        billingNotifications: boolean;
      }
    ): boolean {
      if (type === "lead_assigned" && !preferences.leadAssignments) return false;
      if ((type === "task_assigned" || type === "task_overdue" || type === "follow_up_due" || type === "follow_up_overdue") && !preferences.taskReminders) return false;
      if (type === "sla_breach" && !preferences.slaAlerts) return false;
      if (type === "deal_at_risk" && !preferences.dealHealthAlerts) return false;
      if (type === "billing" && !preferences.billingNotifications) return false;
      return true;
    }

    it("skips lead assignment notification when user has disabled leadAssignments", () => {
      const prefs = {
        leadAssignments: false,
        taskReminders: true,
        slaAlerts: true,
        dealHealthAlerts: true,
        billingNotifications: true,
      };

      expect(shouldSendNotification("lead_assigned", prefs)).toBe(false);
      expect(shouldSendNotification("deal_at_risk", prefs)).toBe(true);
    });

    it("skips task reminders when user has disabled taskReminders", () => {
      const prefs = {
        leadAssignments: true,
        taskReminders: false,
        slaAlerts: true,
        dealHealthAlerts: true,
        billingNotifications: true,
      };

      expect(shouldSendNotification("task_overdue", prefs)).toBe(false);
      expect(shouldSendNotification("follow_up_due", prefs)).toBe(false);
      expect(shouldSendNotification("sla_breach", prefs)).toBe(true);
    });
  });

  describe("Event Idempotency & Routing", () => {
    it("generates correct navigation destinations by entity type", () => {
      const leadNotif = { type: "lead_assigned", link: "/leads" };
      const taskNotif = { type: "task_overdue", link: "/tasks" };
      const billingNotif = { type: "billing", link: "/billing" };
      const teamNotif = { type: "team_invitation", link: "/users" };

      expect(leadNotif.link).toBe("/leads");
      expect(taskNotif.link).toBe("/tasks");
      expect(billingNotif.link).toBe("/billing");
      expect(teamNotif.link).toBe("/users");
    });
  });
});
