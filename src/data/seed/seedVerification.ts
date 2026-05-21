import type { AppState } from "@/contexts/AppDataContext";

import type { AccountingEventType } from "@/application/services/VoucherPostingService";

import { USER_ROLES } from "@/domain/entities/identity";
import { DEMO_LOGIN_USERS } from "@/domain/demoCredentials";
import { serializeAppState } from "@/lib/appDataStorage";
import { buildCalendarEvents, type CalendarEventSource } from "@/lib/calendarSources";
import { deriveBusinessAlertDescriptors, type BusinessAlertKind } from "@/lib/businessAlerts";

import { findStaleClientPaymentLedgerLinkage } from "@/lib/clientPaymentReconciliation";
import { findStaleOpenEnquiriesAfterProjectWin } from "@/lib/enquiryPipelineContinuity";
import { findStaleChangeRequestBilling } from "@/lib/changeRequestPipelineContinuity";
import { findStaleVendorBillBooks } from "@/lib/vendorBillPipelineContinuity";
import { findStaleVendorPaymentBooks } from "@/lib/vendorPaymentPipelineContinuity";
import { findStaleVendorBillInventoryReceipt } from "@/lib/vendorBillInventoryLinkage";
import { findStaleProjectStartContinuity } from "@/lib/projectStartContinuity";
import { findStaleCprFifoVoidedAllocations } from "@/lib/cprFifoPipelineContinuity";
import { findStaleCustomerArchiveState } from "@/domain/customer/customerArchive";
import { findStaleSiteChecklistNeedToGetDrift } from "@/lib/siteChecklistNeedToGetSync";
import { findStaleProcurementNeedLines } from "@/lib/procurementNeedLineContinuity";
import { findStaleEnquiryAssigneeState } from "@/lib/enquiryAssignee";
import { findStaleProjectCustomerLinkage } from "@/lib/projectCustomerLinkage";
import { findStaleIncGiverLedger } from "@/lib/incGiverLedgerContinuity";
import {
  findStaleBillingAmountReceived,
  formatStaleBillingAmountReceivedErrors,
} from "@/lib/billingAmountReceivedContinuity";
import {
  findStaleProgressReportTaskLinkage,
  formatStaleProgressReportTaskErrors,
} from "@/lib/progressReportTaskContinuity";
import {
  findStaleDeletionRequests,
  formatStaleDeletionRequestErrors,
} from "@/lib/deletionRequestContinuity";
import {
  findStaleQuotationShareDetails,
  formatStaleQuotationShareErrors,
} from "@/lib/quotationShareContinuity";

import { SEED_COLLECTION_KEYS, type SeedProfile } from "./seedLayerOrder";
import { findSeedForeignKeyViolations, formatSeedForeignKeyErrors } from "./seedForeignKeyMatrix";

import { FULL_PROFILE_MINIMUMS, getMinimumFor } from "./seedVolumeTargets";



export interface SeedVerificationResult {

  ok: boolean;

  errors: string[];

  warnings: string[];

  jsonSizeBytes: number;

  collectionCounts: Record<string, number>;

}



const APP_ACTIONS = [

  "enquiry:create", "customer:create", "quotation:create", "quotation:confirm",

  "project:create_from_quote", "project:create_direct_exception", "project:update_commercial",

  "project:update_execution", "inventory:material_movement", "finance:create_invoice",

  "finance:record_payment", "finance:update_payment", "finance:delete_payment",

  "finance:record_expense_income", "finance:update_expense", "finance:delete_expense",

  "finance:update_income", "finance:delete_income", "partner:update", "partner:delete",

  "partner:add_transaction", "loan:update", "loan:delete", "loan:add_repayment",

  "vendor:record_bill", "vendor:record_payment", "vendor:update_payment", "vendor:delete_payment",

  "hr:release_payroll", "hr:record_wallet", "hr:mark_holiday", "hr:update_employee",

  "approval:resolve",

] as const;



const VOUCHER_EVENT_TYPES: AccountingEventType[] = [

  "InvoiceIssued", "PaymentReceived", "PurchaseBillBooked", "VendorPaymentRecorded",

  "ExpenseRecorded", "PayrollReleased", "PayrollPaid", "PartnerPayoutRecorded",

  "LoanReceived", "LoanRepayment",

];



const TRANSPORT_WORK_TYPES = [

  "Panel Transport", "Inverter Transport", "Structure Transport", "Material Transport",

];



/** Appendix J — FK matrix, FIFO, size budget, §4 volume floors. */

export function verifySeedState(state: AppState, profile: SeedProfile): SeedVerificationResult {

  const errors: string[] = [];

  const warnings: string[] = [];

  const collectionCounts: Record<string, number> = {};



  for (const key of SEED_COLLECTION_KEYS) {

    const val = state[key];

    collectionCounts[key] = Array.isArray(val) ? val.length : val && typeof val === "object" ? Object.keys(val).length : 0;

  }



  const ids = new Set<string>();

  for (const key of SEED_COLLECTION_KEYS) {

    const val = state[key];

    if (!Array.isArray(val)) continue;

    for (const row of val) {

      const id = (row as { id?: string }).id;

      if (!id) continue;

      if (ids.has(id)) errors.push(`Duplicate id: ${id} in ${key}`);

      ids.add(id);

    }

  }



  errors.push(...formatSeedForeignKeyErrors(findSeedForeignKeyViolations(state)));

  for (const stale of findStaleOpenEnquiriesAfterProjectWin(state)) {
    errors.push(
      `FC1: enquiry ${stale.enquiryId} (${stale.enquiryStatus}) still open after quotation ${stale.quotationId} (${stale.quotationStatus})`,
    );
  }

  for (const stale of findStaleChangeRequestBilling(state)) {
    errors.push(`FC3: change request ${stale.changeRequestId} — ${stale.reason}`);
  }

  for (const stale of findStaleVendorBillBooks(state)) {
    errors.push(`FC4: vendor bill ${stale.vendorBillId} (${stale.billNumber}) — ${stale.reason}`);
  }

  for (const stale of findStaleVendorPaymentBooks(state)) {
    errors.push(`FC4: vendor payment ${stale.vendorPaymentId} (vendor ${stale.vendorId}) — ${stale.reason}`);
  }

  for (const stale of findStaleVendorBillInventoryReceipt(state)) {
    errors.push(`ER6: vendor bill ${stale.vendorBillId} (${stale.billNumber}) — ${stale.reason}`);
  }

  for (const stale of findStaleProjectStartContinuity(state)) {
    errors.push(`FC5: project ${stale.projectId} — ${stale.reason}`);
  }

  for (const stale of findStaleCprFifoVoidedAllocations(state)) {
    errors.push(`FC6: invoice ${stale.invoiceId} (${stale.status}) — ${stale.reason}`);
  }

  for (const stale of findStaleCustomerArchiveState({
    customers: state.customers,
    projects: state.projects,
    quotations: state.quotations,
    enquiries: state.enquiries,
  })) {
    errors.push(`FC7: customer ${stale.customerId} — ${stale.reason}`);
  }

  for (const stale of findStaleSiteChecklistNeedToGetDrift(
    state.projects,
    state.sites,
    state.inventoryItems,
  )) {
    errors.push(`FC9: site ${stale.siteId} (project ${stale.projectId}) — ${stale.reason}`);
  }

  for (const stale of findStaleProcurementNeedLines(state)) {
    errors.push(`FC9: procurement line ${stale.lineKey} — ${stale.reason}`);
  }

  for (const stale of findStaleEnquiryAssigneeState(state.enquiries, state.settingsTeamMembers)) {
    errors.push(`ER1: enquiry ${stale.enquiryId} — ${stale.reason}`);
  }

  for (const stale of findStaleProjectCustomerLinkage(state)) {
    errors.push(`ER3: project ${stale.projectId} — ${stale.reason}`);
  }

  for (const stale of findStaleIncGiverLedger(state)) {
    errors.push(`ER4: ${stale.entity} ${stale.id} — ${stale.reason}`);
  }

  errors.push(...formatStaleBillingAmountReceivedErrors(findStaleBillingAmountReceived(state)));

  errors.push(...formatStaleProgressReportTaskErrors(findStaleProgressReportTaskLinkage(state)));
  errors.push(...formatStaleQuotationShareErrors(findStaleQuotationShareDetails(state)));
  errors.push(...formatStaleDeletionRequestErrors(findStaleDeletionRequests(state)));

  for (const stale of findStaleClientPaymentLedgerLinkage({
    clientPaymentRecords: state.clientPaymentRecords,
    payments: state.payments,
  })) {
    const label = stale.recordId ?? stale.paymentId ?? "unknown";
    errors.push(`FC10: client payment ${label} — ${stale.reason}`);
  }



  const json = serializeAppState(state);

  const jsonSizeBytes = new Blob([json]).size;

  if (jsonSizeBytes > 8 * 1024 * 1024) errors.push(`Seed JSON ${(jsonSizeBytes / 1024 / 1024).toFixed(2)} MB exceeds 8 MB hard limit`);

  else if (jsonSizeBytes > 5 * 1024 * 1024) warnings.push(`Seed JSON ${(jsonSizeBytes / 1024 / 1024).toFixed(2)} MB exceeds 5 MB target`);



  if (profile === "full") {

    for (const [key, min] of Object.entries(FULL_PROFILE_MINIMUMS)) {

      const count = collectionCounts[key] ?? 0;

      if (count < min) {

        errors.push(`${key}: ${count} rows (min ${min} for full profile)`);

      }

    }



    const transportTasks = state.tasks.filter((t) => t.workType.includes("Transport"));

    if (transportTasks.length < 30) {

      errors.push(`transport tasks: ${transportTasks.length} (min 30)`);

    }

    for (const wt of TRANSPORT_WORK_TYPES) {

      if (!transportTasks.some((t) => t.workType === wt)) {

        errors.push(`missing transport workType: ${wt}`);

      }

    }



    const overdueTasks = state.tasks.filter((t) => t.workDate && t.workDate < "2026-05-20" && t.status !== "done");

    if (overdueTasks.length < 15) {

      errors.push(`overdue tasks: ${overdueTasks.length} (min 15)`);

    }



    const workStatusTasks = state.tasks.filter((t) => t.workItems?.length);

    if (workStatusTasks.length < 40) {

      errors.push(`work-status tasks: ${workStatusTasks.length} (min 40)`);

    }



    const auditFields = new Set(state.auditLogs.map((l) => l.field).filter(Boolean));

    for (const action of APP_ACTIONS) {

      if (!auditFields.has(action)) {

        errors.push(`missing audit coverage for AppAction: ${action}`);

      }

    }



    const voucherCounts = state.accountingVouchers.reduce<Record<string, number>>((acc, v) => {
      const key = v.sourceEvent ?? "";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    for (const evt of VOUCHER_EVENT_TYPES) {
      const count = voucherCounts[evt] ?? 0;
      if (count < 2) {
        errors.push(`voucher event ${evt}: ${count} (min 2)`);
      }
    }



    const richTimelines = Object.values(state.projectTimelineByProjectId).filter(

      (tl) => tl.workStatusChecks?.length && tl.discomChecks?.length,

    );

    if (richTimelines.length < 3) {
      errors.push(`rich project timelines: ${richTimelines.length} (min 3)`);
    }

    for (const demo of DEMO_LOGIN_USERS) {
      if (!state.settingsTeamMembers.some((m) => m.id === demo.memberId)) {
        errors.push(`demo credential ${demo.memberId} missing from settingsTeamMembers`);
      }
    }
    for (const role of USER_ROLES) {
      const active = state.settingsTeamMembers.filter(
        (m) => m.role === role && (m.status === "Active" || m.status === "active"),
      );
      if (active.length < 1) {
        errors.push(`settingsTeamMembers: no Active member for role ${role}`);
      }
    }
    const instActive = state.settingsTeamMembers.filter(
      (m) => m.role === "installation_team" && (m.status === "Active" || m.status === "active"),
    );
    if (instActive.length < 3) {
      errors.push(`installation_team Active members: ${instActive.length} (min 3)`);
    }

    const calendarSources: CalendarEventSource[] = [
      "task", "installation", "enquiry", "invoice", "vendor-bill", "loan-emi", "site-visit", "milestone",
    ];
    const events = buildCalendarEvents({
      tasks: state.tasks,
      scheduledInstallations: state.scheduledInstallations,
      enquiries: state.enquiries,
      invoices: state.invoices,
      vendorBills: state.vendorBills,
      loans: state.loans,
      loanRepayments: state.loanRepayments,
      siteVisits: state.siteVisits,
      projects: state.projects,
    });
    for (const src of calendarSources) {
      if (!events.some((e) => e.source === src)) {
        errors.push(`calendar source missing events: ${src}`);
      }
    }

    const lowStock = state.inventoryItems.filter((i) => i.stock < i.minStock);
    const alerts = deriveBusinessAlertDescriptors({
      invoices: state.invoices,
      loans: state.loans,
      lowStockItems: lowStock,
      blockages: state.blockages,
      quotations: state.quotations,
      projects: state.projects,
      projectTimelineByProjectId: state.projectTimelineByProjectId,
      vendorBills: state.vendorBills,
    });
    const alertKinds: BusinessAlertKind[] = [
      "invoice", "loan", "stock", "blockage", "blockage_stale", "quotation", "vendor_bill", "approval",
    ];
    const kindsPresent = new Set(alerts.map((a) => a.kind));
    const missingAlertKinds = alertKinds.filter((k) => !kindsPresent.has(k));
    if (missingAlertKinds.length > 2) {
      errors.push(`business alert kinds missing: ${missingAlertKinds.join(", ")} (max 2 allowed)`);
    }

  } else {

    for (const key of Object.keys(FULL_PROFILE_MINIMUMS) as (keyof AppState)[]) {

      const min = getMinimumFor(profile, key);

      const count = collectionCounts[key] ?? 0;

      if (count < min) warnings.push(`${key}: ${count} rows (min ${min} for smoke profile)`);

    }

  }



  return {

    ok: errors.length === 0,

    errors,

    warnings,

    jsonSizeBytes,

    collectionCounts,

  };

}


