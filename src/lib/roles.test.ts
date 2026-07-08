import { describe, expect, it } from "vitest";

import { formatRoleList, hasRole, resolveRoleFromTrustedSources } from "./roles";

describe("role helpers", () => {
  it("formats known roles with Arabic labels", () => {
    expect(formatRoleList(["admin", "teacher"])).toBe("مدير النظام، معلم");
  });

  it("checks whether a role exists in the current role list", () => {
    expect(hasRole(["teacher", "supervisor"], "supervisor")).toBe(true);
    expect(hasRole(["teacher"], "admin")).toBe(false);
  });

  it("does not grant a production role without a trusted source", () => {
    expect(
      resolveRoleFromTrustedSources({
        requestedRole: null,
        existingRoles: [],
        inferredRole: null,
      }),
    ).toBeNull();
  });
});
