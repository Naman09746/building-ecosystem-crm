import type { UserRole } from "@/types/crm";

export const OWNER_ROLES: ReadonlyArray<UserRole> = ["owner"];
export const MANAGER_ROLES: ReadonlyArray<UserRole> = ["owner", "manager"];
export const TEAM_ASSIGNABLE_ROLES: ReadonlyArray<Exclude<UserRole, "owner">> = ["manager", "salesperson"];

export function isOwnerRole(role: UserRole | string | null | undefined): boolean {
  return role === "owner";
}

export function isManagerRole(role: UserRole | string | null | undefined): boolean {
  return role === "owner" || role === "manager";
}

export function roleLabel(role: UserRole | string | null | undefined): string {
  if (role === "owner") return "Owner";
  if (role === "manager") return "Manager";
  return "Salesperson";
}
