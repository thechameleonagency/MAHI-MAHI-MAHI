import type { AccountingEventType } from "@/application/services/VoucherPostingService";
import { getLedgerById } from "@/services/finance/chartOfAccounts";

/** VoucherPostingService account codes → Chart of Accounts ledger ids. */
export const POSTING_ACCOUNT_TO_LEDGER: Record<string, string> = {
  "1000_BANK": "primary-bank-account",
  "1100_RECEIVABLE": "trade-receivables",
  "2100_ACCOUNTS_PAYABLE": "trade-payables",
  "2200_GST_OUTPUT": "gst-payable",
  "2300_PAYROLL_PAYABLE": "salary-payable",
  "2400_PARTNER_PAYABLE": "partner-capital",
  "3100_LOAN_LIABILITY": "bank-loan-ledger",
  "4100_REVENUE": "solar-sales",
  "5100_EXPENSE": "office-supplies-exp",
  "5200_SALARY_EXPENSE": "salaries-wages",
  "5300_PURCHASES": "material-purchases",
};

export interface PostingRuleRow {
  eventType: AccountingEventType;
  side: "debit" | "credit";
  accountCode: string;
  ledgerId: string;
  ledgerName: string;
  mapped: boolean;
}

const EVENT_LINES: Record<AccountingEventType, { debit: string; credit: string }[]> = {
  InvoiceIssued: [
    { debit: "1100_RECEIVABLE", credit: "4100_REVENUE" },
    { debit: "1100_RECEIVABLE", credit: "2200_GST_OUTPUT" },
  ],
  PaymentReceived: [{ debit: "1000_BANK", credit: "1100_RECEIVABLE" }],
  ExpenseRecorded: [{ debit: "5100_EXPENSE", credit: "1000_BANK" }],
  PayrollReleased: [{ debit: "5200_SALARY_EXPENSE", credit: "2300_PAYROLL_PAYABLE" }],
  PayrollPaid: [{ debit: "2300_PAYROLL_PAYABLE", credit: "1000_BANK" }],
  LoanReceived: [{ debit: "1000_BANK", credit: "3100_LOAN_LIABILITY" }],
  LoanRepayment: [{ debit: "3100_LOAN_LIABILITY", credit: "1000_BANK" }],
  PurchaseBillBooked: [{ debit: "5300_PURCHASES", credit: "2100_ACCOUNTS_PAYABLE" }],
  VendorPaymentRecorded: [{ debit: "2100_ACCOUNTS_PAYABLE", credit: "1000_BANK" }],
  PartnerPayoutRecorded: [{ debit: "2400_PARTNER_PAYABLE", credit: "1000_BANK" }],
};

export function resolvePostingLedger(accountCode: string): { ledgerId: string; ledgerName: string; mapped: boolean } {
  const ledgerId = POSTING_ACCOUNT_TO_LEDGER[accountCode];
  if (!ledgerId) {
    return { ledgerId: accountCode, ledgerName: accountCode, mapped: false };
  }
  const ledger = getLedgerById(ledgerId);
  return {
    ledgerId,
    ledgerName: ledger?.name ?? ledgerId,
    mapped: Boolean(ledger),
  };
}

export function listVoucherPostingRules(): PostingRuleRow[] {
  const rows: PostingRuleRow[] = [];
  (Object.keys(EVENT_LINES) as AccountingEventType[]).forEach((eventType) => {
    EVENT_LINES[eventType].forEach((line) => {
      (["debit", "credit"] as const).forEach((side) => {
        const accountCode = line[side];
        const resolved = resolvePostingLedger(accountCode);
        rows.push({
          eventType,
          side,
          accountCode,
          ledgerId: resolved.ledgerId,
          ledgerName: resolved.ledgerName,
          mapped: resolved.mapped,
        });
      });
    });
  });
  return rows;
}

export function validatePostingAccountMap(): { ok: boolean; unmapped: string[]; missingLedgers: string[] } {
  const codes = new Set<string>();
  Object.values(EVENT_LINES).forEach((lines) =>
    lines.forEach((l) => {
      codes.add(l.debit);
      codes.add(l.credit);
    }),
  );
  const unmapped: string[] = [];
  const missingLedgers: string[] = [];
  codes.forEach((code) => {
    const ledgerId = POSTING_ACCOUNT_TO_LEDGER[code];
    if (!ledgerId) {
      unmapped.push(code);
      return;
    }
    if (!getLedgerById(ledgerId)) missingLedgers.push(`${code}→${ledgerId}`);
  });
  return { ok: unmapped.length === 0 && missingLedgers.length === 0, unmapped, missingLedgers };
}
