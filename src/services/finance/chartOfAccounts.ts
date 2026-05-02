// Chart of Accounts — CA-provided hierarchical structure
// Groups → Sub-Groups → Ledgers mapped to operational modules

// ============ TYPES ============

export type AccountNature = "asset" | "liability" | "income" | "expense";

export interface AccountGroup {
  id: string;
  name: string;
  nature: AccountNature;
  parentId: string | null; // null = primary group
  type: "primary" | "sub-group";
  description?: string;
}

export interface Ledger {
  id: string;
  name: string;
  groupId: string; // references AccountGroup.id
  nature: AccountNature;
  sources: string[]; // which operational modules feed this ledger
  description?: string;
}

export type VoucherType = "payment" | "receipt" | "contra" | "journal" | "purchase" | "sales";

export interface VoucherTypeInfo {
  type: VoucherType;
  label: string;
  description: string;
  debitLedgers: string[];
  creditLedgers: string[];
  operationalSources: string[];
}

// ============ ACCOUNT GROUPS (CA Hierarchy) ============

export const ACCOUNT_GROUPS: AccountGroup[] = [
  // === LIABILITY PRIMARY GROUPS ===
  { id: "capital-account", name: "Capital Account", nature: "liability", parentId: null, type: "primary", description: "Owner & partner capital" },
  { id: "reserves-surplus", name: "Reserves & Surplus", nature: "liability", parentId: null, type: "primary", description: "Retained earnings and reserves" },
  { id: "loans-liability", name: "Loans (Liability)", nature: "liability", parentId: null, type: "primary", description: "All borrowings" },
  { id: "bank-loan", name: "Bank Loan", nature: "liability", parentId: "loans-liability", type: "sub-group", description: "Bank and NBFC loans" },
  { id: "secured-loan", name: "Secured Loan", nature: "liability", parentId: "loans-liability", type: "sub-group", description: "Secured borrowings" },
  { id: "unsecured-loan", name: "Unsecured Loan", nature: "liability", parentId: "loans-liability", type: "sub-group", description: "Personal and unsecured borrowings" },
  { id: "current-liabilities", name: "Current Liabilities", nature: "liability", parentId: null, type: "primary", description: "Short-term obligations" },
  { id: "sundry-creditors", name: "Sundry Creditors", nature: "liability", parentId: "current-liabilities", type: "sub-group", description: "Amounts payable to vendors" },
  { id: "duties-taxes", name: "Duties & Taxes", nature: "liability", parentId: "current-liabilities", type: "sub-group", description: "GST, TDS, and other taxes payable" },
  { id: "outstanding-expenses", name: "Outstanding Expenses", nature: "liability", parentId: "current-liabilities", type: "sub-group", description: "Accrued but unpaid expenses" },
  { id: "advances-from-customers", name: "Advances from Customers", nature: "liability", parentId: "current-liabilities", type: "sub-group", description: "Customer advances received before invoicing" },

  // === ASSET PRIMARY GROUPS ===
  { id: "fixed-assets", name: "Fixed Assets", nature: "asset", parentId: null, type: "primary", description: "Tools, vehicles, equipment" },
  { id: "investments", name: "Investments", nature: "asset", parentId: null, type: "primary", description: "Company investments" },
  { id: "current-assets", name: "Current Assets", nature: "asset", parentId: null, type: "primary", description: "Short-term assets" },
  { id: "cash-in-hand", name: "Cash-in-Hand", nature: "asset", parentId: "current-assets", type: "sub-group", description: "Physical cash balance" },
  { id: "bank-accounts", name: "Bank Accounts", nature: "asset", parentId: "current-assets", type: "sub-group", description: "Bank balances" },
  { id: "sundry-debtors", name: "Sundry Debtors", nature: "asset", parentId: "current-assets", type: "sub-group", description: "Amounts receivable from customers" },
  { id: "stock-in-hand", name: "Stock-in-Hand", nature: "asset", parentId: "current-assets", type: "sub-group", description: "Inventory valuation" },
  { id: "deposits", name: "Deposits", nature: "asset", parentId: "current-assets", type: "sub-group", description: "Security and other deposits" },
  { id: "loans-advances-asset", name: "Loans & Advances", nature: "asset", parentId: "current-assets", type: "sub-group", description: "Advances to employees, udhar given" },

  // === INCOME PRIMARY GROUPS ===
  { id: "sales-accounts", name: "Sales Accounts", nature: "income", parentId: null, type: "primary", description: "Revenue from sales" },
  { id: "direct-income", name: "Direct Income", nature: "income", parentId: null, type: "primary", description: "Income directly from operations" },
  { id: "indirect-income", name: "Indirect Income", nature: "income", parentId: null, type: "primary", description: "Non-operational income" },

  // === EXPENSE PRIMARY GROUPS ===
  { id: "purchase-accounts", name: "Purchase Accounts", nature: "expense", parentId: null, type: "primary", description: "Material purchases" },
  { id: "direct-expenses", name: "Direct Expenses", nature: "expense", parentId: null, type: "primary", description: "Expenses directly related to projects" },
  { id: "indirect-expenses", name: "Indirect Expenses", nature: "expense", parentId: null, type: "primary", description: "Administrative and overhead expenses" },
];

// ============ LEDGER ACCOUNTS ============

export const LEDGER_ACCOUNTS: Ledger[] = [
  // --- Capital Account ---
  { id: "owner-capital", name: "Owner's Capital (MK)", groupId: "capital-account", nature: "liability", sources: ["Owner Investments", "Incomes (company/owner-investment)"], description: "Owner capital contributions" },
  { id: "partner-capital", name: "Partner Capital", groupId: "capital-account", nature: "liability", sources: ["Partner Transactions (Investment)", "Incomes (partner)"], description: "Partner capital investments" },
  { id: "owner-drawings", name: "Owner's Drawings", groupId: "capital-account", nature: "liability", sources: ["Expenses (owner)"], description: "Owner personal withdrawals (contra)" },

  // --- Reserves & Surplus ---
  { id: "retained-earnings", name: "Retained Earnings", groupId: "reserves-surplus", nature: "liability", sources: ["Computed from P&L"], description: "Accumulated net profit" },

  // --- Loans (Liability) → Bank Loan ---
  { id: "bank-loan-ledger", name: "Bank Loans", groupId: "bank-loan", nature: "liability", sources: ["Loans (bank type)"], description: "Outstanding bank loans" },
  { id: "nbfc-loan-ledger", name: "NBFC Loans", groupId: "bank-loan", nature: "liability", sources: ["Loans (nbfc type)"], description: "NBFC loan balances" },

  // --- Loans (Liability) → Secured Loan ---
  { id: "vehicle-loan", name: "Vehicle Loan", groupId: "secured-loan", nature: "liability", sources: ["Expenses (company-vehicle/vehicle-emi)"], description: "Vehicle EMI obligations" },

  // --- Loans (Liability) → Unsecured Loan ---
  { id: "personal-borrowing", name: "Personal Borrowings (Udhar)", groupId: "unsecured-loan", nature: "liability", sources: ["Loans (person type)"], description: "Amounts borrowed from individuals" },
  { id: "partner-loan", name: "Partner Loans", groupId: "unsecured-loan", nature: "liability", sources: ["Loans (partner type)"], description: "Loans from partners" },

  // --- Current Liabilities → Sundry Creditors ---
  { id: "trade-payables", name: "Trade Payables", groupId: "sundry-creditors", nature: "liability", sources: ["Vendor Bills"], description: "Amounts owed to vendors for material purchases" },

  // --- Current Liabilities → Duties & Taxes ---
  { id: "gst-payable", name: "GST Payable", groupId: "duties-taxes", nature: "liability", sources: ["Invoices", "Sale Bills", "Vendor Bills"], description: "Output GST minus Input GST credit" },
  { id: "tds-payable", name: "TDS Payable", groupId: "duties-taxes", nature: "liability", sources: ["Expenses (company/tax-payments)"], description: "TDS deducted and payable" },
  { id: "income-tax-payable", name: "Income Tax Payable", groupId: "duties-taxes", nature: "liability", sources: ["Expenses (company/tax-payments)"], description: "Provision for income tax" },

  // --- Current Liabilities → Outstanding Expenses ---
  { id: "salary-payable", name: "Salary Payable", groupId: "outstanding-expenses", nature: "liability", sources: ["Expenses (employee/salary)"], description: "Accrued salaries" },
  { id: "reimbursements-payable", name: "Reimbursements Payable", groupId: "outstanding-expenses", nature: "liability", sources: ["Expenses (reimbursement pending)"], description: "Pending employee reimbursements" },

  // --- Current Liabilities → Advances from Customers ---
  { id: "customer-advances", name: "Customer Advances", groupId: "advances-from-customers", nature: "liability", sources: ["Payments (advance type)"], description: "Advance payments received from customers" },

  // --- Fixed Assets ---
  { id: "tools-equipment", name: "Tools & Equipment", groupId: "fixed-assets", nature: "asset", sources: ["Tools"], description: "Drill machines, testing equipment, etc." },
  { id: "vehicles", name: "Vehicles", groupId: "fixed-assets", nature: "asset", sources: ["Expenses (company-vehicle)"], description: "Company vehicles" },
  { id: "accumulated-depreciation", name: "Accumulated Depreciation", groupId: "fixed-assets", nature: "asset", sources: ["Tools (computed WDV/SLM)"], description: "Total depreciation (contra asset)" },

  // --- Investments ---
  { id: "company-investments", name: "Company Investments", groupId: "investments", nature: "asset", sources: [], description: "Long-term investments" },

  // --- Current Assets → Cash-in-Hand ---
  { id: "cash-balance", name: "Cash Balance", groupId: "cash-in-hand", nature: "asset", sources: ["Payments (cash)", "Expenses (cash)"], description: "Physical cash on hand" },

  // --- Current Assets → Bank Accounts ---
  { id: "primary-bank-account", name: "Primary Bank Account", groupId: "bank-accounts", nature: "asset", sources: ["Payments (bank)", "Expenses (bank)", "Vendor Payments"], description: "Main business bank account" },

  // --- Current Assets → Sundry Debtors ---
  { id: "trade-receivables", name: "Trade Receivables", groupId: "sundry-debtors", nature: "asset", sources: ["Invoices", "Sale Bills"], description: "Amounts due from customers" },

  // --- Current Assets → Stock-in-Hand ---
  { id: "solar-panels-stock", name: "Solar Panels", groupId: "stock-in-hand", nature: "asset", sources: ["Inventory Items (Solar Panels)"], description: "Panel inventory" },
  { id: "inverters-stock", name: "Inverters", groupId: "stock-in-hand", nature: "asset", sources: ["Inventory Items (Inverters)"], description: "Inverter inventory" },
  { id: "cables-stock", name: "Cables & Connectors", groupId: "stock-in-hand", nature: "asset", sources: ["Inventory Items (Cables)"], description: "Cable and connector inventory" },
  { id: "structure-stock", name: "Structure & Earthing", groupId: "stock-in-hand", nature: "asset", sources: ["Inventory Items (Structure)"], description: "Mounting structure inventory" },
  { id: "other-stock", name: "Batteries & Other", groupId: "stock-in-hand", nature: "asset", sources: ["Inventory Items (Other)"], description: "Other inventory items" },

  // --- Current Assets → Deposits ---
  { id: "security-deposits", name: "Security Deposits", groupId: "deposits", nature: "asset", sources: [], description: "Rent and utility deposits" },

  // --- Current Assets → Loans & Advances ---
  { id: "employee-advances", name: "Advance to Employees", groupId: "loans-advances-asset", nature: "asset", sources: ["Expenses (employee/advance)"], description: "Salary and expense advances" },
  { id: "udhar-given", name: "Udhar Given", groupId: "loans-advances-asset", nature: "asset", sources: ["Incomes (loan/udhar-given)"], description: "Personal loans given" },

  // --- Sales Accounts ---
  { id: "solar-sales", name: "Solar Installation Sales", groupId: "sales-accounts", nature: "income", sources: ["Invoices (project-linked)"], description: "Revenue from solar EPC projects" },
  { id: "material-sales", name: "Material Sales", groupId: "sales-accounts", nature: "income", sources: ["Sale Bills"], description: "Revenue from material sale bills" },
  { id: "service-sales", name: "Service Revenue", groupId: "sales-accounts", nature: "income", sources: ["Invoices (services)"], description: "AMC, consultancy, installation services" },

  // --- Direct Income ---
  { id: "installation-income", name: "Installation Income", groupId: "direct-income", nature: "income", sources: ["Incomes (project)"], description: "Direct project income" },

  // --- Indirect Income ---
  { id: "owner-investment-income", name: "Owner Investment", groupId: "indirect-income", nature: "income", sources: ["Incomes (company/owner-investment)"], description: "Capital infusion by owner" },
  { id: "other-income", name: "Other Income", groupId: "indirect-income", nature: "income", sources: ["Incomes (company/other)"], description: "Miscellaneous non-operational income" },

  // --- Purchase Accounts ---
  { id: "material-purchases", name: "Material Purchases", groupId: "purchase-accounts", nature: "expense", sources: ["Vendor Bills"], description: "Solar panels, inverters, cables, structures" },

  // --- Direct Expenses ---
  { id: "salaries-wages", name: "Salaries & Wages", groupId: "direct-expenses", nature: "expense", sources: ["Expenses (employee/salary)"], description: "Monthly salaries, overtime, bonus" },
  { id: "employee-food-stay", name: "Employee Food & Accommodation", groupId: "direct-expenses", nature: "expense", sources: ["Expenses (employee/food, employee/stay)"], description: "Site food, team meals, hotel stays" },
  { id: "employee-medical", name: "Employee Medical", groupId: "direct-expenses", nature: "expense", sources: ["Expenses (employee/medical)"], description: "Injury support, treatment, medicine" },
  { id: "employee-transport", name: "Employee Transport & Tickets", groupId: "direct-expenses", nature: "expense", sources: ["Expenses (employee/transport, employee/tickets)"], description: "Travel tickets, transport fuel" },
  { id: "employee-reimbursements", name: "Employee Reimbursements", groupId: "direct-expenses", nature: "expense", sources: ["Expenses (employee/reimbursement)"], description: "Material and expense reimbursements" },
  { id: "site-commissions", name: "Site Commissions", groupId: "direct-expenses", nature: "expense", sources: ["Expenses (site/commission)"], description: "Agent, DISCOM, bank, lineman commissions" },
  { id: "material-transport-exp", name: "Material Transport", groupId: "direct-expenses", nature: "expense", sources: ["Expenses (site/material-transport)"], description: "Transport of materials to/from site" },
  { id: "outsource-work-exp", name: "Outsource Work", groupId: "direct-expenses", nature: "expense", sources: ["Expenses (site/outsource-work)"], description: "JCB, crane, hydra, cleaning" },
  { id: "machine-rent-exp", name: "Machine Rent", groupId: "direct-expenses", nature: "expense", sources: ["Expenses (site/machine-rent)"], description: "Hourly/daily equipment rental" },
  { id: "site-tolls", name: "Site Tolls & Parking", groupId: "direct-expenses", nature: "expense", sources: ["Expenses (site/toll-parking)"], description: "Tolls and parking at project sites" },
  { id: "partner-profit-payments", name: "Partner Profit Payments", groupId: "direct-expenses", nature: "expense", sources: ["Partner Transactions (Profit Payment)"], description: "Profit sharing payments" },
  { id: "partner-withdrawals-exp", name: "Partner Withdrawals", groupId: "direct-expenses", nature: "expense", sources: ["Expenses (partner/withdrawal)"], description: "Partner withdrawals" },

  // --- Indirect Expenses ---
  { id: "vehicle-expenses", name: "Vehicle Expenses", groupId: "indirect-expenses", nature: "expense", sources: ["Expenses (company/company-vehicle)"], description: "Fuel, maintenance, insurance, EMI" },
  { id: "marketing-expenses", name: "Marketing Expenses", groupId: "indirect-expenses", nature: "expense", sources: ["Expenses (company/marketing, physical-marketing)"], description: "Digital and physical marketing" },
  { id: "professional-fees", name: "Professional Fees", groupId: "indirect-expenses", nature: "expense", sources: ["Expenses (company/ca-payments)"], description: "CA payments, legal fees" },
  { id: "tax-payments-exp", name: "Tax Payments", groupId: "indirect-expenses", nature: "expense", sources: ["Expenses (company/tax-payments)"], description: "GST, income tax, TDS" },
  { id: "subscriptions-exp", name: "Software & Subscriptions", groupId: "indirect-expenses", nature: "expense", sources: ["Expenses (company/subscriptions)"], description: "Software, cloud hosting" },
  { id: "office-rent-exp", name: "Office Rent", groupId: "indirect-expenses", nature: "expense", sources: ["Expenses (office/office-rent)"], description: "Monthly office rent" },
  { id: "office-utilities", name: "Office Utilities", groupId: "indirect-expenses", nature: "expense", sources: ["Expenses (office/electricity, water, internet, phone)"], description: "Electricity, water, internet, phone" },
  { id: "office-supplies-exp", name: "Office Supplies & Misc", groupId: "indirect-expenses", nature: "expense", sources: ["Expenses (office/*)"], description: "Supplies, food, tea, infrastructure" },
  { id: "depreciation-exp", name: "Depreciation", groupId: "indirect-expenses", nature: "expense", sources: ["Tools (computed WDV/SLM)"], description: "Depreciation on tools & equipment" },
  { id: "interest-expense", name: "Interest Expense", groupId: "indirect-expenses", nature: "expense", sources: ["Loan Repayments (interestPaid)"], description: "Interest on loans" },
];

// ============ VOUCHER TYPES ============

export const VOUCHER_TYPES: VoucherTypeInfo[] = [
  {
    type: "sales",
    label: "Sales Voucher",
    description: "Records sales of goods and services to customers",
    debitLedgers: ["trade-receivables", "cash-balance", "primary-bank-account"],
    creditLedgers: ["solar-sales", "material-sales", "service-sales", "gst-payable"],
    operationalSources: ["Invoices", "Sale Bills"],
  },
  {
    type: "purchase",
    label: "Purchase Voucher",
    description: "Records purchase of materials from vendors",
    debitLedgers: ["material-purchases", "solar-panels-stock", "inverters-stock", "cables-stock"],
    creditLedgers: ["trade-payables", "cash-balance", "primary-bank-account"],
    operationalSources: ["Vendor Bills"],
  },
  {
    type: "payment",
    label: "Payment Voucher",
    description: "Records all outgoing payments",
    debitLedgers: ["trade-payables", "salaries-wages", "vehicle-expenses", "office-rent-exp"],
    creditLedgers: ["cash-balance", "primary-bank-account"],
    operationalSources: ["Expenses", "Vendor Payments", "Loan Repayments"],
  },
  {
    type: "receipt",
    label: "Receipt Voucher",
    description: "Records all incoming money",
    debitLedgers: ["cash-balance", "primary-bank-account"],
    creditLedgers: ["trade-receivables", "owner-capital", "partner-capital", "bank-loan-ledger"],
    operationalSources: ["Customer Payments", "Owner Investments", "Partner Investments", "Loan Receipts"],
  },
  {
    type: "contra",
    label: "Contra Voucher",
    description: "Records transfers between cash and bank accounts",
    debitLedgers: ["cash-balance", "primary-bank-account"],
    creditLedgers: ["cash-balance", "primary-bank-account"],
    operationalSources: ["Cash Deposits", "Cash Withdrawals"],
  },
  {
    type: "journal",
    label: "Journal Voucher",
    description: "Records adjustments, depreciation, and non-cash entries",
    debitLedgers: ["depreciation-exp", "gst-payable", "retained-earnings"],
    creditLedgers: ["accumulated-depreciation", "gst-payable", "retained-earnings"],
    operationalSources: ["Depreciation", "GST Adjustments", "Closing Entries"],
  },
];

// ============ EXPENSE → LEDGER MAPPING ============

export const EXPENSE_TO_LEDGER_MAP: Record<string, string> = {
  "employee:salary": "salaries-wages",
  "employee:advance": "employee-advances",
  "employee:employee-food": "employee-food-stay",
  "employee:employee-stay": "employee-food-stay",
  "employee:employee-medical": "employee-medical",
  "employee:employee-tickets": "employee-transport",
  "employee:employee-transport": "employee-transport",
  "employee:employee-reimbursement": "employee-reimbursements",
  "employee:multi-employee-payment": "salaries-wages",
  "site:commission": "site-commissions",
  "site:material-transport": "material-transport-exp",
  "site:outsource-work": "outsource-work-exp",
  "site:machine-rent": "machine-rent-exp",
  "site:site-toll-parking": "site-tolls",
  "site:site-team-transport": "material-transport-exp",
  "site:pulley-transport": "material-transport-exp",
  "site:labour-material-shift": "outsource-work-exp",
  "company:company-vehicle": "vehicle-expenses",
  "company:marketing": "marketing-expenses",
  "company:physical-marketing": "marketing-expenses",
  "company:ca-payments": "professional-fees",
  "company:tax-payments": "tax-payments-exp",
  "company:subscriptions": "subscriptions-exp",
  "company:company-tools": "tools-equipment",
  "office:office-rent": "office-rent-exp",
  "office:electricity-bill": "office-utilities",
  "office:water-camper": "office-utilities",
  "office:office-internet": "office-utilities",
  "office:office-phone": "office-utilities",
  "office:office-food": "office-supplies-exp",
  "office:office-tea": "office-supplies-exp",
  "office:office-supplies": "office-supplies-exp",
  "office:office-infrastructure": "office-supplies-exp",
  "office:office-misc": "office-supplies-exp",
  "owner:owner-withdrawal": "owner-drawings",
  "owner:owner-personal": "owner-drawings",
  "owner:owner-reimbursement": "owner-drawings",
  "partner:partner-withdrawal": "partner-withdrawals-exp",
  "partner:partner-profit-payment": "partner-profit-payments",
  "partner:partner-expense": "partner-withdrawals-exp",
};

// ============ INCOME → LEDGER MAPPING ============

export const INCOME_TO_LEDGER_MAP: Record<string, string> = {
  "project:client-payment": "solar-sales",
  "project:client-advance": "customer-advances",
  "project:bank-instalment": "solar-sales",
  "loan:bank-loan": "bank-loan-ledger",
  "loan:udhar-received": "personal-borrowing",
  "loan:udhar-given": "udhar-given",
  "partner:partner-investment": "partner-capital",
  "partner:partner-contribution": "partner-capital",
  "company:owner-investment": "owner-capital",
  "company:other-income": "other-income",
};

// ============ HELPERS ============

export const getGroupById = (id: string): AccountGroup | undefined =>
  ACCOUNT_GROUPS.find(g => g.id === id);

export const getLedgerById = (id: string): Ledger | undefined =>
  LEDGER_ACCOUNTS.find(l => l.id === id);

export const getSubGroups = (parentId: string): AccountGroup[] =>
  ACCOUNT_GROUPS.filter(g => g.parentId === parentId);

export const getLedgersByGroup = (groupId: string): Ledger[] =>
  LEDGER_ACCOUNTS.filter(l => l.groupId === groupId);

export const getPrimaryGroups = (): AccountGroup[] =>
  ACCOUNT_GROUPS.filter(g => g.parentId === null);

export const getGroupsByNature = (nature: AccountNature): AccountGroup[] =>
  ACCOUNT_GROUPS.filter(g => g.nature === nature && g.parentId === null);

export const getLedgerForExpense = (mainCategory: string, category: string): Ledger | undefined => {
  const key = `${mainCategory}:${category}`;
  const ledgerId = EXPENSE_TO_LEDGER_MAP[key];
  return ledgerId ? getLedgerById(ledgerId) : undefined;
};

// Get all ledgers under a group (including sub-group ledgers)
export const getAllLedgersUnderGroup = (groupId: string): Ledger[] => {
  const direct = getLedgersByGroup(groupId);
  const subGroups = getSubGroups(groupId);
  const subLedgers = subGroups.flatMap(sg => getLedgersByGroup(sg.id));
  return [...direct, ...subLedgers];
};

// Direct/Indirect expense classification for P&L
export const DIRECT_EXPENSE_CATEGORIES = [
  "salary", "advance", "employee-food", "employee-stay", "employee-medical",
  "employee-transport", "employee-tickets", "employee-reimbursement", "multi-employee-payment",
  "commission", "material-transport", "site-team-transport", "pulley-transport",
  "labour-material-shift", "machine-rent", "outsource-work", "site-toll-parking",
  "partner-withdrawal", "partner-profit-payment", "partner-expense",
];

export const INDIRECT_EXPENSE_CATEGORIES = [
  "company-vehicle", "marketing", "physical-marketing", "ca-payments",
  "tax-payments", "subscriptions", "company-tools",
  "office-rent", "electricity-bill", "water-camper", "office-internet", "office-phone",
  "office-food", "office-tea", "office-supplies", "office-infrastructure", "office-misc",
  "other-company",
];
