import type { AppState } from "@/contexts/AppDataContext";
import { deriveIncGiverProjectCollected } from "@/lib/deriveIncGiverEconomics";
import type { SeedProfile } from "./seedLayerOrder";
import { seedId, SEED_ID_PREFIX } from "./seedIdRegistry";
import { seedDayAt, seedDateAt } from "./seedTimeModel";
import { countFor, pushAudit } from "./seedHelpers";
import { VoucherPostingService } from "@/application/services/VoucherPostingService";

const voucherService = new VoucherPostingService();

/** L10 — loans, repayments, owner investments, agent accruals & commission payments. */
export function buildL10Capital(state: AppState, profile: SeedProfile): AppState {
  const loanCount = countFor(profile, 10);
  const paymentTypes = ["emi", "one-time", "reminder-only"] as const;
  const sources = [
    { name: "HDFC Bank", type: "bank" as const },
    { name: "Bajaj NBFC", type: "nbfc" as const },
    { name: "Rajesh Kulkarni", type: "person" as const },
    { name: "ICICI Bank", type: "bank" as const },
    { name: "Family — Sharma", type: "person" as const },
  ];

  for (let i = 0; i < loanCount; i++) {
    const loanId = seedId(SEED_ID_PREFIX.loan);
    const principal = 500000 + i * 150000;
    const ptype = paymentTypes[i % 3];
    const src = sources[i % sources.length];
    const emi = ptype === "emi" ? Math.round(principal / 36) : 0;
    const paid = i % 3;
    state.loans.push({
      id: loanId,
      source: src.name,
      sourceType: src.type,
      personId: `person-${i}`,
      personName: src.name,
      principal,
      interestRate: 10 + (i % 4),
      paymentType: ptype,
      emiAmount: emi,
      tenure: ptype === "emi" ? 36 : 0,
      dueDate: ptype === "emi" ? "2026-05-25" : undefined,
      reminderDate: ptype === "reminder-only" ? "2026-05-28" : undefined,
      reminderNotes: ptype === "reminder-only" ? "Informal udhar — call before month end" : undefined,
      startDate: seedDayAt(0.1 + i * 0.02),
      emisPaidAlready: paid,
      outstanding: ptype === "emi" ? principal - emi * paid : i === loanCount - 1 ? 0 : principal * 0.6,
      status: i === loanCount - 1 ? "Closed" : "Active",
    });

    const loanReceived = voucherService.post({ type: "LoanReceived", sourceDocumentId: loanId, amount: principal });
    if (loanReceived.ok) state.accountingVouchers.push(loanReceived.voucher);

    for (let r = 0; r < 3 + (i % 4); r++) {
      const repId = seedId(SEED_ID_PREFIX.loanRepayment);
      const totalPaid = ptype === "emi" ? emi : 50000;
      const interestPaid = Math.round(totalPaid * 0.25);
      const principalPaid = totalPaid - interestPaid;
      state.loanRepayments.push({
        id: repId,
        loanId,
        loanSource: src.name,
        date: seedDayAt(0.2 + i * 0.02 + r * 0.01),
        emiNumber: r + 1,
        interestPaid,
        principalPaid,
        totalPaid,
        linkedPaymentId: r % 3 === 0 ? state.payments[r % Math.max(1, state.payments.length)]?.id : undefined,
        linkedExpenseId: r % 3 === 1 ? state.expenses[r % Math.max(1, state.expenses.length)]?.id : undefined,
      });
      const lr = voucherService.post({ type: "LoanRepayment", sourceDocumentId: repId, amount: principalPaid });
      if (lr.ok) state.accountingVouchers.push(lr.voucher);
    }
  }

  for (let i = 0; i < countFor(profile, 8); i++) {
    state.ownerInvestments.push({
      id: seedId(SEED_ID_PREFIX.ownerInvestment),
      date: seedDayAt(0.08 + i * 0.015),
      amount: 100000 + i * 50000,
      type: i % 4 === 0 ? "withdrawal" : "investment",
      notes: i % 4 === 0 ? "Owner drawing for personal use" : "Capital infusion Q1",
      createdAt: seedDateAt(0.08 + i * 0.015),
    });
  }

  const approvedQuotes = state.quotations.filter((q) => q.agentId);
  for (let i = 0; i < approvedQuotes.length && i < countFor(profile, 35); i++) {
    const q = approvedQuotes[i];
    const project = state.projects.find((p) => p.quotationId === q.id);
    const status = project?.lifecycleStatus === "Completed" ? "paid" : project?.startedAt ? "payable" : "pending";
    state.agentCommissionAccruals.push({
      id: seedId(SEED_ID_PREFIX.accrual),
      agentId: q.agentId!,
      projectId: project?.id,
      sourceQuotationId: q.id,
      expectedAmount: Math.round((Number(q.systemCapacity) || 5) * 800),
      status,
      accruedAt: seedDateAt(0.15 + i * 0.005),
      payableAt: status !== "pending" ? seedDateAt(0.2 + i * 0.005) : undefined,
      paidAt: status === "paid" ? seedDateAt(0.45 + i * 0.005) : undefined,
    });
  }

  for (let i = 0; i < countFor(profile, 20); i++) {
    const agent = state.agents[i % state.agents.length];
    const project = state.projects[i % state.projects.length];
    if (!agent || !project) continue;
    state.agentCommissionPayments.push({
      id: seedId(SEED_ID_PREFIX.commissionPay),
      agentId: agent.id,
      projectId: project.id,
      projectName: project.name,
      amount: 12000 + i * 1500,
      date: seedDayAt(0.5 + i * 0.008),
      mode: (["bank_transfer", "upi", "cheque"] as const)[i % 3],
      createdAt: seedDateAt(0.5 + i * 0.008),
    });
  }

  for (let i = 0; i < countFor(profile, 24); i++) {
    const partner = state.partners[i % state.partners.length];
    const project = state.projects.find((p) => p.partners?.some((pp) => pp.partnerId === partner.id));
    const txId = seedId(SEED_ID_PREFIX.partnerTx);
    state.partnerTransactions.push({
      id: txId,
      partnerId: partner.id,
      partnerName: partner.name,
      date: seedDayAt(0.35 + i * 0.006),
      amount: 15000 + i * 3000,
      type: (["Given to Partner", "Received from Partner", "Customer Paid Partner", "Vendorship Fee", "Profit Payment"] as const)[i % 5],
      projectId: project?.id,
      notes: "Settlement per project economics",
    });
    if (i % 3 === 0) {
      const pp = voucherService.post({ type: "PartnerPayoutRecorded", sourceDocumentId: txId, amount: 15000 + i * 3000 });
      if (pp.ok) state.accountingVouchers.push(pp.voucher);
    }
  }

  for (const emp of state.employees.filter((e) => e.status === "Active").slice(0, countFor(profile, 14))) {
    for (const month of ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05"]) {
      const prId = seedId(SEED_ID_PREFIX.payroll);
      const [y] = month.split("-").map(Number);
      state.employeePayrollRecords.push({
        id: prId,
        employeeId: emp.id,
        employeeName: emp.name,
        month,
        year: y,
        daysPresent: 22,
        grossAmount: emp.salary,
        deductions: 500,
        netAmount: emp.salary - 500,
        paidDate: `${month}-28`,
        mode: (["bank_transfer", "cash", "upi", "cheque", "other"] as const)[Number(month.slice(-1)) % 5],
      });
      const pr = voucherService.post({ type: "PayrollReleased", sourceDocumentId: prId, amount: emp.salary });
      const pd = voucherService.post({ type: "PayrollPaid", sourceDocumentId: prId, amount: emp.salary - 500 });
      if (pr.ok) state.accountingVouchers.push(pr.voucher);
      if (pd.ok) state.accountingVouchers.push(pd.voucher);
    }
    if (emp.wallet > 0) {
      state.employeeWalletLedger.push({
        id: seedId(SEED_ID_PREFIX.wallet),
        employeeId: emp.id,
        date: seedDayAt(0.25),
        kind: "advance",
        amount: emp.wallet,
        notes: "Field advance for transport",
        createdAt: seedDateAt(0.25),
      });
    }
  }

  const incGiverTxTarget = countFor(profile, 8);
  const incGivenProjects = state.projects.filter((p) => p.projectKind === "INC_GIVEN");
  for (let i = 0; i < incGiverTxTarget; i++) {
    const project = incGivenProjects[i % Math.max(incGivenProjects.length, 1)];
    const giverId =
      project?.scope?.incGiverCompanyId ??
      state.incGiverCompanies[i % Math.max(state.incGiverCompanies.length, 1)]?.id;
    if (!giverId) continue;
    const giver = state.incGiverCompanies.find((c) => c.id === giverId);
    state.incGiverTransactions.push({
      id: seedId(SEED_ID_PREFIX.incGiverTx),
      incGiverCompanyId: giverId,
      projectId: project?.id,
      projectName: project?.name,
      date: seedDayAt(0.4 + i * 0.004),
      amount: 12000 + i * 2500,
      type: i % 7 === 0 ? "adjustment" : "collection",
      notes: "INC giver settlement (seed)",
    });
    if (project?.id) {
      const ledger = deriveIncGiverProjectCollected(project.id, state.incGiverTransactions);
      state.projects = state.projects.map((p) =>
        p.id === project.id ? { ...p, amountReceived: ledger } : p,
      );
    }
    if (giver && project) {
      pushAudit(state, {
        action: "create",
        entityType: "INCGiverTransaction",
        entityId: state.incGiverTransactions[state.incGiverTransactions.length - 1]?.id ?? "",
        entityName: `${giver.name} — ${project.name}`,
        fraction: 0.41 + i * 0.002,
        role: "management",
      });
    }
  }

  pushAudit(state, { action: "create", entityType: "Loan", entityId: state.loans[0]?.id ?? "", entityName: state.loans[0]?.source ?? "", fraction: 0.52, role: "management" });

  return state;
}
