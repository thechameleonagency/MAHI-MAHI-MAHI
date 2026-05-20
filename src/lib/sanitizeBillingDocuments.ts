import {
  normalizeBillingDocumentType,
  type BillingDocumentBucket,
} from "@/lib/invoiceDocumentType";
import type { Invoice } from "@/types/finance";

/** Drop corrupt rows and ensure status exists so list pages never read `null.status`. */
export function sanitizeBillingDocuments<T extends Invoice | null | undefined>(
  rows: T[],
  bucket: BillingDocumentBucket,
): Invoice[] {
  return rows
    .filter((row): row is Invoice => row != null && typeof row === "object")
    .map((row) => {
      const normalized = normalizeBillingDocumentType(row, bucket);
      return {
        ...normalized,
        status: normalized.status ?? "pending",
        customerName: normalized.customerName ?? "—",
        invoiceNumber: normalized.invoiceNumber ?? normalized.id ?? "—",
        total: typeof normalized.total === "number" ? normalized.total : 0,
        amountReceived:
          typeof normalized.amountReceived === "number" ? normalized.amountReceived : 0,
      };
    });
}

/** Merge both stores for list views without collapsing sale-bill rows to invoice. */
export function sanitizeMergedBillingDocuments(
  invoices: Invoice[],
  saleBills: Invoice[],
): Invoice[] {
  return [
    ...sanitizeBillingDocuments(invoices, "invoices"),
    ...sanitizeBillingDocuments(saleBills, "saleBills"),
  ];
}
