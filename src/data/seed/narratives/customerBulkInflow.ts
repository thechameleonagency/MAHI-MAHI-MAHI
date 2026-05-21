import type { NarrativeApply } from "./shared";

/** Customer with multiple open invoices for bulk inflow planning (C3). */
export const applyCustomerBulkInflow: NarrativeApply = (state) => {
  const customer = state.customers.find((c) => !c.archivedAt);
  if (!customer) return;
  const open = state.invoices.filter((i) => i.customerId === customer.id && ["pending", "partial", "overdue"].includes(i.status));
  if (open.length >= 3) return;
  // L9 already seeds invoices; tag customer for bulk plan UI
  customer.paymentTerms = "Bulk settlement plan eligible — 3 milestones";
};
