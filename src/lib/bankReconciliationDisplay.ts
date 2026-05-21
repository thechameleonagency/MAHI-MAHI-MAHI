import { formatINR } from "@/lib/formatCurrency";
import { formatBankReconciliationLinkLabel } from "@/lib/bankReconciliationLink";
import type { BankReconciliationLink } from "@/types/finance";

export type MatchedLedgerEntryView = {
  id: string;
  type: string;
  description: string;
  amount: number;
  date: string;
  /** E9 — persisted link already on the ledger row (shown after save). */
  reconciledWith?: BankReconciliationLink;
};

export type ReconciliationRowMatchView = {
  flag: string;
  matchedLedgerEntry?: MatchedLedgerEntryView;
  notes?: string;
};

/** Stable key for expand/collapse state in the results table. */
export function reconciliationResultRowKey(statementId: string, index: number): string {
  return `${statementId}:${index}`;
}

export function hasReconciliationExpandableDetail(row: ReconciliationRowMatchView): boolean {
  return Boolean(row.matchedLedgerEntry) || Boolean(row.notes?.trim());
}

/** Human-readable match panel copy (mobile expand row + tests). */
export function buildReconciliationMatchDetailLines(
  row: ReconciliationRowMatchView,
): { label: string; value: string }[] {
  if (row.matchedLedgerEntry) {
    const e = row.matchedLedgerEntry;
    const prefix = row.flag === "possible-match" ? "Possible match" : "Matched to";
    const lines = [
      { label: prefix, value: e.type },
      { label: "Description", value: e.description },
      { label: "Amount", value: formatINR(e.amount) },
      { label: "Ledger date", value: e.date },
      { label: "Ledger id", value: e.id },
    ];
    if (e.reconciledWith) {
      lines.push({
        label: "Saved on ledger",
        value: formatBankReconciliationLinkLabel(e.reconciledWith),
      });
    }
    return lines;
  }
  if (row.notes?.trim()) {
    return [{ label: "Note", value: row.notes.trim() }];
  }
  return [{ label: "Ledger link", value: "No ledger entry linked for this bank line." }];
}
