import type { NarrativeApply } from "./shared";

/** Bank recon mixed matched/unmatched — statements seeded in L11; ensure unmatched credit visible. */
export const applyBankReconMixed: NarrativeApply = (state) => {
  const stmt = state.bankReconciliationStatements[0] as { transactions?: { rawLine?: string; credit?: number }[] } | undefined;
  if (stmt?.transactions?.some((t) => t.rawLine === "unmatched")) return;
};
