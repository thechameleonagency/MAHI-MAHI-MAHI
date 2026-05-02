export type ExpenseTaxonomy =
  | "company"
  | "employee"
  | "office"
  | "site_project"
  | "owner"
  | "partner";

export type IncomeTaxonomy =
  | "project_income"
  | "loans_borrowing"
  | "partner_income"
  | "employee_repayments"
  | "company_income";

type CommonPayload = {
  projectId?: string;
  employeeId?: string;
  partnerId?: string;
  vendorId?: string;
  month?: string;
  quantity?: number;
  contact?: string;
  bankLoanDetails?: string;
};

import type { Invoice } from "@/types/finance";

export class UnifiedFinanceValidationService {
  validateExpense(taxonomy: ExpenseTaxonomy, payload: CommonPayload): { ok: boolean; errors: string[] } {
    const errors: string[] = [];

    if (taxonomy === "employee" && !payload.employeeId) errors.push("Employee reference is required");
    if (taxonomy === "partner" && !payload.partnerId) errors.push("Partner reference is required");
    if (taxonomy === "site_project" && !payload.projectId) errors.push("Project reference is required");
    if (taxonomy === "office" && !payload.month) errors.push("Month is required for office expenses");

    return { ok: errors.length === 0, errors };
  }

  validateIncome(taxonomy: IncomeTaxonomy, payload: CommonPayload): { ok: boolean; errors: string[] } {
    const errors: string[] = [];

    if (taxonomy === "project_income" && !payload.projectId) errors.push("Project reference is required");
    if (taxonomy === "loans_borrowing" && !payload.bankLoanDetails) errors.push("Bank/loan details are required");
    if (taxonomy === "partner_income" && !payload.partnerId) errors.push("Partner reference is required");
    if (taxonomy === "employee_repayments" && !payload.employeeId) errors.push("Employee reference is required");

    return { ok: errors.length === 0, errors };
  }

  /** Operational MSS→customer documents must anchor to a project unless explicitly company overhead. */
  validateOperationalInvoice(invoice: Invoice): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!invoice.customerId?.trim()) {
      errors.push("Customer id is required on invoices.");
    }
    const scope = invoice.billingScope ?? "project";
    if (scope === "project" && !invoice.projectId?.trim()) {
      errors.push("Project is required for project-scoped billing (or set billing scope to company overhead).");
    }
    return { ok: errors.length === 0, errors };
  }
}
