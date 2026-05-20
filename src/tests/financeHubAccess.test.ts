import { describe, expect, it } from "vitest";
import { PermissionService } from "@/application/services/PermissionService";
import { canFeature } from "@/domain/policies/featurePermissions";
import type { FeaturePermissionMatrix } from "@/domain/policies/featurePermissions";
import { DEFAULT_FEATURE_PERMISSIONS } from "@/domain/policies/featurePermissions";
import { featureForPath } from "@/lib/routeFeatureMap";

describe("financeHub route and panel access (M4)", () => {
  const permissionService = new PermissionService();

  it("maps /finance to financeHub, not expense", () => {
    expect(featureForPath("/finance")).toBe("financeHub");
    expect(featureForPath("/finance?tab=partners")).toBe("financeHub");
  });

  it("allows finance roles on /finance via financeHub defaults", () => {
    expect(permissionService.canAccessPath("management", "/finance")).toBe(true);
    expect(permissionService.canAccessPath("ceo", "/finance")).toBe(true);
    expect(permissionService.canAccessPath("installation_team", "/finance")).toBe(false);
  });

  it("can open hub when expense view is revoked but financeHub view remains", () => {
    const override: Partial<FeaturePermissionMatrix> = {
      financeHub: { ...DEFAULT_FEATURE_PERMISSIONS.financeHub, view: ["management"] },
      expense: { ...DEFAULT_FEATURE_PERMISSIONS.expense, view: [] },
    };
    expect(permissionService.canAccessPath("management", "/finance", override)).toBe(true);
    expect(canFeature("management", "expense", "view", override)).toBe(false);
  });

  it("blocks /finance when financeHub view is revoked even if expense view remains", () => {
    const override: Partial<FeaturePermissionMatrix> = {
      financeHub: { ...DEFAULT_FEATURE_PERMISSIONS.financeHub, view: [] },
      expense: { ...DEFAULT_FEATURE_PERMISSIONS.expense, view: ["management"] },
    };
    expect(permissionService.canAccessPath("management", "/finance", override)).toBe(false);
    expect(canFeature("management", "expense", "view", override)).toBe(true);
  });
});
