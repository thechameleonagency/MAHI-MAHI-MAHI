// Audit & Books Masters - Indian-tax-aware Chart of Accounts, P&L mappings, GST treatment.
// Source of truth for skills 35–40 (india-chart-of-accounts-audit, india-pl-line-completeness-audit, etc.).
// Seeded from the "Business model — Indian tax + accounting" section of the round plan.

import type { MasterItem } from "./masters";

// =========================================================
// 1. CHART OF ACCOUNT GROUPS (Tally-aligned, 8 primary groups)
// =========================================================
export const chartOfAccountGroups: MasterItem[] = [
  { value: "capital-account", label: "Capital Account", nature: "liability", order: 1 },
  { value: "loans-liability", label: "Loans (Liability)", nature: "liability", order: 2 },
  { value: "current-liabilities", label: "Current Liabilities", nature: "liability", order: 3 },
  { value: "fixed-assets", label: "Fixed Assets", nature: "asset", order: 4 },
  { value: "current-assets", label: "Current Assets", nature: "asset", order: 5 },
  { value: "sales-accounts", label: "Sales Accounts", nature: "income", order: 6 },
  { value: "purchase-accounts", label: "Purchase Accounts", nature: "expense", order: 7 },
  { value: "indirect-expenses", label: "Indirect Expenses", nature: "expense", order: 8 },
];

// =========================================================
// 2. CHART OF ACCOUNT LEAVES (sub-ledgers under each group)
// parentId = group value
// =========================================================
export const chartOfAccountLeaves: MasterItem[] = [
  // Capital Account
  { value: "owner-capital", label: "Owner Capital", parentId: "capital-account", nature: "liability", order: 1 },
  { value: "owner-drawings", label: "Owner Drawings", parentId: "capital-account", nature: "liability", order: 2 },
  { value: "partner-capital", label: "Partner Capital", parentId: "capital-account", nature: "liability", order: 3 },
  { value: "partner-drawings", label: "Partner Drawings", parentId: "capital-account", nature: "liability", order: 4 },
  { value: "retained-earnings", label: "Retained Earnings", parentId: "capital-account", nature: "liability", order: 5 },

  // Loans (Liability)
  { value: "secured-loans", label: "Secured Loans (Bank/NBFC)", parentId: "loans-liability", nature: "liability", order: 1 },
  { value: "unsecured-loans", label: "Unsecured Loans (Udhar)", parentId: "loans-liability", nature: "liability", order: 2 },
  { value: "vehicle-loans", label: "Vehicle Loans", parentId: "loans-liability", nature: "liability", order: 3 },

  // Current Liabilities
  { value: "sundry-creditors", label: "Sundry Creditors (Vendor Bills)", parentId: "current-liabilities", nature: "liability", order: 1 },
  { value: "advances-from-customers", label: "Advances from Customers", parentId: "current-liabilities", nature: "liability", order: 2 },
  { value: "gst-output-payable", label: "GST Output Payable", parentId: "current-liabilities", nature: "liability", order: 3 },
  { value: "tds-payable", label: "TDS Payable", parentId: "current-liabilities", nature: "liability", order: 4 },
  { value: "salary-payable", label: "Salary Payable", parentId: "current-liabilities", nature: "liability", order: 5 },
  { value: "outstanding-expenses", label: "Outstanding Expenses", parentId: "current-liabilities", nature: "liability", order: 6 },
  { value: "partner-settlement-payable", label: "Partner Settlement Payable", parentId: "current-liabilities", nature: "liability", order: 7 },
  { value: "owner-reimbursement-payable", label: "Owner Reimbursement Payable", parentId: "current-liabilities", nature: "liability", order: 8 },

  // Fixed Assets
  { value: "tools-equipment-gross", label: "Tools & Equipment (Gross)", parentId: "fixed-assets", nature: "asset", order: 1 },
  { value: "accumulated-depreciation", label: "Accumulated Depreciation (contra)", parentId: "fixed-assets", nature: "asset", order: 2 },
  { value: "vehicles", label: "Vehicles", parentId: "fixed-assets", nature: "asset", order: 3 },
  { value: "office-equipment", label: "Office Equipment", parentId: "fixed-assets", nature: "asset", order: 4 },

  // Current Assets
  { value: "sundry-debtors", label: "Sundry Debtors (unpaid invoices/sale bills)", parentId: "current-assets", nature: "asset", order: 1 },
  { value: "customer-advances-receivable", label: "Customer Advances Receivable", parentId: "current-assets", nature: "asset", order: 2 },
  { value: "cash-in-hand", label: "Cash-in-Hand", parentId: "current-assets", nature: "asset", order: 3 },
  { value: "bank-accounts", label: "Bank Accounts", parentId: "current-assets", nature: "asset", order: 4 },
  { value: "upi-wallets", label: "UPI Wallets", parentId: "current-assets", nature: "asset", order: 5 },
  { value: "stock-in-hand", label: "Stock-in-Hand (Inventory)", parentId: "current-assets", nature: "asset", order: 6 },
  { value: "gst-input-credit", label: "GST Input Credit (CGST/SGST/IGST)", parentId: "current-assets", nature: "asset", order: 7 },
  { value: "tds-receivable", label: "TDS Receivable", parentId: "current-assets", nature: "asset", order: 8 },
  { value: "employee-advance-receivable", label: "Employee Advance Receivable", parentId: "current-assets", nature: "asset", order: 9 },
  { value: "vendor-advance-receivable", label: "Vendor Advance Receivable", parentId: "current-assets", nature: "asset", order: 10 },
  { value: "partner-receivable", label: "Partner Receivable", parentId: "current-assets", nature: "asset", order: 11 },

  // Sales Accounts
  { value: "solar-system-sales", label: "Solar System Sales", parentId: "sales-accounts", nature: "income", order: 1 },
  { value: "material-sales", label: "Material Sales (sale-bill)", parentId: "sales-accounts", nature: "income", order: 2 },
  { value: "service-income", label: "Service Income (installation, AMC, repair)", parentId: "sales-accounts", nature: "income", order: 3 },
  { value: "other-operating-income", label: "Other Operating Income", parentId: "sales-accounts", nature: "income", order: 4 },
  { value: "vendorship-fee-income", label: "Vendorship Fee Income", parentId: "sales-accounts", nature: "income", order: 5 },
  { value: "interest-income", label: "Interest Income", parentId: "sales-accounts", nature: "income", order: 6 },

  // Purchase Accounts (Direct COGS)
  { value: "material-purchases", label: "Material Purchases", parentId: "purchase-accounts", nature: "expense", order: 1 },
  { value: "sub-contract-charges", label: "Sub-contract Charges", parentId: "purchase-accounts", nature: "expense", order: 2 },
  { value: "direct-labour", label: "Direct Labour (site)", parentId: "purchase-accounts", nature: "expense", order: 3 },
  { value: "carriage-inward", label: "Carriage Inward (material transport)", parentId: "purchase-accounts", nature: "expense", order: 4 },
  { value: "site-damages-written-off", label: "Material Damage Written-off", parentId: "purchase-accounts", nature: "expense", order: 5 },
  { value: "site-consumables", label: "Site Consumables", parentId: "purchase-accounts", nature: "expense", order: 6 },
  { value: "site-staff-welfare", label: "Site Staff Welfare (food/stay/medical at site)", parentId: "purchase-accounts", nature: "expense", order: 7 },

  // Indirect Expenses (Operating + Finance + Tax)
  { value: "salaries-office", label: "Salaries (office)", parentId: "indirect-expenses", nature: "expense", order: 1 },
  { value: "office-rent", label: "Office Rent", parentId: "indirect-expenses", nature: "expense", order: 2 },
  { value: "utilities", label: "Utilities (electricity, water, internet)", parentId: "indirect-expenses", nature: "expense", order: 3 },
  { value: "office-supplies", label: "Office Supplies", parentId: "indirect-expenses", nature: "expense", order: 4 },
  { value: "subscriptions", label: "Subscriptions (software, SaaS)", parentId: "indirect-expenses", nature: "expense", order: 5 },
  { value: "marketing", label: "Marketing", parentId: "indirect-expenses", nature: "expense", order: 6 },
  { value: "professional-fees", label: "Professional Fees (CA/Legal)", parentId: "indirect-expenses", nature: "expense", order: 7 },
  { value: "insurance", label: "Insurance (general)", parentId: "indirect-expenses", nature: "expense", order: 8 },
  { value: "vehicle-fuel", label: "Vehicle Fuel", parentId: "indirect-expenses", nature: "expense", order: 9 },
  { value: "vehicle-maintenance", label: "Vehicle Maintenance", parentId: "indirect-expenses", nature: "expense", order: 10 },
  { value: "vehicle-insurance", label: "Vehicle Insurance", parentId: "indirect-expenses", nature: "expense", order: 11 },
  { value: "vehicle-loan-interest", label: "Vehicle EMI Interest", parentId: "indirect-expenses", nature: "expense", order: 12 },
  { value: "loan-interest", label: "Loan Interest", parentId: "indirect-expenses", nature: "expense", order: 13 },
  { value: "bank-charges", label: "Bank Charges", parentId: "indirect-expenses", nature: "expense", order: 14 },
  { value: "depreciation", label: "Depreciation", parentId: "indirect-expenses", nature: "expense", order: 15 },
  { value: "travel-office", label: "Travel (Office)", parentId: "indirect-expenses", nature: "expense", order: 16 },
  { value: "staff-welfare-office", label: "Staff Welfare (Office)", parentId: "indirect-expenses", nature: "expense", order: 17 },
  { value: "miscellaneous", label: "Miscellaneous", parentId: "indirect-expenses", nature: "expense", order: 18 },
  { value: "tax-provision", label: "Income Tax Provision", parentId: "indirect-expenses", nature: "expense", order: 19 },
];

// =========================================================
// 3. VOUCHER TYPES (Tally convention)
// =========================================================
export const voucherTypes: MasterItem[] = [
  { value: "sales", label: "Sales", order: 1 },
  { value: "purchase", label: "Purchase", order: 2 },
  { value: "payment", label: "Payment", order: 3 },
  { value: "receipt", label: "Receipt", order: 4 },
  { value: "journal", label: "Journal", order: 5 },
  { value: "contra", label: "Contra (Bank ↔ Cash)", order: 6 },
  { value: "debit-note", label: "Debit Note", order: 7 },
  { value: "credit-note", label: "Credit Note", order: 8 },
];

// =========================================================
// 4. P&L LINE MAPPING
// =========================================================
export const plLineMapping: MasterItem[] = [
  { value: "revenue", label: "Revenue (Sales Accounts)", order: 1 },
  { value: "direct", label: "Direct Costs / COGS (Purchase Accounts)", order: 2 },
  { value: "indirect", label: "Indirect Expenses (Operating)", order: 3 },
  { value: "finance-cost", label: "Finance Costs (Interest)", order: 4 },
  { value: "tax", label: "Tax (Income Tax Provision)", order: 5 },
  { value: "non-pl-capital", label: "Non-P&L — Capital Account (Equity)", order: 6 },
  { value: "non-pl-drawings", label: "Non-P&L — Drawings (reduces Capital)", order: 7 },
  { value: "non-pl-liability", label: "Non-P&L — Liability movement", order: 8 },
  { value: "non-pl-asset", label: "Non-P&L — Asset movement", order: 9 },
];

// =========================================================
// 5. EXPENSE → ACCOUNT MAPPING
// parentId = "<mainCategory>:<subCategory>" composite key
// coaLeaf = target CoA leaf value
// plLine = P&L bucket
// gstTreatment = GST classification
// =========================================================
export const expenseToAccountMapping: MasterItem[] = [
  // Site expenses
  { value: "site:transport", label: "Site → Material Transport", coaLeaf: "carriage-inward", plLine: "direct", gstTreatment: "itc-eligible" },
  { value: "site:labour", label: "Site → Labour (direct)", coaLeaf: "direct-labour", plLine: "direct", gstTreatment: "rcm" },
  { value: "site:outsource", label: "Site → Outsource Work (subcontract)", coaLeaf: "sub-contract-charges", plLine: "direct", gstTreatment: "itc-eligible" },
  { value: "site:food", label: "Site → Food (site team)", coaLeaf: "site-staff-welfare", plLine: "direct", gstTreatment: "itc-blocked" },
  { value: "site:stay", label: "Site → Stay", coaLeaf: "site-staff-welfare", plLine: "direct", gstTreatment: "itc-blocked" },
  { value: "site:consumables", label: "Site → Consumables", coaLeaf: "site-consumables", plLine: "direct", gstTreatment: "itc-eligible" },

  // Employee expenses
  { value: "employee:salary-office", label: "Employee → Salary (office)", coaLeaf: "salaries-office", plLine: "indirect", gstTreatment: "no-gst" },
  { value: "employee:salary-site", label: "Employee → Salary (site-deployed)", coaLeaf: "direct-labour", plLine: "direct", gstTreatment: "no-gst" },
  { value: "employee:advance", label: "Employee → Advance", coaLeaf: "employee-advance-receivable", plLine: "non-pl-asset", gstTreatment: "no-gst" },
  { value: "employee:reimbursement-office", label: "Employee → Reimbursement (office)", coaLeaf: "miscellaneous", plLine: "indirect", gstTreatment: "itc-eligible" },
  { value: "employee:reimbursement-site", label: "Employee → Reimbursement (site)", coaLeaf: "site-consumables", plLine: "direct", gstTreatment: "itc-eligible" },
  { value: "employee:medical", label: "Employee → Medical", coaLeaf: "staff-welfare-office", plLine: "indirect", gstTreatment: "itc-blocked" },
  { value: "employee:travel-office", label: "Employee → Travel (office)", coaLeaf: "travel-office", plLine: "indirect", gstTreatment: "itc-eligible" },
  { value: "employee:travel-site", label: "Employee → Travel (site)", coaLeaf: "carriage-inward", plLine: "direct", gstTreatment: "itc-eligible" },

  // Office expenses
  { value: "office:rent", label: "Office → Rent", coaLeaf: "office-rent", plLine: "indirect", gstTreatment: "itc-eligible" },
  { value: "office:utilities", label: "Office → Utilities", coaLeaf: "utilities", plLine: "indirect", gstTreatment: "itc-eligible" },
  { value: "office:supplies", label: "Office → Supplies", coaLeaf: "office-supplies", plLine: "indirect", gstTreatment: "itc-eligible" },
  { value: "office:subscriptions", label: "Office → Subscriptions", coaLeaf: "subscriptions", plLine: "indirect", gstTreatment: "itc-eligible" },
  { value: "office:marketing", label: "Office → Marketing", coaLeaf: "marketing", plLine: "indirect", gstTreatment: "itc-eligible" },
  { value: "office:vehicle-emi", label: "Office → Vehicle EMI", coaLeaf: "vehicle-loan-interest", plLine: "finance-cost", gstTreatment: "no-gst", requiresInterestPrincipalSplit: true },
  { value: "office:vehicle-fuel", label: "Office → Vehicle Fuel", coaLeaf: "vehicle-fuel", plLine: "indirect", gstTreatment: "itc-blocked" },
  { value: "office:vehicle-maintenance", label: "Office → Vehicle Maintenance", coaLeaf: "vehicle-maintenance", plLine: "indirect", gstTreatment: "itc-eligible" },
  { value: "office:vehicle-insurance", label: "Office → Vehicle Insurance", coaLeaf: "vehicle-insurance", plLine: "indirect", gstTreatment: "itc-eligible" },

  // Company expenses
  { value: "company:ca-fees", label: "Company → CA Payments", coaLeaf: "professional-fees", plLine: "indirect", gstTreatment: "itc-eligible" },
  { value: "company:legal", label: "Company → Legal", coaLeaf: "professional-fees", plLine: "indirect", gstTreatment: "itc-eligible" },
  { value: "company:bank-charges", label: "Company → Bank Charges", coaLeaf: "bank-charges", plLine: "finance-cost", gstTreatment: "itc-eligible" },
  { value: "company:insurance", label: "Company → Insurance", coaLeaf: "insurance", plLine: "indirect", gstTreatment: "itc-eligible" },
  { value: "company:income-tax", label: "Company → Income Tax Payment", coaLeaf: "tax-provision", plLine: "tax", gstTreatment: "no-gst" },
  { value: "company:gst-payment", label: "Company → GST Payment (settlement)", coaLeaf: "gst-output-payable", plLine: "non-pl-liability", gstTreatment: "no-gst" },
  { value: "company:tds-payment", label: "Company → TDS Payment (settlement)", coaLeaf: "tds-payable", plLine: "non-pl-liability", gstTreatment: "no-gst" },
  { value: "company:loan-repayment", label: "Company → Loan Repayment", coaLeaf: "loan-interest", plLine: "finance-cost", gstTreatment: "no-gst", requiresInterestPrincipalSplit: true },

  // Owner expenses
  { value: "owner:drawing", label: "Owner → Drawing (cash withdrawal)", coaLeaf: "owner-drawings", plLine: "non-pl-drawings", gstTreatment: "no-gst" },
  { value: "owner:personal", label: "Owner → Personal Expense (from company)", coaLeaf: "owner-drawings", plLine: "non-pl-drawings", gstTreatment: "no-gst" },
  { value: "owner:reimbursement", label: "Owner → Reimbursement Repayment (settling owed)", coaLeaf: "owner-reimbursement-payable", plLine: "non-pl-liability", gstTreatment: "no-gst" },

  // Partner expenses
  { value: "partner:drawing", label: "Partner → Drawing", coaLeaf: "partner-drawings", plLine: "non-pl-drawings", gstTreatment: "no-gst" },
  { value: "partner:profit-payment", label: "Partner → Profit Payment", coaLeaf: "partner-drawings", plLine: "non-pl-drawings", gstTreatment: "no-gst" },
  { value: "partner:vendorship-fee", label: "Partner → Vendorship Fee Paid", coaLeaf: "sub-contract-charges", plLine: "direct", gstTreatment: "itc-eligible" },
  { value: "partner:expense-on-our-behalf", label: "Partner → Expense paid on our behalf", coaLeaf: "partner-receivable", plLine: "non-pl-asset", gstTreatment: "no-gst" },
];

// =========================================================
// 6. INCOME → ACCOUNT MAPPING
// =========================================================
export const incomeToAccountMapping: MasterItem[] = [
  { value: "project:client-payment", label: "Project → Client Payment", coaLeaf: "sundry-debtors", plLine: "revenue", gstTreatment: "no-gst" },
  { value: "project:client-advance", label: "Project → Client Advance (no invoice yet)", coaLeaf: "advances-from-customers", plLine: "non-pl-liability", gstTreatment: "no-gst" },

  { value: "loans:bank-loan-received", label: "Loans → Bank Loan Received", coaLeaf: "secured-loans", plLine: "non-pl-liability", gstTreatment: "no-gst" },
  { value: "loans:udhar-received", label: "Loans → Udhar Received", coaLeaf: "unsecured-loans", plLine: "non-pl-liability", gstTreatment: "no-gst" },

  { value: "partner:investment", label: "Partner → Investment", coaLeaf: "partner-capital", plLine: "non-pl-capital", gstTreatment: "no-gst" },
  { value: "partner:contribution", label: "Partner → Contribution (working capital)", coaLeaf: "partner-capital", plLine: "non-pl-capital", gstTreatment: "no-gst" },
  { value: "partner:vendorship-fee-received", label: "Partner → Vendorship Fee Received", coaLeaf: "vendorship-fee-income", plLine: "revenue", gstTreatment: "itc-eligible" },
  { value: "partner:forwarded-client-cash", label: "Partner → Forwarded client cash to us", coaLeaf: "partner-receivable", plLine: "non-pl-asset", gstTreatment: "no-gst" },

  { value: "employee:advance-recovery", label: "Employee → Salary Advance Recovery", coaLeaf: "employee-advance-receivable", plLine: "non-pl-asset", gstTreatment: "no-gst" },

  { value: "company:vendor-refund", label: "Company → Vendor Refund / Credit Note", coaLeaf: "sundry-creditors", plLine: "non-pl-liability", gstTreatment: "rcm" },
  { value: "company:interest-income", label: "Company → Interest Income", coaLeaf: "interest-income", plLine: "revenue", gstTreatment: "no-gst" },
  { value: "company:other-misc-income", label: "Company → Other Misc Income", coaLeaf: "other-operating-income", plLine: "revenue", gstTreatment: "itc-eligible" },

  { value: "owner:contribution", label: "Owner → Contribution (capital injection)", coaLeaf: "owner-capital", plLine: "non-pl-capital", gstTreatment: "no-gst" },
  { value: "owner:reimbursement-from-personal", label: "Owner → Paid company expense from personal (creates reimbursement payable)", coaLeaf: "owner-reimbursement-payable", plLine: "non-pl-liability", gstTreatment: "no-gst" },
];

// =========================================================
// 7. GST RATE BY HSN/SAC
// (Solar-industry-specific common rates; user can edit)
// =========================================================
export const gstRateByHsnSac: MasterItem[] = [
  { value: "85414012", label: "Solar Cells & Modules (HSN 85414012)", gstRate: 12 },
  { value: "85044090", label: "Solar Inverter (HSN 85044090)", gstRate: 12 },
  { value: "85072000", label: "Lead-acid Battery (HSN 85072000)", gstRate: 28 },
  { value: "73089090", label: "Steel Structure (HSN 73089090)", gstRate: 18 },
  { value: "85444900", label: "DC Cable (HSN 85444900)", gstRate: 18 },
  { value: "998719", label: "Installation & Commissioning Services (SAC 998719)", gstRate: 18 },
  { value: "998369", label: "Site Survey & Consultation (SAC 998369)", gstRate: 18 },
  { value: "998314", label: "Remote Monitoring Setup (SAC 998314)", gstRate: 18 },
];

// =========================================================
// 8. INVENTORY VALUATION METHOD
// Default = WAC; FIFO opt-in per item via inventory item form.
// =========================================================
export const inventoryValuationMethod: MasterItem[] = [
  { value: "wac", label: "Weighted Average Cost (default)", order: 1 },
  { value: "fifo", label: "First-In-First-Out (opt-in per item)", order: 2 },
];

// =========================================================
// 9. BLOCKED ITC ITEMS (per GST Sec 17(5))
// =========================================================
export const blockedItcItems: MasterItem[] = [
  { value: "food-beverages", label: "Food & Beverages", order: 1 },
  { value: "outdoor-catering", label: "Outdoor Catering", order: 2 },
  { value: "club-membership", label: "Club / Health & Fitness Membership", order: 3 },
  { value: "motor-vehicle-personal", label: "Motor Vehicle (personal use)", order: 4 },
  { value: "petrol-diesel", label: "Petrol / Diesel (motor vehicle)", order: 5 },
  { value: "rent-a-cab", label: "Rent-a-Cab Services", order: 6 },
  { value: "life-insurance-personal", label: "Life Insurance (personal)", order: 7 },
  { value: "health-insurance-personal", label: "Health Insurance (non-statutory)", order: 8 },
  { value: "travel-personal", label: "Travel Benefits (vacation)", order: 9 },
  { value: "construction-immovable-property", label: "Works contract for immovable property (own use)", order: 10 },
];
