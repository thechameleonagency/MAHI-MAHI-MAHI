import type { Invoice } from "@/types/finance";
import type { VendorBill } from "@/types/inventory";

export interface GstSummary {
  outputGST: number;
  inputGST: number;
  netPayable: number;
  reverseChargeCount: number;
}

export interface HsnSacRow {
  code: string;
  kind: "HSN" | "SAC";
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  lineCount: number;
}

export function computeGstSummary(
  invoices: Invoice[],
  saleBills: Invoice[],
  vendorBills: VendorBill[],
  inPeriod: (dateStr: string) => boolean,
): GstSummary {
  const sales = [...invoices, ...saleBills].filter((inv) => inPeriod(inv.invoiceDate));
  const outputGST = sales.reduce((s, inv) => s + (inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0), 0);
  const purchases = vendorBills.filter((b) => inPeriod(b.billDate));
  const inputGST = purchases.reduce((s, b) => s + (b.gst || 0), 0);
  const reverseChargeCount = purchases.filter((b) =>
    (b.notes ?? "").toLowerCase().includes("reverse charge"),
  ).length;
  return { outputGST, inputGST, netPayable: outputGST - inputGST, reverseChargeCount };
}

export function computeHsnSacBreakdown(
  invoices: Invoice[],
  saleBills: Invoice[],
  inPeriod: (dateStr: string) => boolean,
): HsnSacRow[] {
  const map = new Map<string, HsnSacRow>();

  const addLine = (code: string, kind: "HSN" | "SAC", taxable: number, cgst: number, sgst: number, igst: number) => {
    const key = `${kind}:${code}`;
    const existing = map.get(key);
    if (existing) {
      existing.taxableValue += taxable;
      existing.cgst += cgst;
      existing.sgst += sgst;
      existing.igst += igst;
      existing.totalTax += cgst + sgst + igst;
      existing.lineCount += 1;
    } else {
      map.set(key, {
        code,
        kind,
        taxableValue: taxable,
        cgst,
        sgst,
        igst,
        totalTax: cgst + sgst + igst,
        lineCount: 1,
      });
    }
  };

  [...invoices, ...saleBills]
    .filter((inv) => inPeriod(inv.invoiceDate) && inv.status !== "voided")
    .forEach((inv) => {
      const taxRatio = inv.subtotal > 0 ? (inv.cgst + inv.sgst + inv.igst) / inv.subtotal : 0;
      inv.items.forEach((item) => {
        const taxable = item.quantity * item.rate;
        const tax = taxable * taxRatio;
        const cgst = inv.igst > 0 ? 0 : tax / 2;
        const sgst = inv.igst > 0 ? 0 : tax / 2;
        const igst = inv.igst > 0 ? tax : 0;
        addLine(item.hsn || "NA", "HSN", taxable, cgst, sgst, igst);
      });
      inv.services.forEach((svc) => {
        const taxable = svc.rate;
        const tax = taxable * taxRatio;
        const cgst = inv.igst > 0 ? 0 : tax / 2;
        const sgst = inv.igst > 0 ? 0 : tax / 2;
        const igst = inv.igst > 0 ? tax : 0;
        addLine(svc.sac || "NA", "SAC", taxable, cgst, sgst, igst);
      });
    });

  return [...map.values()].sort((a, b) => b.taxableValue - a.taxableValue);
}
