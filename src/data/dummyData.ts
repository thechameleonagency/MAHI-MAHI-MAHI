import type {
  AttendanceRecord,
  Employee,
  Enquiry,
  InventoryPreset,
  Project,
  Quotation,
  QuotationVisibilityPreset,
  ServicePreset as ProjectServicePreset,
  SiteRecord,
  Task,
  Team,
} from "@/types/project";
import type {
  Agent,
  AuditLogEntry,
  Customer,
  EmployeePaidHoliday,
  Expense,
  Income,
  Invoice,
  Loan,
  LoanRepayment,
  OwnerInvestment,
  Partner,
  PartnerTransaction,
  Payment,
  ServicePreset,
} from "@/types/finance";
import type { ClientPaymentRecord, DeletionRequest } from "@/types/blockage";
import {
  seedProjects,
  seedEmployees,
  seedQuotations,
  seedCustomers,
  seedInvoices,
  seedExpenses,
  seedPartners,
  seedPartnerTransactions,
  seedLoans,
  seedLoanRepayments,
  seedPayments,
  seedVendors,
  seedAttendanceRecords,
  seedSites,
  seedTasks,
  seedEnquiries,
  seedIncomes,
  seedAgents,
  seedAuditLogs,
  seedQuotationTemplates,
  seedTeams,
} from "./seedData";

export const dummyCustomers: Customer[] = seedCustomers;
export const dummyAgents: Agent[] = seedAgents;
export const dummyPartners: Partner[] = seedPartners;
export const dummyEnquiries: Enquiry[] = seedEnquiries;
export const dummyQuotations: Quotation[] = seedQuotations;
export const dummyProjects: Project[] = seedProjects;
export const dummyEmployees: Employee[] = seedEmployees;
export const dummyAttendanceRecords: AttendanceRecord[] = seedAttendanceRecords;
export const dummyTasks: Task[] = seedTasks;
export const dummyTeams: Team[] = seedTeams;
export const dummyInvoices: Invoice[] = seedInvoices;
export const dummySaleBills: Invoice[] = []; 
export const dummyPayments: Payment[] = seedPayments;
export const dummyPartnerTransactions: PartnerTransaction[] = seedPartnerTransactions;
export const dummyExpenses: Expense[] = seedExpenses;
export const dummyIncomes: Income[] = seedIncomes;
export const dummySites: SiteRecord[] = seedSites;
export const dummyVendors: any[] = seedVendors;
export const dummyClientPaymentRecords: ClientPaymentRecord[] = [];
export const dummyLoans: Loan[] = seedLoans;
export const dummyLoanRepayments: LoanRepayment[] = seedLoanRepayments;
export const dummyOwnerInvestments: OwnerInvestment[] = [];
export const dummyEmployeePaidHolidays: EmployeePaidHoliday[] = [];
export const dummyDeletionRequests: DeletionRequest[] = [];
export const dummyHolidays: Date[] = [];

export const dummyServicePresets: ServicePreset[] = [];

export const dummyInventoryPresets: InventoryPreset[] = seedQuotationTemplates.map((t) => ({
  id: t.id,
  name: t.name,
  category: t.segment,
  presetType: "quotation" as const,
  items: t.materialItems,
  createdAt: t.createdAt,
}));

export const dummyQuotationVisibilityPresets: QuotationVisibilityPreset[] = [];
export const dummyAuditLogs: AuditLogEntry[] = seedAuditLogs;
