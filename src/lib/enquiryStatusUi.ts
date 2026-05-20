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
