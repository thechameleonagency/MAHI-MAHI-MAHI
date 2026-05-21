import type { AppState } from "@/contexts/AppDataContext";
import { normalizeAppState } from "@/data/appSeedBuilder";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import { reconcileAllEnquiryQuotationHistories } from "@/lib/enquiryQuotationHistory";
import { reconcileProjectAgentCommissionState } from "@/lib/projectStartContinuity";
import { reconcileBillingAmountReceivedState } from "@/lib/billingAmountReceivedContinuity";
import { syncBankReconciliationLinks } from "@/lib/bankReconciliationLink";
import { reconcileCustomersAutoArchive } from "@/domain/customer/customerArchive";
import { syncProjectsSiteReadinessFromChecklist } from "@/lib/siteReadinessFromChecklist";
import { syncSitesChecklistFromProjects } from "@/lib/siteChecklistNeedToGetSync";
import { buildBankReconciliationMatches } from "./ops_bankReconciliation";
import { reconcileEnquiriesConvertedOnProjectLink } from "@/lib/reconcileEnquiryConvertedOnProjectLink";
import { reconcileVendorBillInventoryReceipt } from "@/lib/vendorBillInventoryLinkage";
import { reconcileVendorBillVouchers } from "@/lib/vendorBillVoucherPosting";
import { reconcileProjectActorScopeSeed } from "@/lib/reconcileProjectActorScopeSeed";
import { reconcileChangeRequestDeltaInvoices } from "@/lib/reconcileChangeRequestDeltaInvoices";
import { reconcileIncGiverTransactions } from "@/lib/reconcileIncGiverTransactions";
import { reconcileProjectCustomerLinkage } from "@/lib/projectCustomerLinkage";
import { reconcileProgressReportTaskLinkage } from "@/lib/progressReportTaskContinuity";
import { reconcileDeletionRequests } from "@/lib/deletionRequestContinuity";
import { reconcileQuotationShareDetails } from "@/lib/quotationShareContinuity";

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
    sites: syncSitesChecklistFromProjects(s.projects, s.sites, s.inventoryItems),
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

  s = reconcileBillingAmountReceivedState(s);

  s = {
    ...s,
    customers: reconcileCustomersAutoArchive({
      customers: s.customers,
      projects: s.projects,
      quotations: s.quotations,
      enquiries: s.enquiries,
    }),
  };

  s = reconcileVendorBillInventoryReceipt(reconcileVendorBillVouchers(s));
  s = reconcileProjectActorScopeSeed(s);
  s = reconcileChangeRequestDeltaInvoices(s);

  s = reconcileIncGiverTransactions(s);

  return reconcileQuotationShareDetails(
    reconcileDeletionRequests(reconcileProgressReportTaskLinkage(reconcileProjectCustomerLinkage(s))),
  );
}

