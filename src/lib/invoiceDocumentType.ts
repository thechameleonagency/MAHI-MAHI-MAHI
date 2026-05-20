import type { Invoice, InvoiceDocumentTypeSource, InvoiceItem, InvoiceService } from "@/types/finance";

export type InvoiceDocumentType = "invoice" | "sale-bill";
export type BillingDocumentBucket = "invoices" | "saleBills";

export type PersistedInvoiceDocumentType = {
  type: InvoiceDocumentType;
  documentTypeSource: InvoiceDocumentTypeSource;
};

export function invoiceDocumentTypeLabel(type: InvoiceDocumentType): string {
  return type === "sale-bill" ? "Sale bill (goods)" : "Invoice (services)";
}

/**
 * Auto rule (BRD prototype): sale bill when there is no project/quotation link
 * and the document is material-line-only; otherwise commercial invoice.
 */
export function inferInvoiceOrSaleBillType(params: {
  projectId?: string;
  quotationId?: string;
  items: InvoiceItem[];
  services: InvoiceService[];
}): InvoiceDocumentType {
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

/** User override wins when locked; otherwise use inference from links and line mix. */
export function resolveInvoiceDocumentTypeForCreate(params: {
  userSelectedType: InvoiceDocumentType;
  userOverrideLocked: boolean;
  projectId?: string;
  quotationId?: string;
  items: InvoiceItem[];
  services: InvoiceService[];
}): InvoiceDocumentType {
  if (params.userOverrideLocked) {
    return params.userSelectedType;
  }
  return inferInvoiceOrSaleBillType({
    projectId: params.projectId,
    quotationId: params.quotationId,
    items: params.items,
    services: params.services,
  });
}

/** Persist type + source once at create; inference is not re-run on later loads or edits. */
export function buildPersistedDocumentTypeAtCreate(params: {
  userSelectedType: InvoiceDocumentType;
  userOverrideLocked: boolean;
  projectId?: string;
  quotationId?: string;
  items: InvoiceItem[];
  services: InvoiceService[];
}): PersistedInvoiceDocumentType {
  const type = resolveInvoiceDocumentTypeForCreate(params);
  return {
    type,
    documentTypeSource: params.userOverrideLocked ? "user" : "inferred",
  };
}

export function bucketDefaultDocumentType(bucket: BillingDocumentBucket): InvoiceDocumentType {
  return bucket === "saleBills" ? "sale-bill" : "invoice";
}

/**
 * Normalize legacy/missing fields without re-inferring from line items.
 * User-locked documents keep their stored `type`; bucket only fills gaps.
 */
export function normalizeBillingDocumentType(doc: Invoice, bucket: BillingDocumentBucket): Invoice {
  if (doc.documentTypeSource === "user" && doc.type) {
    return { ...doc, type: doc.type, documentTypeSource: "user" };
  }
  if (doc.documentTypeSource === "inferred" && doc.type) {
    return { ...doc, type: doc.type, documentTypeSource: "inferred" };
  }
  if (doc.type) {
    return { ...doc, type: doc.type, documentTypeSource: "user" };
  }
  const bucketType = bucketDefaultDocumentType(bucket);
  return { ...doc, type: bucketType, documentTypeSource: "inferred" };
}

/** Updates must not silently reclassify a saved document from line-item heuristics. */
export function stripVolatileDocumentTypeFields(updates: Partial<Invoice>): Partial<Invoice> {
  const { type: _type, documentTypeSource: _source, ...rest } = updates;
  return rest;
}

export function prepareBillingDocumentForStorage(
  doc: Invoice,
  bucket: BillingDocumentBucket,
): Invoice {
  return normalizeBillingDocumentType(doc, bucket);
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
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n)) max = Math.max(max, n);
    }
  }
  return `${prefix}-${year}-${String(max + 1).padStart(4, "0")}`;
}
