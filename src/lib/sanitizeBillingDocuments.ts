import type { Invoice } from "@/types/finance";

/** Drop corrupt rows and ensure status exists so list pages never read `null.status`. */
export function sanitizeBillingDocuments<T extends Invoice | null | undefined>(rows: T[]): Invoice[] {
  return rows
    .filter((row): row is Invoice => row != null && typeof row === "object")
    .map((row) => ({
      ...row,
      status: row.status ?? "pending",
      type: row.type ?? "invoice",
      customerName: row.customerName ?? "—",
      invoiceNumber: row.invoiceNumber ?? row.id ?? "—",
      total: typeof row.total === "number" ? row.total : 0,
      amountReceived: typeof row.amountReceived === "number" ? row.amountReceived : 0,
    }));
}
