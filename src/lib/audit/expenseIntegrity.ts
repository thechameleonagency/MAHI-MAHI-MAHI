import type { Expense } from "@/types/finance";

export interface ExpenseIntegrityIssue {
  id: string;
  date: string;
  issue: string;
  amount: number;
  category: string;
}

export function findExpenseIntegrityIssues(expenses: Expense[]): ExpenseIntegrityIssue[] {
  const issues: ExpenseIntegrityIssue[] = [];
  for (const e of expenses) {
    if (e.mainCategory === "site" && !e.projectId) {
      issues.push({
        id: e.id,
        date: e.date,
        issue: "Site-tagged expense missing projectId",
        amount: e.amount,
        category: e.category,
      });
    }
    if (e.paidBy?.splits?.length) {
      const splitSum = e.paidBy.splits.reduce((s, row) => s + (row.amount ?? 0), 0);
      if (Math.abs(splitSum - e.amount) > 0.01) {
        issues.push({
          id: e.id,
          date: e.date,
          issue: `Paid-by splits (₹${splitSum}) ≠ total (₹${e.amount})`,
          amount: e.amount,
          category: e.category,
        });
      }
    }
    if (!e.category?.trim()) {
      issues.push({
        id: e.id,
        date: e.date,
        issue: "Missing expense category",
        amount: e.amount,
        category: e.category ?? "",
      });
    }
  }
  return issues;
}
