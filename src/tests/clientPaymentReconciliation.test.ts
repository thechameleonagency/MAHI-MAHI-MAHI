import { describe, expect, it } from "vitest";
import type { ClientPaymentRecord } from "@/types/blockage";
import type { Invoice, Payment } from "@/types/finance";
import type { Project } from "@/types/project";
import {
  clientPaymentRecordPaymentId,
  clientPaymentRemainingDue,
  fifoApplyClientPaymentToInvoices,
  formatClientPaymentLedgerReconcileDevMessage,
  reconcileClientPaymentLedger,
  summarizeClientPaymentLedgerReconcile,
  validateClientPaymentRecord,
} from "@/lib/clientPaymentReconciliation";
import { getInvoiceOpenBalance } from "@/lib/billingSelectors";

const baseProject = (id: string): Project =>
  ({
    id,
    name: "Test",
    projectType: "Residential",
    projectCategory: "solar",
    lifecycleStatus: "New",
    client: "C",
    capacity: "5kW",
    location: "J",
    contractAmount: 100000,
    amountReceived: 0,
    createdAt: "2026-01-01",
  }) as Project;

describe("clientPaymentReconciliation", () => {
  it("FIFO applies oldest invoice first", () => {
    const invoices: Invoice[] = [
      {
        id: "INV-2",
        projectId: "P1",
        total: 50000,
        amountReceived: 0,
        invoiceDate: "2026-02-01",
      } as Invoice,
      {
        id: "INV-1",
        projectId: "P1",
        total: 40000,
        amountReceived: 0,
        invoiceDate: "2026-01-01",
      } as Invoice,
    ];

    const next = fifoApplyClientPaymentToInvoices(
      invoices,
      "P1",
      60000,
      "2026-03-01",
      "bank_transfer",
    );

    const inv1 = next.find((i) => i.id === "INV-1");
    const inv2 = next.find((i) => i.id === "INV-2");
    expect(inv1?.amountReceived).toBe(40000);
    expect(inv1?.status).toBe("paid");
    expect(inv2?.amountReceived).toBe(20000);
    expect(inv2?.status).toBe("partial");
  });

  it("boot reconciler is idempotent and emits missing Payment rows", () => {
    const record: ClientPaymentRecord = {
      id: "CPR-1",
      projectId: "P1",
      amount: 25000,
      date: "2026-03-10",
      paymentMode: "cash",
      recordedAt: "2026-03-10T10:00:00Z",
    };
    const invoices: Invoice[] = [
      {
        id: "INV-1",
        projectId: "P1",
        total: 100000,
        amountReceived: 0,
        invoiceDate: "2026-01-15",
      } as Invoice,
    ];

    const first = reconcileClientPaymentLedger({
      clientPaymentRecords: [record],
      payments: [],
      invoices,
      projects: [baseProject("P1")],
    });

    expect(first.payments).toHaveLength(1);
    expect(first.payments[0].id).toBe(clientPaymentRecordPaymentId("CPR-1"));
    expect(first.invoices[0].amountReceived).toBe(25000);
    expect(first.projects[0].amountReceived).toBe(25000);

    const second = reconcileClientPaymentLedger({
      clientPaymentRecords: [record],
      payments: first.payments,
      invoices: first.invoices,
      projects: first.projects,
    });

    expect(second.payments).toHaveLength(1);
    expect(second.invoices[0].amountReceived).toBe(25000);
    expect(second.projects[0].amountReceived).toBe(25000);
  });

  it("summarizeClientPaymentLedgerReconcile reports boot diff for DEV toast", () => {
    const record: ClientPaymentRecord = {
      id: "CPR-2",
      projectId: "P1",
      amount: 10000,
      date: "2026-04-01",
      paymentMode: "cash",
      recordedAt: "2026-04-01T10:00:00Z",
    };
    const before = {
      payments: [] as Payment[],
      invoices: [
        {
          id: "INV-1",
          projectId: "P1",
          total: 50000,
          amountReceived: 0,
          invoiceDate: "2026-01-01",
        } as Invoice,
      ],
      projects: [baseProject("P1")],
    };
    const after = reconcileClientPaymentLedger({
      clientPaymentRecords: [record],
      ...before,
    });
    const summary = summarizeClientPaymentLedgerReconcile(before, after, 1);
    expect(summary.changed).toBe(true);
    expect(summary.paymentsAdded).toBe(1);
    expect(summary.invoicesAllocationAdjusted).toBe(1);
    expect(summary.projectsAmountReceivedSynced).toBe(1);
    const message = formatClientPaymentLedgerReconcileDevMessage(summary);
    expect(message).toMatch(/Payment row/);
    expect(message).toMatch(/client payment record/);

    const noop = summarizeClientPaymentLedgerReconcile(after, after, 1);
    expect(noop.changed).toBe(false);
  });

  it("validateClientPaymentRecord rejects non-positive and over-contract amounts (Mn18)", () => {
    expect(validateClientPaymentRecord({ amount: 0, projectId: "P1" }, 100000, 0).ok).toBe(false);
    expect(validateClientPaymentRecord({ amount: -100, projectId: "P1" }, 100000, 0).ok).toBe(false);
    expect(validateClientPaymentRecord({ amount: 5000, projectId: "" }, 100000, 0).ok).toBe(false);

    const over = validateClientPaymentRecord({ amount: 5000, projectId: "P1" }, 100000, 96000);
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.reason).toMatch(/remaining/i);

    const ok = validateClientPaymentRecord({ amount: 5000, projectId: "P1" }, 100000, 90000);
    expect(ok).toEqual({ ok: true, remainingDue: 10000 });

    expect(clientPaymentRemainingDue(100000, 96000)).toBe(4000);
    expect(clientPaymentRemainingDue(100000, 100000)).toBe(0);
  });

  it("FIFO skips voided and draft invoices (FC6)", () => {
    const invoices: Invoice[] = [
      {
        id: "INV-VOID",
        projectId: "P1",
        total: 100000,
        amountReceived: 0,
        invoiceDate: "2026-01-01",
        status: "voided",
      } as Invoice,
      {
        id: "INV-OPEN",
        projectId: "P1",
        total: 50000,
        amountReceived: 0,
        invoiceDate: "2026-02-01",
        status: "pending",
      } as Invoice,
    ];

    const next = fifoApplyClientPaymentToInvoices(
      invoices,
      "P1",
      30000,
      "2026-03-01",
      "bank_transfer",
    );

    expect(next.find((i) => i.id === "INV-VOID")?.amountReceived ?? 0).toBe(0);
    expect(next.find((i) => i.id === "INV-OPEN")?.amountReceived).toBe(30000);
    expect(getInvoiceOpenBalance(next.find((i) => i.id === "INV-VOID")!, [])).toBe(0);
  });

  it("reconcile clears FIFO allocation on voided invoices", () => {
    const record: ClientPaymentRecord = {
      id: "CPR-VOID",
      projectId: "P1",
      amount: 20000,
      date: "2026-03-01",
      paymentMode: "cash",
      recordedAt: "2026-03-01T10:00:00Z",
    };
    const invoices: Invoice[] = [
      {
        id: "INV-VOID",
        projectId: "P1",
        total: 100000,
        amountReceived: 20000,
        invoiceDate: "2026-01-01",
        status: "voided",
      } as Invoice,
      {
        id: "INV-OPEN",
        projectId: "P1",
        total: 80000,
        amountReceived: 0,
        invoiceDate: "2026-02-01",
        status: "pending",
      } as Invoice,
    ];

    const result = reconcileClientPaymentLedger({
      clientPaymentRecords: [record],
      payments: [],
      invoices,
      projects: [baseProject("P1")],
    });

    expect(result.invoices.find((i) => i.id === "INV-VOID")?.amountReceived).toBe(0);
    expect(result.invoices.find((i) => i.id === "INV-OPEN")?.amountReceived).toBe(20000);
  });

  it("keeps direct invoice payments when replaying CPR FIFO", () => {
    const directPayment: Payment = {
      id: "PAY-DIRECT",
      invoiceId: "INV-1",
      projectId: "P1",
      amount: 10000,
      direction: "in",
      date: "2026-02-01",
      paymentMode: "cash",
    } as Payment;
    const record: ClientPaymentRecord = {
      id: "CPR-2",
      projectId: "P1",
      amount: 15000,
      date: "2026-03-01",
      paymentMode: "upi",
      recordedAt: "2026-03-01T10:00:00Z",
    };
    const invoices: Invoice[] = [
      {
        id: "INV-1",
        projectId: "P1",
        total: 50000,
        amountReceived: 10000,
        invoiceDate: "2026-01-01",
      } as Invoice,
    ];

    const result = reconcileClientPaymentLedger({
      clientPaymentRecords: [record],
      payments: [directPayment],
      invoices,
      projects: [baseProject("P1")],
    });

    expect(result.invoices[0].amountReceived).toBe(25000);
  });
});
