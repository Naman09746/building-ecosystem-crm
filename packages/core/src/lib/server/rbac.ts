export const OWNER_ROLES = ["owner"] as readonly string[];
export const MANAGER_ROLES = ["owner", "manager"] as readonly string[];
export const TEAM_ASSIGNABLE_ROLES = ["manager", "salesperson"] as readonly string[];

export type CanonicalRole = string;

export function mapCanonicalRole(rawRole: string | null | undefined): CanonicalRole {
  switch (rawRole) {
    case "owner":
    case "boss":
      return "owner";
    case "manager":
    case "admin":
      return "manager";
    case "salesperson":
    case "closer":
    default:
      return "salesperson";
  }
}

export function isOwnerRole(role: string | null | undefined): boolean {
  return mapCanonicalRole(role) === "owner";
}

export function isManagerRole(role: string | null | undefined): boolean {
  const canonical = mapCanonicalRole(role);
  return canonical === "owner" || canonical === "manager";
}
