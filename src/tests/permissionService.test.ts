import { describe, expect, it } from "vitest";
import { PermissionService } from "@/application/services/PermissionService";
import type { FeaturePermissionMatrix } from "@/domain/policies/featurePermissions";
import {
  DEFAULT_FEATURE_PERMISSIONS,
  migrateRoleMatrixOverride,
} from "@/domain/policies/featurePermissions";

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

  it("allows salesperson enquiry transitions via enquiry:create (not approval:resolve)", () => {
    expect(permissionService.canPerformAction("salesperson", "enquiry:create")).toBe(true);
    expect(permissionService.canPerformAction("salesperson", "approval:resolve")).toBe(false);
  });

  it("ignores query string when checking path access", () => {
    expect(permissionService.canAccessPath("admin", "/invoices?create=invoice")).toBe(true);
    expect(permissionService.canAccessPath("salesperson", "/invoices?invoice=1")).toBe(false);
  });

  // Phase 3 role architecture — CEO is **read-only on operations + finance** with
  // explicit write rights only on Analytics, Audit, and high-level approvals.
  // Management retains full create / record rights on operational + finance entities.
  describe("Management has full operational create / record / approve rights", () => {
    const managementCreateActions = [
      "enquiry:create",
      "customer:create",
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

    for (const action of managementCreateActions) {
      it(`allows management to ${action}`, () => {
        expect(permissionService.canPerformAction("management", action)).toBe(true);
      });
    }
  });

  describe("CEO read-only-plus-approvals scope (Phase 3 policy)", () => {
    it("allows ceo to confirm quotations (approval transition)", () => {
      expect(permissionService.canPerformAction("ceo", "quotation:confirm")).toBe(true);
    });

    it("allows ceo to create projects from approved quotations", () => {
      expect(permissionService.canPerformAction("ceo", "project:create_from_quote")).toBe(true);
    });

    it("blocks ceo from day-to-day operational creates", () => {
      const blockedForCeo = [
        "enquiry:create",
        "customer:create",
        "quotation:create",
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
      ] as const;
      for (const action of blockedForCeo) {
        expect(permissionService.canPerformAction("ceo", action), `ceo should be blocked from ${action}`).toBe(false);
      }
    });
  });

  it("still blocks installation team from finance write actions", () => {
    expect(permissionService.canPerformAction("installation_team", "finance:create_invoice")).toBe(false);
    expect(permissionService.canPerformAction("installation_team", "finance:record_payment")).toBe(false);
  });

  it("keeps destructive deletes restricted to super_admin/admin", () => {
    expect(permissionService.canPerformAction("admin", "finance:delete_expense")).toBe(true);
    expect(permissionService.canPerformAction("admin", "finance:delete_income")).toBe(true);
    expect(permissionService.canPerformAction("ceo", "finance:delete_payment")).toBe(false);
    expect(permissionService.canPerformAction("management", "finance:delete_expense")).toBe(false);
    expect(permissionService.canPerformAction("management", "finance:delete_income")).toBe(false);
    expect(permissionService.canPerformAction("ceo", "partner:delete")).toBe(false);
    expect(permissionService.canPerformAction("ceo", "loan:delete")).toBe(false);
    expect(permissionService.canPerformAction("ceo", "vendor:delete_payment")).toBe(false);
  });

  it("allows ceo and management to open settings routes", () => {
    expect(permissionService.canAccessPath("ceo", "/settings")).toBe(true);
    expect(permissionService.canAccessPath("management", "/settings/design-system")).toBe(true);
  });

  it("still allows admin to confirm quotations after CEO grant", () => {
    expect(permissionService.canPerformAction("admin", "quotation:confirm")).toBe(true);
  });

  describe("route access via feature matrix (M3)", () => {
    it("honours role-matrix override for mapped routes without legacy route table", () => {
      const override: Partial<FeaturePermissionMatrix> = {
        enquiry: { ...DEFAULT_FEATURE_PERMISSIONS.enquiry, view: ["admin"] },
      };
      expect(permissionService.canAccessPath("salesperson", "/enquiries", override)).toBe(false);
      expect(permissionService.canAccessPath("admin", "/enquiries", override)).toBe(true);
    });

    it("honours per-page audit overrides on matching routes only", () => {
      const override: Partial<FeaturePermissionMatrix> = {
        auditProfitLoss: { ...DEFAULT_FEATURE_PERMISSIONS.auditProfitLoss, view: ["ceo"] },
        auditCashBank: { ...DEFAULT_FEATURE_PERMISSIONS.auditCashBank, view: ["management"] },
      };
      expect(permissionService.canAccessPath("ceo", "/audit/profit-loss", override)).toBe(true);
      expect(permissionService.canAccessPath("ceo", "/audit/cash-bank", override)).toBe(false);
      expect(permissionService.canAccessPath("management", "/audit/cash-bank", override)).toBe(true);
      expect(permissionService.canAccessPath("management", "/audit/profit-loss", override)).toBe(false);
    });

    it("migrates legacy auditPage override for route access", () => {
      const override = migrateRoleMatrixOverride({
        auditPage: { ...DEFAULT_FEATURE_PERMISSIONS.auditDashboard, view: ["ceo"] },
      });
      expect(permissionService.canAccessPath("management", "/audit/profit-loss", override)).toBe(false);
      expect(permissionService.canAccessPath("ceo", "/audit/logs", override)).toBe(true);
    });
  });

  describe("route ⇄ feature alignment (MD2, MD4, MD5, M31)", () => {
    it("ceo can open /employees (feature view matches route)", () => {
      expect(permissionService.canAccessPath("ceo", "/employees")).toBe(true);
    });

    it("salesperson can open materials and templates but not tools", () => {
      expect(permissionService.canAccessPath("salesperson", "/inventory/materials")).toBe(true);
      expect(permissionService.canAccessPath("salesperson", "/templates")).toBe(true);
      expect(permissionService.canAccessPath("salesperson", "/inventory/tools")).toBe(false);
    });

    it("installation_team can open materials and people routes but not templates", () => {
      expect(permissionService.canAccessPath("installation_team", "/inventory/materials")).toBe(true);
      expect(permissionService.canAccessPath("installation_team", "/employees")).toBe(true);
      expect(permissionService.canAccessPath("installation_team", "/teams")).toBe(true);
      expect(permissionService.canAccessPath("installation_team", "/templates")).toBe(false);
    });

    it("installation_team can update execution (mark complete) but not commercial", () => {
      expect(permissionService.canPerformAction("installation_team", "project:update_execution")).toBe(true);
      expect(permissionService.canPerformAction("installation_team", "project:update_commercial")).toBe(false);
    });
  });

  it("allows super_admin on data engine route", () => {
    expect(permissionService.canAccessPath("super_admin", "/super-admin/data-engine")).toBe(true);
  });

  it("blocks non-super_admin from data engine route", () => {
    expect(permissionService.canAccessPath("admin", "/super-admin/data-engine")).toBe(false);
    expect(permissionService.canAccessPath("ceo", "/super-admin/data-engine")).toBe(false);
  });
});
