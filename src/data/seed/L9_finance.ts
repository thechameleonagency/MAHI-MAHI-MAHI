import type { AppState } from "@/contexts/AppDataContext";
import type { Invoice } from "@/types/finance";
import { VoucherPostingService, type AccountingEventType } from "@/application/services/VoucherPostingService";
import { clientPaymentRecordPaymentId } from "@/lib/clientPaymentReconciliation";
import type { SeedProfile } from "./seedLayerOrder";
import { seedId, SEED_ID_PREFIX } from "./seedIdRegistry";
import { seedDayAt, seedDateAt } from "./seedTimeModel";
import { countFor, pushAudit, roundInr } from "./seedHelpers";
import { gstBreakup } from "./L8_crm";

const INVOICE_STATUSES: Invoice["status"][] = [
  "draft", "pending", "partial", "paid", "overdue", "overpaid", "voided",
];

const voucherService = new VoucherPostingService();

function postVoucher(state: AppState, type: AccountingEventType, docId: string, amount: number, gst = 0) {
  const result = voucherService.post({ type, sourceDocumentId: docId, amount, gstAmount: gst });
  if (result.ok) {
    state.accountingVouchers.push(result.voucher);
  } else {
    state.accountingReviewQueue.push({
      id: seedId(SEED_ID_PREFIX.reviewQueue),
      reason: result.reviewQueueItem.reason,
      eventType: type,
      sourceDocumentId: docId,
      amount,
      createdAt: seedDateAt(0.5),
    });
  }
}

/** L9 — invoices, CPRs, payments, expenses, incomes, vendor bills. */
export function buildL9Finance(state: AppState, profile: SeedProfile): AppState {
  const invoiceCount = countFor(profile, 40);
  const projects = state.projects.filter((p) => p.projectKind !== "VENDORSHIP_ONLY");

  for (let i = 0; i < invoiceCount; i++) {
    const project = projects[i % projects.length];
    const customer = state.customers.find((c) => c.id === project?.customerId) ?? state.customers[i % state.customers.length];
    const status = INVOICE_STATUSES[i % INVOICE_STATUSES.length];
    const fraction = 0.45 + i * 0.008;
    const base = roundInr((project?.contractAmount ?? 200000) * (0.3 + (i % 3) * 0.2));
    const gst = gstBreakup(base);
    const inv: Invoice = {
      id: seedId(SEED_ID_PREFIX.invoice),
      invoiceNumber: `INV-2026-${String(2000 + i)}`,
      type: i % 5 === 0 ? "sale-bill" : "invoice",
      documentTypeSource: "user",
      customerId: customer.id,
      customerName: customer.name,
      customerAddress: customer.address,
      customerGstin: customer.gstin,
      projectId: project?.id,
      projectName: project?.name,
      quotationId: project?.quotationId,
      items: [{ description: "Solar EPC supply & installation", hsn: "85414300", quantity: 1, rate: gst.subtotal * 0.7, gstRate: 18 }],
      services: [{ description: "Installation service", sac: "995462", rate: gst.subtotal * 0.3, gstRate: 18 }],
      subtotal: gst.subtotal,
      cgst: gst.cgst,
      sgst: gst.sgst,
      igst: 0,
      total: gst.total,
      amountReceived: status === "paid" ? gst.total : status === "partial" ? gst.total * 0.4 : status === "overpaid" ? gst.total * 1.05 : 0,
      status,
      invoiceDate: seedDayAt(fraction),
      dueDate: status === "overdue" ? "2026-05-01" : seedDayAt(fraction + 0.05),
      createdAt: seedDateAt(fraction),
      paymentTerms: "Net 15",
    };
    if (inv.type === "sale-bill") state.saleBills.push(inv);
    else state.invoices.push(inv);
    if (project) {
      project.invoiceIds = [...(project.invoiceIds ?? []), inv.id];
      project.invoiceId = inv.id;
      project.amountInvoiced = (project.amountInvoiced ?? 0) + inv.total;
    }
    if (status !== "draft" && status !== "voided") {
      postVoucher(state, "InvoiceIssued", inv.id, inv.total, inv.cgst + inv.sgst);
    }
  }

  // Client payment records + synthetic payments
  const cprCount = countFor(profile, 45);
  for (let i = 0; i < cprCount; i++) {
    const project = projects[i % projects.length];
    if (!project) continue;
    const amount = roundInr((project.contractAmount ?? 100000) * (0.1 + (i % 4) * 0.05));
    const cprId = seedId(SEED_ID_PREFIX.cpr);
    const fraction = 0.5 + i * 0.006;
    const split = i % 7 === 0 && project.partners?.length;
    state.clientPaymentRecords.push({
      id: cprId,
      projectId: project.id,
      date: seedDayAt(fraction),
      amount,
      paymentMode: (["upi", "bank-transfer", "cheque", "neft"] as const)[i % 4],
      settlementRecipient: split ? "split" : "company",
      splitLines: split ? [{ recipient: "company", amount: amount * 0.6 }, { recipient: "partner", amount: amount * 0.4 }] : undefined,
      paymentStage: (["advance", "milestone", "completion", "loan_release"] as const)[i % 4],
      recordedAt: seedDateAt(fraction),
      recordedBy: "Anita Deshmukh",
    });
    state.payments.push({
      id: clientPaymentRecordPaymentId(cprId),
      date: seedDayAt(fraction),
      amount,
      direction: "in",
      paymentMode: "Bank Transfer",
      counterpartyType: "customer",
      customerId: project.customerId,
      projectId: project.id,
      projectName: project.name,
      paymentSource: split ? "split" : "mss",
      partnerPortion: split ? amount * 0.4 : undefined,
    });
    project.amountReceived = (project.amountReceived ?? 0) + amount;
    postVoucher(state, "PaymentReceived", cprId, amount);
  }

  // Expenses across main categories
  const expenseCats: Array<{ main: NonNullable<import("@/types/finance").Expense["mainCategory"]>; sub: string }> = [
    { main: "site", sub: "labour" },
    { main: "site", sub: "material-transport" },
    { main: "company", sub: "marketing" },
    { main: "office", sub: "office-rent" },
    { main: "employee", sub: "employee-reimbursement" },
    { main: "owner", sub: "owner-withdrawal" },
    { main: "partner", sub: "partner-profit-payment" },
  ];
  const expenseCount = countFor(profile, 70);
  for (let i = 0; i < expenseCount; i++) {
    const cat = expenseCats[i % expenseCats.length];
    const project = cat.main === "site" ? projects[i % projects.length] : undefined;
    const expId = seedId(SEED_ID_PREFIX.expense);
    state.expenses.push({
      id: expId,
      date: seedDayAt(0.35 + i * 0.004),
      amount: 1500 + i * 350,
      mainCategory: cat.main,
      category: cat.sub,
      subCategory: cat.sub,
      projectId: project?.id,
      projectName: project?.name,
      context: cat.main === "site" ? "project" : cat.main === "office" ? "office" : "employee",
      paidBy: { type: cat.main === "employee" ? "employee" : "company" },
      reimbursement: cat.main === "employee" ? { enabled: true, amount: 1500 + i * 350, status: i % 2 === 0 ? "paid" : "pending" } : undefined,
      createdAt: seedDateAt(0.35 + i * 0.004),
    });
    postVoucher(state, "ExpenseRecorded", expId, 1500 + i * 350);
  }

  // Incomes
  const incomeCats = [
    { main: "project" as const, sub: "client-payment" },
    { main: "loan" as const, sub: "bank-loan" },
    { main: "partner" as const, sub: "partner-investment" },
    { main: "company" as const, sub: "owner-investment" },
  ];
  for (let i = 0; i < countFor(profile, 18); i++) {
    const cat = incomeCats[i % incomeCats.length];
    const linkedProject = cat.main === "project" ? projects[i % projects.length] : undefined;
    const amount = 25000 + i * 5000;
    state.incomes.push({
      id: seedId(SEED_ID_PREFIX.income),
      date: seedDayAt(0.4 + i * 0.01),
      amount,
      mainCategory: cat.main,
      category: cat.sub,
      subCategory: cat.sub,
      projectId: linkedProject?.id,
      projectName: linkedProject?.name,
      paymentMode: "Bank Transfer",
      createdAt: seedDateAt(0.4 + i * 0.01),
    });
  }

  // Vendor bills & payments
  for (let i = 0; i < countFor(profile, 28); i++) {
    const vendor = state.vendors[i % state.vendors.length];
    const billId = seedId(SEED_ID_PREFIX.vendorBill);
    const amount = 35000 + i * 8000;
    const status = (["draft", "approved", "disputed", "pending", "partial", "paid"] as const)[i % 6];
    state.vendorBills.push({
      id: billId,
      vendorId: vendor.id,
      vendorName: vendor.name,
      billNumber: `VB-2026-${3000 + i}`,
      billDate: seedDayAt(0.42 + i * 0.005),
      dueDate: status === "pending" || status === "partial" ? "2026-05-05" : seedDayAt(0.5 + i * 0.005),
      items: [{ description: "Material supply", quantity: 10, rate: amount / 10 / 1.18, amount: amount / 1.18 }],
      subtotal: amount / 1.18,
      gst: amount - amount / 1.18,
      total: amount,
      amountPaid: status === "paid" ? amount : status === "partial" ? amount * 0.5 : 0,
      status,
      projectId: state.projects[i % state.projects.length]?.id,
    });
    if (status !== "draft") postVoucher(state, "PurchaseBillBooked", billId, amount);
    if (status === "paid" || status === "partial") {
      const vpId = seedId(SEED_ID_PREFIX.vendorPayment);
      state.vendorPayments.push({
        id: vpId,
        vendorId: vendor.id,
        vendorName: vendor.name,
        billId,
        billNumber: `VB-2026-${3000 + i}`,
        amount: status === "paid" ? amount : amount * 0.5,
        date: seedDayAt(0.55 + i * 0.005),
        paymentMode: "Bank Transfer",
      });
      postVoucher(state, "VendorPaymentRecorded", vpId, status === "paid" ? amount : amount * 0.5);
    }
  }

  pushAudit(state, { action: "create", entityType: "Invoice", entityId: state.invoices[0]?.id ?? "", entityName: state.invoices[0]?.invoiceNumber ?? "", fraction: 0.46, role: "admin" });
  pushAudit(state, { action: "create", entityType: "Expense", entityId: state.expenses[0]?.id ?? "", entityName: "Site expense", fraction: 0.47, role: "management" });

  return state;
}
