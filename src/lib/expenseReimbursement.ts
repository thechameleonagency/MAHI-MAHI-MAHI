import type { Expense, ExpenseReimbursement } from "@/types/finance";
import { formatUiDate } from "@/lib/formatUiDate";

export type ReimbursementApprover = {
  userId: string;
  userName: string;
};

/** True when reimbursement moves from pending → paid (approval transition). */
export function isReimbursementApprovalTransition(
  before: ExpenseReimbursement | undefined,
  after: ExpenseReimbursement | undefined,
): boolean {
  if (!after?.enabled) return false;
  return before?.status === "pending" && after.status === "paid";
}

export function applyReimbursementApproval(
  reimbursement: ExpenseReimbursement,
  approver: ReimbursementApprover,
  paidDate?: string,
): ExpenseReimbursement {
  const today = new Date().toISOString().slice(0, 10);
  return {
    ...reimbursement,
    status: "paid",
    paidDate: paidDate?.trim() || reimbursement.paidDate || today,
    approvedByUserId: approver.userId,
    approvedByUserName: approver.userName,
    approvedAt: new Date().toISOString(),
  };
}

/** Merge expense updates so reimbursement approval cannot bypass the gate. */
export function mergeExpenseUpdateWithReimbursementRules(
  expense: Expense,
  updates: Partial<Expense>,
  approver: ReimbursementApprover,
  canApprove: boolean,
): { ok: true; merged: Partial<Expense> } | { ok: false; message: string } {
  const nextReimb = updates.reimbursement;
  if (!nextReimb) {
    return { ok: true, merged: updates };
  }

  const before = expense.reimbursement;
  if (isReimbursementApprovalTransition(before, nextReimb)) {
    if (!canApprove) {
      return {
        ok: false,
        message: "Only admin, management, or CEO can approve expense reimbursements.",
      };
    }
    const base = before ?? nextReimb;
    return {
      ok: true,
      merged: {
        ...updates,
        reimbursement: applyReimbursementApproval(
          { ...base, ...nextReimb, enabled: true },
          approver,
          nextReimb.paidDate,
        ),
      },
    };
  }

  if (before?.status === "paid" && nextReimb.status === "pending") {
    return {
      ok: false,
      message: "Cannot revert a reimbursed expense to pending without finance review.",
    };
  }

  return { ok: true, merged: updates };
}

export function formatReimbursementApprovalLine(reimbursement: ExpenseReimbursement): string | null {
  if (reimbursement.status !== "paid") return null;
  if (!reimbursement.approvedAt && !reimbursement.approvedByUserName) return null;
  const who = reimbursement.approvedByUserName?.trim() || reimbursement.approvedByUserId || "Approver";
  const when = reimbursement.approvedAt
    ? formatUiDate(reimbursement.approvedAt)
    : reimbursement.paidDate
      ? formatUiDate(reimbursement.paidDate)
      : "";
  return when ? `Approved by ${who} on ${when}` : `Approved by ${who}`;
}
