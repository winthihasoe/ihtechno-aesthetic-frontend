import { describe, expect, it } from "vitest";
import { hasPermission, hasRole } from "../../utils/accessUtils";

describe("accessUtils", () => {
  it("grants owner all roles and permissions", () => {
    const user = { role: "owner", permissions: [] };

    expect(hasRole(user, "admin")).toBe(true);
    expect(hasPermission(user, "patients.manage")).toBe(true);
  });

  it("checks permission codes from the auth payload", () => {
    const user = {
      role: "custom_role",
      permissions: ["patients.view"],
      roles: [{ slug: "custom_role" }],
    };

    expect(hasPermission(user, "patients.view")).toBe(true);
    expect(hasPermission(user, "patients.manage")).toBe(false);
  });

  it("matches roles from either legacy or attached roles", () => {
    const user = {
      role: "staff",
      permissions: [],
      roles: [{ slug: "admin" }],
    };

    expect(hasRole(user, "admin")).toBe(true);
  });
});
