import type { Enquiry } from "@/types/project";

/** Parity with quotation `shareHistory` entries (enquiry supports whatsapp + email only in UI). */
export type EnquiryShareMethod = "whatsapp" | "email";

export type EnquiryShareRecord = {
  method: EnquiryShareMethod;
  contactValue?: string;
  sentAt: string;
};

export function buildEnquiryShareMessage(enquiry: Enquiry): string {
  return [
    `Enquiry: ${enquiry.id}`,
    `Customer: ${enquiry.customerName}`,
    `Phone: ${enquiry.customerPhone}`,
    enquiry.customerEmail ? `Email: ${enquiry.customerEmail}` : null,
    `System: ${enquiry.systemCapacity}`,
    `Budget: ${enquiry.estimatedBudget}`,
    enquiry.requirements ? `Requirements: ${enquiry.requirements}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatEnquiryShareMethodLabel(method: EnquiryShareMethod): string {
  return method === "whatsapp" ? "WhatsApp" : "Email";
}

/** Human-readable CRM note appended to `enquiry.notes` when a pack is shared (MD10). */
export function buildEnquiryShareActivityNote(
  entry: EnquiryShareRecord,
  actorDisplayName: string,
): Enquiry["notes"][number] {
  const methodLabel = formatEnquiryShareMethodLabel(entry.method);
  const contact = entry.contactValue?.trim() ? ` (${entry.contactValue.trim()})` : "";
  return {
    date: entry.sentAt.split("T")[0],
    note: `Enquiry pack shared via ${methodLabel}${contact}.`,
    by: "",
    updatedBy: actorDisplayName,
  };
}

export function openEnquiryShareExternalLink(
  enquiry: Enquiry,
  method: EnquiryShareMethod,
  message: string,
): void {
  if (method === "whatsapp") {
    const phone = enquiry.customerPhone.replace(/\s/g, "").replace(/^\+/, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
    return;
  }
  window.open(
    `mailto:${enquiry.customerEmail}?subject=${encodeURIComponent(`Enquiry ${enquiry.id}`)}&body=${encodeURIComponent(message)}`,
    "_blank",
  );
}
