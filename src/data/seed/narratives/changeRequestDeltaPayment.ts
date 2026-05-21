import type { NarrativeApply } from "./shared";
import { seedId, SEED_ID_PREFIX } from "../seedIdRegistry";
import { seedDayAt, seedDateAt } from "../seedTimeModel";
import { VoucherPostingService } from "@/application/services/VoucherPostingService";

const voucherService = new VoucherPostingService();

/** FC3 — partial receipt against a scope-change delta invoice (invoice-targeted payment path). */
export const applyChangeRequestDeltaPayment: NarrativeApply = (state) => {
  const cr = state.projectChangeRequests.find(
    (r) =>
      r.status === "approved" &&
      r.generatedInvoiceId &&
      r.notes?.includes("subsidy revision"),
  );
  if (!cr?.generatedInvoiceId) return;

  const invoice = state.invoices.find((i) => i.id === cr.generatedInvoiceId);
  if (!invoice || invoice.status === "voided" || invoice.status === "draft") return;

  const open = invoice.total - (invoice.amountReceived ?? 0);
  if (open <= 0) return;

  const amount = Math.round(open * 0.6);
  const paymentId = seedId(SEED_ID_PREFIX.payment);
  state.payments.push({
    id: paymentId,
    date: seedDayAt(0.54),
    amount,
    direction: "in",
    paymentMode: "Bank Transfer",
    counterpartyType: "customer",
    customerId: invoice.customerId,
    projectId: invoice.projectId,
    projectName: invoice.projectName,
    invoiceId: invoice.id,
    notes: `Receipt for scope change invoice ${invoice.invoiceNumber}`,
  });

  invoice.amountReceived = (invoice.amountReceived ?? 0) + amount;
  invoice.status = amount >= open - 0.02 ? "paid" : "partial";

  const project = state.projects.find((p) => p.id === invoice.projectId);
  if (project) {
    project.amountReceived = (project.amountReceived ?? 0) + amount;
  }

  const posting = voucherService.post({
    type: "PaymentReceived",
    sourceDocumentId: paymentId,
    amount,
  });
  if (posting.ok) {
    state.accountingVouchers.push(posting.voucher);
  } else {
    state.accountingReviewQueue.push({
      id: seedId(SEED_ID_PREFIX.reviewQueue),
      reason: posting.reviewQueueItem.reason,
      eventType: "PaymentReceived",
      sourceDocumentId: paymentId,
      amount,
      createdAt: seedDateAt(0.54),
    });
  }
};
