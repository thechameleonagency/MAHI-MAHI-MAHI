/**
 * BL-11: Bank statement CSV parser extracted from BankReconciliationSheet for
 * testability. Drives the user's stated acceptance criterion (upload own bank
 * CSV → match → reconcile). All parsing logic is pure and side-effect-free so
 * it can be unit-tested without the React tree.
 */
import { isValid, parseISO } from "date-fns";
import type { BankStatementTransaction } from "@/types/finance";

export type BankTransaction = BankStatementTransaction;

/**
 * Normalize common Indian bank-statement date formats to ISO `yyyy-MM-dd`.
 * Handles `dd/mm/yyyy`, `dd-mm-yyyy`, `yyyy/mm/dd`, `yyyy-mm-dd`. Anything else
 * is returned verbatim (`parseISO` later decides validity).
 */
export function normalizeBankDate(dateStr: string): string {
  if (!dateStr) return "";
  const formats = [
    /^(\d{2})[/-](\d{2})[/-](\d{4})$/,
    /^(\d{4})[/-](\d{2})[/-](\d{2})$/,
  ];

  const m1 = dateStr.match(formats[0]);
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;

  const m2 = dateStr.match(formats[1]);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;

  return dateStr;
}

/**
 * Parse a bank-statement amount cell. Strips ₹/Rs prefix, currency whitespace,
 * and thousand-separator commas. Returns 0 for blanks or non-numeric content.
 *
 * BL-12 (regression fixed in extraction): the previous regex `[₹Rs.\s]` was a
 * character class that included the literal `.` — it silently stripped the
 * decimal point, turning "Rs. 25000.00" into "2500000" (off by 100×). This
 * implementation strips only currency-prefix letters and whitespace, never
 * the decimal point.
 */
export function parseBankAmount(raw: string | undefined): number {
  if (!raw?.trim()) return 0;
  // Strip currency prefix ("Rs.", "₹", "INR") then thousand separators.
  const cleaned = raw
    .replace(/[₹]/g, "")
    .replace(/(?:rs|inr)\.?/gi, "")
    .replace(/\s/g, "")
    .replace(/,/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function isValidBankDate(dateStr: string): boolean {
  const normalized = normalizeBankDate(dateStr);
  if (!normalized) return false;
  const d = parseISO(normalized);
  return isValid(d);
}

export interface ParseBankCsvResult {
  transactions: BankTransaction[];
  /** Rows skipped because the date column was unparseable. */
  skippedInvalid: number;
}

/**
 * Parse a bank-statement CSV into typed transactions.
 *
 * Header detection is keyword-based (`date`, `description`/`narration`/`particular`,
 * `debit`/`withdrawal`/`dr`, `credit`/`deposit`/`cr`, `balance`/`closing`,
 * `ref`/`chq`/`utr`) so most Indian bank CSV exports parse without manual mapping.
 * Falls back to positional columns 0..5 when headers are missing.
 */
export function parseBankCsv(content: string): ParseBankCsvResult {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) return { transactions: [], skippedInvalid: 0 };

  const header = lines[0].toLowerCase();
  const headers = header.split(",").map((h) => h.trim().replace(/"/g, ""));

  const dateIdx = headers.findIndex(
    (h) => h.includes("date") || h.includes("txn") || h.includes("value"),
  );
  const descIdx = headers.findIndex(
    (h) =>
      h.includes("description") ||
      h.includes("narration") ||
      h.includes("particular") ||
      h.includes("remark"),
  );
  const debitIdx = headers.findIndex(
    (h) => h.includes("debit") || h.includes("withdrawal") || h.includes("dr"),
  );
  const creditIdx = headers.findIndex(
    (h) => h.includes("credit") || h.includes("deposit") || h.includes("cr"),
  );
  const balIdx = headers.findIndex(
    (h) => h.includes("balance") || h.includes("closing"),
  );
  const refIdx = headers.findIndex(
    (h) => h.includes("ref") || h.includes("chq") || h.includes("utr"),
  );

  const mapRow = (cols: string[], rawLine: string): BankTransaction | null => {
    const date = dateIdx >= 0 ? cols[dateIdx] || "" : cols[0] || "";
    if (!isValidBankDate(date)) return null;
    return {
      date,
      description: (descIdx >= 0 ? cols[descIdx] : cols[1]) || "",
      debit: debitIdx >= 0 ? parseBankAmount(cols[debitIdx]) : parseBankAmount(cols[2]),
      credit: creditIdx >= 0 ? parseBankAmount(cols[creditIdx]) : parseBankAmount(cols[3]),
      balance: balIdx >= 0 ? parseBankAmount(cols[balIdx]) : parseBankAmount(cols[4]),
      reference: refIdx >= 0 ? cols[refIdx] : cols[5] || "",
      rawLine,
    };
  };

  let skippedInvalid = 0;
  const dataLines = lines.slice(1).filter((l) => l.trim());
  const transactions: BankTransaction[] = [];
  for (const line of dataLines) {
    const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));
    const row = mapRow(cols, line);
    if (row) transactions.push(row);
    else skippedInvalid += 1;
  }
  return { transactions, skippedInvalid };
}
