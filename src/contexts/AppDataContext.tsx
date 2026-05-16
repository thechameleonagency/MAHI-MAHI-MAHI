import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import type {
  Project,
  Employee,
  AttendanceRecord,
  Quotation,
  InventoryItem,
  InventoryMovementRecord,
  Tool,
  ToolMovementRecord,
  Vendor,
  ServicePreset as _ProjectServicePreset,
  Task,
  QuotationVisibilityPreset,
  Enquiry,
  SiteRecord,
  Team,
  ProjectTeamAssignment,
  SolarPackagePreset,
  SettingsTeamMember,
} from "@/types/project";
import { DEFAULT_SOLAR_PACKAGE_PRESETS, DEFAULT_SETTINGS_TEAM_MEMBERS } from "@/types/project";
import type { QuotationTemplate, SiteChecklistTemplate } from "@/types/templates";
import type { Customer, Invoice, Expense, Income, Partner, PartnerTransaction, Loan, LoanRepayment, Payment, ServicePreset, OwnerInvestment, EmployeePaidHoliday, Agent, AuditLogEntry, AccountingReviewQueueItem, AccountingVoucher, AgentCommissionPayment, EmployeePayrollRecord, EmployeeWalletLedgerEntry, VendorshipCompany, INCGiverCompany } from "@/types/finance";
import type { Blockage, Ticket, ProjectTimelineStatus, ClientPaymentRecord } from "@/types/blockage";
import {
  dummyProjects,
  dummyEmployees,
  dummyQuotations,
  dummyCustomers,
  dummyInvoices,
  dummySaleBills,
  dummyExpenses,
  dummyPartners,
  dummyPartnerTransactions,
  dummyLoans,
  dummyLoanRepayments,
  dummyPayments,
  dummyVendors,
  dummyAttendanceRecords,
  dummySites,
  dummyHolidays,
  dummyServicePresets,
  dummyTasks,
  dummyEmployeePaidHolidays,
  dummyOwnerInvestments,
  _dummyDeletionRequests,
  dummyClientPaymentRecords,
  dummyEnquiries,
  dummyQuotationVisibilityPresets,
  dummyAgents,
  dummyIncomes,
  dummyTeams,
  dummyAuditLogs,
  dummyVendorshipCompanies,
  dummyINCGiverCompanies,
} from "@/data/dummyData";
import {
  initialOperationalBlockages,
  initialOperationalTickets,
  initialProjectTimelineByProjectId,
} from "@/data/activeSitesSeed";
import { findUnknownChecklistInventoryIds, siteWithChecklistFromTemplate, stripOrphanChecklistInventoryRefs } from "@/lib/siteChecklist";
import { auditFieldDiff } from "@/lib/auditFieldDiff";
import { dummyQuotationTemplates, dummySiteChecklistTemplates } from "@/data/templatesData";
import { dummyInventoryItems, dummyTools, dummyVendorBills, dummyVendorPayments, type VendorBill, type VendorPayment } from "@/data/inventoryData";
import { canTransitionEnquiryStatus, type EnquiryStatus } from "@/domain/stateMachines/enquiryStateMachine";
import { canTransitionQuotationStatus, type QuotationStatus } from "@/domain/stateMachines/quotationStateMachine";
import { canTransitionProjectStatus, type ProjectLifecycleStatus } from "@/domain/stateMachines/projectStateMachine";
import type { AppAction } from "@/domain/policies/permissionMatrix";
import { UnifiedFinanceValidationService, type ExpenseTaxonomy } from "@/application/services/UnifiedFinanceValidationService";
import { VoucherPostingService, type AccountingEventType, type PostingResult } from "@/application/services/VoucherPostingService";
import type { MovementType } from "@/application/services/InventoryMovementService";
import { toast } from "@/hooks/use-toast";
import { useFoundation } from "@/app/providers/FoundationProvider";
import { CREATE_ENQUIRY_COMMAND, UPDATE_ENQUIRY_STATUS_COMMAND, CONVERT_ENQUIRY_COMMAND } from "@/application/commands/enquiry/registerEnquiryCommands";
import {
  CREATE_QUOTATION_COMMAND,
  TRANSITION_QUOTATION_STATUS_COMMAND,
  UPDATE_QUOTATION_COMMAND,
} from "@/application/commands/quotation/registerQuotationCommands";
import { createCommercialSnapshot } from "@/domain/quotation/applyQuotationPatch";
import {
  CREATE_PROJECT_FROM_QUOTATION_COMMAND,
  CREATE_PROJECT_INTAKE_COMMAND,
  CREATE_DIRECT_PROJECT_EXCEPTION_COMMAND,
} from "@/application/commands/project/registerProjectCommands";
import { normalizeProject } from "@/lib/projectNormalize";
import {
  MATERIAL_MOVEMENT_AT_PROJECT_COMMAND,
  WAREHOUSE_INVENTORY_MOVEMENT_COMMAND,
} from "@/application/commands/inventory/registerInventoryCommands";
import type { WarehouseOnlyMovementType } from "@/application/commands/inventory/registerInventoryCommands";
import type { ProjectIntakePayload } from "@/application/services/ProjectKindService";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import {
  hydrateInvoiceLinkage,
  hydrateProjectLinkage,
  hydrateQuotationLinkage,
} from "@/domain/project/linkageMigration";
import { ProjectInvariantService } from "@/domain/project/ProjectInvariantService";
import type { SiteChecklistPreset } from "@/data/masters";

// ============ APP STATE INTERFACE ============
interface AppState {
  // Core entities
  projects: Project[];
  quotations: Quotation[];
  customers: Customer[];
  invoices: Invoice[];
  saleBills: Invoice[];
  expenses: Expense[];
  incomes: Income[];
  payments: Payment[];
  enquiries: Enquiry[];
  agents: Agent[];
  
  // HR entities
  employees: Employee[];
  teams: Team[];
  attendanceRecords: AttendanceRecord[];
  tasks: Task[];
  
  // Finance entities
  partners: Partner[];
  partnerTransactions: PartnerTransaction[];
  loans: Loan[];
  loanRepayments: LoanRepayment[];
  vendors: Vendor[];
  
  // Inventory entities
  inventoryItems: InventoryItem[];
  tools: Tool[];
  
  // Vendor bills and payments
  vendorBills: VendorBill[];
  vendorPayments: VendorPayment[];
  
  // Presets
  /** Master quotation boilerplates (materials + services). */
  quotationTemplates: QuotationTemplate[];
  /**
   * Site dispatch templates — materials and optional rich solar-package BOM.
   * Replaces the legacy `inventoryPresets` collection after the Templates merge.
   */
  siteChecklistTemplates: SiteChecklistTemplate[];
  servicePresets: ServicePreset[];
  quotationVisibilityPresets: QuotationVisibilityPreset[];
  
  // Sites and holidays
  sites: SiteRecord[];
  holidays: Date[];

  /** Operations: blockages / tickets / per-project timelines (same source as Active Sites + Progress Report). */
  blockages: Blockage[];
  operationalTickets: Ticket[];
  projectTimelineByProjectId: Record<string, ProjectTimelineStatus>;
  clientPaymentRecords: ClientPaymentRecord[];
  
  // Owner investments
  ownerInvestments: OwnerInvestment[];
  
  // Employee paid holidays (1 per employee per month)
  employeePaidHolidays: EmployeePaidHoliday[];
  
  // Audit logs
  auditLogs: AuditLogEntry[];
  accountingVouchers: AccountingVoucher[];
  accountingReviewQueue: AccountingReviewQueueItem[];

  // Agent commission payments
  agentCommissionPayments: AgentCommissionPayment[];

  // Employee payroll records
  employeePayrollRecords: EmployeePayrollRecord[];
  /** Advances / recoveries separate from monthly payroll run (F62). */
  employeeWalletLedger: EmployeeWalletLedgerEntry[];

  /** Settings → Solar package presets (Settings page). */
  solarPackagePresets: SolarPackagePreset[];
  /** Settings → Team directory rows (Settings page). */
  settingsTeamMembers: SettingsTeamMember[];

  // New entity types
  vendorshipCompanies: VendorshipCompany[];
  incGiverCompanies: INCGiverCompany[];

  /** B13: persisted uploaded statements for the BankReconciliation modal (prototype). */
  bankReconciliationStatements: unknown[];
}

// ============ CONTEXT TYPE ============
interface AppDataContextType extends AppState {
  // Projects CRUD
  createProjectFromConfirmedQuotation: (project: Project) => Promise<{ ok: boolean; error?: string; projectId?: string }>;
  /** Create with optional quotation (SOLO_EPC requires quotationId). */
  createProjectIntake: (params: {
    project: Project;
    intake: ProjectIntakePayload;
    quotationId?: string;
  }) => Promise<{ ok: boolean; error?: string; projectId?: string }>;
  createDirectProjectException: (params: {
    projectName: string;
    intake: ProjectIntakePayload;
    reason: string;
    customerId?: string;
  }) => Promise<{ ok: boolean; error?: string; projectId?: string }>;
  updateProject: (id: string, updates: Partial<Project>) => void;
  recordProjectMaterialMovement: (input: {
    projectId: string;
    itemId: number;
    movementType: MovementType;
    quantity: number;
    allowNegativeSiteBalanceOverride?: boolean;
    baselineLineId?: string;
    /** Idempotency / dedupe key for materials issued/returned/scrapped in batched flows. */
    clientRequestId?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  recordWarehouseInventoryMovement: (input: {
    itemId: number;
    movementType: WarehouseOnlyMovementType;
    quantity: number;
  }) => Promise<{ ok: boolean; error?: string }>;
  deleteProject: (id: string) => void;
  getProjectById: (id: string) => Project | undefined;
  
  // Quotations CRUD
  addQuotation: (quotation: Quotation) => Promise<{ ok: boolean; error?: string }>;
  updateQuotation: (id: string, updates: Partial<Quotation>) => Promise<{ ok: boolean; error?: string }>;
  deleteQuotation: (id: string) => void;
  getQuotationById: (id: string) => Quotation | undefined;
  getApprovedQuotations: () => Quotation[];
  getProjectEligibleQuotations: () => Quotation[];
  transitionQuotationStatus: (id: string, nextStatus: QuotationStatus) => Promise<{ ok: boolean; error?: string }>;
  reviseQuotation: (id: string) => Promise<{ ok: boolean; revisedQuotationId?: string; error?: string }>;
  
  // Customers CRUD
  addCustomer: (customer: Customer) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  getCustomerById: (id: string) => Customer | undefined;
  
  // Invoices CRUD
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  getInvoiceById: (id: string) => Invoice | undefined;
  
  // Sale Bills CRUD
  addSaleBill: (saleBill: Invoice) => void;
  updateSaleBill: (id: string, updates: Partial<Invoice>) => void;
  deleteSaleBill: (id: string) => void;
  
  // Expenses CRUD
  addExpense: (expense: Expense) => boolean;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  getExpensesByProject: (projectId: string) => Expense[];
  getExpensesByEmployee: (employeeId: string) => Expense[];
  getExpensesByCategory: (category: string) => Expense[];
  getExpensesByMainCategory: (mainCategory: string) => Expense[];
  
  // Incomes CRUD
  addIncome: (income: Income) => void;
  updateIncome: (id: string, updates: Partial<Income>) => void;
  deleteIncome: (id: string) => void;
  getIncomesByProject: (projectId: string) => Income[];
  getIncomesByPartner: (partnerId: string) => Income[];
  getIncomesByEmployee: (employeeId: string) => Income[];
  
  // Payments CRUD
  addPayment: (payment: Payment) => void;
  updatePayment: (id: string, updates: Partial<Payment>) => void;
  deletePayment: (id: string) => void;
  
  // Employees CRUD
  addEmployee: (employee: Employee) => void;
  updateEmployee: (id: number, updates: Partial<Employee>) => void;
  deleteEmployee: (id: number) => void;
  getEmployeeById: (id: number) => Employee | undefined;
  
  // Attendance CRUD
  addAttendanceRecord: (record: AttendanceRecord) => void;
  updateAttendanceRecord: (id: string, updates: Partial<AttendanceRecord>) => void;
  getAttendanceByDate: (date: string) => AttendanceRecord[];
  getAttendanceByEmployee: (employeeId: number) => AttendanceRecord[];
  
  // Teams CRUD
  addTeam: (team: Team) => void;
  updateTeam: (id: string, updates: Partial<Team>) => void;
  deleteTeam: (id: string) => void;
  getTeamById: (id: string) => Team | undefined;
  assignTeamToProject: (projectId: string, teamAssignment: ProjectTeamAssignment) => void;
  removeTeamFromProject: (projectId: string, assignmentId: string) => void;
  
  // Partners CRUD
  addPartner: (partner: Partner) => void;
  updatePartner: (id: string, updates: Partial<Partner>) => void;
  deletePartner: (id: string) => void;
  getPartnerById: (id: string) => Partner | undefined;
  
  // Partner Transactions CRUD
  addPartnerTransaction: (transaction: PartnerTransaction) => void;
  updatePartnerTransaction: (id: string, updates: Partial<PartnerTransaction>) => void;
  deletePartnerTransaction: (id: string) => void;
  getTransactionsByPartner: (partnerId: string) => PartnerTransaction[];

  // Loans CRUD
  addLoan: (loan: Loan) => void;
  updateLoan: (id: string, updates: Partial<Loan>) => void;
  deleteLoan: (id: string) => void;

  // Loan Repayments CRUD
  addLoanRepayment: (repayment: LoanRepayment) => void;
  updateLoanRepayment: (id: string, updates: Partial<LoanRepayment>) => void;
  deleteLoanRepayment: (id: string) => void;
  getRepaymentsByLoan: (loanId: string) => LoanRepayment[];

  // Vendors CRUD
  addVendor: (vendor: Vendor) => void;
  updateVendor: (id: number, updates: Partial<Vendor>) => void;
  deleteVendor: (id: number) => void;

  // Vendor Bills CRUD
  addVendorBill: (bill: VendorBill) => void;
  updateVendorBill: (id: string, updates: Partial<VendorBill>) => void;
  deleteVendorBill: (id: string) => void;
  getVendorBillsByVendor: (vendorId: number) => VendorBill[];

  // Vendor Payments CRUD
  addVendorPayment: (payment: VendorPayment) => void;
  updateVendorPayment: (id: string, updates: Partial<VendorPayment>) => void;
  deleteVendorPayment: (id: string) => void;
  getVendorPaymentsByVendor: (vendorId: number) => VendorPayment[];
  
  // Service Presets CRUD
  addServicePreset: (preset: ServicePreset) => void;
  updateServicePreset: (id: string, updates: Partial<ServicePreset>) => void;
  deleteServicePreset: (id: string) => void;
  getServicePresetById: (id: string) => ServicePreset | undefined;
  
  // Quotation Visibility Presets CRUD
  addQuotationVisibilityPreset: (preset: QuotationVisibilityPreset) => void;
  updateQuotationVisibilityPreset: (id: string, updates: Partial<QuotationVisibilityPreset>) => void;
  deleteQuotationVisibilityPreset: (id: string) => void;
  replaceSolarPackagePresets: (presets: SolarPackagePreset[]) => void;
  replaceSettingsTeamMembers: (members: SettingsTeamMember[]) => void;

  // Tasks CRUD
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  getTaskById: (id: string) => Task | undefined;
  getTasksByEmployee: (employeeId: number) => Task[];
  getTasksByDate: (date: string) => Task[];
  
  // Enquiries CRUD
  addEnquiry: (enquiry: Enquiry) => Promise<{ ok: boolean; error?: string }>;
  updateEnquiry: (id: string, updates: Partial<Enquiry>) => void;
  deleteEnquiry: (id: string) => void;
  getEnquiryById: (id: string) => Enquiry | undefined;
  transitionEnquiryStatus: (id: string, nextStatus: EnquiryStatus, reason?: string) => Promise<{ ok: boolean; error?: string }>;
  convertEnquiryToCustomer: (id: string) => Promise<{ ok: boolean; customerId?: string; error?: string }>;
  
  // Agents CRUD
  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  deleteAgent: (id: string) => void;
  getAgentById: (id: string) => Agent | undefined;
  
  // Sites CRUD
  addSite: (site: SiteRecord) => void;
  addQuotationTemplate: (template: QuotationTemplate) => void;
  updateQuotationTemplate: (id: string, updates: Partial<QuotationTemplate>) => void;
  deleteQuotationTemplate: (id: string) => void;
  addSiteChecklistTemplate: (template: SiteChecklistTemplate) => void;
  updateSiteChecklistTemplate: (id: string, updates: Partial<SiteChecklistTemplate>) => void;
  deleteSiteChecklistTemplate: (id: string) => void;
  getQuotationTemplateById: (id: string) => QuotationTemplate | undefined;
  getSiteChecklistTemplateById: (id: string) => SiteChecklistTemplate | undefined;
  getSitesByProjectId: (projectId: string) => SiteRecord[];
  getTasksByProjectId: (projectId: string) => Task[];
  getBlockagesByProjectId: (projectId: string) => Blockage[];
  getOperationalTicketsByProjectId: (projectId: string) => Ticket[];
  getProjectTimelineForProject: (projectId: string) => ProjectTimelineStatus | null;
  updateBlockage: (id: string, updates: Partial<Blockage>) => void;
  addBlockage: (partial: Omit<Blockage, "id" | "createdAt">) => void;
  resolveBlockage: (input: {
    id: string;
    resolvedAt: string;
    resolvedBy: string;
    resolvedByName: string;
    notesAppend?: string;
  }) => void;
  updateOperationalTicket: (id: string, updates: Partial<Ticket>) => void;
  addOperationalTicket: (ticket: Ticket) => void;
  updateProjectTimelineForProject: (projectId: string, updates: Partial<ProjectTimelineStatus>) => void;
  getClientPaymentRecordsByProject: (projectId: string) => ClientPaymentRecord[];
  addClientPaymentRecord: (record: ClientPaymentRecord) => void;
  updateSite: (siteNumericId: number, updates: Partial<SiteRecord>) => void;
  applySiteChecklistFromTemplate: (
    projectId: string,
    siteNumericId: number,
    template: SiteChecklistTemplate | SiteChecklistPreset,
  ) => { ok: boolean; error?: string };
  dispatchSiteMaterial: (
    projectId: string,
    siteNumericId: number,
    checklistLineId: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  
  // Holidays CRUD
  addHoliday: (date: Date) => void;
  removeHoliday: (date: Date) => void;
  
  // Owner Investments CRUD
  addOwnerInvestment: (investment: OwnerInvestment) => void;
  getOwnerInvestmentsByProject: (projectId: string) => OwnerInvestment[];
  getGeneralOwnerInvestments: () => OwnerInvestment[];
  
  // Employee Paid Holidays CRUD
  addEmployeePaidHoliday: (holiday: EmployeePaidHoliday) => void;
  getEmployeePaidHolidaysByMonth: (employeeId: number, month: string) => EmployeePaidHoliday[];
  hasEmployeePaidHolidayInMonth: (employeeId: number, month: string) => boolean;
  
  // Relationship helpers
  getProjectQuotation: (projectId: string) => Quotation | undefined;
  getProjectInvoices: (projectId: string) => Invoice[];
  getProjectExpenses: (projectId: string) => Expense[];
  getProjectPayments: (projectId: string) => Payment[];
  getCustomerInvoices: (customerId: string) => Invoice[];
  getCustomerSaleBills: (customerId: string) => Invoice[];
  
  // Audit Logs
  auditLogs: AuditLogEntry[];
  addAuditLog: (entry: AuditLogEntry) => void;
  accountingVouchers: AccountingVoucher[];
  accountingReviewQueue: AccountingReviewQueueItem[];
  dismissAccountingReviewItem: (queueItemId: string) => void;
  retryAccountingReviewPosting: (queueItemId: string) => { ok: boolean; error?: string };

  // Inventory Items CRUD
  addInventoryItem: (item: InventoryItem) => void;
  updateInventoryItem: (id: number, updates: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: number) => void;
  issueItemToSite: (itemId: number, siteId: string, siteName: string, qty: number, date: string, employeeId?: string, employeeName?: string) => void;
  returnItemFromSite: (itemId: number, siteId: string, siteName: string, qty: number, date: string, condition?: string, notes?: string) => void;

  // Tools CRUD
  addTool: (tool: Tool) => void;
  updateTool: (id: number, updates: Partial<Tool>) => void;
  deleteTool: (id: number) => void;
  issueTool: (
    toolId: number,
    siteId: string,
    siteName: string,
    date: string,
    employeeId?: string,
    employeeName?: string,
    handoffNotes?: string,
  ) => void;
  returnTool: (toolId: number, condition: Tool["condition"], date: string, notes?: string) => void;

  // Agent Commission Payments
  addAgentCommissionPayment: (payment: AgentCommissionPayment) => void;
  getCommissionPaymentsByAgent: (agentId: string) => AgentCommissionPayment[];

  // Employee Payroll Records
  addEmployeePayrollRecord: (record: EmployeePayrollRecord) => void;
  getPayrollByEmployee: (employeeId: number) => EmployeePayrollRecord[];
  addEmployeeWalletLedgerEntry: (
    entry: Omit<EmployeeWalletLedgerEntry, "id" | "createdAt">,
  ) => { ok: boolean; error?: string };
  getEmployeeWalletLedger: (employeeId?: number) => EmployeeWalletLedgerEntry[];

  // Derived: low stock items
  lowStockItems: InventoryItem[];

  // Vendorship Companies CRUD
  addVendorshipCompany: (company: VendorshipCompany) => void;
  updateVendorshipCompany: (id: string, updates: Partial<VendorshipCompany>) => void;
  deleteVendorshipCompany: (id: string) => void;
  getVendorshipCompanyById: (id: string) => VendorshipCompany | undefined;

  // INC Giver Companies CRUD
  addINCGiverCompany: (company: INCGiverCompany) => void;
  updateINCGiverCompany: (id: string, updates: Partial<INCGiverCompany>) => void;
  deleteINCGiverCompany: (id: string) => void;
  getINCGiverCompanyById: (id: string) => INCGiverCompany | undefined;

  // Bank reconciliation (prototype: persist uploaded statements across modal sessions; B13)
  bankReconciliationStatements: unknown[];
  setBankReconciliationStatements: (statements: unknown[]) => void;

  // Utility functions
  generateId: (prefix: string) => string;
  resetToDefaults: () => void;
  /** Returns true when the current role is allowed to perform the action. Use to disable/hide UI elements. */
  canDo: (action: AppAction) => boolean;
}

const STORAGE_KEY = "mahi_solar_app_data";
// Bump this whenever a stored shape gains a new required collection. Older payloads will fall
// back to seed data instead of crashing the app on hydrate. Persisted payloads are written with
// the matching version key so a refresh after a redeploy does not throw away the demo.
const STORAGE_VERSION = 2;
const STORAGE_VERSION_KEY = "mahi_solar_app_data_version";
const DEFAULT_ACTOR_ROLE = "admin";
const toProjectLifecycleStatus = (lifecycleStatus: Project["lifecycleStatus"]): ProjectLifecycleStatus => {
  switch (lifecycleStatus) {
    case "Draft": return "New";
    case "Active": return "In Progress";
    case "On Hold": return "On Hold";
    case "Completed": return "Completed";
    default: return "In Progress";
  }
};

/** Per-entity merge: seed defaults + persisted rows so new schema fields survive K5. */
function mergeIdArray<T extends { id: string | number }>(seed: T[], stored: T[] | undefined): T[] {
  if (!stored?.length) return [...seed];
  const storedById = new Map(stored.map((p) => [String(p.id), p]));
  const seedIds = new Set(seed.map((s) => String(s.id)));
  const merged: T[] = [];
  for (const s of seed) {
    const p = storedById.get(String(s.id));
    merged.push(p ? ({ ...s, ...p } as T) : s);
  }
  for (const p of stored) {
    if (!seedIds.has(String(p.id))) merged.push(p);
  }
  return merged;
}

function mergeTimelineMaps(
  seed: Record<string, ProjectTimelineStatus>,
  stored: Record<string, ProjectTimelineStatus> | undefined,
): Record<string, ProjectTimelineStatus> {
  if (!stored) return { ...seed };
  const out: Record<string, ProjectTimelineStatus> = { ...seed };
  for (const [k, v] of Object.entries(stored)) {
    const base = seed[k];
    out[k] = base && v ? ({ ...base, ...v } as ProjectTimelineStatus) : v;
  }
  return out;
}

function mergePersistedWithSeed(baseSeed: AppState, parsed: AppState): AppState {
  return {
    ...baseSeed,
    ...parsed,
    projects: mergeIdArray(baseSeed.projects, parsed.projects),
    quotations: mergeIdArray(baseSeed.quotations, parsed.quotations),
    customers: mergeIdArray(baseSeed.customers, parsed.customers),
    invoices: mergeIdArray(baseSeed.invoices, parsed.invoices),
    saleBills: mergeIdArray(baseSeed.saleBills, parsed.saleBills),
    expenses: mergeIdArray(baseSeed.expenses, parsed.expenses),
    incomes: mergeIdArray(baseSeed.incomes, parsed.incomes),
    payments: mergeIdArray(baseSeed.payments, parsed.payments),
    enquiries: mergeIdArray(baseSeed.enquiries, parsed.enquiries),
    agents: mergeIdArray(baseSeed.agents, parsed.agents),
    employees: mergeIdArray(baseSeed.employees, parsed.employees),
    teams: mergeIdArray(baseSeed.teams, parsed.teams),
    attendanceRecords: mergeIdArray(baseSeed.attendanceRecords, parsed.attendanceRecords),
    tasks: mergeIdArray(baseSeed.tasks, parsed.tasks),
    partners: mergeIdArray(baseSeed.partners, parsed.partners),
    partnerTransactions: mergeIdArray(baseSeed.partnerTransactions, parsed.partnerTransactions),
    loans: mergeIdArray(baseSeed.loans, parsed.loans),
    loanRepayments: mergeIdArray(baseSeed.loanRepayments, parsed.loanRepayments),
    vendors: mergeIdArray(baseSeed.vendors, parsed.vendors),
    inventoryItems: mergeIdArray(baseSeed.inventoryItems, parsed.inventoryItems),
    tools: mergeIdArray(baseSeed.tools, parsed.tools),
    vendorBills: mergeIdArray(baseSeed.vendorBills, parsed.vendorBills),
    vendorPayments: mergeIdArray(baseSeed.vendorPayments, parsed.vendorPayments),
    quotationTemplates: mergeIdArray(baseSeed.quotationTemplates, parsed.quotationTemplates),
    siteChecklistTemplates: mergeIdArray(baseSeed.siteChecklistTemplates, parsed.siteChecklistTemplates),
    servicePresets: mergeIdArray(baseSeed.servicePresets, parsed.servicePresets),
    quotationVisibilityPresets: mergeIdArray(
      baseSeed.quotationVisibilityPresets,
      parsed.quotationVisibilityPresets,
    ),
    sites: mergeIdArray(baseSeed.sites, parsed.sites),
    holidays: parsed.holidays?.length ? parsed.holidays : baseSeed.holidays,
    blockages: mergeIdArray(baseSeed.blockages, parsed.blockages),
    operationalTickets: mergeIdArray(baseSeed.operationalTickets, parsed.operationalTickets),
    projectTimelineByProjectId: mergeTimelineMaps(
      baseSeed.projectTimelineByProjectId,
      parsed.projectTimelineByProjectId,
    ),
    clientPaymentRecords: mergeIdArray(baseSeed.clientPaymentRecords, parsed.clientPaymentRecords),
    ownerInvestments: mergeIdArray(baseSeed.ownerInvestments, parsed.ownerInvestments),
    employeePaidHolidays: mergeIdArray(baseSeed.employeePaidHolidays, parsed.employeePaidHolidays),
    auditLogs: mergeIdArray(baseSeed.auditLogs, parsed.auditLogs),
    accountingVouchers: mergeIdArray(baseSeed.accountingVouchers, parsed.accountingVouchers),
    accountingReviewQueue: mergeIdArray(baseSeed.accountingReviewQueue, parsed.accountingReviewQueue),
    agentCommissionPayments: mergeIdArray(
      baseSeed.agentCommissionPayments,
      parsed.agentCommissionPayments,
    ),
    employeePayrollRecords: mergeIdArray(
      baseSeed.employeePayrollRecords,
      parsed.employeePayrollRecords,
    ),
    employeeWalletLedger: mergeIdArray(
      baseSeed.employeeWalletLedger ?? [],
      parsed.employeeWalletLedger ?? [],
    ),
    solarPackagePresets: mergeIdArray(baseSeed.solarPackagePresets, parsed.solarPackagePresets),
    settingsTeamMembers: mergeIdArray(baseSeed.settingsTeamMembers, parsed.settingsTeamMembers),
    vendorshipCompanies: mergeIdArray(baseSeed.vendorshipCompanies, parsed.vendorshipCompanies ?? []),
    incGiverCompanies: mergeIdArray(baseSeed.incGiverCompanies, parsed.incGiverCompanies ?? []),
  };
}

/** Append invoice/sale-bill id to project linkage; `invoiceId` mirrors latest document for legacy readers. */
function mergeProjectInvoiceRef(project: Project, docId: string): Pick<Project, "invoiceIds" | "invoiceId"> {
  const prev = project.invoiceIds?.length
    ? [...project.invoiceIds]
    : project.invoiceId
      ? [project.invoiceId]
      : [];
  const invoiceIds = prev.includes(docId) ? prev : [...prev, docId];
  return { invoiceIds, invoiceId: docId };
}

function stripProjectInvoiceRef(project: Project, docId: string): Pick<Project, "invoiceIds" | "invoiceId"> {
  const prev = project.invoiceIds?.length
    ? [...project.invoiceIds]
    : project.invoiceId
      ? [project.invoiceId]
      : [];
  const next = prev.filter((x) => x !== docId);
  return {
    invoiceIds: next.length ? next : undefined,
    invoiceId: next.length ? next[next.length - 1] : undefined,
  };
}

function deriveProjectBillingMetrics(projects: Project[], invoices: Invoice[], saleBills: Invoice[]): Project[] {
  const totals = new Map<string, number>();
  for (const invoice of [...invoices, ...saleBills]) {
    if (!invoice.projectId) continue;
    const current = totals.get(invoice.projectId) ?? 0;
    totals.set(invoice.projectId, current + (invoice.total ?? 0));
  }

  return projects.map((project) => ({
    ...project,
    amountInvoiced: totals.get(project.id) ?? project.amountInvoiced ?? 0,
  }));
}

// ============ INITIAL STATE ============
function buildAppStateFromSeeds(): AppState {
  const customers = dummyCustomers;
  const projects = hydrateProjectLinkage(dummyProjects, customers);
  const quotations = hydrateQuotationLinkage(dummyQuotations, customers);
  const invoices = hydrateInvoiceLinkage(dummyInvoices, customers, projects);
  const saleBills = hydrateInvoiceLinkage(dummySaleBills, customers, projects);
  const projectsWithBilling = deriveProjectBillingMetrics(projects, invoices, saleBills);
  return {
    projects: projectsWithBilling,
    quotations,
    customers,
    invoices,
    saleBills,
    expenses: dummyExpenses,
    incomes: dummyIncomes,
    payments: dummyPayments,
    enquiries: dummyEnquiries,
    agents: dummyAgents,
    employees: dummyEmployees,
    attendanceRecords: dummyAttendanceRecords,
    tasks: dummyTasks,
    partners: dummyPartners,
    partnerTransactions: dummyPartnerTransactions,
    loans: dummyLoans,
    loanRepayments: dummyLoanRepayments,
    vendors: dummyVendors,
    inventoryItems: dummyInventoryItems,
    tools: dummyTools,
    vendorBills: dummyVendorBills,
    vendorPayments: dummyVendorPayments,
    quotationTemplates: dummyQuotationTemplates,
    siteChecklistTemplates: dummySiteChecklistTemplates,
    servicePresets: dummyServicePresets,
    quotationVisibilityPresets: dummyQuotationVisibilityPresets,
    sites: dummySites,
    holidays: dummyHolidays,
    blockages: structuredClone(initialOperationalBlockages),
    operationalTickets: structuredClone(initialOperationalTickets),
    projectTimelineByProjectId: structuredClone(initialProjectTimelineByProjectId),
    clientPaymentRecords: structuredClone(dummyClientPaymentRecords),
    ownerInvestments: dummyOwnerInvestments,
    employeePaidHolidays: dummyEmployeePaidHolidays,
    teams: dummyTeams,
    auditLogs: dummyAuditLogs,
    accountingVouchers: [],
    accountingReviewQueue: [],
    agentCommissionPayments: [],
    employeePayrollRecords: [],
    employeeWalletLedger: [],
    solarPackagePresets: structuredClone(DEFAULT_SOLAR_PACKAGE_PRESETS),
    settingsTeamMembers: structuredClone(DEFAULT_SETTINGS_TEAM_MEMBERS),
    vendorshipCompanies: dummyVendorshipCompanies,
    incGiverCompanies: dummyINCGiverCompanies,
    bankReconciliationStatements: [],
  };
}

// ============ PERSISTENCE HELPERS ============
const serializeState = (s: AppState): string => {
  return JSON.stringify(s, (key, value) => {
    if (value instanceof Date) return { __date__: value.toISOString() };
    return value;
  });
};

const deserializeState = (json: string): AppState | null => {
  try {
    return JSON.parse(json, (key, value) => {
      if (value && typeof value === "object" && value.__date__) return new Date(value.__date__);
      return value;
    });
  } catch {
    return null;
  }
};

const getInitialState = (): AppState => {
  const baseSeed = buildAppStateFromSeeds();
  try {
    const storedVersion = Number(localStorage.getItem(STORAGE_VERSION_KEY) ?? "0");
    if (storedVersion !== STORAGE_VERSION) {
      // Shape changed since the payload was written; throw it away so the demo doesn't crash.
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_VERSION_KEY, String(STORAGE_VERSION));
      return baseSeed;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = deserializeState(stored);
      if (parsed) {
        const merged = mergePersistedWithSeed(baseSeed, parsed);
        const customers = merged.customers;
        const projects = hydrateProjectLinkage(merged.projects, customers);
        const quotations = hydrateQuotationLinkage(merged.quotations, customers);
        const invoices = hydrateInvoiceLinkage(merged.invoices, customers, projects);
        const saleBills = hydrateInvoiceLinkage(merged.saleBills, customers, projects);
        const reconciledProjects = deriveProjectBillingMetrics(projects, invoices, saleBills);
        return {
          ...merged,
          projects: reconciledProjects,
          quotations,
          invoices,
          saleBills,
        };
      }
    }
  } catch (e) {
    console.warn("Failed to load persisted state:", e);
  }
  return baseSeed;
};

// ============ CONTEXT CREATION ============
const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

// ============ PROVIDER COMPONENT ============
export const AppDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(getInitialState);
  const { permissionService, commandBus, repositories } = useFoundation();
  const { currentRole } = useAppSession();
  const financeValidationService = useMemo(() => new UnifiedFinanceValidationService(), []);
  const voucherPostingService = useMemo(() => new VoucherPostingService(), []);
  const projectInvariantService = useMemo(() => new ProjectInvariantService(), []);
  const actorRole = currentRole ?? DEFAULT_ACTOR_ROLE;

  const canPerformActionOrWarn = useCallback((action: AppAction): boolean => {
    const allowed = permissionService.canPerformAction(actorRole, action);
    if (!allowed) {
      toast({
        title: "Action not permitted",
        description: `Your role (${actorRole}) does not have permission for: ${action}`,
        variant: "destructive",
      });
    }
    return allowed;
  }, [actorRole, permissionService]);

  const canDo = useCallback(
    (action: AppAction) => permissionService.canPerformAction(actorRole, action),
    [actorRole, permissionService]
  );
  
  // ============ PERSIST STATE TO LOCALSTORAGE ============
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serializeState(state));
      localStorage.setItem(STORAGE_VERSION_KEY, String(STORAGE_VERSION));
    } catch (e) {
      console.warn("Failed to persist state:", e);
    }
  }, [state]);

  // C3 one-shot reconciler: ensure every existing clientPaymentRecord has a matching Payment row.
  // Idempotent by composite key (`cpr:<recordId>`) so the second mount is a no-op.
  useEffect(() => {
    setState((prev) => {
      const missing: Payment[] = [];
      for (const r of prev.clientPaymentRecords) {
        const compositeKey = `cpr:${r.id}`;
        const exists = prev.payments.some((p) => p.id === compositeKey || p.reference === compositeKey);
        if (!exists) {
          missing.push({
            id: compositeKey,
            date: r.date,
            amount: r.amount,
            direction: "in",
            paymentMode: r.paymentMode,
            counterpartyType: "customer",
            counterpartyId: r.projectId,
            counterpartyName: "",
            projectId: r.projectId,
            notes: r.notes ?? `Client payment (record ${r.id}) — reconciled on boot`,
            reference: compositeKey,
          });
        }
      }
      if (missing.length === 0) return prev;
      return { ...prev, payments: [...missing, ...prev.payments] };
    });
    // Run exactly once on mount.
  }, []);
  
  // Generate unique IDs
  const generateId = useCallback((prefix: string) => {
    return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`.toUpperCase();
  }, []);

  const createAuditEntry = useCallback((
    action: AuditLogEntry["action"],
    entityType: string,
    entityId: string,
    entityName: string,
    field?: string,
    oldValue?: string,
    newValue?: string,
  ): AuditLogEntry => ({
    id: generateId("LOG"),
    timestamp: new Date().toISOString(),
    userId: "prototype-user",
    userName: actorRole,
    action,
    entityType,
    entityId,
    entityName,
    field,
    oldValue,
    newValue,
  }), [actorRole, generateId]);

  const createReviewQueueItem = useCallback((
    postingResult: PostingResult,
    projectId?: string,
  ): AccountingReviewQueueItem | null => {
    if (postingResult.ok) return null;
    const { reason, event } = (postingResult as Exclude<PostingResult, { ok: true }>).reviewQueueItem;
    return {
      id: generateId("ARQ"),
      reason,
      eventType: event.type,
      sourceDocumentId: event.sourceDocumentId,
      projectId,
      amount: event.amount,
      createdAt: new Date().toISOString(),
    };
  }, [generateId]);
  
  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(buildAppStateFromSeeds());
  }, []);
  
  // ============ PROJECTS CRUD ============
  const createProjectFromConfirmedQuotation = useCallback(
    async (project: Project): Promise<{ ok: boolean; error?: string; projectId?: string }> => {
      if (!project.quotationId) {
        return { ok: false, error: "Project must reference a quotation" };
      }
      if (!permissionService.canPerformAction(actorRole, "project:create_from_quote")) {
        return { ok: false, error: `Role ${actorRole} cannot create projects from quotations` };
      }
      const stubIntake: ProjectIntakePayload = {
        kind: project.projectKind ?? "SOLO_EPC",
        parties: { customer: project.client, vendorOrDiscom: "TBD" },
        commercial: {
          contractAmount: project.contractAmount,
          paymentType: (project.paymentType as string) || "cash",
          internalCostEstimate: 0,
        },
      };
      repositories.projectRepository.replaceAll(state.projects);
      repositories.quotationRepository.replaceAll(state.quotations);
      try {
        const result = await commandBus.execute<{ projectId: string }>({
          type: CREATE_PROJECT_FROM_QUOTATION_COMMAND,
          actorUserId: "prototype-user",
          actorRole,
          payload: {
            quotationId: project.quotationId,
            projectName: project.name,
            intake: stubIntake,
            project,
          },
        });
        if (!result.ok) {
          return { ok: false, error: (result as { message: string }).message };
        }
        const projectId = result.result?.projectId;
        setState((prev) => ({
          ...prev,
          projects: (repositories.projectRepository.getAll() as Project[]).map(normalizeProject),
          quotations: repositories.quotationRepository.getAll() as Quotation[],
          auditLogs: repositories.auditRepository.getAll() as AuditLogEntry[],
        }));
        return { ok: true, projectId };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Command failed";
        return { ok: false, error: message };
      }
    },
    [actorRole, commandBus, permissionService, repositories, state.projects, state.quotations],
  );

  const createProjectIntake = useCallback(
    async (params: {
      project: Project;
      intake: ProjectIntakePayload;
      quotationId?: string;
    }): Promise<{ ok: boolean; error?: string; projectId?: string }> => {
      if (!permissionService.canPerformAction(actorRole, "project:create_from_quote")) {
        return { ok: false, error: `Role ${actorRole} cannot create projects` };
      }
      repositories.projectRepository.replaceAll(state.projects);
      repositories.quotationRepository.replaceAll(state.quotations);
      try {
        const result = await commandBus.execute<{ projectId: string }>({
          type: CREATE_PROJECT_INTAKE_COMMAND,
          actorUserId: "prototype-user",
          actorRole,
          payload: params,
        });
        if (!result.ok) {
          return { ok: false, error: (result as { message: string }).message };
        }
        const projectId = result.result?.projectId;
        setState((prev) => ({
          ...prev,
          projects: (repositories.projectRepository.getAll() as Project[]).map(normalizeProject),
          quotations: repositories.quotationRepository.getAll() as Quotation[],
          auditLogs: repositories.auditRepository.getAll() as AuditLogEntry[],
        }));
        return { ok: true, projectId };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Command failed";
        return { ok: false, error: message };
      }
    },
    [actorRole, commandBus, permissionService, repositories, state.projects, state.quotations],
  );

  const createDirectProjectException = useCallback(
    async (params: {
      projectName: string;
      intake: ProjectIntakePayload;
      reason: string;
      customerId?: string;
    }): Promise<{ ok: boolean; error?: string; projectId?: string }> => {
      repositories.projectRepository.replaceAll(state.projects);
      repositories.quotationRepository.replaceAll(state.quotations);
      try {
        const result = await commandBus.execute<{ projectId: string }>({
          type: CREATE_DIRECT_PROJECT_EXCEPTION_COMMAND,
          actorUserId: "prototype-user",
          actorRole,
          payload: params,
        });
        if (!result.ok) {
          return { ok: false, error: (result as { message: string }).message };
        }
        const projectId = result.result?.projectId;
        setState((prev) => ({
          ...prev,
          projects: (repositories.projectRepository.getAll() as Project[]).map(normalizeProject),
          quotations: repositories.quotationRepository.getAll() as Quotation[],
          auditLogs: repositories.auditRepository.getAll() as AuditLogEntry[],
        }));
        return { ok: true, projectId };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Command failed";
        return { ok: false, error: message };
      }
    },
    [actorRole, commandBus, permissionService, repositories, state.projects, state.quotations],
  );

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    const action = updates.contractAmount !== undefined || updates.totalCost !== undefined
      ? "project:update_commercial"
      : "project:update_execution";
    if (!canPerformActionOrWarn(action)) {
      return;
    }
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((project) => {
        if (project.id !== id) {
          return project;
        }

        const nextLifecycleStatus = updates.lifecycleStatus;
        if (nextLifecycleStatus && nextLifecycleStatus !== project.lifecycleStatus) {
          const currentLifecycle = toProjectLifecycleStatus(project.lifecycleStatus);
          const nextLifecycle = toProjectLifecycleStatus(nextLifecycleStatus);
          const canTransition = canTransitionProjectStatus(currentLifecycle, nextLifecycle, actorRole);
          if (!canTransition) {
            toast({
              title: "Status transition not allowed",
              description: `Cannot move project from "${project.lifecycleStatus}" to "${nextLifecycleStatus}" with your current role.`,
              variant: "destructive",
            });
            return project;
          }
          if (nextLifecycleStatus === "Completed") {
            const { ok, reasons } = projectInvariantService.canMarkCompleted(id, {
              projects: prev.projects,
              invoices: prev.invoices,
              saleBills: prev.saleBills,
              expenses: prev.expenses,
              incomes: prev.incomes,
              blockages: prev.blockages,
              accountingReviewQueue: prev.accountingReviewQueue,
              attendanceRecords: prev.attendanceRecords,
              partnerTransactions: prev.partnerTransactions,
            });
            if (!ok) {
              toast({
                title: "Cannot mark project completed",
                description: reasons.slice(0, 4).join(" "),
                variant: "destructive",
              });
              return project;
            }
          }
        }

        return normalizeProject({ ...project, ...updates });
      }),
    }));
  }, [actorRole, canPerformActionOrWarn, projectInvariantService]);

  const recordProjectMaterialMovement = useCallback(
    async (input: {
      projectId: string;
      itemId: number;
      movementType: MovementType;
      quantity: number;
      allowNegativeSiteBalanceOverride?: boolean;
      baselineLineId?: string;
      clientRequestId?: string;
    }): Promise<{ ok: boolean; error?: string }> => {
      if (!permissionService.canPerformAction(actorRole, "inventory:material_movement")) {
        return { ok: false, error: "Permission denied for inventory movement" };
      }

      repositories.projectRepository.replaceAll(state.projects);
      repositories.inventoryItemRepository.replaceAll(state.inventoryItems);

      try {
        const result = await commandBus.execute({
          type: MATERIAL_MOVEMENT_AT_PROJECT_COMMAND,
          actorUserId: "prototype-user",
          actorRole,
          payload: {
            projectId: input.projectId,
            itemId: input.itemId,
            movementType: input.movementType,
            quantity: input.quantity,
            allowNegativeSiteBalanceOverride: input.allowNegativeSiteBalanceOverride,
            baselineLineId: input.baselineLineId,
            clientRequestId: input.clientRequestId,
          },
        });
        if (!result.ok) {
          return { ok: false, error: (result as { message: string }).message };
        }
        setState((prev) => ({
          ...prev,
          projects: (repositories.projectRepository.getAll() as Project[]).map(normalizeProject),
          inventoryItems: repositories.inventoryItemRepository.getAll() as InventoryItem[],
          auditLogs: repositories.auditRepository.getAll() as AuditLogEntry[],
        }));
        return { ok: true };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Command failed";
        return { ok: false, error: message };
      }
    },
    [actorRole, commandBus, permissionService, repositories, state.inventoryItems, state.projects],
  );

  const recordWarehouseInventoryMovement = useCallback(
    async (input: {
      itemId: number;
      movementType: WarehouseOnlyMovementType;
      quantity: number;
    }): Promise<{ ok: boolean; error?: string }> => {
      if (!permissionService.canPerformAction(actorRole, "inventory:material_movement")) {
        return { ok: false, error: "Permission denied for inventory movement" };
      }
      repositories.inventoryItemRepository.replaceAll(state.inventoryItems);
      try {
        const result = await commandBus.execute({
          type: WAREHOUSE_INVENTORY_MOVEMENT_COMMAND,
          actorUserId: "prototype-user",
          actorRole,
          payload: input,
        });
        if (!result.ok) {
          return { ok: false, error: (result as { message: string }).message };
        }
        setState((prev) => ({
          ...prev,
          inventoryItems: repositories.inventoryItemRepository.getAll() as InventoryItem[],
          auditLogs: repositories.auditRepository.getAll() as AuditLogEntry[],
        }));
        return { ok: true };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Command failed";
        return { ok: false, error: message };
      }
    },
    [actorRole, commandBus, permissionService, repositories, state.inventoryItems],
  );
  
  const deleteProject = useCallback((id: string) => {
    setState((prev) => {
      const { [id]: _removed, ...restTimelines } = prev.projectTimelineByProjectId;
      return {
        ...prev,
        projects: prev.projects.filter((p) => p.id !== id),
        invoices: prev.invoices.filter((i) => i.projectId !== id),
        saleBills: prev.saleBills.filter((s) => s.projectId !== id),
        tasks: prev.tasks.filter((t) => t.projectId !== id),
        expenses: prev.expenses.filter((e) => e.projectId !== id),
        incomes: prev.incomes.filter((i) => i.projectId !== id),
        payments: prev.payments.filter((p) => p.projectId !== id),
        sites: prev.sites.filter((s) => s.projectId !== id),
        blockages: prev.blockages.filter((b) => b.projectId !== id),
        operationalTickets: prev.operationalTickets.filter((t) => t.projectId !== id),
        clientPaymentRecords: prev.clientPaymentRecords.filter((c) => c.projectId !== id),
        projectTimelineByProjectId: restTimelines,
      };
    });
  }, []);
  
  const getProjectById = useCallback((id: string) => {
    const t = id.trim();
    const raw = state.projects.find((p) => p.id === t || p.id.toLowerCase() === t.toLowerCase());
    return raw ? normalizeProject(raw) : undefined;
  }, [state.projects]);
  
  // ============ QUOTATIONS CRUD ============
  const addQuotation = useCallback(
    async (quotation: Quotation): Promise<{ ok: boolean; error?: string }> => {
      if (!permissionService.canPerformAction(actorRole, "quotation:create")) {
        return { ok: false, error: `Role ${actorRole} is not allowed to create quotations` };
      }
      repositories.quotationRepository.replaceAll(state.quotations);
      try {
        const result = await commandBus.execute({
          type: CREATE_QUOTATION_COMMAND,
          actorUserId: "prototype-user",
          actorRole,
          payload: { quotation },
        });
        if (!result.ok) {
          return { ok: false, error: (result as { message: string }).message };
        }
        setState((prev) => ({
          ...prev,
          quotations: repositories.quotationRepository.getAll() as Quotation[],
          enquiries: repositories.enquiryRepository.getAll() as Enquiry[],
          auditLogs: repositories.auditRepository.getAll() as AuditLogEntry[],
        }));
        return { ok: true };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Command failed";
        return { ok: false, error: message };
      }
    },
    [actorRole, commandBus, permissionService, repositories, state.quotations],
  );
  
  const updateQuotation = useCallback(
    async (id: string, updates: Partial<Quotation>): Promise<{ ok: boolean; error?: string }> => {
      if (!permissionService.canPerformAction(actorRole, "quotation:create")) {
        return { ok: false, error: `Role ${actorRole} is not allowed to update quotations` };
      }
      repositories.quotationRepository.replaceAll(state.quotations);
      try {
        const result = await commandBus.execute({
          type: UPDATE_QUOTATION_COMMAND,
          actorUserId: "prototype-user",
          actorRole,
          payload: { quotationId: id, updates },
        });
        if (!result.ok) {
          return { ok: false, error: (result as { message: string }).message };
        }
        setState((prev) => ({
          ...prev,
          quotations: repositories.quotationRepository.getAll() as Quotation[],
          auditLogs: repositories.auditRepository.getAll() as AuditLogEntry[],
        }));
        return { ok: true };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Command failed";
        return { ok: false, error: message };
      }
    },
    [actorRole, commandBus, permissionService, repositories, state.quotations],
  );
  
  const deleteQuotation = useCallback((id: string) => {
    setState(prev => ({ 
      ...prev, 
      quotations: prev.quotations.filter(q => q.id !== id),
      projects: prev.projects.map(p => p.quotationId === id ? { ...p, quotationId: undefined } : p)
    }));
  }, []);
  
  const getQuotationById = useCallback((id: string) => {
    return state.quotations.find(q => q.id === id);
  }, [state.quotations]);
  
  const getApprovedQuotations = useCallback(() => {
    return state.quotations.filter(q => q.status === "approved" && !q.isConverted);
  }, [state.quotations]);

  const getProjectEligibleQuotations = useCallback(() => {
    return state.quotations.filter(q => q.status === "confirmed" && !q.isConverted);
  }, [state.quotations]);

  const transitionQuotationStatus = useCallback(
    async (id: string, nextStatus: QuotationStatus): Promise<{ ok: boolean; error?: string }> => {
      const prevQuotation = state.quotations.find((q) => q.id === id);
      if (!prevQuotation) {
        return { ok: false, error: "Quotation not found" };
      }

      const requiredAction: AppAction = nextStatus === "confirmed" ? "quotation:confirm" : "quotation:create";
      if (!permissionService.canPerformAction(actorRole, requiredAction)) {
        return { ok: false, error: `Role ${actorRole} is not allowed to perform ${requiredAction}` };
      }

      if (!canTransitionQuotationStatus(prevQuotation.status as QuotationStatus, nextStatus)) {
        return { ok: false, error: `Invalid transition from ${prevQuotation.status} to ${nextStatus}` };
      }

      if (nextStatus === "sent") {
        if (!prevQuotation.clientName || (!prevQuotation.presetSnapshot?.length && !prevQuotation.customItems?.length)) {
          return { ok: false, error: "Sent quotation requires customer and at least one line item" };
        }
      }

      if (nextStatus === "confirmed") {
        if (!prevQuotation.paymentType) {
          return { ok: false, error: "Confirmed quotation requires payment type" };
        }
        if (!prevQuotation.clientAgreedAmount && !prevQuotation.totalAmount) {
          return { ok: false, error: "Confirmed quotation requires commercial amount" };
        }
      }

      repositories.quotationRepository.replaceAll(state.quotations);

      try {
        const result = await commandBus.execute({
          type: TRANSITION_QUOTATION_STATUS_COMMAND,
          actorUserId: "prototype-user",
          actorRole,
          payload: { quotationId: id, nextStatus },
        });

        if (!result.ok) {
          return { ok: false, error: (result as { message: string }).message };
        }

        const fromRepo = repositories.quotationRepository.getById(id);
        if (!fromRepo) {
          return { ok: false, error: "Quotation not found after command" };
        }

        let merged: Quotation = { ...(fromRepo as Quotation) };
        const isStatusTransitionToSent = prevQuotation.status !== "sent" && merged.status === "sent";
        const isStatusTransitionToConfirmed = prevQuotation.status !== "confirmed" && merged.status === "confirmed";

        if ((isStatusTransitionToSent || isStatusTransitionToConfirmed) && !merged.commercialSnapshot) {
          merged = { ...merged, commercialSnapshot: createCommercialSnapshot(merged) };
        }
        if (isStatusTransitionToConfirmed) {
          merged = {
            ...merged,
            confirmedAt: merged.confirmedAt || new Date().toISOString().split("T")[0],
          };
        }

        setState((prev) => {
          const nextQuotations = prev.quotations.map((q) => (q.id === id ? merged : q));
          repositories.quotationRepository.replaceAll(nextQuotations);
          return {
            ...prev,
            quotations: nextQuotations,
            customers: repositories.customerRepository.getAll() as Customer[],
            auditLogs: repositories.auditRepository.getAll() as AuditLogEntry[],
          };
        });

        return { ok: true };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Command failed";
        return { ok: false, error: message };
      }
    },
    [actorRole, commandBus, permissionService, repositories, state.quotations],
  );

  const reviseQuotation = useCallback(
    async (id: string): Promise<{ ok: boolean; revisedQuotationId?: string; error?: string }> => {
      const quotation = state.quotations.find((q) => q.id === id);
      if (!quotation) {
        return { ok: false, error: "Quotation not found" };
      }

      if (quotation.status === "approved" || quotation.status === "confirmed") {
        return { ok: false, error: "Approved or confirmed quotation cannot be revised directly" };
      }

      const revisedQuotationId = generateId("Q");
      const revisedQuotation: Quotation = {
        ...quotation,
        id: revisedQuotationId,
        quotationNumber: `${quotation.quotationNumber}-R1`,
        status: "draft",
        isConverted: false,
        convertedToProjectId: undefined,
        convertedToInvoiceId: undefined,
        approvedAt: undefined,
        confirmedAt: undefined,
        revisionOfQuotationId: quotation.id,
        lifecycleLockReason: undefined,
        shareHistory: [],
        sentAt: undefined,
        commercialSnapshot: undefined,
        createdAt: new Date().toISOString().split("T")[0],
      };

      const created = await addQuotation(revisedQuotation);
      if (!created.ok) {
        return { ok: false, error: created.error };
      }
      return { ok: true, revisedQuotationId };
    },
    [state.quotations, addQuotation, generateId],
  );
  
  // ============ CUSTOMERS CRUD ============
  const addCustomer = useCallback((customer: Customer) => {
    setState(prev => ({ ...prev, customers: [customer, ...prev.customers] }));
  }, []);
  
  const updateCustomer = useCallback((id: string, updates: Partial<Customer>) => {
    setState((prev) => {
      const old = prev.customers.find((c) => c.id === id);
      const logs =
        old != null
          ? auditFieldDiff(
              createAuditEntry,
              "Customer",
              id,
              old.name,
              old as unknown as Record<string, unknown>,
              updates as unknown as Record<string, unknown>,
            )
          : [];
      return {
        ...prev,
        customers: prev.customers.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        auditLogs: [...logs, ...prev.auditLogs],
      };
    });
  }, [createAuditEntry]);
  
  const deleteCustomer = useCallback((id: string) => {
    setState((prev) => {
      const removedInvoiceIds = new Set<string>();
      prev.invoices.forEach((i) => {
        if (i.customerId === id) removedInvoiceIds.add(i.id);
      });
      prev.saleBills.forEach((s) => {
        if (s.customerId === id) removedInvoiceIds.add(s.id);
      });
      return {
        ...prev,
        customers: prev.customers.filter((c) => c.id !== id),
        projects: prev.projects.filter((p) => p.customerId !== id),
        quotations: prev.quotations.filter((q) => q.customerId !== id),
        invoices: prev.invoices.filter((i) => i.customerId !== id),
        saleBills: prev.saleBills.filter((s) => s.customerId !== id),
        payments: prev.payments.filter((p) => !p.invoiceId || !removedInvoiceIds.has(p.invoiceId)),
      };
    });
  }, []);
  
  const getCustomerById = useCallback((id: string) => {
    return state.customers.find(c => c.id === id);
  }, [state.customers]);
  
  // ============ INVOICES CRUD ============
  const addInvoice = useCallback((invoice: Invoice) => {
    if (!canPerformActionOrWarn("finance:create_invoice")) {
      return;
    }
    const invScope = financeValidationService.validateOperationalInvoice(invoice);
    if (!invScope.ok) {
      toast({
        title: "Invoice validation",
        description: invScope.errors.join(" "),
        variant: "destructive",
      });
      return;
    }
    // MSS→customer billing is unconditional by project kind; see BillingDirectionGuardService.
    const postingResult = voucherPostingService.post({
      type: "InvoiceIssued",
      sourceDocumentId: invoice.id,
      amount: invoice.total,
      gstAmount: invoice.cgst + invoice.sgst + invoice.igst,
    });

    const reviewQueueItem = createReviewQueueItem(postingResult, invoice.projectId);
    const auditEntry = createAuditEntry("create", "Invoice", invoice.id, invoice.invoiceNumber);

    setState(prev => {
      const updatedCustomers = invoice.customerId
        ? prev.customers.map(c =>
            c.id === invoice.customerId
              ? { ...c, totalPurchases: (c.totalPurchases || 0) + invoice.total, lastPurchase: invoice.invoiceDate }
              : c
          )
        : prev.customers;
      const updatedProjects = invoice.projectId
        ? prev.projects.map((project) =>
            project.id === invoice.projectId
              ? {
                  ...project,
                  amountInvoiced: (project.amountInvoiced ?? 0) + invoice.total,
                  ...mergeProjectInvoiceRef(project, invoice.id),
                }
              : project
          )
        : prev.projects;
      return {
        ...prev,
        invoices: [invoice, ...prev.invoices],
        customers: updatedCustomers,
        projects: updatedProjects,
        accountingVouchers: postingResult.ok ? [postingResult.voucher, ...prev.accountingVouchers] : prev.accountingVouchers,
        accountingReviewQueue: reviewQueueItem ? [reviewQueueItem, ...prev.accountingReviewQueue] : prev.accountingReviewQueue,
        auditLogs: [auditEntry, ...prev.auditLogs],
      };
    });
  }, [canPerformActionOrWarn, createAuditEntry, createReviewQueueItem, financeValidationService, voucherPostingService]);
  
  const updateInvoice = useCallback((id: string, updates: Partial<Invoice>) => {
    setState(prev => {
      const originalInvoice = prev.invoices.find((i) => i.id === id);
      const updatedInvoice = originalInvoice ? { ...originalInvoice, ...updates } : undefined;
      const updatedProjects =
        updatedInvoice && originalInvoice
          ? prev.projects.map((project) => {
              const projectMatchesOriginal = project.id === originalInvoice.projectId;
              const projectMatchesUpdated = project.id === updatedInvoice.projectId;
              if (projectMatchesOriginal && projectMatchesUpdated) {
                const totalDelta = (updatedInvoice.total ?? originalInvoice.total) - originalInvoice.total;
                return { ...project, amountInvoiced: (project.amountInvoiced ?? 0) + totalDelta };
              }
              if (projectMatchesOriginal && !projectMatchesUpdated) {
                const next: Project = {
                  ...project,
                  amountInvoiced: Math.max(0, (project.amountInvoiced ?? 0) - originalInvoice.total),
                };
                return originalInvoice.projectId ? { ...next, ...stripProjectInvoiceRef(next, id) } : next;
              }
              if (!projectMatchesOriginal && projectMatchesUpdated) {
                const next: Project = {
                  ...project,
                  amountInvoiced: (project.amountInvoiced ?? 0) + (updatedInvoice.total ?? 0),
                };
                return updatedInvoice.projectId ? { ...next, ...mergeProjectInvoiceRef(next, id) } : next;
              }
              return project;
            })
          : prev.projects;
      return {
        ...prev,
        invoices: prev.invoices.map(i => i.id === id ? { ...i, ...updates } : i),
        projects: updatedProjects,
      };
    });
  }, []);
  
  const deleteInvoice = useCallback((id: string) => {
    setState(prev => {
      const removedInvoice = prev.invoices.find((i) => i.id === id);
      const updatedProjects = removedInvoice
        ? prev.projects.map((project) => {
            if (project.id !== removedInvoice.projectId) return project;
            const next: Project = {
              ...project,
              amountInvoiced: Math.max(0, (project.amountInvoiced ?? 0) - removedInvoice.total),
            };
            return removedInvoice.projectId ? { ...next, ...stripProjectInvoiceRef(next, id) } : next;
          })
        : prev.projects;
      return { ...prev, invoices: prev.invoices.filter(i => i.id !== id), projects: updatedProjects };
    });
  }, []);
  
  const getInvoiceById = useCallback((id: string) => {
    return state.invoices.find(i => i.id === id);
  }, [state.invoices]);
  
  // ============ SALE BILLS CRUD ============
  const addSaleBill = useCallback((saleBill: Invoice) => {
    if (!canPerformActionOrWarn("finance:create_invoice")) {
      return;
    }
    const invScope = financeValidationService.validateOperationalInvoice(saleBill);
    if (!invScope.ok) {
      toast({
        title: "Sale bill validation",
        description: invScope.errors.join(" "),
        variant: "destructive",
      });
      return;
    }
    // MSS→customer billing is unconditional by project kind; see BillingDirectionGuardService.
    const postingResult = voucherPostingService.post({
      type: "InvoiceIssued",
      sourceDocumentId: saleBill.id,
      amount: saleBill.total,
      gstAmount: saleBill.cgst + saleBill.sgst + saleBill.igst,
    });

    const reviewQueueItem = createReviewQueueItem(postingResult, saleBill.projectId);
    const auditEntry = createAuditEntry("create", "SaleBill", saleBill.id, saleBill.invoiceNumber);

    setState((prev) => {
      const updatedCustomers = saleBill.customerId
        ? prev.customers.map(c =>
            c.id === saleBill.customerId
              ? { ...c, totalPurchases: (c.totalPurchases || 0) + saleBill.total, lastPurchase: saleBill.invoiceDate }
              : c
          )
        : prev.customers;
      const updatedProjects = saleBill.projectId
        ? prev.projects.map((project) =>
            project.id === saleBill.projectId
              ? {
                  ...project,
                  amountInvoiced: (project.amountInvoiced ?? 0) + saleBill.total,
                  ...mergeProjectInvoiceRef(project, saleBill.id),
                }
              : project
          )
        : prev.projects;
      return {
        ...prev,
        saleBills: [saleBill, ...prev.saleBills],
        customers: updatedCustomers,
        projects: updatedProjects,
        accountingVouchers: postingResult.ok ? [postingResult.voucher, ...prev.accountingVouchers] : prev.accountingVouchers,
        accountingReviewQueue: reviewQueueItem ? [reviewQueueItem, ...prev.accountingReviewQueue] : prev.accountingReviewQueue,
        auditLogs: [auditEntry, ...prev.auditLogs],
      };
    });
  }, [canPerformActionOrWarn, createAuditEntry, createReviewQueueItem, financeValidationService, voucherPostingService]);
  
  const updateSaleBill = useCallback((id: string, updates: Partial<Invoice>) => {
    setState(prev => {
      const originalBill = prev.saleBills.find((s) => s.id === id);
      const updatedBill = originalBill ? { ...originalBill, ...updates } : undefined;
      const updatedProjects =
        updatedBill && originalBill
          ? prev.projects.map((project) => {
              const projectMatchesOriginal = project.id === originalBill.projectId;
              const projectMatchesUpdated = project.id === updatedBill.projectId;
              if (projectMatchesOriginal && projectMatchesUpdated) {
                const totalDelta = (updatedBill.total ?? originalBill.total) - originalBill.total;
                return { ...project, amountInvoiced: (project.amountInvoiced ?? 0) + totalDelta };
              }
              if (projectMatchesOriginal && !projectMatchesUpdated) {
                const next: Project = {
                  ...project,
                  amountInvoiced: Math.max(0, (project.amountInvoiced ?? 0) - originalBill.total),
                };
                return originalBill.projectId ? { ...next, ...stripProjectInvoiceRef(next, id) } : next;
              }
              if (!projectMatchesOriginal && projectMatchesUpdated) {
                const next: Project = {
                  ...project,
                  amountInvoiced: (project.amountInvoiced ?? 0) + (updatedBill.total ?? 0),
                };
                return updatedBill.projectId ? { ...next, ...mergeProjectInvoiceRef(next, id) } : next;
              }
              return project;
            })
          : prev.projects;
      return {
        ...prev,
        saleBills: prev.saleBills.map(s => s.id === id ? { ...s, ...updates } : s),
        projects: updatedProjects,
      };
    });
  }, []);
  
  const deleteSaleBill = useCallback((id: string) => {
    setState(prev => {
      const removedBill = prev.saleBills.find((s) => s.id === id);
      const updatedProjects = removedBill
        ? prev.projects.map((project) => {
            if (project.id !== removedBill.projectId) return project;
            const next: Project = {
              ...project,
              amountInvoiced: Math.max(0, (project.amountInvoiced ?? 0) - removedBill.total),
            };
            return removedBill.projectId ? { ...next, ...stripProjectInvoiceRef(next, id) } : next;
          })
        : prev.projects;
      return { ...prev, saleBills: prev.saleBills.filter(s => s.id !== id), projects: updatedProjects };
    });
  }, []);
  
  // ============ EXPENSES CRUD ============
  const addExpense = useCallback((expense: Expense): boolean => {
    if (!canPerformActionOrWarn("finance:record_expense_income")) {
      return false;
    }
    const mainCategory = expense.mainCategory === "site" ? "site_project" : (expense.mainCategory || "company");
    const validation = financeValidationService.validateExpense(mainCategory as ExpenseTaxonomy, {
      projectId: expense.projectId,
      employeeId: expense.employeeId,
      partnerId: expense.paidBy.type === "partner" ? expense.paidBy.entityId : undefined,
      vendorId: expense.vendorId,
      month: expense.billingMonth,
      quantity: expense.quantity,
    });

    if (!validation.ok) {
      toast({
        title: "Expense validation",
        description: validation.errors.join(" "),
        variant: "destructive",
      });
      return false;
    }

    const postingResult = voucherPostingService.post({
      type: "ExpenseRecorded",
      sourceDocumentId: expense.id,
      amount: expense.amount,
    });

    const reviewQueueItem = createReviewQueueItem(postingResult, expense.projectId);
    const auditEntry = createAuditEntry("create", "Expense", expense.id, expense.description || expense.category);

    setState(prev => {
      const nextExpenses = [expense, ...prev.expenses];
      const nextProjects =
        expense.projectId?.trim()
          ? prev.projects.map((p) =>
              p.id === expense.projectId
                ? { ...p, totalCost: (p.totalCost ?? 0) + expense.amount }
                : p,
            )
          : prev.projects;

      return {
        ...prev,
        expenses: nextExpenses,
        projects: nextProjects,
        accountingVouchers: postingResult.ok ? [postingResult.voucher, ...prev.accountingVouchers] : prev.accountingVouchers,
        accountingReviewQueue: reviewQueueItem ? [reviewQueueItem, ...prev.accountingReviewQueue] : prev.accountingReviewQueue,
        auditLogs: [auditEntry, ...prev.auditLogs],
      };
    });
    return true;
  }, [canPerformActionOrWarn, createAuditEntry, createReviewQueueItem, financeValidationService, voucherPostingService]);
  
  const updateExpense = useCallback((id: string, updates: Partial<Expense>) => {
    if (!canPerformActionOrWarn("finance:update_expense")) return;
    const auditEntry = createAuditEntry("update", "Expense", id, updates.description || updates.category || id);
    setState(prev => {
      const oldExpense = prev.expenses.find(e => e.id === id);
      if (!oldExpense) {
        return {
          ...prev,
          expenses: prev.expenses.map(e => e.id === id ? { ...e, ...updates } : e),
          auditLogs: [auditEntry, ...prev.auditLogs],
        };
      }
      const nextExpense: Expense = { ...oldExpense, ...updates };
      const reconcileProjects = oldExpense.projectId || nextExpense.projectId;
      const nextProjects = reconcileProjects
        ? prev.projects.map(p => {
            let tc = p.totalCost ?? 0;
            if (oldExpense.projectId === p.id) tc -= oldExpense.amount;
            if (nextExpense.projectId === p.id) tc += nextExpense.amount;
            return { ...p, totalCost: Math.max(0, tc) };
          })
        : prev.projects;
      return {
        ...prev,
        expenses: prev.expenses.map(e => e.id === id ? nextExpense : e),
        projects: nextProjects,
        auditLogs: [auditEntry, ...prev.auditLogs],
      };
    });
  }, [canPerformActionOrWarn, createAuditEntry]);
  
  const deleteExpense = useCallback((id: string) => {
    setState(prev => {
      const removed = prev.expenses.find(e => e.id === id);
      const nextProjects =
        removed?.projectId?.trim()
          ? prev.projects.map(p =>
              p.id === removed.projectId
                ? { ...p, totalCost: Math.max(0, (p.totalCost ?? 0) - removed.amount) }
                : p,
            )
          : prev.projects;
      return {
        ...prev,
        expenses: prev.expenses.filter(e => e.id !== id),
        projects: nextProjects,
      };
    });
  }, []);
  
  const getExpensesByProject = useCallback((projectId: string) => {
    return state.expenses.filter(e => e.projectId === projectId);
  }, [state.expenses]);
  
  const getExpensesByEmployee = useCallback((employeeId: string) => {
    return state.expenses.filter(e => e.employeeId === employeeId || e.paidBy.entityId === employeeId);
  }, [state.expenses]);
  
  const getExpensesByCategory = useCallback((category: string) => {
    return state.expenses.filter(e => e.category === category);
  }, [state.expenses]);
  
  const getExpensesByMainCategory = useCallback((mainCategory: string) => {
    return state.expenses.filter(e => e.mainCategory === mainCategory);
  }, [state.expenses]);
  
  // ============ INCOMES CRUD ============
  const addIncome = useCallback((income: Income) => {
    if (!canPerformActionOrWarn("finance:record_expense_income")) {
      return;
    }
    const taxonomyMap: Record<Income["mainCategory"], "project_income" | "loans_borrowing" | "partner_income" | "employee_repayments" | "company_income"> = {
      project: "project_income",
      loan: "loans_borrowing",
      partner: "partner_income",
      "employee-payment": "employee_repayments",
      company: "company_income",
    };

    const validation = financeValidationService.validateIncome(taxonomyMap[income.mainCategory], {
      projectId: income.projectId,
      employeeId: income.employeeId,
      partnerId: income.partnerId,
      bankLoanDetails: income.mainCategory === "loan" ? income.notes : undefined,
    });
    if (!validation.ok) {
      return;
    }

    const auditEntry = createAuditEntry("create", "Income", income.id, income.category);
    setState((prev) => {
      let incomeToStore: Income = { ...income };
      let payments = prev.payments;
      if (incomeToStore.mainCategory === "project" && incomeToStore.projectId) {
        const pIdx = prev.payments.findIndex(
          (p) =>
            p.direction === "in" &&
            !p.linkedIncomeId &&
            p.projectId === incomeToStore.projectId &&
            Math.abs(p.amount - incomeToStore.amount) <= 0.02 &&
            p.date.slice(0, 10) === incomeToStore.date.slice(0, 10),
        );
        if (pIdx >= 0) {
          const pay = prev.payments[pIdx];
          incomeToStore = { ...incomeToStore, linkedPaymentId: pay.id };
          payments = prev.payments.map((row, ix) =>
            ix === pIdx ? { ...row, linkedIncomeId: incomeToStore.id } : row,
          );
        }
      }
      const updatedProjects = incomeToStore.projectId
        ? prev.projects.map((p) =>
            p.id === incomeToStore.projectId ? { ...p, amountReceived: (p.amountReceived ?? 0) + incomeToStore.amount } : p,
          )
        : prev.projects;
      return {
        ...prev,
        incomes: [incomeToStore, ...prev.incomes],
        payments,
        projects: updatedProjects,
        auditLogs: [auditEntry, ...prev.auditLogs],
      };
    });
  }, [canPerformActionOrWarn, createAuditEntry, financeValidationService]);
  
  const updateIncome = useCallback((id: string, updates: Partial<Income>) => {
    if (!canPerformActionOrWarn("finance:update_income")) return;
    const auditEntry = createAuditEntry("update", "Income", id, updates.notes || id);
    setState(prev => ({
      ...prev,
      incomes: prev.incomes.map(i => i.id === id ? { ...i, ...updates } : i),
      auditLogs: [auditEntry, ...prev.auditLogs],
    }));
  }, [canPerformActionOrWarn, createAuditEntry]);
  
  const deleteIncome = useCallback((id: string) => {
    setState(prev => {
      const removedIncome = prev.incomes.find(i => i.id === id);
      const updatedProjects = removedIncome
        ? prev.projects.map((project) =>
            project.id === removedIncome.projectId
              ? { ...project, amountReceived: Math.max(0, (project.amountReceived ?? 0) - removedIncome.amount) }
              : project
          )
        : prev.projects;
      return { ...prev, incomes: prev.incomes.filter(i => i.id !== id), projects: updatedProjects };
    });
  }, []);
  
  const getIncomesByProject = useCallback((projectId: string) => {
    return state.incomes.filter(i => i.projectId === projectId);
  }, [state.incomes]);
  
  const getIncomesByPartner = useCallback((partnerId: string) => {
    return state.incomes.filter(i => i.partnerId === partnerId);
  }, [state.incomes]);
  
  const getIncomesByEmployee = useCallback((employeeId: string) => {
    return state.incomes.filter(i => i.employeeId === employeeId);
  }, [state.incomes]);
  
  // ============ PAYMENTS CRUD ============
  const addPayment = useCallback((payment: Payment) => {
    if (!canPerformActionOrWarn("finance:record_payment")) {
      return;
    }
    const postingResult = payment.direction === "in"
      ? voucherPostingService.post({
          type: "PaymentReceived",
          sourceDocumentId: payment.id,
          amount: payment.amount,
        })
      : null;

    const auditEntry = createAuditEntry("create", "Payment", payment.id, payment.counterpartyName || payment.paymentMode);
    const paymentToStore: Payment = { ...payment };
    setState(prev => {
      let incomes = prev.incomes;
      if (paymentToStore.direction === "in" && paymentToStore.projectId) {
        const incIdx = prev.incomes.findIndex(
          (i) =>
            i.mainCategory === "project" &&
            !i.linkedPaymentId &&
            i.projectId === paymentToStore.projectId &&
            Math.abs(i.amount - paymentToStore.amount) <= 0.02 &&
            i.date.slice(0, 10) === paymentToStore.date.slice(0, 10),
        );
        if (incIdx >= 0) {
          const hit = prev.incomes[incIdx];
          paymentToStore.linkedIncomeId = hit.id;
          incomes = prev.incomes.map((row, ix) =>
            ix === incIdx ? { ...row, linkedPaymentId: paymentToStore.id } : row,
          );
        }
      }
      const reviewProjectId = payment.projectId || (payment.invoiceId ? prev.invoices.find((x) => x.id === payment.invoiceId)?.projectId : undefined);
      const reviewQueueItem = postingResult ? createReviewQueueItem(postingResult, reviewProjectId) : null;
      const applyReceived = (doc: Invoice) =>
        doc.id === payment.invoiceId
          ? { ...doc, amountReceived: Math.min(doc.total ?? Infinity, (doc.amountReceived ?? 0) + payment.amount) }
          : doc;
      const inInvoice = payment.invoiceId ? prev.invoices.some((i) => i.id === payment.invoiceId) : false;
      const updatedInvoices = payment.invoiceId && inInvoice ? prev.invoices.map(applyReceived) : prev.invoices;
      const updatedSaleBills =
        payment.invoiceId && !inInvoice ? prev.saleBills.map(applyReceived) : prev.saleBills;
      const updatedProjects = (payment.projectId && payment.direction === "in")
        ? prev.projects.map(p =>
            p.id === payment.projectId ? { ...p, amountReceived: (p.amountReceived ?? 0) + payment.amount } : p
          )
        : prev.projects;
      const paymentCustomerId = payment.customerId || (payment.counterpartyType === "customer" ? payment.counterpartyId : undefined);
      const updatedCustomers = (paymentCustomerId && payment.direction === "in")
        ? prev.customers.map(c =>
            c.id === paymentCustomerId
              ? { ...c, amountReceived: (c.amountReceived ?? 0) + payment.amount }
              : c
          )
        : prev.customers;

      return {
        ...prev,
        payments: [paymentToStore, ...prev.payments],
        invoices: updatedInvoices,
        saleBills: updatedSaleBills,
        projects: updatedProjects,
        customers: updatedCustomers,
        incomes,
        accountingVouchers: (postingResult && postingResult.ok) ? [postingResult.voucher, ...prev.accountingVouchers] : prev.accountingVouchers,
        accountingReviewQueue: reviewQueueItem ? [reviewQueueItem, ...prev.accountingReviewQueue] : prev.accountingReviewQueue,
        auditLogs: [auditEntry, ...prev.auditLogs],
      };
    });
  }, [canPerformActionOrWarn, createAuditEntry, createReviewQueueItem, voucherPostingService]);
  
  const updatePayment = useCallback((id: string, updates: Partial<Payment>) => {
    if (!canPerformActionOrWarn("finance:update_payment")) return;
    const auditEntry = createAuditEntry("update", "Payment", id, id);
    setState(prev => {
      const oldPayment = prev.payments.find(p => p.id === id);
      const updatedPayment = oldPayment ? { ...oldPayment, ...updates } : undefined;
      const patchInvoiceDocs = (docs: Invoice[]) =>
        docs.map((invoice) => {
          if (!oldPayment) return invoice;
          const invoiceMatchesOriginal = invoice.id === oldPayment.invoiceId;
          const invoiceMatchesUpdated = invoice.id === updatedPayment!.invoiceId;
          if (invoiceMatchesOriginal && invoiceMatchesUpdated && updatedPayment!.direction === "in") {
            const amountDelta = (updatedPayment!.amount ?? oldPayment.amount) - oldPayment.amount;
            return { ...invoice, amountReceived: Math.min(invoice.total ?? Infinity, Math.max(0, (invoice.amountReceived ?? 0) + amountDelta)) };
          }
          if (invoiceMatchesOriginal && !invoiceMatchesUpdated && oldPayment.direction === "in") {
            return { ...invoice, amountReceived: Math.max(0, (invoice.amountReceived ?? 0) - oldPayment.amount) };
          }
          if (!invoiceMatchesOriginal && invoiceMatchesUpdated && updatedPayment!.direction === "in") {
            return {
              ...invoice,
              amountReceived: Math.min(
                invoice.total ?? Infinity,
                (invoice.amountReceived ?? 0) + (updatedPayment!.amount ?? 0),
              ),
            };
          }
          return invoice;
        });
      const updatedInvoices = updatedPayment && oldPayment ? patchInvoiceDocs(prev.invoices) : prev.invoices;
      const updatedSaleBills = updatedPayment && oldPayment ? patchInvoiceDocs(prev.saleBills) : prev.saleBills;
      const updatedProjects = updatedPayment
        ? prev.projects.map((project) => {
            if (!oldPayment) return project;
            const projectMatchesOriginal = project.id === oldPayment.projectId;
            const projectMatchesUpdated = project.id === updatedPayment.projectId;
            if (projectMatchesOriginal && projectMatchesUpdated && updatedPayment.direction === "in") {
              const amountDelta = (updatedPayment.amount ?? oldPayment.amount) - oldPayment.amount;
              return { ...project, amountReceived: (project.amountReceived ?? 0) + amountDelta };
            }
            if (projectMatchesOriginal && !projectMatchesUpdated && oldPayment.direction === "in") {
              return { ...project, amountReceived: Math.max(0, (project.amountReceived ?? 0) - oldPayment.amount) };
            }
            if (!projectMatchesOriginal && projectMatchesUpdated && updatedPayment.direction === "in") {
              return { ...project, amountReceived: (project.amountReceived ?? 0) + (updatedPayment.amount ?? 0) };
            }
            return project;
          })
        : prev.projects;
      return {
        ...prev,
        payments: prev.payments.map(p => p.id === id ? { ...p, ...updates } : p),
        invoices: updatedInvoices,
        saleBills: updatedSaleBills,
        projects: updatedProjects,
        auditLogs: [auditEntry, ...prev.auditLogs],
      };
    });
  }, [canPerformActionOrWarn, createAuditEntry]);

  const deletePayment = useCallback((id: string) => {
    if (!canPerformActionOrWarn("finance:delete_payment")) return;
    setState(prev => {
      const payment = prev.payments.find(p => p.id === id);
      if (!payment) return { ...prev, payments: prev.payments.filter(p => p.id !== id) };
      const applyDec = (doc: Invoice) =>
        doc.id === payment.invoiceId
          ? { ...doc, amountReceived: Math.max(0, (doc.amountReceived ?? 0) - payment.amount) }
          : doc;
      const inInvoice = payment.invoiceId ? prev.invoices.some((i) => i.id === payment.invoiceId) : false;
      const updatedInvoices = payment.invoiceId && inInvoice ? prev.invoices.map(applyDec) : prev.invoices;
      const updatedSaleBills =
        payment.invoiceId && !inInvoice ? prev.saleBills.map(applyDec) : prev.saleBills;
      const updatedProjects = (payment.projectId && payment.direction === "in")
        ? prev.projects.map(p =>
            p.id === payment.projectId
              ? { ...p, amountReceived: Math.max(0, (p.amountReceived ?? 0) - payment.amount) }
              : p
          )
        : prev.projects;
      const updatedCustomers = (payment.counterpartyType === "customer" && payment.counterpartyId && payment.direction === "in")
        ? prev.customers.map(c =>
            c.id === payment.counterpartyId
              ? { ...c, amountReceived: Math.max(0, (c.amountReceived ?? 0) - payment.amount) }
              : c
          )
        : prev.customers;
      return {
        ...prev,
        payments: prev.payments.filter(p => p.id !== id),
        invoices: updatedInvoices,
        saleBills: updatedSaleBills,
        projects: updatedProjects,
        customers: updatedCustomers,
      };
    });
  }, []);

  const dismissAccountingReviewItem = useCallback(
    (queueItemId: string) => {
      if (!canPerformActionOrWarn("finance:record_expense_income")) {
        return;
      }
      setState((prev) => ({
        ...prev,
        accountingReviewQueue: prev.accountingReviewQueue.filter((i) => i.id !== queueItemId),
      }));
    },
    [canPerformActionOrWarn],
  );

  const retryAccountingReviewPosting = useCallback(
    (queueItemId: string): { ok: boolean; error?: string } => {
      if (!canPerformActionOrWarn("finance:record_expense_income")) {
        return { ok: false, error: "Not allowed" };
      }
      const item = state.accountingReviewQueue.find((i) => i.id === queueItemId);
      if (!item) {
        return { ok: false, error: "Queue item not found" };
      }
      const eventType = item.eventType as AccountingEventType;
      const invoice =
        eventType === "InvoiceIssued"
          ? state.invoices.find((inv) => inv.id === item.sourceDocumentId)
          : undefined;
      const postingResult = voucherPostingService.post({
        type: eventType,
        sourceDocumentId: item.sourceDocumentId,
        amount: item.amount,
        ...(eventType === "InvoiceIssued"
          ? { gstAmount: invoice ? invoice.cgst + invoice.sgst + invoice.igst : 0 }
          : {}),
      });
      if (!postingResult.ok) {
        const reason = (postingResult as Exclude<PostingResult, { ok: true }>).reviewQueueItem.reason;
        toast({
          title: "Retry still failed",
          description: reason,
          variant: "destructive",
        });
        return { ok: false, error: reason };
      }

      setState((prev) => ({
        ...prev,
        accountingVouchers: [postingResult.voucher, ...prev.accountingVouchers],
        accountingReviewQueue: prev.accountingReviewQueue.filter((i) => i.id !== queueItemId),
      }));
      return { ok: true };
    },
    [
      canPerformActionOrWarn,
      state.accountingReviewQueue,
      state.invoices,
      voucherPostingService,
    ],
  );

  // ============ EMPLOYEES CRUD ============
  const addEmployee = useCallback((employee: Employee) => {
    setState(prev => ({ ...prev, employees: [employee, ...prev.employees] }));
  }, []);
  
  const updateEmployee = useCallback((id: number, updates: Partial<Employee>) => {
    setState(prev => ({
      ...prev,
      employees: prev.employees.map(e => e.id === id ? { ...e, ...updates } : e),
    }));
  }, []);
  
  const deleteEmployee = useCallback((id: number) => {
    setState((prev) => ({
      ...prev,
      employees: prev.employees.filter((e) => e.id !== id),
      attendanceRecords: prev.attendanceRecords.filter((a) => a.employeeId !== id),
      tasks: prev.tasks.filter((t) => t.employeeId !== id),
      expenses: prev.expenses.filter((e) => {
        if (e.employeeId === String(id)) return false;
        if (e.paidBy?.type === "employee" && e.paidBy?.entityId === String(id)) return false;
        if (e.allocation?.employeeId === String(id)) return false;
        return true;
      }),
      employeePayrollRecords: (prev.employeePayrollRecords ?? []).filter((r) => r.employeeId !== id),
      employeeWalletLedger: (prev.employeeWalletLedger ?? []).filter((r) => r.employeeId !== id),
      teams: prev.teams.map((team) => ({
        ...team,
        memberIds: team.memberIds.filter((mid) => mid !== id),
        ...(team.leadId === id ? { leadId: undefined as number | undefined } : {}),
      })),
    }));
  }, []);
  
  const getEmployeeById = useCallback((id: number) => {
    return state.employees.find(e => e.id === id);
  }, [state.employees]);
  
  // ============ ATTENDANCE CRUD ============
  const addAttendanceRecord = useCallback((record: AttendanceRecord) => {
    setState(prev => ({ ...prev, attendanceRecords: [record, ...prev.attendanceRecords] }));
  }, []);
  
  const updateAttendanceRecord = useCallback((id: string, updates: Partial<AttendanceRecord>) => {
    setState(prev => ({
      ...prev,
      attendanceRecords: prev.attendanceRecords.map(a => a.id === id ? { ...a, ...updates } : a),
    }));
  }, []);
  
  const getAttendanceByDate = useCallback((date: string) => {
    return state.attendanceRecords.filter(a => a.date === date);
  }, [state.attendanceRecords]);
  
  const getAttendanceByEmployee = useCallback((employeeId: number) => {
    return state.attendanceRecords.filter(a => a.employeeId === employeeId);
  }, [state.attendanceRecords]);
  
  // ============ TEAMS CRUD ============
  const addTeam = useCallback((team: Team) => {
    setState(prev => ({ ...prev, teams: [team, ...prev.teams] }));
  }, []);

  const updateTeam = useCallback((id: string, updates: Partial<Team>) => {
    setState(prev => ({
      ...prev,
      teams: prev.teams.map(t => t.id === id ? { ...t, ...updates } : t),
    }));
  }, []);

  const deleteTeam = useCallback((id: string) => {
    setState(prev => ({ ...prev, teams: prev.teams.filter(t => t.id !== id) }));
  }, []);

  const getTeamById = useCallback((id: string) => {
    return state.teams.find(t => t.id === id);
  }, [state.teams]);

  const assignTeamToProject = useCallback((projectId: string, teamAssignment: ProjectTeamAssignment) => {
    setState(prev => ({
      ...prev,
      projects: prev.projects.map(p => {
        if (p.id === projectId) {
          const currentAssignments = p.teamAssignments || [];
          return { ...p, teamAssignments: [...currentAssignments, teamAssignment] };
        }
        return p;
      })
    }));
  }, []);

  const removeTeamFromProject = useCallback((projectId: string, assignmentId: string) => {
    setState(prev => ({
      ...prev,
      projects: prev.projects.map(p => {
        if (p.id === projectId) {
          const currentAssignments = p.teamAssignments || [];
          return { ...p, teamAssignments: currentAssignments.filter(a => a.id !== assignmentId) };
        }
        return p;
      })
    }));
  }, []);
  
  // ============ PARTNERS CRUD ============
  const addPartner = useCallback((partner: Partner) => {
    setState(prev => ({ ...prev, partners: [partner, ...prev.partners] }));
  }, []);
  
  const updatePartner = useCallback((id: string, updates: Partial<Partner>) => {
    if (!canPerformActionOrWarn("partner:update")) return;
    setState((prev) => {
      const old = prev.partners.find((p) => p.id === id);
      const logs =
        old != null
          ? auditFieldDiff(
              createAuditEntry,
              "Partner",
              id,
              old.name,
              old as unknown as Record<string, unknown>,
              updates as unknown as Record<string, unknown>,
            )
          : [];
      return {
        ...prev,
        partners: prev.partners.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        auditLogs: [...logs, ...prev.auditLogs],
      };
    });
  }, [canPerformActionOrWarn, createAuditEntry]);

  const deletePartner = useCallback((id: string) => {
    if (!canPerformActionOrWarn("partner:delete")) return;
    setState(prev => ({ ...prev, partners: prev.partners.filter(p => p.id !== id) }));
  }, [canPerformActionOrWarn]);
  
  const getPartnerById = useCallback((id: string) => {
    return state.partners.find(p => p.id === id);
  }, [state.partners]);
  
  // ============ PARTNER TRANSACTIONS CRUD ============
  const addPartnerTransaction = useCallback((transaction: PartnerTransaction) => {
    if (!canPerformActionOrWarn("partner:add_transaction")) return;
    const auditEntry = createAuditEntry("create", "PartnerTransaction", transaction.id, `${transaction.type} — ${transaction.partnerId}`);
    setState(prev => ({ ...prev, partnerTransactions: [transaction, ...prev.partnerTransactions], auditLogs: [auditEntry, ...prev.auditLogs] }));
  }, [canPerformActionOrWarn, createAuditEntry]);
  
  const updatePartnerTransaction = useCallback((id: string, updates: Partial<PartnerTransaction>) => {
    if (!canPerformActionOrWarn("partner:update")) return;
    const auditEntry = createAuditEntry("update", "PartnerTransaction", id, id);
    setState(prev => ({
      ...prev,
      partnerTransactions: prev.partnerTransactions.map(t => t.id === id ? { ...t, ...updates } : t),
      auditLogs: [auditEntry, ...prev.auditLogs],
    }));
  }, [canPerformActionOrWarn, createAuditEntry]);

  const deletePartnerTransaction = useCallback((id: string) => {
    if (!canPerformActionOrWarn("partner:delete")) return;
    const auditEntry = createAuditEntry("delete", "PartnerTransaction", id, id);
    setState(prev => ({
      ...prev,
      partnerTransactions: prev.partnerTransactions.filter(t => t.id !== id),
      auditLogs: [auditEntry, ...prev.auditLogs],
    }));
  }, [canPerformActionOrWarn, createAuditEntry]);

  const getTransactionsByPartner = useCallback((partnerId: string) => {
    return state.partnerTransactions.filter(t => t.partnerId === partnerId);
  }, [state.partnerTransactions]);

  // ============ LOANS CRUD ============
  const addLoan = useCallback((loan: Loan) => {
    setState(prev => ({ ...prev, loans: [loan, ...prev.loans] }));
  }, []);
  
  const updateLoan = useCallback((id: string, updates: Partial<Loan>) => {
    if (!canPerformActionOrWarn("loan:update")) return;
    const auditEntry = createAuditEntry("update", "Loan", id, updates.personName || updates.source || id);
    setState(prev => ({
      ...prev,
      loans: prev.loans.map(l => l.id === id ? { ...l, ...updates } : l),
      auditLogs: [auditEntry, ...prev.auditLogs],
    }));
  }, [canPerformActionOrWarn, createAuditEntry]);

  const deleteLoan = useCallback((id: string) => {
    if (!canPerformActionOrWarn("loan:delete")) return;
    setState(prev => ({ ...prev, loans: prev.loans.filter(l => l.id !== id) }));
  }, [canPerformActionOrWarn]);
  
  // ============ LOAN REPAYMENTS CRUD ============
  const addLoanRepayment = useCallback((repayment: LoanRepayment) => {
    if (!canPerformActionOrWarn("loan:add_repayment")) return;
    const auditEntry = createAuditEntry("create", "LoanRepayment", repayment.id, `Repayment for loan ${repayment.loanId}`);
    setState((prev) => {
      const loan = prev.loans.find((l) => l.id === repayment.loanId);
      const nextRepayments = [repayment, ...prev.loanRepayments];
      if (!loan) {
        return { ...prev, loanRepayments: nextRepayments, auditLogs: [auditEntry, ...prev.auditLogs] };
      }
      const nextOutstanding = Math.max(
        0,
        Math.round((loan.outstanding - repayment.principalPaid) * 100) / 100,
      );
      const nextStatus: Loan["status"] = nextOutstanding <= 0 ? "Closed" : loan.status;
      return {
        ...prev,
        loanRepayments: nextRepayments,
        loans: prev.loans.map((l) =>
          l.id === repayment.loanId ? { ...l, outstanding: nextOutstanding, status: nextStatus } : l,
        ),
        auditLogs: [auditEntry, ...prev.auditLogs],
      };
    });
  }, [canPerformActionOrWarn, createAuditEntry]);
  
  const updateLoanRepayment = useCallback((id: string, updates: Partial<LoanRepayment>) => {
    if (!canPerformActionOrWarn("loan:update")) return;
    const auditEntry = createAuditEntry("update", "LoanRepayment", id, id);
    setState(prev => ({
      ...prev,
      loanRepayments: prev.loanRepayments.map(r => r.id === id ? { ...r, ...updates } : r),
      auditLogs: [auditEntry, ...prev.auditLogs],
    }));
  }, [canPerformActionOrWarn, createAuditEntry]);

  const deleteLoanRepayment = useCallback((id: string) => {
    if (!canPerformActionOrWarn("loan:delete")) return;
    const auditEntry = createAuditEntry("delete", "LoanRepayment", id, id);
    setState(prev => {
      const repayment = prev.loanRepayments.find(r => r.id === id);
      const updatedLoans = repayment
        ? prev.loans.map(l =>
            l.id === repayment.loanId
              ? { ...l, outstanding: Math.round((l.outstanding + repayment.principalPaid) * 100) / 100, status: "Active" as Loan["status"] }
              : l
          )
        : prev.loans;
      return {
        ...prev,
        loanRepayments: prev.loanRepayments.filter(r => r.id !== id),
        loans: updatedLoans,
        auditLogs: [auditEntry, ...prev.auditLogs],
      };
    });
  }, [canPerformActionOrWarn, createAuditEntry]);

  const getRepaymentsByLoan = useCallback((loanId: string) => {
    return state.loanRepayments.filter(r => r.loanId === loanId);
  }, [state.loanRepayments]);

  // ============ VENDORS CRUD ============
  const addVendor = useCallback((vendor: Vendor) => {
    setState(prev => ({ ...prev, vendors: [vendor, ...prev.vendors] }));
  }, []);
  
  const updateVendor = useCallback((id: number, updates: Partial<Vendor>) => {
    setState((prev) => {
      const old = prev.vendors.find((v) => v.id === id);
      const logs =
        old != null
          ? auditFieldDiff(
              createAuditEntry,
              "Vendor",
              String(id),
              old.name,
              old as unknown as Record<string, unknown>,
              updates as unknown as Record<string, unknown>,
            )
          : [];
      return {
        ...prev,
        vendors: prev.vendors.map((v) => (v.id === id ? { ...v, ...updates } : v)),
        auditLogs: [...logs, ...prev.auditLogs],
      };
    });
  }, [createAuditEntry]);
  
  const deleteVendor = useCallback((id: number) => {
    setState(prev => ({ ...prev, vendors: prev.vendors.filter(v => v.id !== id) }));
  }, []);
  
  // ============ SERVICE PRESETS CRUD ============
  const addServicePreset = useCallback((preset: ServicePreset) => {
    setState(prev => ({ ...prev, servicePresets: [preset, ...prev.servicePresets] }));
  }, []);
  
  const updateServicePreset = useCallback((id: string, updates: Partial<ServicePreset>) => {
    setState(prev => ({
      ...prev,
      servicePresets: prev.servicePresets.map(p => p.id === id ? { ...p, ...updates } : p),
    }));
  }, []);
  
  const deleteServicePreset = useCallback((id: string) => {
    setState(prev => ({ ...prev, servicePresets: prev.servicePresets.filter(p => p.id !== id) }));
  }, []);
  
  const getServicePresetById = useCallback((id: string) => {
    return state.servicePresets.find(p => p.id === id);
  }, [state.servicePresets]);
  
  // ============ QUOTATION VISIBILITY PRESETS CRUD ============
  const addQuotationVisibilityPreset = useCallback((preset: QuotationVisibilityPreset) => {
    setState(prev => ({ ...prev, quotationVisibilityPresets: [preset, ...(prev.quotationVisibilityPresets || [])] }));
  }, []);
  
  const updateQuotationVisibilityPreset = useCallback((id: string, updates: Partial<QuotationVisibilityPreset>) => {
    setState(prev => ({
      ...prev,
      quotationVisibilityPresets: (prev.quotationVisibilityPresets || []).map(p => p.id === id ? { ...p, ...updates } : p),
    }));
  }, []);
  
  const deleteQuotationVisibilityPreset = useCallback((id: string) => {
    setState(prev => ({ ...prev, quotationVisibilityPresets: (prev.quotationVisibilityPresets || []).filter(p => p.id !== id) }));
  }, []);

  const replaceSolarPackagePresets = useCallback((presets: SolarPackagePreset[]) => {
    setState((prev) => ({ ...prev, solarPackagePresets: presets }));
  }, []);

  const replaceSettingsTeamMembers = useCallback((members: SettingsTeamMember[]) => {
    setState((prev) => ({ ...prev, settingsTeamMembers: members }));
  }, []);

  // ============ TASKS CRUD ============
  const addTask = useCallback((task: Task) => {
    setState(prev => ({ ...prev, tasks: [task, ...prev.tasks] }));
  }, []);
  
  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setState(prev => {
      const task = prev.tasks.find(t => t.id === id);
      if (!task) return prev;

      const updatedTasks = prev.tasks.map(t => t.id === id ? { ...t, ...updates } : t);
      
      // Timeline Automation
      let nextTimelineByProject = prev.projectTimelineByProjectId;
      if (task.projectId && updates.status === "done") {
        const projectId = task.projectId;
        const currentTimeline: ProjectTimelineStatus = prev.projectTimelineByProjectId[projectId] || {
          projectId,
          fileLogin: "pending",
          fileLoginComplete: false,
          subsidyType: "",
          bankFileType: "",
          loanStage: "",
          loanStatus: "",
          workStatusChecks: [],
          workStatusComplete: false,
          discomChecks: [],
          discomSubsidyStatus: "",
          paymentType: "",
          updatedAt: new Date().toISOString(),
        };

        const workType = task.workType.toLowerCase();
        const timelineUpdates: Partial<ProjectTimelineStatus> = {};

        // 1. File Login Logic
        if (workType.includes("file login") || workType.includes("document")) {
          timelineUpdates.fileLogin = "complete";
          timelineUpdates.fileLoginComplete = true;
        } 
        
        // 2. Work Status Logic (Main Stages)
        const workStages = ["structure", "panel", "wiring", "earthing", "inverter", "civil", "meter"];
        if (workStages.includes(workType)) {
          const checks = currentTimeline.workStatusChecks || [];
          if (!checks.includes(workType)) {
            timelineUpdates.workStatusChecks = [...checks, workType];
            // If all 7 stages are done, mark workStatusComplete
            if (timelineUpdates.workStatusChecks.length >= 7) {
              timelineUpdates.workStatusComplete = true;
            }
          }
        }

        // 3. DISCOM Logic
        if (workType.includes("discom") || workType.includes("net metering")) {
          const checks = currentTimeline.discomChecks || [];
          const discomKey = workType.includes("net metering") ? "net-metering" : "meter-file-submit";
          if (!checks.includes(discomKey)) {
            timelineUpdates.discomChecks = [...checks, discomKey];
          }
        }

        if (Object.keys(timelineUpdates).length > 0) {
          nextTimelineByProject = {
            ...prev.projectTimelineByProjectId,
            [projectId]: {
              ...currentTimeline,
              ...timelineUpdates,
              updatedAt: new Date().toISOString(),
            }
          };
        }
      }

      return {
        ...prev,
        tasks: updatedTasks,
        projectTimelineByProjectId: nextTimelineByProject
      };
    });
  }, []);
  
  const deleteTask = useCallback((id: string) => {
    setState(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }));
  }, []);
  
  const getTaskById = useCallback((id: string) => {
    return state.tasks.find(t => t.id === id);
  }, [state.tasks]);
  
  const getTasksByEmployee = useCallback((employeeId: number) => {
    return state.tasks.filter(t => t.employeeId === employeeId);
  }, [state.tasks]);
  
  const getTasksByDate = useCallback((date: string) => {
    return state.tasks.filter(t => t.workDate === date);
  }, [state.tasks]);
  
  // ============ ENQUIRIES CRUD ============
  const addEnquiry = useCallback(
    async (enquiry: Enquiry): Promise<{ ok: boolean; error?: string }> => {
      if (!permissionService.canPerformAction(actorRole, "enquiry:create")) {
        return { ok: false, error: `Role ${actorRole} is not allowed to create enquiries` };
      }
      repositories.enquiryRepository.replaceAll(state.enquiries);
      try {
        const result = await commandBus.execute({
          type: CREATE_ENQUIRY_COMMAND,
          actorUserId: "prototype-user",
          actorRole,
          payload: { enquiry },
        });
        if (!result.ok) {
          return { ok: false, error: (result as { message: string }).message };
        }
        setState((prev) => ({
          ...prev,
          enquiries: repositories.enquiryRepository.getAll() as Enquiry[],
          auditLogs: repositories.auditRepository.getAll() as AuditLogEntry[],
        }));
        return { ok: true };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Command failed";
        return { ok: false, error: message };
      }
    },
    [actorRole, commandBus, permissionService, repositories, state.enquiries],
  );
  
  const updateEnquiry = useCallback((id: string, updates: Partial<Enquiry>) => {
    setState(prev => ({
      ...prev,
      enquiries: prev.enquiries.map(e => e.id === id ? { ...e, ...updates } : e),
    }));
  }, []);
  
  const deleteEnquiry = useCallback((id: string) => {
    setState(prev => ({ 
      ...prev, 
      enquiries: prev.enquiries.filter(e => e.id !== id),
    }));
  }, []);
  
  const getEnquiryById = useCallback((id: string) => {
    return state.enquiries.find(e => e.id === id);
  }, [state.enquiries]);

  const transitionEnquiryStatus = useCallback(
    async (id: string, nextStatus: EnquiryStatus, reason?: string): Promise<{ ok: boolean; error?: string }> => {
      const enquiry = state.enquiries.find((e) => e.id === id);
      if (!enquiry) {
        return { ok: false, error: "Enquiry not found" };
      }

      if (!permissionService.canPerformAction(actorRole, "enquiry:create")) {
        return { ok: false, error: `Role ${actorRole} is not allowed to transition enquiries` };
      }

      if (!canTransitionEnquiryStatus(enquiry.status as EnquiryStatus, nextStatus, actorRole, reason)) {
        return { ok: false, error: `Invalid transition from ${enquiry.status} to ${nextStatus}` };
      }

      repositories.enquiryRepository.replaceAll(state.enquiries);

      try {
        const result = await commandBus.execute({
          type: UPDATE_ENQUIRY_STATUS_COMMAND,
          actorUserId: "prototype-user",
          actorRole,
          payload: { enquiryId: id, nextStatus, reason },
        });

        if (!result.ok) {
          return { ok: false, error: (result as { message: string }).message };
        }

        const updated = repositories.enquiryRepository.getById(id);
        if (!updated) {
          return { ok: false, error: "Enquiry not found after command" };
        }

        setState((prev) => ({
          ...prev,
          enquiries: prev.enquiries.map((e) => (e.id === id ? (updated as Enquiry) : e)),
          auditLogs: repositories.auditRepository.getAll() as AuditLogEntry[],
        }));

        return { ok: true };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Command failed";
        return { ok: false, error: message };
      }
    },
    [actorRole, commandBus, permissionService, repositories, state.enquiries],
  );

  const convertEnquiryToCustomer = useCallback(
    async (enquiryId: string): Promise<{ ok: boolean; error?: string; customerId?: string }> => {
      if (!permissionService.canPerformAction(actorRole, "enquiry:create")) {
        return { ok: false, error: "Not allowed" };
      }

      const enquiry = state.enquiries.find((e) => e.id === enquiryId);
      if (!enquiry) {
        return { ok: false, error: "Enquiry not found" };
      }

      repositories.enquiryRepository.replaceAll(state.enquiries);

      try {
        const result = await commandBus.execute<{ enquiryId: string }>({
          type: CONVERT_ENQUIRY_COMMAND,
          actorUserId: "prototype-user",
          actorRole,
          payload: { enquiryId },
        });

        if (!result.ok) {
          return { ok: false, error: (result as { message: string }).message };
        }

        // C1/C2: ensure there's a Customer for this enquiry. Look up by phone or email first
        // so repeat conversions don't create duplicates; only fall through to a fresh create if both fail.
        const enquiryPhone = (enquiry.customerPhone || "").replace(/\D/g, "");
        const enquiryEmail = (enquiry.customerEmail || "").trim().toLowerCase();
        let matchedCustomerId: string | undefined = enquiry.customerId;
        if (!matchedCustomerId) {
          const existing = state.customers.find((c) => {
            const cp = (c.phone || "").replace(/\D/g, "");
            const ce = (c.email || "").trim().toLowerCase();
            return (enquiryPhone && cp === enquiryPhone) || (enquiryEmail && ce === enquiryEmail);
          });
          if (existing) {
            matchedCustomerId = existing.id;
          }
        }

        let createdCustomer: Customer | null = null;
        if (!matchedCustomerId) {
          const newCustomerId = generateId("CUST");
          createdCustomer = {
            id: newCustomerId,
            name: enquiry.customerName,
            phone: enquiry.customerPhone || "",
            email: enquiry.customerEmail || "",
            address: enquiry.customerAddress || "",
            type: enquiry.customerType,
            itemsBought: [],
            totalPurchases: 0,
            createdAt: new Date().toISOString(),
          };
          matchedCustomerId = newCustomerId;
        }

        setState((prev) => ({
          ...prev,
          enquiries: prev.enquiries.map((e) =>
            e.id === enquiryId ? { ...e, status: "converted", customerId: matchedCustomerId } : e,
          ),
          customers: createdCustomer ? [createdCustomer, ...prev.customers] : prev.customers,
          auditLogs: repositories.auditRepository.getAll() as AuditLogEntry[],
        }));

        return { ok: true, customerId: matchedCustomerId };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Conversion failed" };
      }
    },
    [actorRole, commandBus, generateId, permissionService, repositories, state.customers, state.enquiries],
  );
  
  // ============ AGENTS CRUD ============
  const addAgent = useCallback((agent: Agent) => {
    setState(prev => ({ ...prev, agents: [agent, ...prev.agents] }));
  }, []);
  
  const updateAgent = useCallback((id: string, updates: Partial<Agent>) => {
    setState((prev) => {
      const old = prev.agents.find((a) => a.id === id);
      const logs =
        old != null
          ? auditFieldDiff(
              createAuditEntry,
              "Agent",
              id,
              old.name,
              old as unknown as Record<string, unknown>,
              updates as unknown as Record<string, unknown>,
            )
          : [];
      return {
        ...prev,
        agents: prev.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        auditLogs: [...logs, ...prev.auditLogs],
      };
    });
  }, [createAuditEntry]);
  
  const deleteAgent = useCallback((id: string) => {
    setState(prev => ({ ...prev, agents: prev.agents.filter(a => a.id !== id) }));
  }, []);
  
  const getAgentById = useCallback((id: string) => {
    return state.agents.find(a => a.id === id);
  }, [state.agents]);
  
  // ============ SITES CRUD ============
  const addSite = useCallback((site: SiteRecord) => {
    setState((prev) => ({ ...prev, sites: [...prev.sites, site] }));
  }, []);

  const addQuotationTemplate = useCallback((template: QuotationTemplate) => {
    setState(prev => ({ ...prev, quotationTemplates: [template, ...prev.quotationTemplates] }));
  }, []);

  const updateQuotationTemplate = useCallback((id: string, updates: Partial<QuotationTemplate>) => {
    setState(prev => ({
      ...prev,
      quotationTemplates: prev.quotationTemplates.map(t => t.id === id ? { ...t, ...updates } : t),
    }));
  }, []);

  const deleteQuotationTemplate = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      quotationTemplates: prev.quotationTemplates.filter(t => t.id !== id),
    }));
  }, []);

  const addSiteChecklistTemplate = useCallback((template: SiteChecklistTemplate) => {
    setState(prev => ({
      ...prev,
      siteChecklistTemplates: [template, ...(prev.siteChecklistTemplates ?? [])],
    }));
  }, []);

  const updateSiteChecklistTemplate = useCallback((id: string, updates: Partial<SiteChecklistTemplate>) => {
    setState(prev => ({
      ...prev,
      siteChecklistTemplates: (prev.siteChecklistTemplates ?? []).map(t => t.id === id ? { ...t, ...updates } : t),
    }));
  }, []);

  const deleteSiteChecklistTemplate = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      siteChecklistTemplates: (prev.siteChecklistTemplates ?? []).filter(t => t.id !== id),
    }));
  }, []);

  const getQuotationTemplateById = useCallback(
    (id: string) => state.quotationTemplates.find((t) => t.id === id),
    [state.quotationTemplates],
  );

  const getSiteChecklistTemplateById = useCallback(
    (id: string) => state.siteChecklistTemplates.find((t) => t.id === id),
    [state.siteChecklistTemplates],
  );

  const getSitesByProjectId = useCallback(
    (projectId: string) => state.sites.filter((s) => s.projectId === projectId),
    [state.sites],
  );

  const getTasksByProjectId = useCallback(
    (projectId: string) =>
      state.tasks.filter((t) => t.siteId === projectId || t.siteId.startsWith(`${projectId}-`)),
    [state.tasks],
  );

  const getBlockagesByProjectId = useCallback(
    (projectId: string) => state.blockages.filter((b) => b.projectId === projectId),
    [state.blockages],
  );

  const getOperationalTicketsByProjectId = useCallback(
    (projectId: string) =>
      state.operationalTickets.filter((t) => t.projectId === projectId),
    [state.operationalTickets],
  );

  const getProjectTimelineForProject = useCallback(
    (projectId: string) => state.projectTimelineByProjectId[projectId] ?? null,
    [state.projectTimelineByProjectId],
  );

  const updateBlockage = useCallback((id: string, updates: Partial<Blockage>) => {
    setState((prev) => ({
      ...prev,
      blockages: prev.blockages.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    }));
  }, []);

  const addBlockage = useCallback(
    (partial: Omit<Blockage, "id" | "createdAt">) => {
      const nid = generateId("BLK");
      const newBlockage: Blockage = {
        ...partial,
        id: nid,
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        blockages: [newBlockage, ...prev.blockages],
      }));
    },
    [generateId],
  );

  const resolveBlockage = useCallback(
    (input: {
      id: string;
      resolvedAt: string;
      resolvedBy: string;
      resolvedByName: string;
      notesAppend?: string;
    }) => {
      const { id, resolvedAt, resolvedBy, resolvedByName, notesAppend } = input;
      setState((prev) => ({
        ...prev,
        blockages: prev.blockages.map((b) =>
          b.id !== id
            ? b
            : {
                ...b,
                status: "resolved",
                resolvedAt,
                resolvedBy,
                resolvedByName,
                notes: notesAppend
                  ? `${b.notes ?? ""} | Resolution: ${notesAppend}`.trim()
                  : b.notes,
              },
        ),
      }));
    },
    [],
  );

  const updateOperationalTicket = useCallback((id: string, updates: Partial<Ticket>) => {
    setState((prev) => ({
      ...prev,
      operationalTickets: prev.operationalTickets.map((t) =>
        t.id === id ? { ...t, ...updates } : t,
      ),
    }));
  }, []);

  const addOperationalTicket = useCallback((ticket: Ticket) => {
    setState((prev) => ({
      ...prev,
      operationalTickets: [ticket, ...prev.operationalTickets],
    }));
  }, []);

  const updateProjectTimelineForProject = useCallback(
    (projectId: string, updates: Partial<ProjectTimelineStatus>) => {
      setState((prev) => {
        const cur = prev.projectTimelineByProjectId[projectId];
        const base: ProjectTimelineStatus = {
          projectId,
          fileLogin: "pending",
          fileLoginComplete: false,
          subsidyType: "",
          bankFileType: "",
          loanStage: "",
          loanStatus: "",
          workStatusChecks: [],
          workStatusComplete: false,
          discomChecks: [],
          discomSubsidyStatus: "",
          paymentType: "",
          cashToMahiConfirmed: false,
          firstInstallmentPaid: false,
          secondInstallmentPaid: false,
          updatedAt: new Date().toISOString(),
        };
        const next: ProjectTimelineStatus = {
          ...(cur ?? base),
          ...updates,
          projectId,
          updatedAt: new Date().toISOString(),
        };
        return {
          ...prev,
          projectTimelineByProjectId: {
            ...prev.projectTimelineByProjectId,
            [projectId]: next,
          },
        };
      });
    },
    [],
  );

  const getClientPaymentRecordsByProject = useCallback(
    (projectId: string) =>
      state.clientPaymentRecords.filter((r) => r.projectId === projectId),
    [state.clientPaymentRecords],
  );

  const addClientPaymentRecord = useCallback((record: ClientPaymentRecord) => {
    setState((prev) => {
      // C3 single write path: also FIFO-apply against the project's open invoices and emit a Payment row.
      // Composite-key dedupe ensures repeat boot reconcilers don't double-write.
      const projectInvoices = prev.invoices
        .filter((inv) => inv.projectId === record.projectId)
        .sort((a, b) => new Date(a.invoiceDate || a.dueDate || 0).getTime() - new Date(b.invoiceDate || b.dueDate || 0).getTime());

      let remaining = record.amount;
      const updatedInvoices = prev.invoices.map((inv) => {
        if (remaining <= 0) return inv;
        if (inv.projectId !== record.projectId) return inv;
        const due = (inv.total || 0) - (inv.amountReceived || 0);
        if (due <= 0) return inv;
        const pay = Math.min(due, remaining);
        remaining -= pay;
        const nextReceived = (inv.amountReceived || 0) + pay;
        return {
          ...inv,
          amountReceived: nextReceived,
          status: (nextReceived >= (inv.total || 0) ? "paid" : "partial") as Invoice["status"],
          receivedDate: record.date,
          receivedIn: record.paymentMode,
        };
      });

      const updatedProjects = prev.projects.map((p) =>
        p.id === record.projectId ? { ...p, amountReceived: (p.amountReceived ?? 0) + record.amount } : p,
      );

      // Emit a matching Payment row using a composite key so a boot reconciler is idempotent.
      const compositeKey = `cpr:${record.id}`;
      const alreadyEmitted = prev.payments.some((p) => p.id === compositeKey || p.reference === compositeKey);
      const paymentRow: Payment | null = alreadyEmitted
        ? null
        : {
            id: compositeKey,
            date: record.date,
            amount: record.amount,
            direction: "in",
            paymentMode: record.paymentMode,
            counterpartyType: "customer",
            counterpartyId: record.projectId,
            counterpartyName: projectInvoices[0]?.customerName ?? "",
            projectId: record.projectId,
            notes: record.notes ?? `Client payment (record ${record.id})`,
            reference: compositeKey,
          };

      return {
        ...prev,
        clientPaymentRecords: [record, ...prev.clientPaymentRecords],
        invoices: updatedInvoices,
        payments: paymentRow ? [paymentRow, ...prev.payments] : prev.payments,
        projects: updatedProjects,
      };
    });
  }, []);

  const updateSite = useCallback((siteNumericId: number, updates: Partial<SiteRecord>) => {
    setState((prev) => {
      const merged = prev.sites.map((s) => {
        if (s.id !== siteNumericId) return s;
        const combined = { ...s, ...updates };
        const stripped = stripOrphanChecklistInventoryRefs(combined.checklistItems, prev.inventoryItems);
        const next = stripped !== combined.checklistItems ? { ...combined, checklistItems: stripped } : combined;
        if (next.checklistItems?.length) {
          const unknown = findUnknownChecklistInventoryIds(next.checklistItems, prev.inventoryItems);
          if (unknown.length > 0) {
            console.warn("[AppData] Site checklist references unknown inventory ids", unknown);
          }
        }
        return next;
      });
      return { ...prev, sites: merged };
    });
  }, []);

  const applySiteChecklistFromTemplate = useCallback(
    (projectId: string, siteNumericId: number, template: SiteChecklistTemplate | SiteChecklistPreset) => {
      const site = state.sites.find((s) => s.projectId === projectId && s.id === siteNumericId);
      if (!site) {
        return { ok: false, error: "Site not found" } as const;
      }
      const patched = siteWithChecklistFromTemplate(site, template);
      const unknown = findUnknownChecklistInventoryIds(patched.checklistItems, state.inventoryItems);
      if (unknown.length > 0) {
        return {
          ok: false,
          error: `Inventory catalog has no IDs: ${unknown.join(", ")}`,
        } as const;
      }
      setState((prev) => ({
        ...prev,
        sites: prev.sites.map((s) =>
          s.projectId === projectId && s.id === siteNumericId ? patched : s,
        ),
      }));
      return { ok: true } as const;
    },
    [state.inventoryItems, state.sites],
  );

  const dispatchSiteMaterial = useCallback(
    async (projectId: string, siteNumericId: number, checklistLineId: string) => {
      const site = state.sites.find((s) => s.projectId === projectId && s.id === siteNumericId);
      if (!site) return { ok: false, error: "Site not found" } as const;

      const item = site.checklistItems?.find((i) => i.id === checklistLineId);
      if (!item) return { ok: false, error: "Checklist item not found" } as const;
      if (item.status === "dispatched") return { ok: false, error: "Already dispatched" } as const;

      const qty = item.requiredQuantity || 0;
      const invId = item.inventoryItemId;

      if (invId !== undefined && qty > 0) {
        const invRow = state.inventoryItems.find((i) => i.id === invId);
        const available = invRow?.stock ?? 0;
        if (available < qty) {
          return {
            ok: false,
            error: `Insufficient stock for ${invRow?.name ?? "item"}: only ${available} unit(s) available, ${qty} required.`,
          } as const;
        }
        // Use the robust material movement command for deduction and audit
        const moveRes = await recordProjectMaterialMovement({
          projectId,
          itemId: invId,
          movementType: "IssueToSite",
          quantity: qty,
        });

        if (!moveRes.ok) {
          return { ok: false, error: moveRes.error || "Failed to deduct inventory" } as const;
        }
      }

      // Update Site Checklist Status
      setState((prev) => ({
        ...prev,
        sites: prev.sites.map((s) => {
          if (s.projectId === projectId && s.id === siteNumericId) {
            return {
              ...s,
              checklistItems: s.checklistItems?.map((i) =>
                i.id === checklistLineId ? { ...i, status: "dispatched" as const } : i,
              ),
            };
          }
          return s;
        }),
      }));

      return { ok: true } as const;
    },
    [state.sites, state.inventoryItems, recordProjectMaterialMovement],
  );
  
  // ============ HOLIDAYS CRUD ============
  const addHoliday = useCallback((date: Date) => {
    setState(prev => ({ ...prev, holidays: [...prev.holidays, date] }));
  }, []);
  
  const removeHoliday = useCallback((date: Date) => {
    setState(prev => ({
      ...prev,
      holidays: prev.holidays.filter(h => h.toDateString() !== date.toDateString()),
    }));
  }, []);
  
  // ============ OWNER INVESTMENTS CRUD ============
  const addOwnerInvestment = useCallback((investment: OwnerInvestment) => {
    setState(prev => ({ ...prev, ownerInvestments: [investment, ...prev.ownerInvestments] }));
  }, []);
  
  const getOwnerInvestmentsByProject = useCallback((projectId: string) => {
    return state.ownerInvestments.filter(i => i.projectId === projectId);
  }, [state.ownerInvestments]);
  
  const getGeneralOwnerInvestments = useCallback(() => {
    return state.ownerInvestments.filter(i => !i.projectId);
  }, [state.ownerInvestments]);
  
  // ============ EMPLOYEE PAID HOLIDAYS CRUD ============
  const addEmployeePaidHoliday = useCallback((holiday: EmployeePaidHoliday) => {
    setState(prev => ({ ...prev, employeePaidHolidays: [holiday, ...prev.employeePaidHolidays] }));
  }, []);
  
  const getEmployeePaidHolidaysByMonth = useCallback((employeeId: number, month: string) => {
    return state.employeePaidHolidays.filter(h => h.employeeId === employeeId && h.month === month);
  }, [state.employeePaidHolidays]);
  
  const hasEmployeePaidHolidayInMonth = useCallback((employeeId: number, month: string) => {
    return state.employeePaidHolidays.some(h => h.employeeId === employeeId && h.month === month);
  }, [state.employeePaidHolidays]);
  
  // ============ AUDIT LOGS ============
  const addAuditLog = useCallback((entry: AuditLogEntry) => {
    setState(prev => ({ ...prev, auditLogs: [entry, ...prev.auditLogs] }));
  }, []);

  // ============ VENDOR BILLS CRUD ============
  const addVendorBill = useCallback((bill: VendorBill) => {
    if (!canPerformActionOrWarn("vendor:record_bill")) return;
    const auditEntry = createAuditEntry("create", "VendorBill", bill.id, bill.billNumber || bill.id);
    setState((prev) => {
      const updatedVendors = prev.vendors.map((v) =>
        v.id === bill.vendorId ? { ...v, outstandingAmount: (v.outstandingAmount || 0) + bill.total } : v,
      );
      return {
        ...prev,
        vendorBills: [bill, ...prev.vendorBills],
        vendors: updatedVendors,
        auditLogs: [auditEntry, ...prev.auditLogs],
      };
    });

    // C4: also record a PurchaseIn warehouse movement per line item with an inventory link.
    // Bills without `inventoryItemId` are skipped (e.g. pure-service bills) so we don't fabricate movements.
    for (const line of bill.items ?? []) {
      const itemId = line.inventoryItemId;
      const qty = Number(line.quantity);
      if (!itemId || !Number.isFinite(qty) || qty <= 0) continue;
      // Fire-and-forget — the recorder is itself permission-gated and updates inventory atomically.
      void recordWarehouseInventoryMovement({
        itemId,
        movementType: "PurchaseIn",
        quantity: qty,
      });
    }
  }, [canPerformActionOrWarn, createAuditEntry, recordWarehouseInventoryMovement]);
  
  const updateVendorBill = useCallback((id: string, updates: Partial<VendorBill>) => {
    setState(prev => ({
      ...prev,
      vendorBills: prev.vendorBills.map(b => b.id === id ? { ...b, ...updates } : b),
    }));
  }, []);
  
  const deleteVendorBill = useCallback((id: string) => {
    setState(prev => ({ ...prev, vendorBills: prev.vendorBills.filter(b => b.id !== id) }));
  }, []);
  
  const getVendorBillsByVendor = useCallback((vendorId: number) => {
    return state.vendorBills.filter(b => b.vendorId === vendorId);
  }, [state.vendorBills]);
  
  // ============ VENDOR PAYMENTS CRUD ============
  const addVendorPayment = useCallback((payment: VendorPayment) => {
    if (!canPerformActionOrWarn("vendor:record_payment")) return;
    const auditEntry = createAuditEntry("create", "VendorPayment", payment.id, `Payment to vendor ${payment.vendorId}`);
    setState(prev => {
      const updatedVendors = prev.vendors.map(v =>
        v.id === payment.vendorId
          ? { ...v, outstandingAmount: Math.max(0, (v.outstandingAmount || 0) - payment.amount) }
          : v
      );
      const updatedBills = payment.billId
        ? prev.vendorBills.map(b =>
            b.id === payment.billId ? { ...b, amountPaid: (b.amountPaid || 0) + payment.amount } : b
          )
        : prev.vendorBills;
      return { ...prev, vendorPayments: [payment, ...prev.vendorPayments], vendors: updatedVendors, vendorBills: updatedBills, auditLogs: [auditEntry, ...prev.auditLogs] };
    });
  }, [canPerformActionOrWarn, createAuditEntry]);

  const updateVendorPayment = useCallback((id: string, updates: Partial<VendorPayment>) => {
    if (!canPerformActionOrWarn("vendor:update_payment")) return;
    const auditEntry = createAuditEntry("update", "VendorPayment", id, id);
    setState(prev => ({
      ...prev,
      vendorPayments: prev.vendorPayments.map(p => p.id === id ? { ...p, ...updates } : p),
      auditLogs: [auditEntry, ...prev.auditLogs],
    }));
  }, [canPerformActionOrWarn, createAuditEntry]);

  const deleteVendorPayment = useCallback((id: string) => {
    if (!canPerformActionOrWarn("vendor:delete_payment")) return;
    const auditEntry = createAuditEntry("delete", "VendorPayment", id, id);
    setState(prev => {
      const payment = prev.vendorPayments.find(p => p.id === id);
      const updatedVendors = payment
        ? prev.vendors.map(v =>
            v.id === payment.vendorId ? { ...v, outstandingAmount: (v.outstandingAmount || 0) + payment.amount } : v
          )
        : prev.vendors;
      const updatedBills = payment?.billId
        ? prev.vendorBills.map(b =>
            b.id === payment.billId ? { ...b, amountPaid: Math.max(0, (b.amountPaid || 0) - payment.amount) } : b
          )
        : prev.vendorBills;
      return {
        ...prev,
        vendorPayments: prev.vendorPayments.filter(p => p.id !== id),
        vendors: updatedVendors,
        vendorBills: updatedBills,
        auditLogs: [auditEntry, ...prev.auditLogs],
      };
    });
  }, [canPerformActionOrWarn, createAuditEntry]);

  const getVendorPaymentsByVendor = useCallback((vendorId: number) => {
    return state.vendorPayments.filter(p => p.vendorId === vendorId);
  }, [state.vendorPayments]);

  // ============ RELATIONSHIP HELPERS ============
  const getProjectQuotation = useCallback((projectId: string) => {
    const project = state.projects.find(p => p.id === projectId);
    if (project?.quotationId) {
      return state.quotations.find(q => q.id === project.quotationId);
    }
    return undefined;
  }, [state.projects, state.quotations]);
  
  const getProjectInvoices = useCallback((projectId: string) => {
    return state.invoices.filter(i => i.projectId === projectId);
  }, [state.invoices]);
  
  const getProjectExpenses = useCallback((projectId: string) => {
    return state.expenses.filter(e => e.projectId === projectId);
  }, [state.expenses]);
  
  const getProjectPayments = useCallback((projectId: string) => {
    return state.payments.filter(p => p.projectId === projectId);
  }, [state.payments]);
  
  const getCustomerInvoices = useCallback((customerId: string) => {
    return state.invoices.filter(i => i.customerId === customerId);
  }, [state.invoices]);
  
  const getCustomerSaleBills = useCallback((customerId: string) => {
    return state.saleBills.filter(s => s.customerId === customerId);
  }, [state.saleBills]);
  
  // ============ INVENTORY ITEMS CRUD ============
  const addInventoryItem = useCallback((item: InventoryItem) => {
    setState(prev => ({ ...prev, inventoryItems: [item, ...prev.inventoryItems] }));
  }, []);

  const updateInventoryItem = useCallback((id: number, updates: Partial<InventoryItem>) => {
    setState(prev => ({
      ...prev,
      inventoryItems: prev.inventoryItems.map(i => i.id === id ? { ...i, ...updates } : i),
    }));
  }, []);

  const deleteInventoryItem = useCallback((id: number) => {
    setState(prev => ({ ...prev, inventoryItems: prev.inventoryItems.filter(i => i.id !== id) }));
  }, []);

  const issueItemToSite = useCallback((
    itemId: number, siteId: string, siteName: string, qty: number, date: string,
    employeeId?: string, employeeName?: string
  ) => {
    setState(prev => ({
      ...prev,
      inventoryItems: prev.inventoryItems.map(item => {
        if (item.id !== itemId) return item;
        const movement: InventoryMovementRecord = {
          id: `MV${Date.now()}${Math.random().toString(36).slice(2, 14)}${Math.random().toString(36).slice(2, 10)}`.toUpperCase(),
          type: "issue",
          siteId,
          siteName,
          qty,
          date,
          employeeId,
          employeeName,
          createdAt: date.includes("T") ? date : `${date.slice(0, 10)}T12:00:00.000Z`,
        };
        return {
          ...item,
          stock: Math.max(0, item.stock - qty),
          movementHistory: [movement, ...(item.movementHistory ?? [])],
        };
      }),
    }));
  }, []);

  const returnItemFromSite = useCallback((
    itemId: number, siteId: string, siteName: string, qty: number, date: string,
    condition?: string, notes?: string
  ) => {
    setState(prev => ({
      ...prev,
      inventoryItems: prev.inventoryItems.map(item => {
        if (item.id !== itemId) return item;
        const movement: InventoryMovementRecord = {
          id: `MV${Date.now()}${Math.random().toString(36).slice(2, 14)}${Math.random().toString(36).slice(2, 10)}`.toUpperCase(),
          type: "return",
          siteId,
          siteName,
          qty,
          date,
          condition,
          notes,
          createdAt: date.includes("T") ? date : `${date.slice(0, 10)}T12:00:00.000Z`,
        };
        return {
          ...item,
          stock: item.stock + qty,
          movementHistory: [movement, ...(item.movementHistory ?? [])],
        };
      }),
    }));
  }, []);

  // ============ TOOLS CRUD ============
  const addTool = useCallback((tool: Tool) => {
    setState(prev => ({ ...prev, tools: [tool, ...prev.tools] }));
  }, []);

  const updateTool = useCallback((id: number, updates: Partial<Tool>) => {
    setState(prev => ({
      ...prev,
      tools: prev.tools.map(t => t.id === id ? { ...t, ...updates } : t),
    }));
  }, []);

  const deleteTool = useCallback((id: number) => {
    setState(prev => ({ ...prev, tools: prev.tools.filter(t => t.id !== id) }));
  }, []);

  const issueTool = useCallback((
    toolId: number, siteId: string, siteName: string, date: string,
    employeeId?: string, employeeName?: string, handoffNotes?: string,
  ) => {
    const trimmed = handoffNotes?.trim();
    setState(prev => ({
      ...prev,
      tools: prev.tools.map(tool => {
        if (tool.id !== toolId) return tool;
        const movement: ToolMovementRecord = {
          id: `TM${Date.now()}${Math.random().toString(36).slice(2, 14)}${Math.random().toString(36).slice(2, 10)}`.toUpperCase(),
          type: "issue",
          siteId,
          siteName,
          date,
          employeeId,
          employeeName,
          notes: trimmed || undefined,
          conditionNotes: trimmed || undefined,
          createdAt: date.includes("T") ? date : `${date.slice(0, 10)}T12:00:00.000Z`,
        };
        return {
          ...tool,
          status: "In Use" as const,
          site: siteName,
          assignedTo: employeeName ?? tool.assignedTo,
          lastUpdated: date,
          movementHistory: [movement, ...(tool.movementHistory ?? [])],
        };
      }),
    }));
  }, []);

  const returnTool = useCallback((
    toolId: number, condition: Tool["condition"], date: string, notes?: string
  ) => {
    setState(prev => ({
      ...prev,
      tools: prev.tools.map(tool => {
        if (tool.id !== toolId) return tool;
        const movement: ToolMovementRecord = {
          id: `TM${Date.now()}${Math.random().toString(36).slice(2, 14)}${Math.random().toString(36).slice(2, 10)}`.toUpperCase(),
          type: "return",
          date,
          condition,
          notes,
          conditionNotes: notes?.trim() || undefined,
          createdAt: date.includes("T") ? date : `${date.slice(0, 10)}T12:00:00.000Z`,
        };
        return {
          ...tool,
          status: "Available" as const,
          site: "",
          assignedTo: "",
          condition,
          lastUpdated: date,
          movementHistory: [movement, ...(tool.movementHistory ?? [])],
        };
      }),
    }));
  }, []);

  // ============ AGENT COMMISSION PAYMENTS ============
  const addAgentCommissionPayment = useCallback((payment: AgentCommissionPayment) => {
    setState(prev => ({
      ...prev,
      agentCommissionPayments: [payment, ...prev.agentCommissionPayments],
    }));
  }, []);

  const getCommissionPaymentsByAgent = useCallback((agentId: string) => {
    return state.agentCommissionPayments.filter(p => p.agentId === agentId);
  }, [state.agentCommissionPayments]);

  // ============ EMPLOYEE PAYROLL RECORDS ============
  const addEmployeePayrollRecord = useCallback((record: EmployeePayrollRecord) => {
    setState(prev => ({
      ...prev,
      employeePayrollRecords: [record, ...(prev.employeePayrollRecords ?? [])],
    }));
  }, []);

  const getPayrollByEmployee = useCallback((employeeId: number) => {
    return (state.employeePayrollRecords ?? []).filter(r => r.employeeId === employeeId);
  }, [state.employeePayrollRecords]);

  const addEmployeeWalletLedgerEntry = useCallback(
    (entry: Omit<EmployeeWalletLedgerEntry, "id" | "createdAt">): { ok: boolean; error?: string } => {
      if (actorRole !== "super_admin") {
        toast({
          title: "Not permitted",
          description: "Only a super admin can record employee wallet advances or recoveries.",
          variant: "destructive",
        });
        return { ok: false, error: "forbidden" };
      }
      const emp = state.employees.find((e) => e.id === entry.employeeId);
      if (!emp) return { ok: false, error: "Employee not found" };
      const amount = Number(entry.amount);
      if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Enter a valid amount" };
      const row: EmployeeWalletLedgerEntry = {
        ...entry,
        amount,
        id: generateId("EWL"),
        createdAt: new Date().toISOString(),
      };
      const auditRow = createAuditEntry(
        "create",
        "employee_wallet_ledger",
        row.id,
        emp.name,
        row.kind,
        undefined,
        `${row.kind}: ${amount} on ${row.date}${row.notes ? ` (${row.notes})` : ""}`,
      );
      setState((prev) => ({
        ...prev,
        employeeWalletLedger: [row, ...(prev.employeeWalletLedger ?? [])],
        auditLogs: [auditRow, ...prev.auditLogs],
      }));
      return { ok: true };
    },
    [actorRole, state.employees, generateId, createAuditEntry],
  );

  const getEmployeeWalletLedger = useCallback(
    (employeeId?: number) => {
      const rows = state.employeeWalletLedger ?? [];
      if (employeeId === undefined) return rows;
      return rows.filter((r) => r.employeeId === employeeId);
    },
    [state.employeeWalletLedger],
  );

  // ============ VENDORSHIP COMPANIES ============
  const addVendorshipCompany = useCallback((company: VendorshipCompany) => {
    setState(prev => ({ ...prev, vendorshipCompanies: [...(prev.vendorshipCompanies ?? []), company] }));
  }, []);

  const updateVendorshipCompany = useCallback((id: string, updates: Partial<VendorshipCompany>) => {
    setState(prev => ({
      ...prev,
      vendorshipCompanies: (prev.vendorshipCompanies ?? []).map(c => c.id === id ? { ...c, ...updates } : c),
    }));
  }, []);

  const deleteVendorshipCompany = useCallback((id: string) => {
    setState(prev => ({ ...prev, vendorshipCompanies: (prev.vendorshipCompanies ?? []).filter(c => c.id !== id) }));
  }, []);

  const getVendorshipCompanyById = useCallback((id: string) => {
    return (state.vendorshipCompanies ?? []).find(c => c.id === id);
  }, [state.vendorshipCompanies]);

  // ============ INC GIVER COMPANIES ============
  const addINCGiverCompany = useCallback((company: INCGiverCompany) => {
    setState(prev => ({ ...prev, incGiverCompanies: [...(prev.incGiverCompanies ?? []), company] }));
  }, []);

  const updateINCGiverCompany = useCallback((id: string, updates: Partial<INCGiverCompany>) => {
    setState(prev => ({
      ...prev,
      incGiverCompanies: (prev.incGiverCompanies ?? []).map(c => c.id === id ? { ...c, ...updates } : c),
    }));
  }, []);

  const deleteINCGiverCompany = useCallback((id: string) => {
    setState(prev => ({ ...prev, incGiverCompanies: (prev.incGiverCompanies ?? []).filter(c => c.id !== id) }));
  }, []);

  const getINCGiverCompanyById = useCallback((id: string) => {
    return (state.incGiverCompanies ?? []).find(c => c.id === id);
  }, [state.incGiverCompanies]);

  // ============ BANK RECONCILIATION (B13) ============
  const setBankReconciliationStatements = useCallback((statements: unknown[]) => {
    setState(prev => ({ ...prev, bankReconciliationStatements: statements }));
  }, []);

  // ============ DERIVED VALUES ============
  const lowStockItems = useMemo(
    () => state.inventoryItems.filter(i => i.stock <= i.minStock),
    [state.inventoryItems]
  );

  // ============ CONTEXT VALUE ============
  const value: AppDataContextType = {
    ...state,
    
    // Projects
    createProjectFromConfirmedQuotation,
    createProjectIntake,
    createDirectProjectException,
    updateProject,
    recordProjectMaterialMovement,
    recordWarehouseInventoryMovement,
    deleteProject,
    getProjectById,
    
    // Quotations
    addQuotation,
    updateQuotation,
    deleteQuotation,
    getQuotationById,
    getApprovedQuotations,
    getProjectEligibleQuotations,
    transitionQuotationStatus,
    reviseQuotation,
    
    // Customers
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerById,
    
    // Invoices
    addInvoice,
    updateInvoice,
    deleteInvoice,
    getInvoiceById,
    
    // Sale Bills
    addSaleBill,
    updateSaleBill,
    deleteSaleBill,
    
    // Expenses
    addExpense,
    updateExpense,
    deleteExpense,
    getExpensesByProject,
    getExpensesByEmployee,
    getExpensesByCategory,
    getExpensesByMainCategory,
    
    // Incomes
    addIncome,
    updateIncome,
    deleteIncome,
    getIncomesByProject,
    getIncomesByPartner,
    getIncomesByEmployee,
    
    // Payments
    addPayment,
    updatePayment,
    deletePayment,
    
    // Employees
    addEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployeeById,
    
    // Attendance
    addAttendanceRecord,
    updateAttendanceRecord,
    getAttendanceByDate,
    getAttendanceByEmployee,
    
    // Teams
    addTeam,
    updateTeam,
    deleteTeam,
    getTeamById,
    assignTeamToProject,
    removeTeamFromProject,
    
    // Partners
    addPartner,
    updatePartner,
    deletePartner,
    getPartnerById,
    
    // Partner Transactions
    addPartnerTransaction,
    updatePartnerTransaction,
    deletePartnerTransaction,
    getTransactionsByPartner,

    // Loans
    addLoan,
    updateLoan,
    deleteLoan,
    
    // Loan Repayments
    addLoanRepayment,
    updateLoanRepayment,
    deleteLoanRepayment,
    getRepaymentsByLoan,
    
    // Vendors
    addVendor,
    updateVendor,
    deleteVendor,
    
    // Vendor Bills
    addVendorBill,
    updateVendorBill,
    deleteVendorBill,
    getVendorBillsByVendor,
    
    // Vendor Payments
    addVendorPayment,
    updateVendorPayment,
    deleteVendorPayment,
    getVendorPaymentsByVendor,
    
    // Service Presets
    addServicePreset,
    updateServicePreset,
    deleteServicePreset,
    getServicePresetById,
    
    // Quotation Visibility Presets
    addQuotationVisibilityPreset,
    updateQuotationVisibilityPreset,
    deleteQuotationVisibilityPreset,
    replaceSolarPackagePresets,
    replaceSettingsTeamMembers,

    // Tasks
    addTask,
    updateTask,
    deleteTask,
    getTaskById,
    getTasksByEmployee,
    getTasksByDate,
    
    // Enquiries
    addEnquiry,
    updateEnquiry,
    deleteEnquiry,
    getEnquiryById,
    transitionEnquiryStatus,
    convertEnquiryToCustomer,
    
    // Agents
    addAgent,
    updateAgent,
    deleteAgent,
    getAgentById,
    
    // Sites
    addSite,
    addQuotationTemplate,
    updateQuotationTemplate,
    deleteQuotationTemplate,
    addSiteChecklistTemplate,
    updateSiteChecklistTemplate,
    deleteSiteChecklistTemplate,
    getQuotationTemplateById,
    getSiteChecklistTemplateById,
    getSitesByProjectId,
    getTasksByProjectId,
    getBlockagesByProjectId,
    getOperationalTicketsByProjectId,
    getProjectTimelineForProject,
    updateBlockage,
    addBlockage,
    resolveBlockage,
    updateOperationalTicket,
    addOperationalTicket,
    updateProjectTimelineForProject,
    getClientPaymentRecordsByProject,
    addClientPaymentRecord,
    updateSite,
    applySiteChecklistFromTemplate,
    dispatchSiteMaterial,
    
    // Holidays
    addHoliday,
    removeHoliday,
    
    // Owner Investments
    addOwnerInvestment,
    getOwnerInvestmentsByProject,
    getGeneralOwnerInvestments,
    
    // Employee Paid Holidays
    addEmployeePaidHoliday,
    getEmployeePaidHolidaysByMonth,
    hasEmployeePaidHolidayInMonth,
    
    // Relationship helpers
    getProjectQuotation,
    getProjectInvoices,
    getProjectExpenses,
    getProjectPayments,
    getCustomerInvoices,
    getCustomerSaleBills,
    
    // Audit Logs
    addAuditLog,
    dismissAccountingReviewItem,
    retryAccountingReviewPosting,

    // Inventory Items CRUD
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    issueItemToSite,
    returnItemFromSite,

    // Tools CRUD
    addTool,
    updateTool,
    deleteTool,
    issueTool,
    returnTool,

    // Agent Commission Payments
    addAgentCommissionPayment,
    getCommissionPaymentsByAgent,

    // Employee Payroll Records
    addEmployeePayrollRecord,
    getPayrollByEmployee,
    addEmployeeWalletLedgerEntry,
    getEmployeeWalletLedger,

    // Derived values
    lowStockItems,

    // Vendorship Companies
    addVendorshipCompany,
    updateVendorshipCompany,
    deleteVendorshipCompany,
    getVendorshipCompanyById,

    // INC Giver Companies
    addINCGiverCompany,
    updateINCGiverCompany,
    deleteINCGiverCompany,
    getINCGiverCompanyById,

    // Bank reconciliation (B13)
    setBankReconciliationStatements,

    // Utilities
    generateId,
    resetToDefaults,
    canDo,
  };
  
  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
};

// ============ HOOK ============
export const useAppData = (): AppDataContextType => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within an AppDataProvider");
  }
  return context;
};

export default AppDataContext;
