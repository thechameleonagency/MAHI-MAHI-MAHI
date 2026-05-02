// Centralized Expense Schema - 6 Main Categories with full subcategory structure
// Single source of truth for all expense categorization

export type MainExpenseCategory = "company" | "employee" | "office" | "site" | "owner" | "partner";

export interface ExpenseSubCategory {
  value: string;
  label: string;
  allowedPayers?: ("company" | "employee" | "owner" | "partner" | "split")[];
  requiresEmployee?: boolean;
  requiresVendor?: boolean;
  requiresQuantity?: boolean;
  requiresMonth?: boolean;
  requiresBillPeriod?: boolean;
  requiresDueDate?: boolean;
  requiresVehicleType?: boolean;
  requiresProject?: boolean;
  requiresPartner?: boolean;
  allowReimbursement?: boolean;
  allowMultiEmployee?: boolean;
  allowCustomSubCategory?: boolean;
  unit?: string;
}

export interface ExpenseCategory {
  value: string;
  label: string;
  icon?: string;
  mainCategory: MainExpenseCategory;
  requiresProject?: boolean;
  requiresEmployee?: boolean;
  requiresPartner?: boolean;
  optionalProject?: boolean;
  subCategories?: ExpenseSubCategory[];
  allowedPayers: ("company" | "employee" | "owner" | "partner" | "split")[];
  allowReimbursement?: boolean;
  allowMultiEmployee?: boolean;
  allowCustomSubCategory?: boolean;
}

// ============ 6 MAIN CATEGORIES ============

export const EXPENSE_MAIN_CATEGORIES: { value: MainExpenseCategory; label: string; icon: string; description: string }[] = [
  { value: "company", label: "Company", icon: "Building2", description: "Vehicle, marketing, taxes, tools" },
  { value: "employee", label: "Employee", icon: "Users", description: "Salary, advance, food, transport" },
  { value: "office", label: "Office", icon: "Home", description: "Rent, electricity, supplies" },
  { value: "site", label: "Site / Project", icon: "HardHat", description: "Commission, material, labour, transport" },
  { value: "owner", label: "Owner (MK)", icon: "Crown", description: "Withdrawals, personal expenses" },
  { value: "partner", label: "Partner", icon: "Handshake", description: "Withdrawals, expenses, profit sharing" },
];

export const EXPENSE_SCHEMA: ExpenseCategory[] = [
  // ============ 1. COMPANY EXPENSES ============
  {
    value: "company-vehicle",
    label: "Company Vehicle",
    mainCategory: "company",
    requiresProject: false,
    allowedPayers: ["company", "owner"],
    subCategories: [
      { value: "vehicle-emi", label: "Vehicle EMI", requiresMonth: true },
      { value: "vehicle-fuel", label: "Fuel" },
      { value: "vehicle-maintenance", label: "Maintenance" },
      { value: "vehicle-insurance", label: "Insurance", requiresMonth: true },
      { value: "vehicle-repair", label: "Repair" },
      { value: "vehicle-toll", label: "Toll" },
      { value: "vehicle-parking", label: "Parking" },
    ]
  },
  {
    value: "marketing",
    label: "Marketing",
    mainCategory: "company",
    requiresProject: false,
    allowedPayers: ["company", "owner"],
    subCategories: [
      { value: "instagram-ads", label: "Instagram Ads" },
      { value: "google-ads", label: "Google Ads" },
      { value: "agency-subscription", label: "Agency Subscription", requiresMonth: true },
      { value: "service-retainer", label: "Service Retainer", requiresMonth: true },
    ]
  },
  {
    value: "physical-marketing",
    label: "Physical Marketing",
    mainCategory: "company",
    requiresProject: false,
    allowedPayers: ["company", "owner"],
    subCategories: [
      { value: "poster", label: "Posters" },
      { value: "flyer", label: "Flyers" },
      { value: "banner", label: "Banners" },
      { value: "printing", label: "Printing" },
    ]
  },
  {
    value: "ca-payments",
    label: "CA Payments",
    mainCategory: "company",
    requiresProject: false,
    allowedPayers: ["company", "owner"],
  },
  {
    value: "tax-payments",
    label: "Tax Payments",
    mainCategory: "company",
    requiresProject: false,
    allowedPayers: ["company", "owner"],
    subCategories: [
      { value: "gst", label: "GST" },
      { value: "income-tax", label: "Income Tax" },
      { value: "tds", label: "TDS" },
      { value: "other-tax", label: "Other Tax" },
    ]
  },
  {
    value: "subscriptions",
    label: "Subscriptions / Software",
    mainCategory: "company",
    requiresProject: false,
    allowedPayers: ["company", "owner"],
    subCategories: [
      { value: "software", label: "Software" },
      { value: "cloud-hosting", label: "Cloud / Hosting" },
      { value: "other-subscription", label: "Other" },
    ]
  },
  {
    value: "company-tools",
    label: "Tools & Equipment",
    mainCategory: "company",
    requiresProject: false,
    allowedPayers: ["company", "owner"],
    subCategories: [
      { value: "tool-purchase", label: "Tool Purchase" },
      { value: "tool-repair", label: "Tool Repair" },
      { value: "equipment-rental", label: "Equipment Rental" },
    ]
  },
  {
    value: "other-company",
    label: "Other Company Expense",
    mainCategory: "company",
    requiresProject: false,
    allowedPayers: ["company", "owner"],
  },

  // ============ 2. EMPLOYEE EXPENSES ============
  {
    value: "salary",
    label: "Salary",
    mainCategory: "employee",
    requiresProject: false,
    requiresEmployee: true,
    allowedPayers: ["company"],
    subCategories: [
      { value: "monthly-salary", label: "Monthly Salary", requiresMonth: true },
      { value: "overtime", label: "Overtime" },
      { value: "bonus", label: "Bonus" },
    ]
  },
  {
    value: "advance",
    label: "Advance",
    mainCategory: "employee",
    requiresProject: false,
    requiresEmployee: true,
    allowedPayers: ["company", "owner"],
    subCategories: [
      { value: "salary-advance", label: "Salary Advance" },
      { value: "expense-advance", label: "Expense Advance" },
    ]
  },
  {
    value: "employee-food",
    label: "Food",
    mainCategory: "employee",
    requiresProject: false,
    requiresEmployee: true,
    optionalProject: true,
    allowedPayers: ["company", "employee", "owner", "split"],
    allowReimbursement: true,
    allowMultiEmployee: true,
    subCategories: [
      { value: "site-food", label: "Site Food" },
      { value: "team-meal", label: "Team Meal", allowMultiEmployee: true },
      { value: "travel-food", label: "Travel Food" },
    ]
  },
  {
    value: "employee-stay",
    label: "Site Stay / Accommodation",
    mainCategory: "employee",
    requiresProject: false,
    requiresEmployee: true,
    optionalProject: true,
    allowedPayers: ["company", "employee", "owner", "split"],
    allowReimbursement: true,
    subCategories: [
      { value: "site-stay", label: "Site Stay" },
      { value: "company-accommodation", label: "Company Accommodation" },
      { value: "hotel", label: "Hotel" },
      { value: "room-rent", label: "Room Rent" },
    ]
  },
  {
    value: "employee-medical",
    label: "Medical / Injury",
    mainCategory: "employee",
    requiresProject: false,
    requiresEmployee: true,
    allowedPayers: ["company", "employee", "owner"],
    allowReimbursement: true,
    subCategories: [
      { value: "injury-support", label: "Injury Support" },
      { value: "treatment", label: "Treatment" },
      { value: "medicine", label: "Medicine" },
      { value: "insurance", label: "Insurance", requiresMonth: true },
    ]
  },
  {
    value: "employee-tickets",
    label: "Tickets (Home ↔ Office)",
    mainCategory: "employee",
    requiresProject: false,
    requiresEmployee: true,
    allowedPayers: ["company", "employee", "owner"],
    allowReimbursement: true,
    subCategories: [
      { value: "home-to-office", label: "Home to Office" },
      { value: "office-to-home", label: "Office to Home" },
    ]
  },
  {
    value: "employee-transport",
    label: "Team Transport",
    mainCategory: "employee",
    requiresProject: false,
    requiresEmployee: true,
    optionalProject: true,
    allowedPayers: ["company", "employee", "owner", "split"],
    allowReimbursement: true,
    allowMultiEmployee: true,
    subCategories: [
      { value: "team-transport", label: "Team Transport" },
      { value: "personal-vehicle-fuel", label: "Personal Vehicle Refueling", allowReimbursement: true },
    ]
  },
  {
    value: "employee-reimbursement",
    label: "Reimbursement Payment",
    mainCategory: "employee",
    requiresProject: false,
    requiresEmployee: true,
    allowedPayers: ["company"],
    allowMultiEmployee: true,
    subCategories: [
      { value: "reimbursement-fuel", label: "Fuel" },
      { value: "reimbursement-food", label: "Food" },
      { value: "reimbursement-electricity", label: "Electricity Bill" },
      { value: "reimbursement-transport", label: "Transport" },
      { value: "reimbursement-material", label: "Material Purchase" },
      { value: "reimbursement-other", label: "Other" },
    ]
  },
  {
    value: "multi-employee-payment",
    label: "Multi-Employee Shared Payment",
    mainCategory: "employee",
    requiresProject: false,
    requiresEmployee: true,
    allowedPayers: ["company", "employee", "split"],
    allowReimbursement: true,
    allowMultiEmployee: true,
    allowCustomSubCategory: true,
    subCategories: [
      { value: "shared-rent", label: "Rent" },
      { value: "shared-food", label: "Food" },
      { value: "shared-fuel", label: "Fuel" },
      { value: "shared-electricity", label: "Electricity Bill" },
      { value: "shared-other", label: "Others" },
    ]
  },

  // ============ 3. OFFICE EXPENSES ============
  {
    value: "office-infrastructure",
    label: "Infrastructure",
    mainCategory: "office",
    requiresProject: false,
    allowedPayers: ["company", "owner"],
  },
  {
    value: "office-supplies",
    label: "Office Supplies",
    mainCategory: "office",
    requiresProject: false,
    allowedPayers: ["company", "employee", "owner"],
    allowReimbursement: true,
  },
  {
    value: "office-rent",
    label: "Rent",
    mainCategory: "office",
    requiresProject: false,
    allowedPayers: ["company", "owner"],
    subCategories: [
      { value: "monthly-rent", label: "Monthly Rent", requiresMonth: true },
    ]
  },
  {
    value: "electricity-bill",
    label: "Electricity Bill",
    mainCategory: "office",
    requiresProject: false,
    allowedPayers: ["company", "owner"],
    subCategories: [
      { value: "electricity", label: "Electricity Bill", requiresMonth: true, requiresBillPeriod: true, requiresDueDate: true },
    ]
  },
  {
    value: "water-camper",
    label: "Water (Pani Camper)",
    mainCategory: "office",
    requiresProject: false,
    allowedPayers: ["company", "owner"],
  },
  {
    value: "office-food",
    label: "Food",
    mainCategory: "office",
    requiresProject: false,
    allowedPayers: ["company", "employee", "owner", "split"],
    allowReimbursement: true,
  },
  {
    value: "office-tea",
    label: "Tea",
    mainCategory: "office",
    requiresProject: false,
    allowedPayers: ["company", "employee", "owner"],
    allowReimbursement: true,
  },
  {
    value: "office-internet",
    label: "Internet",
    mainCategory: "office",
    requiresProject: false,
    allowedPayers: ["company", "owner"],
    subCategories: [
      { value: "internet-bill", label: "Internet Bill", requiresMonth: true },
    ]
  },
  {
    value: "office-phone",
    label: "Phone",
    mainCategory: "office",
    requiresProject: false,
    allowedPayers: ["company", "owner"],
    subCategories: [
      { value: "phone-bill", label: "Phone Bill", requiresMonth: true },
    ]
  },
  {
    value: "office-misc",
    label: "Miscellaneous",
    mainCategory: "office",
    requiresProject: false,
    allowedPayers: ["company", "employee", "owner", "split"],
    allowReimbursement: true,
  },

  // ============ 4. SITE / PROJECT EXPENSES ============
  {
    value: "commission",
    label: "Commission",
    mainCategory: "site",
    requiresProject: true,
    allowedPayers: ["company", "owner"],
    subCategories: [
      { value: "agent-commission", label: "Agent" },
      { value: "discom-commission", label: "DISCOM" },
      { value: "bank-commission", label: "Bank" },
      { value: "lineman-commission", label: "Lineman" },
      { value: "powerhouse-commission", label: "Power House" },
      { value: "other-commission", label: "Others" },
    ]
  },
  {
    value: "material-transport",
    label: "Material Transport to Site",
    mainCategory: "site",
    requiresProject: true,
    allowedPayers: ["company", "employee", "owner", "partner", "split"],
    allowReimbursement: true,
    subCategories: [
      { value: "company-vehicle-transport", label: "Company Vehicle" },
      { value: "employee-vehicle-transport", label: "Employee Vehicle", requiresEmployee: true, allowReimbursement: true },
      { value: "outsource-vehicle-transport", label: "Outsource Vehicle" },
    ]
  },
  {
    value: "non-inventory-transport",
    label: "Non-Inventory Material Transport",
    mainCategory: "site",
    requiresProject: true,
    allowedPayers: ["company", "employee", "owner", "partner", "split"],
    allowReimbursement: true,
  },
  {
    value: "site-team-transport",
    label: "Team Transport",
    mainCategory: "site",
    requiresProject: true,
    allowedPayers: ["company", "employee", "owner", "partner", "split"],
    allowReimbursement: true,
    allowMultiEmployee: true,
    subCategories: [
      { value: "team-transport-vehicle", label: "Vehicle" },
      { value: "team-transport-toll", label: "Tolls" },
      { value: "team-transport-parking", label: "Parking" },
    ]
  },
  {
    value: "pulley-transport",
    label: "Pulley for Material to Roof",
    mainCategory: "site",
    requiresProject: true,
    allowedPayers: ["company", "owner", "partner"],
  },
  {
    value: "labour-material-shift",
    label: "Labour for Material Shift to Roof",
    mainCategory: "site",
    requiresProject: true,
    allowedPayers: ["company", "owner", "partner"],
  },
  {
    value: "machine-rent",
    label: "Machine Rent",
    mainCategory: "site",
    requiresProject: true,
    allowedPayers: ["company", "owner", "partner"],
    subCategories: [
      { value: "machine-hourly", label: "Hourly Rent", unit: "hours", requiresQuantity: true },
      { value: "machine-daily", label: "Daily Rent", unit: "days", requiresQuantity: true },
    ]
  },
  {
    value: "outsource-work",
    label: "Outsource Work",
    mainCategory: "site",
    requiresProject: true,
    allowedPayers: ["company", "owner", "partner"],
    subCategories: [
      { value: "jcb-work", label: "JCB Work", unit: "hours", requiresQuantity: true },
      { value: "crane-work", label: "Crane Work", unit: "hours", requiresQuantity: true },
      { value: "hydra-lifting", label: "Hydra Lifting / Material Shift to Top", unit: "hours", requiresQuantity: true },
      { value: "site-cleaning", label: "Cleaning", unit: "sqft", requiresQuantity: true },
      { value: "heavy-transport", label: "Heavy Transport", unit: "trips", requiresQuantity: true },
      { value: "pani-tanker", label: "Pani Tanker", unit: "liters", requiresQuantity: true },
      { value: "other-outsource", label: "Other" },
    ]
  },
  {
    value: "site-toll-parking",
    label: "Tolls & Parking",
    mainCategory: "site",
    requiresProject: true,
    allowedPayers: ["company", "employee", "owner", "split"],
    allowReimbursement: true,
    subCategories: [
      { value: "toll", label: "Toll" },
      { value: "parking", label: "Parking" },
    ]
  },
  {
    value: "other-site",
    label: "Other Site Expense",
    mainCategory: "site",
    requiresProject: true,
    allowedPayers: ["company", "employee", "owner", "partner", "split"],
    allowReimbursement: true,
  },

  // ============ 5. OWNER EXPENSES ============
  {
    value: "owner-withdrawal",
    label: "Withdrawals",
    mainCategory: "owner",
    requiresProject: false,
    allowedPayers: ["owner"],
  },
  {
    value: "owner-personal",
    label: "Owner Personal Expenses",
    mainCategory: "owner",
    requiresProject: false,
    allowedPayers: ["owner"],
    subCategories: [
      { value: "owner-food", label: "Food" },
      { value: "owner-transport", label: "Transport" },
      { value: "owner-emi", label: "EMI Payment", requiresMonth: true },
      { value: "owner-medical", label: "Medical" },
      { value: "owner-personal-other", label: "Personal" },
    ]
  },
  {
    value: "owner-reimbursement",
    label: "Owner Reimbursements",
    mainCategory: "owner",
    requiresProject: false,
    allowedPayers: ["company"],
  },

  // ============ 6. PARTNER EXPENSES ============
  {
    value: "partner-withdrawal",
    label: "Partner Withdrawal",
    mainCategory: "partner",
    requiresProject: false,
    requiresPartner: true,
    optionalProject: true,
    allowedPayers: ["company"],
    subCategories: [
      { value: "partner-withdrawal-company", label: "Company Level Withdrawal" },
      { value: "partner-withdrawal-site", label: "Site Level Withdrawal", requiresProject: true },
    ]
  },
  {
    value: "partner-profit-payment",
    label: "Partner Profit Payment",
    mainCategory: "partner",
    requiresProject: false,
    requiresPartner: true,
    optionalProject: true,
    allowedPayers: ["company"],
  },
  {
    value: "partner-expense",
    label: "Partner Expense",
    mainCategory: "partner",
    requiresProject: false,
    requiresPartner: true,
    optionalProject: true,
    allowedPayers: ["company", "partner"],
    subCategories: [
      { value: "partner-material-expense", label: "Material" },
      { value: "partner-labour-expense", label: "Labour" },
      { value: "partner-transport-expense", label: "Transport" },
      { value: "partner-other-expense", label: "Other" },
    ]
  },
];

// ============ HELPER FUNCTIONS ============

export const getMainCategoryLabel = (mainCat: MainExpenseCategory): string => {
  return EXPENSE_MAIN_CATEGORIES.find(c => c.value === mainCat)?.label || mainCat;
};

export const getCategoriesByMainCategory = (mainCat: MainExpenseCategory): ExpenseCategory[] =>
  EXPENSE_SCHEMA.filter(c => c.mainCategory === mainCat);

export const getCategoryByValue = (value: string): ExpenseCategory | undefined =>
  EXPENSE_SCHEMA.find(c => c.value === value);

export const getSubCategoriesByCategory = (categoryValue: string): ExpenseSubCategory[] =>
  getCategoryByValue(categoryValue)?.subCategories || [];

export const getAllowedPayersByCategory = (categoryValue: string, subCategoryValue?: string): string[] => {
  const category = getCategoryByValue(categoryValue);
  if (!category) return ["company"];
  if (subCategoryValue) {
    const subCat = category.subCategories?.find(s => s.value === subCategoryValue);
    if (subCat?.allowedPayers) return subCat.allowedPayers;
  }
  return category.allowedPayers;
};

export const isReimbursementAllowed = (categoryValue: string, subCategoryValue?: string): boolean => {
  const category = getCategoryByValue(categoryValue);
  if (!category) return false;
  if (subCategoryValue) {
    const subCat = category.subCategories?.find(s => s.value === subCategoryValue);
    if (subCat?.allowReimbursement !== undefined) return subCat.allowReimbursement;
  }
  return category.allowReimbursement || false;
};

export const requiresProject = (categoryValue: string): boolean =>
  getCategoryByValue(categoryValue)?.requiresProject || false;

export const hasOptionalProject = (categoryValue: string): boolean =>
  getCategoryByValue(categoryValue)?.optionalProject || false;

export const requiresPartner = (categoryValue: string): boolean =>
  getCategoryByValue(categoryValue)?.requiresPartner || false;

export const requiresEmployee = (categoryValue: string, subCategoryValue?: string): boolean => {
  const category = getCategoryByValue(categoryValue);
  if (!category) return false;
  if (category.requiresEmployee) return true;
  if (subCategoryValue) {
    const subCat = category.subCategories?.find(s => s.value === subCategoryValue);
    return subCat?.requiresEmployee || false;
  }
  return false;
};

export const requiresVendor = (categoryValue: string, subCategoryValue?: string): boolean => {
  const category = getCategoryByValue(categoryValue);
  if (!category) return false;
  if (subCategoryValue) {
    const subCat = category.subCategories?.find(s => s.value === subCategoryValue);
    return subCat?.requiresVendor || false;
  }
  return false;
};

export const requiresMonth = (categoryValue: string, subCategoryValue?: string): boolean => {
  const category = getCategoryByValue(categoryValue);
  if (!category) return false;
  if (subCategoryValue) {
    const subCat = category.subCategories?.find(s => s.value === subCategoryValue);
    return subCat?.requiresMonth || false;
  }
  return false;
};

export const requiresBillPeriod = (categoryValue: string, subCategoryValue?: string): boolean => {
  const category = getCategoryByValue(categoryValue);
  if (!category) return false;
  if (subCategoryValue) {
    const subCat = category.subCategories?.find(s => s.value === subCategoryValue);
    return subCat?.requiresBillPeriod || false;
  }
  return false;
};

export const requiresDueDate = (categoryValue: string, subCategoryValue?: string): boolean => {
  const category = getCategoryByValue(categoryValue);
  if (!category) return false;
  if (subCategoryValue) {
    const subCat = category.subCategories?.find(s => s.value === subCategoryValue);
    return subCat?.requiresDueDate || false;
  }
  return false;
};

export const requiresVehicleType = (categoryValue: string, subCategoryValue?: string): boolean => {
  const category = getCategoryByValue(categoryValue);
  if (!category) return false;
  if (subCategoryValue) {
    const subCat = category.subCategories?.find(s => s.value === subCategoryValue);
    return subCat?.requiresVehicleType || false;
  }
  return false;
};

export const requiresQuantity = (categoryValue: string, subCategoryValue?: string): boolean => {
  const category = getCategoryByValue(categoryValue);
  if (!category) return false;
  if (subCategoryValue) {
    const subCat = category.subCategories?.find(s => s.value === subCategoryValue);
    return subCat?.requiresQuantity || false;
  }
  return false;
};

export const getUnit = (categoryValue: string, subCategoryValue?: string): string => {
  const category = getCategoryByValue(categoryValue);
  if (!category) return "";
  if (subCategoryValue) {
    const subCat = category.subCategories?.find(s => s.value === subCategoryValue);
    return subCat?.unit || "";
  }
  return "";
};

export const allowsMultiEmployee = (categoryValue: string, subCategoryValue?: string): boolean => {
  const category = getCategoryByValue(categoryValue);
  if (!category) return false;
  if (subCategoryValue) {
    const subCat = category.subCategories?.find(s => s.value === subCategoryValue);
    if (subCat?.allowMultiEmployee !== undefined) return subCat.allowMultiEmployee;
  }
  return category.allowMultiEmployee || false;
};

export const allowsCustomSubCategory = (categoryValue: string): boolean =>
  getCategoryByValue(categoryValue)?.allowCustomSubCategory || false;
