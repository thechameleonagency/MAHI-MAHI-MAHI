import { describe, expect, it } from "vitest";
import { PermissionService } from "@/application/services/PermissionService";

describe("PermissionService", () => {
  const permissionService = new PermissionService();

  it("allows admins to confirm quotations", () => {
    expect(permissionService.canPerformAction("admin", "quotation:confirm")).toBe(true);
  });

  it("blocks salesperson from creating direct project exception", () => {
    expect(permissionService.canPerformAction("salesperson", "project:create_direct_exception")).toBe(false);
  });

  it("blocks installation team from finance route", () => {
    expect(permissionService.canAccessPath("installation_team", "/finance")).toBe(false);
  });

  it("allows ceo on analytics route", () => {
    expect(permissionService.canAccessPath("ceo", "/analytics")).toBe(true);
  });
});
