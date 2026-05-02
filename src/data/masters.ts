// Masters Data - Single source of truth for all dropdowns across the application

export interface MasterItem {
  value: string;
  label: string;
  order?: number;
  parentId?: string;
  icon?: string;
  isEditable?: boolean;
  requiresEmployeeSelect?: boolean;
  requiresMonthSelect?: boolean;
  requiresVendorSelect?: boolean;
  context?: 'site' | 'company' | 'employee';
  unit?: string;
}

export interface MasterCategory {
  id: string;
  label: string;
  description?: string;
  items: MasterItem[];
  subCategories?: MasterCategory[];
  allowSubCategories?: boolean;
  isEditable?: boolean;
  parentCategoryId?: string;
}

// 1. PROJECT TYPES
export const projectTypes: MasterItem[] = [
  { value: "epc", label: "EPC", order: 1 },
  { value: "inc", label: "INC", order: 2 },
];

// 2. PROJECT CATEGORIES
export const projectCategories: MasterItem[] = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "industrial", label: "Industrial" },
];

// 2.1 PROJECT OWNER TYPES (How project is owned/managed)
export const projectOwnerTypes: MasterItem[] = [
  { value: "solo", label: "Solo (MK Owner)" },
  { value: "partnership", label: "Partnership" },
  { value: "outsourced", label: "Outsourced" },
];

// 2.2 PROJECT SOURCES (Where project originated from)
export const projectSources: MasterItem[] = [
  { value: "fresh", label: "Create Fresh" },
  { value: "from-quotation", label: "From Quotation" },
  { value: "from-customer", label: "From Existing Customer" },
];

// 3. PROJECT PROGRESS STAGES (Ordered Workflow)
export const progressStages: MasterItem[] = [
  { value: "enquiry", label: "Enquiry", order: 1 },
  { value: "site-survey", label: "Site Survey", order: 2 },
  { value: "quotation-sent", label: "Quotation Sent", order: 3 },
  { value: "work-in-progress", label: "Work in Progress", order: 4 },
  { value: "completed", label: "Completed", order: 5 },
];

// PROJECT STATUSES
export const projectStatuses: MasterItem[] = [
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "on-hold", label: "On Hold" },
];

// Outsource Work Tags (for analytics in Finance)
export const outsourceWorkTags: MasterItem[] = [
  { value: "jcb-work", label: "JCB Work Done", unit: "hours" },
  { value: "pani-tanker", label: "Pani Tanker Bought", unit: "liters" },
  { value: "inverter-stand", label: "Stand for Inverter", unit: "pcs" },
  { value: "site-cleaning", label: "Site Cleaning", unit: "sqft" },
  { value: "crane-work", label: "Crane Work", unit: "hours" },
  { value: "transport-heavy", label: "Heavy Transport", unit: "trips" },
  { value: "other", label: "Other", unit: "amount" },
];

// Outsource Work Units (based on tag)
export const outsourceWorkUnits: Record<string, string> = {
  "jcb-work": "hours",
  "pani-tanker": "liters",
  "inverter-stand": "pcs",
  "site-cleaning": "sqft",
  "crane-work": "hours",
  "transport-heavy": "trips",
  "other": "amount",
};

// Owner/MK Expense Categories
export const ownerExpenseCategories: MasterItem[] = [
  { value: "mk-investment", label: "Investment/Capital" },
  { value: "mk-withdrawal", label: "Withdrawal" },
  { value: "mk-food", label: "Food" },
  { value: "mk-transport", label: "Transport" },
  { value: "mk-emi", label: "EMI Payment" },
  { value: "mk-personal", label: "Personal" },
  { value: "mk-others", label: "Others" },
];

// Loan Sources
export const loanSources: MasterItem[] = [
  { value: "bank", label: "Bank Loan" },
  { value: "personal", label: "Personal Loan" },
  { value: "nbfc", label: "NBFC" },
  { value: "partner", label: "Partner Investment" },
  { value: "family", label: "Family/Friends" },
];

// WHO CAN PAY - Payment Payer Types (editable in masters)
export const payerTypes: MasterItem[] = [
  { value: "company", label: "Company" },
  { value: "employee", label: "Employee" },
  { value: "owner", label: "Owner (MK)" },
  { value: "partner", label: "Partner" },
];

// 4. EXPENSE CATEGORIES - Site/Project Related
export const siteExpenseCategories: MasterItem[] = [
  { value: "labour", label: "Labour", context: "site" },
  { value: "transport", label: "Transport", context: "site" },
  { value: "material", label: "Material", context: "site" },
  { value: "commission", label: "Commission", context: "site" },
  { value: "outsource", label: "Outsourced Work", context: "site" },
  { value: "food", label: "Food", context: "site" },
  { value: "stay", label: "Stay/Accommodation", context: "site" },
  { value: "medical", label: "Medical", context: "site" },
  { value: "other", label: "Other", context: "site" },
];

// 4.1 EXPENSE SUB-CATEGORIES - Labour
export const labourSubCategories: MasterItem[] = [
  { value: "salary", label: "Salary", parentId: "labour", requiresEmployeeSelect: true },
  { value: "overtime", label: "Overtime", parentId: "labour", requiresEmployeeSelect: true },
  { value: "daily-wage", label: "Daily Wage", parentId: "labour" },
  { value: "bonus", label: "Bonus", parentId: "labour", requiresEmployeeSelect: true },
  { value: "advance", label: "Advance Payment", parentId: "labour", requiresEmployeeSelect: true },
];

// 4.2 EXPENSE SUB-CATEGORIES - Transport
export const transportSubCategories: MasterItem[] = [
  { value: "vehicle-rent", label: "Vehicle Rent", parentId: "transport" },
  { value: "fuel", label: "Fuel", parentId: "transport" },
  { value: "driver", label: "Driver", parentId: "transport" },
  { value: "toll-parking", label: "Toll / Parking", parentId: "transport" },
  { value: "labour-transport", label: "Labour Transport", parentId: "transport", requiresEmployeeSelect: true },
];

// 4.2.1 EXPENSE SUB-CATEGORIES - Material
export const materialSubCategories: MasterItem[] = [
  { value: "from-inventory", label: "Issue from Inventory", parentId: "material" },
  { value: "purchased", label: "Purchased", parentId: "material", requiresVendorSelect: true },
  { value: "returned", label: "Returned to Inventory", parentId: "material" },
  { value: "damaged", label: "Damaged/Lost", parentId: "material" },
];

// 4.2.2 EXPENSE SUB-CATEGORIES - Commission
export const commissionSubCategories: MasterItem[] = [
  { value: "referral", label: "Referral Commission", parentId: "commission" },
  { value: "agent", label: "Agent Commission", parentId: "commission" },
  { value: "finder", label: "Finder's Fee", parentId: "commission" },
];

// 4.2.3 EXPENSE SUB-CATEGORIES - Outsource Work
export const outsourceSubCategories: MasterItem[] = [
  { value: "labour-outsource", label: "Outsourced Labour", parentId: "outsource" },
  { value: "jcb-work", label: "JCB Work", parentId: "outsource", unit: "hours" },
  { value: "pani-tanker", label: "Pani Tanker", parentId: "outsource", unit: "liters" },
  { value: "crane-work", label: "Crane Work", parentId: "outsource", unit: "hours" },
  { value: "site-cleaning", label: "Site Cleaning", parentId: "outsource", unit: "sqft" },
  { value: "transport-heavy", label: "Heavy Transport", parentId: "outsource", unit: "trips" },
  { value: "inverter-stand", label: "Stand for Inverter", parentId: "outsource", unit: "pcs" },
  { value: "other-outsource", label: "Other Outsourced Work", parentId: "outsource" },
];

// 4.3 EXPENSE CATEGORIES - Non-Site (Company)
export const companyExpenseCategories: MasterItem[] = [
  { value: "infrastructure", label: "Infrastructure", context: "company" },
  { value: "office-rent", label: "Office Rent", context: "company" },
  { value: "electricity-bill", label: "Electricity Bill", context: "company", requiresMonthSelect: true },
  { value: "tools-purchase", label: "Tools Purchase", context: "company", requiresVendorSelect: true },
  { value: "material-purchase", label: "Material Purchase", context: "company", requiresVendorSelect: true },
  { value: "vehicle-emi", label: "Vehicle EMI", context: "company" },
  { value: "internet", label: "Internet/Telecom", context: "company" },
  { value: "insurance", label: "Insurance", context: "company" },
  { value: "taxes", label: "Taxes & Fees", context: "company" },
  { value: "maintenance", label: "Maintenance", context: "company" },
];

// 4.4 EXPENSE CATEGORIES - Employee Related (HR Page)
export const employeeExpenseCategories: MasterItem[] = [
  { value: "food", label: "Food", context: "employee" },
  { value: "travel", label: "Travel", context: "employee" },
  { value: "stay", label: "Stay", context: "employee" },
  { value: "medical", label: "Medical", context: "employee" },
  { value: "uniform", label: "Uniform", context: "employee" },
  { value: "tools", label: "Tools/Equipment", context: "employee" },
  { value: "others", label: "Others", context: "employee" },
];

// 5. INVENTORY CATEGORIES
export const inventoryCategories: MasterItem[] = [
  { value: "panel", label: "Panel" },
  { value: "inverter", label: "Inverter" },
  { value: "battery", label: "Battery" },
  { value: "cable", label: "Cable" },
  { value: "structure", label: "Structure" },
  { value: "mounting", label: "Mounting" },
  { value: "tools", label: "Tools" },
  { value: "misc", label: "Misc/Accessories" },
];

// 6. VENDOR CATEGORIES (Supplier Types)
export const vendorCategories: MasterItem[] = [
  { value: "solar-panels", label: "Solar Panels" },
  { value: "inverter", label: "Inverter" },
  { value: "battery", label: "Battery" },
  { value: "cable", label: "Cable" },
  { value: "tools", label: "Tools" },
  { value: "structure", label: "Structure" },
  { value: "general", label: "General Supplier" },
];

// 7. MEASUREMENT UNITS
export const measurementUnits: MasterItem[] = [
  { value: "pcs", label: "Pieces" },
  { value: "m", label: "Meters" },
  { value: "kg", label: "Kilograms" },
  { value: "set", label: "Set" },
  { value: "pair", label: "Pair" },
  { value: "box", label: "Box" },
  { value: "roll", label: "Roll" },
  { value: "ltr", label: "Litres" },
  { value: "sqft", label: "Square Feet" },
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
  { value: "trips", label: "Trips" },
];

// 8. PAYMENT METHODS
export const paymentMethods: MasterItem[] = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank Transfer" },
  { value: "upi", label: "UPI" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
];

// 9. INCOME CATEGORIES
export const incomeCategories: MasterItem[] = [
  { value: "project-payment", label: "Project Payment" },
  { value: "amc", label: "AMC" },
  { value: "sale-bill", label: "Sale Bill" },
  { value: "commission", label: "Commission" },
  { value: "other", label: "Other" },
];

// 10. EMPLOYEE ROLES
export const employeeRoles: MasterItem[] = [
  { value: "supervisor", label: "Site Supervisor" },
  { value: "installer", label: "Installer" },
  { value: "electrician", label: "Electrician" },
  { value: "helper", label: "Helper" },
  { value: "accountant", label: "Accountant" },
  { value: "driver", label: "Driver" },
  { value: "technician", label: "Technician" },
];

// 11. TEAM MEMBER ROLES (App Users)
export const teamRoles: MasterItem[] = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "accountant", label: "Accountant" },
  { value: "supervisor", label: "Supervisor" },
];

// 12. INVOICE STATUSES
export const invoiceStatuses: MasterItem[] = [
  { value: "pending", label: "Pending" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
];

// 13. TRANSACTION TYPES
export const transactionTypes: MasterItem[] = [
  { value: "credit", label: "Credit" },
  { value: "debit", label: "Debit" },
];

// 14. TOOL CONDITIONS
export const toolConditions: MasterItem[] = [
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "needs-repair", label: "Needs Repair" },
  { value: "damaged", label: "Damaged" },
];

// 15. TOOL STATUS
export const toolStatuses: MasterItem[] = [
  { value: "available", label: "Available" },
  { value: "in-use", label: "In Use" },
];

// 15.5 TOOL CATEGORIES
export const toolCategories: MasterItem[] = [
  { value: "earthing-item", label: "Earthing Item" },
  { value: "digging-tool", label: "Digging Tool" },
  { value: "machinery", label: "Machinery" },
  { value: "safety-equipment", label: "Safety Equipment" },
  { value: "measuring-tool", label: "Measuring Tool" },
  { value: "hand-tool", label: "Hand Tool" },
  { value: "power-tool", label: "Power Tool" },
  { value: "others", label: "Others" },
];

// 16. MATERIAL DAMAGE REASONS (For Expense Reporting)
export const materialDamageReasons: MasterItem[] = [
  { value: "damaged", label: "Item Damaged" },
  { value: "broke-transport", label: "Broke During Transport" },
  { value: "defective", label: "Defective Item" },
  { value: "wrong-item", label: "Wrong Item Sent" },
  { value: "other", label: "Other" },
];

// 17. DASHBOARD TIME FILTERS
export const dashboardTimeFilters: MasterItem[] = [
  { value: "6months", label: "Last 6 Months" },
  { value: "12months", label: "Last 12 Months" },
];

// 18. INDUSTRY TYPES (Settings - Company)
export const industryTypes: MasterItem[] = [
  { value: "solar", label: "Solar Energy" },
  { value: "construction", label: "Construction" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "realestate", label: "Real Estate" },
];

// 19. COST ALLOCATION OPTIONS
export const costAllocationOptions: MasterItem[] = [
  { value: "reimburse", label: "Company will reimburse" },
  { value: "deduct", label: "Deduct from employee salary" },
];

// 20. QUOTATION PRESET CATEGORIES
export const quotationPresetCategories: MasterItem[] = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "industrial", label: "Industrial" },
];

// 21. SYSTEM CAPACITIES (kW)
export const systemCapacities: MasterItem[] = [
  { value: "1", label: "1 kW" },
  { value: "2", label: "2 kW" },
  { value: "3", label: "3 kW" },
  { value: "5", label: "5 kW" },
  { value: "10", label: "10 kW" },
  { value: "15", label: "15 kW" },
  { value: "20", label: "20 kW" },
  { value: "25", label: "25 kW" },
  { value: "50", label: "50 kW" },
  { value: "100", label: "100 kW" },
];

// 22. PANEL BRANDS
export const panelBrands: MasterItem[] = [
  { value: "waaree", label: "Waaree" },
  { value: "tata", label: "Tata Power Solar" },
  { value: "adani", label: "Adani Solar" },
  { value: "vikram", label: "Vikram Solar" },
  { value: "canadian-solar", label: "Canadian Solar" },
  { value: "jinko", label: "Jinko Solar" },
  { value: "longi", label: "LONGi" },
  { value: "rec", label: "REC Solar" },
];

// 23. INVERTER BRANDS
export const inverterBrands: MasterItem[] = [
  { value: "growatt", label: "Growatt" },
  { value: "sungrow", label: "Sungrow" },
  { value: "goodwe", label: "GoodWe" },
  { value: "fronius", label: "Fronius" },
  { value: "solaredge", label: "SolarEdge" },
  { value: "huawei", label: "Huawei" },
  { value: "solis", label: "Solis" },
  { value: "delta", label: "Delta" },
];

// 24. STRUCTURE TYPES
export const structureTypes: MasterItem[] = [
  { value: "elevated-gi", label: "Elevated - GI" },
  { value: "elevated-aluminum", label: "Elevated - Aluminum" },
  { value: "flush-gi", label: "Flush Mount - GI" },
  { value: "flush-aluminum", label: "Flush Mount - Aluminum" },
  { value: "ground-mounted", label: "Ground Mounted" },
];

// 25. QUOTATION MATERIAL CATEGORIES
export const quotationMaterialCategories: MasterItem[] = [
  { value: "structure", label: "Structure" },
  { value: "panel-module", label: "Panel/Module" },
  { value: "wiring", label: "Wiring" },
  { value: "earthing", label: "Earthing" },
  { value: "civil", label: "Civil" },
  { value: "meter", label: "Meter" },
];

// 26. QUOTATION CHECKLIST ITEMS
export const quotationChecklistItems: MasterItem[] = [
  { value: "site-survey", label: "Site Survey" },
  { value: "design-approval", label: "Design Approval" },
  { value: "material-procurement", label: "Material Procurement" },
  { value: "installation", label: "Installation" },
  { value: "testing-commissioning", label: "Testing & Commissioning" },
  { value: "net-metering", label: "Net Metering Application" },
  { value: "handover-documentation", label: "Handover & Documentation" },
];

// 26.1 SITE CHECKLIST PRESETS (Groups of materials for site dispatch)
export interface SiteChecklistPresetItem {
  id: string;
  materialName: string;
  requiredQuantity: number;
  inventoryItemId?: number;
}

export interface SiteChecklistPreset {
  id: string;
  name: string;
  category: "residential" | "commercial" | "industrial";
  items: SiteChecklistPresetItem[];
}

export const siteChecklistPresets: SiteChecklistPreset[] = [
  {
    id: "res-std-3kw",
    name: "3kW Residential Standard",
    category: "residential",
    items: [
      { id: "1", materialName: "Solar Panels 540W", requiredQuantity: 6 },
      { id: "2", materialName: "Inverter 3kW", requiredQuantity: 1 },
      { id: "3", materialName: "Mounting Structure Set", requiredQuantity: 1 },
      { id: "4", materialName: "DC Cable 4sqmm", requiredQuantity: 30 },
      { id: "5", materialName: "Earthing Kit", requiredQuantity: 2 },
    ]
  },
  {
    id: "res-std-5kw",
    name: "5kW Residential Standard",
    category: "residential",
    items: [
      { id: "1", materialName: "Solar Panels 540W", requiredQuantity: 10 },
      { id: "2", materialName: "Inverter 5kW", requiredQuantity: 1 },
      { id: "3", materialName: "Mounting Structure Set", requiredQuantity: 1 },
      { id: "4", materialName: "DC Cable 4sqmm", requiredQuantity: 50 },
      { id: "5", materialName: "Earthing Kit", requiredQuantity: 3 },
    ]
  }
];

// 26. HSN CODES (for goods)
export const hsnCodes: MasterItem[] = [
  { value: "8541", label: "8541 - Solar Cells/Modules" },
  { value: "85414011", label: "85414011 - Solar PV Cells" },
  { value: "85414012", label: "85414012 - Solar PV Modules" },
  { value: "8504", label: "8504 - Inverters/Converters" },
  { value: "85044030", label: "85044030 - Solar Inverters" },
  { value: "8544", label: "8544 - Cables/Wires" },
  { value: "85446090", label: "85446090 - Electric Cables" },
  { value: "7308", label: "7308 - Structures/Parts" },
  { value: "73089090", label: "73089090 - Mounting Structures" },
  { value: "8507", label: "8507 - Batteries" },
  { value: "85076000", label: "85076000 - Lithium Ion Batteries" },
  { value: "9032", label: "9032 - Automatic Regulators" },
  { value: "8536", label: "8536 - Electrical Apparatus" },
];

// 27. SAC CODES (for services)
export const sacCodes: MasterItem[] = [
  { value: "998719", label: "998719 - Installation Services" },
  { value: "998631", label: "998631 - Electrical Works" },
  { value: "995461", label: "995461 - Construction Services" },
  { value: "998399", label: "998399 - Professional Services" },
  { value: "998729", label: "998729 - Maintenance Services" },
  { value: "996611", label: "996611 - Transport Services" },
  { value: "998311", label: "998311 - Technical Consulting" },
];

// 28. GST TAX RATES
export const gstRates: MasterItem[] = [
  { value: "0", label: "0% (Exempt)" },
  { value: "5", label: "5%" },
  { value: "12", label: "12%" },
  { value: "18", label: "18%" },
  { value: "28", label: "28%" },
];

// 29. STATE CODES (for IGST calculation)
export const stateCodes: MasterItem[] = [
  { value: "01", label: "01 - Jammu & Kashmir" },
  { value: "02", label: "02 - Himachal Pradesh" },
  { value: "03", label: "03 - Punjab" },
  { value: "04", label: "04 - Chandigarh" },
  { value: "05", label: "05 - Uttarakhand" },
  { value: "06", label: "06 - Haryana" },
  { value: "07", label: "07 - Delhi" },
  { value: "08", label: "08 - Rajasthan" },
  { value: "09", label: "09 - Uttar Pradesh" },
  { value: "10", label: "10 - Bihar" },
  { value: "11", label: "11 - Sikkim" },
  { value: "12", label: "12 - Arunachal Pradesh" },
  { value: "13", label: "13 - Nagaland" },
  { value: "14", label: "14 - Manipur" },
  { value: "15", label: "15 - Mizoram" },
  { value: "16", label: "16 - Tripura" },
  { value: "17", label: "17 - Meghalaya" },
  { value: "18", label: "18 - Assam" },
  { value: "19", label: "19 - West Bengal" },
  { value: "20", label: "20 - Jharkhand" },
  { value: "21", label: "21 - Odisha" },
  { value: "22", label: "22 - Chhattisgarh" },
  { value: "23", label: "23 - Madhya Pradesh" },
  { value: "24", label: "24 - Gujarat" },
  { value: "26", label: "26 - Dadra & Nagar Haveli and Daman & Diu" },
  { value: "27", label: "27 - Maharashtra" },
  { value: "29", label: "29 - Karnataka" },
  { value: "30", label: "30 - Goa" },
  { value: "31", label: "31 - Lakshadweep" },
  { value: "32", label: "32 - Kerala" },
  { value: "33", label: "33 - Tamil Nadu" },
  { value: "34", label: "34 - Puducherry" },
  { value: "35", label: "35 - Andaman & Nicobar Islands" },
  { value: "36", label: "36 - Telangana" },
  { value: "37", label: "37 - Andhra Pradesh" },
  { value: "38", label: "38 - Ladakh" },
];

// 30. PARTNER TYPES
export const partnerTypes: MasterItem[] = [
  { value: "investor", label: "Investor" },
  { value: "co-owner", label: "Co-Owner" },
  { value: "contractor", label: "Contractor" },
  { value: "silent-partner", label: "Silent Partner" },
];

// 31. PARTNER TRANSACTION TYPES
export const partnerTransactionTypes: MasterItem[] = [
  { value: "investment", label: "Investment" },
  { value: "profit-payment", label: "Profit Payment" },
  { value: "investment-return", label: "Investment Return" },
  { value: "expense-return", label: "Expense Return" },
  { value: "withdrawal", label: "Withdrawal" },
];

// Helper function to get sub-categories for a category
export const getSubCategories = (categoryValue: string): MasterItem[] => {
  switch (categoryValue) {
    case "labour":
      return labourSubCategories;
    case "transport":
      return transportSubCategories;
    case "material":
      return materialSubCategories;
    case "commission":
      return commissionSubCategories;
    case "outsource":
      return outsourceSubCategories;
    default:
      return [];
  }
};

// All sub-categories mapping
export const allSubCategories: Record<string, MasterItem[]> = {
  labour: labourSubCategories,
  transport: transportSubCategories,
  material: materialSubCategories,
  commission: commissionSubCategories,
  outsource: outsourceSubCategories,
};

// All master categories for Settings page
export const allMasterCategories: MasterCategory[] = [
  {
    id: "projectTypes",
    label: "Project Types",
    description: "Types of projects (EPC, INC)",
    items: projectTypes,
    isEditable: true,
  },
  {
    id: "projectCategories",
    label: "Project Categories",
    description: "Project classification",
    items: projectCategories,
    isEditable: true,
  },
  {
    id: "projectOwnerTypes",
    label: "Project Owner Types",
    description: "How project is owned/managed",
    items: projectOwnerTypes,
    isEditable: true,
  },
  {
    id: "projectSources",
    label: "Project Sources",
    description: "Where project originated from",
    items: projectSources,
    isEditable: true,
  },
  {
    id: "projectStatuses",
    label: "Project Statuses",
    description: "Project status options",
    items: projectStatuses,
    isEditable: false,
  },
  {
    id: "progressStages",
    label: "Progress Stages",
    description: "Project workflow stages",
    items: progressStages,
    isEditable: true,
  },
  {
    id: "siteExpenseCategories",
    label: "Site Expense Categories",
    description: "Expense categories for projects/sites",
    items: siteExpenseCategories,
    allowSubCategories: true,
    isEditable: true,
  },
  {
    id: "labourSubCategories",
    label: "Labour Sub-Categories",
    description: "Sub-categories under Labour expenses",
    items: labourSubCategories,
    parentCategoryId: "labour",
    isEditable: true,
  },
  {
    id: "transportSubCategories",
    label: "Transport Sub-Categories",
    description: "Sub-categories under Transport expenses",
    items: transportSubCategories,
    parentCategoryId: "transport",
    isEditable: true,
  },
  {
    id: "materialSubCategories",
    label: "Material Sub-Categories",
    description: "Sub-categories under Material expenses",
    items: materialSubCategories,
    parentCategoryId: "material",
    isEditable: true,
  },
  {
    id: "commissionSubCategories",
    label: "Commission Sub-Categories",
    description: "Sub-categories under Commission expenses",
    items: commissionSubCategories,
    parentCategoryId: "commission",
    isEditable: true,
  },
  {
    id: "outsourceSubCategories",
    label: "Outsource Sub-Categories",
    description: "Sub-categories under Outsourced Work",
    items: outsourceSubCategories,
    parentCategoryId: "outsource",
    isEditable: true,
  },
  {
    id: "companyExpenseCategories",
    label: "Company Expense Categories",
    description: "Non-site related expenses",
    items: companyExpenseCategories,
    isEditable: true,
  },
  {
    id: "employeeExpenseCategories",
    label: "Employee Expense Categories",
    description: "Employee-related expenses (HR)",
    items: employeeExpenseCategories,
    isEditable: true,
  },
  {
    id: "ownerExpenseCategories",
    label: "Owner/MK Expense Categories",
    description: "Owner expense types",
    items: ownerExpenseCategories,
    isEditable: true,
  },
  {
    id: "outsourceWorkTags",
    label: "Outsource Work Tags",
    description: "Tags for outsourced work",
    items: outsourceWorkTags,
    isEditable: true,
  },
  {
    id: "payerTypes",
    label: "Payer Types (Who Can Pay)",
    description: "Who can make payments",
    items: payerTypes,
    isEditable: true,
  },
  {
    id: "inventoryCategories",
    label: "Inventory Categories",
    description: "Stock item categories",
    items: inventoryCategories,
    isEditable: true,
  },
  {
    id: "vendorCategories",
    label: "Vendor Categories",
    description: "Supplier types",
    items: vendorCategories,
    isEditable: true,
  },
  {
    id: "measurementUnits",
    label: "Measurement Units",
    description: "Units for inventory items",
    items: measurementUnits,
    isEditable: true,
  },
  {
    id: "paymentMethods",
    label: "Payment Methods",
    description: "Payment modes",
    items: paymentMethods,
    isEditable: true,
  },
  {
    id: "incomeCategories",
    label: "Income Categories",
    description: "Income source types",
    items: incomeCategories,
    isEditable: true,
  },
  {
    id: "loanSources",
    label: "Loan Sources",
    description: "Sources for loans",
    items: loanSources,
    isEditable: true,
  },
  {
    id: "partnerTypes",
    label: "Partner Types",
    description: "Types of business partners",
    items: partnerTypes,
    isEditable: true,
  },
  {
    id: "partnerTransactionTypes",
    label: "Partner Transaction Types",
    description: "Types of partner transactions",
    items: partnerTransactionTypes,
    isEditable: true,
  },
  {
    id: "employeeRoles",
    label: "Employee Roles",
    description: "Field employee designations",
    items: employeeRoles,
    isEditable: true,
  },
  {
    id: "teamRoles",
    label: "Team Roles",
    description: "App user roles",
    items: teamRoles,
    isEditable: false,
  },
  {
    id: "invoiceStatuses",
    label: "Invoice Statuses",
    description: "Invoice payment statuses",
    items: invoiceStatuses,
    isEditable: false,
  },
  {
    id: "toolConditions",
    label: "Tool Conditions",
    description: "Tool condition options",
    items: toolConditions,
    isEditable: true,
  },
  {
    id: "toolCategories",
    label: "Tool Categories",
    description: "Tool classification",
    items: toolCategories,
    isEditable: true,
  },
  {
    id: "toolStatuses",
    label: "Tool Statuses",
    description: "Tool availability statuses",
    items: toolStatuses,
    isEditable: false,
  },
  {
    id: "materialDamageReasons",
    label: "Material Damage Reasons",
    description: "Reasons for material damage/loss",
    items: materialDamageReasons,
    isEditable: true,
  },
  {
    id: "industryTypes",
    label: "Industry Types",
    description: "Company industry classification",
    items: industryTypes,
    isEditable: true,
  },
  {
    id: "quotationPresetCategories",
    label: "Quotation Preset Categories",
    description: "Categories for quotation templates",
    items: quotationPresetCategories,
    isEditable: true,
  },
  {
    id: "systemCapacities",
    label: "System Capacities",
    description: "Solar system capacity options",
    items: systemCapacities,
    isEditable: true,
  },
  {
    id: "panelBrands",
    label: "Panel Brands",
    description: "Solar panel manufacturers",
    items: panelBrands,
    isEditable: true,
  },
  {
    id: "inverterBrands",
    label: "Inverter Brands",
    description: "Solar inverter manufacturers",
    items: inverterBrands,
    isEditable: true,
  },
  {
    id: "structureTypes",
    label: "Structure Types",
    description: "Mounting structure types",
    items: structureTypes,
    isEditable: true,
  },
  {
    id: "quotationMaterialCategories",
    label: "Quotation Material Categories",
    description: "Material categories for quotations",
    items: quotationMaterialCategories,
    isEditable: true,
  },
  {
    id: "quotationChecklistItems",
    label: "Quotation Checklist Items",
    description: "Checklist items for quotation workflow",
    items: [],
    isEditable: true,
  },
  {
    id: "hsnCodes",
    label: "HSN Codes",
    description: "Harmonized System codes for goods",
    items: hsnCodes,
    isEditable: true,
  },
  {
    id: "sacCodes",
    label: "SAC Codes",
    description: "Service Accounting codes for services",
    items: sacCodes,
    isEditable: true,
  },
  {
    id: "gstRates",
    label: "GST Tax Rates",
    description: "GST rate options",
    items: gstRates,
    isEditable: false,
  },
  {
    id: "stateCodes",
    label: "State Codes",
    description: "Indian state codes for GST",
    items: stateCodes,
    isEditable: false,
  },
];

// Default bank accounts (user-editable)
export const defaultBankAccounts: MasterItem[] = [
  { value: "hdfc-1234", label: "HDFC Bank - 1234", isEditable: true },
  { value: "sbi-5678", label: "SBI - 5678", isEditable: true },
  { value: "icici-9012", label: "ICICI - 9012", isEditable: true },
];
