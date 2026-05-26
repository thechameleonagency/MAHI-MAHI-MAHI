import { formatEnquiryStatusLabel } from "@/lib/enquiryStatusUi";
import { getCurrentEnquiryQuotationId, getEnquiryQuotationIds } from "@/lib/enquiryQuotationHistory";
import { deriveEnquiryStatusFromQuotations } from "@/lib/enquiryStatusReconcile";
import { getQuotationsLinkedToEnquiry } from "@/lib/enquirySendQuotation";
import type { Enquiry, Quotation } from "@/types/project";

export type EnquiryHistoryEvent = {
  label: string;
  description: string;
  at: string;
  tone: "primary" | "blue" | "teal" | "green" | "destructive" | "muted" | "orange";
};

export function buildEnquiryStatusHistory(
  enquiry: Enquiry,
  quotations: Quotation[],
): EnquiryHistoryEvent[] {
  const events: EnquiryHistoryEvent[] = [];
  const linked = getQuotationsLinkedToEnquiry(enquiry, quotations);

  events.push({
    label: "Created",
    description: `Enquiry logged as ${formatEnquiryStatusLabel("new")}.`,
    at: enquiry.createdAt,
    tone: "primary",
  });

  if (enquiry.meetingDate) {
    events.push({
      label: enquiry.status === "meeting_scheduled" ? "Meeting scheduled" : "Meeting",
      description: enquiry.meetingNotes?.trim()
        ? enquiry.meetingNotes.trim()
        : `Meeting on ${enquiry.meetingDate}.`,
      at: enquiry.meetingDate,
      tone: "blue",
    });
  }

  for (const q of linked) {
    events.push({
      label: `Quotation ${q.quotationNumber} drafted`,
      description: `Linked quotation created (${q.status.replace(/_/g, " ")}).`,
      at: q.createdAt,
      tone: "muted",
    });
    if (q.sentAt) {
      events.push({
        label: "Quotation sent",
        description: `${q.quotationNumber} shared with the client.`,
        at: q.sentAt,
        tone: "blue",
      });
    }
    if (q.approvedAt) {
      events.push({
        label: "Quotation approved",
        description: `${q.quotationNumber} approved by the client.`,
        at: q.approvedAt,
        tone: "teal",
      });
    }
    if (q.rejectedAt) {
      events.push({
        label: "Quotation rejected",
        description: q.rejectionReason || `${q.quotationNumber} rejected.`,
        at: q.rejectedAt,
        tone: "destructive",
      });
    }
    if (q.withdrawnAt) {
      events.push({
        label: "Quotation withdrawn",
        description: q.withdrawnReason || `${q.quotationNumber} withdrawn.`,
        at: q.withdrawnAt,
        tone: "muted",
      });
    }
    if (q.convertedAt || q.status === "converted_to_project") {
      events.push({
        label: "Won via project",
        description: `${q.quotationNumber} converted to a project.`,
        at: q.convertedAt || q.approvedAt || q.createdAt,
        tone: "green",
      });
    }
  }

  const pipelineStatus = deriveEnquiryStatusFromQuotations(enquiry, quotations);
  if (
    pipelineStatus === "quotation_sent" &&
    linked.some((q) => q.sentAt) &&
    enquiry.status === "quotation_sent"
  ) {
    events.push({
      label: formatEnquiryStatusLabel("quotation_sent"),
      description: "Enquiry marked quotation sent.",
      at: enquiry.updatedAt,
      tone: "orange",
    });
  }

  if (enquiry.status === "quotation_rejected") {
    events.push({
      label: formatEnquiryStatusLabel("quotation_rejected"),
      description: "Latest quotation rejected or withdrawn.",
      at: enquiry.updatedAt,
      tone: "destructive",
    });
  }

  if (enquiry.status === "converted") {
    events.push({
      label: formatEnquiryStatusLabel("converted"),
      description: enquiry.customerId
        ? `Converted to customer ${enquiry.customerId}.`
        : "Enquiry converted to customer.",
      at: enquiry.updatedAt,
      tone: "green",
    });
  }

  if (enquiry.status === "lost") {
    events.push({
      label: formatEnquiryStatusLabel("lost"),
      description: enquiry.lostReason?.trim() || "Enquiry marked as lost.",
      at: enquiry.updatedAt,
      tone: "destructive",
    });
  }

  if (enquiry.archivedAt) {
    events.push({
      label: "Archived",
      description: enquiry.archivedReason?.trim() || "Removed from active pipeline lists.",
      at: enquiry.archivedAt,
      tone: "muted",
    });
  }

  events.sort((a, b) => (a.at || "").localeCompare(b.at || ""));
  return events;
}

/** Enquiry won through quotation → project; priority is no longer highlighted. */
export function enquiryShouldHidePriorityChip(
  enquiry: Enquiry,
  quotations: Quotation[],
): boolean {
  if (enquiry.status === "converted") return true;
  const ids = new Set(getEnquiryQuotationIds(enquiry));
  return quotations.some(
    (q) => ids.has(q.id) && (q.status === "converted_to_project" || q.status === "approved"),
  );
}

export function getCurrentLinkedQuotation(
  enquiry: Enquiry,
  quotations: Quotation[],
): Quotation | undefined {
  const currentId = getCurrentEnquiryQuotationId(enquiry);
  const linked = getQuotationsLinkedToEnquiry(enquiry, quotations);
  if (currentId) return linked.find((q) => q.id === currentId);
  return linked[linked.length - 1];
}
