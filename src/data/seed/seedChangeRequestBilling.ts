import type { AppState } from "@/contexts/AppDataContext";
import { VoucherPostingService, type AccountingEventType } from "@/application/services/VoucherPostingService";
import { issueChangeRequestDeltaBilling } from "@/lib/issueChangeRequestDeltaBilling";
import type { ProjectChangeRequest } from "@/types/operations";
import type { Project } from "@/types/project";
import { seedId, SEED_ID_PREFIX } from "./seedIdRegistry";
import { seedDateAt } from "./seedTimeModel";

const voucherService = new VoucherPostingService();

function postVoucher(state: AppState, type: AccountingEventType, docId: string, amount: number, gst = 0) {
  const result = voucherService.post({ type, sourceDocumentId: docId, amount, gstAmount: gst });
  if (result.ok) {
    state.accountingVouchers.push(result.voucher);
  } else {
    state.accountingReviewQueue.push({
      id: seedId(SEED_ID_PREFIX.reviewQueue),
      reason: result.reviewQueueItem.reason,
      eventType: type,
      sourceDocumentId: docId,
      amount,
      createdAt: seedDateAt(0.5),
    });
  }
}

/** Seed-time billing for an approved change request (invoice + project link + books). */
export function applyChangeRequestBillingToSeedState(
  state: AppState,
  project: Project,
  cr: ProjectChangeRequest,
  issuedAt?: string,
): ProjectChangeRequest {
  const issued = issuedAt ?? cr.approvedAt?.slice(0, 10);
  const billing = issueChangeRequestDeltaBilling({
    project,
    customer: state.customers.find((c) => c.id === project.customerId),
    changeRequest: cr,
    existingInvoices: state.invoices,
    invoiceId: seedId(SEED_ID_PREFIX.invoice),
    issuedAt: issued,
  });
  if (!billing) return cr;

  state.invoices.unshift(billing.invoice);
  Object.assign(project, billing.projectInvoicePatch);
  postVoucher(
    state,
    "InvoiceIssued",
    billing.invoice.id,
    billing.invoice.total,
    billing.invoice.cgst + billing.invoice.sgst + billing.invoice.igst,
  );
  return { ...cr, generatedInvoiceId: billing.generatedInvoiceId };
}
