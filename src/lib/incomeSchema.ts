// Centralized Income Schema - Single source of truth for income categorization

export type MainIncomeCategory = "project" | "loan" | "partner" | "employee-payment" | "company";

export interface IncomeSubCategory {
  value: string;
  label: string;
  requiresProject?: boolean;
  requiresPartner?: boolean;
  requiresEmployee?: boolean;
  requiresLoan?: boolean;
  isOutgoing?: boolean;
  // Udhar-specific flags
  requiresPersonName?: boolean;
  requiresContactNumber?: boolean;
  requiresExpectedReturnDate?: boolean;
  // Bank loan-specific flags
  requiresBankName?: boolean;
  requiresLoanAccount?: boolean;
  requiresInterestRate?: boolean;
  requiresTenure?: boolean;
}

export interface IncomeCategory {
  value: string;
  label: string;
  mainCategory: MainIncomeCategory;
  subCategories?: IncomeSubCategory[];
}

export const INCOME_MAIN_CATEGORIES: { value: MainIncomeCategory; label: string; icon: string; description: string }[] = [
  { value: "project", label: "Project Income", icon: "Briefcase", description: "Client payments, advances, bank instalments" },
  { value: "loan", label: "Loans & Udhar", icon: "Landmark", description: "Bank loans (formal), Udhar (person-to-person)" },
  { value: "partner", label: "Partner Income", icon: "Handshake", description: "Investments, material/labour supply" },
  { value: "employee-payment", label: "Employee Payments", icon: "Users", description: "Employee-paid expenses, reimbursements" },
  { value: "company", label: "Company Income", icon: "Building2", description: "Owner investment, other income" },
];

export const INCOME_SCHEMA: IncomeCategory[] = [
  // ============ 1. PROJECT INCOME ============
  {
    value: "client-payment",
    label: "Client Payment",
    mainCategory: "project",
    subCategories: [
      { value: "client-cash", label: "Cash Payment", requiresProject: true },
      { value: "client-advance", label: "Client Advance", requiresProject: true },
      { value: "bank-instalment", label: "Bank Instalment", requiresProject: true },
      { value: "direct-bank-payment", label: "Direct Bank Payment", requiresProject: true },
    ]
  },

  // ============ 2. LOANS (FORMAL - BANK) ============
  {
    value: "bank-loan",
    label: "Bank Loan (Formal)",
    mainCategory: "loan",
    subCategories: [
      { value: "bank-loan-received", label: "Loan Received", requiresBankName: true, requiresLoanAccount: true, requiresInterestRate: true, requiresTenure: true },
      { value: "bank-loan-emi-reference", label: "EMI Payment Reference", requiresLoan: true },
    ]
  },

  // ============ 2b. UDHAR / BORROWING (PERSON-TO-PERSON) ============
  {
    value: "udhar-borrowing",
    label: "Udhar / Borrowing",
    mainCategory: "loan",
    subCategories: [
      { value: "udhar-received", label: "Udhar Received", requiresPersonName: true, requiresContactNumber: true, requiresExpectedReturnDate: true },
      { value: "udhar-given", label: "Udhar Given", isOutgoing: true, requiresPersonName: true, requiresContactNumber: true, requiresExpectedReturnDate: true },
      { value: "udhar-repayment-received", label: "Repayment Received", requiresPersonName: true },
      { value: "udhar-repayment-made", label: "Repayment Made", isOutgoing: true, requiresPersonName: true },
    ]
  },

  // ============ 3. PARTNER INCOME ============
  {
    value: "partner-investment",
    label: "Partner Investment",
    mainCategory: "partner",
    subCategories: [
      { value: "partner-company-investment", label: "Investment to Company", requiresPartner: true },
      { value: "partner-site-investment", label: "Site Investment", requiresPartner: true, requiresProject: true },
    ]
  },
  {
    value: "partner-contribution",
    label: "Partner Contribution (Valued)",
    mainCategory: "partner",
    subCategories: [
      { value: "partner-material-supply", label: "Material Supplied", requiresPartner: true, requiresProject: true },
      { value: "partner-labour-supply", label: "Labour Supplied", requiresPartner: true, requiresProject: true },
      { value: "partner-transport-supply", label: "Transport Supplied", requiresPartner: true, requiresProject: true },
    ]
  },

  // ============ 4. EMPLOYEE EXPENSE PAYMENTS ============
  {
    value: "employee-expense-payment",
    label: "Employee Paid for Company",
    mainCategory: "employee-payment",
    subCategories: [
      { value: "employee-paid-expense", label: "Employee Paid Expense", requiresEmployee: true },
      { value: "reimbursement-to-employee", label: "Reimbursement to Employee", requiresEmployee: true, isOutgoing: true },
    ]
  },

  // ============ 5. COMPANY INCOME ============
  {
    value: "owner-investment",
    label: "Owner Investment",
    mainCategory: "company",
    subCategories: [
      { value: "owner-capital-investment", label: "Capital Investment" },
    ]
  },
  {
    value: "other-company-income",
    label: "Other Company Income",
    mainCategory: "company",
  },
];

// ============ HELPER FUNCTIONS ============

export const getIncomeCategoryByValue = (value: string): IncomeCategory | undefined =>
  INCOME_SCHEMA.find(c => c.value === value);

export const getIncomeCategoriesByMainCategory = (mainCat: MainIncomeCategory): IncomeCategory[] =>
  INCOME_SCHEMA.filter(c => c.mainCategory === mainCat);

export const getIncomeSubCategories = (categoryValue: string): IncomeSubCategory[] =>
  getIncomeCategoryByValue(categoryValue)?.subCategories || [];

export const getMainIncomeCategoryLabel = (mainCat: MainIncomeCategory): string =>
  INCOME_MAIN_CATEGORIES.find(c => c.value === mainCat)?.label || mainCat;
