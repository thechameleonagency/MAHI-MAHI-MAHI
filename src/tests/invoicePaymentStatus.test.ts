import { describe, expect, it } from "vitest";
import {
  buildInvoiceSubmitPreview,
  deriveInvoicePaymentOutcome,
  deriveInvoiceStatusAfterReceipt,
  formatInvoiceBalanceLabel,
  invoiceExcessReceived,
} from "@/lib/invoicePaymentStatus";

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
