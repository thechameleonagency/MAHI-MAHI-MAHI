import { describe, expect, it } from "vitest";
import {
  applyInvoiceReceiptDeltaToDocument,
  applyInvoiceReceiptToDocument,
  buildInvoiceSubmitPreview,
  deriveInvoicePaymentOutcome,
  deriveInvoiceStatusAfterReceipt,
  formatInvoiceBalanceLabel,
  invoiceExcessReceived,
} from "@/lib/invoicePaymentStatus";
import type { Invoice } from "@/types/finance";

describe("deriveInvoicePaymentOutcome", () => {
  it("marks fully paid when Already Paid is checked", () => {
    expect(
      deriveInvoicePaymentOutcome({
        total: 100_000,
        amountReceivedRaw: "",
        isAlreadyPaid: true,
        dueDate: "2026-06-01",
      }),
    ).toEqual({ amountReceived: 100_000, status: "paid" });
  });

  it("marks overpaid when received exceeds total", () => {
    expect(
      deriveInvoicePaymentOutcome({
        total: 50_000,
        amountReceivedRaw: "55000",
        isAlreadyPaid: false,
        dueDate: "",
      }),
    ).toEqual({ amountReceived: 55_000, status: "overpaid" });
  });

  it("marks partial when some payment received", () => {
    expect(
      deriveInvoicePaymentOutcome({
        total: 100_000,
        amountReceivedRaw: "25000",
        isAlreadyPaid: false,
        dueDate: "2026-12-01",
      }),
    ).toEqual({ amountReceived: 25_000, status: "partial" });
  });

  it("marks overdue when no payment and due date passed", () => {
    const past = new Date();
    past.setDate(past.getDate() - 7);
    const due = past.toISOString().split("T")[0];
    expect(
      deriveInvoicePaymentOutcome({
        total: 10_000,
        amountReceivedRaw: "",
        isAlreadyPaid: false,
        dueDate: due,
      }).status,
    ).toBe("overdue");
  });

  it("marks pending when no payment and due date in future", () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    expect(
      deriveInvoicePaymentOutcome({
        total: 10_000,
        amountReceivedRaw: "",
        isAlreadyPaid: false,
        dueDate: future.toISOString().split("T")[0],
      }).status,
    ).toBe("pending");
  });
});

describe("deriveInvoiceStatusAfterReceipt", () => {
  it("promotes to overpaid when cumulative receipt exceeds total", () => {
    expect(
      deriveInvoiceStatusAfterReceipt({ total: 40_000, amountReceived: 45_000 }),
    ).toBe("overpaid");
  });

  it("promotes to paid when receipt meets total", () => {
    expect(
      deriveInvoiceStatusAfterReceipt({ total: 40_000, amountReceived: 40_000 }),
    ).toBe("paid");
  });
});

describe("buildInvoiceSubmitPreview", () => {
  it("describes overpaid with excess amount", () => {
    const outcome = deriveInvoicePaymentOutcome({
      total: 50_000,
      amountReceivedRaw: "60000",
      isAlreadyPaid: false,
      dueDate: "",
    });
    const preview = buildInvoiceSubmitPreview({ outcome, total: 50_000 });
    expect(preview?.title).toContain("OVERPAID");
    expect(preview?.description).toMatch(/excess/i);
    expect(preview?.tone).toBe("warning");
  });

  it("calls out Already Paid in Full before create (T4)", () => {
    const outcome = deriveInvoicePaymentOutcome({
      total: 118_000,
      amountReceivedRaw: "",
      isAlreadyPaid: true,
      dueDate: "2026-08-01",
    });
    const preview = buildInvoiceSubmitPreview({
      outcome,
      total: 118_000,
      isAlreadyPaid: true,
    });
    expect(preview?.title).toContain("PAID");
    expect(preview?.description).toMatch(/Already Paid in Full/i);
    expect(preview?.description).toMatch(/not left pending/i);
    expect(preview?.tone).toBe("success");
  });
});

describe("formatInvoiceBalanceLabel", () => {
  it("shows excess label for overpaid documents", () => {
    expect(formatInvoiceBalanceLabel(50_000, 60_000, "overpaid")).toMatch(/excess/i);
    expect(invoiceExcessReceived(50_000, 60_000)).toBe(10_000);
  });
});

describe("applyInvoiceReceiptToDocument", () => {
  const base = {
    id: "INV-1",
    total: 100_000,
    amountReceived: 0,
    status: "pending",
  } as Invoice;

  it("increments amountReceived once per payment (no double-count path)", () => {
    const afterFirst = applyInvoiceReceiptToDocument(base, 40_000, "cash");
    expect(afterFirst.amountReceived).toBe(40_000);
    expect(afterFirst.status).toBe("partial");
    expect(afterFirst.receivedIn).toBe("cash");

    const afterSecond = applyInvoiceReceiptToDocument(afterFirst, 60_000, "bank_transfer");
    expect(afterSecond.amountReceived).toBe(100_000);
    expect(afterSecond.status).toBe("paid");
  });

  it("allows overpaid status when receipt exceeds total", () => {
    const over = applyInvoiceReceiptToDocument(base, 110_000, "cash");
    expect(over.amountReceived).toBe(110_000);
    expect(over.status).toBe("overpaid");
  });

  it("applyInvoiceReceiptDeltaToDocument adjusts status on payment edit", () => {
    const partial = applyInvoiceReceiptToDocument(base, 50_000);
    const reduced = applyInvoiceReceiptDeltaToDocument(partial, -10_000);
    expect(reduced.amountReceived).toBe(40_000);
    expect(reduced.status).toBe("partial");
  });
});
