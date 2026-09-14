import { describe, it, expect } from "vitest";
import { mapDbRoleToClient } from "../lib/persistence/crm-sync";
import { isManagerRole, isOwnerRole } from "../lib/server/rbac";

describe("Server role -> client perspective mapping", () => {
  it("maps canonical and legacy owner roles to owner", () => {
    expect(mapDbRoleToClient("owner")).toBe("owner");
    expect(mapDbRoleToClient("boss")).toBe("owner");
  });

  it("maps canonical and legacy manager roles to manager", () => {
    expect(mapDbRoleToClient("manager")).toBe("manager");
    expect(mapDbRoleToClient("admin")).toBe("manager");
  });

  it("maps salesperson aliases and unknowns to salesperson", () => {
    expect(mapDbRoleToClient("salesperson")).toBe("salesperson");
    expect(mapDbRoleToClient("closer")).toBe("salesperson");
    expect(mapDbRoleToClient(null)).toBe("salesperson");
    expect(mapDbRoleToClient(undefined)).toBe("salesperson");
    expect(mapDbRoleToClient("hacker-role")).toBe("salesperson");
  });

  it("enforces canonical manager and owner helper guards", () => {
    expect(isOwnerRole("owner")).toBe(true);
    expect(isOwnerRole("manager")).toBe(false);
    expect(isManagerRole("owner")).toBe(true);
    expect(isManagerRole("manager")).toBe(true);
    expect(isManagerRole("salesperson")).toBe(false);
  });
});
