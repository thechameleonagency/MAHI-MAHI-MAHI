import type { NarrativeApply } from "./shared";

/** Drive ≥6/8 BusinessAlertKind on /notifications at seed snapshot. */
export const applyMultiAlertNotificationsRoute: NarrativeApply = (state) => {
  const inv = state.invoices.find((i) => i.status === "pending") ?? state.invoices[0];
  if (inv) {
    inv.dueDate = "2026-05-01";
    inv.status = "overdue";
  }
  const loan = state.loans.find((l) => l.status === "Active" && l.paymentType === "emi");
  if (loan) loan.dueDate = "2026-05-22";
  const q = state.quotations.find((x) => x.status === "sent");
  if (q) q.sentAt = "2026-05-01T10:00:00.000Z";
  for (const item of state.inventoryItems) {
    if (item.stock < item.minStock) item.alert = true;
  }
};
