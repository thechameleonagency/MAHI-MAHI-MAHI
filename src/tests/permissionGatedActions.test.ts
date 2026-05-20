import { describe, expect, it } from "vitest";
import { canFeature } from "@/domain/policies/featurePermissions";
import { PermissionService } from "@/application/services/PermissionService";

/**
 * M5 — UI gates must match backend permission checks (salesperson vs approve / convert / invoice).
 */
describe("permission-gated pipeline actions (M5)", () => {
  const permissionService = new PermissionService();

  it("salesperson can work enquiries but not approve quotations or create projects from quote", () => {
    expect(canFeature("salesperson", "enquiry", "create")).toBe(true);
    expect(canFeature("salesperson", "quotationApprove", "edit")).toBe(false);
    expect(permissionService.canPerformAction("salesperson", "quotation:confirm")).toBe(false);
    expect(permissionService.canPerformAction("salesperson", "project:create_from_quote")).toBe(false);
    expect(permissionService.canPerformAction("salesperson", "finance:create_invoice")).toBe(false);
  });

  it("management can approve quotations and convert to project", () => {
    expect(canFeature("management", "quotationApprove", "edit")).toBe(true);
    expect(permissionService.canPerformAction("management", "quotation:confirm")).toBe(true);
    expect(permissionService.canPerformAction("management", "project:create_from_quote")).toBe(true);
  });
});
