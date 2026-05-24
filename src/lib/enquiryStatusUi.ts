import type { Enquiry } from "@/types/project";

export const ENQUIRY_STATUS_LABELS: Record<Enquiry["status"], string> = {
  new: "New",
  meeting_scheduled: "Meeting Scheduled",
  quotation_sent: "Quotation Sent",
  quotation_rejected: "Quotation Rejected",
  converted: "Converted",
  lost: "Lost",
};

export function formatEnquiryStatusLabel(status: Enquiry["status"]): string {
  return ENQUIRY_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

/** Short date for enquiry table cells and detail sheets (IST-style). */
export function formatEnquiryDisplayDate(iso?: string | null): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
