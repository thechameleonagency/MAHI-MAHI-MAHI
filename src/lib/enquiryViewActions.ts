import type { UserRole } from "@/domain/entities/identity";
import { canReopenLostEnquiry, type EnquiryStatus } from "@/domain/stateMachines/enquiryStateMachine";
import { assertCanLinkNewQuotationToEnquiry } from "@/lib/enquiryQuotationCreateGate";
import { getCurrentEnquiryQuotationId } from "@/lib/enquiryQuotationHistory";
import { deriveEnquiryStatusFromQuotations } from "@/lib/enquiryStatusReconcile";
import {
  ENQUIRY_SEND_QUOTATION_VALIDATION_MESSAGE,
  getQuotationsLinkedToEnquiry,
  hasEnquirySentQuotationPipeline,
  pickQuotationToSendOnEnquiryMark,
} from "@/lib/enquirySendQuotation";
import type { Enquiry, Quotation } from "@/types/project";

export type EnquiryViewActions = {
  currentQuotationId: string | undefined;
  sendableQuotationId: string | undefined;
  showCreateQuotation: boolean;
  showSendQuotation: boolean;
  showViewQuotation: boolean;
  showMarkAsConverted: boolean;
  showMarkAsLost: boolean;
  showAssignLead: boolean;
  showScheduleMeeting: boolean;
  showRescheduleMeeting: boolean;
  showReopen: boolean;
  showArchive: boolean;
  showUnarchive: boolean;
};

function isActivePipeline(status: EnquiryStatus): boolean {
  return status !== "converted" && status !== "lost";
}

function enquiryHasLinkedQuotation(
  enquiry: Pick<Enquiry, "id" | "quotationId" | "quotationIds">,
  quotations: Quotation[],
): boolean {
  if (getCurrentEnquiryQuotationId(enquiry)) return true;
  return getQuotationsLinkedToEnquiry(enquiry, quotations).length > 0;
}

/**
 * Pure visibility rules for enquiry view sheet, list callouts, and dashboard row menus.
 */
export function getEnquiryViewActions(
  enquiry: Enquiry,
  quotations: Quotation[],
  actorRole: UserRole,
): EnquiryViewActions {
  const currentQuotationId = getCurrentEnquiryQuotationId(enquiry);
  const sendable = pickQuotationToSendOnEnquiryMark(enquiry, quotations);
  const sendableQuotationId = sendable?.id;
  const hasLinked = enquiryHasLinkedQuotation(enquiry, quotations);
  const createGate = assertCanLinkNewQuotationToEnquiry(enquiry, actorRole);
  const pipelineStatus = deriveEnquiryStatusFromQuotations(enquiry, quotations);
  const active = isActivePipeline(pipelineStatus);
  const archived = Boolean(enquiry.archivedAt);

  const showCreateQuotation =
    createGate.ok &&
    active &&
    !archived &&
    (((pipelineStatus === "new" || pipelineStatus === "meeting_scheduled") && !hasLinked) ||
      pipelineStatus === "quotation_rejected");

  const showSendQuotation =
    active &&
    !archived &&
    Boolean(sendableQuotationId) &&
    (pipelineStatus === "new" ||
      pipelineStatus === "meeting_scheduled" ||
      pipelineStatus === "quotation_sent");

  const showViewQuotation = Boolean(currentQuotationId);

  const showMarkAsConverted =
    pipelineStatus === "quotation_sent" &&
    !archived &&
    hasEnquirySentQuotationPipeline(enquiry, quotations);

  const showMarkAsLost = active && !archived;

  const showAssignLead = active && !archived;

  const showScheduleMeeting = pipelineStatus === "new" && !archived;

  const showRescheduleMeeting = pipelineStatus === "meeting_scheduled" && !archived;

  const showReopen = pipelineStatus === "lost" && canReopenLostEnquiry(actorRole);

  const showArchive =
    !archived && (pipelineStatus === "lost" || pipelineStatus === "converted");

  const showUnarchive = archived;

  return {
    currentQuotationId,
    sendableQuotationId,
    showCreateQuotation,
    showSendQuotation,
    showViewQuotation,
    showMarkAsConverted,
    showMarkAsLost,
    showAssignLead,
    showScheduleMeeting,
    showRescheduleMeeting,
    showReopen,
    showArchive,
    showUnarchive,
  };
}

export type ExecuteEnquirySendQuotationDeps = {
  transitionEnquiryStatus: (
    id: string,
    nextStatus: "quotation_sent",
  ) => Promise<{ ok: boolean; error?: string }>;
  transitionQuotationStatus: (
    quotationId: string,
    nextStatus: "sent",
  ) => Promise<{ ok: boolean; error?: string }>;
  quotations: Quotation[];
};

/**
 * Send the current linked draft quotation. Advances enquiry to quotation_sent when still new/meeting_scheduled.
 */
export async function executeEnquirySendQuotation(
  enquiry: Enquiry,
  deps: ExecuteEnquirySendQuotationDeps,
): Promise<{ ok: boolean; error?: string }> {
  const sendable = pickQuotationToSendOnEnquiryMark(enquiry, deps.quotations);
  if (!sendable) {
    return { ok: false, error: ENQUIRY_SEND_QUOTATION_VALIDATION_MESSAGE };
  }

  const pipelineStatus = deriveEnquiryStatusFromQuotations(enquiry, deps.quotations);

  if (pipelineStatus === "new" || pipelineStatus === "meeting_scheduled") {
    return deps.transitionEnquiryStatus(enquiry.id, "quotation_sent");
  }

  if (pipelineStatus === "quotation_sent") {
    return deps.transitionQuotationStatus(sendable.id, "sent");
  }

  return { ok: false, error: "Cannot send quotation from this enquiry status." };
}
