import type { Expense } from "@/types/finance";

export type ExpensePayerType = "company" | "employee" | "owner" | "partner" | "split";

const AMOUNT_EPS = 0.01;

function parseMoney(raw: string | undefined): number {
  if (raw == null || raw.trim() === "") return 0;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

function isTinyAmount(n: number): boolean {
  return n > 0 && n < 0.01;
}

export type ExpenseSplitInput = {
  companyAmount: string;
  ownerAmount: string;
  employeeIds: string[];
  employeeAmounts: Record<string, string>;
  partnerIds: string[];
  partnerAmounts: Record<string, string>;
};

export function calculateExpenseSplitTotal(split: ExpenseSplitInput): number {
  let total = parseMoney(split.companyAmount) + parseMoney(split.ownerAmount);
  for (const id of split.employeeIds) {
    total += parseMoney(split.employeeAmounts[id]);
  }
  for (const id of split.partnerIds) {
    total += parseMoney(split.partnerAmounts[id]);
  }
  return total;
}

export type ExpensePayerFormInput = {
  payerType: ExpensePayerType;
  expenseAmount: number;
  allowedPayers: string[];
  payerEmployeeId?: string | null;
  payerPartnerId?: string;
  split?: ExpenseSplitInput;
  /** Employee reimbursement — payer is implicit company */
  skipPayerStep?: boolean;
};

export function validateExpensePayerForm(input: ExpensePayerFormInput): { ok: boolean; errors: string[] } {
  if (input.skipPayerStep) {
    return { ok: true, errors: [] };
  }

  const errors: string[] = [];
  const amount = input.expenseAmount;

  if (!Number.isFinite(amount) || amount <= 0) {
    errors.push("Enter a valid expense amount before choosing who paid.");
    return { ok: false, errors };
  }

  if (!input.allowedPayers.includes(input.payerType)) {
    errors.push("This payer type is not allowed for the selected expense category.");
    return { ok: false, errors };
  }

  switch (input.payerType) {
    case "company":
    case "owner":
      break;
    case "employee":
      if (!input.payerEmployeeId) {
        errors.push("Select which employee paid for this expense.");
      }
      break;
    case "partner":
      if (!input.payerPartnerId?.trim()) {
        errors.push("Select which partner paid for this expense.");
      }
      break;
    case "split": {
      const split = input.split;
      if (!split) {
        errors.push("Enter split payment amounts for each party.");
        break;
      }
      if (new Set(split.employeeIds).size !== split.employeeIds.length) {
        errors.push("Each employee can appear only once in the split.");
      }
      if (new Set(split.partnerIds).size !== split.partnerIds.length) {
        errors.push("Each partner can appear only once in the split.");
      }
      if (isTinyAmount(parseMoney(split.companyAmount)) || isTinyAmount(parseMoney(split.ownerAmount))) {
        errors.push("Split amounts cannot be between ₹0 and ₹0.01 — use zero or at least ₹0.01.");
      }
      for (const id of split.employeeIds) {
        if (isTinyAmount(parseMoney(split.employeeAmounts[id]))) {
          errors.push("Employee split amounts cannot be between ₹0 and ₹0.01.");
        }
      }
      for (const id of split.partnerIds) {
        if (isTinyAmount(parseMoney(split.partnerAmounts[id]))) {
          errors.push("Partner split amounts cannot be between ₹0 and ₹0.01.");
        }
      }
      const total = calculateExpenseSplitTotal(split);
      if (total <= 0) {
        errors.push("Add at least one split line with an amount greater than zero.");
      } else if (Math.abs(total - amount) > AMOUNT_EPS) {
        errors.push(`Split lines must total the expense amount (currently ₹${total.toFixed(2)} vs ₹${amount.toFixed(2)}).`);
      }
      break;
    }
    default:
      errors.push("Select who paid for this expense.");
  }

  return { ok: errors.length === 0, errors };
}

/** Validates persisted `paidBy` on expense records (command/context boundary). */
export function validateExpensePaidByRecord(
  amount: number,
  paidBy: Expense["paidBy"],
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.push("Expense amount must be greater than zero.");
    return { ok: false, errors };
  }

  const splits = paidBy.splits?.filter((s) => (s.amount ?? 0) > 0) ?? [];
  if (splits.length > 0) {
    const ids = splits.map((s) => `${s.entityType}:${s.entityId}`);
    if (new Set(ids).size !== ids.length) {
      errors.push("Split payment contains duplicate parties.");
    }
    const total = splits.reduce((sum, s) => sum + (s.amount ?? 0), 0);
    if (total <= 0) {
      errors.push("Split payment must include at least one positive amount.");
    } else if (Math.abs(total - amount) > AMOUNT_EPS) {
      errors.push("Split payment total must equal the expense amount.");
    }
    for (const line of splits) {
      if (isTinyAmount(line.amount ?? 0)) {
        errors.push("Split line amounts cannot be between ₹0 and ₹0.01.");
      }
    }
    return { ok: errors.length === 0, errors };
  }

  switch (paidBy.type) {
    case "company":
      break;
    case "owner":
      break;
    case "employee":
      if (!paidBy.entityId?.trim()) {
        errors.push("Employee payer requires an employee reference.");
      }
      break;
    case "partner":
      if (!paidBy.entityId?.trim()) {
        errors.push("Partner payer requires a partner reference.");
      }
      break;
    default:
      errors.push("Unknown payer type on expense.");
  }

  return { ok: errors.length === 0, errors };
}
