/**
 * App state baseline and hydration normalization.
 * Business seed data is built separately — see `SEEDING DATA.md`.
 */
import { normalizeTools } from "@/lib/normalizeTools";
import { reconcileAllEnquiryQuotationHistories } from "@/lib/enquiryQuotationHistory";
import { migrateQuotationProjectLink } from "@/lib/quotationProjectLink";
import { normalizeBankReconciliationStatements } from "@/lib/bankReconciliationStatement";
import type { AppState } from "@/contexts/AppDataContext";
import type { Quotation } from "@/types/project";

/** True empty baseline — no business rows. */
export function buildEmptyAppState(): AppState {
  return {
    projects: [],
    quotations: [],
    customers: [],
    invoices: [],
    saleBills: [],
    expenses: [],
    incomes: [],
    payments: [],
    enquiries: [],
    agents: [],
    employees: [],
    teams: [],
    attendanceRecords: [],
    tasks: [],
    partners: [],
    partnerTransactions: [],
    loans: [],
    loanRepayments: [],
    vendors: [],
    inventoryItems: [],
    tools: [],
    vendorBills: [],
    vendorPayments: [],
    quotationTemplates: [],
    siteChecklistTemplates: [],
    servicePresets: [],
    quotationVisibilityPresets: [],
    sites: [],
    holidays: [],
    blockages: [],
    operationalTickets: [],
    projectTimelineByProjectId: {},
    clientPaymentRecords: [],
    ownerInvestments: [],
    employeePaidHolidays: [],
    auditLogs: [],
    accountingVouchers: [],
    accountingReviewQueue: [],
    agentCommissionPayments: [],
    employeePayrollRecords: [],
    employeeWalletLedger: [],
    solarPackagePresets: [],
    settingsTeamMembers: [],
    vendorshipCompanies: [],
    incGiverCompanies: [],
    incGiverTransactions: [],
    bankReconciliationStatements: [],
    materialReservations: [],
    scheduledInstallations: [],
    siteVisits: [],
    projectChangeRequests: [],
    materialDamageRecords: [],
    agentCommissionAccruals: [],
    procurementNeedLines: [],
  };
}

function ensureArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function ensureRecord<T extends Record<string, unknown>>(value: T | undefined | null): T {
  return value && typeof value === "object" && !Array.isArray(value) ? value : ({} as T);
}

/**
 * Migrate `convertedToProjectId` → `linkedProjectId` and drop the legacy field on hydrate.
 * Collapses legacy `"confirmed"` quotation status to `"approved"`.
 */
export function normalizeQuotations(quotations: Quotation[]): Quotation[] {
  return quotations.map((q) => {
    const collapsedStatus = q.status === ("confirmed" as Quotation["status"])
      ? ("approved" as Quotation["status"])
      : q.status;
    const approvedAt = q.approvedAt ?? q.confirmedAt;
    const withStatus = {
      ...q,
      status: collapsedStatus,
      approvedAt,
    };
    return migrateQuotationProjectLink(withStatus);
  });
}

/**
 * Merge persisted partial state with empty baseline so missing collections never crash hydrate.
 */
export function normalizeAppState(parsed: Partial<AppState> | null | undefined): AppState {
  const base = buildEmptyAppState();
  if (!parsed || typeof parsed !== "object") return base;

  const sites = ensureArray(parsed.sites);
  const employees = ensureArray(parsed.employees);
  const tools = normalizeTools(ensureArray(parsed.tools), sites, employees);

  return {
    ...base,
    ...parsed,
    projects: ensureArray(parsed.projects),
    quotations: normalizeQuotations(ensureArray(parsed.quotations)),
    customers: ensureArray(parsed.customers),
    invoices: ensureArray(parsed.invoices),
    saleBills: ensureArray(parsed.saleBills),
    expenses: ensureArray(parsed.expenses),
    incomes: ensureArray(parsed.incomes),
    payments: ensureArray(parsed.payments),
    enquiries: reconcileAllEnquiryQuotationHistories(
      ensureArray(parsed.enquiries),
      normalizeQuotations(ensureArray(parsed.quotations)),
    ),
    agents: ensureArray(parsed.agents),
    employees,
    teams: ensureArray(parsed.teams),
    attendanceRecords: ensureArray(parsed.attendanceRecords),
    tasks: ensureArray(parsed.tasks),
    partners: ensureArray(parsed.partners),
    partnerTransactions: ensureArray(parsed.partnerTransactions),
    loans: ensureArray(parsed.loans),
    loanRepayments: ensureArray(parsed.loanRepayments),
    vendors: ensureArray(parsed.vendors),
    inventoryItems: ensureArray(parsed.inventoryItems),
    tools,
    vendorBills: ensureArray(parsed.vendorBills),
    vendorPayments: ensureArray(parsed.vendorPayments),
    quotationTemplates: ensureArray(parsed.quotationTemplates),
    siteChecklistTemplates: ensureArray(parsed.siteChecklistTemplates),
    servicePresets: ensureArray(parsed.servicePresets),
    quotationVisibilityPresets: ensureArray(parsed.quotationVisibilityPresets),
    sites,
    holidays: ensureArray(parsed.holidays),
    blockages: ensureArray(parsed.blockages),
    operationalTickets: ensureArray(parsed.operationalTickets),
    projectTimelineByProjectId: ensureRecord(parsed.projectTimelineByProjectId),
    clientPaymentRecords: ensureArray(parsed.clientPaymentRecords),
    ownerInvestments: ensureArray(parsed.ownerInvestments),
    employeePaidHolidays: ensureArray(parsed.employeePaidHolidays),
    auditLogs: ensureArray(parsed.auditLogs),
    accountingVouchers: ensureArray(parsed.accountingVouchers),
    accountingReviewQueue: ensureArray(parsed.accountingReviewQueue),
    agentCommissionPayments: ensureArray(parsed.agentCommissionPayments),
    employeePayrollRecords: ensureArray(parsed.employeePayrollRecords),
    employeeWalletLedger: ensureArray(parsed.employeeWalletLedger),
    solarPackagePresets: ensureArray(parsed.solarPackagePresets),
    settingsTeamMembers: ensureArray(parsed.settingsTeamMembers),
    vendorshipCompanies: ensureArray(parsed.vendorshipCompanies),
    incGiverCompanies: ensureArray(parsed.incGiverCompanies),
    incGiverTransactions: ensureArray(parsed.incGiverTransactions),
    bankReconciliationStatements: normalizeBankReconciliationStatements(
      parsed.bankReconciliationStatements,
    ),
    materialReservations: ensureArray(parsed.materialReservations),
    scheduledInstallations: ensureArray(parsed.scheduledInstallations),
    siteVisits: ensureArray(parsed.siteVisits),
    projectChangeRequests: ensureArray(parsed.projectChangeRequests),
    materialDamageRecords: ensureArray(parsed.materialDamageRecords),
    agentCommissionAccruals: ensureArray(parsed.agentCommissionAccruals),
    procurementNeedLines: ensureArray(parsed.procurementNeedLines),
  };
}
