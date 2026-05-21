import type { AppState } from "@/contexts/AppDataContext";
import { applyStalledEnquiry } from "./stalledEnquiry";
import { applyApprovedQuotationOpenEnquiry } from "./approvedQuotationOpenEnquiry";
import { applyQuotationRevisionChain } from "./quotationRevisionChain";
import { applyPartialInvoice } from "./partialInvoice";
import { applyOverpaidInvoice } from "./overpaidInvoice";
import { applyVoidedDraftInvoice } from "./voidedDraftInvoice";
import { applyOnHoldBlockage } from "./onHoldBlockage";
import { applyDoubleBookInstall } from "./doubleBookInstall";
import { applyArchivedCustomer } from "./archivedCustomer";
import { applyHighValueInvoice } from "./highValueInvoice";
import { applyLoanRepaymentLinks } from "./loanRepaymentLinks";
import { applyBankReconMixed } from "./bankReconMixed";
import { applyNeedToGetDamage } from "./needToGetDamage";
import { applyRichTimeline } from "./richTimeline";
import { applyDirectExceptionProject } from "./directExceptionProject";
import { applyDirectExceptionProjectComplete } from "./directExceptionProjectComplete";
import { applyPartnerSplitPayment } from "./partnerSplitPayment";
import { applyPartnerSiteProjectIncome } from "./partnerSiteProjectIncome";
import { applyCustomerBulkInflow } from "./customerBulkInflow";
import { applyReopenLostEnquiry } from "./reopenLostEnquiry";
import { applyRescheduledTask } from "./rescheduledTask";
import { applyAttendanceInconsistency } from "./attendanceInconsistency";
import { applyLowStockProcurement } from "./lowStockProcurement";
import { applyVendorDelayBill } from "./vendorDelayBill";
import { applyProcurementNeedAcquired } from "./procurementNeedAcquired";
import { applyChangeRequestApproved } from "./changeRequestApproved";
import { applyChangeRequestDeltaPayment } from "./changeRequestDeltaPayment";
import { applyChangeRequestRejected } from "./changeRequestRejected";
import { applyChangeRequestScopeReduction } from "./changeRequestScopeReduction";
import { applyWorkStatusApprovalPending } from "./workStatusApprovalPending";
import { applyMaterialDamageThreshold } from "./materialDamageThreshold";
import { applyIncGivenNoDispatch } from "./incGivenNoDispatch";
import { applyVendorshipOnlyFee } from "./vendorshipOnlyFee";
import { applyDisputedVendorBill } from "./disputedVendorBill";
import { applyClosedProjectReopen } from "./closedProjectReopen";
import { applyStaleBlockage } from "./stalLeBlockage";
import { applyMultiAlertNotificationsRoute } from "./multiAlertNotificationsRoute";
import { applyEnquiryShareTrail } from "./enquiryShareTrail";
import { applyDeletionRequestSamples } from "./deletionRequestSamples";
import { applyFieldInstallationDemo } from "./fieldInstallationDemo";

const NARRATIVES = [
  applyStalledEnquiry,
  applyApprovedQuotationOpenEnquiry,
  applyQuotationRevisionChain,
  applyPartialInvoice,
  applyOverpaidInvoice,
  applyVoidedDraftInvoice,
  applyOnHoldBlockage,
  applyDoubleBookInstall,
  applyArchivedCustomer,
  applyHighValueInvoice,
  applyLoanRepaymentLinks,
  applyBankReconMixed,
  applyNeedToGetDamage,
  applyRichTimeline,
  applyDirectExceptionProject,
  applyDirectExceptionProjectComplete,
  applyPartnerSplitPayment,
  applyPartnerSiteProjectIncome,
  applyCustomerBulkInflow,
  applyReopenLostEnquiry,
  applyRescheduledTask,
  applyAttendanceInconsistency,
  applyLowStockProcurement,
  applyVendorDelayBill,
  applyProcurementNeedAcquired,
  applyChangeRequestApproved,
  applyChangeRequestDeltaPayment,
  applyChangeRequestRejected,
  applyChangeRequestScopeReduction,
  applyWorkStatusApprovalPending,
  applyMaterialDamageThreshold,
  applyIncGivenNoDispatch,
  applyVendorshipOnlyFee,
  applyDisputedVendorBill,
  applyClosedProjectReopen,
  applyStaleBlockage,
  applyMultiAlertNotificationsRoute,
  applyEnquiryShareTrail,
  applyDeletionRequestSamples,
  applyFieldInstallationDemo,
] as const;

/** Apply all narrative edge-case patches (Appendix I). */
export function applyAllNarratives(state: AppState): AppState {
  for (const apply of NARRATIVES) {
    apply(state);
  }
  return state;
}
