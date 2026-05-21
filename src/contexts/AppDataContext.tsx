import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from "react";
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
import { DEFAULT_SETTINGS_TEAM_MEMBERS } from "@/types/project";
import { buildEmptyAppState } from "@/data/appSeedBuilder";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { persistMastersData } from "@/data/seed/seedMastersSync";
import { bootstrapSessionAfterReset, bootstrapSessionAfterSeed } from "@/lib/seedSessionBootstrap";
import { persistEmptyWorkspaceBoot, setWorkspaceMode } from "@/lib/defaultAppBoot";
import { APP_DATA_RESET_EPOCH_KEY, clearAllAppStorage } from "@/lib/clearAppStorage";
import {
  APP_DATA_STORAGE_KEY,
  APP_DATA_STORAGE_VERSION,
  APP_DATA_STORAGE_VERSION_KEY,
  applyAppStateHydrationPipeline,
  isAppDataStorageSyncKey,
  persistFreshAppStateSeed,
  readPersistedAppState,
  serializeAppState,
} from "@/lib/appDataStorage";
import { isPrototypeRepositoryStorageKey } from "@/infrastructure/repositories/prototypeRepositoryManifest";
import { syncPrototypeRepositoriesFromAppState } from "@/infrastructure/repositories/syncPrototypeRepositories";
import { createId, createNextCustomerId, ensureSequentialCustomerId } from "@/lib/idFactory";
import { isQuotationConverted } from "@/lib/quotationSelectors";
import {
  canDeleteQuotationRecord,
  unlinkQuotationFromEnquiries,
} from "@/lib/quotationProjectConversionPolicy";
import type { QuotationTemplate, SiteChecklistTemplate } from "@/types/templates";
import type { BankReconciliationStatement, Customer, Invoice, Expense, Income, Partner, PartnerTransaction, Loan, LoanRepayment, Payment, ServicePreset, OwnerInvestment, EmployeePaidHoliday, Agent, AuditLogEntry, AccountingReviewQueueItem, AccountingVoucher, AgentCommissionPayment, EmployeePayrollRecord, EmployeeWalletLedgerEntry, VendorshipCompany, INCGiverCompany, INCGiverTransaction } from "@/types/finance";
import type { Blockage, Ticket, ProjectTimelineStatus, ClientPaymentRecord } from "@/types/blockage";
import { findUnknownChecklistInventoryIds, siteWithChecklistFromTemplate, stripOrphanChecklistInventoryRefs } from "@/lib/siteChecklist";
import { auditFieldDiff } from "@/lib/auditFieldDiff";
import { resolveAuditActorUserName } from "@/lib/resolveAuditActorUserName";
import {
  applyProjectDeletionToState,
  buildProjectDeletionAuditEntry,
} from "@/lib/projectDeletionCascade";
import {
  canReverseInventoryMovement,
  canReverseToolMovement,
} from "@/lib/inventoryMovementReversalPolicy";
import { syncProjectsSiteReadinessFromChecklist } from "@/lib/siteReadinessFromChecklist";
import { syncSitesChecklistFromProjects } from "@/lib/siteChecklistNeedToGetSync";
import {
  type LoanRepaymentCashLinkInput,
  resolveLoanRepaymentCashLink,
  upsertExpenseRow,
  upsertPaymentRow,
} from "@/lib/loanRepaymentCashLink";
import {
  applyChangeRequestToProject,
  scaleAgentAccrualsForContractChange,
} from "@/lib/changeRequestApproval";
import {
  appendAccrualIfMissingOnApproval,
  applyAgentCommissionAccrualsOnProjectCompleted,
  linkAccrualsToProject,
  markProjectAccrualsPayable,
} from "@/lib/agentCommissionAccrualPolicy";
import { applyCommissionAccrualsOnProjectStart } from "@/lib/projectStartContinuity";
import type { BankReconciliationMatchApplyInput } from "@/lib/bankReconciliationLink";
import {
  clearBankReconciliationLinksForStatement,
  syncBankReconciliationLinks,
} from "@/lib/bankReconciliationLink";
import { validateChangeRequestDraft } from "@/lib/changeRequestValidation";
import { issueChangeRequestDeltaBilling } from "@/lib/issueChangeRequestDeltaBilling";
import {
  applyPaymentDeletionToLedger,
  buildClientPaymentRecordPaymentRow,
  CLIENT_PAYMENT_RECORD_PAYMENT_PREFIX,
  clientPaymentRecordPaymentId,
  fifoApplyClientPaymentToInvoices,
  formatClientPaymentLedgerReconcileDevMessage,
  isClientPaymentRecordPayment,
  reconcileClientPaymentLedger,
  resolveClientPaymentRecordIdFromPayment,
  summarizeClientPaymentLedgerReconcile,
  validateClientPaymentRecord,
} from "@/lib/clientPaymentReconciliation";
import {
  recordCustomerInflowDispatch,
  type RecordCustomerInflowInput,
} from "@/lib/customerInflowWritePaths";
import type { VendorBill, VendorPayment } from "@/types/inventory";
import { canTransitionEnquiryStatus, type EnquiryStatus } from "@/domain/stateMachines/enquiryStateMachine";
import { canTransitionQuotationStatus, type QuotationStatus } from "@/domain/stateMachines/quotationStateMachine";
import { canTransitionProjectStatus, type ProjectLifecycleStatus } from "@/domain/stateMachines/projectStateMachine";
import type { AppAction } from "@/domain/policies/permissionMatrix";
import type { Command, CommandResult } from "@/application/commands/types";
import { UnifiedFinanceValidationService, type ExpenseTaxonomy } from "@/application/services/UnifiedFinanceValidationService";
import { BillingDirectionGuardService } from "@/application/services/BillingDirectionGuardService";
import { VoucherPostingService, type AccountingEventType, type PostingResult } from "@/application/services/VoucherPostingService";
import type { MovementType } from "@/application/services/InventoryMovementService";
import { toast } from "@/hooks/use-toast";
import { showPermissionDeniedToast, showPermissionDeniedToastForAction } from "@/lib/permissionFeedback";
import { useFoundation } from "@/app/providers/FoundationProvider";
import { useRoleMatrix } from "@/contexts/RoleMatrixContext";
import { canFeature } from "@/domain/policies/featurePermissions";
import {
  CREATE_ENQUIRY_COMMAND,
  UPDATE_ENQUIRY_COMMAND,
  UPDATE_ENQUIRY_STATUS_COMMAND,
  CONVERT_ENQUIRY_COMMAND,
} from "@/application/commands/enquiry/registerEnquiryCommands";
import {
  CREATE_QUOTATION_COMMAND,
  TRANSITION_QUOTATION_STATUS_COMMAND,
  UPDATE_QUOTATION_COMMAND,
} from "@/application/commands/quotation/registerQuotationCommands";
import { createCommercialSnapshot } from "@/domain/quotation/applyQuotationPatch";
import { validateQuotationSendOrApprove } from "@/domain/quotation/quotationCommercialAmount";
import { validateQuotationPaymentTypeForSend } from "@/domain/quotation/quotationPaymentType";
import {
  CREATE_PROJECT_FROM_QUOTATION_COMMAND,
  CREATE_PROJECT_INTAKE_COMMAND,
  CREATE_DIRECT_PROJECT_EXCEPTION_COMMAND,
} from "@/application/commands/project/registerProjectCommands";
import { normalizeProject } from "@/lib/projectNormalize";
import {
  prepareBillingDocumentForStorage,
  stripVolatileDocumentTypeFields,
} from "@/lib/invoiceDocumentType";
import {
  applyProjectReceivedFromIncomeDelta,
  incomeCountsTowardProjectReceived,
  reconcileProjectsAmountInvoiced,
} from "@/lib/billingSelectors";
import { formatINR } from "@/lib/formatCurrency";
import {
  planVendorBillAccountingUpdate,
  postVendorBillVoucher,
  stripVendorBillAccounting,
  vendorBillUpdateAffectsBooks,
  vendorBillUpdateIsDocumentOnly,
} from "@/lib/vendorBillVoucherPosting";
import {
  vendorBillInventoryReceiptLines,
  type VendorBillInventoryLine,
} from "@/lib/vendorBillInventoryLinkage";
import { enqueueWarehouseMovement } from "@/lib/warehouseMovementQueue";
import {
  applyIncGiverLedgerToProjects,
  projectIdsAffectedByIncTransaction,
} from "@/lib/incGiverLedgerContinuity";

/**
 * Customer payment writers (E10) — see `src/lib/customerInflowWritePaths.ts`.
 *
 * - `recordCustomerInflow` — preferred entry: `{ path: "project_fifo" | "invoice_targeted" }`.
 * - `addClientPaymentRecord` — project FIFO + CPR + synthetic Payment (`cpr:<id>`).
 * - `addPayment` — invoice-targeted receipt when `invoiceId` is set (voucher + invoice sync).
 *
 * Boot `reconcileClientPaymentLedger` replays CPR rows only (C3).
 * Customer bulk pay uses `planCustomerBulkInflow` + `recordCustomerInflow` (see `customerInflowWritePaths.ts`).
 */
import { validateExpensePaidByRecord } from "@/lib/expensePayerValidation";
import {
  findScheduledInstallationConflicts,
  validateDoubleBookingOverride,
  validateScheduledInstallationDate,
} from "@/lib/scheduledInstallationValidation";
import { validateMaterialDamageForm } from "@/lib/materialDamageValidation";
import { sanitizePhotoUrlList } from "@/lib/photoUrlLines";
import { getEnquiryQuotationIds } from "@/lib/enquiryQuotationHistory";
import { normalizeEnquiryAssignmentPatch, normalizeEnquiryRecord } from "@/lib/enquiryAssignee";
import { setEnquiryCommandTeamMembers } from "@/lib/enquiryCommandTeamMembers";
import {
  MATERIAL_MOVEMENT_AT_PROJECT_COMMAND,
  WAREHOUSE_INVENTORY_MOVEMENT_COMMAND,
} from "@/application/commands/inventory/registerInventoryCommands";
import type { WarehouseOnlyMovementType } from "@/application/commands/inventory/registerInventoryCommands";
import type { ProjectIntakePayload } from "@/application/services/ProjectKindService";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { DEMO_DEFAULT_SESSION_ROLE, ROLE_LABELS } from "@/domain/entities/identity";
import { ProjectInvariantService } from "@/domain/project/ProjectInvariantService";
import { evaluateAutoArchive, applyAutoArchive } from "@/domain/customer/customerArchive";
import { mergeExpenseUpdateWithReimbursementRules } from "@/lib/expenseReimbursement";
import type { SiteChecklistPreset } from "@/data/masters";

// ============ APP STATE INTERFACE ============
export interface AppState {
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
  incGiverTransactions: INCGiverTransaction[];

  /** B13: persisted uploaded statements for the BankReconciliation modal (prototype). */
  bankReconciliationStatements: BankReconciliationStatement[];

  // ---- Operations entities (final-touches plan) ----
  /** Inventory reservations. Auto-created from project site checklist + manual reservations. */
  materialReservations: import("@/types/operations").MaterialReservation[];
  /** Installation schedules per project with date + team/employee assignment. */
  scheduledInstallations: import("@/types/operations").ScheduledInstallation[];
  /** Pre-start site visits by installation team — feeds the final site checklist. */
  siteVisits: import("@/types/operations").SiteVisit[];
  /** Mid-project change requests (capacity/panels/addon-work). */
  projectChangeRequests: import("@/types/operations").ProjectChangeRequest[];
  /** Material damage events at transport/installation/storage stages. */
  materialDamageRecords: import("@/types/operations").MaterialDamage[];
  /** Agent commission accruals (pending -> payable -> paid). */
  agentCommissionAccruals: import("@/types/operations").AgentCommissionAccrual[];
  /** Need-to-Get: per-line vendor assignment and acquire state. */
  procurementNeedLines: import("@/types/operations").ProcurementNeedLine[];
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
  updateProject: (id: string, updates: Partial<Project>) => boolean;
  recordProjectMaterialMovement: (input: {
    projectId: string;
    itemId: string;
    movementType: MovementType;
    quantity: number;
    allowNegativeSiteBalanceOverride?: boolean;
    baselineLineId?: string;
    /** Idempotency / dedupe key for materials issued/returned/scrapped in batched flows. */
    clientRequestId?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  recordWarehouseInventoryMovement: (input: {
    itemId: string;
    movementType: WarehouseOnlyMovementType;
    quantity: number;
  }) => Promise<{ ok: boolean; error?: string }>;
  deleteProject: (id: string) => void;
  getProjectById: (id: string) => Project | undefined;
  
  // Quotations CRUD
  addQuotation: (quotation: Quotation) => Promise<{ ok: boolean; error?: string }>;
  updateQuotation: (id: string, updates: Partial<Quotation>) => Promise<{ ok: boolean; error?: string }>;
  deleteQuotation: (id: string) => { ok: boolean; error?: string };
  getQuotationById: (id: string) => Quotation | undefined;
  getApprovedQuotations: () => Quotation[];
  getProjectEligibleQuotations: () => Quotation[];
  transitionQuotationStatus: (id: string, nextStatus: QuotationStatus) => Promise<{ ok: boolean; error?: string }>;
  reviseQuotation: (id: string) => Promise<{ ok: boolean; revisedQuotationId?: string; error?: string }>;
  withdrawQuotation: (id: string, reason?: string) => Promise<{ ok: boolean; error?: string }>;
  
  // Customers CRUD
  addCustomer: (customer: Customer) => boolean;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  getCustomerById: (id: string) => Customer | undefined;
  
  // Invoices CRUD
  addInvoice: (invoice: Invoice, options?: { highValueJustification?: string }) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  getInvoiceById: (id: string) => Invoice | undefined;
  
  // Sale Bills CRUD
  addSaleBill: (saleBill: Invoice, options?: { highValueJustification?: string }) => void;
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
  
  // Payments CRUD (E10: prefer recordCustomerInflow — see customerInflowWritePaths.ts)
  /** Invoice-targeted customer receipt; requires `invoiceId` for invoice-level reconciliation. */
  addPayment: (payment: Payment) => void;
  /**
   * Unified customer inflow dispatch (E10).
   * `project_fifo` → addClientPaymentRecord; `invoice_targeted` → addPayment.
   */
  recordCustomerInflow: (input: RecordCustomerInflowInput) => boolean;
  updatePayment: (id: string, updates: Partial<Payment>) => void;
  deletePayment: (id: string) => void;
  
  // Employees CRUD
  addEmployee: (employee: Employee) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  getEmployeeById: (id: string) => Employee | undefined;
  
  // Attendance CRUD
  addAttendanceRecord: (record: AttendanceRecord) => void;
  updateAttendanceRecord: (id: string, updates: Partial<AttendanceRecord>) => void;
  getAttendanceByDate: (date: string) => AttendanceRecord[];
  getAttendanceByEmployee: (employeeId: string) => AttendanceRecord[];
  
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
  addLoanRepayment: (repayment: LoanRepayment, cashLink?: LoanRepaymentCashLinkInput) => void;
  updateLoanRepayment: (id: string, updates: Partial<LoanRepayment>) => void;
  deleteLoanRepayment: (id: string) => void;
  getRepaymentsByLoan: (loanId: string) => LoanRepayment[];

  // Vendors CRUD
  addVendor: (vendor: Vendor) => void;
  updateVendor: (id: string, updates: Partial<Vendor>) => void;
  deleteVendor: (id: string) => { ok: boolean; error?: string };

  upsertProcurementNeedLine: (line: import("@/types/operations").ProcurementNeedLine) => void;
  updateProcurementNeedLine: (
    lineKey: string,
    updates: Partial<import("@/types/operations").ProcurementNeedLine>,
  ) => void;

  // Vendor Bills CRUD
  addVendorBill: (bill: VendorBill) => Promise<{ ok: boolean; error?: string }>;
  updateVendorBill: (id: string, updates: Partial<VendorBill>) => Promise<void>;
  deleteVendorBill: (id: string) => Promise<void>;
  getVendorBillsByVendor: (vendorId: string) => VendorBill[];

  // Vendor Payments CRUD
  addVendorPayment: (payment: VendorPayment) => void;
  updateVendorPayment: (id: string, updates: Partial<VendorPayment>) => void;
  deleteVendorPayment: (id: string) => void;
  getVendorPaymentsByVendor: (vendorId: string) => VendorPayment[];
  
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
  getTasksByEmployee: (employeeId: string) => Task[];
  getTasksByDate: (date: string) => Task[];
  
  // Enquiries CRUD
  addEnquiry: (enquiry: Enquiry) => Promise<{ ok: boolean; error?: string }>;
  updateEnquiry: (id: string, updates: Partial<Enquiry>) => Promise<{ ok: boolean; error?: string }>;
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
  deleteSite: (siteId: string) => { ok: boolean; error?: string };
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
  /** Project-scoped FIFO + ClientPaymentRecord (E10 project_fifo path). */
  addClientPaymentRecord: (record: ClientPaymentRecord) => boolean;
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
  getEmployeePaidHolidaysByMonth: (employeeId: string, month: string) => EmployeePaidHoliday[];
  hasEmployeePaidHolidayInMonth: (employeeId: string, month: string) => boolean;
  
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
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  reverseInventoryMovement: (itemId: string, movementId: string, reason?: string) => { ok: boolean; error?: string };
  issueItemToSite: (itemId: string, siteId: string, siteName: string, qty: number, date: string, employeeId?: string, employeeName?: string) => void;
  returnItemFromSite: (itemId: string, siteId: string, siteName: string, qty: number, date: string, condition?: string, notes?: string) => void;

  // Tools CRUD
  addTool: (tool: Tool) => void;
  updateTool: (id: string, updates: Partial<Tool>) => void;
  deleteTool: (id: string) => void;
  reverseToolMovement: (toolId: string, movementId: string, reason?: string) => { ok: boolean; error?: string };
  issueTool: (
    toolId: string,
    siteId: string,
    siteName: string,
    date: string,
    employeeId?: string,
    employeeName?: string,
    handoffNotes?: string,
  ) => void;
  returnTool: (toolId: string, condition: Tool["condition"], date: string, notes?: string) => void;

  // Agent Commission Payments
  addAgentCommissionPayment: (payment: AgentCommissionPayment) => void;
  updateAgentCommissionPayment: (id: string, updates: Partial<AgentCommissionPayment>) => void;
  deleteAgentCommissionPayment: (id: string) => void;
  getCommissionPaymentsByAgent: (agentId: string) => AgentCommissionPayment[];

  // Employee Payroll Records
  addEmployeePayrollRecord: (record: EmployeePayrollRecord) => void;
  getPayrollByEmployee: (employeeId: string) => EmployeePayrollRecord[];
  addEmployeeWalletLedgerEntry: (
    entry: Omit<EmployeeWalletLedgerEntry, "id" | "createdAt">,
  ) => { ok: boolean; error?: string };
  getEmployeeWalletLedger: (employeeId?: string) => EmployeeWalletLedgerEntry[];

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

  addINCGiverTransaction: (transaction: INCGiverTransaction) => void;
  updateINCGiverTransaction: (id: string, updates: Partial<INCGiverTransaction>) => void;
  deleteINCGiverTransaction: (id: string) => void;
  getTransactionsByIncGiverCompany: (companyId: string) => INCGiverTransaction[];

  // Bank reconciliation (prototype: persist uploaded statements across modal sessions; B13)
  bankReconciliationStatements: BankReconciliationStatement[];
  setBankReconciliationStatements: (statements: BankReconciliationStatement[]) => void;
  /** E9 — write `reconciledWith` on matched expenses/incomes/payments from reconciliation results. */
  syncBankReconciliationLinks: (
    activeStatementIds: string[],
    matches: BankReconciliationMatchApplyInput[],
  ) => void;
  clearBankReconciliationLinksForStatement: (statementId: string) => void;

  // ---- Operations entities CRUD (final-touches plan, Phase 1.2) ----
  addMaterialReservation: (
    reservation: Omit<import("@/types/operations").MaterialReservation, "id" | "createdAt">,
  ) => string;
  releaseMaterialReservation: (id: string) => void;
  reduceMaterialReservation: (id: string, deltaQty: number) => void;
  getReservationsForItem: (itemId: string) => import("@/types/operations").MaterialReservation[];
  getReservationsForProject: (projectId: string) => import("@/types/operations").MaterialReservation[];

  addScheduledInstallation: (
    schedule: Omit<import("@/types/operations").ScheduledInstallation, "id" | "createdAt">,
  ) => string;
  updateScheduledInstallation: (
    id: string,
    updates: Partial<import("@/types/operations").ScheduledInstallation>,
  ) => void;
  getSchedulesByProject: (projectId: string) => import("@/types/operations").ScheduledInstallation[];
  getSchedulesByDate: (date: string) => import("@/types/operations").ScheduledInstallation[];

  addSiteVisit: (
    visit: Omit<import("@/types/operations").SiteVisit, "id" | "createdAt">,
  ) => string;
  reconcileSiteVisitToChecklist: (visitId: string) => { ok: boolean; error?: string };
  getSiteVisitsByProject: (projectId: string) => import("@/types/operations").SiteVisit[];

  addProjectChangeRequest: (
    request: Omit<import("@/types/operations").ProjectChangeRequest, "id" | "requestedAt" | "status">,
  ) => { ok: true; id: string } | { ok: false; error: string };
  approveProjectChangeRequest: (id: string) => {
    ok: boolean;
    error?: string;
    generatedInvoiceId?: string;
    generatedInvoiceNumber?: string;
  };
  rejectProjectChangeRequest: (id: string, reason?: string) => void;
  getChangeRequestsByProject: (projectId: string) => import("@/types/operations").ProjectChangeRequest[];

  addMaterialDamage: (
    damage: Omit<import("@/types/operations").MaterialDamage, "id" | "reportedAt">,
  ) => string;
  getDamageByProject: (projectId: string) => import("@/types/operations").MaterialDamage[];
  getDamageByItem: (itemId: string) => import("@/types/operations").MaterialDamage[];

  addAgentCommissionAccrual: (
    accrual: Omit<import("@/types/operations").AgentCommissionAccrual, "id" | "accruedAt" | "status">,
  ) => string;
  markAccrualPayable: (id: string) => void;
  markProjectCommissionAccrualsPayable: (projectId: string, quotationId?: string) => void;
  markAccrualPaid: (id: string, paymentId: string) => void;
  getAccrualsByAgent: (agentId: string) => import("@/types/operations").AgentCommissionAccrual[];
  getAccrualsByProject: (projectId: string) => import("@/types/operations").AgentCommissionAccrual[];

  // Utility functions
  generateId: (prefix: string) => string;
  /** Next sequential customer id (`CUST-0001` …), aware of legacy `C001` seeds. */
  allocateCustomerId: () => string;
  resetToDefaults: () => void;
  /** Load full business seed (Settings → App data). Requires resetPrototype permission. */
  loadBusinessSeed: (profile?: "full" | "smoke") => void;
  /** Returns true when the current role is allowed to perform the action. Use to disable/hide UI elements. */
  canDo: (action: AppAction) => boolean;
}

const STORAGE_KEY = APP_DATA_STORAGE_KEY;
const STORAGE_VERSION = APP_DATA_STORAGE_VERSION;
const STORAGE_VERSION_KEY = APP_DATA_STORAGE_VERSION_KEY;
const DEFAULT_ACTOR_ROLE = DEMO_DEFAULT_SESSION_ROLE;
const toProjectLifecycleStatus = (lifecycleStatus: Project["lifecycleStatus"]): ProjectLifecycleStatus =>
  lifecycleStatus;

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

// ============ INITIAL STATE ============
/** Default boot: empty business data (masters load separately). */
function buildDefaultBootState(): AppState {
  return buildEmptyAppState();
}

const getInitialState = (): AppState => readPersistedAppState({ persistOnBootstrap: true });

// ============ CONTEXT CREATION ============
const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

// ============ PROVIDER COMPONENT ============
export const AppDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { override: roleMatrixOverride } = useRoleMatrix();
  const [state, setState] = useState<AppState>(() => {
    try {
      return getInitialState();
    } catch (e) {
      console.error("[MSS] Failed to load persisted app state; using empty boot.", e);
      return buildDefaultBootState();
    }
  });
  const lastPersistedSnapshotRef = useRef<string | null>(null);
  const { permissionService, commandBus, repositories } = useFoundation();
  const { currentRole, sessionUserId, demoUserName } = useAppSession();
  const financeValidationService = useMemo(() => new UnifiedFinanceValidationService(), []);
  const billingDirectionGuardService = useMemo(() => new BillingDirectionGuardService(), []);
  const voucherPostingService = useMemo(() => new VoucherPostingService(), []);
  const projectInvariantService = useMemo(() => new ProjectInvariantService(), []);
  const actorRole = currentRole ?? DEFAULT_ACTOR_ROLE;
  const actorUserId = sessionUserId;
  const actorDisplayName = useMemo(() => {
    const trimmed = demoUserName.trim();
    if (trimmed) return trimmed;
    const member = state.settingsTeamMembers.find((m) => m.id === sessionUserId);
    return member?.name ?? ROLE_LABELS[actorRole];
  }, [demoUserName, sessionUserId, state.settingsTeamMembers, actorRole]);

  const canPerformActionOrWarn = useCallback((action: AppAction): boolean => {
    const allowed = permissionService.canPerformAction(actorRole, action, roleMatrixOverride);
    if (!allowed) {
      showPermissionDeniedToastForAction(action, actorRole);
    }
    return allowed;
  }, [actorRole, permissionService, roleMatrixOverride]);

  const canDo = useCallback(
    (action: AppAction) =>
      permissionService.canPerformAction(actorRole, action, roleMatrixOverride),
    [actorRole, permissionService, roleMatrixOverride],
  );

  const runCommand = useCallback(
    <TResult,>(command: Command): Promise<CommandResult<TResult>> => {
      syncPrototypeRepositoriesFromAppState(state, repositories);
      return commandBus.execute<TResult>({
        ...command,
        actorUserId: command.actorUserId ?? actorUserId,
        actorRole: command.actorRole ?? actorRole,
        actorDisplayName:
          command.actorDisplayName ??
          resolveAuditActorUserName({
            actor: { actorUserId, actorRole, actorDisplayName },
            settingsTeamMembers: state.settingsTeamMembers,
            demoUserName: demoUserName,
          }),
        matrixOverride: roleMatrixOverride,
      });
    },
    [
      commandBus,
      repositories,
      roleMatrixOverride,
      actorUserId,
      actorRole,
      actorDisplayName,
      demoUserName,
      state,
      state.settingsTeamMembers,
    ],
  );

  // ============ CROSS-TAB SYNC (storage events from other windows) ============
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (!isAppDataStorageSyncKey(e.key) && !isPrototypeRepositoryStorageKey(e.key)) return;
      const loaded = readPersistedAppState();
      const serialized = serializeAppState(loaded);
      if (lastPersistedSnapshotRef.current === serialized) return;
      lastPersistedSnapshotRef.current = serialized;
      setState(loaded);
      syncPrototypeRepositoriesFromAppState(loaded, repositories);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [repositories]);

  // ============ PERSIST STATE TO LOCALSTORAGE (debounced) + sync mss.repo.* mirrors ============
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const serialized = serializeAppState(state);
        if (lastPersistedSnapshotRef.current === serialized) return;
        lastPersistedSnapshotRef.current = serialized;
        localStorage.setItem(STORAGE_KEY, serialized);
        localStorage.setItem(STORAGE_VERSION_KEY, String(STORAGE_VERSION));
        syncPrototypeRepositoriesFromAppState(state, repositories);
      } catch (e) {
        if (import.meta.env.DEV) {
          console.warn("Failed to persist state:", e);
        }
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [state, repositories]);

  // One-shot sync on mount so command-bus reads match hydrated AppData state.
  useEffect(() => {
    syncPrototypeRepositoriesFromAppState(state, repositories);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount hydration only
  }, [repositories]);

  useEffect(() => {
    setEnquiryCommandTeamMembers(state.settingsTeamMembers);
  }, [state.settingsTeamMembers]);

  /**
   * C3 boot replay — see `customerInflowWritePaths.ts` and `clientPaymentReconciliation.ts`.
   * Reconciles CPR-derived Payment rows (`cpr:<id>`), FIFO invoice allocation, project.amountReceived.
   */
  useEffect(() => {
    let devToastMessage: string | null = null;
    let devInSyncCount: number | null = null;

    setState((prev) => {
      if (prev.clientPaymentRecords.length === 0) return prev;
      const next = reconcileClientPaymentLedger({
        clientPaymentRecords: prev.clientPaymentRecords,
        payments: prev.payments,
        invoices: prev.invoices,
        saleBills: prev.saleBills,
        projects: prev.projects,
        incomes: prev.incomes,
      });
      const summary = summarizeClientPaymentLedgerReconcile(
        {
          payments: prev.payments,
          invoices: prev.invoices,
          projects: prev.projects,
        },
        {
          payments: next.payments,
          invoices: next.invoices,
          projects: next.projects,
        },
        prev.clientPaymentRecords.length,
      );
      if (!summary.changed) {
        devInSyncCount = summary.clientPaymentRecordCount;
        return prev;
      }
      if (import.meta.env.DEV) {
        devToastMessage = formatClientPaymentLedgerReconcileDevMessage(summary);
      }
      return { ...prev, ...next, saleBills: next.saleBills };
    });

    if (import.meta.env.DEV) {
      if (devToastMessage) {
        console.info(`[MSS] C3 boot reconcile: ${devToastMessage}`);
        toast({
          title: "DEV: C3 payment ledger sync",
          description: devToastMessage,
        });
      } else if (devInSyncCount != null) {
        console.debug(
          `[MSS] C3 boot reconcile: already in sync (${devInSyncCount} client payment record(s)).`,
        );
      }
    }
    // Run exactly once on mount.
  }, []);
  
  // Generate unique IDs
  const generateId = useCallback((prefix: string) => createId(prefix), []);

  const allocateCustomerId = useCallback(
    () => createNextCustomerId(state.customers.map((c) => c.id)),
    [state.customers],
  );

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
    userId: actorUserId,
    userName: resolveAuditActorUserName({
      actor: { actorUserId, actorRole, actorDisplayName },
      settingsTeamMembers: state.settingsTeamMembers,
      demoUserName: demoUserName,
    }),
    action,
    entityType,
    entityId,
    entityName,
    field,
    oldValue,
    newValue,
  }), [actorDisplayName, actorRole, actorUserId, demoUserName, generateId, state.settingsTeamMembers]);

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
  
  // Reset — wipes ALL browser app data and reloads empty boot (super_admin / resetPrototype only)
  const resetToDefaults = useCallback(() => {
    if (!canFeature(actorRole, "resetPrototype", "create", roleMatrixOverride)) {
      showPermissionDeniedToast(
        `The ${ROLE_LABELS[actorRole] ?? actorRole} role cannot reset prototype data.`,
      );
      return;
    }
    persistEmptyWorkspaceBoot();
    bootstrapSessionAfterReset();
    window.location.reload();
  }, [actorRole, roleMatrixOverride]);

  const loadBusinessSeed = useCallback((profile: "full" | "smoke" = "full") => {
    if (!canFeature(actorRole, "resetPrototype", "create", roleMatrixOverride)) {
      showPermissionDeniedToast(
        `The ${ROLE_LABELS[actorRole] ?? actorRole} role cannot load business seed data.`,
      );
      return;
    }
    clearAllAppStorage();
    try {
      const { state, verification } = buildBusinessSeed(profile);
      if (!verification.ok) {
        if (import.meta.env.DEV) {
          console.warn("[MSS] Seed verification errors:", verification.errors);
        }
        toast({
          title: "Seed loaded with verification issues",
          description: `Seed verification reported ${verification.errors.length} issue(s). See console in dev.`,
          variant: "destructive",
        });
      } else if (verification.warnings.length > 0 && import.meta.env.DEV) {
        toast({
          title: "Seed loaded",
          description: verification.warnings[0]?.slice(0, 120),
        });
      }
      setWorkspaceMode("business");
      persistFreshAppStateSeed(state);
      persistMastersData();
      bootstrapSessionAfterSeed(state);
      window.location.reload();
    } catch (err) {
      console.error("[MSS] buildBusinessSeed failed:", err);
      const fresh = buildDefaultBootState();
      persistFreshAppStateSeed(fresh);
      bootstrapSessionAfterReset();
      toast({
        title: "Seed build failed",
        description: err instanceof Error ? err.message : "Restored empty workspace.",
        variant: "destructive",
      });
      window.location.reload();
    }
  }, [actorRole, roleMatrixOverride]);

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
        parties: { customer: project.client },
        commercial: {
          contractAmount: project.contractAmount,
          paymentType: (project.paymentType as string) || "cash",
          internalCostEstimate: 0,
        },
      };
      try {
        const result = await runCommand<{ projectId: string }>({
          type: CREATE_PROJECT_FROM_QUOTATION_COMMAND,
          actorUserId,
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
        setState((prev) => {
          const nextProjects = (repositories.projectRepository.getAll() as Project[]).map(normalizeProject);
          const created = projectId ? nextProjects.find((p) => p.id === projectId) : undefined;
          return {
            ...prev,
            projects: nextProjects,
            quotations: repositories.quotationRepository.getAll() as Quotation[],
            enquiries: repositories.enquiryRepository.getAll() as Enquiry[],
            customers: repositories.customerRepository.getAll() as Customer[],
            auditLogs: repositories.auditRepository.getAll() as AuditLogEntry[],
            agentCommissionAccruals: created
              ? linkAccrualsToProject(
                  prev.agentCommissionAccruals ?? [],
                  created.id,
                  created.quotationId ?? project.quotationId,
                  created.agentId,
                )
              : prev.agentCommissionAccruals,
          };
        });
        return { ok: true, projectId };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Command failed";
        return { ok: false, error: message };
      }
    },
    [actorRole, commandBus, permissionService, repositories, state.projects, state.quotations, state.enquiries, state.customers],
  );

  const createProjectIntake = useCallback(
    async (params: {
      project: Project;
      intake: ProjectIntakePayload;
      quotationId?: string;
    }): Promise<{ ok: boolean; error?: string; projectId?: string }> => {
      if (!permissionService.canPerformAction(actorRole, "project:create_from_quote", roleMatrixOverride)) {
        return { ok: false, error: `Role ${actorRole} cannot create projects` };
      }
      try {
        const result = await runCommand<{ projectId: string }>({
          type: CREATE_PROJECT_INTAKE_COMMAND,
          actorUserId,
          actorRole,
          payload: params,
        });
        if (!result.ok) {
          return { ok: false, error: (result as { message: string }).message };
        }
        const projectId = result.result?.projectId;
        setState((prev) => {
          const nextProjects = (repositories.projectRepository.getAll() as Project[]).map(normalizeProject);
          const created = projectId ? nextProjects.find((p) => p.id === projectId) : undefined;
          return {
            ...prev,
            projects: nextProjects,
            quotations: repositories.quotationRepository.getAll() as Quotation[],
            enquiries: repositories.enquiryRepository.getAll() as Enquiry[],
            customers: repositories.customerRepository.getAll() as Customer[],
            auditLogs: repositories.auditRepository.getAll() as AuditLogEntry[],
            agentCommissionAccruals: created?.quotationId
              ? linkAccrualsToProject(
                  prev.agentCommissionAccruals ?? [],
                  created.id,
                  created.quotationId,
                  created.agentId,
                )
              : prev.agentCommissionAccruals,
          };
        });
        return { ok: true, projectId };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Command failed";
        return { ok: false, error: message };
      }
    },
    [actorRole, commandBus, permissionService, repositories, roleMatrixOverride, state.projects, state.quotations, state.enquiries, state.customers],
  );

  const createDirectProjectException = useCallback(
    async (params: {
      projectName: string;
      intake: ProjectIntakePayload;
      reason: string;
      customerId?: string;
    }): Promise<{ ok: boolean; error?: string; projectId?: string }> => {
      try {
        const result = await runCommand<{ projectId: string }>({
          type: CREATE_DIRECT_PROJECT_EXCEPTION_COMMAND,
          actorUserId,
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

  const updateProject = useCallback((id: string, updates: Partial<Project>): boolean => {
    const action = updates.contractAmount !== undefined || updates.totalCost !== undefined
      ? "project:update_commercial"
      : "project:update_execution";
    if (!canPerformActionOrWarn(action)) {
      return false;
    }
    if (!state.projects.some((p) => p.id === id)) {
      toast({ title: "Project not found", description: `No project with id ${id}`, variant: "destructive" });
      return false;
    }
    setState((prev) => {
      let justCompletedCustomerId: string | undefined;
      const nextProjects = prev.projects.map((project) => {
        if (project.id !== id) {
          return project;
        }

        const nextLifecycleStatus = updates.lifecycleStatus;
        if (nextLifecycleStatus && nextLifecycleStatus !== project.lifecycleStatus) {
          const currentLifecycle = toProjectLifecycleStatus(project.lifecycleStatus);
          const nextLifecycle = toProjectLifecycleStatus(nextLifecycleStatus);
          const canTransition = canTransitionProjectStatus(currentLifecycle, nextLifecycle, actorRole);
          if (!canTransition) {
            showPermissionDeniedToast(
              `Cannot move this project to "${nextLifecycleStatus}" with your current role.`,
            );
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
            justCompletedCustomerId = project.customerId;
          }
        }

        return normalizeProject({ ...project, ...updates });
      });

      // Phase 1.4: Customer auto-archive when a project lifecycle transitions to Completed.
      let nextCustomers = prev.customers;
      if (justCompletedCustomerId) {
        const customer = prev.customers.find((c) => c.id === justCompletedCustomerId);
        if (customer) {
          const decision = evaluateAutoArchive({
            customer,
            projects: nextProjects,
            quotations: prev.quotations,
            enquiries: prev.enquiries,
          });
          const patch = applyAutoArchive(customer, decision);
          if (patch) {
            nextCustomers = prev.customers.map((c) =>
              c.id === customer.id ? { ...c, ...patch } : c,
            );
          }
        }
      }

      const auditLogsToAdd: AuditLogEntry[] = [];
      const updated = nextProjects.find((p) => p.id === id);
      const before = prev.projects.find((p) => p.id === id);
      if (before && updated) {
        if (updates.lifecycleStatus && updates.lifecycleStatus !== before.lifecycleStatus) {
          auditLogsToAdd.push(
            createAuditEntry(
              "update",
              "Project",
              id,
              before.name,
              "lifecycleStatus",
              before.lifecycleStatus,
              updates.lifecycleStatus,
            ),
          );
        }
        if (updates.startedAt && updates.startedAt !== before.startedAt) {
          auditLogsToAdd.push(
            createAuditEntry(
              "update",
              "Project",
              id,
              before.name,
              "startedAt",
              before.startedAt ?? "",
              updates.startedAt,
            ),
          );
        }
        if (updates.siteReadiness && JSON.stringify(updates.siteReadiness) !== JSON.stringify(before.siteReadiness)) {
          auditLogsToAdd.push(
            ...auditFieldDiff(
              createAuditEntry,
              "Project",
              id,
              before.name,
              { siteReadiness: before.siteReadiness } as Record<string, unknown>,
              { siteReadiness: updates.siteReadiness } as Record<string, unknown>,
            ),
          );
        }
      }

      let nextAccruals = prev.agentCommissionAccruals ?? [];
      const updatedProject = nextProjects.find((p) => p.id === id);
      const startedNow =
        Boolean(updates.startedAt?.trim()) && !before?.startedAt?.trim();
      if (startedNow && updatedProject) {
        nextAccruals = applyCommissionAccrualsOnProjectStart(
          nextAccruals,
          updatedProject,
          updates.startedAt,
        );
      }
      const completedProject =
        updates.lifecycleStatus === "Completed"
          ? updatedProject
          : undefined;
      if (completedProject) {
        const quotation = completedProject.quotationId
          ? prev.quotations.find((q) => q.id === completedProject.quotationId)
          : undefined;
        nextAccruals = applyAgentCommissionAccrualsOnProjectCompleted(
          nextAccruals,
          completedProject,
          quotation,
          prev.agents,
        );
      }

      let nextSites = prev.sites;
      if (updates.siteChecklist !== undefined) {
        nextSites = syncSitesChecklistFromProjects(
          nextProjects,
          prev.sites,
          prev.inventoryItems,
          [id],
        );
      }

      if (
        before &&
        updatedProject &&
        updates.siteChecklist !== undefined &&
        JSON.stringify(before.siteChecklist) !== JSON.stringify(updatedProject.siteChecklist)
      ) {
        auditLogsToAdd.push(
          createAuditEntry(
            "update",
            "Project",
            id,
            before.name,
            "siteChecklist",
            String(beforeProject.siteChecklist?.length ?? 0),
            String(updatedProject.siteChecklist?.length ?? 0),
          ),
        );
      }

      return {
        ...prev,
        projects: nextProjects,
        sites: nextSites,
        customers: nextCustomers,
        auditLogs: auditLogsToAdd.length ? [...auditLogsToAdd, ...prev.auditLogs] : prev.auditLogs,
        agentCommissionAccruals: nextAccruals,
      };
    });
    return true;
  }, [actorRole, canPerformActionOrWarn, projectInvariantService, createAuditEntry, state.projects]);

  const recordProjectMaterialMovement = useCallback(
    async (input: {
      projectId: string;
      itemId: string;
      movementType: MovementType;
      quantity: number;
      allowNegativeSiteBalanceOverride?: boolean;
      baselineLineId?: string;
      clientRequestId?: string;
    }): Promise<{ ok: boolean; error?: string }> => {
      if (!permissionService.canPerformAction(actorRole, "inventory:material_movement")) {
        return { ok: false, error: "Permission denied for inventory movement" };
      }

      try {
        const result = await runCommand({
          type: MATERIAL_MOVEMENT_AT_PROJECT_COMMAND,
          actorUserId,
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
        setState((prev) => {
          // Phase 1.3: when material is issued to a project, drain the matching auto reservation
          // by the issued qty. Issue movement types: IssueToProject / IssueToSite.
          const isIssue =
            input.movementType === "IssueToProject" || input.movementType === "IssueToSite";
          let nextReservations = prev.materialReservations ?? [];
          if (isIssue) {
            let remaining = input.quantity;
            nextReservations = nextReservations.map((r) => {
              if (
                remaining <= 0 ||
                r.releasedAt ||
                String(r.itemId) !== String(input.itemId) ||
                r.projectId !== input.projectId
              ) {
                return r;
              }
              const take = Math.min(r.qty, remaining);
              remaining -= take;
              const nextQty = r.qty - take;
              return nextQty <= 0
                ? { ...r, qty: 0, releasedAt: new Date().toISOString() }
                : { ...r, qty: nextQty };
            });
          }
          return {
            ...prev,
            projects: (repositories.projectRepository.getAll() as Project[]).map(normalizeProject),
            inventoryItems: repositories.inventoryItemRepository.getAll() as InventoryItem[],
            auditLogs: repositories.auditRepository.getAll() as AuditLogEntry[],
            materialReservations: nextReservations,
          };
        });
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
      itemId: string;
      movementType: WarehouseOnlyMovementType;
      quantity: number;
    }): Promise<{ ok: boolean; error?: string }> =>
      enqueueWarehouseMovement(async () => {
        if (!permissionService.canPerformAction(actorRole, "inventory:material_movement")) {
          return { ok: false, error: "Permission denied for inventory movement" };
        }
        try {
          const result = await runCommand({
            type: WAREHOUSE_INVENTORY_MOVEMENT_COMMAND,
            actorUserId,
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
      }),
    [actorRole, commandBus, permissionService, repositories],
  );
  
  const deleteProject = useCallback((id: string) => {
    setState((prev) => {
      const applied = applyProjectDeletionToState(prev, id);
      if (!applied) return prev;
      const auditEntry = buildProjectDeletionAuditEntry(
        createAuditEntry,
        applied.project,
        applied.counts,
      );
      return {
        ...applied.next,
        auditLogs: [auditEntry, ...prev.auditLogs],
      };
    });
  }, [createAuditEntry]);
  
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
      try {
        const result = await runCommand({
          type: CREATE_QUOTATION_COMMAND,
          actorUserId,
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
      try {
        const result = await runCommand({
          type: UPDATE_QUOTATION_COMMAND,
          actorUserId,
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
  
  const deleteQuotation = useCallback(
    (id: string): { ok: boolean; error?: string } => {
      if (!canFeature(actorRole, "quotation", "delete", roleMatrixOverride)) {
        showPermissionDeniedToast("Your role cannot delete quotations.");
        return { ok: false, error: "Permission denied" };
      }

      const quotation = state.quotations.find((q) => q.id === id);
      if (!quotation) {
        return { ok: false, error: "Quotation not found" };
      }

      const gate = canDeleteQuotationRecord(quotation, {
        projects: state.projects,
        accruals: state.agentCommissionAccruals ?? [],
        invoices: state.invoices,
      });
      if (!gate.ok) {
        return { ok: false, error: gate.message };
      }

      const auditEntry = createAuditEntry(
        "delete",
        "Quotation",
        id,
        quotation.quotationNumber || id,
      );

      setState((prev) => ({
        ...prev,
        quotations: prev.quotations.filter((q) => q.id !== id),
        enquiries: unlinkQuotationFromEnquiries(prev.enquiries, id),
        agentCommissionAccruals: (prev.agentCommissionAccruals ?? []).filter(
          (a) => a.sourceQuotationId !== id,
        ),
        auditLogs: [auditEntry, ...prev.auditLogs],
      }));

      return { ok: true };
    },
    [
      actorRole,
      createAuditEntry,
      roleMatrixOverride,
      state.agentCommissionAccruals,
      state.invoices,
      state.projects,
      state.quotations,
    ],
  );
  
  const getQuotationById = useCallback((id: string) => {
    return state.quotations.find(q => q.id === id);
  }, [state.quotations]);
  
  const getApprovedQuotations = useCallback(() => {
    return state.quotations.filter(q => q.status === "approved" && !isQuotationConverted(q));
  }, [state.quotations]);

  const getProjectEligibleQuotations = useCallback(() => {
    return state.quotations.filter(
      (q) => q.status === "approved" && !isQuotationConverted(q),
    );
  }, [state.quotations]);

  const transitionQuotationStatus = useCallback(
    async (id: string, nextStatus: QuotationStatus): Promise<{ ok: boolean; error?: string }> => {
      const prevQuotation = state.quotations.find((q) => q.id === id);
      if (!prevQuotation) {
        return { ok: false, error: "Quotation not found" };
      }

      const requiredAction: AppAction =
        nextStatus === "approved" || nextStatus === "converted_to_project"
          ? "quotation:confirm"
          : "quotation:create";
      if (!permissionService.canPerformAction(actorRole, requiredAction, roleMatrixOverride)) {
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

      if (nextStatus === "sent" || nextStatus === "approved") {
        const amountCheck = validateQuotationSendOrApprove(prevQuotation);
        if (!amountCheck.ok) {
          return { ok: false, error: amountCheck.message };
        }
        const paymentCheck = validateQuotationPaymentTypeForSend(prevQuotation);
        if (!paymentCheck.ok) {
          return { ok: false, error: paymentCheck.message };
        }
      }

      try {
        const result = await runCommand({
          type: TRANSITION_QUOTATION_STATUS_COMMAND,
          actorUserId,
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

        const syncedEnquiries = repositories.enquiryRepository.getAll() as Enquiry[];

        let merged: Quotation = { ...(fromRepo as Quotation) };
        const isStatusTransitionToSent = prevQuotation.status !== "sent" && merged.status === "sent";

        if (isStatusTransitionToSent && !merged.commercialSnapshot) {
          merged = { ...merged, commercialSnapshot: createCommercialSnapshot(merged) };
        }

        setState((prev) => {
          const nextQuotations = prev.quotations.map((q) => (q.id === id ? merged : q));
          repositories.quotationRepository.replaceAll(nextQuotations);

          const nextAccruals = appendAccrualIfMissingOnApproval(
            prev.agentCommissionAccruals ?? [],
            merged,
            prev.agents,
            prevQuotation.status,
          );

          return {
            ...prev,
            quotations: nextQuotations,
            enquiries: syncedEnquiries,
            customers: repositories.customerRepository.getAll() as Customer[],
            auditLogs: repositories.auditRepository.getAll() as AuditLogEntry[],
            agentCommissionAccruals: nextAccruals,
          };
        });

        return { ok: true };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Command failed";
        return { ok: false, error: message };
      }
    },
    [actorRole, commandBus, permissionService, repositories, roleMatrixOverride, state.enquiries, state.quotations],
  );

  const reviseQuotation = useCallback(
    async (id: string): Promise<{ ok: boolean; revisedQuotationId?: string; error?: string }> => {
      const quotation = state.quotations.find((q) => q.id === id);
      if (!quotation) {
        return { ok: false, error: "Quotation not found" };
      }

      if (quotation.status === "approved") {
        return { ok: false, error: "Approved quotation cannot be revised directly" };
      }

      const revisedQuotationId = generateId("Q");
      const revisedQuotation: Quotation = {
        ...quotation,
        id: revisedQuotationId,
        quotationNumber: `${quotation.quotationNumber}-R1`,
        status: "draft",
        linkedProjectId: undefined,
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

  const withdrawQuotation = useCallback(
    async (id: string, reason?: string): Promise<{ ok: boolean; error?: string }> => {
      const quotation = state.quotations.find((q) => q.id === id);
      if (!quotation) {
        return { ok: false, error: "Quotation not found" };
      }
      if (quotation.status === "withdrawn") {
        return { ok: false, error: "Quotation already withdrawn" };
      }
      if (quotation.status === "converted_to_project") {
        return { ok: false, error: "Converted quotation cannot be withdrawn — void the project instead" };
      }
      const result = await transitionQuotationStatus(id, "withdrawn");
      if (!result.ok) {
        return result;
      }
      const trimmedReason = reason?.trim();
      if (trimmedReason) {
        const now = new Date().toISOString();
        setState((prev) => ({
          ...prev,
          quotations: prev.quotations.map((q) =>
            q.id === id
              ? {
                  ...q,
                  withdrawnAt: now,
                  withdrawnReason: trimmedReason,
                  lifecycleLockReason: "Withdrawn by seller",
                }
              : q,
          ),
        }));
      }
      return { ok: true };
    },
    [state.quotations, transitionQuotationStatus],
  );

  // ============ CUSTOMERS CRUD ============
  const addCustomer = useCallback(
    (customer: Customer) => {
      if (!canPerformActionOrWarn("customer:create")) return false;
      setState((prev) => {
        const id = ensureSequentialCustomerId(
          customer.id,
          prev.customers.map((c) => c.id),
        );
        return { ...prev, customers: [{ ...customer, id }, ...prev.customers] };
      });
      return true;
    },
    [canPerformActionOrWarn],
  );
  
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
    if (!canFeature(actorRole, "customer", "delete", roleMatrixOverride)) {
      showPermissionDeniedToast("Your role cannot delete customers.");
      return;
    }
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
        payments: prev.payments.filter(
          (p) =>
            (!p.invoiceId || !removedInvoiceIds.has(p.invoiceId)) &&
            p.customerId !== id,
        ),
      };
    });
  }, [actorRole, roleMatrixOverride]);
  
  const getCustomerById = useCallback((id: string) => {
    return state.customers.find(c => c.id === id);
  }, [state.customers]);
  
  // ============ INVOICES CRUD ============
  const addInvoice = useCallback((invoice: Invoice, options?: { highValueJustification?: string }) => {
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
    const highValueCheck = billingDirectionGuardService.validateHighValueIssuance(
      invoice.total,
      options?.highValueJustification,
      { isDraft: invoice.status === "draft" },
    );
    if (!highValueCheck.ok) {
      toast({
        title: "High-value invoice blocked",
        description: highValueCheck.error,
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
    const auditLogsToAdd: AuditLogEntry[] = [
      createAuditEntry("create", "Invoice", invoice.id, invoice.invoiceNumber),
    ];
    if (highValueCheck.requiresJustification && options?.highValueJustification?.trim()) {
      auditLogsToAdd.push(
        createAuditEntry(
          "create",
          "Invoice",
          invoice.id,
          invoice.invoiceNumber,
          "high_value_issuance",
          formatINR(invoice.total),
          options.highValueJustification.trim(),
        ),
      );
    }

    const stored = prepareBillingDocumentForStorage(invoice, "invoices");

    setState(prev => {
      const nextInvoices = [stored, ...prev.invoices];
      const projectsWithRefs = stored.projectId
        ? prev.projects.map((project) =>
            project.id === stored.projectId
              ? { ...project, ...mergeProjectInvoiceRef(project, stored.id) }
              : project,
          )
        : prev.projects;
      const updatedProjects = reconcileProjectsAmountInvoiced(
        projectsWithRefs,
        nextInvoices,
        prev.saleBills,
      );
      return {
        ...prev,
        invoices: nextInvoices,
        customers: prev.customers,
        projects: updatedProjects,
        accountingVouchers: postingResult.ok ? [postingResult.voucher, ...prev.accountingVouchers] : prev.accountingVouchers,
        accountingReviewQueue: reviewQueueItem ? [reviewQueueItem, ...prev.accountingReviewQueue] : prev.accountingReviewQueue,
        auditLogs: [...auditLogsToAdd, ...prev.auditLogs],
      };
    });
  }, [
    canPerformActionOrWarn,
    createAuditEntry,
    createReviewQueueItem,
    financeValidationService,
    billingDirectionGuardService,
    voucherPostingService,
  ]);
  
  const updateInvoice = useCallback((id: string, updates: Partial<Invoice>) => {
    const safeUpdates = stripVolatileDocumentTypeFields(updates);
    setState(prev => {
      const originalInvoice = prev.invoices.find((i) => i.id === id);
      const nextInvoices = prev.invoices.map((i) => (i.id === id ? { ...i, ...safeUpdates } : i));
      const updatedInvoice = nextInvoices.find((i) => i.id === id);
      const projectsWithRefs =
        originalInvoice && updatedInvoice
          ? prev.projects.map((project) => {
              const projectMatchesOriginal = project.id === originalInvoice.projectId;
              const projectMatchesUpdated = project.id === updatedInvoice.projectId;
              if (projectMatchesOriginal && projectMatchesUpdated) {
                return updatedInvoice.projectId
                  ? { ...project, ...mergeProjectInvoiceRef(project, id) }
                  : project;
              }
              if (projectMatchesOriginal && !projectMatchesUpdated) {
                const next: Project = { ...project };
                return originalInvoice.projectId ? { ...next, ...stripProjectInvoiceRef(next, id) } : next;
              }
              if (!projectMatchesOriginal && projectMatchesUpdated) {
                return updatedInvoice.projectId
                  ? { ...project, ...mergeProjectInvoiceRef(project, id) }
                  : project;
              }
              return project;
            })
          : prev.projects;
      const updatedProjects = reconcileProjectsAmountInvoiced(
        projectsWithRefs,
        nextInvoices,
        prev.saleBills,
      );
      return {
        ...prev,
        invoices: nextInvoices,
        projects: updatedProjects,
      };
    });
  }, []);
  
  const deleteInvoice = useCallback((id: string) => {
    setState(prev => {
      const removedInvoice = prev.invoices.find((i) => i.id === id);
      const nextInvoices = prev.invoices.filter((i) => i.id !== id);
      const projectsWithRefs = removedInvoice
        ? prev.projects.map((project) => {
            if (project.id !== removedInvoice.projectId) return project;
            const next: Project = { ...project };
            return removedInvoice.projectId ? { ...next, ...stripProjectInvoiceRef(next, id) } : next;
          })
        : prev.projects;
      const updatedProjects = reconcileProjectsAmountInvoiced(
        projectsWithRefs,
        nextInvoices,
        prev.saleBills,
      );
      return { ...prev, invoices: nextInvoices, projects: updatedProjects };
    });
  }, []);
  
  const getInvoiceById = useCallback((id: string) => {
    return state.invoices.find(i => i.id === id);
  }, [state.invoices]);
  
  // ============ SALE BILLS CRUD ============
  const addSaleBill = useCallback((saleBill: Invoice, options?: { highValueJustification?: string }) => {
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
    const highValueCheck = billingDirectionGuardService.validateHighValueIssuance(
      saleBill.total,
      options?.highValueJustification,
      { isDraft: saleBill.status === "draft" },
    );
    if (!highValueCheck.ok) {
      toast({
        title: "High-value sale bill blocked",
        description: highValueCheck.error,
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
    const auditLogsToAdd: AuditLogEntry[] = [
      createAuditEntry("create", "SaleBill", saleBill.id, saleBill.invoiceNumber),
    ];
    if (highValueCheck.requiresJustification && options?.highValueJustification?.trim()) {
      auditLogsToAdd.push(
        createAuditEntry(
          "create",
          "SaleBill",
          saleBill.id,
          saleBill.invoiceNumber,
          "high_value_issuance",
          formatINR(saleBill.total),
          options.highValueJustification.trim(),
        ),
      );
    }

    const stored = prepareBillingDocumentForStorage(saleBill, "saleBills");

    setState((prev) => {
      const nextSaleBills = [stored, ...prev.saleBills];
      const projectsWithRefs = stored.projectId
        ? prev.projects.map((project) =>
            project.id === stored.projectId
              ? { ...project, ...mergeProjectInvoiceRef(project, stored.id) }
              : project,
          )
        : prev.projects;
      const updatedProjects = reconcileProjectsAmountInvoiced(
        projectsWithRefs,
        prev.invoices,
        nextSaleBills,
      );
      return {
        ...prev,
        saleBills: nextSaleBills,
        customers: prev.customers,
        projects: updatedProjects,
        accountingVouchers: postingResult.ok ? [postingResult.voucher, ...prev.accountingVouchers] : prev.accountingVouchers,
        accountingReviewQueue: reviewQueueItem ? [reviewQueueItem, ...prev.accountingReviewQueue] : prev.accountingReviewQueue,
        auditLogs: [...auditLogsToAdd, ...prev.auditLogs],
      };
    });
  }, [
    canPerformActionOrWarn,
    createAuditEntry,
    createReviewQueueItem,
    financeValidationService,
    billingDirectionGuardService,
    voucherPostingService,
  ]);
  
  const updateSaleBill = useCallback((id: string, updates: Partial<Invoice>) => {
    const safeUpdates = stripVolatileDocumentTypeFields(updates);
    setState(prev => {
      const originalBill = prev.saleBills.find((s) => s.id === id);
      const nextSaleBills = prev.saleBills.map((s) => (s.id === id ? { ...s, ...safeUpdates } : s));
      const updatedBill = nextSaleBills.find((s) => s.id === id);
      const projectsWithRefs =
        originalBill && updatedBill
          ? prev.projects.map((project) => {
              const projectMatchesOriginal = project.id === originalBill.projectId;
              const projectMatchesUpdated = project.id === updatedBill.projectId;
              if (projectMatchesOriginal && projectMatchesUpdated) {
                return updatedBill.projectId
                  ? { ...project, ...mergeProjectInvoiceRef(project, id) }
                  : project;
              }
              if (projectMatchesOriginal && !projectMatchesUpdated) {
                const next: Project = { ...project };
                return originalBill.projectId ? { ...next, ...stripProjectInvoiceRef(next, id) } : next;
              }
              if (!projectMatchesOriginal && projectMatchesUpdated) {
                return updatedBill.projectId
                  ? { ...project, ...mergeProjectInvoiceRef(project, id) }
                  : project;
              }
              return project;
            })
          : prev.projects;
      const updatedProjects = reconcileProjectsAmountInvoiced(
        projectsWithRefs,
        prev.invoices,
        nextSaleBills,
      );
      return {
        ...prev,
        saleBills: nextSaleBills,
        projects: updatedProjects,
      };
    });
  }, []);
  
  const deleteSaleBill = useCallback((id: string) => {
    setState(prev => {
      const removedBill = prev.saleBills.find((s) => s.id === id);
      const nextSaleBills = prev.saleBills.filter((s) => s.id !== id);
      const projectsWithRefs = removedBill
        ? prev.projects.map((project) => {
            if (project.id !== removedBill.projectId) return project;
            const next: Project = { ...project };
            return removedBill.projectId ? { ...next, ...stripProjectInvoiceRef(next, id) } : next;
          })
        : prev.projects;
      const updatedProjects = reconcileProjectsAmountInvoiced(
        projectsWithRefs,
        prev.invoices,
        nextSaleBills,
      );
      return { ...prev, saleBills: nextSaleBills, projects: updatedProjects };
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

    const payerCheck = validateExpensePaidByRecord(expense.amount, expense.paidBy);
    if (!payerCheck.ok) {
      toast({
        title: "Expense payer invalid",
        description: payerCheck.errors.join(" "),
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

    const oldExpense = state.expenses.find((e) => e.id === id);
    if (!oldExpense) {
      toast({ title: "Expense not found", variant: "destructive" });
      return;
    }

    const canApproveReimbursement = permissionService.canPerformAction(
      actorRole,
      "approval:resolve",
      roleMatrixOverride,
    );
    const reimbMerge = mergeExpenseUpdateWithReimbursementRules(
      oldExpense,
      updates,
      { userId: actorUserId, userName: actorDisplayName },
      canApproveReimbursement,
    );
    if (!reimbMerge.ok) {
      showPermissionDeniedToast(reimbMerge.message);
      return;
    }
    const mergedUpdates = reimbMerge.merged;

    const auditEntry = createAuditEntry(
      "update",
      "Expense",
      id,
      mergedUpdates.description || mergedUpdates.category || id,
    );
    setState(prev => {
      const old = prev.expenses.find(e => e.id === id);
      if (!old) {
        return {
          ...prev,
          expenses: prev.expenses.map(e => e.id === id ? { ...e, ...mergedUpdates } : e),
          auditLogs: [auditEntry, ...prev.auditLogs],
        };
      }
      const nextExpense: Expense = { ...old, ...mergedUpdates };
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
  }, [
    actorDisplayName,
    actorRole,
    actorUserId,
    canPerformActionOrWarn,
    createAuditEntry,
    permissionService,
    roleMatrixOverride,
    state.expenses,
  ]);
  
  const deleteExpense = useCallback((id: string) => {
    if (!canPerformActionOrWarn("finance:delete_expense")) return;
    const auditEntry = createAuditEntry("delete", "Expense", id, id);
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
        auditLogs: [auditEntry, ...prev.auditLogs],
      };
    });
  }, [canPerformActionOrWarn, createAuditEntry]);
  
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
      const updatedProjects = incomeCountsTowardProjectReceived(incomeToStore)
        ? applyProjectReceivedFromIncomeDelta(prev.projects, incomeToStore.projectId, incomeToStore.amount)
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
    setState((prev) => {
      const old = prev.incomes.find((i) => i.id === id);
      const auditLogs =
        old != null
          ? auditFieldDiff(
              createAuditEntry,
              "Income",
              id,
              old.category || id,
              old as unknown as Record<string, unknown>,
              updates as unknown as Record<string, unknown>,
            )
          : [createAuditEntry("update", "Income", id, updates.notes || id)];
      if (!old) {
        return {
          ...prev,
          incomes: prev.incomes.map((i) => (i.id === id ? { ...i, ...updates } : i)),
          auditLogs: [...auditLogs, ...prev.auditLogs],
        };
      }
      const next: Income = { ...old, ...updates };
      let projects = prev.projects;
      if (incomeCountsTowardProjectReceived(old)) {
        projects = applyProjectReceivedFromIncomeDelta(projects, old.projectId, -old.amount);
      }
      if (incomeCountsTowardProjectReceived(next)) {
        projects = applyProjectReceivedFromIncomeDelta(projects, next.projectId, next.amount);
      }
      return {
        ...prev,
        incomes: prev.incomes.map((i) => (i.id === id ? next : i)),
        projects,
        auditLogs: [...auditLogs, ...prev.auditLogs],
      };
    });
  }, [canPerformActionOrWarn, createAuditEntry]);
  
  const deleteIncome = useCallback((id: string) => {
    if (!canPerformActionOrWarn("finance:delete_income")) return;
    const auditEntry = createAuditEntry("delete", "Income", id, id);
    setState(prev => {
      const removedIncome = prev.incomes.find(i => i.id === id);
      const updatedProjects =
        removedIncome && incomeCountsTowardProjectReceived(removedIncome)
          ? applyProjectReceivedFromIncomeDelta(prev.projects, removedIncome.projectId, -removedIncome.amount)
          : prev.projects;
      return {
        ...prev,
        incomes: prev.incomes.filter(i => i.id !== id),
        projects: updatedProjects,
        auditLogs: [auditEntry, ...prev.auditLogs],
      };
    });
  }, [canPerformActionOrWarn, createAuditEntry]);
  
  const getIncomesByProject = useCallback((projectId: string) => {
    return state.incomes.filter(i => i.projectId === projectId);
  }, [state.incomes]);
  
  const getIncomesByPartner = useCallback((partnerId: string) => {
    return state.incomes.filter(i => i.partnerId === partnerId);
  }, [state.incomes]);
  
  const getIncomesByEmployee = useCallback((employeeId: string) => {
    return state.incomes.filter(i => i.employeeId === employeeId);
  }, [state.incomes]);
  
  // ============ PAYMENTS CRUD (E10: customerInflowWritePaths.ts) ============
  /** Invoice-targeted path — set `invoiceId` when recording against one invoice/sale-bill. */
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
      return {
        ...prev,
        payments: [paymentToStore, ...prev.payments],
        invoices: updatedInvoices,
        saleBills: updatedSaleBills,
        projects: updatedProjects,
        customers: prev.customers,
        incomes,
        accountingVouchers: (postingResult && postingResult.ok) ? [postingResult.voucher, ...prev.accountingVouchers] : prev.accountingVouchers,
        accountingReviewQueue: reviewQueueItem ? [reviewQueueItem, ...prev.accountingReviewQueue] : prev.accountingReviewQueue,
        auditLogs: [auditEntry, ...prev.auditLogs],
      };
    });
  }, [canPerformActionOrWarn, createAuditEntry, createReviewQueueItem, voucherPostingService]);
  
  const updatePayment = useCallback((id: string, updates: Partial<Payment>) => {
    if (!canPerformActionOrWarn("finance:update_payment")) return;
    setState(prev => {
      const oldPayment = prev.payments.find(p => p.id === id);
      const auditLogs =
        oldPayment != null
          ? auditFieldDiff(
              createAuditEntry,
              "Payment",
              id,
              oldPayment.counterpartyName || oldPayment.paymentMode || id,
              oldPayment as unknown as Record<string, unknown>,
              updates as unknown as Record<string, unknown>,
            )
          : [createAuditEntry("update", "Payment", id, id)];
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
        auditLogs: [...auditLogs, ...prev.auditLogs],
      };
    });
  }, [canPerformActionOrWarn, createAuditEntry]);

  const deletePayment = useCallback((id: string) => {
    if (!canPerformActionOrWarn("finance:delete_payment")) return;
    setState((prev) => {
      const result = applyPaymentDeletionToLedger({
        paymentId: id,
        payments: prev.payments,
        clientPaymentRecords: prev.clientPaymentRecords,
        invoices: prev.invoices,
        saleBills: prev.saleBills,
        projects: prev.projects,
        incomes: prev.incomes,
        customers: prev.customers,
      });
      if (!result) return prev;

      const { deletedPayment: payment } = result;
      const auditLogs: AuditLogEntry[] = [
        createAuditEntry(
          "delete",
          "Payment",
          id,
          payment.counterpartyName || payment.paymentMode || id,
          "amount",
          String(payment.amount),
          "0",
        ),
      ];
      const cprId = resolveClientPaymentRecordIdFromPayment(payment);
      if (cprId) {
        auditLogs.push(
          createAuditEntry(
            "delete",
            "ClientPaymentRecord",
            cprId,
            payment.projectName || payment.projectId || cprId,
            "amount",
            String(payment.amount),
            "0",
          ),
        );
      }

      return {
        ...prev,
        payments: result.payments,
        clientPaymentRecords: result.clientPaymentRecords,
        invoices: result.invoices,
        saleBills: result.saleBills,
        projects: result.projects,
        customers: result.customers,
        incomes: result.incomes,
        auditLogs: [...auditLogs, ...prev.auditLogs],
      };
    });
  }, [canPerformActionOrWarn, createAuditEntry]);

  const dismissAccountingReviewItem = useCallback(
    (queueItemId: string) => {
      if (!canPerformActionOrWarn("finance:record_expense_income")) {
        return;
      }
      setState((prev) => {
        const item = prev.accountingReviewQueue.find((i) => i.id === queueItemId);
        if (!item) return prev;
        const auditEntry = createAuditEntry(
          "delete",
          "AccountingReviewQueue",
          queueItemId,
          `${item.eventType} — ${item.sourceDocumentId}`,
          "amount",
          String(item.amount),
          "",
        );
        return {
          ...prev,
          accountingReviewQueue: prev.accountingReviewQueue.filter((i) => i.id !== queueItemId),
          auditLogs: [auditEntry, ...prev.auditLogs],
        };
      });
    },
    [canPerformActionOrWarn, createAuditEntry],
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
  
  const updateEmployee = useCallback((id: string, updates: Partial<Employee>) => {
    setState(prev => ({
      ...prev,
      employees: prev.employees.map(e => String(e.id) === String(id) ? { ...e, ...updates } : e),
    }));
  }, []);
  
  const deleteEmployee = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      employees: prev.employees.filter((e) => String(e.id) !== String(id)),
      attendanceRecords: prev.attendanceRecords.filter((a) => String(a.employeeId) !== String(id)),
      tasks: prev.tasks.filter((t) => String(t.employeeId) !== String(id)),
      expenses: prev.expenses.filter((e) => {
        if (e.employeeId === String(id)) return false;
        if (e.paidBy?.type === "employee" && e.paidBy?.entityId === String(id)) return false;
        if (e.allocation?.employeeId === String(id)) return false;
        return true;
      }),
      employeePayrollRecords: (prev.employeePayrollRecords ?? []).filter((r) => String(r.employeeId) !== String(id)),
      employeeWalletLedger: (prev.employeeWalletLedger ?? []).filter((r) => String(r.employeeId) !== String(id)),
      teams: prev.teams.map((team) => ({
        ...team,
        memberIds: team.memberIds.filter((mid) => String(mid) !== String(id)),
        ...(String(team.leadId) === String(id) ? { leadId: undefined } : {}),
      })),
    }));
  }, []);
  
  const getEmployeeById = useCallback((id: string) => {
    return state.employees.find(e => String(e.id) === String(id));
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
  
  const getAttendanceByEmployee = useCallback((employeeId: string) => {
    return state.attendanceRecords.filter(a => String(a.employeeId) === String(employeeId));
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
    const key = String(id).trim();
    return state.partners.find((p) => String(p.id) === key);
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
    const expenseRefs = state.expenses.filter((e) => e.loanId === id);
    const paymentRefs = state.payments.filter((p) => p.loanId === id);
    const repaymentRefs = state.loanRepayments.filter((r) => r.loanId === id);
    if (expenseRefs.length > 0 || paymentRefs.length > 0 || repaymentRefs.length > 0) {
      const parts: string[] = [];
      if (expenseRefs.length) parts.push(`${expenseRefs.length} expense(s)`);
      if (paymentRefs.length) parts.push(`${paymentRefs.length} payment(s)`);
      if (repaymentRefs.length) parts.push(`${repaymentRefs.length} repayment(s)`);
      toast({
        title: "Cannot delete loan",
        description: `Remove or reassign linked records first: ${parts.join(", ")}.`,
        variant: "destructive",
      });
      return;
    }
    setState((prev) => ({ ...prev, loans: prev.loans.filter((l) => l.id !== id) }));
  }, [canPerformActionOrWarn, state.expenses, state.payments, state.loanRepayments]);
  
  // ============ LOAN REPAYMENTS CRUD ============
  const addLoanRepayment = useCallback(
    (repayment: LoanRepayment, cashLink: LoanRepaymentCashLinkInput = { type: "payment" }) => {
      if (!canPerformActionOrWarn("loan:add_repayment")) return;
      const auditEntry = createAuditEntry(
        "create",
        "LoanRepayment",
        repayment.id,
        `Repayment for loan ${repayment.loanId}`,
      );
      setState((prev) => {
        const loan = prev.loans.find((l) => l.id === repayment.loanId);
        if (!loan) {
          return {
            ...prev,
            loanRepayments: [repayment, ...prev.loanRepayments],
            auditLogs: [auditEntry, ...prev.auditLogs],
          };
        }

        const linkResult = resolveLoanRepaymentCashLink(
          {
            payments: prev.payments,
            expenses: prev.expenses,
            vendorPayments: prev.vendorPayments ?? [],
          },
          repayment,
          loan,
          cashLink,
          { paymentId: generateId("PAY"), expenseId: generateId("EXP") },
        );

        const nextOutstanding = Math.max(
          0,
          Math.round((loan.outstanding - linkResult.repayment.principalPaid) * 100) / 100,
        );
        const nextStatus: Loan["status"] = nextOutstanding <= 0 ? "Closed" : loan.status;

        let payments = prev.payments;
        let expenses = prev.expenses;
        let vendorPayments = prev.vendorPayments ?? [];

        if (linkResult.payment) {
          payments = upsertPaymentRow(payments, linkResult.payment);
        }
        if (linkResult.expense) {
          expenses = upsertExpenseRow(expenses, linkResult.expense);
        }
        if (linkResult.vendorPayments) {
          vendorPayments = linkResult.vendorPayments;
        }

        return {
          ...prev,
          loanRepayments: [linkResult.repayment, ...prev.loanRepayments],
          loans: prev.loans.map((l) =>
            l.id === repayment.loanId ? { ...l, outstanding: nextOutstanding, status: nextStatus } : l,
          ),
          payments,
          expenses,
          vendorPayments,
          auditLogs: [auditEntry, ...prev.auditLogs],
        };
      });
    },
    [canPerformActionOrWarn, createAuditEntry, generateId],
  );
  
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

      const dropLinkedPayment =
        repayment?.linkedPaymentId &&
        prev.payments.some(
          (p) => p.id === repayment.linkedPaymentId && p.loanRepaymentId === repayment.id,
        );
      const dropLinkedExpense =
        repayment?.linkedExpenseId &&
        prev.expenses.some(
          (e) => e.id === repayment.linkedExpenseId && e.loanRepaymentId === repayment.id,
        );
      const dropLinkedVendorPayment =
        repayment?.linkedVendorPaymentId &&
        (prev.vendorPayments ?? []).some(
          (vp) => vp.id === repayment.linkedVendorPaymentId && vp.loanRepaymentId === repayment.id,
        );

      return {
        ...prev,
        loanRepayments: prev.loanRepayments.filter(r => r.id !== id),
        loans: updatedLoans,
        payments: dropLinkedPayment
          ? prev.payments.filter((p) => p.id !== repayment!.linkedPaymentId)
          : prev.payments.map((p) =>
              p.loanRepaymentId === id ? { ...p, loanRepaymentId: undefined, loanId: p.loanId } : p,
            ),
        expenses: dropLinkedExpense
          ? prev.expenses.filter((e) => e.id !== repayment!.linkedExpenseId)
          : prev.expenses.map((e) =>
              e.loanRepaymentId === id ? { ...e, loanRepaymentId: undefined } : e,
            ),
        vendorPayments: dropLinkedVendorPayment
          ? (prev.vendorPayments ?? []).filter((vp) => vp.id !== repayment!.linkedVendorPaymentId)
          : (prev.vendorPayments ?? []).map((vp) =>
              vp.loanRepaymentId === id
                ? { ...vp, loanRepaymentId: undefined, loanId: undefined }
                : vp,
            ),
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
  
  const updateVendor = useCallback((id: string, updates: Partial<Vendor>) => {
    setState((prev) => {
      const old = prev.vendors.find((v) => String(v.id) === String(id));
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
        vendors: prev.vendors.map((v) => (String(v.id) === String(id) ? { ...v, ...updates } : v)),
        auditLogs: [...logs, ...prev.auditLogs],
      };
    });
  }, [createAuditEntry]);
  
  const deleteVendor = useCallback((id: string): { ok: boolean; error?: string } => {
    if (!canFeature(actorRole, "vendor", "delete", roleMatrixOverride)) {
      const error = "Your role cannot delete vendors.";
      showPermissionDeniedToast(error);
      return { ok: false, error };
    }
    const billCount = state.vendorBills.filter((b) => String(b.vendorId) === String(id)).length;
    const paymentCount = state.vendorPayments.filter((p) => String(p.vendorId) === String(id)).length;
    if (billCount > 0 || paymentCount > 0) {
      const error = `Cannot delete vendor: ${billCount} bill(s) and ${paymentCount} payment(s) still reference this vendor.`;
      toast({ title: "Cannot delete vendor", description: error, variant: "destructive" });
      return { ok: false, error };
    }
    setState((prev) => ({
      ...prev,
      vendors: prev.vendors.filter((v) => String(v.id) !== String(id)),
      procurementNeedLines: (prev.procurementNeedLines ?? []).filter((l) => String(l.vendorId) !== String(id)),
    }));
    return { ok: true };
  }, [actorRole, roleMatrixOverride, state.vendorBills, state.vendorPayments]);

  const upsertProcurementNeedLine = useCallback((line: import("@/types/operations").ProcurementNeedLine) => {
    setState((prev) => {
      const idx = prev.procurementNeedLines.findIndex((l) => l.lineKey === line.lineKey);
      const before = idx >= 0 ? prev.procurementNeedLines[idx] : null;
      const auditLogs: AuditLogEntry[] = [];
      if (!before) {
        auditLogs.push(
          createAuditEntry(
            "create",
            "ProcurementNeedLine",
            line.id,
            `${line.materialName} × ${line.qtyNeeded}`,
          ),
        );
      } else {
        auditLogs.push(
          ...auditFieldDiff(
            createAuditEntry,
            "ProcurementNeedLine",
            line.id,
            line.materialName,
            before as Record<string, unknown>,
            line as Record<string, unknown>,
          ),
        );
      }
      if (idx >= 0) {
        const next = [...prev.procurementNeedLines];
        next[idx] = { ...next[idx], ...line };
        return {
          ...prev,
          procurementNeedLines: next,
          auditLogs: auditLogs.length ? [...auditLogs, ...prev.auditLogs] : prev.auditLogs,
        };
      }
      return {
        ...prev,
        procurementNeedLines: [line, ...prev.procurementNeedLines],
        auditLogs: [...auditLogs, ...prev.auditLogs],
      };
    });
  }, [createAuditEntry]);

  const updateProcurementNeedLine = useCallback(
    (lineKey: string, updates: Partial<import("@/types/operations").ProcurementNeedLine>) => {
      setState((prev) => {
        const before = prev.procurementNeedLines.find((l) => l.lineKey === lineKey);
        if (!before) return prev;
        const after = { ...before, ...updates };
        const auditLogs = auditFieldDiff(
          createAuditEntry,
          "ProcurementNeedLine",
          after.id,
          after.materialName,
          before as Record<string, unknown>,
          updates as Record<string, unknown>,
        );
        return {
          ...prev,
          procurementNeedLines: prev.procurementNeedLines.map((l) =>
            l.lineKey === lineKey ? after : l,
          ),
          auditLogs: auditLogs.length ? [...auditLogs, ...prev.auditLogs] : prev.auditLogs,
        };
      });
    },
    [createAuditEntry],
  );
  
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
  
  const getTasksByEmployee = useCallback((employeeId: string) => {
    return state.tasks.filter(t => String(t.employeeId) === String(employeeId));
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
      try {
        const normalized = normalizeEnquiryRecord(enquiry, state.settingsTeamMembers);
        const result = await runCommand({
          type: CREATE_ENQUIRY_COMMAND,
          actorUserId,
          actorRole,
          payload: { enquiry: normalized },
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
    [actorRole, commandBus, permissionService, repositories, state.enquiries, state.settingsTeamMembers],
  );
  
  const updateEnquiry = useCallback(
    async (id: string, updates: Partial<Enquiry>): Promise<{ ok: boolean; error?: string }> => {
      if (!permissionService.canPerformAction(actorRole, "enquiry:create", roleMatrixOverride)) {
        return { ok: false, error: `Role ${actorRole} is not allowed to update enquiries` };
      }

      if (!state.enquiries.some((e) => e.id === id)) {
        return { ok: false, error: "Enquiry not found" };
      }

      const patch = normalizeEnquiryAssignmentPatch(updates, state.settingsTeamMembers);

      try {
        const result = await runCommand({
          type: UPDATE_ENQUIRY_COMMAND,
          actorUserId,
          actorRole,
          payload: { enquiryId: id, patch },
        });

        if (!result.ok) {
          return { ok: false, error: (result as { message: string }).message };
        }

        const updated = repositories.enquiryRepository.getById(id);
        setState((prev) => ({
          ...prev,
          enquiries: updated
            ? prev.enquiries.map((e) => (e.id === id ? (updated as Enquiry) : e))
            : prev.enquiries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
          auditLogs: repositories.auditRepository.getAll() as AuditLogEntry[],
        }));

        return { ok: true };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Command failed";
        return { ok: false, error: message };
      }
    },
    [
      actorRole,
      actorUserId,
      commandBus,
      permissionService,
      repositories,
      roleMatrixOverride,
      runCommand,
      state.enquiries,
      state.settingsTeamMembers,
    ],
  );
  
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

      if (!permissionService.canPerformAction(actorRole, "enquiry:create", roleMatrixOverride)) {
        return { ok: false, error: `Role ${actorRole} is not allowed to transition enquiries` };
      }

      if (!canTransitionEnquiryStatus(enquiry.status as EnquiryStatus, nextStatus, actorRole, reason)) {
        return { ok: false, error: `Invalid transition from ${enquiry.status} to ${nextStatus}` };
      }

      if (nextStatus === "quotation_sent") {
        const hasQuotation =
          getEnquiryQuotationIds(enquiry).some((qid) => state.quotations.some((q) => q.id === qid)) ||
          state.quotations.some((q) => q.enquiryId === id);
        if (!hasQuotation) {
          return {
            ok: false,
            error: "Create and link a quotation before marking enquiry as Quotation Sent",
          };
        }
      }

      try {
        const result = await runCommand({
          type: UPDATE_ENQUIRY_STATUS_COMMAND,
          actorUserId,
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
    [actorRole, permissionService, repositories, roleMatrixOverride, runCommand, state.enquiries, state.quotations],
  );

  const convertEnquiryToCustomer = useCallback(
    async (enquiryId: string): Promise<{ ok: boolean; error?: string; customerId?: string }> => {
      if (!permissionService.canPerformAction(actorRole, "enquiry:create", roleMatrixOverride)) {
        return { ok: false, error: "Not allowed" };
      }

      if (!state.enquiries.some((e) => e.id === enquiryId)) {
        return { ok: false, error: "Enquiry not found" };
      }

      try {
        const result = await runCommand<{ enquiryId: string; customerId: string }>({
          type: CONVERT_ENQUIRY_COMMAND,
          actorUserId,
          actorRole,
          payload: { enquiryId },
        });

        if (!result.ok) {
          return { ok: false, error: (result as { message: string }).message };
        }

        const updatedEnquiry = repositories.enquiryRepository.getById(enquiryId);
        if (!updatedEnquiry) {
          return { ok: false, error: "Enquiry not found after command" };
        }

        setState((prev) => ({
          ...prev,
          enquiries: prev.enquiries.map((e) =>
            e.id === enquiryId ? (updatedEnquiry as Enquiry) : e,
          ),
          customers: repositories.customerRepository.getAll() as Customer[],
          auditLogs: repositories.auditRepository.getAll() as AuditLogEntry[],
        }));

        return { ok: true, customerId: result.result.customerId };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Conversion failed" };
      }
    },
    [
      actorRole,
      permissionService,
      repositories,
      roleMatrixOverride,
      runCommand,
      state.customers,
      state.enquiries,
    ],
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

  const deleteSite = useCallback(
    (siteId: string): { ok: boolean; error?: string } => {
      const siteKey = String(siteId);
      const taskCount = state.tasks.filter((t) => String(t.siteId) === siteKey).length;
      if (taskCount > 0) {
        return {
          ok: false,
          error: `${taskCount} task(s) reference this site. Reassign or delete them before removing the site.`,
        };
      }
      const exists = state.sites.some((s) => String(s.id) === siteKey);
      if (!exists) {
        return { ok: false, error: "Site not found" };
      }
      setState((prev) => {
        const removed = prev.sites.find((s) => String(s.id) === siteKey);
        const sites = prev.sites.filter((s) => String(s.id) !== siteKey);
        const projects = removed?.projectId
          ? syncProjectsSiteReadinessFromChecklist(prev.projects, sites, [removed.projectId])
          : prev.projects;
        return { ...prev, sites, projects };
      });
      return { ok: true };
    },
    [state.sites, state.tasks],
  );

  const addQuotationTemplate = useCallback((template: QuotationTemplate) => {
    if (!canFeature(actorRole, "template", "create", roleMatrixOverride)) {
      showPermissionDeniedToast("Your role cannot create templates.");
      return;
    }
    setState(prev => ({ ...prev, quotationTemplates: [template, ...prev.quotationTemplates] }));
  }, [actorRole, roleMatrixOverride]);

  const updateQuotationTemplate = useCallback((id: string, updates: Partial<QuotationTemplate>) => {
    if (!canFeature(actorRole, "template", "edit", roleMatrixOverride)) {
      showPermissionDeniedToast("Your role cannot edit templates.");
      return;
    }
    setState(prev => ({
      ...prev,
      quotationTemplates: prev.quotationTemplates.map(t => t.id === id ? { ...t, ...updates } : t),
    }));
  }, [actorRole, roleMatrixOverride]);

  const deleteQuotationTemplate = useCallback((id: string) => {
    if (!canFeature(actorRole, "template", "delete", roleMatrixOverride)) {
      showPermissionDeniedToast("Your role cannot delete templates.");
      return;
    }
    setState(prev => ({
      ...prev,
      quotationTemplates: prev.quotationTemplates.filter(t => t.id !== id),
    }));
  }, [actorRole, roleMatrixOverride]);

  const addSiteChecklistTemplate = useCallback((template: SiteChecklistTemplate) => {
    if (!canFeature(actorRole, "template", "create", roleMatrixOverride)) {
      showPermissionDeniedToast("Your role cannot create templates.");
      return;
    }
    setState(prev => ({
      ...prev,
      siteChecklistTemplates: [template, ...(prev.siteChecklistTemplates ?? [])],
    }));
  }, [actorRole, roleMatrixOverride]);

  const updateSiteChecklistTemplate = useCallback((id: string, updates: Partial<SiteChecklistTemplate>) => {
    if (!canFeature(actorRole, "template", "edit", roleMatrixOverride)) {
      showPermissionDeniedToast("Your role cannot edit templates.");
      return;
    }
    setState(prev => ({
      ...prev,
      siteChecklistTemplates: (prev.siteChecklistTemplates ?? []).map(t => t.id === id ? { ...t, ...updates } : t),
    }));
  }, [actorRole, roleMatrixOverride]);

  const deleteSiteChecklistTemplate = useCallback((id: string) => {
    if (!canFeature(actorRole, "template", "delete", roleMatrixOverride)) {
      showPermissionDeniedToast("Your role cannot delete templates.");
      return;
    }
    setState(prev => ({
      ...prev,
      siteChecklistTemplates: (prev.siteChecklistTemplates ?? []).filter(t => t.id !== id),
    }));
  }, [actorRole, roleMatrixOverride]);

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
      setState((prev) => {
        const before = prev.blockages.find((b) => b.id === id);
        const auditEntry =
          before != null
            ? createAuditEntry(
                "update",
                "Blockage",
                id,
                before.title || id,
                "status",
                before.status,
                "resolved",
              )
            : null;
        return {
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
                  resolutionNote: notesAppend || b.resolutionNote,
                  notes: notesAppend
                    ? `${b.notes ?? ""} | Resolution: ${notesAppend}`.trim()
                    : b.notes,
                },
          ),
          auditLogs: auditEntry ? [auditEntry, ...prev.auditLogs] : prev.auditLogs,
        };
      });
    },
    [createAuditEntry],
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

  /** Project FIFO path — CPR row + FIFO invoices + synthetic Payment (`cpr:<id>`). */
  const addClientPaymentRecord = useCallback((record: ClientPaymentRecord): boolean => {
    const project = state.projects.find((p) => p.id === record.projectId);
    if (!project) {
      toast({ title: "Cannot record payment", description: "Project not found.", variant: "destructive" });
      return false;
    }
    if (state.clientPaymentRecords.some((r) => r.id === record.id)) {
      toast({
        title: "Cannot record payment",
        description: "A payment record with this id already exists.",
        variant: "destructive",
      });
      return false;
    }
    const totalAlreadyReceived = state.clientPaymentRecords
      .filter((r) => r.projectId === record.projectId)
      .reduce((sum, r) => sum + r.amount, 0);
    const validation = validateClientPaymentRecord(
      record,
      project.contractAmount ?? 0,
      totalAlreadyReceived,
    );
    if (!validation.ok) {
      toast({
        title: "Cannot record payment",
        description: validation.reason,
        variant: "destructive",
      });
      return false;
    }

    setState((prev) => {
      const projectInvoices = prev.invoices.filter((inv) => inv.projectId === record.projectId);
      const updatedInvoices = fifoApplyClientPaymentToInvoices(
        prev.invoices,
        record.projectId,
        record.amount,
        record.date,
        record.paymentMode,
      );
      const compositeKey = clientPaymentRecordPaymentId(record.id);
      const alreadyEmitted = prev.payments.some(
        (p) => p.id === compositeKey || p.reference === compositeKey,
      );
      const paymentRow = alreadyEmitted
        ? null
        : buildClientPaymentRecordPaymentRow(record, projectInvoices[0]?.customerName);

      const updatedProjects = prev.projects.map((p) =>
        p.id === record.projectId
          ? { ...p, amountReceived: (p.amountReceived ?? 0) + record.amount }
          : p,
      );

      return {
        ...prev,
        clientPaymentRecords: [record, ...prev.clientPaymentRecords],
        invoices: updatedInvoices,
        payments: paymentRow ? [paymentRow, ...prev.payments] : prev.payments,
        projects: updatedProjects,
      };
    });
    return true;
  }, [state.clientPaymentRecords, state.projects]);

  const recordCustomerInflow = useCallback(
    (input: RecordCustomerInflowInput): boolean => {
      if (input.path === "invoice_targeted" && !canPerformActionOrWarn("finance:record_payment")) {
        return false;
      }
      if (input.path === "project_fifo" && !canPerformActionOrWarn("finance:record_payment")) {
        return false;
      }
      const ok = recordCustomerInflowDispatch(input, {
        addClientPaymentRecord,
        addPayment,
      });
      if (!ok && input.path === "invoice_targeted") {
        toast({
          title: "Cannot record payment",
          description: "Invoice-targeted payment requires invoiceId and direction 'in'.",
          variant: "destructive",
        });
      }
      return ok;
    },
    [addClientPaymentRecord, addPayment, canPerformActionOrWarn],
  );

  const updateSite = useCallback((siteNumericId: number, updates: Partial<SiteRecord>) => {
    setState((prev) => {
      let affectedProjectId: string | undefined;
      const merged = prev.sites.map((s) => {
        if (s.id !== siteNumericId) return s;
        affectedProjectId = s.projectId;
        const combined = { ...s, ...updates };
        const stripped = stripOrphanChecklistInventoryRefs(combined.checklistItems, prev.inventoryItems);
        const next = stripped !== combined.checklistItems ? { ...combined, checklistItems: stripped } : combined;
        if (next.checklistItems?.length) {
          const unknown = findUnknownChecklistInventoryIds(next.checklistItems, prev.inventoryItems);
          if (unknown.length > 0 && import.meta.env.DEV) {
            console.warn("[AppData] Site checklist references unknown inventory ids", unknown);
          }
        }
        return next;
      });
      const projects =
        updates.checklistItems !== undefined && affectedProjectId
          ? syncProjectsSiteReadinessFromChecklist(prev.projects, merged, [affectedProjectId])
          : prev.projects;
      return { ...prev, sites: merged, projects };
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
      // Phase 1.2 auto-reservation: for every new checklist line backed by an inventoryItemId
      // and a positive required qty, create a reservation row for this project.
      const now = new Date().toISOString();
      const newReservations: import("@/types/operations").MaterialReservation[] = [];
      const existingChecklistIds = new Set((site.checklistItems ?? []).map((c) => c.id));
      patched.checklistItems?.forEach((line) => {
        if (existingChecklistIds.has(line.id)) return;
        if (line.inventoryItemId == null) return;
        const qty = line.requiredQuantity ?? 0;
        if (qty <= 0) return;
        newReservations.push({
          id: `RES-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase(),
          itemId: line.inventoryItemId,
          qty,
          projectId,
          source: "auto-from-checklist",
          linkedChecklistItemId: line.id,
          createdAt: now,
        });
      });

      setState((prev) => ({
        ...prev,
        sites: prev.sites.map((s) =>
          s.projectId === projectId && s.id === siteNumericId ? patched : s,
        ),
        materialReservations: newReservations.length
          ? [...newReservations, ...(prev.materialReservations ?? [])]
          : prev.materialReservations,
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

      // Update Site Checklist Status + E5: derive siteReadiness when all lines dispatched
      setState((prev) => {
        const sites = prev.sites.map((s) => {
          if (s.projectId === projectId && s.id === siteNumericId) {
            return {
              ...s,
              checklistItems: s.checklistItems?.map((i) =>
                i.id === checklistLineId ? { ...i, status: "dispatched" as const } : i,
              ),
            };
          }
          return s;
        });
        const projects = syncProjectsSiteReadinessFromChecklist(prev.projects, sites, [projectId]);
        return { ...prev, sites, projects };
      });

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
  
  const getEmployeePaidHolidaysByMonth = useCallback((employeeId: string, month: string) => {
    return state.employeePaidHolidays.filter(h => String(h.employeeId) === String(employeeId) && h.month === month);
  }, [state.employeePaidHolidays]);
  
  const hasEmployeePaidHolidayInMonth = useCallback((employeeId: string, month: string) => {
    return state.employeePaidHolidays.some(h => String(h.employeeId) === String(employeeId) && h.month === month);
  }, [state.employeePaidHolidays]);
  
  // ============ AUDIT LOGS ============
  const addAuditLog = useCallback((entry: AuditLogEntry) => {
    setState(prev => ({ ...prev, auditLogs: [entry, ...prev.auditLogs] }));
  }, []);

  // ============ VENDOR BILLS CRUD ============
  const addVendorBill = useCallback(async (bill: VendorBill): Promise<{ ok: boolean; error?: string }> => {
    if (!canPerformActionOrWarn("vendor:record_bill")) {
      return { ok: false, error: "Permission denied" };
    }

    const receiptLines = vendorBillInventoryReceiptLines(bill);
    const appliedReceipts: VendorBillInventoryLine[] = [];

    for (const { itemId, qty } of receiptLines) {
      const movement = await recordWarehouseInventoryMovement({
        itemId,
        movementType: "PurchaseIn",
        quantity: qty,
      });
      if (!movement.ok) {
        for (const applied of [...appliedReceipts].reverse()) {
          await recordWarehouseInventoryMovement({
            itemId: applied.itemId,
            movementType: "ScrapWarehouse",
            quantity: applied.qty,
          });
        }
        return { ok: false, error: movement.error ?? "Warehouse receipt failed" };
      }
      appliedReceipts.push({ itemId, qty });
    }

    const postingResult = postVendorBillVoucher(bill, voucherPostingService);
    const reviewQueueItem = postingResult
      ? createReviewQueueItem(postingResult, bill.projectId)
      : null;
    const auditEntry = createAuditEntry("create", "VendorBill", bill.id, bill.billNumber || bill.id);
    const billWithReceipt: VendorBill = {
      ...bill,
      warehouseReceiptApplied: receiptLines.length > 0 ? true : bill.warehouseReceiptApplied,
    };

    setState((prev) => ({
      ...prev,
      vendorBills: [billWithReceipt, ...prev.vendorBills],
      vendors: prev.vendors,
      accountingVouchers:
        postingResult?.ok ? [postingResult.voucher, ...prev.accountingVouchers] : prev.accountingVouchers,
      accountingReviewQueue: reviewQueueItem
        ? [reviewQueueItem, ...prev.accountingReviewQueue]
        : prev.accountingReviewQueue,
      auditLogs: [auditEntry, ...prev.auditLogs],
    }));

    return { ok: true };
  }, [
    canPerformActionOrWarn,
    createAuditEntry,
    createReviewQueueItem,
    recordWarehouseInventoryMovement,
    voucherPostingService,
  ]);
  
  const updateVendorBill = useCallback(
    async (id: string, updates: Partial<VendorBill>) => {
      if (
        vendorBillUpdateAffectsBooks(updates) &&
        !vendorBillUpdateIsDocumentOnly(updates) &&
        !canPerformActionOrWarn("vendor:record_bill")
      ) {
        return;
      }

      let inventoryDeltas: ReturnType<typeof planVendorBillAccountingUpdate>["inventoryDeltas"] = [];
      let mergedBill: VendorBill | undefined;

      setState((prev) => {
        const existing = prev.vendorBills.find((b) => b.id === id);
        if (!existing) return prev;

        const merged: VendorBill = { ...existing, ...updates };
        mergedBill = merged;
        const auditLogs = auditFieldDiff(
          createAuditEntry,
          "VendorBill",
          id,
          existing.billNumber || id,
          existing as unknown as Record<string, unknown>,
          updates as unknown as Record<string, unknown>,
        );

        const plan = planVendorBillAccountingUpdate(
          { vouchers: prev.accountingVouchers, before: existing, after: merged },
          voucherPostingService,
        );
        inventoryDeltas = plan.inventoryDeltas;

        let accountingVouchers = prev.accountingVouchers;
        let accountingReviewQueue = prev.accountingReviewQueue;

        if (plan.stripExisting) {
          const stripped = stripVendorBillAccounting(prev, id);
          accountingVouchers = stripped.accountingVouchers;
          accountingReviewQueue = stripped.accountingReviewQueue;
        }

        for (const postingResult of plan.postings) {
          const reviewQueueItem = createReviewQueueItem(postingResult, merged.projectId);
          if (postingResult.ok) {
            accountingVouchers = [postingResult.voucher, ...accountingVouchers];
          } else if (reviewQueueItem) {
            accountingReviewQueue = [reviewQueueItem, ...accountingReviewQueue];
          }
        }

        const receiptLines = vendorBillInventoryReceiptLines(merged);
        const warehouseReceiptApplied =
          merged.warehouseReceiptApplied === false && receiptLines.length > 0
            ? true
            : merged.warehouseReceiptApplied;

        return {
          ...prev,
          vendorBills: prev.vendorBills.map((b) =>
            b.id === id ? { ...merged, warehouseReceiptApplied } : b,
          ),
          accountingVouchers,
          accountingReviewQueue,
          auditLogs: auditLogs.length > 0 ? [...auditLogs, ...prev.auditLogs] : prev.auditLogs,
        };
      });

      if (!mergedBill) return;

      for (const { itemId, deltaQty } of inventoryDeltas) {
        if (deltaQty > 0) {
          await recordWarehouseInventoryMovement({
            itemId,
            movementType: "PurchaseIn",
            quantity: deltaQty,
          });
        } else if (deltaQty < 0) {
          await recordWarehouseInventoryMovement({
            itemId,
            movementType: "ScrapWarehouse",
            quantity: Math.abs(deltaQty),
          });
        }
      }
    },
    [
      canPerformActionOrWarn,
      createAuditEntry,
      createReviewQueueItem,
      recordWarehouseInventoryMovement,
      voucherPostingService,
    ],
  );
  
  const deleteVendorBill = useCallback(
    async (id: string) => {
      if (!canFeature(actorRole, "vendorBill", "delete", roleMatrixOverride)) {
        showPermissionDeniedToast("Your role cannot delete vendor bills.");
        return;
      }

      const bill = state.vendorBills.find((b) => b.id === id);
      if (bill?.warehouseReceiptApplied === true) {
        for (const { itemId, qty } of vendorBillInventoryReceiptLines(bill)) {
          await recordWarehouseInventoryMovement({
            itemId,
            movementType: "ScrapWarehouse",
            quantity: qty,
          });
        }
      }

      setState((prev) => {
        const stripped = stripVendorBillAccounting(prev, id);
        return {
          ...prev,
          ...stripped,
          vendorBills: prev.vendorBills.filter((b) => b.id !== id),
          procurementNeedLines: (prev.procurementNeedLines ?? []).map((l) =>
            l.vendorBillId === id ? { ...l, vendorBillId: undefined } : l,
          ),
        };
      });
    },
    [actorRole, recordWarehouseInventoryMovement, roleMatrixOverride, state.vendorBills],
  );
  
  const getVendorBillsByVendor = useCallback((vendorId: string) => {
    return state.vendorBills.filter(b => String(b.vendorId) === String(vendorId));
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

  const getVendorPaymentsByVendor = useCallback((vendorId: string) => {
    return state.vendorPayments.filter(p => String(p.vendorId) === String(vendorId));
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

  const updateInventoryItem = useCallback((id: string, updates: Partial<InventoryItem>) => {
    setState(prev => ({
      ...prev,
      inventoryItems: prev.inventoryItems.map(i => String(i.id) === String(id) ? { ...i, ...updates } : i),
    }));
  }, []);

  const deleteInventoryItem = useCallback((id: string) => {
    const activeReservations = (state.materialReservations ?? []).filter(
      (r) => String(r.itemId) === String(id) && !r.releasedAt,
    );
    const damageCount = (state.materialDamageRecords ?? []).filter((d) => String(d.itemId) === String(id)).length;
    if (activeReservations.length > 0 || damageCount > 0) {
      toast({
        title: "Cannot delete item",
        description: `Clear ${activeReservations.length} active reservation(s) and ${damageCount} damage record(s) first.`,
        variant: "destructive",
      });
      return;
    }
    setState((prev) => ({
      ...prev,
      inventoryItems: prev.inventoryItems.filter((i) => String(i.id) !== String(id)),
    }));
  }, [state.materialReservations, state.materialDamageRecords]);

  /** E4: movement reversal — feature matrix `inventoryMovement` delete (not on command bus). */
  const reverseInventoryMovement = useCallback(
    (itemId: string, movementId: string, reason?: string): { ok: boolean; error?: string } => {
      if (!canReverseInventoryMovement(actorRole, roleMatrixOverride)) {
        return { ok: false, error: "INVENTORY_MOVEMENT_REVERSE_FORBIDDEN" };
      }
      let didReverse = false;
      let targetItem: InventoryItem | undefined;
      setState(prev => {
        targetItem = prev.inventoryItems.find(i => String(i.id) === String(itemId));
        const nextItems = prev.inventoryItems.map(item => {
          if (String(item.id) !== String(itemId)) return item;
          const history = item.movementHistory ?? [];
          const target = history.find(m => m.id === movementId);
          if (!target || target.reversedAt) return item;
          didReverse = true;
          const reverseQty = target.type === "issue" ? target.qty : -target.qty;
          return {
            ...item,
            stock: Math.max(0, item.stock + reverseQty),
            movementHistory: history.map(m =>
              m.id === movementId
                ? { ...m, reversedAt: new Date().toISOString(), reversalReason: reason || undefined }
                : m,
            ),
          };
        });
        if (!didReverse) return prev;
        const auditEntry = createAuditEntry(
          "update",
          "InventoryMovement",
          movementId,
          targetItem?.name ?? `Item ${itemId}`,
          "reversedAt",
          "",
          new Date().toISOString(),
        );
        return { ...prev, inventoryItems: nextItems, auditLogs: [auditEntry, ...prev.auditLogs] };
      });
      return didReverse ? { ok: true } : { ok: false, error: "Movement not found or already reversed" };
    },
    [actorRole, roleMatrixOverride, createAuditEntry],
  );

  const issueItemToSite = useCallback((
    itemId: string, siteId: string, siteName: string, qty: number, date: string,
    employeeId?: string, employeeName?: string
  ) => {
    setState(prev => ({
      ...prev,
      inventoryItems: prev.inventoryItems.map(item => {
        if (String(item.id) !== String(itemId)) return item;
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
    itemId: string, siteId: string, siteName: string, qty: number, date: string,
    condition?: string, notes?: string
  ) => {
    setState(prev => ({
      ...prev,
      inventoryItems: prev.inventoryItems.map(item => {
        if (String(item.id) !== String(itemId)) return item;
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

  const updateTool = useCallback((id: string, updates: Partial<Tool>) => {
    setState(prev => ({
      ...prev,
      tools: prev.tools.map(t => String(t.id) === String(id) ? { ...t, ...updates } : t),
    }));
  }, []);

  const deleteTool = useCallback((id: string) => {
    setState(prev => ({ ...prev, tools: prev.tools.filter(t => String(t.id) !== String(id)) }));
  }, []);

  /** E4: tool movement reversal — feature matrix `toolMovement` delete. */
  const reverseToolMovement = useCallback(
    (toolId: string, movementId: string, reason?: string): { ok: boolean; error?: string } => {
      if (!canReverseToolMovement(actorRole, roleMatrixOverride)) {
        return { ok: false, error: "TOOL_MOVEMENT_REVERSE_FORBIDDEN" };
      }
      let didReverse = false;
      let targetTool: Tool | undefined;
      setState(prev => {
        targetTool = prev.tools.find(t => String(t.id) === String(toolId));
        const nextTools = prev.tools.map(tool => {
          if (String(tool.id) !== String(toolId)) return tool;
          const history = tool.movementHistory ?? [];
          const target = history.find(m => m.id === movementId);
          if (!target || target.reversedAt) return tool;
          didReverse = true;
          const flippedStatus: Tool["status"] =
            target.type === "issue" ? "Available" : "In Use";
          return {
            ...tool,
            status: flippedStatus,
            movementHistory: history.map(m =>
              m.id === movementId
                ? { ...m, reversedAt: new Date().toISOString(), reversalReason: reason || undefined }
                : m,
            ),
          };
        });
        if (!didReverse) return prev;
        const auditEntry = createAuditEntry(
          "update",
          "ToolMovement",
          movementId,
          targetTool?.name ?? `Tool ${toolId}`,
          "reversedAt",
          "",
          new Date().toISOString(),
        );
        return { ...prev, tools: nextTools, auditLogs: [auditEntry, ...prev.auditLogs] };
      });
      return didReverse ? { ok: true } : { ok: false, error: "Movement not found or already reversed" };
    },
    [actorRole, roleMatrixOverride, createAuditEntry],
  );

  const issueTool = useCallback((
    toolId: string, siteId: string, siteName: string, date: string,
    employeeId?: string, employeeName?: string, handoffNotes?: string,
  ) => {
    const trimmed = handoffNotes?.trim();
    setState(prev => ({
      ...prev,
      tools: prev.tools.map(tool => {
        if (String(tool.id) !== String(toolId)) return tool;
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
          assignedToSiteId: siteId,
          assignedTo: employeeName ?? tool.assignedTo,
          assignedToEmployeeId: employeeId ?? tool.assignedToEmployeeId,
          lastUpdated: date,
          movementHistory: [movement, ...(tool.movementHistory ?? [])],
        };
      }),
    }));
  }, []);

  const returnTool = useCallback((
    toolId: string, condition: Tool["condition"], date: string, notes?: string
  ) => {
    setState(prev => ({
      ...prev,
      tools: prev.tools.map(tool => {
        if (String(tool.id) !== String(toolId)) return tool;
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
          assignedToSiteId: undefined,
          assignedToEmployeeId: undefined,
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

  const updateAgentCommissionPayment = useCallback(
    (id: string, updates: Partial<AgentCommissionPayment>) => {
      setState(prev => ({
        ...prev,
        agentCommissionPayments: prev.agentCommissionPayments.map(p =>
          p.id === id ? { ...p, ...updates } : p,
        ),
      }));
    },
    [],
  );

  const deleteAgentCommissionPayment = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      agentCommissionPayments: prev.agentCommissionPayments.filter(p => p.id !== id),
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

  const getPayrollByEmployee = useCallback((employeeId: string) => {
    return (state.employeePayrollRecords ?? []).filter(r => String(r.employeeId) === String(employeeId));
  }, [state.employeePayrollRecords]);

  const addEmployeeWalletLedgerEntry = useCallback(
    (entry: Omit<EmployeeWalletLedgerEntry, "id" | "createdAt">): { ok: boolean; error?: string } => {
      if (!canPerformActionOrWarn("hr:record_wallet")) {
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
    [canPerformActionOrWarn, state.employees, generateId, createAuditEntry],
  );

  const getEmployeeWalletLedger = useCallback(
    (employeeId?: string) => {
      const rows = state.employeeWalletLedger ?? [];
      if (employeeId === undefined) return rows;
      return rows.filter((r) => String(r.employeeId) === String(employeeId));
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

  const addINCGiverTransaction = useCallback((transaction: INCGiverTransaction) => {
    if (!canPerformActionOrWarn("partner:add_transaction")) return;
    const auditEntry = createAuditEntry(
      "create",
      "INCGiverTransaction",
      transaction.id,
      `${transaction.type} — ${transaction.incGiverCompanyId}`,
    );
    setState((prev) => {
      const incGiverTransactions = [transaction, ...(prev.incGiverTransactions ?? [])];
      const projectIds = projectIdsAffectedByIncTransaction(undefined, transaction);
      return {
        ...prev,
        incGiverTransactions,
        projects: applyIncGiverLedgerToProjects(
          { ...prev, incGiverTransactions },
          prev.projects,
          projectIds,
        ),
        auditLogs: [auditEntry, ...prev.auditLogs],
      };
    });
  }, [canPerformActionOrWarn, createAuditEntry]);

  const updateINCGiverTransaction = useCallback((id: string, updates: Partial<INCGiverTransaction>) => {
    if (!canPerformActionOrWarn("partner:update")) return;
    const auditEntry = createAuditEntry("update", "INCGiverTransaction", id, id);
    setState((prev) => {
      const before = (prev.incGiverTransactions ?? []).find((t) => t.id === id);
      const incGiverTransactions = (prev.incGiverTransactions ?? []).map((t) =>
        t.id === id ? { ...t, ...updates } : t,
      );
      const after = incGiverTransactions.find((t) => t.id === id);
      const projectIds = projectIdsAffectedByIncTransaction(before, after);
      return {
        ...prev,
        incGiverTransactions,
        projects: applyIncGiverLedgerToProjects(
          { ...prev, incGiverTransactions },
          prev.projects,
          projectIds,
        ),
        auditLogs: [auditEntry, ...prev.auditLogs],
      };
    });
  }, [canPerformActionOrWarn, createAuditEntry]);

  const deleteINCGiverTransaction = useCallback((id: string) => {
    if (!canPerformActionOrWarn("partner:delete")) return;
    const auditEntry = createAuditEntry("delete", "INCGiverTransaction", id, id);
    setState((prev) => {
      const before = (prev.incGiverTransactions ?? []).find((t) => t.id === id);
      const incGiverTransactions = (prev.incGiverTransactions ?? []).filter((t) => t.id !== id);
      const projectIds = projectIdsAffectedByIncTransaction(before, undefined);
      return {
        ...prev,
        incGiverTransactions,
        projects: applyIncGiverLedgerToProjects(
          { ...prev, incGiverTransactions },
          prev.projects,
          projectIds,
        ),
        auditLogs: [auditEntry, ...prev.auditLogs],
      };
    });
  }, [canPerformActionOrWarn, createAuditEntry]);

  const getTransactionsByIncGiverCompany = useCallback(
    (companyId: string) =>
      (state.incGiverTransactions ?? []).filter((t) => t.incGiverCompanyId === companyId),
    [state.incGiverTransactions],
  );

  // ============ BANK RECONCILIATION (B13 + E9) ============
  const setBankReconciliationStatements = useCallback((statements: BankReconciliationStatement[]) => {
    setState(prev => ({ ...prev, bankReconciliationStatements: statements }));
  }, []);

  const syncBankReconciliationLinksHandler = useCallback(
    (activeStatementIds: string[], matches: BankReconciliationMatchApplyInput[]) => {
      setState((prev) => {
        const synced = syncBankReconciliationLinks(
          {
            expenses: prev.expenses,
            incomes: prev.incomes,
            payments: prev.payments,
            vendorPayments: prev.vendorPayments,
          },
          activeStatementIds,
          matches,
        );
        return { ...prev, ...synced };
      });
    },
    [],
  );

  const clearBankReconciliationLinksForStatementHandler = useCallback((statementId: string) => {
    setState((prev) => ({
      ...prev,
      expenses: clearBankReconciliationLinksForStatement(prev.expenses, statementId),
      incomes: clearBankReconciliationLinksForStatement(prev.incomes, statementId),
      payments: clearBankReconciliationLinksForStatement(prev.payments, statementId),
      vendorPayments: clearBankReconciliationLinksForStatement(prev.vendorPayments, statementId),
    }));
  }, []);

  // ============ OPERATIONS ENTITIES CRUD (final-touches Phase 1.2) ============

  // ---- Material Reservations ----
  const addMaterialReservation = useCallback(
    (input: Omit<import("@/types/operations").MaterialReservation, "id" | "createdAt">) => {
      const id = `RES-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
      const row: import("@/types/operations").MaterialReservation = {
        ...input,
        id,
        createdAt: new Date().toISOString(),
      };
      const auditEntry = createAuditEntry(
        "create",
        "MaterialReservation",
        id,
        `Item ${input.itemId} × ${input.qty}`,
      );
      setState((prev) => ({
        ...prev,
        materialReservations: [row, ...(prev.materialReservations ?? [])],
        auditLogs: [auditEntry, ...prev.auditLogs],
      }));
      return id;
    },
    [createAuditEntry],
  );
  const releaseMaterialReservation = useCallback((id: string) => {
    const releasedAt = new Date().toISOString();
    const auditEntry = createAuditEntry(
      "update",
      "MaterialReservation",
      id,
      id,
      "releasedAt",
      "",
      releasedAt,
    );
    setState((prev) => ({
      ...prev,
      materialReservations: (prev.materialReservations ?? []).map((r) =>
        r.id === id && !r.releasedAt ? { ...r, releasedAt } : r,
      ),
      auditLogs: [auditEntry, ...prev.auditLogs],
    }));
  }, [createAuditEntry]);
  const reduceMaterialReservation = useCallback((id: string, deltaQty: number) => {
    setState((prev) => ({
      ...prev,
      materialReservations: (prev.materialReservations ?? []).map((r) => {
        if (r.id !== id) return r;
        const next = Math.max(0, r.qty - Math.max(0, deltaQty));
        return next === 0
          ? { ...r, qty: 0, releasedAt: new Date().toISOString() }
          : { ...r, qty: next };
      }),
    }));
  }, []);
  const getReservationsForItem = useCallback(
    (itemId: string) =>
      (state.materialReservations ?? []).filter((r) => String(r.itemId) === String(itemId) && !r.releasedAt),
    [state.materialReservations],
  );
  const getReservationsForProject = useCallback(
    (projectId: string) =>
      (state.materialReservations ?? []).filter((r) => r.projectId === projectId && !r.releasedAt),
    [state.materialReservations],
  );

  // ---- Scheduled Installations ----
  const addScheduledInstallation = useCallback(
    (input: Omit<import("@/types/operations").ScheduledInstallation, "id" | "createdAt">) => {
      const dateCheck = validateScheduledInstallationDate({
        scheduledDate: input.scheduledDate,
        isSuperAdmin: actorRole === "super_admin",
        pastOverrideReason: input.pastDateOverrideReason,
      });
      if (!dateCheck.ok) {
        toast({
          title: "Cannot schedule installation",
          description: dateCheck.message,
          variant: "destructive",
        });
        return "";
      }

      const scheduledDate = input.scheduledDate.trim().slice(0, 10);
      const conflicts = findScheduledInstallationConflicts({
        scheduledInstallations: state.scheduledInstallations ?? [],
        scheduledDate,
        projectId: input.projectId,
        teamId: input.teamId,
        employeeIds: input.employeeIds,
      });
      const conflictCheck = validateDoubleBookingOverride(
        conflicts.hasConflict,
        input.doubleBookingOverrideReason,
      );
      if (!conflictCheck.ok) {
        toast({
          title: "Cannot schedule installation",
          description: conflictCheck.message,
          variant: "destructive",
        });
        return "";
      }

      const id = `SCH-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
      const row: import("@/types/operations").ScheduledInstallation = {
        ...input,
        scheduledDate,
        pastDateOverrideReason: dateCheck.pastOverride
          ? input.pastDateOverrideReason?.trim()
          : undefined,
        doubleBookingOverrideReason: conflicts.hasConflict
          ? input.doubleBookingOverrideReason?.trim()
          : undefined,
        id,
        createdAt: new Date().toISOString(),
      };
      const auditSuffix = [
        row.pastDateOverrideReason ? "past override" : "",
        row.doubleBookingOverrideReason ? "double-booked" : "",
      ]
        .filter(Boolean)
        .join(", ");
      const auditEntry = createAuditEntry(
        "create",
        "ScheduledInstallation",
        id,
        `${input.projectId} @ ${scheduledDate}${auditSuffix ? ` (${auditSuffix})` : ""}`,
      );
      setState((prev) => ({
        ...prev,
        scheduledInstallations: [row, ...(prev.scheduledInstallations ?? [])],
        auditLogs: [auditEntry, ...prev.auditLogs],
      }));
      return id;
    },
    [createAuditEntry, actorRole, state.scheduledInstallations],
  );
  const updateScheduledInstallation = useCallback(
    (id: string, updates: Partial<import("@/types/operations").ScheduledInstallation>) => {
      if (updates.scheduledDate !== undefined) {
        setState((prev) => {
          const existing = (prev.scheduledInstallations ?? []).find((s) => s.id === id);
          const dateCheck = validateScheduledInstallationDate({
            scheduledDate: updates.scheduledDate!,
            isSuperAdmin: actorRole === "super_admin",
            pastOverrideReason:
              updates.pastDateOverrideReason ?? existing?.pastDateOverrideReason,
          });
          if (!dateCheck.ok) {
            toast({
              title: "Cannot update installation date",
              description: dateCheck.message,
              variant: "destructive",
            });
            return prev;
          }
          const scheduledDate = updates.scheduledDate!.trim().slice(0, 10);
          return {
            ...prev,
            scheduledInstallations: (prev.scheduledInstallations ?? []).map((s) =>
              s.id === id
                ? {
                    ...s,
                    ...updates,
                    scheduledDate,
                    pastDateOverrideReason: dateCheck.pastOverride
                      ? (updates.pastDateOverrideReason ?? s.pastDateOverrideReason)?.trim()
                      : undefined,
                  }
                : s,
            ),
          };
        });
        return;
      }

      setState((prev) => ({
        ...prev,
        scheduledInstallations: (prev.scheduledInstallations ?? []).map((s) =>
          s.id === id ? { ...s, ...updates } : s,
        ),
      }));
    },
    [actorRole],
  );
  const getSchedulesByProject = useCallback(
    (projectId: string) =>
      (state.scheduledInstallations ?? []).filter((s) => s.projectId === projectId),
    [state.scheduledInstallations],
  );
  const getSchedulesByDate = useCallback(
    (date: string) =>
      (state.scheduledInstallations ?? []).filter(
        (s) => s.scheduledDate.slice(0, 10) === date.slice(0, 10),
      ),
    [state.scheduledInstallations],
  );

  // ---- Site Visits ----
  const addSiteVisit = useCallback(
    (input: Omit<import("@/types/operations").SiteVisit, "id" | "createdAt">) => {
      const id = `VIS-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
      const row: import("@/types/operations").SiteVisit = {
        ...input,
        photos: sanitizePhotoUrlList(input.photos),
        id,
        createdAt: new Date().toISOString(),
      };
      const auditEntry = createAuditEntry(
        "create",
        "SiteVisit",
        input.projectId,
        `Visit ${id}`,
      );
      setState((prev) => ({
        ...prev,
        siteVisits: [row, ...(prev.siteVisits ?? [])],
        auditLogs: [auditEntry, ...prev.auditLogs],
      }));
      return id;
    },
    [createAuditEntry],
  );
  const reconcileSiteVisitToChecklist = useCallback(
    (visitId: string): { ok: boolean; error?: string } => {
      const visit = (state.siteVisits ?? []).find((v) => v.id === visitId);
      if (!visit) return { ok: false, error: "Site visit not found" };
      if (visit.reconciledChecklistAt) return { ok: false, error: "Already reconciled" };
      const project = state.projects.find((p) => p.id === visit.projectId);
      if (!project) return { ok: false, error: "Project not found" };

      const existing = project.siteChecklist ?? [];
      const additions: typeof existing = [];
      visit.items.forEach((it) => {
        if (!it.inventoryItemId) return;
        const dup = existing.find((c) => c.itemId === it.inventoryItemId);
        if (dup) return; // qty-merge handled by user in UI for now
        additions.push({
          id: `chk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          itemId: it.inventoryItemId,
          itemName: it.name,
          unit: it.unit ?? "pcs",
          qtyPlanned: it.requiredQty,
          qtySent: 0,
          qtyReturned: 0,
          qtyConsumed: 0,
          source: "site-visit",
          sourceSiteVisitId: visit.id,
        } as unknown as (typeof existing)[number]);
      });

      // Auto-create reservations for each new checklist line (Phase 1.2 wiring)
      const now = new Date().toISOString();
      const newReservations: import("@/types/operations").MaterialReservation[] = additions.map(
        (line: { id: string; itemId: string; qtyPlanned: number }) => ({
          id: `RES-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase(),
          itemId: line.itemId,
          qty: line.qtyPlanned,
          projectId: visit.projectId,
          source: "auto-from-checklist",
          linkedChecklistItemId: line.id,
          createdAt: now,
        }),
      );

      const visitAudit = createAuditEntry(
        "update",
        "SiteVisit",
        visit.projectId,
        `Visit ${visitId}`,
        "reconciledChecklistAt",
        "",
        now,
      );
      const reservationAudits = newReservations.map((r) =>
        createAuditEntry("create", "MaterialReservation", r.id, `Item ${r.itemId} × ${r.qty}`),
      );
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === visit.projectId
            ? { ...p, siteChecklist: [...(p.siteChecklist ?? []), ...additions] }
            : p,
        ),
        siteVisits: (prev.siteVisits ?? []).map((v) =>
          v.id === visitId ? { ...v, reconciledChecklistAt: now } : v,
        ),
        materialReservations: [...newReservations, ...(prev.materialReservations ?? [])],
        auditLogs: [...reservationAudits, visitAudit, ...prev.auditLogs],
      }));
      return { ok: true };
    },
    [state.projects, state.siteVisits, createAuditEntry],
  );
  const getSiteVisitsByProject = useCallback(
    (projectId: string) => (state.siteVisits ?? []).filter((v) => v.projectId === projectId),
    [state.siteVisits],
  );

  // ---- Project Change Requests ----
  const addProjectChangeRequest = useCallback(
    (
      input: Omit<
        import("@/types/operations").ProjectChangeRequest,
        "id" | "requestedAt" | "status"
      >,
    ): { ok: true; id: string } | { ok: false; error: string } => {
      const validation = validateChangeRequestDraft(input);
      if (!validation.ok) {
        return { ok: false, error: validation.message };
      }
      const id = `CR-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
      const row: import("@/types/operations").ProjectChangeRequest = {
        ...input,
        id,
        status: "draft",
        requestedAt: new Date().toISOString(),
      };
      const auditEntry = createAuditEntry(
        "create",
        "ProjectChangeRequest",
        id,
        `${input.projectId} (${input.type})`,
      );
      setState((prev) => ({
        ...prev,
        projectChangeRequests: [row, ...(prev.projectChangeRequests ?? [])],
        auditLogs: [auditEntry, ...prev.auditLogs],
      }));
      return { ok: true, id };
    },
    [createAuditEntry],
  );
  const approveProjectChangeRequest = useCallback(
    (id: string): {
      ok: boolean;
      error?: string;
      generatedInvoiceId?: string;
      generatedInvoiceNumber?: string;
    } => {
      const cr = (state.projectChangeRequests ?? []).find((r) => r.id === id);
      if (!cr) return { ok: false, error: "Change request not found" };
      if (cr.status !== "draft") return { ok: false, error: `Cannot approve from status '${cr.status}'` };
      const validation = validateChangeRequestDraft(cr);
      if (!validation.ok) return { ok: false, error: validation.message };
      const project = state.projects.find((p) => p.id === cr.projectId);
      if (!project) return { ok: false, error: "Project not found" };

      const inventoryLookup = (state.inventoryItems ?? []).map((i) => ({
        id: i.id,
        name: i.name,
        unit: i.unit,
      }));
      const { projectPatch, reservations, deltaAmount } = applyChangeRequestToProject(
        project,
        cr,
        inventoryLookup,
      );
      const oldContract = project.contractAmount ?? 0;
      const newContract = projectPatch.contractAmount ?? oldContract;
      const approvedAt = new Date().toISOString();
      const updatedProjectPreview = { ...project, ...projectPatch };

      let deltaInvoice: import("@/types/finance").Invoice | undefined;
      if (deltaAmount > 0) {
        if (!project.customerId?.trim()) {
          return { ok: false, error: "Project must have a linked customer before billing a scope change." };
        }
        const customer = state.customers.find((c) => c.id === project.customerId);
        const billing = issueChangeRequestDeltaBilling({
          project: updatedProjectPreview,
          customer,
          changeRequest: cr,
          existingInvoices: state.invoices,
          invoiceId: generateId("INV"),
          issuedAt: approvedAt.slice(0, 10),
        });
        deltaInvoice = billing?.invoice;
        const invScope = financeValidationService.validateOperationalInvoice(deltaInvoice);
        if (!invScope.ok) {
          return { ok: false, error: invScope.errors.join(" ") };
        }
        const highValueCheck = billingDirectionGuardService.validateHighValueIssuance(
          deltaInvoice.total,
          `Approved change request ${cr.id} (${cr.type})`,
        );
        if (!highValueCheck.ok) {
          return { ok: false, error: highValueCheck.error };
        }
      }

      const generatedInvoiceId = deltaInvoice?.id;

      const crAudit = createAuditEntry(
        "update",
        "ProjectChangeRequest",
        id,
        cr.projectId,
        "status",
        cr.status,
        "approved",
      );
      const contractAudit =
        newContract !== oldContract
          ? createAuditEntry(
              "update",
              "Project",
              project.id,
              project.name,
              "contractAmount",
              String(oldContract),
              String(newContract),
            )
          : null;

      const invoicePostingResult = deltaInvoice
        ? voucherPostingService.post({
            type: "InvoiceIssued",
            sourceDocumentId: deltaInvoice.id,
            amount: deltaInvoice.total,
            gstAmount: deltaInvoice.cgst + deltaInvoice.sgst + deltaInvoice.igst,
          })
        : null;

      setState((prev) => {
        const updatedProject = { ...project, ...projectPatch };
        const projectWithInvoice =
          deltaInvoice && updatedProject
            ? { ...updatedProject, ...mergeProjectInvoiceRef(updatedProject, deltaInvoice.id) }
            : updatedProject;

        const newReservations = reservations.map((r) => ({
          id: `RES-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase(),
          ...r,
          createdAt: new Date().toISOString(),
          source: "manual" as const,
        }));
        const reservationAudits = newReservations.map((r) =>
          createAuditEntry("create", "MaterialReservation", r.id, `Item ${r.itemId} × ${r.qty}`),
        );
        const invoiceAudits = deltaInvoice
          ? [
              createAuditEntry("create", "Invoice", deltaInvoice.id, deltaInvoice.invoiceNumber),
            ]
          : [];
        const reviewQueueItem =
          deltaInvoice && invoicePostingResult && !invoicePostingResult.ok
            ? createReviewQueueItem(invoicePostingResult, deltaInvoice.projectId)
            : null;
        const extraAudits = [
          crAudit,
          ...(contractAudit ? [contractAudit] : []),
          ...reservationAudits,
          ...invoiceAudits,
        ];

        const nextInvoices = deltaInvoice ? [deltaInvoice, ...prev.invoices] : prev.invoices;
        const reconciledProjects = reconcileProjectsAmountInvoiced(
          prev.projects.map((p) => (p.id === project.id ? projectWithInvoice : p)),
          nextInvoices,
          prev.saleBills,
        );

        return {
          ...prev,
          projects: reconciledProjects,
          invoices: nextInvoices,
          projectChangeRequests: (prev.projectChangeRequests ?? []).map((r) =>
            r.id === id
              ? { ...r, status: "approved" as const, approvedAt, generatedInvoiceId }
              : r,
          ),
          materialReservations: [...newReservations, ...(prev.materialReservations ?? [])],
          agentCommissionAccruals: scaleAgentAccrualsForContractChange(
            prev.agentCommissionAccruals ?? [],
            project.id,
            oldContract,
            newContract,
          ),
          accountingVouchers:
            invoicePostingResult?.ok && deltaInvoice
              ? [invoicePostingResult.voucher, ...prev.accountingVouchers]
              : prev.accountingVouchers,
          accountingReviewQueue: reviewQueueItem
            ? [reviewQueueItem, ...prev.accountingReviewQueue]
            : prev.accountingReviewQueue,
          auditLogs: [...extraAudits, ...prev.auditLogs],
        };
      });
      return {
        ok: true,
        generatedInvoiceId,
        generatedInvoiceNumber: deltaInvoice?.invoiceNumber,
      };
    },
    [
      state.projectChangeRequests,
      state.projects,
      state.inventoryItems,
      state.customers,
      state.invoices,
      createAuditEntry,
      createReviewQueueItem,
      financeValidationService,
      billingDirectionGuardService,
      voucherPostingService,
      generateId,
    ],
  );
  const rejectProjectChangeRequest = useCallback((id: string, reason?: string) => {
    const cr = (state.projectChangeRequests ?? []).find((r) => r.id === id);
    const auditEntry = cr
      ? createAuditEntry("update", "ProjectChangeRequest", id, cr.projectId, "status", cr.status, "rejected")
      : null;
    setState((prev) => ({
      ...prev,
      projectChangeRequests: (prev.projectChangeRequests ?? []).map((r) =>
        r.id === id
          ? { ...r, status: "rejected", notes: reason ? `${r.notes ?? ""}\nRejected: ${reason}`.trim() : r.notes }
          : r,
      ),
      auditLogs: auditEntry ? [auditEntry, ...prev.auditLogs] : prev.auditLogs,
    }));
  }, [state.projectChangeRequests, createAuditEntry]);
  const getChangeRequestsByProject = useCallback(
    (projectId: string) =>
      (state.projectChangeRequests ?? []).filter((r) => r.projectId === projectId),
    [state.projectChangeRequests],
  );

  // ---- Material Damage ----
  const addMaterialDamage = useCallback(
    (input: Omit<import("@/types/operations").MaterialDamage, "id" | "reportedAt">) => {
      const gate = validateMaterialDamageForm({
        qty: String(input.qty),
        costImpact: input.costImpact != null ? String(input.costImpact) : "",
        notes: input.notes ?? "",
      });
      if (!gate.ok) {
        toast({ title: "Cannot report damage", description: gate.message, variant: "destructive" });
        return "";
      }
      const id = `DMG-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
      const row: import("@/types/operations").MaterialDamage = {
        ...input,
        id,
        reportedAt: new Date().toISOString(),
      };
      setState((prev) => {
        const inventoryItems = prev.inventoryItems.map((item) =>
          item.id === input.itemId
            ? { ...item, stock: Math.max(0, item.stock - input.qty) }
            : item,
        );
        let accountingVouchers = prev.accountingVouchers;
        if (input.costImpact && input.costImpact > 0) {
          const posting = voucherPostingService.post({
            type: "ExpenseRecorded",
            sourceDocumentId: id,
            amount: input.costImpact,
          });
          if (posting.ok) {
            accountingVouchers = [posting.voucher, ...accountingVouchers];
          }
        }
        const auditEntry = createAuditEntry(
          "create",
          "MaterialDamage",
          id,
          `Item ${input.itemId} × ${input.qty} (${input.stage})`,
        );
        return {
          ...prev,
          materialDamageRecords: [row, ...(prev.materialDamageRecords ?? [])],
          inventoryItems,
          accountingVouchers,
          auditLogs: [auditEntry, ...prev.auditLogs],
        };
      });
      return id;
    },
    [voucherPostingService, createAuditEntry],
  );
  const getDamageByProject = useCallback(
    (projectId: string) =>
      (state.materialDamageRecords ?? []).filter((d) => d.projectId === projectId),
    [state.materialDamageRecords],
  );
  const getDamageByItem = useCallback(
    (itemId: string) =>
      (state.materialDamageRecords ?? []).filter((d) => String(d.itemId) === String(itemId)),
    [state.materialDamageRecords],
  );

  // ---- Agent Commission Accruals ----
  const addAgentCommissionAccrual = useCallback(
    (
      input: Omit<
        import("@/types/operations").AgentCommissionAccrual,
        "id" | "accruedAt" | "status"
      >,
    ) => {
      const id = `ACC-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
      const row: import("@/types/operations").AgentCommissionAccrual = {
        ...input,
        id,
        status: "pending",
        accruedAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        agentCommissionAccruals: [row, ...(prev.agentCommissionAccruals ?? [])],
      }));
      return id;
    },
    [],
  );
  const markAccrualPayable = useCallback((id: string) => {
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      agentCommissionAccruals: (prev.agentCommissionAccruals ?? []).map((a) =>
        a.id === id && a.status === "pending" ? { ...a, status: "payable", payableAt: now } : a,
      ),
    }));
  }, []);
  const markProjectCommissionAccrualsPayable = useCallback(
    (projectId: string, quotationId?: string) => {
      setState((prev) => ({
        ...prev,
        agentCommissionAccruals: markProjectAccrualsPayable(
          prev.agentCommissionAccruals ?? [],
          projectId,
          quotationId,
        ),
      }));
    },
    [],
  );
  const markAccrualPaid = useCallback((id: string, paymentId: string) => {
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      agentCommissionAccruals: (prev.agentCommissionAccruals ?? []).map((a) =>
        a.id === id && a.status !== "paid"
          ? { ...a, status: "paid", paidAt: now, linkedPaymentId: paymentId }
          : a,
      ),
    }));
  }, []);
  const getAccrualsByAgent = useCallback(
    (agentId: string) =>
      (state.agentCommissionAccruals ?? []).filter((a) => a.agentId === agentId),
    [state.agentCommissionAccruals],
  );
  const getAccrualsByProject = useCallback(
    (projectId: string) =>
      (state.agentCommissionAccruals ?? []).filter((a) => a.projectId === projectId),
    [state.agentCommissionAccruals],
  );

  // ============ DERIVED VALUES ============
  const lowStockItems = useMemo(
    () => (state.inventoryItems ?? []).filter((i) => i.stock <= i.minStock),
    [state.inventoryItems],
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
    withdrawQuotation,

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
    
    // Payments (E10 — customerInflowWritePaths.ts)
    addPayment,
    recordCustomerInflow,
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
    upsertProcurementNeedLine,
    updateProcurementNeedLine,
    
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
    deleteSite,
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
    reverseInventoryMovement,
    issueItemToSite,
    returnItemFromSite,

    // Tools CRUD
    addTool,
    updateTool,
    deleteTool,
    reverseToolMovement,
    issueTool,
    returnTool,

    // Agent Commission Payments
    addAgentCommissionPayment,
    updateAgentCommissionPayment,
    deleteAgentCommissionPayment,
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
    addINCGiverTransaction,
    updateINCGiverTransaction,
    deleteINCGiverTransaction,
    getTransactionsByIncGiverCompany,

    // Bank reconciliation (B13 + E9)
    setBankReconciliationStatements,
    syncBankReconciliationLinks: syncBankReconciliationLinksHandler,
    clearBankReconciliationLinksForStatement: clearBankReconciliationLinksForStatementHandler,

    // Operations entities (Phase 1.2)
    addMaterialReservation,
    releaseMaterialReservation,
    reduceMaterialReservation,
    getReservationsForItem,
    getReservationsForProject,
    addScheduledInstallation,
    updateScheduledInstallation,
    getSchedulesByProject,
    getSchedulesByDate,
    addSiteVisit,
    reconcileSiteVisitToChecklist,
    getSiteVisitsByProject,
    addProjectChangeRequest,
    approveProjectChangeRequest,
    rejectProjectChangeRequest,
    getChangeRequestsByProject,
    addMaterialDamage,
    getDamageByProject,
    getDamageByItem,
    addAgentCommissionAccrual,
    markAccrualPayable,
    markProjectCommissionAccrualsPayable,
    markAccrualPaid,
    getAccrualsByAgent,
    getAccrualsByProject,

    // Utilities
    generateId,
    allocateCustomerId,
    resetToDefaults,
    loadBusinessSeed,
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
