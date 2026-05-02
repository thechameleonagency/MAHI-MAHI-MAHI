const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'data', 'seedData.ts');
let content = fs.readFileSync(filePath, 'utf8');

function replaceArray(arrayName, newContent) {
  const regex = new RegExp(`export const ${arrayName}: [a-zA-Z\\[\\]]+ = \\[[\\s\\S]*?\\n\\];`, 'm');
  content = content.replace(regex, `export const ${arrayName}: ${newContent}`);
}

const partnersArray = `Partner[] = [
  { id: "PT_PROFIT", name: "Profit Partner", phone: "9000000001", email: "profit@partner.com", address: "Mumbai", notes: "A standard profit sharing partner", createdAt: "2026-05-01" },
  { id: "PT_FIXED", name: "Fixed Partner", phone: "9000000002", email: "fixed@partner.com", address: "Pune", notes: "A fixed amount share partner", createdAt: "2026-05-01" },
  { id: "PT_VENDOR", name: "Vendorship Partner", phone: "9000000003", email: "vendor@partner.com", address: "Surat", notes: "A vendorship execution partner", createdAt: "2026-05-01" },
];`;

const projectsArray = `Project[] = [
  {
    id: "PRJ_SOLO",
    name: "Solo Project Example",
    client: "Anil Sharma",
    location: "Pune",
    category: "residential",
    dealType: "Solo",
    projectKind: "SOLO_EPC",
    projectLifecycleStatus: "work-in-progress",
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
    projectLifecycleStatus: "work-in-progress",
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
    projectLifecycleStatus: "work-in-progress",
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
    projectLifecycleStatus: "work-in-progress",
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
    projectLifecycleStatus: "work-in-progress",
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
];`;

const sitesArray = `SiteRecord[] = [
  { id: 101, name: "Solo Site", projectId: "PRJ_SOLO", status: "active", workStartDate: "2026-05-01", checklistItems: [{ id: "S101_M1", requiresMaterial: true, inventoryItemId: 1, materialName: "Solar Panel 540W", requiredQuantity: 10, status: "pending" }] },
  { id: 102, name: "Partner Site", projectId: "PRJ_PARTNER", status: "active", workStartDate: "2026-05-01", checklistItems: [{ id: "S102_M1", requiresMaterial: true, inventoryItemId: 3, materialName: "Inverter 3kW Growatt", requiredQuantity: 2, status: "pending" }] },
  { id: 103, name: "Fixed Site", projectId: "PRJ_FIXED", status: "active", workStartDate: "2026-05-01", checklistItems: [{ id: "S103_M1", requiresMaterial: true, inventoryItemId: 5, materialName: "DC Cable 4sqmm Red", requiredQuantity: 100, status: "pending" }] },
  { id: 104, name: "Vendor Site", projectId: "PRJ_VENDOR", status: "active", workStartDate: "2026-05-01", checklistItems: [{ id: "S104_M1", requiresMaterial: true, inventoryItemId: 8, materialName: "Earthing Rod 2mtr", requiredQuantity: 4, status: "pending" }] },
  { id: 105, name: "INC Site", projectId: "PRJ_INC", status: "active", workStartDate: "2026-05-01", checklistItems: [{ id: "S105_M1", requiresMaterial: true, inventoryItemId: 1, materialName: "Solar Panel 540W", requiredQuantity: 5, status: "pending" }] },
];`;

const tasksArray = `Task[] = [
  { id: "TSK_1", employeeId: 2, projectId: "PRJ_SOLO", siteId: "101", siteName: "Solo Site", workType: "Installation", notes: "Initial setup", createdDate: "2026-05-01", workDate: "2026-05-01", status: "done", createdBy: "Admin" },
  { id: "TSK_2", employeeId: 2, projectId: "PRJ_PARTNER", siteId: "102", siteName: "Partner Site", workType: "Electrical", notes: "Wiring", createdDate: "2026-05-01", workDate: "2026-05-01", status: "started", createdBy: "Admin" },
  { id: "TSK_3", employeeId: 2, projectId: "PRJ_FIXED", siteId: "103", siteName: "Fixed Site", workType: "Installation", notes: "Mounting", createdDate: "2026-05-01", workDate: "2026-05-01", status: "started", createdBy: "Admin" },
  { id: "TSK_4", employeeId: 2, projectId: "PRJ_VENDOR", siteId: "104", siteName: "Vendor Site", workType: "Civil", notes: "Foundation", createdDate: "2026-05-01", workDate: "2026-05-01", status: "started", createdBy: "Admin" },
  { id: "TSK_5", employeeId: 2, projectId: "PRJ_INC", siteId: "105", siteName: "INC Site", workType: "Installation", notes: "Labor", createdDate: "2026-05-01", workDate: "2026-05-01", status: "started", createdBy: "Admin" },
];`;

const invoicesArray = `Invoice[] = [
  { id: "INV_1", invoiceNumber: "INV-001", type: "invoice", customerId: "C001", customerName: "Anil Sharma", projectId: "PRJ_SOLO", projectName: "Solo Project Example", items: [{ description: "Solar", hsn: "8541", quantity: 1, rate: 100000, gstRate: 0 }], services: [], subtotal: 100000, cgst: 0, sgst: 0, igst: 0, total: 100000, amountReceived: 100000, status: "paid", invoiceDate: "2026-05-01", dueDate: "2026-05-01", createdAt: "2026-05-01" },
  { id: "INV_2", invoiceNumber: "INV-002", type: "invoice", customerId: "C002", customerName: "Ravi Textiles Pvt Ltd", projectId: "PRJ_PARTNER", projectName: "Partner Project Example", items: [{ description: "Solar", hsn: "8541", quantity: 1, rate: 1000000, gstRate: 0 }], services: [], subtotal: 1000000, cgst: 0, sgst: 0, igst: 0, total: 1000000, amountReceived: 1000000, status: "paid", invoiceDate: "2026-05-01", dueDate: "2026-05-01", createdAt: "2026-05-01" },
];`;

const paymentsArray = `Payment[] = [
  { id: "PAY_1", date: "2026-05-01", amount: 100000, direction: "in", paymentMode: "bank", reference: "BNK1", counterpartyType: "customer", counterpartyId: "C001", counterpartyName: "Anil Sharma", projectId: "PRJ_SOLO", invoiceId: "INV_1" },
  { id: "PAY_2", date: "2026-05-01", amount: 1000000, direction: "in", paymentMode: "bank", reference: "BNK2", counterpartyType: "customer", counterpartyId: "C002", counterpartyName: "Ravi Textiles Pvt Ltd", projectId: "PRJ_PARTNER", invoiceId: "INV_2" },
];`;

const expensesArray = `Expense[] = [
  { id: "EXP_1", date: "2026-05-01", amount: 50000, mainCategory: "site", category: "material", subCategory: "local", projectId: "PRJ_SOLO", projectName: "Solo Project Example", context: "project", paidBy: { type: "company" }, notes: "Material" },
  { id: "EXP_2", date: "2026-05-01", amount: 150000, mainCategory: "site", category: "material", subCategory: "local", projectId: "PRJ_PARTNER", projectName: "Partner Project Example", context: "project", paidBy: { type: "company" }, notes: "Material" },
  { id: "EXP_3", date: "2026-05-01", amount: 180000, mainCategory: "site", category: "material", subCategory: "local", projectId: "PRJ_FIXED", projectName: "Fixed Project Example", context: "project", paidBy: { type: "company" }, notes: "Material" },
  { id: "EXP_4", date: "2026-05-01", amount: 10000, mainCategory: "site", category: "material", subCategory: "local", projectId: "PRJ_VENDOR", projectName: "Vendorship Project Example", context: "project", paidBy: { type: "company" }, notes: "Material" },
  { id: "EXP_5", date: "2026-05-01", amount: 5000, mainCategory: "site", category: "material", subCategory: "local", projectId: "PRJ_INC", projectName: "INC Project Example", context: "project", paidBy: { type: "company" }, notes: "Material" },
];`;

const partnerTransactionsArray = `PartnerTransaction[] = [
  { id: "PTX_1", partnerId: "PT_PROFIT", partnerName: "Profit Partner", date: "2026-05-01", amount: 50000, type: "profit-payment", direction: "given", projectId: "PRJ_PARTNER", notes: "Profit payout" },
  { id: "PTX_2", partnerId: "PT_FIXED", partnerName: "Fixed Partner", date: "2026-05-01", amount: 25000, type: "profit-payment", direction: "given", projectId: "PRJ_FIXED", notes: "Fixed payout" },
  { id: "PTX_3", partnerId: "PT_VENDOR", partnerName: "Vendorship Partner", date: "2026-05-01", amount: 75000, type: "vendorship-fee", direction: "given", projectId: "PRJ_VENDOR", notes: "Vendorship fee payout" },
];`;


replaceArray('seedPartners', partnersArray);
replaceArray('seedProjects', projectsArray);
replaceArray('seedSites', sitesArray);
replaceArray('seedTasks', tasksArray);
replaceArray('seedInvoices', invoicesArray);
replaceArray('seedPayments', paymentsArray);
replaceArray('seedExpenses', expensesArray);
replaceArray('seedPartnerTransactions', partnerTransactionsArray);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Seed data updated successfully!');
