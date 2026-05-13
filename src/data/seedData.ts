/**
 * MSS Comprehensive Seed Dataset (Phase 4 Modular Architecture)
 * Full 4-month historical journey: Enquiries -> Quotations -> Projects -> Finance.
 * High-quality, connected entities with realistic names and modular project scopes.
 */
import type { 
  Project, Employee, AttendanceRecord, Quotation, InventoryItem, Vendor, 
  Task, QuotationVisibilityPreset, Enquiry, SiteRecord, Team 
} from "@/types/project";
import type { QuotationTemplate, SiteChecklistTemplate } from "@/types/templates";
import type {
  Customer, Invoice, Expense, Income, Partner, PartnerTransaction, Loan,
  LoanRepayment, Payment, OwnerInvestment, EmployeePaidHoliday, Agent,
  AuditLogEntry, AccountingReviewQueueItem, AccountingVoucher, InventoryPreset,
  EmployeePayrollRecord, VendorshipCompany, INCGiverCompany
} from "@/types/finance";
import type { VendorBill, VendorPayment } from "@/types/inventory";

// ═══ CUSTOMERS ═══
export const seedCustomers: Customer[] = [
  { id: "C001", name: "Rajesh Gupta", phone: "9812000101", email: "rajesh.gupta@gmail.com", address: "Sector 14, Gurgaon", type: "individual", itemsBought: ["Solar EPC"], totalPurchases: 450000, lastPurchase: "2026-04-15", createdAt: "2026-01-10" },
  { id: "C002", name: "Sonal Mehta", phone: "9812000102", email: "sonal.mehta@yahoo.com", address: "Gokul Dham, Mumbai", type: "individual", itemsBought: ["Solar EPC"], totalPurchases: 320000, lastPurchase: "2026-03-20", createdAt: "2026-01-12" },
  { id: "C003", name: "Amit Deshmukh", phone: "9812000103", email: "amit.d@gmail.com", address: "Kothrud, Pune", type: "individual", itemsBought: ["Solar EPC"], totalPurchases: 510000, lastPurchase: "2026-04-28", createdAt: "2026-01-15" },
  { id: "C004", name: "Prakash Industries", phone: "9812000104", email: "procurement@prakashind.com", address: "MIDC Ambad, Nashik", type: "company", gstin: "27AAAAA0004A1Z5", itemsBought: ["Solar EPC", "Maintenance"], totalPurchases: 2500000, lastPurchase: "2026-04-01", createdAt: "2026-01-20" },
  { id: "C005", name: "Green Valley Society", phone: "9812000105", email: "admin@greenvalley.res", address: "Kalyani Nagar, Pune", type: "company", gstin: "27BBBBB0005B1Z5", itemsBought: ["Solar EPC"], totalPurchases: 1200000, lastPurchase: "2026-04-10", createdAt: "2026-02-05" },
  { id: "C006", name: "Vikas Khanna", phone: "9812000106", email: "v.khanna@outlook.com", address: "Civil Lines, Delhi", type: "individual", itemsBought: ["Solar EPC"], totalPurchases: 280000, lastPurchase: "2026-02-15", createdAt: "2026-01-25" },
  { id: "C007", name: "Blue Star Logistics", phone: "9812000107", email: "ops@bluestar.log", address: "Navi Mumbai", type: "company", gstin: "27CCCCC0007C1Z5", itemsBought: ["Maintenance"], totalPurchases: 150000, lastPurchase: "2026-05-01", createdAt: "2026-03-10" },
  { id: "C008", name: "Priyanka Sharma", phone: "9812000108", email: "priyanka.s@gmail.com", address: "Indira Nagar, Bangalore", type: "individual", itemsBought: ["Solar EPC"], totalPurchases: 390000, lastPurchase: "2026-04-20", createdAt: "2026-03-15" },
  { id: "C009", name: "Sunshine Hospital", phone: "9812000109", email: "admin@sunshinehosp.in", address: "Gachibowli, Hyderabad", type: "company", gstin: "36DDDDD0009D1Z5", itemsBought: ["Solar EPC"], totalPurchases: 5500000, lastPurchase: "2026-05-02", createdAt: "2026-04-01" },
  { id: "C010", name: "Rohan Kapoor", phone: "9812000110", email: "rohan.kapoor@gmail.com", address: "Banjara Hills, Hyderabad", type: "individual", itemsBought: [], totalPurchases: 0, lastPurchase: "", createdAt: "2026-05-04" },
  { id: "C011", name: "Mahesh Babu", phone: "9300000001", email: "mahesh@cinema.com", address: "Jubilee Hills, Hyderabad", type: "individual", itemsBought: ["Solar EPC"], totalPurchases: 750000, lastPurchase: "2026-03-15", createdAt: "2026-02-10" },
];

// ═══ PARTNERS ═══
export const seedPartners: Partner[] = [
  { id: "P001", name: "EnergyMitra Solutions", type: "Profit-Share", phone: "9000000001", email: "contact@energymitra.in", address: "South Delhi, Delhi", defaultRatePerKw: 70000, notes: "Default 30% profit share", createdAt: "2026-01-05" },
  { id: "P002", name: "Bharat Solar Net", type: "Fixed-Rate", phone: "9000000002", email: "anil@bharatsolar.net", address: "Salt Lake, Kolkata", defaultRatePerKw: 65000, notes: "Fixed backend ₹65k/kW", createdAt: "2026-01-10" },
  { id: "P003", name: "SunBridge Partners", type: "Profit-Share", phone: "9000000003", email: "ops@sunbridge.in", address: "Indiranagar, Bengaluru", defaultRatePerKw: 68000, notes: "Continuity slot P003 — regional JV", createdAt: "2026-01-12" },
  { id: "P004", name: "GreenTech Associates", type: "Profit-Share", phone: "9000000004", email: "rahul@greentech.in", address: "Ballygunge, Kolkata", defaultRatePerKw: 72000, notes: "25% profit share arrangement", createdAt: "2026-02-15" },
  { id: "P005", name: "Apex Installations", type: "Subcontractor", phone: "9000000005", email: "suresh@apexinst.in", address: "Thane, Mumbai", notes: "Subcontractor for installations", createdAt: "2026-03-01" },
];

// ═══ VENDORSHIP CODE COMPANIES ═══
export const seedVendorshipCompanies: VendorshipCompany[] = [
  { id: "VC001", name: "SafePower Systems", phone: "9000000003", email: "meera@safepower.in", address: "Electronic City, Bangalore", registrationCode: "SP/DISCOM/KA/2024/001", notes: "BESCOM registered. ₹25,000 fee per project.", createdAt: "2026-02-01" },
  { id: "VC002", name: "SolarReg Services", phone: "9000000010", email: "admin@solarreg.in", address: "Bandra Kurla Complex, Mumbai", registrationCode: "SR/DISCOM/MH/2024/042", notes: "MSEDCL registered. ₹20,000 flat fee.", createdAt: "2026-03-10" },
];

// ═══ INC GIVER COMPANIES ═══
export const seedINCGiverCompanies: INCGiverCompany[] = [
  { id: "IG001", name: "Prakash Solar EPC", phone: "9000000020", email: "work@prakashsolar.in", address: "MIDC Ambad, Nashik", notes: "Gives us rooftop INC work. Rate: ₹8/watt.", createdAt: "2026-01-20" },
  { id: "IG002", name: "Sunrise Power Projects", phone: "9000000021", email: "contracts@sunrisepwr.in", address: "Navi Mumbai", notes: "Commercial INC projects. Fixed rate basis.", createdAt: "2026-02-25" },
];

// ═══ AGENTS ═══
export const seedAgents: Agent[] = [
  { id: "A001", name: "Deepak Verma", phone: "9100000001", email: "deepak@agents.com", address: "Gurgaon", ratePerKw: 5000, rateType: "per-kw", status: "active", totalReferrals: 12, createdAt: "2026-01-01" },
  { id: "A002", name: "Sunita Reddy", phone: "9100000002", email: "sunita@agents.com", address: "Hyderabad", ratePerKw: 4500, rateType: "per-kw", status: "active", totalReferrals: 8, createdAt: "2026-01-15" },
  { id: "A003", name: "Karan Johar", phone: "9100000003", email: "karan@agents.com", address: "Mumbai", ratePerKw: 5000, rateType: "per-kw", status: "active", totalReferrals: 5, createdAt: "2026-02-10" },
  { id: "A004", name: "Anita Desai", phone: "9100000004", email: "anita@agents.com", address: "Pune", ratePerKw: 6000, rateType: "per-kw", status: "active", totalReferrals: 15, createdAt: "2026-02-20" },
  { id: "A005", name: "Vijay Sharma", phone: "9100000005", email: "vijay.sharma@agents.com", address: "Bangalore", ratePerKw: 4000, rateType: "per-kw", status: "inactive", totalReferrals: 3, createdAt: "2026-03-01" },
];

// ═══ EMPLOYEES ═══
export const seedEmployees: Employee[] = [
  { id: 1, name: "Arjun Kapoor", initial: "AK", role: "Admin", phone: "9200000001", email: "arjun@mss.solar", status: "Active", site: "Office", salary: 85000, wallet: 12500, aadhar: "1234 5678 9012", dob: "1990-05-15", joiningDate: "2025-01-01", daysPresent: 22, daysAbsent: 2, holidays: 4, advancePaid: 0, pendingAmount: 0 },
  { id: 2, name: "Priya Singh", initial: "PS", role: "Project Manager", phone: "9200000002", email: "priya@mss.solar", status: "Active", site: "On Site", salary: 65000, wallet: 8400, aadhar: "2345 6789 0123", dob: "1992-08-20", joiningDate: "2025-03-01", daysPresent: 24, daysAbsent: 0, holidays: 4, advancePaid: 5000, pendingAmount: 0 },
  { id: 3, name: "Rahul Dravid", initial: "RD", role: "Site Supervisor", phone: "9200000003", email: "rahul@mss.solar", status: "Active", site: "On Site", salary: 45000, wallet: 3200, aadhar: "3456 7890 1234", dob: "1988-11-10", joiningDate: "2025-06-01", daysPresent: 20, daysAbsent: 4, holidays: 4, advancePaid: 2000, pendingAmount: 0 },
  { id: 4, name: "Suresh Raina", initial: "SR", role: "Technician", phone: "9200000004", email: "suresh@mss.solar", status: "Active", site: "On Site", salary: 35000, wallet: 1500, aadhar: "4567 8901 2345", dob: "1994-02-25", joiningDate: "2025-09-01", daysPresent: 25, daysAbsent: 0, holidays: 3, advancePaid: 0, pendingAmount: 0 },
  { id: 5, name: "Hardik Pandya", initial: "HP", role: "Sales Manager", phone: "9200000005", email: "hardik@mss.solar", status: "Active", site: "Office", salary: 55000, wallet: 6000, aadhar: "5678 9012 3456", dob: "1993-10-12", joiningDate: "2025-10-01", daysPresent: 23, daysAbsent: 1, holidays: 4, advancePaid: 0, pendingAmount: 0 },
  { id: 6, name: "Rohit Sharma", initial: "RS", role: "Site Supervisor", phone: "9200000006", email: "rohit@mss.solar", status: "Active", site: "On Site", salary: 45000, wallet: 2800, aadhar: "6789 0123 4567", dob: "1989-04-30", joiningDate: "2026-01-15", daysPresent: 21, daysAbsent: 3, holidays: 4, advancePaid: 1000, pendingAmount: 0 },
  { id: 7, name: "K.L. Rahul", initial: "KL", role: "Technician", phone: "9200000007", email: "kl@mss.solar", status: "Active", site: "On Site", salary: 35000, wallet: 1200, aadhar: "7890 1234 5678", dob: "1995-07-18", joiningDate: "2026-02-01", daysPresent: 22, daysAbsent: 2, holidays: 4, advancePaid: 0, pendingAmount: 0 },
  { id: 8, name: "Jasprit Bumrah", initial: "JB", role: "Technician", phone: "9200000008", email: "jasprit@mss.solar", status: "Active", site: "On Site", salary: 35000, wallet: 1100, aadhar: "8901 2345 6789", dob: "1993-12-06", joiningDate: "2026-03-01", daysPresent: 24, daysAbsent: 0, holidays: 4, advancePaid: 0, pendingAmount: 0 },
];

// ═══ ENQUIRIES (4 Months History) ═══
export const seedEnquiries: Enquiry[] = [
  { id: "ENQ-2026-001", customerName: "Mahesh Babu", customerPhone: "9300000001", customerEmail: "mahesh@cinema.com", customerAddress: "Jubilee Hills, Hyderabad", customerType: "individual", source: "website", systemCapacity: "10kW", estimatedBudget: 800000, requirements: "Residential on-grid system with Net Metering", status: "converted", priority: "high", assignedTo: "Hardik Pandya", createdAt: "2026-02-10", updatedAt: "2026-02-20", notes: [] },
  { id: "ENQ-2026-002", customerName: "Rajinikanth", customerPhone: "9300000002", customerEmail: "thalaiva@superstar.com", customerAddress: "Poes Garden, Chennai", customerType: "individual", source: "phone", systemCapacity: "5kW", estimatedBudget: 450000, requirements: "Hybrid solar system for power backup", status: "quotation-sent", priority: "medium", assignedTo: "Hardik Pandya", createdAt: "2026-03-05", updatedAt: "2026-03-15", notes: [] },
  { id: "ENQ-2026-003", customerName: "TATA Steel", customerPhone: "9300000003", customerEmail: "procurement@tatasteel.com", customerAddress: "Jamshedpur", customerType: "company", source: "referral", agentId: "A001", systemCapacity: "500kW", estimatedBudget: 35000000, requirements: "Industrial rooftop solar for warehouse", status: "contacted", priority: "high", assignedTo: "Hardik Pandya", createdAt: "2026-04-12", updatedAt: "2026-04-15", notes: [] },
  { id: "ENQ-2026-004", customerName: "Deepika Padukone", customerPhone: "9300000004", customerEmail: "deepika@bollywood.res", customerAddress: "Prabhadevi, Mumbai", customerType: "individual", source: "social-media", systemCapacity: "15kW", estimatedBudget: 1200000, requirements: "Aesthetic BIPV panels for luxury villa", status: "new", priority: "medium", assignedTo: "Unassigned", createdAt: "2026-05-01", updatedAt: "2026-05-01", notes: [] },
  { id: "ENQ-2026-005", customerName: "SRK Properties", customerPhone: "9300000005", customerEmail: "admin@mannat.res", customerAddress: "Bandra, Mumbai", customerType: "company", source: "walk-in", systemCapacity: "25kW", estimatedBudget: 2200000, requirements: "Society common area lighting solar", status: "lost", priority: "low", assignedTo: "Hardik Pandya", createdAt: "2026-02-25", updatedAt: "2026-03-10", notes: [{ date: "2026-03-10", note: "Client decided to wait for next subsidy cycle.", by: "Hardik Pandya" }] },
  { id: "ENQ-2026-006", customerName: "Anushka Sharma", customerPhone: "9300000006", customerEmail: "anushka@vivi.com", customerAddress: "Worli, Mumbai", customerType: "individual", source: "referral", agentId: "A004", systemCapacity: "12kW", estimatedBudget: 1000000, requirements: "Residential solar for farm house", status: "converted", priority: "high", assignedTo: "Hardik Pandya", createdAt: "2026-03-20", updatedAt: "2026-03-25", notes: [] },
  { id: "ENQ-2026-007", customerName: "Reliance Retail", customerPhone: "9300000007", customerEmail: "ops@reliance.ret", customerAddress: "Ghansoli, Navi Mumbai", customerType: "company", source: "website", systemCapacity: "100kW", estimatedBudget: 8000000, requirements: "Store rooftop solar rollout", status: "contacted", priority: "high", assignedTo: "Hardik Pandya", createdAt: "2026-04-28", updatedAt: "2026-05-02", notes: [] },
  { id: "ENQ-2026-008", customerName: "Virat Kohli", customerPhone: "9300000008", customerEmail: "virat.k@cricket.in", customerAddress: "Gurgaon", customerType: "individual", source: "phone", systemCapacity: "20kW", estimatedBudget: 1800000, requirements: "Performance tracking enabled system", status: "meeting-scheduled", priority: "high", assignedTo: "Hardik Pandya", createdAt: "2026-04-20", updatedAt: "2026-05-03", notes: [] },
];

// ═══ QUOTATIONS ═══
export const seedQuotations: Quotation[] = [
  { id: "Q001", quotationNumber: "MSS/26/001", clientName: "Mahesh Babu", clientPhone: "9300000001", clientEmail: "mahesh@cinema.com", clientCity: "Hyderabad", clientState: "Telangana", status: "approved", quotationType: "solar", enquiryId: "ENQ-2026-001", systemCategory: "residential", systemCapacity: "10kW", totalAmount: 780000, clientAgreedAmount: 750000, paymentType: "cash", isConverted: true, convertedToProjectId: "PROJ-2026-001", createdAt: "2026-02-15", notes: "Discount offered for upfront payment." },
  { id: "Q002", quotationNumber: "MSS/26/002", clientName: "Anushka Sharma", clientPhone: "9300000006", clientEmail: "anushka@vivi.com", clientCity: "Mumbai", clientState: "Maharashtra", status: "approved", quotationType: "solar", enquiryId: "ENQ-2026-006", systemCategory: "residential", systemCapacity: "12kW", totalAmount: 950000, clientAgreedAmount: 920000, paymentType: "loan", isConverted: true, convertedToProjectId: "PROJ-2026-002", createdAt: "2026-03-22", notes: "Loan documentation shared with IDBI Bank." },
  { id: "Q003", quotationNumber: "MSS/26/003", clientName: "Rajinikanth", clientPhone: "9300000002", clientEmail: "thalaiva@superstar.com", clientCity: "Chennai", clientState: "Tamil Nadu", status: "sent", quotationType: "solar", enquiryId: "ENQ-2026-002", systemCategory: "residential", systemCapacity: "5kW", totalAmount: 480000, clientAgreedAmount: 480000, paymentType: "cash", isConverted: false, createdAt: "2026-03-10", notes: "Waiting for client confirmation." },
  { id: "Q004", quotationNumber: "MSS/26/004", clientName: "Green Valley Society", clientPhone: "9812000105", clientEmail: "admin@greenvalley.res", clientCity: "Pune", clientState: "Maharashtra", status: "approved", quotationType: "solar", systemCategory: "commercial", systemCapacity: "25kW", totalAmount: 1850000, clientAgreedAmount: 1800000, paymentType: "cash-and-loan", isConverted: true, convertedToProjectId: "PROJ-2026-003", createdAt: "2026-02-20", notes: "Society board approved." },
];

// ═══ PROJECTS (Modular Scope Configs) ═══
export const seedProjects: Project[] = [
  {
    id: "PROJ-2026-001",
    name: "Mahesh Babu Residential 10kW",
    client: "Mahesh Babu",
    customerId: "C011",
    capacity: "10kW",
    projectType: "Residential",
    lifecycleStatus: "Completed",
    executionPhase: "completed",
    progressStage: "Execution Done",
    startDate: "2026-03-10",
    endDate: "2026-04-20",
    contractAmount: 750000,
    amountReceived: 750000,
    location: "Hyderabad",
    assignees: [2, 3, 4],
    scope: {
      hasMaterial: true,
      hasInstallation: true,
      vendorshipOwner: "MSS",
      leadSource: "MSS_DIRECT",
      billingParty: "MSS"
    },
    projectKind: "SOLO_EPC",
    projectCategory: "solar",
    createdAt: "2026-03-05"
  },
  {
    id: "PROJ-2026-002",
    name: "Mehta Sky-Villa 3kW",
    client: "Sonal Mehta",
    customerId: "C002",
    capacity: "3kW",
    projectType: "Residential",
    lifecycleStatus: "Active",
    executionPhase: "execution",
    progressStage: "Document Filing",
    startDate: "2026-04-01",
    contractAmount: 240000,
    amountReceived: 50000,
    location: "Mumbai",
    assignees: [2, 5],
    scope: {
      hasMaterial: true,
      hasInstallation: true,
      vendorshipOwner: "MSS",
      leadSource: "PARTNER",
      partnerId: "P001",
      billingParty: "MSS"
    },
    projectKind: "PARTNER_EPC",
    projectCategory: "solar",
    createdAt: "2026-03-25"
  },
  {
    id: "PROJ-2026-003",
    name: "Bharat-Fixed Ambit 10kW",
    client: "TBD (Partner Managed)",
    capacity: "10kW",
    projectType: "Commercial",
    lifecycleStatus: "Active",
    executionPhase: "execution",
    progressStage: "Procurement",
    startDate: "2026-04-15",
    contractAmount: 700000,
    amountReceived: 0,
    location: "Kolkata",
    assignees: [2],
    scope: {
      hasMaterial: true,
      hasInstallation: true,
      vendorshipOwner: "MSS",
      leadSource: "PARTNER",
      partnerId: "P002",
      billingParty: "PARTNER",
      vendorshipFeeAmount: 25000
    },
    projectKind: "FIXED_EPC",
    projectCategory: "solar",
    createdAt: "2026-04-05"
  },
  {
    id: "PROJ-2026-004",
    name: "Prakash MIDC Labour Only",
    client: "Prakash Industries",
    customerId: "C004",
    capacity: "50kW",
    projectType: "Industrial",
    lifecycleStatus: "Active",
    executionPhase: "execution",
    progressStage: "Installation",
    startDate: "2026-04-20",
    contractAmount: 150000,
    amountReceived: 30000,
    location: "Nashik",
    assignees: [3, 4],
    scope: {
      hasMaterial: false,
      hasInstallation: true,
      vendorshipOwner: "Client",
      leadSource: "MSS_DIRECT",
      billingParty: "MSS"
    },
    projectKind: "INC",
    projectCategory: "solar",
    createdAt: "2026-04-15"
  },
  {
    id: "PROJ-2026-005",
    name: "EnergyMitra Outsourced Install",
    client: "Deshmukh Kothrud",
    customerId: "C003",
    capacity: "8kW",
    projectType: "Residential",
    lifecycleStatus: "Active",
    executionPhase: "execution",
    progressStage: "Material Delivered",
    startDate: "2026-04-25",
    contractAmount: 620000,
    amountReceived: 300000,
    location: "Pune",
    assignees: [2],
    scope: {
      hasMaterial: true,
      hasInstallation: true,
      installationBy: "Subcontractor",
      partnerId: "P004",
      vendorshipOwner: "MSS",
      leadSource: "PARTNER",
      billingParty: "MSS"
    },
    projectKind: "OUTSOURCED_INC",
    projectCategory: "solar",
    createdAt: "2026-04-20"
  },
  {
    id: "PROJ-2026-006",
    name: "SafePower Vendorship Only",
    client: "K.K. Energy (External)",
    capacity: "15kW",
    projectType: "Commercial",
    lifecycleStatus: "Active",
    executionPhase: "execution",
    progressStage: "Code Sharing",
    startDate: "2026-05-01",
    contractAmount: 30000,
    amountReceived: 0,
    location: "Bangalore",
    assignees: [5],
    scope: {
      hasMaterial: false,
      hasInstallation: false,
      vendorshipOwner: "MSS",
      leadSource: "MSS_DIRECT",
      vendorshipCompanyId: "VC001",
      billingParty: "MSS",
      vendorshipFeeAmount: 30000
    },
    externalVendorshipEntity: "SafePower Systems",
    vendorshipFeeReceivable: 30000,
    projectKind: "VENDORSHIP_ONLY",
    projectCategory: "solar",
    createdAt: "2026-04-30"
  },
];

// ═══ FINANCE: INVOICES (Mixed Types) ═══
export const seedInvoices: Invoice[] = [
  { id: "INV-2026-001", invoiceNumber: "MSS/INV/001", type: "invoice", customerId: "C011", customerName: "Mahesh Babu", projectId: "PROJ-2026-001", items: [], services: [], subtotal: 750000, cgst: 0, sgst: 0, igst: 0, total: 750000, amountReceived: 750000, status: "paid", invoiceDate: "2026-03-15", dueDate: "2026-03-25", createdAt: "2026-03-15" },
  { id: "INV-2026-002", invoiceNumber: "MSS/INV/002", type: "invoice", customerId: "C002", customerName: "Sonal Mehta", projectId: "PROJ-2026-002", items: [], services: [], subtotal: 240000, cgst: 0, sgst: 0, igst: 0, total: 240000, amountReceived: 50000, status: "partial", invoiceDate: "2026-04-05", dueDate: "2026-04-15", createdAt: "2026-04-05" },
  { id: "INV-2026-003", invoiceNumber: "MSS/INV/003", type: "invoice", customerId: "C004", customerName: "Prakash Industries", projectId: "PROJ-2026-004", items: [], services: [], subtotal: 150000, cgst: 0, sgst: 0, igst: 0, total: 150000, amountReceived: 30000, status: "partial", invoiceDate: "2026-04-20", dueDate: "2026-04-30", createdAt: "2026-04-20" },
];

// ═══ FINANCE: PAYMENTS & EXPENSES (4 Months History) ═══
export const seedPayments: Payment[] = [
  { id: "PAY-001", date: "2026-02-05", amount: 45000, direction: "out", paymentMode: "Bank Transfer", notes: "Office Rent Feb", counterpartyType: "other", counterpartyName: "Landlord" },
  { id: "PAY-002", date: "2026-03-05", amount: 45000, direction: "out", paymentMode: "Bank Transfer", notes: "Office Rent Mar", counterpartyType: "other", counterpartyName: "Landlord" },
  { id: "PAY-003", date: "2026-04-05", amount: 45000, direction: "out", paymentMode: "Bank Transfer", notes: "Office Rent Apr", counterpartyType: "other", counterpartyName: "Landlord" },
  { id: "PAY-004", date: "2026-05-05", amount: 45000, direction: "out", paymentMode: "Bank Transfer", notes: "Office Rent May", counterpartyType: "other", counterpartyName: "Landlord" },
  { id: "PAY-005", date: "2026-02-28", amount: 285000, direction: "out", paymentMode: "Bank Transfer", notes: "Salary Payout Feb", counterpartyType: "employee", counterpartyName: "All Staff" },
  { id: "PAY-006", date: "2026-03-31", amount: 285000, direction: "out", paymentMode: "Bank Transfer", notes: "Salary Payout Mar", counterpartyType: "employee", counterpartyName: "All Staff" },
  { id: "PAY-007", date: "2026-04-30", amount: 285000, direction: "out", paymentMode: "Bank Transfer", notes: "Salary Payout Apr", counterpartyType: "employee", counterpartyName: "All Staff" },
];

export const seedExpenses: Expense[] = [
  { id: "EXP-001", date: "2026-02-10", amount: 12000, category: "Marketing", description: "Facebook Ads Feb", paidBy: { type: "company" } },
  { id: "EXP-002", date: "2026-03-10", amount: 15000, category: "Marketing", description: "Facebook Ads Mar", paidBy: { type: "company" } },
  { id: "EXP-003", date: "2026-04-10", amount: 18000, category: "Marketing", description: "Facebook Ads Apr", paidBy: { type: "company" } },
  { id: "EXP-004", date: "2026-02-20", amount: 8500, category: "Operations", description: "Travelling - Arjun", paidBy: { type: "employee", entityId: "1", entityName: "Arjun Kapoor" } },
  { id: "EXP-005", date: "2026-03-25", amount: 4200, category: "Office", description: "Electricity Bill Mar", paidBy: { type: "company" } },
];

// ═══ FINANCE: LOANS (Active with History) ═══
export const seedLoans: Loan[] = [
  { id: "LOAN-001", source: "HDFC Bank", sourceType: "bank", principal: 5000000, emiAmount: 125000, interestRate: 9.5, tenure: 60, startDate: "2025-10-01", outstanding: 3750000, status: "Active", paymentType: "emi" },
  { id: "LOAN-002", source: "ICICI Bank", sourceType: "bank", principal: 2000000, emiAmount: 45000, interestRate: 10.2, tenure: 48, startDate: "2026-01-15", outstanding: 1865000, status: "Active", paymentType: "emi" },
];

export const seedLoanRepayments: LoanRepayment[] = [
  { id: "LR-001", loanId: "LOAN-001", loanSource: "HDFC Bank", date: "2026-02-01", emiNumber: 5, principalPaid: 85000, interestPaid: 40000, totalPaid: 125000 },
  { id: "LR-002", loanId: "LOAN-001", loanSource: "HDFC Bank", date: "2026-03-01", emiNumber: 6, principalPaid: 86000, interestPaid: 39000, totalPaid: 125000 },
  { id: "LR-003", loanId: "LOAN-001", loanSource: "HDFC Bank", date: "2026-04-01", emiNumber: 7, principalPaid: 87000, interestPaid: 38000, totalPaid: 125000 },
  { id: "LR-004", loanId: "LOAN-001", loanSource: "HDFC Bank", date: "2026-05-01", emiNumber: 8, principalPaid: 88000, interestPaid: 37000, totalPaid: 125000 },
  { id: "LR-005", loanId: "LOAN-002", loanSource: "ICICI Bank", date: "2026-02-15", emiNumber: 2, principalPaid: 30000, interestPaid: 15000, totalPaid: 45000 },
  { id: "LR-006", loanId: "LOAN-002", loanSource: "ICICI Bank", date: "2026-03-15", emiNumber: 3, principalPaid: 30500, interestPaid: 14500, totalPaid: 45000 },
  { id: "LR-007", loanId: "LOAN-002", loanSource: "ICICI Bank", date: "2026-04-15", emiNumber: 4, principalPaid: 31000, interestPaid: 14000, totalPaid: 45000 },
];

// ═══ INVENTORY ═══
export const seedInventoryItems: InventoryItem[] = [
  { id: 1, name: "Waaree 540W Mono PERC", category: "Panels", stock: 150, unit: "Nos", minStock: 20, value: 14500, buyPrice: 13000, salePrice: 16000, hsn: "8541", alert: false },
  { id: 2, name: "Growatt 5kW On-grid Inverter", category: "Inverters", stock: 12, unit: "Nos", minStock: 3, value: 42000, buyPrice: 38000, salePrice: 48000, hsn: "8504", alert: false },
  { id: 3, name: "Tata Power 550W Bifacial", category: "Panels", stock: 85, unit: "Nos", minStock: 20, value: 16500, buyPrice: 15000, salePrice: 18500, hsn: "8541", alert: false },
  { id: 4, name: "MC4 Connectors (Pair)", category: "BOS", stock: 450, unit: "Pair", minStock: 100, value: 85, buyPrice: 65, salePrice: 120, hsn: "8536", alert: false },
  { id: 5, name: "GI Structure - 3kW Residential", category: "Structure", stock: 5, unit: "Set", minStock: 2, value: 22000, buyPrice: 18000, salePrice: 28000, hsn: "7308", alert: false },
];

export const seedVendors: Vendor[] = [
  { id: 1, name: "Waaree Energies Ltd", category: ["Panels"], contact: "Sunil Jain", email: "sales@waaree.com", address: "Borivali, Mumbai", gstin: "27AAAWA0001A1Z1", outstandingAmount: 450000, purchaseHistory: [] },
  { id: 2, name: "Growatt New Energy", category: ["Inverters"], contact: "Li Wei", email: "service@growatt.com", address: "Shenzhen, China", outstandingAmount: 0, purchaseHistory: [] },
];

// ═══ HR: ATTENDANCE (Historical) ═══
export const seedAttendanceRecords: AttendanceRecord[] = [
  { id: "ATT-001", employeeId: 1, date: "2026-05-01", status: "present", sites: ["Office"], notes: "Normal check-in" },
  { id: "ATT-002", employeeId: 2, date: "2026-05-01", status: "present", sites: ["PROJ-2026-002"], notes: "Site visit" },
  { id: "ATT-003", employeeId: 3, date: "2026-05-01", status: "present", sites: ["PROJ-2026-004"], notes: "" },
  { id: "ATT-004", employeeId: 4, date: "2026-05-01", status: "absent", sites: [], notes: "Sick leave" },
  { id: "ATT-005", employeeId: 1, date: "2026-05-02", status: "present", sites: ["Office"], notes: "" },
  { id: "ATT-006", employeeId: 2, date: "2026-05-02", status: "present", sites: ["PROJ-2026-002"], notes: "" },
];

// ═══ FALLBACKS / OTHER ═══
export const seedTasks: Task[] = [
  { id: "TASK-001", projectId: "PROJ-2026-002", siteId: "SITE-001", siteName: "Mehta Sky-Villa", workType: "Panel Installation", notes: "Complete by Wed", createdDate: "2026-05-01", workDate: "2026-05-03", status: "started", createdBy: "Arjun Kapoor", employeeId: 4 },
];

export const seedTeams: Team[] = [
  { id: "TEAM-001", name: "Installation Team A", memberIds: [4, 7, 8], leadId: 4, createdAt: "2026-01-01", status: "Active" },
];

export const seedSites: SiteRecord[] = [
  {
    id: 1,
    name: "Mehta Sky-Villa",
    projectId: "PROJ-2026-002",
    projectName: "Mehta Sky-Villa 3kW",
    workStartDate: "2026-05-10",
    status: "active",
    checklistItems: [
      {
        id: "CHK-MEHTA-STRUCTURE",
        requiresMaterial: true,
        inventoryItemId: 5,
        materialName: "GI Structure - 3kW Residential",
        requiredQuantity: 8,
        status: "pending",
      },
      {
        id: "CHK-MEHTA-INVERTER",
        requiresMaterial: true,
        inventoryItemId: 2,
        materialName: "Growatt 5kW On-grid Inverter",
        requiredQuantity: 1,
        status: "pending",
      },
    ],
  },
  {
    id: 2,
    name: "Prakash MIDC",
    projectId: "PROJ-2026-004",
    projectName: "Prakash MIDC Labour Only",
    workStartDate: "2026-05-12",
    status: "active",
    checklistItems: [
      {
        id: "CHK-PRAKASH-MC4",
        requiresMaterial: true,
        inventoryItemId: 4,
        materialName: "MC4 Connectors (Pair)",
        requiredQuantity: 20,
        status: "pending",
      },
    ],
  },
];

export const seedIncomes: Income[] = [
  { id: "INC-001", date: "2026-03-20", amount: 750000, mainCategory: "project", category: "Project Receipt", projectId: "PROJ-2026-001", projectName: "Mahesh Babu Residential", paymentMode: "Bank Transfer", reference: "TXN12345", notes: "Full payment received", createdAt: "2026-03-20" },
  { id: "INC-002", date: "2026-04-10", amount: 50000, mainCategory: "project", category: "Project Receipt", projectId: "PROJ-2026-002", projectName: "Mehta Sky-Villa", paymentMode: "UPI", reference: "UPI98765", notes: "Booking amount", createdAt: "2026-04-10" },
  { id: "INC-003", date: "2026-04-25", amount: 30000, mainCategory: "project", category: "Project Receipt", projectId: "PROJ-2026-004", projectName: "Prakash MIDC Labour", paymentMode: "Cash", notes: "Advance for installation", createdAt: "2026-04-25" },
];

export const seedPartnerTransactions: PartnerTransaction[] = [
  { id: "PTR-001", partnerId: "P001", partnerName: "EnergyMitra Solutions", date: "2026-04-15", amount: 25000, type: "Settlement", direction: "received", notes: "Monthly fixed settlement", projectId: "PROJ-2026-002" },
  { id: "PTR-002", partnerId: "P002", partnerName: "Bharat Solar Net", date: "2026-05-01", amount: 15000, type: "Vendorship Fee", direction: "received", notes: "Partial vendorship fee receipt", projectId: "PROJ-2026-003" },
];

export const seedOwnerInvestments: OwnerInvestment[] = [
  { id: "OW-001", date: "2026-01-01", amount: 1000000, type: "investment", notes: "Initial Capital Infusion", createdAt: "2026-01-01" },
];

export const seedEmployeePaidHolidays: EmployeePaidHoliday[] = [];

export const seedAuditLogs: AuditLogEntry[] = [
  { id: "LOG-001", timestamp: "2026-02-10T10:00:00Z", userId: "U1", userName: "Admin", action: "create", entityType: "Enquiry", entityId: "ENQ-2026-001", entityName: "Mahesh Babu" },
  { id: "LOG-002", timestamp: "2026-03-05T14:30:00Z", userId: "U1", userName: "Admin", action: "create", entityType: "Project", entityId: "PROJ-2026-001", entityName: "Mahesh Babu Residential" },
  { id: "LOG-003", timestamp: "2026-03-15T11:00:00Z", userId: "U1", userName: "Admin", action: "create", entityType: "Invoice", entityId: "INV-2026-001", entityName: "MSS/INV/001" },
  { id: "LOG-004", timestamp: "2026-04-01T09:15:00Z", userId: "U1", userName: "Admin", action: "update", entityType: "Project", entityId: "PROJ-2026-001", entityName: "Mahesh Babu Residential", field: "status", oldValue: "Ongoing", newValue: "Completed" },
  { id: "LOG-005", timestamp: "2026-05-01T16:00:00Z", userId: "U1", userName: "Admin", action: "create", entityType: "Project", entityId: "PROJ-2026-006", entityName: "SafePower Vendorship Only" },
];

export const seedReviewQueue: AccountingReviewQueueItem[] = [
  { id: "REV-001", reason: "High value expense", eventType: "ExpenseCreated", sourceDocumentId: "EXP-003", amount: 18000, createdAt: "2026-04-10T10:00:00Z" },
];

export const seedVouchers: AccountingVoucher[] = [];

export const seedQuotationVisibilityPresets: QuotationVisibilityPreset[] = [
  { id: "VP-01", name: "Standard Customer View", visibility: { systemDetails: true, materials: true, hideAmounts: false, whatYouGet: true, paymentTerms: true, warranty: true, termsConditions: true }, createdAt: "2026-01-01" },
  { id: "VP-02", name: "Hide Amounts (Technical Only)", visibility: { systemDetails: true, materials: true, hideAmounts: true, whatYouGet: true, paymentTerms: false, warranty: true, termsConditions: false }, createdAt: "2026-01-01" },
];

export const seedQuotationTemplates: QuotationTemplate[] = [];
export const seedSiteChecklistTemplates: SiteChecklistTemplate[] = [];
export const seedInventoryPresets: InventoryPreset[] = [];
export const seedTools: any[] = [];
export const seedVendorBills: any[] = [];
export const seedVendorPayments: any[] = [];

export const seedEmployeePayrollRecords: EmployeePayrollRecord[] = [
  { id: "PAYR-2026-02", employeeId: 1, employeeName: "Arjun Kapoor", month: "February", year: 2026, daysPresent: 22, grossAmount: 85000, deductions: 0, netAmount: 85000, paidDate: "2026-02-28", mode: "bank_transfer" },
  { id: "PAYR-2026-03", employeeId: 1, employeeName: "Arjun Kapoor", month: "March", year: 2026, daysPresent: 24, grossAmount: 85000, deductions: 0, netAmount: 85000, paidDate: "2026-03-31", mode: "bank_transfer" },
  { id: "PAYR-2026-04", employeeId: 1, employeeName: "Arjun Kapoor", month: "April", year: 2026, daysPresent: 21, grossAmount: 85000, deductions: 500, netAmount: 84500, paidDate: "2026-04-30", mode: "bank_transfer" },
];
export const seedAgentsData: Agent[] = seedAgents;
