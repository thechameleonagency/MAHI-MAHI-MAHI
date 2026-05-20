import { canTransitionQuotationStatus, type QuotationStatus } from "@/domain/stateMachines/quotationStateMachine";
import { validateQuotationSendOrApprove } from "@/domain/quotation/quotationCommercialAmount";
import { validateQuotationPaymentTypeForSend } from "@/domain/quotation/quotationPaymentType";
import type { Quotation } from "@/types/project";

/** Commercial line items locked after approval/confirm (aligns with AppDataContext). */
export const QUOTATION_LOCKED_FIELDS: (keyof Quotation)[] = [
  "clientName",
  "clientPhone",
  "clientEmail",
  "clientCity",
  "clientState",
  "clientAddress",
  "systemCategory",
  "systemCapacity",
  "presetSnapshot",
  "attachedPresetId",
  "paymentType",
  "totalAmount",
  "clientAgreedAmount",
  "bankDocumentationAmount",
  "sectionVisibility",
];

export const isQuotationCommerciallyLocked = (quotation: Quotation) =>
  quotation.status === "approved";

export const createCommercialSnapshot = (quotation: Quotation): NonNullable<Quotation["commercialSnapshot"]> => ({
  capturedAt: new Date().toISOString(),
  companyName: "MAHI SOLAR",
  customerName: quotation.clientName,
  customerPhone: quotation.clientPhone,
  customerEmail: quotation.clientEmail,
  customerAddress: quotation.clientAddress,
  customerState: quotation.clientState,
  customerCity: quotation.clientCity,
  quotationType: quotation.quotationType,
  systemCategory: quotation.systemCategory,
  systemCapacity: quotation.systemCapacity,
  totalAmount: quotation.totalAmount,
  clientAgreedAmount: quotation.clientAgreedAmount,
  bankDocumentationAmount: quotation.bankDocumentationAmount,
  paymentType: quotation.paymentType,
  notes: quotation.notes,
  sectionVisibility: quotation.sectionVisibility,
});

export type ApplyQuotationPatchResult =
  | { ok: true; quotation: Quotation }
  | { ok: false; code: "LOCKED_FIELD"; message: string }
  | { ok: false; code: "INVALID_STATUS_TRANSITION"; message: string };

/**
 * Pure merge for quotation field updates (draft edits, status changes not using transition command, etc.).
 */
export function applyQuotationPatch(quotation: Quotation, updates: Partial<Quotation>): ApplyQuotationPatchResult {
  const nextStatus = updates.status as QuotationStatus | undefined;
  if (nextStatus && !canTransitionQuotationStatus(quotation.status as QuotationStatus, nextStatus)) {
    return {
      ok: false,
      code: "INVALID_STATUS_TRANSITION",
      message: `Invalid transition from ${quotation.status} to ${nextStatus}`,
    };
  }

  if (isQuotationCommerciallyLocked(quotation)) {
    const hasLockedFieldMutation = QUOTATION_LOCKED_FIELDS.some((field) => field in updates);
    if (hasLockedFieldMutation && updates.status === undefined) {
      return {
        ok: false,
        code: "LOCKED_FIELD",
        message: "Cannot change commercial fields after approval/confirmation (except via status transition)",
      };
    }
  }

  const nextQuotation: Quotation = { ...quotation, ...updates };
  const isStatusTransitionToSent = quotation.status !== "sent" && nextQuotation.status === "sent";
  const isStatusTransitionToApproved =
    quotation.status !== "approved" && nextQuotation.status === "approved";

  if (isStatusTransitionToSent || isStatusTransitionToApproved) {
    const amountCheck = validateQuotationSendOrApprove(nextQuotation);
    if (!amountCheck.ok) {
      return {
        ok: false,
        code: "QUOTATION_ZERO_AMOUNT",
        message: amountCheck.message,
      };
    }
    const paymentCheck = validateQuotationPaymentTypeForSend(nextQuotation);
    if (!paymentCheck.ok) {
      return {
        ok: false,
        code: "QUOTATION_PAYMENT_TYPE_REQUIRED",
        message: paymentCheck.message,
      };
    }
  }

  if (isStatusTransitionToSent && !nextQuotation.commercialSnapshot) {
    nextQuotation.commercialSnapshot = createCommercialSnapshot(nextQuotation);
  }

  return { ok: true, quotation: nextQuotation };
}
