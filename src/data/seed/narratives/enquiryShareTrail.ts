import type { NarrativeApply } from "./shared";
import { getEnquiryAssigneeDisplayName } from "@/lib/enquiryAssignee";
import { seedDateAt } from "../seedTimeModel";

/** Seed one enquiry with persisted share history + activity note (MD10 demo trail). */
export const applyEnquiryShareTrail: NarrativeApply = (state) => {
  const enquiry =
    state.enquiries.find((e) => e.status === "quotation_sent") ??
    state.enquiries.find((e) => e.status === "new");
  if (!enquiry) return;

  const sentAt = seedDateAt(0.42);
  const contact = enquiry.customerPhone?.trim() || undefined;
  enquiry.shareHistory = [
    {
      method: "whatsapp",
      contactValue: contact,
      sentAt,
    },
  ];
  const shareNote = {
    date: sentAt.split("T")[0],
    note: `Enquiry pack shared via WhatsApp${contact ? ` (${contact})` : ""}.`,
    by: getEnquiryAssigneeDisplayName(enquiry, state.settingsTeamMembers) || "Sales",
  };
  enquiry.notes = [shareNote, ...(enquiry.notes ?? [])];
  enquiry.updatedAt = sentAt.split("T")[0];
};
