import type { AppState } from "@/contexts/AppDataContext";
import { createId } from "@/lib/idFactory";
import type { Quotation } from "@/types/project";
import type { QuotationShareDetails } from "@/types/blockage";

export type QuotationShareHistoryEntry = NonNullable<Quotation["shareHistory"]>[number];

export type QuotationShareInput = {
  method: QuotationShareHistoryEntry["method"];
  contactValue?: string;
  sentAt: string;
  visitDate?: string;
  visitTime?: string;
  visitNotes?: string;
};

function shareRowKey(
  quotationId: string,
  entry: Pick<QuotationShareDetails, "shareMethod" | "sentAt" | "contactValue">,
): string {
  return `${quotationId}|${entry.shareMethod}|${entry.sentAt}|${entry.contactValue ?? ""}`;
}

export function historyEntryToShareDetails(
  quotationId: string,
  entry: QuotationShareHistoryEntry,
  id?: string,
): QuotationShareDetails {
  return {
    id: id ?? createId("QSH-"),
    quotationId,
    shareMethod: entry.method,
    contactValue: entry.contactValue,
    sentAt: entry.sentAt,
    visitDate: entry.visitDate,
    visitTime: entry.visitTime,
    visitNotes: entry.visitNotes,
  };
}

export function shareDetailsToHistoryEntry(detail: QuotationShareDetails): QuotationShareHistoryEntry {
  return {
    method: detail.shareMethod,
    contactValue: detail.contactValue,
    sentAt: detail.sentAt,
    visitDate: detail.visitDate,
    visitTime: detail.visitTime,
    visitNotes: detail.visitNotes,
  };
}

export function buildQuotationShareHistory(
  quotationId: string,
  details: QuotationShareDetails[],
): QuotationShareHistoryEntry[] {
  return details
    .filter((d) => d.quotationId === quotationId)
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt))
    .map(shareDetailsToHistoryEntry);
}

/**
 * ER7 — canonical `quotationShareDetails` collection; `quotation.shareHistory` is denormalized from it.
 */
export function reconcileQuotationShareDetails(state: AppState): AppState {
  const quotationIds = new Set(state.quotations.map((q) => q.id));
  const byKey = new Map<string, QuotationShareDetails>();

  for (const row of state.quotationShareDetails ?? []) {
    if (!quotationIds.has(row.quotationId)) continue;
    const key = shareRowKey(row.quotationId, row);
    if (!byKey.has(key)) byKey.set(key, row);
  }

  for (const quotation of state.quotations) {
    for (const entry of quotation.shareHistory ?? []) {
      const draft = historyEntryToShareDetails(quotation.id, entry);
      const key = shareRowKey(quotation.id, draft);
      if (!byKey.has(key)) byKey.set(key, draft);
    }
  }

  const quotationShareDetails = [...byKey.values()].sort((a, b) =>
    a.sentAt.localeCompare(b.sentAt),
  );

  const quotations = state.quotations.map((q) => ({
    ...q,
    shareHistory: buildQuotationShareHistory(q.id, quotationShareDetails),
  }));

  return { ...state, quotationShareDetails, quotations };
}

export type StaleQuotationShareDetails = {
  quotationId: string;
  detailId?: string;
  reason: "orphan_quotation" | "share_history_drift";
};

export function findStaleQuotationShareDetails(state: AppState): StaleQuotationShareDetails[] {
  const reconciled = reconcileQuotationShareDetails(state);
  const stale: StaleQuotationShareDetails[] = [];
  const quotationIds = new Set(state.quotations.map((q) => q.id));

  for (const detail of state.quotationShareDetails ?? []) {
    if (!quotationIds.has(detail.quotationId)) {
      stale.push({ quotationId: detail.quotationId, detailId: detail.id, reason: "orphan_quotation" });
    }
  }

  for (const q of state.quotations) {
    const expected = buildQuotationShareHistory(
      q.id,
      reconciled.quotationShareDetails ?? [],
    );
    const actual = q.shareHistory ?? [];
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      stale.push({ quotationId: q.id, reason: "share_history_drift" });
    }
  }

  return stale;
}

export function formatStaleQuotationShareErrors(rows: StaleQuotationShareDetails[]): string[] {
  return rows.map((s) => {
    const loc = s.detailId ? `detail ${s.detailId}` : `quotation ${s.quotationId}`;
    return `ER7: ${loc} — ${s.reason}`;
  });
}
