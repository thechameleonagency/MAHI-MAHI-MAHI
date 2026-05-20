import { describe, expect, it } from "vitest";
import type { Expense } from "@/types/finance";
import {
  applyReimbursementApproval,
  formatReimbursementApprovalLine,
  isReimbursementApprovalTransition,
  mergeExpenseUpdateWithReimbursementRules,
} from "@/lib/expenseReimbursement";

const baseExpense = (): Expense => ({
  id: "EXP-1",
  date: "2026-05-01",
  amount: 500,
  category: "transport",
  paidBy: { type: "employee", entityId: "1", entityName: "Ravi" },
  reimbursement: {
    enabled: true,
    amount: 500,
    status: "pending",
  },
});

describe("expenseReimbursement", () => {
  it("detects pending → paid as approval transition", () => {
    expect(
      isReimbursementApprovalTransition(
        { enabled: true, amount: 100, status: "pending" },
        { enabled: true, amount: 100, status: "paid" },
      ),
    ).toBe(true);
    expect(
      isReimbursementApprovalTransition(
        { enabled: true, amount: 100, status: "paid" },
        { enabled: true, amount: 100, status: "paid" },
      ),
    ).toBe(false);
  });

  it("stamps approver metadata on approval", () => {
    const approved = applyReimbursementApproval(
      { enabled: true, amount: 500, status: "pending" },
      { userId: "admin-1", userName: "Priya Admin" },
      "2026-05-10",
    );
    expect(approved.status).toBe("paid");
    expect(approved.paidDate).toBe("2026-05-10");
    expect(approved.approvedByUserName).toBe("Priya Admin");
    expect(approved.approvedAt).toBeTruthy();
  });

  it("mergeExpenseUpdateWithReimbursementRules blocks approval without permission", () => {
    const result = mergeExpenseUpdateWithReimbursementRules(
      baseExpense(),
      { reimbursement: { enabled: true, amount: 500, status: "paid" } },
      { userId: "sp-1", userName: "Sales" },
      false,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("approve");
  });

  it("mergeExpenseUpdateWithReimbursementRules applies approval when permitted", () => {
    const result = mergeExpenseUpdateWithReimbursementRules(
      baseExpense(),
      { reimbursement: { enabled: true, amount: 500, status: "paid", paidDate: "2026-05-12" } },
      { userId: "mgmt-1", userName: "Mgmt User" },
      true,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.merged.reimbursement?.status).toBe("paid");
    expect(result.merged.reimbursement?.approvedByUserName).toBe("Mgmt User");
    expect(formatReimbursementApprovalLine(result.merged.reimbursement!)).toContain("Mgmt User");
  });
});
