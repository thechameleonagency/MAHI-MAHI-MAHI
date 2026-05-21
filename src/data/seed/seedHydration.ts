import type { AppState } from "@/contexts/AppDataContext";
import { normalizeAppState } from "@/data/appSeedBuilder";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import { reconcileAllEnquiryQuotationHistories } from "@/lib/enquiryQuotationHistory";
import { linkAccrualsToProject } from "@/lib/agentCommissionAccrualPolicy";
import { reconcileClientPaymentLedger } from "@/lib/clientPaymentReconciliation";
import { syncBankReconciliationLinks } from "@/lib/bankReconciliationLink";
import { evaluateAutoArchive, applyAutoArchive } from "@/domain/customer/customerArchive";
import { syncProjectsSiteReadinessFromChecklist } from "@/lib/siteReadinessFromChecklist";
import { buildBankReconciliationMatches } from "./ops_bankReconciliation";

/**
 * Appendix N — full hydration after seed assembly (steps 6–12 beyond boot pipeline).
 */
export function applySeedHydrationPipeline(state: AppState): AppState {
  let s = normalizeAppState(state);
  s = applyAppStateHydrationPipeline(s);

  const enquiries = reconcileAllEnquiryQuotationHistories(s.enquiries, s.quotations);
  s = { ...s, enquiries };

  s = {
    ...s,
    projects: syncProjectsSiteReadinessFromChecklist(s.projects),
  };

  s = linkAccrualsToProject(s);

  const activeStatementIds = s.bankReconciliationStatements.map((st) => st.id);
  const bankMatches = buildBankReconciliationMatches(s);
  const bankSynced = syncBankReconciliationLinks(
    {
      expenses: s.expenses,
      incomes: s.incomes,
      payments: s.payments,
      vendorPayments: s.vendorPayments,
    },
    activeStatementIds,
    bankMatches,
  );
  s = { ...s, ...bankSynced };

  const ledger = reconcileClientPaymentLedger({
    clientPaymentRecords: s.clientPaymentRecords,
    payments: s.payments,
    invoices: s.invoices,
    projects: s.projects,
  });
  s = { ...s, ...ledger };

  s = {
    ...s,
    customers: s.customers.map((customer) => {
      const decision = evaluateAutoArchive({
        customer,
        projects: s.projects,
        quotations: s.quotations,
        enquiries: s.enquiries,
      });
      const patch = applyAutoArchive(customer, decision);
      return patch ? { ...customer, ...patch } : customer;
    }),
  };

  return s;
}
