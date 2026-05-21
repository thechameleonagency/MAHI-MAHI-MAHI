import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import {
  findStaleBillingAmountReceived,
  reconcileBillingAmountReceivedState,
} from "@/lib/billingAmountReceivedContinuity";
import { fifoApplyClientPaymentToBilling } from "@/lib/clientPaymentReconciliation";
import type { Invoice } from "@/types/finance";
import type { Project } from "@/types/project";

describe("billingAmountReceivedContinuity (ER5)", () => {
  it("FIFO applies across invoices and sale bills by date", () => {
    const invoices: Invoice[] = [
      {
        id: "INV-2",
        projectId: "P1",
        total: 50000,
        amountReceived: 0,
        invoiceDate: "2026-02-01",
        status: "pending",
      } as Invoice,
    ];
    const saleBills: Invoice[] = [
      {
        id: "SB-1",
        projectId: "P1",
        total: 40000,
        amountReceived: 0,
        invoiceDate: "2026-01-01",
        status: "pending",
        type: "sale-bill",
      } as Invoice,
    ];

    const applied = fifoApplyClientPaymentToBilling(
      invoices,
      saleBills,
      "P1",
      60000,
      "2026-03-01",
      "bank_transfer",
    );

    expect(applied.saleBills[0].amountReceived).toBe(40000);
    expect(applied.invoices[0].amountReceived).toBe(20000);
  });

  it("hydrated smoke seed has no billing amountReceived drift", () => {
    const { state: seeded } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(seeded);
    const stale = findStaleBillingAmountReceived(hydrated);
    expect(stale, stale.map((s) => `${s.entity}:${s.id}`).join("; ")).toEqual([]);
  });

  it("full seed verifySeedState passes ER5 checks", () => {
    const { verification } = buildBusinessSeed("full");
    const er5 = verification.errors.filter((e) => e.startsWith("ER5:"));
    expect(er5).toEqual([]);
    expect(verification.ok, verification.errors.join("; ")).toBe(true);
  });

  it("reconcileBillingAmountReceivedState repairs drifted invoice received", () => {
    const project = {
      id: "P1",
      name: "Test",
      contractAmount: 100000,
      amountReceived: 0,
      lifecycleStatus: "In Progress",
    } as Project;
    const invoice: Invoice = {
      id: "INV-1",
      projectId: "P1",
      customerId: "C1",
      total: 50000,
      amountReceived: 99999,
      invoiceDate: "2026-01-01",
      status: "paid",
    } as Invoice;
    const state = {
      projects: [project],
      invoices: [invoice],
      saleBills: [],
      payments: [
        {
          id: "PAY-1",
          direction: "in",
          amount: 25000,
          projectId: "P1",
          invoiceId: "INV-1",
          date: "2026-02-01",
          paymentMode: "cash",
          counterpartyType: "customer",
        },
      ],
      clientPaymentRecords: [],
      incomes: [],
      customers: [{ id: "C1", name: "C", phone: "1", email: "", address: "", type: "company", itemsBought: [], totalPurchases: 0, createdAt: "2026-01-01" }],
    } as import("@/contexts/AppDataContext").AppState;

    const fixed = reconcileBillingAmountReceivedState(state);
    expect(fixed.invoices[0].amountReceived).toBe(25000);
    expect(fixed.projects[0].amountReceived).toBe(25000);
    expect(findStaleBillingAmountReceived(fixed)).toEqual([]);
  });
});
