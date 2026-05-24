import type { AuditService } from "@/application/services/AuditService";
import type { Command } from "@/application/commands/types";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import { canTransitionEnquiryStatus, type EnquiryStatus } from "@/domain/stateMachines/enquiryStateMachine";
import {
  enrichCustomerFromEnquiry,
  resolveCustomerForEnquiryConversion,
} from "@/lib/convertEnquiryCustomer";
import { getQuotationsLinkedToEnquiry } from "@/lib/enquirySendQuotation";
import type { Customer } from "@/types/finance";
import { linkEnquiryCustomerFromQuotation } from "@/lib/customerPipelineIdentity";
import type { Enquiry, Quotation } from "@/types/project";

export type EnquiryConversionAtProjectWinResult =
  | { ok: true; converted: boolean; customerId?: string; previousStatus?: EnquiryStatus }
  | { ok: false; errorCode: string; message: string };

type QuotationConversionHint = Pick<Quotation, "id" | "enquiryId" | "status">;

/** Open enquiry statuses that may still close when a linked quotation wins. */
export function isOpenEnquiryAwaitingPipelineWinClosure(from: EnquiryStatus): boolean {
  return from === "new" || from === "meeting_scheduled" || from === "quotation_sent";
}

/**
 * Canonical convert gate: enquiry must be quotation_sent (manual or after pipeline prep).
 * @deprecated Use {@link isOpenEnquiryAwaitingPipelineWinClosure} for stale repair eligibility.
 */
export function canConvertEnquiryOnPipelineWin(from: EnquiryStatus): boolean {
  return isOpenEnquiryAwaitingPipelineWinClosure(from);
}

/** @deprecated Use {@link canConvertEnquiryOnPipelineWin}. */
export const canConvertEnquiryOnProjectWin = canConvertEnquiryOnPipelineWin;

function quotationSatisfiesEnquiryQuotationSent(status: Quotation["status"]): boolean {
  return status === "sent" || status === "approved" || status === "converted_to_project";
}

/** Linked quotation has progressed far enough to close the enquiry pipeline. */
export function quotationReadyForEnquiryPipelineWin(status: Quotation["status"]): boolean {
  return quotationSatisfiesEnquiryQuotationSent(status);
}

function resolveLinkedQuotationForEnquiryConversion(
  repositories: AppRepositoryContext,
  enquiry: Enquiry,
  quotationHint?: QuotationConversionHint,
): Quotation | undefined {
  if (quotationHint?.enquiryId === enquiry.id) {
    const hinted = repositories.quotationRepository.getById(quotationHint.id);
    if (hinted) {
      return hinted;
    }
  }

  const linked = getQuotationsLinkedToEnquiry(enquiry, repositories.quotationRepository.getAll());
  const ready = linked.filter((q) => quotationSatisfiesEnquiryQuotationSent(q.status));
  if (ready.length === 0) {
    return linked[linked.length - 1];
  }
  return ready[ready.length - 1];
}

/**
 * Pipeline win must pass through quotation_sent before converted (same gate as manual convert).
 * Advances new/meeting_scheduled enquiries when their linked quotation is already sent or beyond.
 */
export function advanceEnquiryToQuotationSentBeforeConvert(
  repositories: AppRepositoryContext,
  auditService: AuditService,
  command: Command<unknown>,
  enquiryId: string,
  quotationHint?: QuotationConversionHint,
): EnquiryConversionAtProjectWinResult & { enquiry?: Enquiry } {
  const enquiry = repositories.enquiryRepository.getById(enquiryId);
  if (!enquiry) {
    return { ok: false, errorCode: "ENQUIRY_NOT_FOUND", message: "Enquiry not found" };
  }

  if (enquiry.status === "quotation_sent") {
    return { ok: true, converted: false, enquiry };
  }

  if (enquiry.status !== "new" && enquiry.status !== "meeting_scheduled") {
    return {
      ok: false,
      errorCode: "INVALID_ENQUIRY_TRANSITION",
      message: `Cannot convert enquiry from status: ${enquiry.status}`,
    };
  }

  const quotation = resolveLinkedQuotationForEnquiryConversion(repositories, enquiry, quotationHint);
  if (!quotation || !quotationSatisfiesEnquiryQuotationSent(quotation.status)) {
    return {
      ok: false,
      errorCode: "ENQUIRY_QUOTATION_NOT_SENT",
      message: "Send the linked quotation before converting the enquiry.",
    };
  }

  if (!canTransitionEnquiryStatus(enquiry.status, "quotation_sent", command.actorRole)) {
    return {
      ok: false,
      errorCode: "INVALID_ENQUIRY_TRANSITION",
      message: `Cannot move enquiry from ${enquiry.status} to quotation_sent`,
    };
  }

  const previousStatus = enquiry.status;
  repositories.enquiryRepository.update(enquiryId, {
    status: "quotation_sent",
    updatedAt: new Date().toISOString(),
  });

  auditService.write(command, {
    action: "update",
    entityType: "Enquiry",
    entityId: enquiryId,
    entityName: enquiry.customerName,
    field: "status",
    oldValue: previousStatus,
    newValue: "quotation_sent",
  });

  const updated = repositories.enquiryRepository.getById(enquiryId);
  if (!updated) {
    return { ok: false, errorCode: "ENQUIRY_NOT_FOUND", message: "Enquiry not found after status prep" };
  }

  return { ok: true, converted: false, enquiry: updated, previousStatus };
}

/**
 * Shared enquiry→customer conversion used by CONVERT_ENQUIRY_COMMAND and project-create commands.
 * Canonical path: quotation_sent → converted. Pipeline wins auto-advance new/meeting_scheduled first.
 */
export function executeEnquiryConversion(
  repositories: AppRepositoryContext,
  auditService: AuditService,
  command: Command<unknown>,
  enquiryId: string,
  options?: { pipelineWin?: boolean; projectWin?: boolean; quotation?: QuotationConversionHint },
): EnquiryConversionAtProjectWinResult {
  let enquiry = repositories.enquiryRepository.getById(enquiryId);
  if (!enquiry) {
    return { ok: false, errorCode: "ENQUIRY_NOT_FOUND", message: "Enquiry not found" };
  }

  if (enquiry.status === "converted") {
    return {
      ok: true,
      converted: false,
      customerId: enquiry.customerId,
      previousStatus: "converted",
    };
  }

  const pipelineWin = options?.pipelineWin ?? options?.projectWin;
  if (pipelineWin && enquiry.status !== "quotation_sent") {
    const prep = advanceEnquiryToQuotationSentBeforeConvert(
      repositories,
      auditService,
      command,
      enquiryId,
      options?.quotation,
    );
    if (!prep.ok) {
      return prep;
    }
    enquiry = prep.enquiry ?? repositories.enquiryRepository.getById(enquiryId);
    if (!enquiry) {
      return { ok: false, errorCode: "ENQUIRY_NOT_FOUND", message: "Enquiry not found after pipeline prep" };
    }
  }

  if (!canTransitionEnquiryStatus(enquiry.status, "converted", command.actorRole)) {
    return {
      ok: false,
      errorCode: "INVALID_ENQUIRY_TRANSITION",
      message: `Cannot convert enquiry from status: ${enquiry.status}`,
    };
  }

  const allCustomers = repositories.customerRepository.getAll() as Customer[];
  const resolved = resolveCustomerForEnquiryConversion(enquiry, allCustomers);

  if (resolved.customerCreated && resolved.customer) {
    repositories.customerRepository.add(resolved.customer);
    auditService.write(command, {
      action: "create",
      entityType: "Customer",
      entityId: resolved.customerId,
      entityName: resolved.customer.name,
      newValue: resolved.customerId,
    });
  } else {
    const existing = repositories.customerRepository.getById(resolved.customerId);
    if (existing) {
      repositories.customerRepository.update(
        resolved.customerId,
        enrichCustomerFromEnquiry(existing, enquiry),
      );
    }
  }

  const previousStatus = enquiry.status;
  repositories.enquiryRepository.update(enquiryId, {
    status: "converted",
    customerId: resolved.customerId,
    updatedAt: new Date().toISOString(),
  });

  auditService.write(command, {
    action: "update",
    entityType: "Enquiry",
    entityId: enquiryId,
    entityName: enquiry.customerName,
    field: "status",
    oldValue: previousStatus,
    newValue: "converted",
  });

  return {
    ok: true,
    converted: true,
    customerId: resolved.customerId,
    previousStatus,
  };
}

/**
 * After a project is created from a quotation, close the linked enquiry pipeline.
 * Non-fatal when there is no enquiry or the enquiry is already converted.
 */
export function convertLinkedEnquiryAfterProjectFromQuotation(
  repositories: AppRepositoryContext,
  auditService: AuditService,
  command: Command<unknown>,
  quotation: Pick<Quotation, "id" | "enquiryId" | "customerId">,
): EnquiryConversionAtProjectWinResult {
  if (!quotation.enquiryId) {
    return { ok: true, converted: false };
  }

  linkEnquiryCustomerFromQuotation(repositories, quotation.enquiryId, quotation.customerId);

  const result = executeEnquiryConversion(
    repositories,
    auditService,
    command,
    quotation.enquiryId,
    { pipelineWin: true, quotation },
  );

  if (!result.ok) {
    return result;
  }

  // Align enquiry customer with quotation when quote already carried a customer id.
  if (quotation.customerId && result.converted) {
    const enquiry = repositories.enquiryRepository.getById(quotation.enquiryId);
    if (enquiry && enquiry.customerId !== quotation.customerId) {
      repositories.enquiryRepository.update(quotation.enquiryId, {
        customerId: quotation.customerId,
      });
    }
  }

  return result;
}

/**
 * After quotation approval (customer created/linked), close the linked enquiry pipeline.
 * Non-fatal when there is no enquiry or the enquiry is already converted.
 */
export function convertLinkedEnquiryAfterQuotationApproved(
  repositories: AppRepositoryContext,
  auditService: AuditService,
  command: Command<unknown>,
  quotation: Pick<Quotation, "id" | "enquiryId" | "customerId">,
): EnquiryConversionAtProjectWinResult {
  if (!quotation.enquiryId?.trim() || !quotation.customerId?.trim()) {
    return { ok: true, converted: false };
  }

  const enquiry = repositories.enquiryRepository.getById(quotation.enquiryId);
  if (!enquiry) {
    return { ok: true, converted: false };
  }
  // Approval must not fail when the enquiry pipeline already ended.
  if (enquiry.status === "lost" || enquiry.status === "quotation_rejected") {
    return {
      ok: true,
      converted: false,
      customerId: enquiry.customerId,
      previousStatus: enquiry.status,
    };
  }

  linkEnquiryCustomerFromQuotation(repositories, quotation.enquiryId, quotation.customerId);

  const result = executeEnquiryConversion(
    repositories,
    auditService,
    command,
    quotation.enquiryId,
    { pipelineWin: true, quotation },
  );

  if (!result.ok) {
    return result;
  }

  return result;
}
