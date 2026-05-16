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

  it("hides finance-adjacent routes from installation team", () => {
    expect(permissionService.canAccessPath("installation_team", "/customers")).toBe(false);
    expect(permissionService.canAccessPath("installation_team", "/invoices")).toBe(false);
    expect(permissionService.canAccessPath("installation_team", "/agents")).toBe(false);
  });

  it("allows salesperson customers but not invoices", () => {
    expect(permissionService.canAccessPath("salesperson", "/customers")).toBe(true);
    expect(permissionService.canAccessPath("salesperson", "/invoices")).toBe(false);
  });

  it("ignores query string when checking path access", () => {
    expect(permissionService.canAccessPath("admin", "/invoices?create=invoice")).toBe(true);
    expect(permissionService.canAccessPath("salesperson", "/invoices?invoice=1")).toBe(false);
  });

  // CEO / management coverage. Permission gates are not a soft-delete: if the role can see the
  // surface in the UI, the action it offers must be callable.
  describe("CEO has operational create / record / approve rights", () => {
    const ceoCreateActions = [
      "enquiry:create",
      "quotation:create",
      "quotation:confirm",
      "project:create_from_quote",
      "project:create_direct_exception",
      "project:update_commercial",
      "finance:create_invoice",
      "finance:record_payment",
      "finance:record_expense_income",
      "partner:add_transaction",
      "loan:add_repayment",
      "vendor:record_bill",
      "vendor:record_payment",
      "hr:mark_holiday",
      "approval:resolve",
    ] as const;

    for (const action of ceoCreateActions) {
      it(`allows ceo to ${action}`, () => {
        expect(permissionService.canPerformAction("ceo", action)).toBe(true);
      });

      it(`allows management to ${action}`, () => {
        expect(permissionService.canPerformAction("management", action)).toBe(true);
      });
    }
  });

  it("still blocks installation team from finance write actions", () => {
    expect(permissionService.canPerformAction("installation_team", "finance:create_invoice")).toBe(false);
    expect(permissionService.canPerformAction("installation_team", "finance:record_payment")).toBe(false);
  });

  it("keeps destructive deletes restricted to super_admin/admin", () => {
    expect(permissionService.canPerformAction("ceo", "finance:delete_payment")).toBe(false);
    expect(permissionService.canPerformAction("management", "finance:delete_expense")).toBe(false);
    expect(permissionService.canPerformAction("ceo", "partner:delete")).toBe(false);
    expect(permissionService.canPerformAction("ceo", "loan:delete")).toBe(false);
    expect(permissionService.canPerformAction("ceo", "vendor:delete_payment")).toBe(false);
  });

  it("still allows admin to confirm quotations after CEO grant", () => {
    expect(permissionService.canPerformAction("admin", "quotation:confirm")).toBe(true);
  });
});
