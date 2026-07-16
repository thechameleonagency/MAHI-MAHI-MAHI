/**
 * Billing analytics: invoice lifecycle, invoiced-vs-collected trend, days to
 * payment, GST output vs input, top customers, and payment mode mix.
 */
import type { Invoice, Payment } from "@/types/finance";
import type { VendorBill } from "@/types/inventory";
import {
  buildTimeSeries,
  inWindow,
  parseIsoDate,
  type BusinessGranularity,
  type BusinessWindow,
} from "./timeBuckets";

export interface InvoiceGstAnalytics {
  invoiceCount: number;
  totalInvoiced: number;
  totalCollected: number;
  collectionPct: number;
  avgDaysToPayment: number | null;
  statusMix: { status: string; count: number; amount: number }[];
  invoicedVsCollectedSeries: { key: string; label: string; invoiced: number; collected: number }[];
  // GST
  gstOutput: number;
  gstOutputBreakdown: { cgst: number; sgst: number; igst: number };
  gstInput: number;
  gstNetPayable: number;
  gstSeries: { key: string; label: string; output: number; input: number }[];
  // Customers & payments
  topCustomers: { customerId: string; name: string; invoiced: number; count: number }[];
  paymentModes: { mode: string; count: number; amount: number }[];
}

const countsForGst = (inv: Invoice): boolean =>
  inv.status !== "draft" && inv.status !== "voided";

export function computeInvoiceGstAnalytics(
  invoices: Invoice[],
  payments: Payment[],
  vendorBills: VendorBill[],
  window: BusinessWindow,
  granularity: BusinessGranularity,
  typeFilter: "all" | "invoice" | "sale-bill" = "all",
  statusFilter = "all",
): InvoiceGstAnalytics {
  const inPeriod = invoices.filter(
    (inv) =>
      inWindow(inv.invoiceDate, window) &&
      (typeFilter === "all" || (inv.type ?? "invoice") === typeFilter) &&
      (statusFilter === "all" || inv.status === statusFilter),
  );
  const billable = inPeriod.filter(countsForGst);

  const totalInvoiced = billable.reduce((s, i) => s + (i.total || 0), 0);
  const totalCollected = billable.reduce((s, i) => s + (i.amountReceived || 0), 0);

  const paymentDays: number[] = [];
  for (const inv of billable) {
    if (!inv.receivedDate) continue;
    const a = parseIsoDate(inv.invoiceDate);
    const b = parseIsoDate(inv.receivedDate);
    if (!a || !b || b < a) continue;
    paymentDays.push(Math.round((b.getTime() - a.getTime()) / 86_400_000));
  }

  const statusMap = new Map<string, { count: number; amount: number }>();
  for (const inv of inPeriod) {
    const st = statusMap.get(inv.status) ?? { count: 0, amount: 0 };
    st.count++;
    st.amount += inv.total || 0;
    statusMap.set(inv.status, st);
  }

  const invoicedSeries = buildTimeSeries(billable, (i) => i.invoiceDate, window, granularity, (i) => i.total || 0);
  // Collected by actual cash-in date (customer payments linked to an invoice).
  const collectionsIn = payments.filter(
    (p) => p.direction === "in" && p.invoiceId && inWindow(p.date, window),
  );
  const collectedSeries = buildTimeSeries(collectionsIn, (p) => p.date, window, granularity, (p) => p.amount);

  // GST: output from customer invoices, input credit from vendor bills.
  const gstOf = (i: Invoice) => (i.cgst || 0) + (i.sgst || 0) + (i.igst || 0);
  const gstOutput = billable.reduce((s, i) => s + gstOf(i), 0);
  const billsInPeriod = vendorBills.filter(
    (b) => b.status !== "draft" && inWindow(b.billDate, window),
  );
  const gstInput = billsInPeriod.reduce((s, b) => s + (b.gst || 0), 0);
  const gstOutputSeries = buildTimeSeries(billable, (i) => i.invoiceDate, window, granularity, gstOf);
  const gstInputSeries = buildTimeSeries(billsInPeriod, (b) => b.billDate, window, granularity, (b) => b.gst || 0);

  const customerMap = new Map<string, { name: string; invoiced: number; count: number }>();
  for (const inv of billable) {
    const key = String(inv.customerId || inv.customerName || "unknown");
    const entry = customerMap.get(key) ?? { name: inv.customerName || key, invoiced: 0, count: 0 };
    entry.invoiced += inv.total || 0;
    entry.count++;
    customerMap.set(key, entry);
  }

  const modeMap = new Map<string, { count: number; amount: number }>();
  for (const p of payments) {
    if (p.direction !== "in" || !inWindow(p.date, window)) continue;
    const mode = p.paymentMode?.trim() || "Unspecified";
    const entry = modeMap.get(mode) ?? { count: 0, amount: 0 };
    entry.count++;
    entry.amount += p.amount;
    modeMap.set(mode, entry);
  }

  return {
    invoiceCount: inPeriod.length,
    totalInvoiced: Math.round(totalInvoiced),
    totalCollected: Math.round(totalCollected),
    collectionPct: totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0,
    avgDaysToPayment: paymentDays.length
      ? Math.round(paymentDays.reduce((a, b) => a + b, 0) / paymentDays.length)
      : null,
    statusMix: [...statusMap.entries()]
      .map(([status, v]) => ({ status, count: v.count, amount: Math.round(v.amount) }))
      .sort((a, b) => b.amount - a.amount),
    invoicedVsCollectedSeries: invoicedSeries.map((p, i) => ({
      key: p.key,
      label: p.label,
      invoiced: p.value,
      collected: collectedSeries[i]?.value ?? 0,
    })),
    gstOutput: Math.round(gstOutput),
    gstOutputBreakdown: {
      cgst: Math.round(billable.reduce((s, i) => s + (i.cgst || 0), 0)),
      sgst: Math.round(billable.reduce((s, i) => s + (i.sgst || 0), 0)),
      igst: Math.round(billable.reduce((s, i) => s + (i.igst || 0), 0)),
    },
    gstInput: Math.round(gstInput),
    gstNetPayable: Math.round(gstOutput - gstInput),
    gstSeries: gstOutputSeries.map((p, i) => ({
      key: p.key,
      label: p.label,
      output: p.value,
      input: gstInputSeries[i]?.value ?? 0,
    })),
    topCustomers: [...customerMap.entries()]
      .map(([customerId, v]) => ({ customerId, name: v.name, invoiced: Math.round(v.invoiced), count: v.count }))
      .sort((a, b) => b.invoiced - a.invoiced)
      .slice(0, 8),
    paymentModes: [...modeMap.entries()]
      .map(([mode, v]) => ({ mode, count: v.count, amount: Math.round(v.amount) }))
      .sort((a, b) => b.amount - a.amount),
  };
}
