import { describe, expect, it } from "vitest";
import { PermissionService } from "@/application/services/PermissionService";
import { canFeature } from "@/domain/policies/featurePermissions";

describe("employeeWallet permissions (Mn9)", () => {
  const permissionService = new PermissionService();

  it("hr:record_wallet delegates to employeeWallet create", () => {
    expect(permissionService.canPerformAction("admin", "hr:record_wallet")).toBe(true);
    expect(permissionService.canPerformAction("management", "hr:record_wallet")).toBe(true);
    expect(permissionService.canPerformAction("ceo", "hr:record_wallet")).toBe(false);
    expect(permissionService.canPerformAction("salesperson", "hr:record_wallet")).toBe(false);
  });

  it("expense create does not imply employeeWallet create", () => {
    expect(canFeature("admin", "expense", "create")).toBe(true);
    expect(canFeature("salesperson", "expense", "create")).toBe(false);
    expect(canFeature("salesperson", "employeeWallet", "create")).toBe(false);
  });
});
