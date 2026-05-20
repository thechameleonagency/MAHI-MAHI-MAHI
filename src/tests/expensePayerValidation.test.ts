import { describe, expect, it } from "vitest";
import {
  calculateExpenseSplitTotal,
  validateExpensePaidByRecord,
  validateExpensePayerForm,
} from "@/lib/expensePayerValidation";

describe("validateExpensePayerForm", () => {
  it("requires employee when payer is employee", () => {
    const r = validateExpensePayerForm({
      payerType: "employee",
      expenseAmount: 5000,
      allowedPayers: ["company", "employee", "owner"],
      payerEmployeeId: null,
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/employee/i);
  });

  it("requires partner when payer is partner", () => {
    const r = validateExpensePayerForm({
      payerType: "partner",
      expenseAmount: 3000,
      allowedPayers: ["company", "partner"],
      payerPartnerId: "",
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/partner/i);
  });

  it("requires split total to match expense amount", () => {
    const r = validateExpensePayerForm({
      payerType: "split",
      expenseAmount: 10_000,
      allowedPayers: ["company", "owner", "split"],
      split: {
        companyAmount: "4000",
        ownerAmount: "3000",
        employeeIds: [],
        employeeAmounts: {},
        partnerIds: [],
        partnerAmounts: {},
      },
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /total/i.test(e))).toBe(true);
  });

  it("accepts balanced split", () => {
    const r = validateExpensePayerForm({
      payerType: "split",
      expenseAmount: 10_000,
      allowedPayers: ["company", "owner", "split"],
      split: {
        companyAmount: "6000",
        ownerAmount: "4000",
        employeeIds: [],
        employeeAmounts: {},
        partnerIds: [],
        partnerAmounts: {},
      },
    });
    expect(r.ok).toBe(true);
  });

  it("skips payer validation for reimbursement category", () => {
    expect(
      validateExpensePayerForm({
        payerType: "employee",
        expenseAmount: 1000,
        allowedPayers: ["company"],
        skipPayerStep: true,
      }).ok,
    ).toBe(true);
  });
});

describe("calculateExpenseSplitTotal", () => {
  it("sums all split lines", () => {
    expect(
      calculateExpenseSplitTotal({
        companyAmount: "100",
        ownerAmount: "50",
        employeeIds: ["e1"],
        employeeAmounts: { e1: "25" },
        partnerIds: ["p1"],
        partnerAmounts: { p1: "25" },
      }),
    ).toBe(200);
  });
});

describe("validateExpensePaidByRecord", () => {
  it("rejects employee payer without entity id", () => {
    expect(
      validateExpensePaidByRecord(1000, { type: "employee" }).ok,
    ).toBe(false);
  });

  it("validates split lines on persisted expense", () => {
    expect(
      validateExpensePaidByRecord(5000, {
        type: "company",
        splits: [
          { entityId: "company", entityType: "company", entityName: "Company", amount: 3000 },
          { entityId: "owner", entityType: "owner", entityName: "Owner", amount: 1000 },
        ],
      }).ok,
    ).toBe(false);
  });
});
