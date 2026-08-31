# Centralized Notifications, Real-Time Alert Center & Notification System

**Phase 5 Implementation Guide**  
*Multi-Tenant Alert Stream, Supabase Realtime Subscriptions & User Preferences*

---

## 1. Overview & Architecture

CallCRM Phase 5 implements an organization-grade, centralized, real-time alert center and in-app notification infrastructure. It provides real-time notifications for lead assignments, task deadlines, speed-to-lead SLA breaches, stalled/at-risk deal alerts, team invitations, and billing receipts.

```
                  ┌──────────────────────────────────────────────────────────┐
                  │                 Supabase PostgreSQL DB                   │
                  │  ┌───────────────────────┐   ┌────────────────────────┐  │
                  │  │  public.notifications │   │notification_preferences│  │
                  │  └───────────▲───────────┘   └────────────────────────┘  │
                  └──────────────┼───────────────────────────────────────────┘
                                 │ postgres_changes (user_id = auth.uid())
                                 ▼
                  ┌──────────────────────────────────────────────────────────┐
                  │         Supabase Realtime Channel Subscription           │
                  │              (user_notifications_<user_id>)              │
                  └──────────────────────────────┬───────────────────────────┘
                                                 │
                                 ┌───────────────┴───────────────┐
                                 ▼                               ▼
                     ┌───────────────────────┐       ┌───────────────────────┐
                     │ Top-Bar Alert Bell    │       │ Alert Center Drawer   │
                     │  - Unread badge       │       │  - History & Search   │
                     │  - Popover dropdown   │       │  - Server pagination  │
                     │  - Fallback polling   │       │  - Category filters   │
                     └───────────────────────┘       └───────────────────────┘
```

---

## 2. Data Model & Migrations

### Migration `0011_phase5_notifications_realtime.sql`

1. **`public.notifications` Table**:
   - `id uuid primary key default gen_random_uuid()`
   - `org_id uuid not null references public.orgs(id) on delete cascade`
   - `user_id uuid not null references public.profiles(user_id) on delete cascade`
   - `title text not null`
   - `message text not null`
   - `type text not null` (14 domain event types)
   - `priority text not null check (priority in ('low', 'normal', 'high', 'urgent'))`
   - `entity_type text` (`lead`, `task`, `billing`, `team`, `system`, `project`, `document`)
   - `entity_id uuid`
   - `link text` (deep link destination)
   - `read boolean not null default false`
   - `read_at timestamptz`
   - `dedup_key text unique` (idempotent deduplication key)
   - `created_at timestamptz not null default now()`

2. **`public.notification_preferences` Table**:
   - `user_id uuid primary key references public.profiles(user_id) on delete cascade`
   - `org_id uuid not null references public.orgs(id) on delete cascade`
   - `lead_assignments boolean not null default true`
   - `task_reminders boolean not null default true`
   - `sla_alerts boolean not null default true`
   - `deal_health_alerts boolean not null default true`
   - `billing_notifications boolean not null default true`
   - `updated_at timestamptz not null default now()`

---

## 3. Multi-Tenant Privacy & Strict Row Level Security

Notifications contain sensitive private user data. Row Level Security strictly enforces that:
- Users can **only SELECT, UPDATE, and DELETE their own notifications** within their assigned organization:
  ```sql
  create policy "notifications_select_policy" on public.notifications
    for select
    using (
      org_id = public.current_org_id()
      and user_id = auth.uid()
    );
  ```
- Cross-user and cross-tenant notification leakage is blocked at the PostgreSQL engine level.

---

## 4. Notification Emission & Idempotency

### `emit_notification()` Database Function & `createNotification()` Server Helper

Before emitting any notification, the system checks:
1. **User Profile Existence**: Verifies recipient exists in `public.profiles`.
2. **User Preferences**: Checks `public.notification_preferences` and skips if the category is disabled.
3. **Idempotency (`dedup_key`)**: Enforces `UNIQUE(dedup_key)` with `ON CONFLICT (dedup_key) DO NOTHING` to prevent repeated alert flooding (e.g. daily task/SLA alerts use format `<type>_<entity_id>_<user_id>_<YYYY-MM-DD>`).

---

## 5. Client UI & Realtime Integration

- **`NotificationBell` (`Frontend/src/components/layout/notification-bell.tsx`)**:
  - Subscribes to Supabase Realtime channel `user_notifications_${authUser.id}` listening to `postgres_changes` on `public.notifications` filtered by `user_id=eq.${authUser.id}`.
  - Automatically appends incoming alerts, displays subtle Sonner toast alerts, and increments unread badges instantly.
  - Graceful fallback polling (every 30s) if offline or in simulated environments.
  - Category filters: `All`, `Unread`, `Leads`, `Tasks`, `Billing`.
  - Settings trigger to open preferences modal.
- **`NotificationPreferencesDialog` (`Frontend/src/components/crm/notification-preferences-dialog.tsx`)**:
  - Modal allowing users to toggle notification categories with real database sync via `GET/PATCH /api/notifications/preferences`.
- **`NotificationsDrawer` (`Frontend/src/components/crm/notifications-drawer.tsx`)**:
  - Alert Center modal with server-side pagination, search, category tabs, and bulk "Mark all as read" capability.

---

## 6. Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/notifications` | Returns paginated notifications and unread count with category and unread filters |
| `PATCH` | `/api/notifications/[id]/read` | Marks a single notification as read (`read = true`, `read_at = now()`) |
| `POST` | `/api/notifications/mark-all-read` | Marks all unread notifications for the caller as read |
| `GET` | `/api/notifications/preferences` | Fetches caller's notification preferences |
| `PATCH` | `/api/notifications/preferences` | Updates caller's notification preferences |
