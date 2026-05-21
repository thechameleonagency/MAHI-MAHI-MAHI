import { formatPricingLineDescription } from "@/lib/pricingBasis";
import { nextDocumentNumber, prepareBillingDocumentForStorage } from "@/lib/invoiceDocumentType";
import type { Customer, Invoice } from "@/types/finance";
import type { ProjectChangeRequest } from "@/types/operations";
import type { Project } from "@/types/project";

/** GST-inclusive commercial amount → invoice line totals (matches seed `gstBreakup`). */
export function gstBreakupInclusive(totalInclGst: number) {
  const subtotal = Math.round(totalInclGst / 1.18);
  const gst = totalInclGst - subtotal;
  return { subtotal, cgst: gst / 2, sgst: gst / 2, igst: 0, total: totalInclGst };
}

export function isPlaceholderChangeRequestInvoiceId(id: string | undefined): boolean {
  if (!id?.trim()) return true;
  return id.startsWith("INV-DRAFT-");
}

export type BuildChangeRequestDeltaInvoiceInput = {
  project: Project;
  customer?: Customer;
  changeRequest: ProjectChangeRequest;
  deltaAmount: number;
  invoiceId: string;
  existingInvoices: { invoiceNumber: string }[];
  issuedAt?: string;
};

/** Build a pending operational invoice for an approved scope-change delta. */
export function buildChangeRequestDeltaInvoice(input: BuildChangeRequestDeltaInvoiceInput): Invoice {
  const { project, customer, changeRequest, deltaAmount, invoiceId, existingInvoices } = input;
  const gst = gstBreakupInclusive(deltaAmount);
  const issuedAt = input.issuedAt ?? new Date().toISOString().slice(0, 10);
  const due = new Date(issuedAt);
  due.setDate(due.getDate() + 15);

  const invoice: Invoice = {
    id: invoiceId,
    invoiceNumber: nextDocumentNumber("invoice", existingInvoices),
    type: "invoice",
    documentTypeSource: "inferred",
    customerId: customer?.id ?? project.customerId ?? "",
    customerName: customer?.name ?? project.client ?? "",
    customerAddress: customer?.address ?? project.clientAddress ?? project.location,
    customerGstin: customer?.gstin ?? project.clientGstin,
    customerState: customer?.state ?? project.state,
    customerContact: customer?.phone ?? project.clientPhone,
    projectId: project.id,
    projectName: project.name,
    quotationId: project.quotationId,
    billingScope: "project",
    items: [],
    services: [
      {
        description: `Scope change (${changeRequest.type}) — ${formatPricingLineDescription(project)}`,
        sac: "998314",
        rate: gst.subtotal,
        gstRate: 18,
        serviceNotes: `Delta billing for change request ${changeRequest.id}`,
      },
    ],
    subtotal: gst.subtotal,
    cgst: gst.cgst,
    sgst: gst.sgst,
    igst: gst.igst,
    total: gst.total,
    amountReceived: 0,
    status: "pending",
    invoiceDate: issuedAt,
    dueDate: due.toISOString().slice(0, 10),
    createdAt: issuedAt,
    paymentTerms: customer?.paymentTerms,
    notes: `Auto-issued on approval of change request ${changeRequest.id}${
      changeRequest.notes ? ` — ${changeRequest.notes}` : ""
    }`,
  };

  return prepareBillingDocumentForStorage(invoice, "invoices");
}
