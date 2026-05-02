import type { 
  Project, Employee, AttendanceRecord, Quotation, InventoryItem, Tool, Vendor, 
  InventoryPreset, Task, QuotationVisibilityPreset, Enquiry, SiteRecord 
} from "@/types/project";
import type { QuotationTemplate, SiteChecklistTemplate } from "@/types/templates";
import type { 
  Customer, Invoice, Expense, Income, Partner, PartnerTransaction, Loan, 
  LoanRepayment, Payment, OwnerInvestment, EmployeePaidHoliday, Agent, 
  AuditLogEntry, AccountingReviewQueueItem, AccountingVoucher 
} from "@/types/finance";
import type { Blockage, Ticket, ProjectTimelineStatus, ClientPaymentRecord } from "@/types/blockage";
import type { VendorBill, VendorPayment } from "@/types/inventory";

// Utility to generate a range of dates
const getDatesInRange = (startDate: Date, endDate: Date) => {
  const dates = [];
  let curr = new Date(startDate);
  while (curr <= endDate) {
    dates.push(new Date(curr).toISOString().split("T")[0]);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

// Utility to pick a random item from an array
const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Utility to pick N random items from an array
const pickNRandom = <T>(arr: T[], n: number): T[] => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
};

// Utility to generate a random date between two dates
const randomDate = (start: Date, end: Date) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split("T")[0];
};

const NOW = new Date();
const THREE_MONTHS_AGO = new Date();
THREE_MONTHS_AGO.setMonth(NOW.getMonth() - 3);

// ============ BASE ENTITIES ============

export const seedAgents: Agent[] = [
  { id: "AG001", name: "Rahul Mehta", phone: "9820011223", email: "rahul@agents.com", commissionRate: 2, totalReferrals: 12, createdAt: "2025-10-15" },
  { id: "AG002", name: "Suresh G.", phone: "9821122334", email: "suresh@agents.com", commissionRate: 2.5, totalReferrals: 8, createdAt: "2025-11-01" },
  { id: "AG003", name: "Anita Desai", phone: "9822233445", email: "anita@agents.com", commissionRate: 1.5, totalReferrals: 20, createdAt: "2025-09-20" },
];

export const seedPartners: Partner[] = [
  { id: "PT_PROFIT", name: "Profit Partner", phone: "9000000001", email: "profit@partner.com", address: "Mumbai", notes: "A standard profit sharing partner", createdAt: "2026-05-01" },
  { id: "PT_FIXED", name: "Fixed Partner", phone: "9000000002", email: "fixed@partner.com", address: "Pune", notes: "A fixed amount share partner", createdAt: "2026-05-01" },
  { id: "PT_VENDOR", name: "Vendorship Partner", phone: "9000000003", email: "vendor@partner.com", address: "Surat", notes: "A vendorship execution partner", createdAt: "2026-05-01" },
];

export const seedEmployees: Employee[] = [
  { id: 1, name: "Arjun Singh", role: "supervisor", phone: "9100011122", email: "arjun@mss.com", salary: 35000, wallet: 0, joiningDate: "2025-01-10", daysPresent: 0, daysAbsent: 0, holidays: 0, advancePaid: 0, pendingAmount: 0 },
  { id: 2, name: "Vikram Pawar", role: "installer", phone: "9100022233", email: "vikram@mss.com", salary: 22000, wallet: 0, joiningDate: "2025-03-15", daysPresent: 0, daysAbsent: 0, holidays: 0, advancePaid: 0, pendingAmount: 0 },
  { id: 3, name: "Sanjay K.", role: "electrician", phone: "9100033344", email: "sanjay@mss.com", salary: 28000, wallet: 0, joiningDate: "2025-02-20", daysPresent: 0, daysAbsent: 0, holidays: 0, advancePaid: 0, pendingAmount: 0 },
  { id: 4, name: "Rahul More", role: "helper", phone: "9100044455", email: "rahul@mss.com", salary: 18000, wallet: 0, joiningDate: "2025-05-01", daysPresent: 0, daysAbsent: 0, holidays: 0, advancePaid: 0, pendingAmount: 0 },
  { id: 5, name: "Priya Iyer", role: "accountant", phone: "9100055566", email: "priya@mss.com", salary: 45000, wallet: 0, joiningDate: "2024-12-01", daysPresent: 0, daysAbsent: 0, holidays: 0, advancePaid: 0, pendingAmount: 0 },
  { id: 6, name: "Omkar G.", role: "technician", phone: "9100066677", email: "omkar@mss.com", salary: 25000, wallet: 0, joiningDate: "2025-04-10", daysPresent: 0, daysAbsent: 0, holidays: 0, advancePaid: 0, pendingAmount: 0 },
  { id: 7, name: "Dinesh K.", role: "driver", phone: "9100077788", email: "dinesh@mss.com", salary: 20000, wallet: 0, joiningDate: "2025-02-01", daysPresent: 0, daysAbsent: 0, holidays: 0, advancePaid: 0, pendingAmount: 0 },
  { id: 8, name: "Sumit J.", role: "installer", phone: "9100088899", email: "sumit@mss.com", salary: 22000, wallet: 0, joiningDate: "2025-06-15", daysPresent: 0, daysAbsent: 0, holidays: 0, advancePaid: 0, pendingAmount: 0 },
];

export const seedVendors: Vendor[] = [
  { id: 1, name: "Waaree Energies Ltd", category: ["solar-panels"], contact: "022-11223344", email: "sales@waaree.com", address: "Mumbai", outstandingAmount: 450000, purchaseHistory: [] },
  { id: 2, name: "Growatt New Energy", category: ["inverter"], contact: "022-22334455", email: "support@growatt.com", address: "Shenzhen/Mumbai", outstandingAmount: 125000, purchaseHistory: [] },
  { id: 3, name: "Polycab Wires", category: ["cable"], contact: "022-33445566", email: "info@polycab.com", address: "Vadodara", outstandingAmount: 0, purchaseHistory: [] },
  { id: 4, name: "Tata Steel", category: ["structure"], contact: "022-44556677", email: "sales@tata.com", address: "Jamshedpur", outstandingAmount: 85000, purchaseHistory: [] },
  { id: 5, name: "Local Hardware Mart", category: ["general", "tools"], contact: "9898989898", email: "hardware@local.com", address: "Pune", outstandingAmount: 1200, purchaseHistory: [] },
];

export const seedInventoryItems: InventoryItem[] = [
  { id: 1, name: "Solar Panel 540W Mono PERC", category: "panel", stock: 10, unit: "pcs", value: 18000, buyPrice: 15000, salePrice: 18000, hsn: "8541", minStock: 20 },
  { id: 2, name: "Solar Panel 450W Mono PERC", category: "panel", stock: 45, unit: "pcs", value: 15000, buyPrice: 12000, salePrice: 15000, hsn: "8541", minStock: 20 },
  { id: 3, name: "Inverter 3kW On-Grid Growatt", category: "inverter", stock: 2, unit: "pcs", value: 35000, buyPrice: 28000, salePrice: 35000, hsn: "8504", minStock: 5 },
  { id: 4, name: "Inverter 5kW On-Grid Sungrow", category: "inverter", stock: 1, unit: "pcs", value: 55000, buyPrice: 45000, salePrice: 55000, hsn: "8504", minStock: 3 },
  { id: 5, name: "DC Cable 4sqmm Red", category: "cable", stock: 50, unit: "m", value: 65, buyPrice: 50, salePrice: 65, hsn: "8544", minStock: 100 },
  { id: 6, name: "DC Cable 4sqmm Black", category: "cable", stock: 45, unit: "m", value: 65, buyPrice: 50, salePrice: 65, hsn: "8544", minStock: 100 },
  { id: 7, name: "Elevated GI Structure (per kW)", category: "structure", stock: 50, unit: "set", value: 8500, buyPrice: 6000, salePrice: 8500, hsn: "7308", minStock: 10 },
  { id: 8, name: "Earthing Rod 2mtr", category: "earthing", stock: 0, unit: "pcs", value: 1200, buyPrice: 850, salePrice: 1200, hsn: "8536", minStock: 10 },
  { id: 9, name: "Earthing Chemical Bag 25kg", category: "earthing", stock: 0, unit: "bag", value: 450, buyPrice: 300, salePrice: 450, hsn: "3824", minStock: 20 },
];

export const seedTools: Tool[] = [
  { id: 1, name: "Bosch Driller GSB 13 RE", assignedTo: "Sanjay K.", site: "Mehta Res", status: "In Use", lastUpdated: "2026-04-20", condition: "Good", category: "power-tool", purchaseRate: 4500, purchaseDate: "2025-10-05" },
  { id: 2, name: "Digital Multimeter Fluke", assignedTo: "Omkar G.", site: "Company Office", status: "Available", lastUpdated: "2026-04-28", condition: "Good", category: "measuring-tool", purchaseRate: 8500, purchaseDate: "2025-12-15" },
  { id: 3, name: "Angle Grinder Dewalt", assignedTo: "Vikram Pawar", site: "Sharma Villa", status: "In Use", lastUpdated: "2026-04-25", condition: "Fair", category: "power-tool", purchaseRate: 3800, purchaseDate: "2025-11-20" },
];

// ============ SALES CYCLE ============

export const seedCustomers: Customer[] = [
  { id: "C001", name: "Anil Sharma", phone: "9812345678", email: "anil@sharma.com", address: "A-401, Sky Heights, Pune", type: "individual", itemsBought: ["3kW Solar System"], totalPurchases: 185000, lastPurchase: "2026-03-10", createdAt: "2026-02-15" },
  { id: "C002", name: "Ravi Textiles Pvt Ltd", phone: "020-11223344", email: "procurement@ravitextiles.com", address: "MIDC Bhosari, Pune", type: "company", gstin: "27AAACR1234A1Z1", itemsBought: ["50kW Industrial Solar"], totalPurchases: 2500000, lastPurchase: "2026-04-05", createdAt: "2026-01-20" },
  { id: "C003", name: "Sunil Deshpande", phone: "9876543210", email: "sunil@desh.com", address: "Flat 12, Rose Villa, Surat", type: "individual", itemsBought: ["5kW Solar System"], totalPurchases: 295000, lastPurchase: "2026-03-25", createdAt: "2026-03-01" },
  { id: "C004", name: "Prerna Hospital", phone: "022-99887766", email: "admin@prernahospital.com", address: "Borivali, Mumbai", type: "company", gstin: "27AAACP9988C1Z2", itemsBought: ["15kW Hybrid System"], totalPurchases: 850000, lastPurchase: "2026-04-15", createdAt: "2026-02-28" },
  { id: "C005", name: "Meera Nair", phone: "9900112233", email: "meera@nair.com", address: "Green View, Kochi", type: "individual", itemsBought: [], totalPurchases: 0, createdAt: "2026-04-10" },
];

export const seedEnquiries: Enquiry[] = [
  { id: "ENQ001", customerName: "Anil Sharma", customerPhone: "9812345678", customerEmail: "anil@sharma.com", customerAddress: "A-401, Sky Heights, Pune", customerType: "individual", source: "phone", systemCapacity: "3kW", estimatedBudget: 200000, requirements: "Rooftop residential solar for savings", status: "converted", priority: "high", assignedTo: "Priya Iyer", customerId: "C001", createdAt: "2026-02-15", updatedAt: "2026-03-01", notes: [{ date: "2026-02-15", note: "Called regarding 3kW system", by: "Priya" }] },
  { id: "ENQ002", customerName: "Meera Nair", customerPhone: "9900112233", customerEmail: "meera@nair.com", customerAddress: "Green View, Kochi", customerType: "individual", source: "website", systemCapacity: "5kW", estimatedBudget: 350000, requirements: "Need hybrid system with battery back", status: "negotiation", priority: "medium", assignedTo: "Priya Iyer", customerId: "C005", createdAt: "2026-04-10", updatedAt: "2026-04-20", notes: [{ date: "2026-04-10", note: "Website inquiry received", by: "System" }] },
  { id: "ENQ003", customerName: "Vikram Batra", customerPhone: "9844332211", customerEmail: "vikram@batra.com", customerAddress: "Chandigarh", customerType: "individual", source: "referral", agentId: "AG001", systemCapacity: "10kW", estimatedBudget: 600000, requirements: "Referral from Rahul Mehta", status: "lost", priority: "low", assignedTo: "Priya Iyer", createdAt: "2026-02-05", updatedAt: "2026-02-28", notes: [{ date: "2026-02-05", note: "Rahul Mehta referred him", by: "Priya" }, { date: "2026-02-28", note: "Budget issues, went for local installer", by: "Priya" }] },
  { id: "ENQ004", customerName: "Modern School", customerPhone: "011-55443322", customerEmail: "info@modernschool.com", customerAddress: "New Delhi", customerType: "company", source: "walk-in", systemCapacity: "25kW", estimatedBudget: 1200000, requirements: "School rooftop implementation", status: "meeting-scheduled", priority: "high", assignedTo: "Priya Iyer", createdAt: "2026-04-25", updatedAt: "2026-04-28", notes: [{ date: "2026-04-25", note: "Principal visited office", by: "Priya" }] },
  {
    "id": "ENQ005",
    "customerName": "Rohan Joshi",
    "customerPhone": "9049876798",
    "customerEmail": "rohan.joshi@example.com",
    "customerAddress": "Shivajinagar, Pune",
    "customerType": "individual",
    "source": "referral",
    "agentId": "AG002",
    "systemCapacity": "3kW",
    "estimatedBudget": 139158,
    "requirements": "Interested in 3kW solar setup for Shivajinagar, Pune property.",
    "status": "new",
    "priority": "low",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-04-14",
    "updatedAt": "2026-04-18",
    "notes": [
      {
        "date": "2026-04-14",
        "note": "Inquiry received via referral",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ006",
    "customerName": "Priya Singh",
    "customerPhone": "9083321590",
    "customerEmail": "priya.singh@example.com",
    "customerAddress": "Shivajinagar, Pune",
    "customerType": "individual",
    "source": "social-media",
    "systemCapacity": "100kW",
    "estimatedBudget": 5003328,
    "requirements": "Interested in 100kW solar setup for Shivajinagar, Pune property.",
    "status": "converted",
    "priority": "medium",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-04-13",
    "updatedAt": "2026-04-16",
    "notes": [
      {
        "date": "2026-04-13",
        "note": "Inquiry received via facebook",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ007",
    "customerName": "Hardip Singh Puri",
    "customerPhone": "9218206411",
    "customerEmail": "hardip.singh.puri@example.com",
    "customerAddress": "Bavdhan, Pune",
    "customerType": "individual",
    "source": "website",
    "systemCapacity": "50kW",
    "estimatedBudget": 2488812,
    "requirements": "Interested in 50kW solar setup for Bavdhan, Pune property.",
    "status": "new",
    "priority": "low",
    "assignedTo": "Arjun Singh",
    "createdAt": "2026-04-15",
    "updatedAt": "2026-04-20",
    "notes": [
      {
        "date": "2026-04-15",
        "note": "Inquiry received via website",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ008",
    "customerName": "Sushilkumar Shinde",
    "customerPhone": "9449856338",
    "customerEmail": "sushilkumar.shinde@example.com",
    "customerAddress": "Tathawade, Pune",
    "customerType": "company",
    "source": "social-media",
    "systemCapacity": "5kW",
    "estimatedBudget": 235122,
    "requirements": "Interested in 5kW solar setup for Tathawade, Pune property.",
    "status": "contacted",
    "priority": "medium",
    "assignedTo": "Arjun Singh",
    "createdAt": "2026-02-12",
    "updatedAt": "2026-04-17",
    "notes": [
      {
        "date": "2026-02-12",
        "note": "Inquiry received via facebook",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ009",
    "customerName": "Prithviraj Chavan",
    "customerPhone": "9814421458",
    "customerEmail": "prithviraj.chavan@example.com",
    "customerAddress": "Ravet, Pune",
    "customerType": "individual",
    "source": "website",
    "systemCapacity": "5kW",
    "estimatedBudget": 230105,
    "requirements": "Interested in 5kW solar setup for Ravet, Pune property.",
    "status": "meeting-scheduled",
    "priority": "low",
    "assignedTo": "Arjun Singh",
    "createdAt": "2026-02-12",
    "updatedAt": "2026-04-03",
    "notes": [
      {
        "date": "2026-02-12",
        "note": "Inquiry received via website",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ010",
    "customerName": "Pramod Mahajan",
    "customerPhone": "9448375836",
    "customerEmail": "pramod.mahajan@example.com",
    "customerAddress": "Shivajinagar, Pune",
    "customerType": "individual",
    "source": "walk-in",
    "systemCapacity": "100kW",
    "estimatedBudget": 4975542,
    "requirements": "Interested in 100kW solar setup for Shivajinagar, Pune property.",
    "status": "contacted",
    "priority": "low",
    "assignedTo": "Arjun Singh",
    "createdAt": "2026-03-24",
    "updatedAt": "2026-04-20",
    "notes": [
      {
        "date": "2026-03-24",
        "note": "Inquiry received via walk-in",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ011",
    "customerName": "Rajesh Kumar",
    "customerPhone": "9349830500",
    "customerEmail": "rajesh.kumar@example.com",
    "customerAddress": "Hinjewadi, Pune",
    "customerType": "individual",
    "source": "referral",
    "agentId": "AG003",
    "systemCapacity": "15kW",
    "estimatedBudget": 751147,
    "requirements": "Interested in 15kW solar setup for Hinjewadi, Pune property.",
    "status": "lost",
    "priority": "medium",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-02-12",
    "updatedAt": "2026-02-13",
    "notes": [
      {
        "date": "2026-02-12",
        "note": "Inquiry received via referral",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ012",
    "customerName": "Gopinath Munde",
    "customerPhone": "9590835848",
    "customerEmail": "gopinath.munde@example.com",
    "customerAddress": "Camp, Pune",
    "customerType": "company",
    "source": "social-media",
    "systemCapacity": "3kW",
    "estimatedBudget": 169874,
    "requirements": "Interested in 3kW solar setup for Camp, Pune property.",
    "status": "meeting-scheduled",
    "priority": "medium",
    "assignedTo": "Priya Iyer",
    "createdAt": "2026-03-24",
    "updatedAt": "2026-04-05",
    "notes": [
      {
        "date": "2026-03-24",
        "note": "Inquiry received via instagram",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ013",
    "customerName": "Priyush Goyal",
    "customerPhone": "9348120011",
    "customerEmail": "priyush.goyal@example.com",
    "customerAddress": "Ravet, Pune",
    "customerType": "individual",
    "source": "website",
    "systemCapacity": "50kW",
    "estimatedBudget": 2499123,
    "requirements": "Interested in 50kW solar setup for Ravet, Pune property.",
    "status": "meeting-scheduled",
    "priority": "high",
    "assignedTo": "Priya Iyer",
    "createdAt": "2026-02-28",
    "updatedAt": "2026-03-12",
    "notes": [
      {
        "date": "2026-02-28",
        "note": "Inquiry received via website",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ014",
    "customerName": "Amit Sharma",
    "customerPhone": "9083215836",
    "customerEmail": "amit.sharma@example.com",
    "customerAddress": "Hinjewadi, Pune",
    "customerType": "individual",
    "source": "referral",
    "agentId": "AG002",
    "systemCapacity": "3kW",
    "estimatedBudget": 158374,
    "requirements": "Interested in 3kW solar setup for Hinjewadi, Pune property.",
    "status": "lost",
    "priority": "low",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-02-12",
    "updatedAt": "2026-03-24",
    "notes": [
      {
        "date": "2026-02-12",
        "note": "Inquiry received via referral",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ015",
    "customerName": "Kiren Rijiju",
    "customerPhone": "9590835848",
    "customerEmail": "kiren.rijiju@example.com",
    "customerAddress": "Moshi, Pune",
    "customerType": "individual",
    "source": "social-media",
    "systemCapacity": "100kW",
    "estimatedBudget": 4987452,
    "requirements": "Interested in 100kW solar setup for Moshi, Pune property.",
    "status": "negotiation",
    "priority": "medium",
    "assignedTo": "Arjun Singh",
    "createdAt": "2026-03-24",
    "updatedAt": "2026-04-12",
    "notes": [
      {
        "date": "2026-03-24",
        "note": "Inquiry received via instagram",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ016",
    "customerName": "Raj Thackeray",
    "customerPhone": "9348125836",
    "customerEmail": "raj.thackeray@example.com",
    "customerAddress": "Camp, Pune",
    "customerType": "individual",
    "source": "google",
    "systemCapacity": "5kW",
    "estimatedBudget": 245123,
    "requirements": "Interested in 5kW solar setup for Camp, Pune property.",
    "status": "negotiation",
    "priority": "high",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-02-12",
    "updatedAt": "2026-03-24",
    "notes": [
      {
        "date": "2026-02-12",
        "note": "Inquiry received via google",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ017",
    "customerName": "Mansukh Mandaviya",
    "customerPhone": "9590835848",
    "customerEmail": "mansukh.mandaviya@example.com",
    "customerAddress": "Kharadi, Pune",
    "customerType": "individual",
    "source": "phone",
    "systemCapacity": "5kW",
    "estimatedBudget": 255123,
    "requirements": "Interested in 5kW solar setup for Kharadi, Pune property.",
    "status": "converted",
    "priority": "medium",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-03-24",
    "updatedAt": "2026-04-12",
    "notes": [
      {
        "date": "2026-03-24",
        "note": "Inquiry received via phone",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ018",
    "customerName": "Hardip Singh Puri",
    "customerPhone": "9348125836",
    "customerEmail": "hardip.singh.puri@example.com",
    "customerAddress": "Kharadi, Pune",
    "customerType": "individual",
    "source": "website",
    "systemCapacity": "100kW",
    "estimatedBudget": 5051234,
    "requirements": "Interested in 100kW solar setup for Kharadi, Pune property.",
    "status": "new",
    "priority": "low",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-02-12",
    "updatedAt": "2026-03-24",
    "notes": [
      {
        "date": "2026-02-12",
        "note": "Inquiry received via website",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ019",
    "customerName": "Bhupender Yadav",
    "customerPhone": "9590835848",
    "customerEmail": "bhupender.yadav@example.com",
    "customerAddress": "Shivajinagar, Pune",
    "customerType": "individual",
    "source": "social-media",
    "systemCapacity": "3kW",
    "estimatedBudget": 145123,
    "requirements": "Interested in 3kW solar setup for Shivajinagar, Pune property.",
    "status": "contacted",
    "priority": "medium",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-03-24",
    "updatedAt": "2026-04-12",
    "notes": [
      {
        "date": "2026-03-24",
        "note": "Inquiry received via instagram",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ020",
    "customerName": "Smriti Irani",
    "customerPhone": "9348125836",
    "customerEmail": "smriti.irani@example.com",
    "customerAddress": "Camp, Pune",
    "customerType": "individual",
    "source": "referral",
    "agentId": "AG001",
    "systemCapacity": "10kW",
    "estimatedBudget": 505123,
    "requirements": "Interested in 10kW solar setup for Camp, Pune property.",
    "status": "lost",
    "priority": "high",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-02-12",
    "updatedAt": "2026-03-24",
    "notes": [
      {
        "date": "2026-02-12",
        "note": "Inquiry received via referral",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ021",
    "customerName": "Nirmala Sitharaman",
    "customerPhone": "9590835848",
    "customerEmail": "nirmala.sitharaman@example.com",
    "customerAddress": "Ravet, Pune",
    "customerType": "individual",
    "source": "phone",
    "systemCapacity": "100kW",
    "estimatedBudget": 4951234,
    "requirements": "Interested in 100kW solar setup for Ravet, Pune property.",
    "status": "converted",
    "priority": "medium",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-03-24",
    "updatedAt": "2026-04-12",
    "notes": [
      {
        "date": "2026-03-24",
        "note": "Inquiry received via phone",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ022",
    "customerName": "S. Jaishankar",
    "customerPhone": "9348125836",
    "customerEmail": "s.jaishankar@example.com",
    "customerAddress": "Moshi, Pune",
    "customerType": "individual",
    "source": "website",
    "systemCapacity": "50kW",
    "estimatedBudget": 2451234,
    "requirements": "Interested in 50kW solar setup for Moshi, Pune property.",
    "status": "new",
    "priority": "low",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-02-12",
    "updatedAt": "2026-03-24",
    "notes": [
      {
        "date": "2026-02-12",
        "note": "Inquiry received via website",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ023",
    "customerName": "Anurag Thakur",
    "customerPhone": "9590835848",
    "customerEmail": "anurag.thakur@example.com",
    "customerAddress": "Tathawade, Pune",
    "customerType": "individual",
    "source": "walk-in",
    "systemCapacity": "15kW",
    "estimatedBudget": 755123,
    "requirements": "Interested in 15kW solar setup for Tathawade, Pune property.",
    "status": "contacted",
    "priority": "medium",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-03-24",
    "updatedAt": "2026-04-12",
    "notes": [
      {
        "date": "2026-03-24",
        "note": "Inquiry received via walk-in",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ024",
    "customerName": "Vijay Chauhan",
    "customerPhone": "9348125836",
    "customerEmail": "vijay.chauhan@example.com",
    "customerAddress": "Kharadi, Pune",
    "customerType": "individual",
    "source": "social-media",
    "systemCapacity": "20kW",
    "estimatedBudget": 1005123,
    "requirements": "Interested in 20kW solar setup for Kharadi, Pune property.",
    "status": "lost",
    "priority": "high",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-02-12",
    "updatedAt": "2026-03-24",
    "notes": [
      {
        "date": "2026-02-12",
        "note": "Inquiry received via facebook",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ025",
    "customerName": "Vijay Chauhan",
    "customerPhone": "9590835848",
    "customerEmail": "vijay.chauhan@example.com",
    "customerAddress": "Kharadi, Pune",
    "customerType": "individual",
    "source": "google",
    "systemCapacity": "100kW",
    "estimatedBudget": 4951234,
    "requirements": "Interested in 100kW solar setup for Kharadi, Pune property.",
    "status": "negotiation",
    "priority": "medium",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-03-24",
    "updatedAt": "2026-04-12",
    "notes": [
      {
        "date": "2026-03-24",
        "note": "Inquiry received via google",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ026",
    "customerName": "Arun Joshi",
    "customerPhone": "9348125836",
    "customerEmail": "arun.joshi@example.com",
    "customerAddress": "Shivajinagar, Pune",
    "customerType": "individual",
    "source": "referral",
    "agentId": "AG002",
    "systemCapacity": "3kW",
    "estimatedBudget": 155123,
    "requirements": "Interested in 3kW solar setup for Shivajinagar, Pune property.",
    "status": "negotiation",
    "priority": "low",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-02-12",
    "updatedAt": "2026-03-24",
    "notes": [
      {
        "date": "2026-02-12",
        "note": "Inquiry received via referral",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ027",
    "customerName": "Sunita Rao",
    "customerPhone": "9590835848",
    "customerEmail": "sunita.rao@example.com",
    "customerAddress": "Hinjewadi, Pune",
    "customerType": "individual",
    "source": "website",
    "systemCapacity": "5kW",
    "estimatedBudget": 255123,
    "requirements": "Interested in 5kW solar setup for Hinjewadi, Pune property.",
    "status": "new",
    "priority": "high",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-03-24",
    "updatedAt": "2026-04-12",
    "notes": [
      {
        "date": "2026-03-24",
        "note": "Inquiry received via website",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ028",
    "customerName": "Kavita Deshmukh",
    "customerPhone": "9348125836",
    "customerEmail": "kavita.deshmukh@example.com",
    "customerAddress": "Hinjewadi, Pune",
    "customerType": "individual",
    "source": "phone",
    "systemCapacity": "3kW",
    "estimatedBudget": 145123,
    "requirements": "Interested in 3kW solar setup for Hinjewadi, Pune property.",
    "status": "contacted",
    "priority": "low",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-02-12",
    "updatedAt": "2026-03-24",
    "notes": [
      {
        "date": "2026-02-12",
        "note": "Inquiry received via phone",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ029",
    "customerName": "Rahul Saxena",
    "customerPhone": "9590835848",
    "customerEmail": "rahul.saxena@example.com",
    "customerAddress": "Bavdhan, Pune",
    "customerType": "individual",
    "source": "walk-in",
    "systemCapacity": "100kW",
    "estimatedBudget": 5051234,
    "requirements": "Interested in 100kW solar setup for Bavdhan, Pune property.",
    "status": "converted",
    "priority": "medium",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-03-24",
    "updatedAt": "2026-04-12",
    "notes": [
      {
        "date": "2026-03-24",
        "note": "Inquiry received via walk-in",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ030",
    "customerName": "Pooja Hegde",
    "customerPhone": "9348125836",
    "customerEmail": "pooja.hegde@example.com",
    "customerAddress": "Bavdhan, Pune",
    "customerType": "individual",
    "source": "social-media",
    "systemCapacity": "50kW",
    "estimatedBudget": 2451234,
    "requirements": "Interested in 50kW solar setup for Bavdhan, Pune property.",
    "status": "new",
    "priority": "high",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-02-12",
    "updatedAt": "2026-03-24",
    "notes": [
      {
        "date": "2026-02-12",
        "note": "Inquiry received via instagram",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ031",
    "customerName": "Manoj Tiwari",
    "customerPhone": "9590835848",
    "customerEmail": "manoj.tiwari@example.com",
    "customerAddress": "Camp, Pune",
    "customerType": "individual",
    "source": "referral",
    "agentId": "AG003",
    "systemCapacity": "15kW",
    "estimatedBudget": 765123,
    "requirements": "Interested in 15kW solar setup for Camp, Pune property.",
    "status": "contacted",
    "priority": "low",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-03-24",
    "updatedAt": "2026-04-12",
    "notes": [
      {
        "date": "2026-03-24",
        "note": "Inquiry received via referral",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ032",
    "customerName": "Sneha Kulkarni",
    "customerPhone": "9348125836",
    "customerEmail": "sneha.kulkarni@example.com",
    "customerAddress": "Ravet, Pune",
    "customerType": "individual",
    "source": "social-media",
    "systemCapacity": "20kW",
    "estimatedBudget": 1025123,
    "requirements": "Interested in 20kW solar setup for Ravet, Pune property.",
    "status": "lost",
    "priority": "medium",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-02-12",
    "updatedAt": "2026-03-24",
    "notes": [
      {
        "date": "2026-02-12",
        "note": "Inquiry received via facebook",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ033",
    "customerName": "Alok Mishra",
    "customerPhone": "9590835848",
    "customerEmail": "alok.mishra@example.com",
    "customerAddress": "Hinjewadi, Pune",
    "customerType": "individual",
    "source": "google",
    "systemCapacity": "3kW",
    "estimatedBudget": 145123,
    "requirements": "Interested in 3kW solar setup for Hinjewadi, Pune property.",
    "status": "negotiation",
    "priority": "high",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-03-24",
    "updatedAt": "2026-04-12",
    "notes": [
      {
        "date": "2026-03-24",
        "note": "Inquiry received via google",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ034",
    "customerName": "Swati Pandey",
    "customerPhone": "9348125836",
    "customerEmail": "swati.pandey@example.com",
    "customerAddress": "Bavdhan, Pune",
    "customerType": "individual",
    "source": "phone",
    "systemCapacity": "100kW",
    "estimatedBudget": 5051234,
    "requirements": "Interested in 100kW solar setup for Bavdhan, Pune property.",
    "status": "meeting-scheduled",
    "priority": "low",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-02-12",
    "updatedAt": "2026-03-24",
    "notes": [
      {
        "date": "2026-02-12",
        "note": "Inquiry received via phone",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ035",
    "customerName": "Rohan Joshi",
    "customerPhone": "9590835848",
    "customerEmail": "rohan.joshi@example.com",
    "customerAddress": "Hadapsar, Pune",
    "customerType": "individual",
    "source": "website",
    "systemCapacity": "50kW",
    "estimatedBudget": 2485123,
    "requirements": "Interested in 50kW solar setup for Hadapsar, Pune property.",
    "status": "new",
    "priority": "medium",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-03-24",
    "updatedAt": "2026-04-12",
    "notes": [
      {
        "date": "2026-03-24",
        "note": "Inquiry received via website",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ036",
    "customerName": "Nitin Gadkari",
    "customerPhone": "9348125836",
    "customerEmail": "nitin.gadkari@example.com",
    "customerAddress": "Kharadi, Pune",
    "customerType": "individual",
    "source": "walk-in",
    "systemCapacity": "5kW",
    "estimatedBudget": 245123,
    "requirements": "Interested in 5kW solar setup for Kharadi, Pune property.",
    "status": "contacted",
    "priority": "high",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-02-12",
    "updatedAt": "2026-03-24",
    "notes": [
      {
        "date": "2026-02-12",
        "note": "Inquiry received via walk-in",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ037",
    "customerName": "Mamata Banerjee",
    "customerPhone": "9590835848",
    "customerEmail": "mamata.banerjee@example.com",
    "customerAddress": "Aundh, Pune",
    "customerType": "individual",
    "source": "social-media",
    "systemCapacity": "100kW",
    "estimatedBudget": 4995123,
    "requirements": "Interested in 100kW solar setup for Aundh, Pune property.",
    "status": "converted",
    "priority": "low",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-03-24",
    "updatedAt": "2026-04-12",
    "notes": [
      {
        "date": "2026-03-24",
        "note": "Inquiry received via instagram",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ038",
    "customerName": "Arvind Kejriwal",
    "customerPhone": "9348125836",
    "customerEmail": "arvind.kejriwal@example.com",
    "customerAddress": "Aundh, Pune",
    "customerType": "individual",
    "source": "social-media",
    "systemCapacity": "10kW",
    "estimatedBudget": 515123,
    "requirements": "Interested in 10kW solar setup for Aundh, Pune property.",
    "status": "lost",
    "priority": "medium",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-02-12",
    "updatedAt": "2026-03-24",
    "notes": [
      {
        "date": "2026-02-12",
        "note": "Inquiry received via facebook",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ039",
    "customerName": "Uddhav Thackeray",
    "customerPhone": "9590835848",
    "customerEmail": "uddhav.thackeray@example.com",
    "customerAddress": "Kothrud, Pune",
    "customerType": "individual",
    "source": "google",
    "systemCapacity": "3kW",
    "estimatedBudget": 166428,
    "requirements": "Interested in 3kW solar setup for Kothrud, Pune property.",
    "status": "meeting-scheduled",
    "priority": "high",
    "assignedTo": "Priya Iyer",
    "createdAt": "2026-04-27",
    "updatedAt": "2026-04-28",
    "notes": [
      {
        "date": "2026-04-27",
        "note": "Inquiry received via google",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ040",
    "customerName": "Vilarao Deshmukh",
    "customerPhone": "9358170363",
    "customerEmail": "vilarao.deshmukh@example.com",
    "customerAddress": "Kharadi, Pune",
    "customerType": "individual",
    "source": "referral",
    "agentId": "AG002",
    "systemCapacity": "15kW",
    "estimatedBudget": 761412,
    "requirements": "Interested in 15kW solar setup for Kharadi, Pune property.",
    "status": "quotation-sent",
    "priority": "low",
    "assignedTo": "Priya Iyer",
    "createdAt": "2026-04-25",
    "updatedAt": "2026-04-26",
    "notes": [
      {
        "date": "2026-04-25",
        "note": "Inquiry received via referral",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ041",
    "customerName": "Sanjay Gupta",
    "customerPhone": "9218741167",
    "customerEmail": "sanjay.gupta@example.com",
    "customerAddress": "Moshi, Pune",
    "customerType": "company",
    "source": "walk-in",
    "systemCapacity": "15kW",
    "estimatedBudget": 748816,
    "requirements": "Interested in 15kW solar setup for Moshi, Pune property.",
    "status": "lost",
    "priority": "medium",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-03-02",
    "updatedAt": "2026-03-23",
    "notes": [
      {
        "date": "2026-03-02",
        "note": "Inquiry received via walk-in",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ042",
    "customerName": "Nirmala Sitharaman",
    "customerPhone": "9782760444",
    "customerEmail": "nirmala.sitharaman@example.com",
    "customerAddress": "Kalyani Nagar, Pune",
    "customerType": "individual",
    "source": "phone",
    "systemCapacity": "50kW",
    "estimatedBudget": 2479448,
    "requirements": "Interested in 50kW solar setup for Kalyani Nagar, Pune property.",
    "status": "negotiation",
    "priority": "high",
    "assignedTo": "Arjun Singh",
    "createdAt": "2026-04-25",
    "updatedAt": "2026-04-26",
    "notes": [
      {
        "date": "2026-04-25",
        "note": "Inquiry received via phone",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ043",
    "customerName": "Anjali Verma",
    "customerPhone": "9332380752",
    "customerEmail": "anjali.verma@example.com",
    "customerAddress": "Ravet, Pune",
    "customerType": "individual",
    "source": "social-media",
    "systemCapacity": "15kW",
    "estimatedBudget": 761885,
    "requirements": "Interested in 15kW solar setup for Ravet, Pune property.",
    "status": "meeting-scheduled",
    "priority": "low",
    "assignedTo": "Arjun Singh",
    "createdAt": "2026-04-26",
    "updatedAt": "2026-04-27",
    "notes": [
      {
        "date": "2026-04-26",
        "note": "Inquiry received via instagram",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ044",
    "customerName": "Arvind Kejriwal",
    "customerPhone": "9657124878",
    "customerEmail": "arvind.kejriwal@example.com",
    "customerAddress": "Kharadi, Pune",
    "customerType": "individual",
    "source": "google",
    "systemCapacity": "5kW",
    "estimatedBudget": 270178,
    "requirements": "Interested in 5kW solar setup for Kharadi, Pune property.",
    "status": "meeting-scheduled",
    "priority": "medium",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-03-17",
    "updatedAt": "2026-04-04",
    "notes": [
      {
        "date": "2026-03-17",
        "note": "Inquiry received via google",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ045",
    "customerName": "Manoj Tiwari",
    "customerPhone": "9029030171",
    "customerEmail": "manoj.tiwari@example.com",
    "customerAddress": "Pimple Saudagar, Pune",
    "customerType": "individual",
    "source": "walk-in",
    "systemCapacity": "20kW",
    "estimatedBudget": 988740,
    "requirements": "Interested in 20kW solar setup for Pimple Saudagar, Pune property.",
    "status": "quotation-sent",
    "priority": "high",
    "assignedTo": "Arjun Singh",
    "createdAt": "2026-02-09",
    "updatedAt": "2026-03-26",
    "notes": [
      {
        "date": "2026-02-09",
        "note": "Inquiry received via walk-in",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ046",
    "customerName": "Sushilkumar Shinde",
    "customerPhone": "9370485848",
    "customerEmail": "sushilkumar.shinde@example.com",
    "customerAddress": "Hadapsar, Pune",
    "customerType": "individual",
    "source": "phone",
    "systemCapacity": "100kW",
    "estimatedBudget": 5017941,
    "requirements": "Interested in 100kW solar setup for Hadapsar, Pune property.",
    "status": "negotiation",
    "priority": "low",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-02-20",
    "updatedAt": "2026-03-23",
    "notes": [
      {
        "date": "2026-02-20",
        "note": "Inquiry received via phone",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ047",
    "customerName": "Eknath Shinde",
    "customerPhone": "9566522055",
    "customerEmail": "eknath.shinde@example.com",
    "customerAddress": "Kharadi, Pune",
    "customerType": "company",
    "source": "website",
    "systemCapacity": "100kW",
    "estimatedBudget": 4984669,
    "requirements": "Interested in 100kW solar setup for Kharadi, Pune property.",
    "status": "negotiation",
    "priority": "low",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-02-20",
    "updatedAt": "2026-04-18",
    "notes": [
      {
        "date": "2026-02-20",
        "note": "Inquiry received via website",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ048",
    "customerName": "Anurag Thakur",
    "customerPhone": "9983458959",
    "customerEmail": "anurag.thakur@example.com",
    "customerAddress": "Bavdhan, Pune",
    "customerType": "individual",
    "source": "social-media",
    "systemCapacity": "10kW",
    "estimatedBudget": 491289,
    "requirements": "Interested in 10kW solar setup for Bavdhan, Pune property.",
    "status": "negotiation",
    "priority": "low",
    "assignedTo": "Arjun Singh",
    "createdAt": "2026-02-07",
    "updatedAt": "2026-03-05",
    "notes": [
      {
        "date": "2026-02-07",
        "note": "Inquiry received via instagram",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ049",
    "customerName": "Anurag Thakur",
    "customerPhone": "9436405250",
    "customerEmail": "anurag.thakur@example.com",
    "customerAddress": "Hadapsar, Pune",
    "customerType": "individual",
    "source": "social-media",
    "systemCapacity": "5kW",
    "estimatedBudget": 246018,
    "requirements": "Interested in 5kW solar setup for Hadapsar, Pune property.",
    "status": "lost",
    "priority": "medium",
    "assignedTo": "Priya Iyer",
    "createdAt": "2026-04-13",
    "updatedAt": "2026-04-17",
    "notes": [
      {
        "date": "2026-04-13",
        "note": "Inquiry received via facebook",
        "by": "System"
      }
    ]
  },
  {
    "id": "ENQ050",
    "customerName": "Bal Thackeray",
    "customerPhone": "9084195294",
    "customerEmail": "bal.thackeray@example.com",
    "customerAddress": "Magarpatta, Pune",
    "customerType": "individual",
    "source": "website",
    "systemCapacity": "15kW",
    "estimatedBudget": 752346,
    "requirements": "Interested in 15kW solar setup for Magarpatta, Pune property.",
    "status": "quotation-sent",
    "priority": "low",
    "assignedTo": "Vikram Pawar",
    "createdAt": "2026-02-15",
    "updatedAt": "2026-04-02",
    "notes": [
      {
        "date": "2026-02-15",
        "note": "Inquiry received via website",
        "by": "System"
      }
    ]
  }
];

export const seedQuotations: Quotation[] = [
  {
    id: "QUO001",
    quotationNumber: "MSS/QUO/2026/001",
    status: "confirmed",
    quotationType: "solar",
    customerId: "C001",
    clientName: "Anil Sharma",
    clientPhone: "9812345678",
    clientEmail: "anil@sharma.com",
    clientCity: "Pune",
    clientState: "27",
    systemCategory: "residential",
    systemCapacity: "3",
    paymentType: "cash",
    clientAgreedAmount: 185000,
    totalAmount: 185000,
    actualPaidAmount: 185000,
    createdAt: "2026-03-01",
    confirmedAt: "2026-03-05",
    shareHistory: [{ method: "whatsapp", sentAt: "2026-03-01" }],
    isConverted: true,
    convertedToProjectId: "PRJ001"
  },
  {
    id: "QUO002",
    quotationNumber: "MSS/QUO/2026/002",
    status: "sent",
    quotationType: "solar",
    customerId: "C005",
    clientName: "Meera Nair",
    clientPhone: "9900112233",
    clientEmail: "meera@nair.com",
    clientCity: "Kochi",
    clientState: "32",
    systemCategory: "residential",
    systemCapacity: "5",
    paymentType: "loan",
    clientAgreedAmount: 325000,
    totalAmount: 325000,
    actualPaidAmount: 0,
    createdAt: "2026-04-15",
    sentAt: "2026-04-16",
    shareHistory: [{ method: "email", sentAt: "2026-04-16" }],
    isConverted: false
  },
];

// ============ PROJECT EXECUTION ============

export const seedProjects: Project[] = [
  {
    id: "PRJ_SOLO",
    name: "Solo Project Example",
    client: "Anil Sharma",
    location: "Pune",
    category: "residential",
    dealType: "Solo",
    projectKind: "SOLO_EPC",
    lifecycleStatus: "Active",
    status: "Ongoing",
    contractAmount: 200000,
    totalCost: 150000,
    totalPaid: 100000,
    startDate: "2026-05-01",
    expectedEndDate: "2026-06-01",
    customerId: "C001",
    assignedSupervisorId: 1,
    siteRecords: [{ id: 101, name: "Solo Site", status: "active", projectId: "PRJ_SOLO", workStartDate: "2026-05-01" }],
    executionLineItems: [], materialLedger: [], partners: [], documents: [], progressReports: [], tasks: [], attendance: [],
    createdAt: "2026-05-01", updatedAt: "2026-05-01",
    commercialBaseline: {
      id: "CB-PRJ_SOLO",
      customerId: "C001",
      capturedAt: "2026-05-01",
      lines: [{ id: "BL-PRJ_SOLO-sum", description: "Scope - Solo Project", quantity: 1, unit: "job", rate: 200000, total: 200000 }],
      materialsTotal: 0,
      servicesTotal: 200000
    }
  },
  {
    id: "PRJ_PARTNER",
    name: "Partner Project Example",
    client: "Ravi Textiles Pvt Ltd",
    location: "Bhosari",
    category: "industrial",
    dealType: "Partner",
    projectKind: "PARTNER_EPC",
    lifecycleStatus: "Active",
    status: "Ongoing",
    contractAmount: 2500000,
    totalCost: 1800000,
    totalPaid: 1000000,
    startDate: "2026-05-01",
    expectedEndDate: "2026-06-01",
    customerId: "C002",
    assignedSupervisorId: 1,
    partners: [{ partnerId: "PT_PROFIT", partnerName: "Profit Partner", partnerType: "profit", sharePercentage: 30 }],
    createdAt: "2026-05-01", updatedAt: "2026-05-01"
  },
  {
    id: "PRJ_FIXED",
    name: "Fixed Project Example",
    client: "Sunil Deshpande",
    location: "Surat",
    category: "residential",
    dealType: "Fixed",
    projectKind: "FIXED_EPC",
    lifecycleStatus: "Active",
    status: "Ongoing",
    contractAmount: 300000,
    mssBackendAmount: 200000,
    partnerCustomerSellAmount: 300000,
    totalCost: 180000,
    totalPaid: 50000,
    startDate: "2026-05-01",
    expectedEndDate: "2026-06-01",
    customerId: "C003",
    partners: [{ partnerId: "PT_FIXED", partnerName: "Fixed Partner", partnerType: "fixed", fixedAmount: 50000 }],
    createdAt: "2026-05-01", updatedAt: "2026-05-01"
  },
  {
    id: "PRJ_VENDOR",
    name: "Vendorship Project Example",
    client: "Modern School",
    location: "New Delhi",
    category: "commercial",
    dealType: "Vendorship",
    projectKind: "VENDOR_NETWORK",
    lifecycleStatus: "Active",
    status: "Ongoing",
    contractAmount: 1200000,
    totalCost: 900000,
    totalPaid: 200000,
    startDate: "2026-05-01",
    expectedEndDate: "2026-06-01",
    customerId: "C001",
    partners: [{ partnerId: "PT_VENDOR", partnerName: "Vendorship Partner", partnerType: "vendorship", feeAmount: 150000 }],
    createdAt: "2026-05-01", updatedAt: "2026-05-01"
  },
  {
    id: "PRJ_INC",
    name: "INC Project Example",
    client: "Meera Nair",
    location: "Kochi",
    category: "residential",
    dealType: "INC",
    projectKind: "INC",
    lifecycleStatus: "Active",
    status: "Ongoing",
    contractAmount: 45000,
    totalCost: 30000,
    totalPaid: 10000,
    startDate: "2026-05-01",
    expectedEndDate: "2026-06-01",
    customerId: "C005",
    assignedSupervisorId: 6,
    partners: [],
    createdAt: "2026-05-01", updatedAt: "2026-05-01"
  }
];

export const seedSites: SiteRecord[] = [
  { id: 101, name: "Solo Site", projectId: "PRJ_SOLO", status: "active", workStartDate: "2026-05-01", checklistItems: [{ id: "S101_M1", requiresMaterial: true, inventoryItemId: 1, materialName: "Solar Panel 540W", requiredQuantity: 10, status: "pending" }] },
  { id: 102, name: "Partner Site", projectId: "PRJ_PARTNER", status: "active", workStartDate: "2026-05-01", checklistItems: [{ id: "S102_M1", requiresMaterial: true, inventoryItemId: 3, materialName: "Inverter 3kW Growatt", requiredQuantity: 2, status: "pending" }] },
  { id: 103, name: "Fixed Site", projectId: "PRJ_FIXED", status: "active", workStartDate: "2026-05-01", checklistItems: [{ id: "S103_M1", requiresMaterial: true, inventoryItemId: 5, materialName: "DC Cable 4sqmm Red", requiredQuantity: 100, status: "pending" }] },
  { id: 104, name: "Vendor Site", projectId: "PRJ_VENDOR", status: "active", workStartDate: "2026-05-01", checklistItems: [{ id: "S104_M1", requiresMaterial: true, inventoryItemId: 8, materialName: "Earthing Rod 2mtr", requiredQuantity: 4, status: "pending" }] },
  { id: 105, name: "INC Site", projectId: "PRJ_INC", status: "active", workStartDate: "2026-05-01", checklistItems: [{ id: "S105_M1", requiresMaterial: true, inventoryItemId: 1, materialName: "Solar Panel 540W", requiredQuantity: 5, status: "pending" }] },
];

export const seedTasks: Task[] = [
  { id: "TSK_1", employeeId: 2, projectId: "PRJ_SOLO", siteId: "101", siteName: "Solo Site", workType: "Installation", notes: "Initial setup", createdDate: "2026-05-01", workDate: "2026-05-01", status: "done", createdBy: "Admin" },
  { id: "TSK_2", employeeId: 2, projectId: "PRJ_PARTNER", siteId: "102", siteName: "Partner Site", workType: "Electrical", notes: "Wiring", createdDate: "2026-05-01", workDate: "2026-05-01", status: "started", createdBy: "Admin" },
  { id: "TSK_3", employeeId: 2, projectId: "PRJ_FIXED", siteId: "103", siteName: "Fixed Site", workType: "Installation", notes: "Mounting", createdDate: "2026-05-01", workDate: "2026-05-01", status: "started", createdBy: "Admin" },
  { id: "TSK_4", employeeId: 2, projectId: "PRJ_VENDOR", siteId: "104", siteName: "Vendor Site", workType: "Civil", notes: "Foundation", createdDate: "2026-05-01", workDate: "2026-05-01", status: "started", createdBy: "Admin" },
  { id: "TSK_5", employeeId: 2, projectId: "PRJ_INC", siteId: "105", siteName: "INC Site", workType: "Installation", notes: "Labor", createdDate: "2026-05-01", workDate: "2026-05-01", status: "started", createdBy: "Admin" },
];

// ============ FINANCIALS ============

export const seedInvoices: Invoice[] = [
  { id: "INV_1", invoiceNumber: "INV-001", type: "invoice", customerId: "C001", customerName: "Anil Sharma", projectId: "PRJ_SOLO", projectName: "Solo Project Example", items: [{ description: "Solar", hsn: "8541", quantity: 1, rate: 100000, gstRate: 0 }], services: [], subtotal: 100000, cgst: 0, sgst: 0, igst: 0, total: 100000, amountReceived: 100000, status: "paid", invoiceDate: "2026-05-01", dueDate: "2026-05-01", createdAt: "2026-05-01" },
  { id: "INV_2", invoiceNumber: "INV-002", type: "invoice", customerId: "C002", customerName: "Ravi Textiles Pvt Ltd", projectId: "PRJ_PARTNER", projectName: "Partner Project Example", items: [{ description: "Solar", hsn: "8541", quantity: 1, rate: 1000000, gstRate: 0 }], services: [], subtotal: 1000000, cgst: 0, sgst: 0, igst: 0, total: 1000000, amountReceived: 1000000, status: "paid", invoiceDate: "2026-05-01", dueDate: "2026-05-01", createdAt: "2026-05-01" },
];

export const seedPayments: Payment[] = [
  { id: "PAY_1", date: "2026-05-01", amount: 100000, direction: "in", paymentMode: "bank", reference: "BNK1", counterpartyType: "customer", counterpartyId: "C001", counterpartyName: "Anil Sharma", projectId: "PRJ_SOLO", invoiceId: "INV_1" },
  { id: "PAY_2", date: "2026-05-01", amount: 1000000, direction: "in", paymentMode: "bank", reference: "BNK2", counterpartyType: "customer", counterpartyId: "C002", counterpartyName: "Ravi Textiles Pvt Ltd", projectId: "PRJ_PARTNER", invoiceId: "INV_2" },
];

export const seedExpenses: Expense[] = [
  { id: "EXP_1", date: "2026-05-01", amount: 50000, mainCategory: "site", category: "material", subCategory: "local", projectId: "PRJ_SOLO", projectName: "Solo Project Example", context: "project", paidBy: { type: "company" }, notes: "Material" },
  { id: "EXP_2", date: "2026-05-01", amount: 150000, mainCategory: "site", category: "material", subCategory: "local", projectId: "PRJ_PARTNER", projectName: "Partner Project Example", context: "project", paidBy: { type: "company" }, notes: "Material" },
  { id: "EXP_3", date: "2026-05-01", amount: 180000, mainCategory: "site", category: "material", subCategory: "local", projectId: "PRJ_FIXED", projectName: "Fixed Project Example", context: "project", paidBy: { type: "company" }, notes: "Material" },
  { id: "EXP_4", date: "2026-05-01", amount: 10000, mainCategory: "site", category: "material", subCategory: "local", projectId: "PRJ_VENDOR", projectName: "Vendorship Project Example", context: "project", paidBy: { type: "company" }, notes: "Material" },
  { id: "EXP_5", date: "2026-05-01", amount: 5000, mainCategory: "site", category: "material", subCategory: "local", projectId: "PRJ_INC", projectName: "INC Project Example", context: "project", paidBy: { type: "company" }, notes: "Material" },
];

export const seedPartnerTransactions: PartnerTransaction[] = [
  { id: "PTX_1", partnerId: "PT_PROFIT", partnerName: "Profit Partner", date: "2026-05-01", amount: 50000, type: "profit-payment", direction: "given", projectId: "PRJ_PARTNER", notes: "Profit payout" },
  { id: "PTX_2", partnerId: "PT_FIXED", partnerName: "Fixed Partner", date: "2026-05-01", amount: 25000, type: "profit-payment", direction: "given", projectId: "PRJ_FIXED", notes: "Fixed payout" },
  { id: "PTX_3", partnerId: "PT_VENDOR", partnerName: "Vendorship Partner", date: "2026-05-01", amount: 75000, type: "vendorship-fee", direction: "given", projectId: "PRJ_VENDOR", notes: "Vendorship fee payout" },
];

// ============ HR (ATTENDANCE) ============

const employees = [1, 2, 3, 4, 6, 7, 8];
const attendanceDates = getDatesInRange(THREE_MONTHS_AGO, NOW);

export const seedAttendanceRecords: AttendanceRecord[] = [];
let attCounter = 1;

attendanceDates.forEach((date) => {
  employees.forEach((empId) => {
    // Randomize presence (90% present, 5% absent, 5% half-day)
    const rand = Math.random();
    let status: "present" | "absent" | "holiday" | "half-day" = "present";
    if (rand < 0.05) status = "absent";
    else if (rand < 0.1) status = "half-day";
    
    // Sundays are holidays
    const day = new Date(date).getDay();
    if (day === 0) status = "holiday";

    seedAttendanceRecords.push({
      id: `ATT${attCounter++}`,
      employeeId: empId,
      date,
      status,
      sites: status === "present" ? pickNRandom(["PRJ001", "PRJ002", "PRJ004"], 1) : [],
      notes: status === "absent" ? "Personal work" : undefined
    });
  });
});

// ============ TEMPLATES ============

export const seedQuotationTemplates: QuotationTemplate[] = [
  {
    id: "QT001",
    name: "Residential 3kW Standard",
    segment: "residential",
    createdAt: "2025-01-01",
    materialItems: [
      { inventoryItemId: 1, name: "Solar Panel 540W", quantity: 6, unit: "pcs" },
      { inventoryItemId: 3, name: "Inverter 3kW", quantity: 1, unit: "pcs" },
      { inventoryItemId: 7, name: "Elevated GI Structure", quantity: 3, unit: "set" },
    ],
    services: [
      { description: "Installation Services", sac: "9987", rate: 15000, gstRate: 18 },
      { description: "Transportation", sac: "9966", rate: 5000, gstRate: 12 },
    ],
    panelBrand: "Waaree",
    panelWattage: 540,
    inverterCapacity: "3kW",
    structureType: "Elevated GI"
  },
  {
    id: "QT002",
    name: "Commercial 20kW Standard",
    segment: "commercial",
    createdAt: "2025-01-10",
    materialItems: [
      { inventoryItemId: 1, name: "Solar Panel 540W", quantity: 36, unit: "pcs" },
      { inventoryItemId: 4, name: "Inverter 20kW Sungrow", quantity: 1, unit: "pcs" },
    ],
    services: [
      { description: "Industrial Installation", sac: "9987", rate: 85000, gstRate: 18 },
    ],
    panelBrand: "Tata",
    panelWattage: 550,
    inverterCapacity: "20kW"
  }
];

export const seedSiteChecklistTemplates: SiteChecklistTemplate[] = [
  {
    id: "SCT001",
    name: "3kW Residential Dispatch",
    segment: "residential",
    createdAt: "2025-01-01",
    items: [
      { inventoryItemId: 1, name: "Solar Panel 540W", quantity: 6, unit: "pcs" },
      { inventoryItemId: 3, name: "Inverter 3kW", quantity: 1, unit: "pcs" },
      { inventoryItemId: 5, name: "DC Cable 4sqmm Red", quantity: 30, unit: "m" },
      { inventoryItemId: 8, name: "Earthing Rod", quantity: 2, unit: "pcs" },
    ]
  }
];

export const seedVendorBills: VendorBill[] = [
  { id: "VB001", vendorId: 1, vendorName: "Waaree Energies Ltd", billNumber: "WEE/26/044", billDate: "2026-02-10", total: 450000, amountPaid: 0, status: "pending", items: [{ description: "Solar Panels 540W x 30", quantity: 30, rate: 15000, amount: 450000 }] },
  { id: "VB002", vendorId: 2, vendorName: "Growatt New Energy", billNumber: "GRW/IN/991", billDate: "2026-03-05", total: 125000, amountPaid: 125000, status: "paid", items: [{ description: "3kW Inverters x 5", quantity: 5, rate: 25000, amount: 125000 }] },
];

export const seedVendorPayments: VendorPayment[] = [
  { id: "VPA001", vendorId: 2, vendorName: "Growatt New Energy", billId: "VB002", billNumber: "GRW/IN/991", date: "2026-03-06", amount: 125000, mode: "bank", reference: "TXN1002233" },
];

export const seedLoans: Loan[] = [
  { id: "LN001", source: "SBI Bank", sourceType: "bank", principal: 1000000, interestRate: 9.5, paymentType: "emi", emiAmount: 25000, tenure: 48, startDate: "2025-10-01", outstanding: 850000, status: "Active" },
];

export const seedLoanRepayments: LoanRepayment[] = [
  { id: "LRP001", loanId: "LN001", loanSource: "SBI Bank", date: "2026-02-01", emiNumber: 5, principalPaid: 18000, interestPaid: 7000, totalPaid: 25000 },
  { id: "LRP002", loanId: "LN001", loanSource: "SBI Bank", date: "2026-03-01", emiNumber: 6, principalPaid: 18200, interestPaid: 6800, totalPaid: 25000 },
  { id: "LRP003", loanId: "LN001", loanSource: "SBI Bank", date: "2026-04-01", emiNumber: 7, principalPaid: 18400, interestPaid: 6600, totalPaid: 25000 },
];

export const seedIncomes: Income[] = [
  { id: "INC001", date: "2026-03-15", amount: 12000, mainCategory: "company", category: "amc", paymentMode: "upi", reference: "AMC_PAY_99", createdAt: "2026-03-15" },
];

export const seedAuditLogs: AuditLogEntry[] = [
  { id: "LOG001", timestamp: "2026-04-28T10:15:00Z", userId: "admin", userName: "Jitesh", action: "UPDATE", entityType: "project", entityId: "PRJ001", description: "Updated progress for Anil Sharma Res", metadata: { status: "work-in-progress" } },
  { id: "LOG002", timestamp: "2026-04-27T14:30:00Z", userId: "admin", userName: "Jitesh", action: "CREATE", entityType: "quotation", entityId: "QUO002", description: "Created quotation for Meera Nair" },
  { id: "LOG003", timestamp: "2026-04-25T09:00:00Z", userId: "admin", userName: "Jitesh", action: "CREATE", entityType: "enquiry", entityId: "ENQ004", description: "Registered walk-in enquiry from Modern School" },
];

// ============ OPERATIONS ============

export const seedBlockages: Blockage[] = [
  { id: "BLK001", projectId: "PRJ001", reason: "Rainy weather", startDate: "2026-03-15", endDate: "2026-03-18", status: "resolved", description: "Heavy rains in Pune" },
  { id: "BLK002", projectId: "PRJ003", reason: "Payment delay", startDate: "2026-04-05", status: "active", description: "Awaiting next milestone payment" },
];

export const seedTickets: Ticket[] = [
  { id: "TCK001", projectId: "PRJ001", title: "Panel scratch", description: "One panel has minor scratch", priority: "low", status: "open", createdAt: "2026-04-20" },
  { id: "TCK002", projectId: "PRJ002", title: "Monitoring app issue", description: "Client cannot see data", priority: "medium", status: "closed", createdAt: "2026-04-05" },
];
