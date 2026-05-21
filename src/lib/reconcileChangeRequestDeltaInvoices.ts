import { VoucherPostingService } from "@/application/services/VoucherPostingService";
import type { AppState } from "@/contexts/AppDataContext";
import { resolveChangeRequestDeltaAmount } from "@/lib/changeRequestApproval";
import { isPlaceholderChangeRequestInvoiceId } from "@/lib/changeRequestDeltaInvoice";
import { issueChangeRequestDeltaBilling } from "@/lib/issueChangeRequestDeltaBilling";
import { reconcileProjectsAmountInvoiced } from "@/lib/billingSelectors";
import { seedId, SEED_ID_PREFIX } from "@/data/seed/seedIdRegistry";

/**
 * Backfill real delta invoices for approved change requests (seed + persisted stores).
 */
export function reconcileChangeRequestDeltaInvoices(state: AppState): AppState {
  const voucherService = new VoucherPostingService();
  let invoices = [...state.invoices];
  let projects = [...state.projects];
  let accountingVouchers = [...state.accountingVouchers];
  let accountingReviewQueue = [...state.accountingReviewQueue];

  const changeRequests = (state.projectChangeRequests ?? []).map((cr) => {
    if (cr.status !== "approved") return cr;

    const projectIndex = projects.findIndex((p) => p.id === cr.projectId);
    if (projectIndex < 0) return cr;

    let project = projects[projectIndex];
    const deltaAmount = resolveChangeRequestDeltaAmount(project, cr) || cr.deltaAmount || 0;

    if (deltaAmount <= 0) {
      if (isPlaceholderChangeRequestInvoiceId(cr.generatedInvoiceId)) {
        return { ...cr, generatedInvoiceId: undefined };
      }
      return cr;
    }

    const linked = cr.generatedInvoiceId
      ? invoices.find((inv) => inv.id === cr.generatedInvoiceId)
      : undefined;
    if (linked && !isPlaceholderChangeRequestInvoiceId(linked.id)) {
      return cr;
    }

    if (!project.customerId?.trim()) {
      return isPlaceholderChangeRequestInvoiceId(cr.generatedInvoiceId)
        ? { ...cr, generatedInvoiceId: undefined }
        : cr;
    }

    const billing = issueChangeRequestDeltaBilling({
      project,
      customer: state.customers.find((c) => c.id === project.customerId),
      changeRequest: cr,
      existingInvoices: invoices,
      invoiceId: seedId(SEED_ID_PREFIX.invoice),
      issuedAt: cr.approvedAt?.slice(0, 10),
    });
    if (!billing) {
      return isPlaceholderChangeRequestInvoiceId(cr.generatedInvoiceId)
        ? { ...cr, generatedInvoiceId: undefined }
        : cr;
    }

    invoices = [billing.invoice, ...invoices];
    project = { ...project, ...billing.projectInvoicePatch };
    projects[projectIndex] = project;

    const posting = voucherService.post({
      type: "InvoiceIssued",
      sourceDocumentId: billing.invoice.id,
      amount: billing.invoice.total,
      gstAmount: billing.invoice.cgst + billing.invoice.sgst + billing.invoice.igst,
    });

    if (posting.ok) {
      accountingVouchers = [posting.voucher, ...accountingVouchers];
    } else {
      const { reason, event } = posting.reviewQueueItem;
      accountingReviewQueue = [
        {
          id: seedId(SEED_ID_PREFIX.reviewQueue),
          reason,
          eventType: event.type,
          sourceDocumentId: event.sourceDocumentId,
          projectId: project.id,
          amount: event.amount,
          createdAt: new Date().toISOString(),
        },
        ...accountingReviewQueue,
      ];
    }

    return { ...cr, generatedInvoiceId: billing.generatedInvoiceId };
  });

  projects = reconcileProjectsAmountInvoiced(projects, invoices, state.saleBills);

  return {
    ...state,
    invoices,
    projects,
    projectChangeRequests: changeRequests,
    accountingVouchers,
    accountingReviewQueue,
  };
}
