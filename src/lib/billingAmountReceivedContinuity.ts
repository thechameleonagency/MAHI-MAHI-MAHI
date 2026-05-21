import type { AppState } from "@/contexts/AppDataContext";
import { reconcileProjectsAmountInvoiced } from "@/lib/billingSelectors";
import {
  reconcileClientPaymentLedger,
  syncCustomersAmountReceivedFromProjects,
} from "@/lib/clientPaymentReconciliation";
import { reconcileIncGiverTransactions } from "@/lib/reconcileIncGiverTransactions";
import type { Invoice } from "@/types/finance";

const DRIFT_EPS = 0.01;

export type StaleBillingAmountReceived = {
  entity: "invoice" | "saleBill" | "project";
  id: string;
  reason: "amount_received_drift" | "status_drift";
  stored: number;
  expected: number;
};

function compareBillingDocs(
  stale: StaleBillingAmountReceived[],
  collection: "invoice" | "saleBill",
  current: Invoice[],
  expected: Invoice[],
): void {
  const expectedById = new Map(expected.map((d) => [d.id, d]));
  for (const doc of current) {
    const exp = expectedById.get(doc.id);
    if (!exp) continue;
    if (Math.abs((doc.amountReceived ?? 0) - (exp.amountReceived ?? 0)) > DRIFT_EPS) {
      stale.push({
        entity: collection,
        id: doc.id,
        reason: "amount_received_drift",
        stored: doc.amountReceived ?? 0,
        expected: exp.amountReceived ?? 0,
      });
    }
    if (doc.status !== exp.status) {
      stale.push({
        entity: collection,
        id: doc.id,
        reason: "status_drift",
        stored: doc.amountReceived ?? 0,
        expected: exp.amountReceived ?? 0,
      });
    }
  }
}

/**
 * ER5 — single hydration pass: invoice/sale-bill FIFO + project.amountReceived from payments/incomes.
 * INC_GIVEN `amountReceived` is finalized by `reconcileIncGiverTransactions` (ER4) after this step.
 */
export function reconcileBillingAmountReceivedState(state: AppState): AppState {
  const projects = reconcileProjectsAmountInvoiced(
    state.projects,
    state.invoices,
    state.saleBills,
  );

  const ledger = reconcileClientPaymentLedger({
    clientPaymentRecords: state.clientPaymentRecords,
    payments: state.payments,
    invoices: state.invoices,
    saleBills: state.saleBills,
    projects,
    incomes: state.incomes,
  });

  return {
    ...state,
    payments: ledger.payments,
    invoices: ledger.invoices,
    saleBills: ledger.saleBills,
    projects: ledger.projects,
    customers: syncCustomersAmountReceivedFromProjects(state.customers, ledger.projects),
  };
}

/** Canonical billing snapshot after ER5 + ER4 reconcile (matches end of hydrate pipeline). */
export function expectedBillingAmountReceivedState(state: AppState): Pick<
  AppState,
  "payments" | "invoices" | "saleBills" | "projects" | "customers"
> {
  const billing = reconcileBillingAmountReceivedState(state);
  const afterInc = reconcileIncGiverTransactions(billing);
  return {
    payments: afterInc.payments,
    invoices: afterInc.invoices,
    saleBills: afterInc.saleBills,
    projects: afterInc.projects,
    customers: syncCustomersAmountReceivedFromProjects(afterInc.customers, afterInc.projects),
  };
}

export function findStaleBillingAmountReceived(state: AppState): StaleBillingAmountReceived[] {
  const expected = expectedBillingAmountReceivedState(state);
  const stale: StaleBillingAmountReceived[] = [];

  compareBillingDocs(stale, "invoice", state.invoices, expected.invoices);
  compareBillingDocs(stale, "saleBill", state.saleBills, expected.saleBills);

  const expectedProjects = new Map(expected.projects.map((p) => [p.id, p]));
  for (const project of state.projects) {
    const exp = expectedProjects.get(project.id);
    if (!exp) continue;
    const stored = project.amountReceived ?? 0;
    const canon = exp.amountReceived ?? 0;
    if (Math.abs(stored - canon) > DRIFT_EPS) {
      stale.push({
        entity: "project",
        id: project.id,
        reason: "amount_received_drift",
        stored,
        expected: canon,
      });
    }
  }

  return stale;
}

export function formatStaleBillingAmountReceivedErrors(stale: StaleBillingAmountReceived[]): string[] {
  return stale.map(
    (s) =>
      `ER5: ${s.entity} ${s.id} — ${s.reason} (stored ${s.stored}, expected ${s.expected})`,
  );
}
