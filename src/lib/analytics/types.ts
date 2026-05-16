import type { Agent, Customer, Expense, Invoice, Loan, Payment } from "@/types/finance";
import type { Enquiry, InventoryItem, Project, Quotation, Task } from "@/types/project";
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
}

export interface MetricRow {
  label: string;
  value: string | number;
}
