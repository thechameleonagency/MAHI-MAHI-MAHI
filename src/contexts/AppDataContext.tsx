import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import type { Project, Employee, AttendanceRecord, Quotation, InventoryItem, Tool, Vendor, InventoryPreset, ServicePreset as ProjectServicePreset, Task, QuotationVisibilityPreset, Enquiry, SiteRecord } from "@/types/project";
import type { QuotationTemplate, SiteChecklistTemplate } from "@/types/templates";
import type { Customer, Invoice, Expense, Income, Partner, PartnerTransaction, Loan, LoanRepayment, Payment, ServicePreset, OwnerInvestment, EmployeePaidHoliday, Agent, AuditLogEntry, AccountingReviewQueueItem, AccountingVoucher } from "@/types/finance";
import type { Blockage, Ticket, DeletionRequest, ProjectTimelineStatus, ClientPaymentRecord } from "@/types/blockage";
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
  dummyDeletionRequests,
  dummyClientPaymentRecords,
  dummyEnquiries,
  dummyInventoryPresets,
  dummyQuotationVisibilityPresets,
  dummyAgents,
  dummyIncomes,
  dummyAuditLogs,
} from "@/data/dummyData";
import {
  initialOperationalBlockages,
  initialOperationalTickets,
  initialProjectTimelineByProjectId,
} from "@/data/activeSitesSeed";
import { findUnknownChecklistInventoryIds, siteWithChecklistFromTemplate } from "@/lib/siteChecklist";
import { dummyQuotationTemplates, dummySiteChecklistTemplates } from "@/data/templatesData";
import { dummyInventoryItems, dummyTools, dummyVendorBills, dummyVendorPayments, type VendorBill, type VendorPayment } from "@/data/inventoryData";
import { canTransitionEnquiryStatus, type EnquiryStatus } from "@/domain/stateMachines/enquiryStateMachine";
import { canTransitionQuotationStatus, type QuotationStatus } from "@/domain/stateMachines/quotationStateMachine";
import { canTransitionProjectStatus, type ProjectLifecycleStatus } from "@/domain/stateMachines/projectStateMachine";
import type { AppAction } from "@/domain/policies/permissionMatrix";
import { UnifiedFinanceValidationService } from "@/application/services/UnifiedFinanceValidationService";
import { VoucherPostingService, type AccountingEventType } from "@/application/services/VoucherPostingService";
import type { MovementType } from "@/application/services/InventoryMovementService";
import { toast } from "@/hooks/use-toast";
import { useFoundation } from "@/app/providers/FoundationProvider";
import { CREATE_ENQUIRY_COMMAND, UPDATE_ENQUIRY_STATUS_COMMAND, CONVERT_ENQUIRY_COMMAND, type ConvertEnquiryPayload } from "@/application/commands/enquiry/registerEnquiryCommands";
import {
  CREATE_QUOTATION_COMMAND,
  TRANSITION_QUOTATION_STATUS_COMMAND,
  UPDATE_QUOTATION_COMMAND,
} from "@/application/commands/quotation/registerQuotationCommands";
import { createCommercialSnapshot } from "@/domain/quotation/applyQuotationPatch";
import {
  CREATE_PROJECT_FROM_QUOTATION_COMMAND,
  CREATE_PROJECT_INTAKE_COMMAND,
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
  inventoryPresets: InventoryPreset[];
  /** Master quotation boilerplates (materials + services). */
  quotationTemplates: QuotationTemplate[];
  /** Site dispatch templates (materials only). */
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
  updateProject: (id: string, updates: Partial<Project>) => void;
  recordProjectMaterialMovement: (input: {
    projectId: string;
    itemId: number;
    movementType: MovementType;
    quantity: number;
    allowNegativeSiteBalanceOverride?: boolean;
    baselineLineId?: string;
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
  addExpense: (expense: Expense) => void;
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
  
  // Partners CRUD
  addPartner: (partner: Partner) => void;
  updatePartner: (id: string, updates: Partial<Partner>) => void;
  deletePartner: (id: string) => void;
  getPartnerById: (id: string) => Partner | undefined;
  
  // Partner Transactions CRUD
  addPartnerTransaction: (transaction: PartnerTransaction) => void;
  getTransactionsByPartner: (partnerId: string) => PartnerTransaction[];
  
  // Partners CRUD
  addPartner: (partner: Partner) => void;
  updatePartner: (id: string, updates: Partial<Partner>) => void;
  deletePartner: (id: string) => void;
  getPartnerById: (id: string) => Partner | undefined;
  
  // Partner Transactions CRUD
  addPartnerTransaction: (transaction: PartnerTransaction) => void;
  getTransactionsByPartner: (partnerId: string) => PartnerTransaction[];
  
  // Loans CRUD
  addLoan: (loan: Loan) => void;
  updateLoan: (id: string, updates: Partial<Loan>) => void;
  deleteLoan: (id: string) => void;
  
  // Loan Repayments CRUD
  addLoanRepayment: (repayment: LoanRepayment) => void;
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
  getVendorPaymentsByVendor: (vendorId: number) => VendorPayment[];
  
  // Service Presets CRUD
  addServicePreset: (preset: ServicePreset) => void;
  updateServicePreset: (id: string, updates: Partial<ServicePreset>) => void;
  deleteServicePreset: (id: string) => void;
  getServicePresetById: (id: string) => ServicePreset | undefined;
  
  // Inventory Presets CRUD
  addInventoryPreset: (preset: InventoryPreset) => void;
  updateInventoryPreset: (id: string, updates: Partial<InventoryPreset>) => void;
  deleteInventoryPreset: (id: string) => void;
  getInventoryPresetById: (id: string) => InventoryPreset | undefined;
  
  // Quotation Visibility Presets CRUD
  addQuotationVisibilityPreset: (preset: QuotationVisibilityPreset) => void;
  updateQuotationVisibilityPreset: (id: string, updates: Partial<QuotationVisibilityPreset>) => void;
  deleteQuotationVisibilityPreset: (id: string) => void;
  
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

  // Utility functions
  generateId: (prefix: string) => string;
  resetToDefaults: () => void;
}

const STORAGE_KEY = "mahi_solar_app_data";
const DEFAULT_ACTOR_ROLE = "admin";
const toProjectLifecycleStatus = (status: Project["status"]): ProjectLifecycleStatus => {
  if (status === "Completed") {
    return "Completed";
  }
  if (status === "On Hold") {
    return "On Hold";
  }
  return "In Progress";
};

// ============ INITIAL STATE ============
function buildAppStateFromSeeds(): AppState {
  const customers = dummyCustomers;
  const projects = hydrateProjectLinkage(dummyProjects, customers);
  const quotations = hydrateQuotationLinkage(dummyQuotations, customers);
  const invoices = hydrateInvoiceLinkage(dummyInvoices, customers, projects);
  const saleBills = hydrateInvoiceLinkage(dummySaleBills, customers, projects);
  return {
    projects,
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
    inventoryPresets: dummyInventoryPresets,
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
    auditLogs: dummyAuditLogs,
    accountingVouchers: [],
    accountingReviewQueue: [],
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
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = deserializeState(stored);
      if (parsed) return parsed;
    }
  } catch (e) {
    console.warn("Failed to load persisted state:", e);
  }
  return buildAppStateFromSeeds();
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
      console.warn(`Blocked action ${action} for role ${actorRole}`);
    }
    return allowed;
  }, [actorRole, permissionService]);
  
  // ============ PERSIST STATE TO LOCALSTORAGE ============
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serializeState(state));
    } catch (e) {
      console.warn("Failed to persist state:", e);
    }
  }, [state]);
  
  // Generate unique IDs
  const generateId = useCallback((prefix: string) => {
    return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
  }, []);
  
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
          return { ok: false, error: (result as any).message };
        }
        const projectId = result.result?.projectId;
        setState((prev) => ({
          ...prev,
          projects: repositories.projectRepository.getAll() as Project[],
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
          return { ok: false, error: (result as any).message };
        }
        const projectId = result.result?.projectId;
        setState((prev) => ({
          ...prev,
          projects: repositories.projectRepository.getAll() as Project[],
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

        const nextStatus = updates.status;
        if (nextStatus && nextStatus !== project.status) {
          const currentLifecycle = toProjectLifecycleStatus(project.status);
          const nextLifecycle = toProjectLifecycleStatus(nextStatus);
          const canTransition = canTransitionProjectStatus(currentLifecycle, nextLifecycle, actorRole);
          if (!canTransition) {
            console.warn(`Blocked project status transition ${project.status} -> ${nextStatus} for role ${actorRole}`);
            return project;
          }
          if (nextStatus === "Completed") {
            const { ok, reasons } = projectInvariantService.canMarkCompleted(id, {
              projects: prev.projects,
              invoices: prev.invoices,
              saleBills: prev.saleBills,
              expenses: prev.expenses,
              incomes: prev.incomes,
              blockages: prev.blockages,
              accountingReviewQueue: prev.accountingReviewQueue,
              attendanceRecords: prev.attendanceRecords,
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

        return { ...project, ...updates };
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
          },
        });
        if (!result.ok) {
          return { ok: false, error: (result as any).message };
        }
        setState((prev) => ({
          ...prev,
          projects: repositories.projectRepository.getAll() as Project[],
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
          return { ok: false, error: (result as any).message };
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
    setState(prev => ({ 
      ...prev, 
      projects: prev.projects.filter(p => p.id !== id),
      invoices: prev.invoices.filter(i => i.projectId !== id),
      saleBills: prev.saleBills.filter(s => s.projectId !== id),
      tasks: prev.tasks.filter(t => t.projectId !== id),
      expenses: prev.expenses.filter(e => e.projectId !== id),
      incomes: prev.incomes.filter(i => i.projectId !== id),
      payments: prev.payments.filter(p => p.projectId !== id),
    }));
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
          return { ok: false, error: (result as any).message };
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
          return { ok: false, error: (result as any).message };
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
          return { ok: false, error: (result as any).message };
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
    setState(prev => ({
      ...prev,
      customers: prev.customers.map(c => c.id === id ? { ...c, ...updates } : c),
    }));
  }, []);
  
  const deleteCustomer = useCallback((id: string) => {
    setState(prev => ({ 
      ...prev, 
      customers: prev.customers.filter(c => c.id !== id),
      projects: prev.projects.filter(p => p.customerId !== id),
      quotations: prev.quotations.filter(q => q.customerId !== id),
      invoices: prev.invoices.filter(i => i.customerId !== id),
      saleBills: prev.saleBills.filter(s => s.customerId !== id),
    }));
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

    setState(prev => ({
      ...prev,
      invoices: [invoice, ...prev.invoices],
      accountingVouchers: postingResult.ok ? [postingResult.voucher, ...prev.accountingVouchers] : prev.accountingVouchers,
      accountingReviewQueue: !postingResult.ok
        ? [
            {
              id: generateId("ARQ"),
              reason: (postingResult as any).reviewQueueItem.reason,
              eventType: (postingResult as any).reviewQueueItem.event.type,
              sourceDocumentId: (postingResult as any).reviewQueueItem.event.sourceDocumentId,
              projectId: invoice.projectId,
              amount: (postingResult as any).reviewQueueItem.event.amount,
              createdAt: new Date().toISOString(),
            },
            ...prev.accountingReviewQueue,
          ]
        : prev.accountingReviewQueue,
    }));
  }, [canPerformActionOrWarn, financeValidationService, generateId, voucherPostingService]);
  
  const updateInvoice = useCallback((id: string, updates: Partial<Invoice>) => {
    setState(prev => ({
      ...prev,
      invoices: prev.invoices.map(i => i.id === id ? { ...i, ...updates } : i),
    }));
  }, []);
  
  const deleteInvoice = useCallback((id: string) => {
    setState(prev => ({ ...prev, invoices: prev.invoices.filter(i => i.id !== id) }));
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

    setState((prev) => ({
      ...prev,
      saleBills: [saleBill, ...prev.saleBills],
      accountingVouchers: postingResult.ok ? [postingResult.voucher, ...prev.accountingVouchers] : prev.accountingVouchers,
      accountingReviewQueue: !postingResult.ok
        ? [
            {
              id: generateId("ARQ"),
              reason: (postingResult as any).reviewQueueItem.reason,
              eventType: (postingResult as any).reviewQueueItem.event.type,
              sourceDocumentId: (postingResult as any).reviewQueueItem.event.sourceDocumentId,
              projectId: saleBill.projectId,
              amount: (postingResult as any).reviewQueueItem.event.amount,
              createdAt: new Date().toISOString(),
            },
            ...prev.accountingReviewQueue,
          ]
        : prev.accountingReviewQueue,
    }));
  }, [canPerformActionOrWarn, financeValidationService, generateId, voucherPostingService]);
  
  const updateSaleBill = useCallback((id: string, updates: Partial<Invoice>) => {
    setState(prev => ({
      ...prev,
      saleBills: prev.saleBills.map(s => s.id === id ? { ...s, ...updates } : s),
    }));
  }, []);
  
  const deleteSaleBill = useCallback((id: string) => {
    setState(prev => ({ ...prev, saleBills: prev.saleBills.filter(s => s.id !== id) }));
  }, []);
  
  // ============ EXPENSES CRUD ============
  const addExpense = useCallback((expense: Expense) => {
    if (!canPerformActionOrWarn("finance:record_expense_income")) {
      return;
    }
    const mainCategory = expense.mainCategory === "site" ? "site_project" : (expense.mainCategory || "company");
    const validation = financeValidationService.validateExpense(mainCategory as any, {
      projectId: expense.projectId,
      employeeId: expense.employeeId,
      partnerId: expense.paidBy.type === "partner" ? expense.paidBy.entityId : undefined,
      vendorId: expense.vendorId,
      month: expense.billingMonth,
      quantity: expense.quantity,
    });

    if (!validation.ok) {
      return;
    }

    const postingResult = voucherPostingService.post({
      type: "ExpenseRecorded",
      sourceDocumentId: expense.id,
      amount: expense.amount,
    });

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

      const newReviewQueue = !postingResult.ok ? [
        {
          id: generateId("ARQ"),
          reason: (postingResult as any).reviewQueueItem.reason,
          eventType: (postingResult as any).reviewQueueItem.event.type,
          sourceDocumentId: (postingResult as any).reviewQueueItem.event.sourceDocumentId,
          projectId: expense.projectId,
          amount: (postingResult as any).reviewQueueItem.event.amount,
          createdAt: new Date().toISOString(),
        },
        ...prev.accountingReviewQueue,
      ] : prev.accountingReviewQueue;

      return {
        ...prev,
        expenses: nextExpenses,
        projects: nextProjects,
        accountingVouchers: postingResult.ok ? [postingResult.voucher, ...prev.accountingVouchers] : prev.accountingVouchers,
        accountingReviewQueue: newReviewQueue,
      };
    });
  }, [canPerformActionOrWarn, financeValidationService, generateId, voucherPostingService]);
  
  const updateExpense = useCallback((id: string, updates: Partial<Expense>) => {
    setState(prev => {
      const oldExpense = prev.expenses.find(e => e.id === id);
      if (!oldExpense) {
        return {
          ...prev,
          expenses: prev.expenses.map(e => e.id === id ? { ...e, ...updates } : e),
        };
      }
      const nextExpense: Expense = { ...oldExpense, ...updates };
      const reconcileProjects =
        oldExpense.projectId || nextExpense.projectId;

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
      };
    });
  }, []);
  
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

    setState(prev => ({ ...prev, incomes: [income, ...prev.incomes] }));
  }, [canPerformActionOrWarn, financeValidationService]);
  
  const updateIncome = useCallback((id: string, updates: Partial<Income>) => {
    setState(prev => ({
      ...prev,
      incomes: prev.incomes.map(i => i.id === id ? { ...i, ...updates } : i),
    }));
  }, []);
  
  const deleteIncome = useCallback((id: string) => {
    setState(prev => ({ ...prev, incomes: prev.incomes.filter(i => i.id !== id) }));
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

    setState(prev => {
      const newReviewQueue = (postingResult && !postingResult.ok) ? [
        {
          id: generateId("ARQ"),
          reason: (postingResult as any).reviewQueueItem.reason,
          eventType: (postingResult as any).reviewQueueItem.event.type,
          sourceDocumentId: (postingResult as any).reviewQueueItem.event.sourceDocumentId,
          projectId: payment.projectId || (payment.invoiceId ? prev.invoices.find((x) => x.id === payment.invoiceId)?.projectId : undefined),
          amount: (postingResult as any).reviewQueueItem.event.amount,
          createdAt: new Date().toISOString(),
        },
        ...prev.accountingReviewQueue,
      ] : prev.accountingReviewQueue;

      return {
        ...prev,
        payments: [payment, ...prev.payments],
        accountingVouchers: (postingResult && postingResult.ok) ? [postingResult.voucher, ...prev.accountingVouchers] : prev.accountingVouchers,
        accountingReviewQueue: newReviewQueue,
      };
    });
  }, [canPerformActionOrWarn, generateId, state.invoices, voucherPostingService]);
  
  const updatePayment = useCallback((id: string, updates: Partial<Payment>) => {
    setState(prev => ({
      ...prev,
      payments: prev.payments.map(p => p.id === id ? { ...p, ...updates } : p),
    }));
  }, []);
  
  const deletePayment = useCallback((id: string) => {
    setState(prev => ({ ...prev, payments: prev.payments.filter(p => p.id !== id) }));
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
        toast({
          title: "Retry still failed",
          description: (postingResult as any).reviewQueueItem.reason,
          variant: "destructive",
        });
        return { ok: false, error: (postingResult as any).reviewQueueItem.reason };
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
    setState(prev => ({ ...prev, employees: prev.employees.filter(e => e.id !== id) }));
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
  
  // ============ PARTNERS CRUD ============
  const addPartner = useCallback((partner: Partner) => {
    setState(prev => ({ ...prev, partners: [partner, ...prev.partners] }));
  }, []);
  
  const updatePartner = useCallback((id: string, updates: Partial<Partner>) => {
    setState(prev => ({
      ...prev,
      partners: prev.partners.map(p => p.id === id ? { ...p, ...updates } : p),
    }));
  }, []);
  
  const deletePartner = useCallback((id: string) => {
    setState(prev => ({ ...prev, partners: prev.partners.filter(p => p.id !== id) }));
  }, []);
  
  const getPartnerById = useCallback((id: string) => {
    return state.partners.find(p => p.id === id);
  }, [state.partners]);
  
  // ============ PARTNER TRANSACTIONS CRUD ============
  const addPartnerTransaction = useCallback((transaction: PartnerTransaction) => {
    setState(prev => ({ ...prev, partnerTransactions: [transaction, ...prev.partnerTransactions] }));
  }, []);
  
  const getTransactionsByPartner = useCallback((partnerId: string) => {
    return state.partnerTransactions.filter(t => t.partnerId === partnerId);
  }, [state.partnerTransactions]);
  
  // ============ LOANS CRUD ============
  const addLoan = useCallback((loan: Loan) => {
    setState(prev => ({ ...prev, loans: [loan, ...prev.loans] }));
  }, []);
  
  const updateLoan = useCallback((id: string, updates: Partial<Loan>) => {
    setState(prev => ({
      ...prev,
      loans: prev.loans.map(l => l.id === id ? { ...l, ...updates } : l),
    }));
  }, []);
  
  const deleteLoan = useCallback((id: string) => {
    setState(prev => ({ ...prev, loans: prev.loans.filter(l => l.id !== id) }));
  }, []);
  
  // ============ LOAN REPAYMENTS CRUD ============
  const addLoanRepayment = useCallback((repayment: LoanRepayment) => {
    setState(prev => ({ ...prev, loanRepayments: [repayment, ...prev.loanRepayments] }));
  }, []);
  
  const getRepaymentsByLoan = useCallback((loanId: string) => {
    return state.loanRepayments.filter(r => r.loanId === loanId);
  }, [state.loanRepayments]);
  
  // ============ VENDORS CRUD ============
  const addVendor = useCallback((vendor: Vendor) => {
    setState(prev => ({ ...prev, vendors: [vendor, ...prev.vendors] }));
  }, []);
  
  const updateVendor = useCallback((id: number, updates: Partial<Vendor>) => {
    setState(prev => ({
      ...prev,
      vendors: prev.vendors.map(v => v.id === id ? { ...v, ...updates } : v),
    }));
  }, []);
  
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
  
  // ============ INVENTORY PRESETS CRUD ============
  const addInventoryPreset = useCallback((preset: InventoryPreset) => {
    setState(prev => ({ ...prev, inventoryPresets: [preset, ...prev.inventoryPresets] }));
  }, []);
  
  const updateInventoryPreset = useCallback((id: string, updates: Partial<InventoryPreset>) => {
    setState(prev => ({
      ...prev,
      inventoryPresets: prev.inventoryPresets.map(p => p.id === id ? { ...p, ...updates } : p),
    }));
  }, []);
  
  const deleteInventoryPreset = useCallback((id: string) => {
    setState(prev => ({ ...prev, inventoryPresets: prev.inventoryPresets.filter(p => p.id !== id) }));
  }, []);
  
  const getInventoryPresetById = useCallback((id: string) => {
    return state.inventoryPresets.find(p => p.id === id);
  }, [state.inventoryPresets]);
  
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
        let timelineUpdates: Partial<ProjectTimelineStatus> = {};

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
          return { ok: false, error: (result as any).message };
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
          return { ok: false, error: (result as any).message };
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
    async (enquiryId: string): Promise<{ ok: boolean; customerId?: string; error?: string }> => {
      if (!permissionService.canPerformAction(actorRole, "enquiry:create")) {
        return { ok: false, error: "Not allowed" };
      }
      
      repositories.enquiryRepository.replaceAll(state.enquiries);
      repositories.customerRepository.replaceAll(state.customers);
      
      try {
        const result = await commandBus.execute<ConvertEnquiryPayload, { customerId: string }>({
          type: CONVERT_ENQUIRY_COMMAND,
          actorUserId: "prototype-user",
          actorRole,
          payload: { enquiryId },
        });
        
        if (!result.ok) {
          return { ok: false, error: (result as any).message };
        }
        
        const customerId = result.result?.customerId;
        if (!customerId) return { ok: false, error: "Customer creation failed" };
        
        const newCustomer = repositories.customerRepository.getById(customerId);
        
        setState(prev => ({
          ...prev,
          enquiries: prev.enquiries.map(e => e.id === enquiryId ? { ...e, status: "converted" } : e),
          customers: newCustomer ? [newCustomer as Customer, ...prev.customers] : prev.customers,
          auditLogs: repositories.auditRepository.getAll() as AuditLogEntry[],
        }));
        
        return { ok: true, customerId };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Conversion failed" };
      }
    },
    [actorRole, commandBus, permissionService, repositories, state.enquiries, state.customers]
  );
  
  // ============ AGENTS CRUD ============
  const addAgent = useCallback((agent: Agent) => {
    setState(prev => ({ ...prev, agents: [agent, ...prev.agents] }));
  }, []);
  
  const updateAgent = useCallback((id: string, updates: Partial<Agent>) => {
    setState(prev => ({
      ...prev,
      agents: prev.agents.map(a => a.id === id ? { ...a, ...updates } : a),
    }));
  }, []);
  
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
      const nid = `${generateId("BLK")}-${Math.random().toString(36).slice(2, 6)}`;
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
    setState((prev) => ({
      ...prev,
      clientPaymentRecords: [record, ...prev.clientPaymentRecords],
    }));
  }, []);

  const updateSite = useCallback((siteNumericId: number, updates: Partial<SiteRecord>) => {
    setState((prev) => {
      const merged = prev.sites.map((s) => (s.id === siteNumericId ? { ...s, ...updates } : s));
      const row = merged.find((s) => s.id === siteNumericId);
      if (row?.checklistItems?.length) {
        const unknown = findUnknownChecklistInventoryIds(row.checklistItems, prev.inventoryItems);
        if (unknown.length > 0) {
          console.warn("[AppData] Site checklist references unknown inventory ids", unknown);
        }
      }
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
    [state.sites, recordProjectMaterialMovement],
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
    setState(prev => ({ ...prev, vendorBills: [bill, ...prev.vendorBills] }));
  }, []);
  
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
    setState(prev => ({ ...prev, vendorPayments: [payment, ...prev.vendorPayments] }));
  }, []);
  
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
  
  // ============ CONTEXT VALUE ============
  const value: AppDataContextType = {
    ...state,
    
    // Projects
    createProjectFromConfirmedQuotation,
    createProjectIntake,
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
    
    // Partners
    addPartner,
    updatePartner,
    deletePartner,
    getPartnerById,
    
    // Partner Transactions
    addPartnerTransaction,
    getTransactionsByPartner,
    
    // Loans
    addLoan,
    updateLoan,
    deleteLoan,
    
    // Loan Repayments
    addLoanRepayment,
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
    getVendorPaymentsByVendor,
    
    // Service Presets
    addServicePreset,
    updateServicePreset,
    deleteServicePreset,
    getServicePresetById,
    
    // Inventory Presets
    addInventoryPreset,
    updateInventoryPreset,
    deleteInventoryPreset,
    getInventoryPresetById,
    
    // Quotation Visibility Presets
    addQuotationVisibilityPreset,
    updateQuotationVisibilityPreset,
    deleteQuotationVisibilityPreset,
    
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

    // Utilities
    generateId,
    resetToDefaults,
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
