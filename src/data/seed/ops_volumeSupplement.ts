import type { AppState } from "@/contexts/AppDataContext";
import type { SeedProfile } from "./seedLayerOrder";
import { seedId, SEED_ID_PREFIX } from "./seedIdRegistry";
import { seedDayAt, seedDateAt } from "./seedTimeModel";
import { getMinimumFor } from "./seedVolumeTargets";
import { panelItem } from "./seedInventoryCatalog";
import { allowsMaterialDispatch } from "./seedCapabilityAxis";

/** Fill §4 volume gaps not covered by layer builders alone. */
export function buildOpsVolumeSupplement(state: AppState, profile: SeedProfile): AppState {
  while (state.siteChecklistTemplates.length < getMinimumFor(profile, "siteChecklistTemplates")) {
    const i = state.siteChecklistTemplates.length;
    state.siteChecklistTemplates.push({
      id: seedId(SEED_ID_PREFIX.checklistTemplate),
      name: `Supplement Checklist ${i + 1}`,
      segment: (["residential", "commercial", "industrial", "custom"] as const)[i % 4],
      subtype: i % 2 === 0 ? "solar_package" : "generic",
      capacityKW: 5 + i * 5,
      items: [{ inventoryItemId: "", name: "Supplement BOQ line", quantity: 1, unit: "set" }],
      materialsBom: i % 2 === 0 ? [{ id: seedId("BOM"), category: "Panel", materialName: "Supplement panel", quantity: 8, rate: 14000, unit: "pcs" }] : undefined,
      createdAt: seedDayAt(0.07 + i * 0.001),
    });
  }

  while (state.saleBills.length < getMinimumFor(profile, "saleBills")) {
    const i = state.saleBills.length;
    const customer = state.customers[i % state.customers.length];
    const project = state.projects[i % state.projects.length];
    const total = 85000 + i * 12000;
    const sub = Math.round(total / 1.18);
    state.saleBills.push({
      id: seedId(SEED_ID_PREFIX.saleBill),
      invoiceNumber: `SB-2026-${4000 + i}`,
      type: "sale-bill",
      documentTypeSource: "user",
      customerId: customer.id,
      customerName: customer.name,
      projectId: project?.id,
      projectName: project?.name,
      items: [{ description: "Material sale", hsn: "85414300", quantity: 1, rate: sub, gstRate: 18 }],
      services: [],
      subtotal: sub,
      cgst: (total - sub) / 2,
      sgst: (total - sub) / 2,
      igst: 0,
      total,
      status: (["pending", "partial", "paid"] as const)[i % 3],
      invoiceDate: seedDayAt(0.48 + i * 0.005),
      dueDate: seedDayAt(0.55 + i * 0.005),
      createdAt: seedDateAt(0.48 + i * 0.005),
    });
  }

  while (state.vendorPayments.length < getMinimumFor(profile, "vendorPayments")) {
    const i = state.vendorPayments.length;
    const bill = state.vendorBills[i % state.vendorBills.length];
    const vendor = state.vendors.find((v) => v.id === bill?.vendorId) ?? state.vendors[0];
    if (!bill || !vendor) break;
    state.vendorPayments.push({
      id: seedId(SEED_ID_PREFIX.vendorPayment),
      vendorId: vendor.id,
      vendorName: vendor.name,
      billId: bill.id,
      billNumber: bill.billNumber,
      amount: Math.min(bill.total - bill.amountPaid, 15000 + i * 2000),
      date: seedDayAt(0.56 + i * 0.004),
      paymentMode: "Bank Transfer",
    });
    bill.amountPaid = Math.min(bill.total, bill.amountPaid + 15000);
    if (bill.amountPaid >= bill.total) bill.status = "paid";
    else if (bill.amountPaid > 0) bill.status = "partial";
  }

  while (state.blockages.length < getMinimumFor(profile, "blockages")) {
    const i = state.blockages.length;
    const project = state.projects[i % state.projects.length];
    state.blockages.push({
      id: seedId(SEED_ID_PREFIX.blockage),
      projectId: project.id,
      title: `Blockage supplement ${i + 1}`,
      reason: i % 3 === 0 ? "Client payment delay" : i % 3 === 1 ? "DISCOM file pending" : "Material shortfall",
      status: i % 5 === 0 ? "resolved" : "active",
      projectStage: "work-in-progress",
      timelineStage: (["payment", "work-status", "discom"] as const)[i % 3],
      timelineSubStage: "client-delay",
      createdAt: seedDateAt(0.3 + i * 0.01),
      startDate: seedDayAt(0.28 + i * 0.01),
      resolvedAt: i % 5 === 0 ? seedDateAt(0.5 + i * 0.01) : undefined,
    });
  }

  while (state.accountingReviewQueue.length < getMinimumFor(profile, "accountingReviewQueue")) {
    const i = state.accountingReviewQueue.length;
    state.accountingReviewQueue.push({
      id: seedId(SEED_ID_PREFIX.reviewQueue),
      reason: i % 2 === 0 ? "GST mismatch on auto-post" : "Unbalanced voucher draft",
      eventType: (["InvoiceIssued", "ExpenseRecorded", "PayrollReleased"] as const)[i % 3],
      sourceDocumentId: state.invoices[i % state.invoices.length]?.id ?? seedId(SEED_ID_PREFIX.invoice),
      amount: 25000 + i * 5000,
      createdAt: seedDateAt(0.82 + i * 0.002),
    });
  }

  for (const emp of state.employees.filter((e) => e.status === "Active")) {
    if (state.employeeWalletLedger.filter((w) => w.employeeId === emp.id).length >= 2) continue;
    state.employeeWalletLedger.push(
      {
        id: seedId(SEED_ID_PREFIX.wallet),
        employeeId: emp.id,
        date: seedDayAt(0.22),
        kind: "advance",
        amount: 3000,
        notes: "Field advance",
        createdAt: seedDateAt(0.22),
      },
      {
        id: seedId(SEED_ID_PREFIX.wallet),
        employeeId: emp.id,
        date: seedDayAt(0.45),
        kind: "recovery",
        amount: 1500,
        notes: "Advance recovery via payroll",
        createdAt: seedDateAt(0.45),
      },
    );
  }
  while (state.employeeWalletLedger.length < getMinimumFor(profile, "employeeWalletLedger")) {
    const emp = state.employees[state.employeeWalletLedger.length % state.employees.length];
    state.employeeWalletLedger.push({
      id: seedId(SEED_ID_PREFIX.wallet),
      employeeId: emp.id,
      date: seedDayAt(0.5 + state.employeeWalletLedger.length * 0.003),
      kind: state.employeeWalletLedger.length % 2 === 0 ? "advance" : "recovery",
      amount: 2000 + state.employeeWalletLedger.length * 100,
      notes: "Wallet ledger supplement",
      createdAt: seedDateAt(0.5),
    });
  }

  const dispatchProjects = state.projects.filter((p) => allowsMaterialDispatch(p.projectKind ?? "SOLO_EPC"));
  while (state.materialReservations.length < getMinimumFor(profile, "materialReservations")) {
    const i = state.materialReservations.length;
    const project = dispatchProjects[i % dispatchProjects.length];
    const panel = panelItem(state.inventoryItems);
    if (!project) break;
    state.materialReservations.push({
      id: seedId(SEED_ID_PREFIX.reservation),
      itemId: panel.id,
      qty: 2 + (i % 4),
      projectId: project.id,
      source: i % 2 === 0 ? "manual" : "auto-from-checklist",
      createdAt: seedDateAt(0.4 + i * 0.005),
    });
  }

  while (state.materialDamageRecords.length < getMinimumFor(profile, "materialDamageRecords")) {
    const i = state.materialDamageRecords.length;
    const project = dispatchProjects[i % dispatchProjects.length];
    const item = panelItem(state.inventoryItems);
    if (!project) break;
    state.materialDamageRecords.push({
      id: seedId(SEED_ID_PREFIX.damage),
      itemId: item.id,
      qty: i % 2 === 0 ? 6 : 3,
      stage: (["transport", "installation", "storage"] as const)[i % 3],
      projectId: project.id,
      notes: i % 2 === 0 ? "Six modules damaged during unloading — vendor claim raised" : "Minor packaging damage",
      costImpact: i % 2 === 0 ? 8200 : 1200,
      reportedAt: seedDateAt(0.65 + i * 0.004),
      reportedBy: "Karthik Rao",
    });
  }

  const agentQuotes = state.quotations.filter((q) => q.agentId);
  let qi = 0;
  while (state.agentCommissionAccruals.length < getMinimumFor(profile, "agentCommissionAccruals")) {
    const q = agentQuotes[qi % Math.max(1, agentQuotes.length)] ?? state.quotations[qi % state.quotations.length];
    const agent = state.agents.find((a) => a.id === q.agentId) ?? state.agents[qi % state.agents.length];
    const project = state.projects.find((p) => p.quotationId === q.id);
    if (!agent || !q) break;
    state.agentCommissionAccruals.push({
      id: seedId(SEED_ID_PREFIX.accrual),
      agentId: agent.id,
      projectId: project?.id,
      sourceQuotationId: q.id,
      expectedAmount: Math.round((Number(q.systemCapacity) || 5) * 800),
      status: (["pending", "payable", "paid"] as const)[qi % 3],
      accruedAt: seedDateAt(0.2 + qi * 0.003),
      payableAt: qi % 3 !== 0 ? seedDateAt(0.25 + qi * 0.003) : undefined,
      paidAt: qi % 3 === 2 ? seedDateAt(0.5 + qi * 0.003) : undefined,
    });
    qi++;
  }

  return state;
}
