export type NotificationType =
  | "lead_created"
  | "lead_assigned"
  | "follow_up_due"
  | "follow_up_overdue"
  | "deal_at_risk"
  | "sla_breach"
  | "task_assigned"
  | "task_overdue"
  | "overdue_task"
  | "team_invitation"
  | "system"
  | "billing"
  | "security"
  | "manager_escalation";

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export interface NotificationItem {
  id: string;
  orgId: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  entityType?: "lead" | "task" | "project" | "document" | "billing" | "team" | "system";
  entityId?: string;
  link?: string;
  read: boolean;
  readAt?: string;
  dedupKey?: string;
  createdAt: string;
}

export interface NotificationPreferences {
  userId: string;
  orgId: string;
  leadAssignments: boolean;
  taskReminders: boolean;
  slaAlerts: boolean;
  dealHealthAlerts: boolean;
  billingNotifications: boolean;
  updatedAt: string;
}

export interface AutomationLogItem {
  id: string;
  orgId?: string;
  jobName: string;
  status: "success" | "partial_failure" | "failed";
  leadsEvaluated: number;
  overdueTasksDetected: number;
  slaBreachesDetected: number;
  notificationsCreated: number;
  errorDetails?: Record<string, any>;
  durationMs: number;
  createdAt: string;
}

export interface SLAConfiguration {
  newLeadResponseSlaHours: number; // default 2
  inactiveLeadStaleDays: number; // default 5
  siteVisitStaleDays: number; // default 14
  negotiationStaleDays: number; // default 14
  managerEscalationSlaHours: number; // default 6
}
