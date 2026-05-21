import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CUSTOMER_INFLOW_CALL_SITES,
  recordCustomerInflowDispatch,
  validateInvoiceTargetedInflow,
  validateProjectFifoInflow,
} from "@/lib/customerInflowWritePaths";
import type { ClientPaymentRecord } from "@/types/blockage";
import type { Payment } from "@/types/finance";

describe("customerInflowWritePaths (E10)", () => {
  it("documents call sites for each path", () => {
    expect(CUSTOMER_INFLOW_CALL_SITES.project_fifo.length).toBeGreaterThan(0);
    expect(CUSTOMER_INFLOW_CALL_SITES.invoice_targeted.some((s) => s.includes("Invoices"))).toBe(
      true,
    );
  });

  it("validateInvoiceTargetedInflow requires invoiceId on inbound payment", () => {
    expect(
      validateInvoiceTargetedInflow({
        id: "PAY-1",
        date: "2026-04-01",
        amount: 1000,
        direction: "in",
        paymentMode: "Bank Transfer",
        counterpartyType: "customer",
      }).ok,
    ).toBe(false);
    expect(
      validateInvoiceTargetedInflow({
        id: "PAY-1",
        date: "2026-04-01",
        amount: 1000,
        direction: "in",
        paymentMode: "Bank Transfer",
        counterpartyType: "customer",
        invoiceId: "INV-1",
      }).ok,
    ).toBe(true);
  });

  it("recordCustomerInflowDispatch routes project_fifo to addClientPaymentRecord", () => {
    const addClientPaymentRecord = vi.fn(() => true);
    const addPayment = vi.fn();
    const record: ClientPaymentRecord = {
      id: "CPR-1",
      projectId: "PROJ-1",
      amount: 5000,
      date: "2026-04-15",
      paymentMode: "upi",
      recordedAt: "2026-04-15T10:00:00Z",
    };
    const ok = recordCustomerInflowDispatch(
      { path: "project_fifo", record },
      { addClientPaymentRecord, addPayment },
    );
    expect(ok).toBe(true);
    expect(addClientPaymentRecord).toHaveBeenCalledWith(record);
    expect(addPayment).not.toHaveBeenCalled();
  });

  it("recordCustomerInflowDispatch routes invoice_targeted to addPayment", () => {
    const addClientPaymentRecord = vi.fn();
    const addPayment = vi.fn();
    const payment: Payment = {
      id: "PAY-1",
      date: "2026-04-15",
      amount: 5000,
      direction: "in",
      paymentMode: "Bank Transfer",
      counterpartyType: "customer",
      invoiceId: "INV-1",
    };
    const ok = recordCustomerInflowDispatch(
      { path: "invoice_targeted", payment },
      { addClientPaymentRecord, addPayment },
    );
    expect(ok).toBe(true);
    expect(addPayment).toHaveBeenCalledWith(payment);
    expect(addClientPaymentRecord).not.toHaveBeenCalled();
  });

  it("validateProjectFifoInflow rejects missing projectId", () => {
    expect(
      validateProjectFifoInflow({
        projectId: "",
        amount: 100,
        date: "2026-04-01",
      }).ok,
    ).toBe(false);
  });

  it("AppDataContext exports recordCustomerInflow and references policy", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/contexts/AppDataContext.tsx"),
      "utf8",
    );
    expect(source).toContain("customerInflowWritePaths.ts");
    expect(source).toContain("recordCustomerInflow");
    expect(source).toContain("recordCustomerInflowDispatch");
  });
});
