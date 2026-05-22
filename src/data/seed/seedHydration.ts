import type { AppState } from "@/contexts/AppDataContext";
import { normalizeAppState } from "@/data/appSeedBuilder";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import { reconcileAllEnquiryQuotationHistories } from "@/lib/enquiryQuotationHistory";
import { reconcileProjectAgentCommissionState } from "@/lib/projectStartContinuity";
import { reconcileBillingAmountReceivedState } from "@/lib/billingAmountReceivedContinuity";
import { reconcileProjectsTotalCost, reconcileCustomersPurchaseAggregates } from "@/lib/billingSelectors";
import { reconcileEmployeesAggregates } from "@/lib/employeeAggregates";
import { reconcileLoansOutstanding } from "@/lib/loanAggregates";
import { syncBankReconciliationLinks } from "@/lib/bankReconciliationLink";
import { reconcileCustomersAutoArchive } from "@/domain/customer/customerArchive";
import { syncProjectsSiteReadinessFromChecklist } from "@/lib/siteReadinessFromChecklist";
import { syncSitesChecklistFromProjects } from "@/lib/siteChecklistNeedToGetSync";
import { buildBankReconciliationMatches } from "./ops_bankReconciliation";
import { reconcileEnquiriesConvertedOnProjectLink } from "@/lib/reconcileEnquiryConvertedOnProjectLink";
import { reconcileVendorBillInventoryReceipt } from "@/lib/vendorBillInventoryLinkage";
import { reconcileVendorBillVouchers } from "@/lib/vendorBillVoucherPosting";
import { reconcileVendorPaymentVouchers } from "@/lib/vendorPaymentVoucherPosting";
import { reconcileProjectActorScopeSeed } from "@/lib/reconcileProjectActorScopeSeed";
import { reconcileQuotationSalesOwnerState } from "@/lib/reconcileQuotationSalesOwner";
import {
  reconcileApprovedQuotationCustomerIds,
  reconcileEnquiryQuotationCustomerLinks,
} from "@/lib/customerPipelineIdentity";
import { reconcileChangeRequestDeltaInvoices } from "@/lib/reconcileChangeRequestDeltaInvoices";
import { reconcileIncGiverTransactions } from "@/lib/reconcileIncGiverTransactions";
import { reconcileProjectCustomerLinkage } from "@/lib/projectCustomerLinkage";
import { reconcileProgressReportTaskLinkage } from "@/lib/progressReportTaskContinuity";
import { reconcileDeletionRequests } from "@/lib/deletionRequestContinuity";
import { reconcileQuotationShareDetails } from "@/lib/quotationShareContinuity";
import { reconcileProjectsLifecycleVocabulary } from "@/lib/projectListFilters";

/**
 * Appendix N — full hydration after seed assembly (steps 6–12 beyond boot pipeline).
 */
export function applySeedHydrationPipeline(state: AppState): AppState {
  let s = normalizeAppState(state);
  s = applyAppStateHydrationPipeline(s);

  const enquiries = reconcileAllEnquiryQuotationHistories(s.enquiries, s.quotations);
  s = { ...s, enquiries };
  s = reconcileApprovedQuotationCustomerIds(s);
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

  // BL-2: hydrate `project.totalCost` from materialized expenses so legacy
  // callers (calculateProjectProfit, projectBillingDrift, partner share math)
  // do not read profit = contractAmount when stored cost is unset.
  // BL-20: same treatment for customer aggregates so list/sort agree with audit.
  s = {
    ...s,
    projects: reconcileProjectsTotalCost(s.projects, s.expenses),
    customers: reconcileCustomersPurchaseAggregates(s.customers, s.invoices, s.saleBills),
    // BL-21: employee aggregates hydrated from primary slices.
    employees: reconcileEmployeesAggregates({
      employees: s.employees,
      attendanceRecords: s.attendanceRecords,
      walletLedger: s.employeeWalletLedger,
      payrollRecords: s.employeePayrollRecords,
    }),
    // BL-22: loan.outstanding hydrated from principal − Σ repayments.
    loans: reconcileLoansOutstanding(s.loans, s.loanRepayments),
  };

  s = {
    ...s,
    customers: reconcileCustomersAutoArchive({
      customers: s.customers,
      projects: s.projects,
      quotations: s.quotations,
      enquiries: s.enquiries,
    }),
  };

  s = reconcileVendorBillInventoryReceipt(
    reconcileVendorPaymentVouchers(reconcileVendorBillVouchers(s)),
  );
  s = reconcileProjectActorScopeSeed(s);
  s = reconcileQuotationSalesOwnerState(s);
  s = reconcileEnquiryQuotationCustomerLinks(s);
  s = reconcileChangeRequestDeltaInvoices(s);

  s = reconcileIncGiverTransactions(s);

  return reconcileProjectsLifecycleVocabulary(
    reconcileQuotationShareDetails(
      reconcileDeletionRequests(reconcileProgressReportTaskLinkage(reconcileProjectCustomerLinkage(s))),
    ),
  );
}

