import { isProjectPaymentType } from "@/domain/project/projectPaymentType";
import type { Quotation } from "@/types/project";

export const QUOTATION_PAYMENT_TYPE_REQUIRED_MESSAGE =
  "Select a payment type (Cash, Loan, or Cash + Loan) before sending or approving this quotation.";

type QuotationPaymentSource = Pick<Quotation, "paymentType">;

export function validateQuotationPaymentTypeForSend(
  quotation: QuotationPaymentSource,
): { ok: true } | { ok: false; message: string } {
  if (isProjectPaymentType(quotation.paymentType)) {
    return { ok: true };
  }
  return { ok: false, message: QUOTATION_PAYMENT_TYPE_REQUIRED_MESSAGE };
}
