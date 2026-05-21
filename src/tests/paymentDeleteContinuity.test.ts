import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import {
  applyPaymentDeletionToLedger,
  buildClientPaymentRecordPaymentRow,
  clientPaymentRecordPaymentId,
  findStaleClientPaymentLedgerLinkage,
  reconcileClientPaymentLedger,
} from "@/lib/clientPaymentReconciliation";
import type { ClientPaymentRecord } from "@/types/blockage";
import type { Invoice, Payment } from "@/types/finance";
import type { Project } from "@/types/project";

const baseProject = (): Project =>
  ({
    id: "P1",
    name: "Test",
    projectType: "Residential",
    projectCategory: "solar",
    lifecycleStatus: "In Progress",
    client: "C",
    capacity: "5kW",
    location: "J",
    contractAmount: 100000,
    amountReceived: 0,
    customerId: "CUST-1",
    createdAt: "2026-01-01",
  }) as Project;

describe("paymentDeleteContinuity (FC10)", () => {
  it("hydrated seed has paired CPR rows and cpr:* payments", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    expect(
      findStaleClientPaymentLedgerLinkage({
        clientPaymentRecords: hydrated.clientPaymentRecords,
        payments: hydrated.payments,
      }),
    ).toEqual([]);
  });

  it("deleting a CPR payment removes the record and replays FIFO", () => {
    const record: ClientPaymentRecord = {
      id: "CPR-DEL",
      projectId: "P1",
      amount: 30000,
      date: "2026-03-10",
      paymentMode: "bank_transfer",
      recordedAt: "2026-03-10T10:00:00Z",
    };
    const invoices: Invoice[] = [
      {
        id: "INV-1",
        projectId: "P1",
        customerId: "CUST-1",
        total: 100000,
        amountReceived: 0,
        invoiceDate: "2026-01-15",
        status: "pending",
      } as Invoice,
    ];
    const payment = buildClientPaymentRecordPaymentRow(record);
    const ledger = reconcileClientPaymentLedger({
      clientPaymentRecords: [record],
      payments: [payment],
      invoices,
      projects: [{ ...baseProject(), amountReceived: 30000 }],
      incomes: [],
    });

    const paymentId = clientPaymentRecordPaymentId(record.id);
    const result = applyPaymentDeletionToLedger({
      paymentId,
      payments: ledger.payments,
      clientPaymentRecords: [record],
      invoices: ledger.invoices,
      saleBills: [],
      projects: ledger.projects,
      incomes: [],
      customers: [
        {
          id: "CUST-1",
          name: "Customer",
          phone: "1",
          email: "a@b.com",
          address: "x",
          type: "company",
          itemsBought: [],
          totalPurchases: 0,
          amountReceived: 30000,
          createdAt: "2026-01-01",
        },
      ],
    });

    expect(result).toBeTruthy();
    expect(result!.clientPaymentRecords).toEqual([]);
    expect(result!.payments.some((p) => p.id === paymentId)).toBe(false);
    expect(result!.invoices[0]?.amountReceived ?? 0).toBe(0);
    expect(result!.projects[0]?.amountReceived ?? 0).toBe(0);
    expect(result!.customers[0]?.amountReceived ?? 0).toBe(0);
    expect(
      findStaleClientPaymentLedgerLinkage({
        clientPaymentRecords: result!.clientPaymentRecords,
        payments: result!.payments,
      }),
    ).toEqual([]);
  });

  it("deleting an invoice-targeted payment adjusts invoice received", () => {
    const payment: Payment = {
      id: "PAY-1",
      date: "2026-03-01",
      amount: 15000,
      direction: "in",
      paymentMode: "cash",
      invoiceId: "INV-1",
      projectId: "P1",
    };
    const invoices: Invoice[] = [
      {
        id: "INV-1",
        projectId: "P1",
        total: 50000,
        amountReceived: 15000,
        status: "partial",
      } as Invoice,
    ];

    const result = applyPaymentDeletionToLedger({
      paymentId: "PAY-1",
      payments: [payment],
      clientPaymentRecords: [],
      invoices,
      saleBills: [],
      projects: [{ ...baseProject(), amountReceived: 15000 }],
      incomes: [],
      customers: [],
    });

    expect(result?.invoices[0]?.amountReceived).toBe(0);
    expect(result?.payments).toEqual([]);
  });
});
