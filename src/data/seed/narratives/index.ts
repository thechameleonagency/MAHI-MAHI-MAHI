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
import { applyAccountingReviewQueueTraining } from "./accountingReviewQueueTraining";
import { seedIncludesProjects } from "../seedProjectPhase";

/** Narratives that only touch CRM, finance, HR, or inventory — safe with zero projects. */
const NON_PROJECT_NARRATIVES = [
  applyStalledEnquiry,
  applyApprovedQuotationOpenEnquiry,
  applyQuotationRevisionChain,
  applyVoidedDraftInvoice,
  applyLoanRepaymentLinks,
  applyBankReconMixed,
  applyCustomerBulkInflow,
  applyReopenLostEnquiry,
  applyRescheduledTask,
  applyAttendanceInconsistency,
  applyLowStockProcurement,
  applyVendorDelayBill,
  applyProcurementNeedAcquired,
  applyDisputedVendorBill,
  applyMultiAlertNotificationsRoute,
  applyEnquiryShareTrail,
  applyDeletionRequestSamples,
] as const;

/** Narratives that require seeded projects (disabled during Phase 0.2 clearance). */
const PROJECT_NARRATIVES = [
  applyPartialInvoice,
  applyOverpaidInvoice,
  applyOnHoldBlockage,
  applyDoubleBookInstall,
  applyArchivedCustomer,
  applyHighValueInvoice,
  applyNeedToGetDamage,
  applyRichTimeline,
  applyDirectExceptionProject,
  applyDirectExceptionProjectComplete,
  applyPartnerSplitPayment,
  applyPartnerSiteProjectIncome,
  applyChangeRequestApproved,
  applyChangeRequestDeltaPayment,
  applyChangeRequestRejected,
  applyChangeRequestScopeReduction,
  applyWorkStatusApprovalPending,
  applyMaterialDamageThreshold,
  applyIncGivenNoDispatch,
  applyVendorshipOnlyFee,
  applyClosedProjectReopen,
  applyStaleBlockage,
  applyFieldInstallationDemo,
  applyAccountingReviewQueueTraining,
] as const;

const NARRATIVES = [
  ...NON_PROJECT_NARRATIVES,
  ...(seedIncludesProjects() ? PROJECT_NARRATIVES : []),
] as const;

/** Apply all narrative edge-case patches (Appendix I). */
export function applyAllNarratives(state: AppState): AppState {
  for (const apply of NARRATIVES) {
    apply(state);
  }
  return state;
}
