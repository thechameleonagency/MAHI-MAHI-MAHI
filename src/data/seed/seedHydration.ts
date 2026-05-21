import type { AppState } from "@/contexts/AppDataContext";
import { normalizeAppState } from "@/data/appSeedBuilder";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import { reconcileAllEnquiryQuotationHistories } from "@/lib/enquiryQuotationHistory";
import { reconcileProjectAgentCommissionState } from "@/lib/projectStartContinuity";
import { reconcileClientPaymentLedger } from "@/lib/clientPaymentReconciliation";
import { syncBankReconciliationLinks } from "@/lib/bankReconciliationLink";
import { reconcileCustomersAutoArchive } from "@/domain/customer/customerArchive";
import { syncProjectsSiteReadinessFromChecklist } from "@/lib/siteReadinessFromChecklist";
import { buildBankReconciliationMatches } from "./ops_bankReconciliation";
import { reconcileEnquiriesConvertedOnProjectLink } from "@/lib/reconcileEnquiryConvertedOnProjectLink";
import { reconcileVendorBillVouchers } from "@/lib/vendorBillVoucherPosting";
import { reconcileProjectActorScopeSeed } from "@/lib/reconcileProjectActorScopeSeed";
import { reconcileChangeRequestDeltaInvoices } from "@/lib/reconcileChangeRequestDeltaInvoices";
import { reconcileProjectsAmountReceived } from "@/lib/billingSelectors";
import { reconcileIncGiverTransactions } from "@/lib/reconcileIncGiverTransactions";

/**
 * Appendix N — full hydration after seed assembly (steps 6–12 beyond boot pipeline).
 */
export function applySeedHydrationPipeline(state: AppState): AppState {
  let s = normalizeAppState(state);
  s = applyAppStateHydrationPipeline(s);

  const enquiries = reconcileAllEnquiryQuotationHistories(s.enquiries, s.quotations);
  s = { ...s, enquiries };
  s = reconcileEnquiriesConvertedOnProjectLink(s);

  s = {
    ...s,
    projects: syncProjectsSiteReadinessFromChecklist(s.projects),
  };

  s = reconcileProjectAgentCommissionState(s);

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
    incomes: s.incomes,
  });
  s = { ...s, ...ledger };

  s = {
    ...s,
    customers: reconcileCustomersAutoArchive({
      customers: s.customers,
      projects: s.projects,
      quotations: s.quotations,
      enquiries: s.enquiries,
    }),
  };

  s = reconcileVendorBillVouchers(s);
  s = reconcileProjectActorScopeSeed(s);
  s = reconcileChangeRequestDeltaInvoices(s);

  s = {
    ...s,
    projects: reconcileProjectsAmountReceived(s.projects, s.payments, s.incomes),
  };

  s = reconcileIncGiverTransactions(s);

  return s;
}

