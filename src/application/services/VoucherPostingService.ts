import { isBalancedVoucher, type Voucher } from "@/domain/accounting/voucherTypes";

export type AccountingEventType =
  | "InvoiceIssued"
  | "PaymentReceived"
  | "PurchaseBillBooked"
  | "VendorPaymentRecorded"
  | "ExpenseRecorded"
  | "PayrollReleased"
  | "PayrollPaid"
  | "PartnerPayoutRecorded"
  | "LoanReceived"
  | "LoanRepayment";

export type AccountingEventInput = {
  type: AccountingEventType;
  sourceDocumentId: string;
  amount: number;
  gstAmount?: number;
};

export type PostingResult =
  | { ok: true; voucher: Voucher }
  | { ok: false; reviewQueueItem: { reason: string; event: AccountingEventInput } };

const makeVoucherId = () =>
  `VCH-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();

export class VoucherPostingService {
  post(input: AccountingEventInput): PostingResult {
    const voucher = this.createVoucher(input);
    if (!voucher) {
      return {
        ok: false,
        reviewQueueItem: {
          reason: `Auto-posting is not configured for ${input.type}`,
          event: input,
        },
      };
    }

    if (!isBalancedVoucher(voucher)) {
      return {
        ok: false,
        reviewQueueItem: {
          reason: `Generated voucher is unbalanced for ${input.type}`,
          event: input,
        },
      };
    }

    return {
      ok: true,
      voucher,
    };
  }

  private createVoucher(input: AccountingEventInput): Voucher | null {
    const base = {
      id: makeVoucherId(),
      sourceEvent: input.type,
      sourceDocumentId: input.sourceDocumentId,
      createdAt: new Date().toISOString(),
    };

    switch (input.type) {
      case "InvoiceIssued":
        return {
          ...base,
          lines: [
            { accountCode: "1100_RECEIVABLE", debit: input.amount, credit: 0 },
            { accountCode: "4100_REVENUE", debit: 0, credit: input.amount - (input.gstAmount || 0) },
            { accountCode: "2200_GST_OUTPUT", debit: 0, credit: input.gstAmount || 0 },
          ],
        };
      case "PaymentReceived":
        return {
          ...base,
          lines: [
            { accountCode: "1000_BANK", debit: input.amount, credit: 0 },
            { accountCode: "1100_RECEIVABLE", debit: 0, credit: input.amount },
          ],
        };
      case "ExpenseRecorded":
        return {
          ...base,
          lines: [
            { accountCode: "5100_EXPENSE", debit: input.amount, credit: 0 },
            { accountCode: "1000_BANK", debit: 0, credit: input.amount },
          ],
        };
      case "PayrollReleased":
        return {
          ...base,
          lines: [
            { accountCode: "5200_SALARY_EXPENSE", debit: input.amount, credit: 0 },
            { accountCode: "2300_PAYROLL_PAYABLE", debit: 0, credit: input.amount },
          ],
        };
      case "LoanReceived":
        return {
          ...base,
          lines: [
            { accountCode: "1000_BANK", debit: input.amount, credit: 0 },
            { accountCode: "3100_LOAN_LIABILITY", debit: 0, credit: input.amount },
          ],
        };
      case "LoanRepayment":
        return {
          ...base,
          lines: [
            { accountCode: "3100_LOAN_LIABILITY", debit: input.amount, credit: 0 },
            { accountCode: "1000_BANK", debit: 0, credit: input.amount },
          ],
        };
      case "PurchaseBillBooked":
        return {
          ...base,
          lines: [
            { accountCode: "5300_PURCHASES", debit: input.amount, credit: 0 },
            { accountCode: "2100_ACCOUNTS_PAYABLE", debit: 0, credit: input.amount },
          ],
        };
      case "VendorPaymentRecorded":
        return {
          ...base,
          lines: [
            { accountCode: "2100_ACCOUNTS_PAYABLE", debit: input.amount, credit: 0 },
            { accountCode: "1000_BANK", debit: 0, credit: input.amount },
          ],
        };
      case "PayrollPaid":
        return {
          ...base,
          lines: [
            { accountCode: "2300_PAYROLL_PAYABLE", debit: input.amount, credit: 0 },
            { accountCode: "1000_BANK", debit: 0, credit: input.amount },
          ],
        };
      case "PartnerPayoutRecorded":
        return {
          ...base,
          lines: [
            { accountCode: "2400_PARTNER_PAYABLE", debit: input.amount, credit: 0 },
            { accountCode: "1000_BANK", debit: 0, credit: input.amount },
          ],
        };
      default:
        return null;
    }
  }
}
