import type { InvoiceItem, InvoiceService } from "@/types/finance";

/**
 * Auto rule (BRD prototype): sale bill when there is no project/quotation link
 * and the document is material-line-only; otherwise commercial invoice.
 */
export function inferInvoiceOrSaleBillType(params: {
  projectId?: string;
  quotationId?: string;
  items: InvoiceItem[];
  services: InvoiceService[];
}): "invoice" | "sale-bill" {
  if (params.projectId?.trim() || params.quotationId?.trim()) {
    return "invoice";
  }
  const hasMaterials = params.items.length > 0;
  const hasServices = params.services.length > 0;
  if (hasMaterials && !hasServices) {
    return "sale-bill";
  }
  return "invoice";
}

export function nextDocumentNumber(
  type: "invoice" | "sale-bill",
  existing: { invoiceNumber: string }[],
): string {
  const prefix = type === "invoice" ? "INV" : "SB";
  const year = new Date().getFullYear();
  const re = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  let max = 0;
  for (const doc of existing) {
    const m = doc.invoiceNumber.match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${year}-${String(max + 1).padStart(4, "0")}`;
}
