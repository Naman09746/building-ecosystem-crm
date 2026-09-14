# Plan: Fix Signup/Login Role Workflow

## Goal
Fix the auth flow so signup → setup-org → choose-plan → onboarding → dashboard works correctly, and standardize on exactly 3 roles: `owner`, `manager`, `salesperson`.

---

## Changes

### 1. Fix post-signup redirect in login page
**File:** `Frontend/src/app/(auth)/login/page.tsx`

- Line 65: Change `router.push("/dashboard")` → `router.push("/setup-org")` after successful signup
- Line 72: Keep `router.push("/dashboard")` after successful login (correct behavior)

### 2. Reduce UserRole type to 3 roles
**File:** `Frontend/src/types/crm.ts`

- Line 1: Change `UserRole` from `"owner" | "admin" | "boss" | "manager" | "salesperson" | "closer"` → `"owner" | "manager" | "salesperson"`

### 3. Fix auth-context role handling
**File:** `Frontend/src/context/auth-context.tsx`

- **`mapDbRole` (line 69-74):** Update mapping:
  - `"owner"` → `"owner"` (keep as-is)
  - `"admin"`, `"boss"` → `"owner"` (map legacy to owner)
  - `"manager"`, `"closer"` → `"manager"` (keep as-is)
  - Everything else → `"salesperson"`
- **`signInAsDemo` (line 340-362):** Accept `"owner" | "manager" | "salesperson"`. Create proper demo users for all 3 roles:
  - `"owner"`: Vikram Malhotra (id: `usr-vikram`)
  - `"manager"`: Priya Kapoor (id: `usr-priya`)
  - `"salesperson"`: Rahul Sharma (id: `usr-rahul`)
- **`saveOrgSetup` (line 379-422):** No change needed — it already saves the role to `profiles.role`.

### 4. Update setup-org page roles
**File:** `Frontend/src/app/(auth)/setup-org/page.tsx`

- Line 35-39: Update `ROLE_OPTIONS`:
  ```ts
  const ROLE_OPTIONS = [
    { id: "owner", label: "Founder / Owner", desc: "Full access, revenue & team SLAs" },
    { id: "manager", label: "Sales Director / Manager", desc: "Pipeline flow & inventory allocation" },
    { id: "salesperson", label: "Salesperson / Closer", desc: "Daily priorities, dialer & site visits" },
  ] as const;
  ```
- Line 48: Change default `selectedRole` from `"boss"` → `"owner"`

### 5. Update onboarding team invite dropdown
**File:** `Frontend/src/app/(auth)/onboarding/page.tsx`

- Lines 220-222: Update role dropdown options:
  ```html
  <option value="salesperson">Salesperson / Closer</option>
  <option value="manager">Sales Manager</option>
  <option value="owner">Founder / Owner</option>
  ```

### 6. Update login page demo buttons
**File:** `Frontend/src/app/(auth)/login/page.tsx`

- Lines 247-274: Update demo login buttons to use `"owner"` instead of `"boss"`, add manager button:
  - Button 1: `signInAsDemo("salesperson")` — "Salesperson"
  - Button 2: `signInAsDemo("owner")` — "Founder / Owner"
  - Button 3: `signInAsDemo("manager")` — "Sales Manager" (new button, grid to 3 cols)

### 7. Update middleware for workflow-aware redirects
**File:** `Frontend/src/middleware.ts`

- After the existing `if (user && pathname === "/login")` block, add checks:
  - If user is on auth-flow routes (`/setup-org`, `/choose-plan`, `/onboarding`) and has a complete profile with org + plan, redirect to `/dashboard`
  - This prevents fully onboarded users from revisiting setup pages

### 8. Update Zod validation schemas
**File:** `Frontend/src/lib/server/validations.ts`

- Line 375: Change `role: z.enum(["owner", "manager", "salesperson", "closer", "boss", "admin"])` → `z.enum(["owner", "manager", "salesperson"])`
- Line 380: Same change for `updateUserRoleSchema`

### 9. Update API security role types
**File:** `Frontend/src/lib/server/api-security.ts`

- Line 13: Change `role: "admin" | "manager" | "salesperson" | "agent"` → `"owner" | "manager" | "salesperson"`

### 10. Update supabase-server MANAGER_ROLES
**File:** `Frontend/src/lib/server/supabase-server.ts`

- Line 27: Change `MANAGER_ROLES = ["owner", "admin", "boss", "manager"]` → `MANAGER_ROLES = ["owner", "manager"]`

### 11. Update role check in team members API
**File:** `Frontend/src/app/api/team/members/[id]/role/route.ts`

- Line 26: Change `auth.role !== "owner" && auth.role !== "admin" && auth.role !== "boss"` → `auth.role !== "owner"`

### 12. Update layout component role checks
**Files:**
- `Frontend/src/components/layout/app-shell.tsx` (line 40)
- `Frontend/src/components/layout/bottom-nav.tsx` (line 33)
- `Frontend/src/components/layout/sidebar.tsx` (line 50)
- `Frontend/src/components/layout/nav-more-sheet.tsx` (line 57)
- `Frontend/src/components/layout/top-bar.tsx` (lines 117, 133)

All `isExecutive` checks: Change `["owner", "admin", "boss", "manager"].includes(role)` → `["owner", "manager"].includes(role)`

In `sidebar.tsx` and `top-bar.tsx`, update the display text from `"Boss"` logic to use `"Owner"` for the `owner` role.

### 13. Update mock data
**File:** `Frontend/src/lib/mock-data.ts`

- Line 104: Change `role: "boss"` → `role: "owner"` for the Vikram user

### 14. Update CRM context role-based filtering
**File:** `Frontend/src/context/crm-context.tsx`

- Line 337: Change `currentUser.role === "salesperson"` — no change needed (still valid)
- No other changes needed since we keep `"salesperson"` as a role value

---

## Verification

After all changes:
1. `npm run lint` — must pass
2. `npm test` — all 239 tests must pass
3. `npm run build` — clean build across all 83 routes
4. Manual check: Signup → setup-org → choose-plan → onboarding → dashboard flow works end-to-end
5. Manual check: All 3 demo login buttons work (owner, manager, salesperson)
6. Manual check: Role displayed correctly in sidebar/top-bar for each role
