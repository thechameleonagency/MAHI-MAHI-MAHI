/**
 * Central GST split for invoices — intra-state (CGST+SGST) vs inter-state (IGST).
 */

export interface GstSplitInput {
  subtotal: number;
  gstRatePercent: number;
  companyStateCode: string;
  counterpartyStateCode: string;
}

export interface GstSplitResult {
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeGstSplit(input: GstSplitInput): GstSplitResult {
  const { subtotal, gstRatePercent, companyStateCode, counterpartyStateCode } = input;
  const tax = round2((subtotal * gstRatePercent) / 100);
  const intra =
    companyStateCode &&
    counterpartyStateCode &&
    companyStateCode === counterpartyStateCode;
  if (intra) {
    const half = round2(tax / 2);
    return { cgst: half, sgst: half, igst: 0, total: round2(subtotal + tax) };
  }
  return { cgst: 0, sgst: 0, igst: tax, total: round2(subtotal + tax) };
}
