import type { AuditService } from "@/application/services/AuditService";
import type { Command } from "@/application/commands/types";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import { canTransitionEnquiryStatus, type EnquiryStatus } from "@/domain/stateMachines/enquiryStateMachine";
import {
  enrichCustomerFromEnquiry,
  resolveCustomerForEnquiryConversion,
} from "@/lib/convertEnquiryCustomer";
import type { Customer } from "@/types/finance";
import { linkEnquiryCustomerFromQuotation } from "@/lib/customerPipelineIdentity";
import type { Enquiry, Quotation } from "@/types/project";

export type EnquiryConversionAtProjectWinResult =
  | { ok: true; converted: boolean; customerId?: string; previousStatus?: EnquiryStatus }
  | { ok: false; errorCode: string; message: string };

/** Statuses that may close when a linked quotation wins (approved or project created). */
export function canConvertEnquiryOnPipelineWin(from: EnquiryStatus): boolean {
  if (from === "converted" || from === "lost" || from === "quotation_rejected") {
    return false;
  }
  if (from === "quotation_sent") {
    return true;
  }
  // Deal closed from meeting stage without re-labeling enquiry — still close the lead.
  if (from === "meeting_scheduled") {
    return true;
  }
  // Quotation/project won but enquiry never advanced past "new" (common in fast-track demos).
  if (from === "new") {
    return true;
  }
  return false;
}

/** @deprecated Use {@link canConvertEnquiryOnPipelineWin}. */
export const canConvertEnquiryOnProjectWin = canConvertEnquiryOnPipelineWin;

/**
 * Shared enquiry→customer conversion used by CONVERT_ENQUIRY_COMMAND and project-create commands.
 * When `pipelineWin` is true, allows meeting_scheduled → converted in addition to the state machine.
 */
export function executeEnquiryConversion(
  repositories: AppRepositoryContext,
  auditService: AuditService,
  command: Command<unknown>,
  enquiryId: string,
  options?: { pipelineWin?: boolean; projectWin?: boolean },
): EnquiryConversionAtProjectWinResult {
  const enquiry = repositories.enquiryRepository.getById(enquiryId);
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
  const mayConvert = pipelineWin
    ? canConvertEnquiryOnPipelineWin(enquiry.status)
    : canTransitionEnquiryStatus(enquiry.status, "converted", command.actorRole);

  if (!mayConvert) {
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
    { pipelineWin: true },
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
    { pipelineWin: true },
  );

  if (!result.ok) {
    return result;
  }

  return result;
}
