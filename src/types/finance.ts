// Shared finance types used across the application
import type { Voucher } from "@/domain/accounting/voucherTypes";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  type: "company" | "individual";
  gstin?: string;
  state?: string;
  itemsBought: string[];
  totalPurchases: number;
  amountReceived?: number;
  lastPurchase?: string;
  createdAt: string;
  /** Differentiates project (solar install) customers from inventory-only buyers; defaults to 'project'. */
  customerKind?: "project" | "inventory" | "both";
  /** Set when the customer is archived (last linked project completed). null/undefined = active. */
  archivedAt?: string | null;
  /** Cache for fast auto-archive evaluation. */
  lastProjectCompletedAt?: string;
}

export interface InvoiceItem {
  description: string;
  hsn: string;
  quantity: number;
  rate: number;
  gstRate: number;
  itemNotes?: string;
}

export interface InvoiceService {
  description: string;
  sac: string;
  rate: number;
  gstRate: number;
  serviceNotes?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: "invoice" | "sale-bill";
  customerId: string;
  customerName: string;
  customerAddress?: string;
  customerGstin?: string;
  customerState?: string;
  customerContact?: string;
  projectId?: string;
  projectName?: string;
  billingScope?: "project" | "company_overhead";
  quotationId?: string;
  items: InvoiceItem[];
  services: InvoiceService[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  amountReceived?: number;
  receivedIn?: string;
  receivedDate?: string;
  status: "draft" | "pending" | "partial" | "paid" | "overdue" | "overpaid" | "voided";
  invoiceDate: string;
  dueDate: string;
  createdAt: string;
  paymentTerms?: string;
  bankAccount?: string;
  notes?: string;
}

// Unified Payment
export interface Payment {
  id: string;
  date: string;
  amount: number;
  direction: "in" | "out";
  paymentMode: string;
  reference?: string;
  notes?: string;
  counterpartyType: "customer" | "vendor" | "partner" | "employee" | "other";
  counterpartyId?: string;
  counterpartyName?: string;
  customerId?: string;
  projectId?: string;
  projectName?: string;
  invoiceId?: string;
  /** When a project income row matches this payment (same project, amount, date). */
  linkedIncomeId?: string;
  vendorBillId?: string;
  loanId?: string;
  /**
   * W5 — routing of a client payment for a partner project.
   *  - "mss": client paid us directly (default; counterpartyType=customer)
   *  - "partner": client paid the partner on our behalf (paired with a `Customer Paid Partner` PartnerTransaction)
   *  - "split": client paid both — this Payment represents the MSS portion; a sibling PartnerTransaction tracks the partner portion
   */
  paymentSource?: "mss" | "partner" | "split";
  /** When paymentSource = "partner" | "split": the partner who received the client cash. */
  partnerId?: string;
  /** When paymentSource = "split": the amount that went to the partner (this Payment.amount holds the MSS amount). */
  partnerPortion?: number;
}

// Unified Journal Entry (Replaces Expense/Income)
export interface JournalEntry {
  id: string;
  date: string;
  amount: number;
  type: "debit" | "credit";
  category: string;
  subCategory?: string;
  description?: string;
  notes?: string;
  projectId?: string;
  paymentId?: string;
  invoiceId?: string;
  vendorBillId?: string;
  createdAt: string;
}

// Legacy Expense (Keeping for backward compatibility during Phase 1 migration)
export interface ExpenseReimbursement {
  enabled: boolean;
  amount: number;
  status: "pending" | "paid";
  paidDate?: string;
}

export interface ExpenseAllocation {
  type: "project" | "company" | "employee_salary_deduct";
  projectId?: string;
  employeeId?: string;
}

export interface Expense {
  id: string;
  date: string;
  amount: number;
  mainCategory?: "company" | "employee" | "office" | "site" | "owner" | "partner";
  projectId?: string;
  projectName?: string;
  category: string;
  subCategory?: string;
  tag?: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  description?: string;
  context?: "project" | "employee" | "office";
  paidBy: {
    type: "company" | "employee" | "owner" | "partner";
    entityId?: string;
    entityName?: string;
    splits?: { entityId: string; entityType: string; entityName: string; amount: number; }[];
  };
  teamMealEmployeeIds?: string[];
  teamMealEmployeeNames?: string[];
  reimbursement?: ExpenseReimbursement;
  allocation?: ExpenseAllocation;
  vendorId?: string;
  vendorName?: string;
  employeeId?: string;
  employeeName?: string;
  billingMonth?: string;
  billPeriodStart?: string;
  billPeriodEnd?: string;
  dueDate?: string;
  paidDate?: string;
  vehicleType?: "company" | "employee" | "outsource";
  commissionSubType?: "agent" | "discom" | "bank" | "lineman" | "powerhouse" | "other";
  attachmentUrl?: string;
  isRecurring?: boolean;
  paymentMode?: string;
  vendorshipCompanyId?: string;
  createdAt?: string;
  /**
   * T1 — interest+principal split for Vehicle EMI / Loan Repayment categories.
   * When set, `amount` = `interestPortion + principalPortion`. The interest portion hits
   * the P&L Finance Cost leaf; the principal portion reduces the corresponding Loan Liability.
   */
  interestPortion?: number;
  /** T1 — companion to interestPortion. */
  principalPortion?: number;
}

// Legacy Income (Keeping for backward compatibility during Phase 1 migration)
export interface Income {
  id: string;
  date: string;
  amount: number;
  mainCategory: "project" | "loan" | "partner" | "employee-payment" | "company";
  category: string;
  subCategory?: string;
  projectId?: string;
  projectName?: string;
  partnerId?: string;
  partnerName?: string;
  employeeId?: string;
  employeeName?: string;
  loanId?: string;
  paymentMode: string;
  reference?: string;
  notes?: string;
  isAutoRecorded?: boolean;
  createdReimbursable?: boolean;
  reimbursementStatus?: "pending" | "paid";
  isOutgoing?: boolean;
  createdAt: string;
  /** When a customer payment row matches this income (same project, amount, date). */
  linkedPaymentId?: string;
}

export interface PartnerSiteInvestment {
  projectId: string;
  projectName: string;
  investmentPercent: number;
  amountInvested: number;
  profitSharePercent: number;
}

export type PartnerType =
  | "Profit-Share"
  | "Fixed-Rate"
  | "Channel"
  | "Subcontractor";

export interface Partner {
  id: string;
  name: string;
  phone: string;
  type: PartnerType;
  /** Default per-kW rate for this partner (₹). Overridable per project. */
  defaultRatePerKw?: number;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  /** When set, the partner relationship is ended (no new projects allowed; existing kept for history). */
  endedAt?: string;
  endedReason?: string;
}

/** W5 — canonical partner-transaction types. UI options + ledger derivation read from this list. */
export const PARTNER_TRANSACTION_TYPES = [
  "Given to Partner",
  "Received from Partner",
  "Customer Paid Partner",
  "Vendorship Fee",
  "Profit Payment",
] as const;
export type PartnerTransactionType = typeof PARTNER_TRANSACTION_TYPES[number];

export interface PartnerTransaction {
  id: string;
  partnerId: string;
  partnerName: string;
  date: string;
  amount: number;
  type: PartnerTransactionType | string;
  direction?: "given" | "received";
  projectId?: string;
  notes: string;
}

export interface Loan {
  id: string;
  source: string;
  sourceType: "bank" | "person" | "partner" | "nbfc" | "other";
  /** Stable, opaque key for the loan counterparty so list and detail views agree on identity (C6). */
  personId?: string;
  personName?: string;
  personContact?: string;
  principal: number;
  interestRate: number;
  paymentType: "emi" | "one-time" | "reminder-only";
  emiAmount: number;
  tenure: number;
  dueDate?: string;
  reminderDate?: string;
  reminderNotes?: string;
  startDate: string;
  /** EMIs already paid by the borrower at the time this loan was recorded in the system.
   *  Used to back-fill an accurate outstanding for in-flight EMI loans. */
  emisPaidAlready?: number;
  outstanding: number;
  status: "Active" | "Closed";
}

export interface LoanRepayment {
  id: string;
  loanId: string;
  loanSource: string;
  date: string;
  emiNumber: number;
  principalPaid: number;
  interestPaid: number;
  totalPaid: number;
}

export interface AccountingReviewQueueItem {
  id: string;
  reason: string;
  eventType: string;
  sourceDocumentId: string;
  projectId?: string;
  amount: number;
  createdAt: string;
}

export type AccountingVoucher = Voucher;

export const ITEM_CATEGORIES = [
  "Solar Panels",
  "Inverters",
  "Batteries",
  "Structure",
  "Cables & Connectors",
  "Services",
  "AMC",
];

export const PAYMENT_MODES = [
  "Bank Transfer",
  "Cash",
  "UPI",
  "Cheque",
  "Credit Card",
];

export interface ServicePresetService {
  description: string;
  sac: string;
  rate: number;
  gstRate: number;
}

export interface ServicePreset {
  id: string;
  name: string;
  services: ServicePresetService[];
  createdAt: string;
}

export interface OwnerInvestment {
  id: string;
  date: string;
  amount: number;
  type: "investment" | "withdrawal";
  projectId?: string;
  projectName?: string;
  notes?: string;
  createdAt: string;
}

export interface EmployeePaidHoliday {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  month: string;
  notes?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: "create" | "update" | "delete";
  entityType: string;
  entityId: string;
  entityName: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
}

export interface Agent {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  photo?: string;
  ratePerKw: number;
  rateType: "per-kw" | "per-project";
  flatRate?: number;
  status: "active" | "inactive";
  totalReferrals?: number; // Optional as it can be calculated, but seed data uses it
  createdAt: string;
}

export interface AgentCommissionPayment {
  id: string;
  agentId: string;
  projectId: string;
  projectName?: string;
  amount: number;
  date: string;
  mode: "cash" | "bank_transfer" | "cheque" | "upi" | "other";
  notes?: string;
  createdAt: string;
}

/** A company or individual whose DISCOM vendor registration code MSS uses on projects. Not a partner. */
export interface VendorshipCompany {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  registrationCode?: string;
  notes?: string;
  createdAt: string;
}

/** A company or contractor that gives MSS INC (installation & commissioning) work to execute. Not a partner. */
export interface INCGiverCompany {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

export interface INCGiverTransaction {
  id: string;
  incGiverCompanyId: string;
  projectId?: string;
  projectName?: string;
  date: string;
  amount: number;
  type: "collection" | "adjustment";
  notes?: string;
}

export interface EmployeePayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string;
  year: number;
  daysPresent: number;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  paidDate: string;
  mode: "cash" | "bank_transfer" | "cheque" | "upi" | "other";
  notes?: string;
}

export interface EmployeeWalletLedgerEntry {
  id: string;
  employeeId: string;
  date: string;
  kind: "advance" | "recovery" | "adjustment";
  amount: number;
  notes?: string;
  createdAt: string;
}
