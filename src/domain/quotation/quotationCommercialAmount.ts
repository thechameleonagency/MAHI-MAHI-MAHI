import type { Quotation } from "@/types/project";

/** Shown in UI and returned from command/context validation for send/approve. */
export const QUOTATION_ZERO_AMOUNT_ERROR =
  "Quotation must have a total greater than ₹0 before it can be sent or approved.";

type QuotationAmountSource = Pick<
  Quotation,
  | "clientAgreedAmount"
  | "totalAmount"
  | "finalAmount"
  | "temporaryAmount"
  | "presetSnapshot"
  | "customItems"
>;

/** Sum line totals from frozen preset snapshot and custom items. */
export function computeQuotationLineItemsTotal(quotation: QuotationAmountSource): number {
  let total = 0;
  for (const m of quotation.presetSnapshot ?? []) {
    const qty = typeof m.quantity === "number" ? m.quantity : 0;
    const rate =
      typeof m.rate === "number"
        ? m.rate
        : typeof (m as { unitPrice?: number }).unitPrice === "number"
          ? (m as { unitPrice: number }).unitPrice
          : 0;
    total += qty * rate;
  }
  for (const c of quotation.customItems ?? []) {
    const line =
      typeof c.amount === "number" && Number.isFinite(c.amount)
        ? c.amount
        : (c.quantity ?? 0) * (c.rate ?? 0);
    total += line;
  }
  return total;
}

/**
 * Canonical commercial value for lifecycle gates (send / approve / convert).
 * Uses stored totals and recomputes from line items when fields are stale or zero.
 */
export function resolveQuotationCommercialAmount(quotation: QuotationAmountSource): number {
  const fromLines = computeQuotationLineItemsTotal(quotation);
  const fromFields = Math.max(
    quotation.clientAgreedAmount ?? 0,
    quotation.totalAmount ?? 0,
    quotation.finalAmount ?? 0,
    quotation.temporaryAmount ?? 0,
  );
  return Math.max(fromFields, fromLines);
}

export function hasPositiveQuotationAmount(quotation: QuotationAmountSource): boolean {
  return resolveQuotationCommercialAmount(quotation) > 0;
}

/** Quoted total on the document (GST-inclusive after subsidy). */
export function resolveQuotationQuotedTotal(
  quotation: Pick<Quotation, "totalAmount">,
): number {
  return quotation.totalAmount ?? 0;
}

/**
 * Contract / project conversion amount: client agreed price when set, else quoted total.
 * Prefer this over inline `clientAgreedAmount || totalAmount` at conversion boundaries.
 */
export function resolveContractAmount(
  quotation: Pick<Quotation, "clientAgreedAmount" | "totalAmount">,
): number {
  return quotation.clientAgreedAmount ?? quotation.totalAmount ?? 0;
}

export function hasDistinctClientAgreedAmount(
  quotation: Pick<Quotation, "clientAgreedAmount" | "totalAmount">,
): boolean {
  const agreed = quotation.clientAgreedAmount;
  const quoted = quotation.totalAmount;
  return (
    agreed != null &&
    quoted != null &&
    Number.isFinite(agreed) &&
    Number.isFinite(quoted) &&
    agreed !== quoted
  );
}

/** Persist quoted vs negotiated amounts on save / transition patches. */
export function persistQuotationAmountFields(
  quotedTotal: number,
  clientAgreedOverride?: number | null,
): { totalAmount: number; clientAgreedAmount: number } {
  const quoted = Math.max(0, quotedTotal);
  const agreed =
    clientAgreedOverride != null &&
    Number.isFinite(clientAgreedOverride) &&
    clientAgreedOverride > 0
      ? clientAgreedOverride
      : quoted;
  return { totalAmount: quoted, clientAgreedAmount: agreed };
}

export function validateQuotationSendOrApprove(
  quotation: QuotationAmountSource,
): { ok: true } | { ok: false; message: string } {
  if (hasPositiveQuotationAmount(quotation)) {
    return { ok: true };
  }
  return { ok: false, message: QUOTATION_ZERO_AMOUNT_ERROR };
}
