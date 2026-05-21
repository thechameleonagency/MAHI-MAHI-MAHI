import { describe, expect, it } from "vitest";
import {
  getProjectKind,
  getCustomerKind,
  isCustomerArchived,
  safeArr,
  safeStr,
  safeNum,
} from "@/lib/selectors";
import { canStartProject } from "@/domain/stateMachines/projectStateMachine";
import { canPerformAction, canAccessPath } from "@/domain/policies/permissionMatrix";
import {
  evaluateAutoArchive,
  applyAutoArchive,
} from "@/domain/customer/customerArchive";
import type { Customer } from "@/types/finance";

/**
 * Round 1 + Round 2 + Round 3 foundation regression tests.
 *
 * These pin down behavior changes from Phase 1 so future rounds can't silently regress them.
 */

describe("selectors — defensive helpers (Phase 1.6)", () => {
  it("getProjectKind defaults to SOLO_EPC when project or projectKind is undefined", () => {
    expect(getProjectKind(undefined)).toBe("SOLO_EPC");
    expect(getProjectKind(null)).toBe("SOLO_EPC");
    // @ts-expect-error — partial project for testing
    expect(getProjectKind({})).toBe("SOLO_EPC");
    // @ts-expect-error — partial project for testing
    expect(getProjectKind({ projectKind: "INC_GIVEN" })).toBe("INC_GIVEN");
  });

  it("safeArr always returns an array", () => {
    expect(safeArr(undefined)).toEqual([]);
    expect(safeArr(null)).toEqual([]);
    expect(safeArr([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("safeStr always returns a string", () => {
    expect(safeStr(undefined)).toBe("");
    expect(safeStr(null)).toBe("");
    expect(safeStr("hi")).toBe("hi");
  });

  it("safeNum returns 0 for non-finite values", () => {
    expect(safeNum(undefined)).toBe(0);
    expect(safeNum(NaN)).toBe(0);
    expect(safeNum(Infinity)).toBe(0);
    expect(safeNum(42)).toBe(42);
  });

  it("getCustomerKind defaults to 'project' when unset", () => {
    expect(getCustomerKind(undefined)).toBe("project");
    // @ts-expect-error — partial customer for testing
    expect(getCustomerKind({})).toBe("project");
    // @ts-expect-error — partial customer for testing
    expect(getCustomerKind({ customerKind: "inventory" })).toBe("inventory");
  });

  it("isCustomerArchived true only when archivedAt is set", () => {
    // @ts-expect-error — partial customer for testing
    expect(isCustomerArchived({})).toBe(false);
    // @ts-expect-error — partial customer for testing
    expect(isCustomerArchived({ archivedAt: null })).toBe(false);
    // @ts-expect-error — partial customer for testing
    expect(isCustomerArchived({ archivedAt: "2026-05-17T00:00:00Z" })).toBe(true);
  });
});

describe("canStartProject — Phase 1.4 readiness gate", () => {
  it("permits start when status=New and siteReady=true", () => {
    expect(canStartProject("New", true, "admin")).toEqual({ ok: true });
  });

  it("denies start when status=New and siteReady=false (non-super-admin)", () => {
    expect(canStartProject("New", false, "admin")).toEqual({
      ok: false,
      reason: "Site readiness not yet marked as ready.",
    });
  });

  it("super_admin can override readiness with a written reason", () => {
    expect(canStartProject("New", false, "super_admin", "urgent override")).toEqual({ ok: true });
  });

  it("super_admin without override reason cannot bypass", () => {
    expect(canStartProject("New", false, "super_admin")).toEqual({
      ok: false,
      reason: "Site readiness not yet marked as ready.",
    });
  });

  it("rejects start when project already In Progress", () => {
    expect(canStartProject("In Progress", true, "admin").ok).toBe(false);
  });
});

describe("permissionMatrix — Phase 1.5 super-admin universal access", () => {
  it("super_admin can perform every defined action", () => {
    const actions = [
      "enquiry:create",
      "quotation:confirm",
      "finance:delete_payment",
      "partner:delete",
      "loan:delete",
      "approval:resolve",
    ] as const;
    actions.forEach((a) => {
      expect(canPerformAction("super_admin", a)).toBe(true);
    });
  });

  it("super_admin can access every registered route", () => {
    const routes = ["/", "/finance", "/audit", "/settings", "/invoices", "/agents"];
    routes.forEach((r) => {
      expect(canAccessPath("super_admin", r)).toBe(true);
    });
  });

  it("unknown route still returns false for super_admin (404 distinct from 403)", () => {
    expect(canAccessPath("super_admin", "/totally-fake-route")).toBe(false);
  });

  it("non-super-admin still bound by the matrix (no regression)", () => {
    expect(canPerformAction("viewer", "finance:delete_payment")).toBe(false);
    expect(canAccessPath("salesperson", "/audit")).toBe(false);
  });
});

describe("customerArchive — Phase 1.4 evaluator", () => {
  const baseCustomer: Customer = {
    id: "C1",
    name: "Acme",
    phone: "9999999999",
    email: "a@b.com",
    address: "addr",
    type: "individual",
    itemsBought: [],
    totalPurchases: 0,
    createdAt: "2025-01-01",
  };

  it("does NOT archive an inventory-only customer regardless of projects", () => {
    const decision = evaluateAutoArchive({
      customer: { ...baseCustomer, customerKind: "inventory" },
      // @ts-expect-error — partial project shape
      projects: [{ id: "P1", customerId: "C1", status: "Completed" }],
      quotations: [],
      enquiries: [],
    });
    expect(decision.shouldArchive).toBe(false);
  });

  it("does NOT archive when customer has no projects (inventory-only buyer indistinguishable)", () => {
    const decision = evaluateAutoArchive({
      customer: baseCustomer,
      projects: [],
      quotations: [],
      enquiries: [],
    });
    expect(decision.shouldArchive).toBe(false);
  });

  it("does NOT archive while any project is still open", () => {
    const decision = evaluateAutoArchive({
      customer: baseCustomer,
      projects: [
        // @ts-expect-error — partial
        { id: "P1", customerId: "C1", status: "Completed", startDate: "2025-01-01" },
        // @ts-expect-error — partial
        { id: "P2", customerId: "C1", status: "Ongoing", startDate: "2025-06-01" },
      ],
      quotations: [],
      enquiries: [],
    });
    expect(decision.shouldArchive).toBe(false);
  });

  it("does NOT archive while a New lifecycle project exists (FC7)", () => {
    const decision = evaluateAutoArchive({
      customer: baseCustomer,
      projects: [
        // @ts-expect-error — partial
        {
          id: "P1",
          customerId: "C1",
          lifecycleStatus: "Completed",
          status: "Completed",
          endDate: "2025-06-01",
        },
        // @ts-expect-error — partial
        { id: "P2", customerId: "C1", lifecycleStatus: "New", status: "Ongoing" },
      ],
      quotations: [],
      enquiries: [],
    });
    expect(decision.shouldArchive).toBe(false);
  });

  it("archives when last project is Completed and no open enquiries/quotations", () => {
    const decision = evaluateAutoArchive({
      customer: baseCustomer,
      projects: [
        // @ts-expect-error — partial
        { id: "P1", customerId: "C1", status: "Completed", startDate: "2025-01-01", endDate: "2025-06-01" },
      ],
      quotations: [],
      enquiries: [],
    });
    expect(decision.shouldArchive).toBe(true);
    if (decision.shouldArchive) {
      expect(decision.lastProjectCompletedAt).toBe("2025-06-01");
    }
  });

  it("applyAutoArchive returns null when decision is shouldArchive:false", () => {
    expect(
      applyAutoArchive(baseCustomer, { shouldArchive: false, reason: "no projects" }),
    ).toBeNull();
  });

  it("applyAutoArchive returns patched fields when decision is archive", () => {
    const patch = applyAutoArchive(baseCustomer, {
      shouldArchive: true,
      lastProjectCompletedAt: "2025-06-01",
    });
    expect(patch).not.toBeNull();
    expect(patch?.lastProjectCompletedAt).toBe("2025-06-01");
    expect(patch?.archivedAt).toBeTruthy();
  });
});
