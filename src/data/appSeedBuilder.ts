/**
 * Sequential app seed: empty baseline → layer-ordered hydration (see seedLayerOrder).
 * All runtime seed must flow through buildSequencedAppSeed() — no ad-hoc dummy arrays.
 */
import { reconcileAgentCommissionAccruals } from "@/lib/agentCommissionAccrualPolicy";
import { normalizeProject } from "@/lib/projectNormalize";
import {
  hydrateProjectLinkage,
  hydrateQuotationLinkage,
  hydrateInvoiceLinkage,
} from "@/domain/project/linkageMigration";
import { sanitizeBillingDocuments } from "@/lib/sanitizeBillingDocuments";
import { reconcileProjectsAmountInvoiced } from "@/lib/billingSelectors";
import { normalizeTools } from "@/lib/normalizeTools";
import { reconcileAllEnquiryQuotationHistories } from "@/lib/enquiryQuotationHistory";
import { migrateQuotationProjectLink } from "@/lib/quotationProjectLink";
import { DEFAULT_SETTINGS_TEAM_MEMBERS } from "@/types/project";
import type { AppState } from "@/contexts/AppDataContext";
import type { Quotation } from "@/types/project";
import type { Project, AttendanceRecord } from "@/types/project";
import type { Invoice } from "@/types/finance";
import type { VendorBill, VendorPayment } from "@/types/inventory";
import {
  seedCustomers,
  seedPartners,
  seedAgents,
  seedVendors,
  seedVendorshipCompanies,
  seedINCGiverCompanies,
  seedEmployees,
  seedTeams,
  seedEnquiries,
  seedQuotations,
  seedProjects,
  seedSites,
  seedAttendanceRecords,
  seedTasks,
  seedInventoryItems,
  seedTools,
  seedInvoices,
  seedPayments,
  seedExpenses,
  seedIncomes,
  seedLoans,
  seedLoanRepayments,
  seedPartnerTransactions,
  seedOwnerInvestments,
  seedEmployeePaidHolidays,
  seedAuditLogs,
  seedReviewQueue,
  seedVouchers,
  seedQuotationTemplates,
  seedSiteChecklistTemplates,
  seedQuotationVisibilityPresets,
  seedVendorBills,
  seedVendorPayments,
  seedEmployeePayrollRecords,
} from "@/data/seedData";
import {
  initialOperationalBlockages,
  initialOperationalTickets,
  initialProjectTimelineByProjectId,
} from "@/data/activeSitesSeed";
import { procurementNeedLineKey, type ProcurementNeedLine } from "@/types/operations";

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
 *
 * Also collapses the legacy `"confirmed"` quotation status back to `"approved"`.
 * The state machine (`quotationStateMachine.ts`) only knows the canonical statuses
 * `draft | sent | approved | rejected | withdrawn | converted_to_project`. An earlier
 * code path wrote `"confirmed"` as an intermediate state before project creation,
 * leaving any quotation that ever passed through that path unconvertable
 * (state machine has no transitions for the unknown key). This migration mirrors
 * the historical `confirmedAt` into `approvedAt` so the status-history block on
 * Quotations.tsx still reads correctly.
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
    bankReconciliationStatements: ensureArray(parsed.bankReconciliationStatements),
    materialReservations: ensureArray(parsed.materialReservations),
    scheduledInstallations: ensureArray(parsed.scheduledInstallations),
    siteVisits: ensureArray(parsed.siteVisits),
    projectChangeRequests: ensureArray(parsed.projectChangeRequests),
    materialDamageRecords: ensureArray(parsed.materialDamageRecords),
    agentCommissionAccruals: ensureArray(parsed.agentCommissionAccruals),
    procurementNeedLines: ensureArray(parsed.procurementNeedLines),
  };
}

/** Expand attendance to ~4 months of working days for active employees. */
function expandAttendance(base: AttendanceRecord[]): AttendanceRecord[] {
  const out = [...base];
  const employees = ["EMP001", "EMP002", "EMP003", "EMP004", "EMP005", "EMP006", "EMP007", "EMP008"];
  const sites = ["Office", "PROJ-2026-002", "PROJ-2026-004", "PROJ-2026-007", "PROJ-2026-108"];
  let seq = 100;
  for (let d = 1; d <= 28; d++) {
    const day = String(d).padStart(2, "0");
    const date = `2026-04-${day}`;
    if (date > "2026-04-30") break;
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      if (d % 7 === 0 && i % 3 === 0) continue;
      out.push({
        id: `ATT-GEN-${seq++}`,
        employeeId: emp,
        date,
        status: d % 11 === 0 ? "half-day" : "present",
        sites: [sites[i % sites.length]],
        notes: "",
      });
    }
  }
  return out;
}

/** Sample vendor bills so last-purchase-rate and vendor pages have history. */
function buildSeedVendorBills(): VendorBill[] {
  if (seedVendorBills.length > 0) return seedVendorBills;
  return [
    {
      id: "VB-SEED-001",
      vendorId: "V001",
      vendorName: "Waaree Energies Ltd",
      billNumber: "WAR/2026/0412",
      billDate: "2026-04-12",
      dueDate: "2026-04-26",
      items: [
        {
          description: "Waaree 540W Mono PERC",
          name: "Waaree 540W Mono PERC",
          quantity: 40,
          rate: 13000,
          amount: 520000,
          inventoryItemId: "INV001",
        },
      ],
      subtotal: 520000,
      gst: 93600,
      total: 613600,
      amountPaid: 300000,
      status: "partial",
      projectId: "PROJ-2026-002",
    },
    {
      id: "VB-SEED-002",
      vendorId: "V002",
      vendorName: "Growatt New Energy",
      billNumber: "GRW/2026/0420",
      billDate: "2026-04-20",
      dueDate: "2026-05-04",
      items: [
        {
          description: "Growatt 5kW On-grid Inverter",
          quantity: 2,
          rate: 38000,
          amount: 76000,
          inventoryItemId: "INV002",
        },
      ],
      subtotal: 76000,
      gst: 13680,
      total: 89680,
      amountPaid: 89680,
      status: "paid",
      projectId: "PROJ-2026-001",
    },
    {
      id: "VB-SEED-003",
      vendorId: "V003",
      vendorName: "Polycab India Ltd",
      billNumber: "POL/2026/0501",
      billDate: "2026-05-01",
      dueDate: "2026-05-15",
      items: [
        {
          description: "DC Cable 4 sq.mm (100m drum)",
          quantity: 4,
          rate: 3500,
          amount: 14000,
          inventoryItemId: "INV007",
        },
      ],
      subtotal: 14000,
      gst: 2520,
      total: 16520,
      amountPaid: 0,
      status: "pending",
      projectId: "PROJ-2026-003",
    },
  ];
}

function buildSeedVendorPayments(bills: VendorBill[]): VendorPayment[] {
  if (seedVendorPayments.length > 0) return seedVendorPayments;
  return [
    {
      id: "VP-SEED-001",
      vendorId: "V001",
      vendorName: "Waaree Energies Ltd",
      billId: "VB-SEED-001",
      billNumber: "WAR/2026/0412",
      date: "2026-04-18",
      amount: 300000,
      paymentMode: "Bank Transfer",
      notes: "Advance against panel dispatch",
    },
    {
      id: "VP-SEED-002",
      vendorId: "V002",
      vendorName: "Growatt New Energy",
      billId: "VB-SEED-002",
      billNumber: "GRW/2026/0420",
      date: "2026-04-25",
      amount: 89680,
      paymentMode: "NEFT",
    },
  ];
}

/** Procurement lines assigned to vendors for Need-to-Get / vendor acquire tab. */
function buildProcurementNeedLines(): ProcurementNeedLine[] {
  const lines: ProcurementNeedLine[] = [];
  const samples = [
    {
      projectId: "PROJ-2026-002",
      siteId: "SITE001",
      materialId: "INV001",
      materialName: "Waaree 540W Mono PERC",
      qty: 12,
      needBy: "2026-05-09",
      vendorId: "V001",
      rate: 13000,
    },
    {
      projectId: "PROJ-2026-003",
      siteId: "SITE003",
      materialId: "INV002",
      materialName: "Growatt 5kW On-grid Inverter",
      qty: 1,
      needBy: "2026-05-12",
      vendorId: "V002",
      rate: 38000,
    },
    {
      projectId: "PROJ-2026-007",
      siteId: "SITE004",
      materialId: "INV007",
      materialName: "DC Cable 4 sq.mm (100m drum)",
      qty: 2,
      needBy: "2026-05-08",
      vendorId: "V003",
      rate: 3500,
    },
  ];
  samples.forEach((s, i) => {
    const lineKey = procurementNeedLineKey({
      projectId: s.projectId,
      siteId: s.siteId,
      materialId: s.materialId,
      needByDate: s.needBy,
    });
    lines.push({
      id: `PNL-SEED-${i + 1}`,
      lineKey,
      projectId: s.projectId,
      siteId: s.siteId,
      materialId: s.materialId,
      materialName: s.materialName,
      qtyNeeded: s.qty,
      needByDate: s.needBy,
      lastPurchaseRate: s.rate,
      vendorId: s.vendorId,
      status: "pending",
    });
  });
  return lines;
}

/**
 * Build full app state in dependency order (L0 → L11).
 * Starts from empty, applies each seed layer sequentially.
 */
export function buildSequencedAppSeed(): AppState {
  const empty = buildEmptyAppState();

  // L0 — settings placeholders
  let state: AppState = {
    ...empty,
    settingsTeamMembers: structuredClone(DEFAULT_SETTINGS_TEAM_MEMBERS),
    solarPackagePresets: [],
    holidays: [],
  };

  // L1 — masters / catalog
  state = {
    ...state,
    inventoryItems: [...seedInventoryItems],
    tools: [...seedTools],
    quotationTemplates: [...seedQuotationTemplates],
    siteChecklistTemplates: [...seedSiteChecklistTemplates],
    quotationVisibilityPresets: [...seedQuotationVisibilityPresets],
    servicePresets: [],
  };

  // L2 — partners, agents, vendors
  state = {
    ...state,
    partners: [...seedPartners],
    agents: [...seedAgents],
    vendors: [...seedVendors],
    vendorshipCompanies: [...seedVendorshipCompanies],
    incGiverCompanies: [...seedINCGiverCompanies],
  };

  // L3 — customers
  state = { ...state, customers: [...seedCustomers] };

  // L4 — employees, teams
  state = {
    ...state,
    employees: [...seedEmployees],
    teams: [...seedTeams],
  };

  // L8 — enquiries + quotations (before projects that link to them)
  state = {
    ...state,
    enquiries: reconcileAllEnquiryQuotationHistories([...seedEnquiries], [...seedQuotations]),
    quotations: [...seedQuotations],
  };

  // L5 — projects + sites
  const projects = seedProjects.map((p) => normalizeProject(p));
  state = {
    ...state,
    projects,
    sites: [...seedSites],
    blockages: structuredClone(initialOperationalBlockages),
    operationalTickets: structuredClone(initialOperationalTickets),
    projectTimelineByProjectId: structuredClone(initialProjectTimelineByProjectId),
  };

  // L6 — attendance + tasks
  state = {
    ...state,
    attendanceRecords: expandAttendance(seedAttendanceRecords),
    tasks: [...seedTasks],
  };

  // L7 — inventory movements implied in site checklists / project materialsSent (seed on projects)

  // L9 — finance documents
  const vendorBills = buildSeedVendorBills();
  const vendorPayments = buildSeedVendorPayments(vendorBills);
  state = {
    ...state,
    invoices: [...seedInvoices],
    saleBills: [],
    payments: [...seedPayments],
    expenses: [...seedExpenses],
    incomes: [...seedIncomes],
    vendorBills,
    vendorPayments,
    clientPaymentRecords: [],
  };

  // L10 — loans, partner cash
  state = {
    ...state,
    loans: [...seedLoans],
    loanRepayments: [...seedLoanRepayments],
    partnerTransactions: [...seedPartnerTransactions],
    ownerInvestments: [...seedOwnerInvestments],
    employeePaidHolidays: [...seedEmployeePaidHolidays],
    employeePayrollRecords: [...seedEmployeePayrollRecords],
  };

  // L11 — audit
  state = {
    ...state,
    auditLogs: [...seedAuditLogs],
    accountingReviewQueue: [...seedReviewQueue],
    accountingVouchers: [...seedVouchers],
    procurementNeedLines: buildProcurementNeedLines(),
  };

  // Hydrate cross-refs + derived billing metrics
  const customers = state.customers;
  const hydratedProjects = hydrateProjectLinkage(state.projects, customers);
  const quotations = hydrateQuotationLinkage(state.quotations, customers);
  const invoices = sanitizeBillingDocuments(
    hydrateInvoiceLinkage(state.invoices, customers, hydratedProjects),
    "invoices",
  );
  const saleBills = sanitizeBillingDocuments(
    hydrateInvoiceLinkage(state.saleBills, customers, hydratedProjects),
    "saleBills",
  );
  const projectsWithBilling = reconcileProjectsAmountInvoiced(
    hydratedProjects,
    invoices,
    saleBills,
  );

  const agentCommissionAccruals = reconcileAgentCommissionAccruals({
    accruals: state.agentCommissionAccruals ?? [],
    quotations,
    projects: projectsWithBilling,
    agents: state.agents,
  });

  return {
    ...state,
    projects: projectsWithBilling,
    quotations,
    invoices,
    saleBills,
    agentCommissionAccruals,
  };
}
