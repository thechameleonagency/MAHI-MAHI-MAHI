import type { Customer } from "@/types/finance";
import type { Quotation } from "@/types/project";
import { validateGstin } from "@/lib/formCategories";
import { createNextCustomerId, formatCustomerIdDisplay } from "@/lib/idFactory";
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

export type QuotationApprovalCustomerPreview = {
  mode: "create" | "link_existing";
  customerId: string;
  displayName: string;
  phone: string;
  email: string;
  address: string;
  type: Customer["type"];
  gstin?: string;
  pan?: string;
  paymentTerms?: string;
  /** Human labels for fields backfilled from the quotation on an existing customer. */
  enrichments: string[];
};

function listCustomerEnrichments(before: Customer, after: Customer): string[] {
  const labels: string[] = [];
  if (!before.name?.trim() && after.name?.trim()) labels.push("Name");
  if (!before.phone?.trim() && after.phone?.trim()) labels.push("Phone");
  if (!before.email?.trim() && after.email?.trim()) labels.push("Email");
  if (!before.address?.trim() && after.address?.trim()) labels.push("Address");
  if (!before.gstin?.trim() && after.gstin?.trim()) labels.push("GSTIN");
  if (!before.pan?.trim() && after.pan?.trim()) labels.push("PAN");
  if (!before.state?.trim() && after.state?.trim()) labels.push("State");
  if (!before.paymentTerms?.trim() && after.paymentTerms?.trim()) labels.push("Payment terms");
  if (before.type !== "company" && after.type === "company") labels.push("Customer type → company");
  return labels;
}

/**
 * Describes the customer record that approval will create or update (O2 trust loop).
 * Mirrors `CREATE` / `TRANSITION` approval logic in `registerQuotationCommands`.
 */
export type QuotationApprovalSuccessFeedback = {
  variant: "success";
  title: string;
  description: string;
};

/** Inline banner + toast copy after approve when a customer is created or updated (O2 / T6). */
export function buildQuotationApprovalSuccessFeedback(
  preview: QuotationApprovalCustomerPreview | undefined,
  options?: { quotationNumber?: string },
): QuotationApprovalSuccessFeedback {
  const qn = options?.quotationNumber?.trim();
  const qLabel = qn ? `${qn} ` : "This quotation ";

  if (!preview) {
    return {
      variant: "success",
      title: "Quotation approved",
      description: qn ? `${qn} is now approved.` : "Quotation marked as approved.",
    };
  }

  const ref = formatCustomerIdDisplay(preview.customerId);

  if (preview.mode === "create") {
    return {
      variant: "success",
      title: "Quotation approved — customer created",
      description: `${qLabel}is approved. Customer ${ref} (${preview.displayName}) was created from the quotation billing details and linked automatically.`,
    };
  }

  const enrich =
    preview.enrichments.length > 0
      ? ` Missing fields were backfilled: ${preview.enrichments.join(", ")}.`
      : " Customer record already had the billing fields from this quotation.";
  return {
    variant: "success",
    title: "Quotation approved — customer linked",
    description: `${qLabel}is approved and linked to ${ref} (${preview.displayName}).${enrich}`,
  };
}

export function buildQuotationApprovalCustomerPreview(
  q: QuotationClientFields & { customerId?: string },
  options: {
    existingCustomer: Customer | null | undefined;
    existingCustomerIds: string[];
  },
): { ok: true; preview: QuotationApprovalCustomerPreview } | { ok: false; message: string } {
  const clientCheck = validateQuotationClientForApproval(q);
  if (!clientCheck.ok) {
    return clientCheck;
  }

  const linkedId = q.customerId?.trim();
  if (linkedId && options.existingCustomer) {
    const enriched = enrichCustomerFromQuotation(options.existingCustomer, q);
    return {
      ok: true,
      preview: {
        mode: "link_existing",
        customerId: linkedId,
        displayName: enriched.name,
        phone: enriched.phone,
        email: enriched.email,
        address: enriched.address,
        type: enriched.type,
        gstin: enriched.gstin,
        pan: enriched.pan,
        paymentTerms: enriched.paymentTerms,
        enrichments: listCustomerEnrichments(options.existingCustomer, enriched),
      },
    };
  }

  if (linkedId && !options.existingCustomer) {
    return {
      ok: false,
      message: `Customer ${linkedId} is linked on this quotation but was not found. Fix the customer link before approving.`,
    };
  }

  const proposedId = createNextCustomerId(options.existingCustomerIds);
  const created = buildCustomerFromQuotation(q, proposedId);
  return {
    ok: true,
    preview: {
      mode: "create",
      customerId: proposedId,
      displayName: created.name,
      phone: created.phone,
      email: created.email,
      address: created.address,
      type: created.type,
      gstin: created.gstin,
      pan: created.pan,
      paymentTerms: created.paymentTerms,
      enrichments: [],
    },
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
