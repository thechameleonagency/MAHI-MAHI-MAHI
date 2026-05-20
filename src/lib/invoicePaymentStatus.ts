import type { Invoice } from "@/types/finance";
import { formatINR } from "@/lib/formatCurrency";

const AMOUNT_EPS = 0.005;

export type InvoicePaymentOutcome = {
  amountReceived: number;
  status: Invoice["status"];
};

export type InvoiceSubmitPreview = {
  title: string;
  description: string;
  /** Visual emphasis for the pre-submit banner in InvoiceCreateSheet */
  tone: "neutral" | "success" | "warning";
};

function parseReceivedAmount(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed === "") return 0;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Derives invoice `status` and `amountReceived` at create/submit from totals and payment inputs.
 * Single source of truth for InvoiceCreateSheet and tests.
 */
export function deriveInvoicePaymentOutcome(input: {
  total: number;
  amountReceivedRaw: string;
  isAlreadyPaid: boolean;
  dueDate: string;
}): InvoicePaymentOutcome {
  const { total, amountReceivedRaw, isAlreadyPaid, dueDate } = input;
  const parsedReceived = parseReceivedAmount(amountReceivedRaw);
  const dueDateValid = Boolean(dueDate && !Number.isNaN(Date.parse(dueDate)));

  if (isAlreadyPaid) {
    return { amountReceived: total, status: "paid" };
  }

  if (parsedReceived > total + AMOUNT_EPS && total > 0) {
    return { amountReceived: parsedReceived, status: "overpaid" };
  }

  const received = Math.min(total, Math.max(0, parsedReceived));
  if (received >= total - AMOUNT_EPS && total > 0) {
    return { amountReceived: received, status: "paid" };
  }
  if (received > AMOUNT_EPS) {
    return { amountReceived: received, status: "partial" };
  }
  if (dueDateValid && new Date(dueDate) < new Date()) {
    return { amountReceived: received, status: "overdue" };
  }
  return { amountReceived: received, status: "pending" };
}

/** Status after recording an additional receipt against an existing invoice. */
export function deriveInvoiceStatusAfterReceipt(input: {
  total: number;
  amountReceived: number;
}): Invoice["status"] {
  const { total, amountReceived } = input;
  if (amountReceived > total + AMOUNT_EPS) return "overpaid";
  if (amountReceived >= total - AMOUNT_EPS && total > 0) return "paid";
  if (amountReceived > AMOUNT_EPS) return "partial";
  return "pending";
}

export function formatInvoiceStatusLabel(status: Invoice["status"]): string {
  const labels: Record<Invoice["status"], string> = {
    draft: "Draft",
    pending: "Pending",
    partial: "Partial",
    paid: "Paid",
    overdue: "Overdue",
    overpaid: "Overpaid",
    voided: "Voided",
  };
  return labels[status] ?? status;
}

/** Signed balance: positive = amount due, negative = excess received (overpaid). */
export function invoiceBalanceDue(total: number, amountReceived: number): number {
  return total - (amountReceived || 0);
}

export function invoiceExcessReceived(total: number, amountReceived: number): number {
  const excess = (amountReceived || 0) - total;
  return excess > AMOUNT_EPS ? excess : 0;
}

/** Table/dashboard display for balance column (due vs excess). */
export function formatInvoiceBalanceLabel(total: number, amountReceived: number, status?: string): string {
  const balance = invoiceBalanceDue(total, amountReceived);
  if (status === "overpaid" || balance < -AMOUNT_EPS) {
    return `${formatINR(invoiceExcessReceived(total, amountReceived))} excess`;
  }
  return formatINR(Math.max(0, balance));
}

export function buildInvoiceSubmitPreview(input: {
  outcome: InvoicePaymentOutcome;
  total: number;
  isAlreadyPaid?: boolean;
}): InvoiceSubmitPreview | null {
  const { outcome, total, isAlreadyPaid } = input;
  if (total <= 0) return null;

  const label = formatInvoiceStatusLabel(outcome.status).toUpperCase();
  const received = formatINR(outcome.amountReceived);
  const totalFmt = formatINR(total);

  switch (outcome.status) {
    case "paid":
      if (isAlreadyPaid) {
        return {
          title: `This invoice will be saved as: ${label}`,
          description: `Already Paid in Full — ${totalFmt} will be recorded as received when you create this invoice (not left pending). Payment mode/date default to Cash and the invoice date if left empty.`,
          tone: "success",
        };
      }
      return {
        title: `This invoice will be saved as: ${label}`,
        description: `${received} received of ${totalFmt} total.`,
        tone: "success",
      };
    case "overpaid": {
      const excess = invoiceExcessReceived(total, outcome.amountReceived);
      return {
        title: `This invoice will be saved as: ${label}`,
        description: `${received} received of ${totalFmt} total (${formatINR(excess)} excess).`,
        tone: "warning",
      };
    }
    case "partial":
      return {
        title: `This invoice will be saved as: ${label}`,
        description: `${received} received of ${totalFmt} total — ${formatINR(invoiceBalanceDue(total, outcome.amountReceived))} still due.`,
        tone: "warning",
      };
    case "overdue":
      return {
        title: `This invoice will be saved as: ${label}`,
        description: `No payment recorded. Total ${totalFmt}; due date has passed.`,
        tone: "warning",
      };
    case "pending":
      return {
        title: `This invoice will be saved as: ${label}`,
        description: `No payment recorded. Total ${totalFmt}.`,
        tone: "neutral",
      };
    default:
      return null;
  }
}
