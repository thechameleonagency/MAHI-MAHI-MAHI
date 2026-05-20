import type { Customer } from "@/types/finance";
import type { Quotation } from "@/types/project";
import { validateGstin } from "@/lib/formCategories";
import { validateContactPhone } from "@/lib/phoneValidators";

export type QuotationClientFields = Pick<
  Quotation,
  | "clientName"
  | "clientPhone"
  | "clientEmail"
  | "clientAddress"
  | "clientCity"
  | "clientState"
  | "clientGstin"
  | "clientPan"
  | "clientPincode"
  | "clientType"
  | "paymentTermsSummary"
>;

export function buildPaymentTermsSummary(parts: {
  booking?: string;
  designApproval?: string;
  beforeDispatch?: string;
  postInstallation?: string;
}): string | undefined {
  const segments: string[] = [];
  if (parts.booking?.trim()) segments.push(`Booking ${parts.booking.trim()}`);
  if (parts.designApproval?.trim()) segments.push(`Design approval ${parts.designApproval.trim()}`);
  if (parts.beforeDispatch?.trim()) segments.push(`Before dispatch ${parts.beforeDispatch.trim()}`);
  if (parts.postInstallation?.trim()) segments.push(`Post installation ${parts.postInstallation.trim()}`);
  return segments.length > 0 ? segments.join(" · ") : undefined;
}

export function formatQuotationClientAddress(q: QuotationClientFields): string {
  const parts: string[] = [];
  if (q.clientAddress?.trim()) parts.push(q.clientAddress.trim());
  const cityState = [q.clientCity?.trim(), q.clientState?.trim()].filter(Boolean).join(", ");
  if (cityState) parts.push(cityState);
  if (q.clientPincode?.trim()) parts.push(`PIN ${q.clientPincode.trim()}`);
  return parts.join(", ");
}

export function resolveCustomerTypeFromQuotation(
  q: QuotationClientFields,
): Customer["type"] {
  if (q.clientType === "company" || q.clientType === "individual") return q.clientType;
  if (q.clientGstin?.trim()) return "company";
  return "individual";
}

export function resolveCustomerState(q: QuotationClientFields): string | undefined {
  const gst = q.clientGstin?.trim().toUpperCase();
  if (gst && gst.length >= 2) return gst.slice(0, 2);
  return q.clientState?.trim() || undefined;
}

/** Gate quotation → approved: commercial client identity required for auto-customer creation. */
export function validateQuotationClientForApproval(
  q: QuotationClientFields,
): { ok: true } | { ok: false; message: string } {
  const name = q.clientName?.trim();
  if (!name) {
    return { ok: false, message: "Client name is required before approving this quotation." };
  }
  const phone = q.clientPhone?.trim();
  if (!phone) {
    return { ok: false, message: "Client phone is required before approving this quotation." };
  }
  const phoneCheck = validateContactPhone(phone);
  if (!phoneCheck.ok) {
    return { ok: false, message: phoneCheck.message };
  }
  const gst = q.clientGstin?.trim();
  if (gst) {
    const gstCheck = validateGstin(gst);
    if (!gstCheck.ok) {
      return { ok: false, message: gstCheck.error ?? "Invalid client GSTIN." };
    }
  }
  const pan = q.clientPan?.trim().toUpperCase();
  if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
    return { ok: false, message: "PAN must be 10 characters (e.g. ABCDE1234F)." };
  }
  return { ok: true };
}

/** Build a new Customer row from quotation client fields at approval time. */
export function buildCustomerFromQuotation(
  q: QuotationClientFields,
  customerId: string,
): Customer {
  const type = resolveCustomerTypeFromQuotation(q);
  const gstin = type === "company" ? q.clientGstin?.trim().toUpperCase() : undefined;
  const state = resolveCustomerState(q);
  return {
    id: customerId,
    name: q.clientName.trim(),
    phone: q.clientPhone.trim(),
    email: q.clientEmail?.trim() || "",
    address: formatQuotationClientAddress(q),
    type,
    gstin,
    pan: q.clientPan?.trim().toUpperCase() || undefined,
    state,
    paymentTerms: q.paymentTermsSummary?.trim() || undefined,
    itemsBought: [],
    totalPurchases: 0,
    customerKind: "project",
    createdAt: new Date().toISOString().split("T")[0],
  };
}

/** Backfill missing billing fields on an existing customer from the approving quotation. */
export function enrichCustomerFromQuotation(customer: Customer, q: QuotationClientFields): Customer {
  const quotationType = resolveCustomerTypeFromQuotation(q);
  const type =
    customer.type === "company" || quotationType === "company" ? "company" : customer.type ?? "individual";
  const mergedAddress = customer.address?.trim() || formatQuotationClientAddress(q);
  const gstin = customer.gstin?.trim() || q.clientGstin?.trim().toUpperCase() || undefined;
  return {
    ...customer,
    name: customer.name?.trim() || q.clientName.trim(),
    phone: customer.phone?.trim() || q.clientPhone.trim(),
    email: customer.email?.trim() || q.clientEmail?.trim() || "",
    address: mergedAddress,
    type,
    gstin,
    pan: customer.pan?.trim() || q.clientPan?.trim().toUpperCase() || undefined,
    state: customer.state?.trim() || resolveCustomerState(q),
    paymentTerms: customer.paymentTerms?.trim() || q.paymentTermsSummary?.trim() || undefined,
  };
}
