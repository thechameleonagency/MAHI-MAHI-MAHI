import type {
  Agent,
  Customer,
  EmployeePayrollRecord,
  EmployeeWalletLedgerEntry,
  Expense,
  Invoice,
  Loan,
  Payment,
} from "@/types/finance";
import type {
  AttendanceRecord,
  Employee,
  Enquiry,
  InventoryItem,
  Project,
  Quotation,
  Task,
} from "@/types/project";
import type { Blockage } from "@/types/blockage";
import type {
  MaterialDamage,
  MaterialReservation,
  ScheduledInstallation,
} from "@/types/operations";
import type { VendorBill } from "@/types/inventory";

export type AnalyticsDateRange = "month" | "quarter" | "year" | "all";

export interface AnalyticsSlices {
  enquiries: Enquiry[];
  quotations: Quotation[];
  projects: Project[];
  customers: Customer[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  inventoryItems: InventoryItem[];
  tasks: Task[];
  agents: Agent[];
  materialDamageRecords?: MaterialDamage[];
  scheduledInstallations?: ScheduledInstallation[];
  materialReservations?: MaterialReservation[];
  vendorBills?: VendorBill[];
  loans?: Loan[];
  employees?: Employee[];
  attendanceRecords?: AttendanceRecord[];
  payrollRecords?: EmployeePayrollRecord[];
  walletLedger?: EmployeeWalletLedgerEntry[];
  blockages?: Blockage[];
}

export interface MetricRow {
  label: string;
  value: string | number;
}
