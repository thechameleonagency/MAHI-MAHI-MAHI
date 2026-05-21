import type { Command } from "@/application/commands/types";
import type { CommandBus } from "@/application/commands/CommandBus";
import type { PermissionService } from "@/application/services/PermissionService";
import { assertCommandPermission } from "@/application/commands/commandPermission";
import type { AuditService } from "@/application/services/AuditService";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import { canTransitionQuotationStatus, type QuotationStatus } from "@/domain/stateMachines/quotationStateMachine";
import type { AppAction } from "@/domain/policies/permissionMatrix";
import type { Quotation } from "@/types/project";
import { applyQuotationPatch } from "@/domain/quotation/applyQuotationPatch";
import { propagateQuotationDeathToEnquiry } from "@/lib/enquiryQuotationPropagation";
import { validateQuotationSendOrApprove } from "@/domain/quotation/quotationCommercialAmount";
import { validateQuotationPaymentTypeForSend } from "@/domain/quotation/quotationPaymentType";
import { buildEnquiryQuotationLinkUpdate } from "@/lib/enquiryQuotationHistory";
import { assertCanLinkNewQuotationToEnquiry } from "@/lib/enquiryQuotationCreateGate";
import { validateQuotationCreateSource } from "@/lib/quotationCreateSource";
import {
  buildCustomerFromQuotation,
  enrichCustomerFromQuotation,
  validateQuotationClientForApproval,
} from "@/lib/quotationApproveCustomer";
import { createNextCustomerId } from "@/lib/idFactory";
import { linkEnquiryCustomerFromQuotation } from "@/lib/customerPipelineIdentity";
import { convertLinkedEnquiryAfterQuotationApproved } from "@/lib/enquiryConversionAtProjectWin";
import { rejectQuotationTerminalEdit } from "@/lib/quotationProjectConversionPolicy";

type TransitionQuotationPayload = {
  quotationId: string;
  nextStatus: QuotationStatus;
};

type CreateQuotationPayload = {
  quotation: Quotation;
};

type UpdateQuotationPayload = {
  quotationId: string;
  updates: Partial<Quotation>;
};

export const TRANSITION_QUOTATION_STATUS_COMMAND = "quotation.transition_status";
export const CREATE_QUOTATION_COMMAND = "quotation.create";
export const UPDATE_QUOTATION_COMMAND = "quotation.update_fields";

export const registerQuotationCommands = (
  commandBus: CommandBus,
  repositories: AppRepositoryContext,
  permissionService: PermissionService,
  auditService: AuditService,
): void => {
  commandBus.register<Command<CreateQuotationPayload>, { quotationId: string }>(CREATE_QUOTATION_COMMAND, (command) => {
    assertCommandPermission(permissionService, command, "quotation:create");
    const { quotation } = command.payload;
    if (repositories.quotationRepository.getById(quotation.id)) {
      return {
        ok: false,
        errorCode: "QUOTATION_ID_EXISTS",
        message: "A quotation with this id already exists",
      };
    }

    const sourceCheck = validateQuotationCreateSource(
      {
        enquiryId: quotation.enquiryId,
        withoutEnquiryReason: quotation.withoutEnquiryReason,
      },
      quotation.enquiryId
        ? repositories.enquiryRepository.getById(quotation.enquiryId) ?? null
        : null,
      command.actorRole,
    );
    if (!sourceCheck.ok) {
      return {
        ok: false,
        errorCode: "QUOTATION_CREATE_SOURCE_INVALID",
        message: sourceCheck.message,
      };
    }

    const quotationToPersist: Quotation =
      sourceCheck.mode === "enquiry"
        ? {
            ...quotation,
            enquiryId: sourceCheck.enquiryId,
            withoutEnquiryReason: undefined,
          }
        : {
            ...quotation,
            enquiryId: undefined,
            withoutEnquiryReason: sourceCheck.withoutEnquiryReason,
          };

    let enquiryLink:
      | {
          enquiryId: string;
          enquiry: NonNullable<ReturnType<typeof repositories.enquiryRepository.getById>>;
          nextStatus: "quotation_sent";
        }
      | undefined;

    if (quotationToPersist.enquiryId) {
      const enquiry = repositories.enquiryRepository.getById(quotationToPersist.enquiryId);
      if (!enquiry) {
        return {
          ok: false,
          errorCode: "ENQUIRY_NOT_FOUND",
          message: `Enquiry ${quotationToPersist.enquiryId} not found`,
        };
      }
      const gate = assertCanLinkNewQuotationToEnquiry(enquiry, command.actorRole);
      if (!gate.ok) {
        return {
          ok: false,
          errorCode: "ENQUIRY_TERMINAL_FOR_QUOTATION",
          message: gate.message,
        };
      }
      enquiryLink = {
        enquiryId: quotationToPersist.enquiryId,
        enquiry,
        nextStatus: gate.nextStatus,
      };
    }

    const quotationWithCustomerLink =
      enquiryLink?.enquiry.customerId && !quotationToPersist.customerId
        ? { ...quotationToPersist, customerId: enquiryLink.enquiry.customerId }
        : quotationToPersist;

    const salesOwnerMemberId =
      quotationWithCustomerLink.salesOwnerMemberId?.trim() ||
      enquiryLink?.enquiry.assignedToMemberId?.trim() ||
      command.actorUserId;

    repositories.quotationRepository.add({
      ...quotationWithCustomerLink,
      salesOwnerMemberId,
    });

    if (enquiryLink) {
      repositories.enquiryRepository.update(enquiryLink.enquiryId, {
        ...buildEnquiryQuotationLinkUpdate(enquiryLink.enquiry, quotationToPersist.id),
        status: enquiryLink.nextStatus,
        updatedAt: new Date().toISOString(),
      });
    }

    auditService.write(command, {
      action: "create",
      entityType: "Quotation",
      entityId: quotationToPersist.id,
      entityName: quotationToPersist.quotationNumber,
      newValue: quotationToPersist.status,
    });
    return {
      ok: true,
      result: { quotationId: quotationToPersist.id },
      domainEvents: ["QuotationCreated"],
    };
  });

  commandBus.register<Command<TransitionQuotationPayload>, { quotationId: string; nextStatus: QuotationStatus }>(
    TRANSITION_QUOTATION_STATUS_COMMAND,
    (command) => {
      const next = command.payload.nextStatus;
      const action: AppAction =
        next === "approved" || next === "converted_to_project"
          ? "quotation:confirm"
          : "quotation:create";
      assertCommandPermission(permissionService, command, action);
      const quotation = repositories.quotationRepository.getById(command.payload.quotationId);
      if (!quotation) {
        return {
          ok: false,
          errorCode: "QUOTATION_NOT_FOUND",
          message: "Quotation not found",
        };
      }

      const currentStatus = quotation.status as QuotationStatus;
      const nextStatus = command.payload.nextStatus;
      if (!canTransitionQuotationStatus(currentStatus, nextStatus)) {
        return {
          ok: false,
          errorCode: "INVALID_QUOTATION_TRANSITION",
          message: `Cannot move quotation from ${currentStatus} to ${nextStatus}`,
        };
      }

      if (nextStatus === "sent") {
        const hasLineItems = Boolean(quotation.presetSnapshot?.length || quotation.customItems?.length);
        if (!quotation.clientName || !hasLineItems) {
          return {
            ok: false,
            errorCode: "QUOTATION_SEND_VALIDATION_FAILED",
            message: "Sent quotation requires customer and at least one line item",
          };
        }
      }

      if (nextStatus === "sent" || nextStatus === "approved") {
        const amountCheck = validateQuotationSendOrApprove(quotation);
        if (!amountCheck.ok) {
          return {
            ok: false,
            errorCode: "QUOTATION_ZERO_AMOUNT",
            message: amountCheck.message,
          };
        }
        const paymentCheck = validateQuotationPaymentTypeForSend(quotation);
        if (!paymentCheck.ok) {
          return {
            ok: false,
            errorCode: "QUOTATION_PAYMENT_TYPE_REQUIRED",
            message: paymentCheck.message,
          };
        }
      }

      if (nextStatus === "converted_to_project") {
        const paymentCheck = validateQuotationPaymentTypeForSend(quotation);
        if (!paymentCheck.ok) {
          return {
            ok: false,
            errorCode: "QUOTATION_CONVERT_VALIDATION_FAILED",
            message: paymentCheck.message,
          };
        }
      }

      const today = new Date().toISOString().split("T")[0];

      if (nextStatus === "approved") {
        const clientCheck = validateQuotationClientForApproval(quotation);
        if (!clientCheck.ok) {
          return {
            ok: false,
            errorCode: "QUOTATION_APPROVE_VALIDATION_FAILED",
            message: clientCheck.message,
          };
        }

        let customerId = quotation.customerId;
        if (customerId) {
          const existing = repositories.customerRepository.getById(customerId);
          if (existing) {
            repositories.customerRepository.update(
              customerId,
              enrichCustomerFromQuotation(existing, quotation),
            );
          }
        } else {
          const existingIds = repositories.customerRepository.getAll().map((c) => c.id);
          customerId = createNextCustomerId(existingIds);
          const newCustomer = buildCustomerFromQuotation(quotation, customerId);
          repositories.customerRepository.add(newCustomer);
        }

        repositories.quotationRepository.update(quotation.id, {
          customerId,
          status: nextStatus,
          approvedAt: today,
        });

        const enquiryBeforeLink = quotation.enquiryId
          ? repositories.enquiryRepository.getById(quotation.enquiryId)
          : undefined;
        linkEnquiryCustomerFromQuotation(repositories, quotation.enquiryId, customerId);
        if (enquiryBeforeLink && quotation.enquiryId) {
          const enquiryAfterLink = repositories.enquiryRepository.getById(quotation.enquiryId);
          if (
            enquiryAfterLink &&
            enquiryBeforeLink.customerId !== enquiryAfterLink.customerId
          ) {
            auditService.writeFieldDiff(
              command,
              "Enquiry",
              enquiryAfterLink.id,
              enquiryAfterLink.customerName,
              enquiryBeforeLink as unknown as Record<string, unknown>,
              { customerId: enquiryAfterLink.customerId ?? "" },
            );
          }
        }

        const enquiryWin = convertLinkedEnquiryAfterQuotationApproved(
          repositories,
          auditService,
          command,
          { ...quotation, customerId },
        );
        if (!enquiryWin.ok) {
          return {
            ok: false,
            errorCode: enquiryWin.errorCode,
            message: enquiryWin.message,
          };
        }
      } else {
        repositories.quotationRepository.update(quotation.id, {
          status: nextStatus,
          ...(nextStatus === "sent" ? { sentAt: today } : {}),
          ...(nextStatus === "rejected" ? { rejectedAt: today } : {}),
          ...(nextStatus === "withdrawn" ? { withdrawnAt: today } : {}),
          ...(nextStatus === "converted_to_project" ? { convertedAt: today } : {}),
        });
      }

      if (nextStatus === "rejected" || nextStatus === "withdrawn") {
        propagateQuotationDeathToEnquiry(repositories, {
          ...quotation,
          status: nextStatus,
        });
      }

      auditService.write(command, {
        action: "update",
        entityType: "Quotation",
        entityId: quotation.id,
        entityName: quotation.quotationNumber,
        field: "status",
        oldValue: currentStatus,
        newValue: nextStatus,
      });

      return {
        ok: true,
        result: {
          quotationId: quotation.id,
          nextStatus,
        },
        domainEvents: ["QuotationStatusChanged"],
      };
    },
  );

  commandBus.register<Command<UpdateQuotationPayload>, { quotationId: string }>(UPDATE_QUOTATION_COMMAND, (command) => {
    assertCommandPermission(permissionService, command, "quotation:create");
    if (command.payload.updates.status !== undefined) {
      return {
        ok: false,
        errorCode: "QUOTATION_STATUS_USE_TRANSITION",
        message: "Use quotation.transition_status to change quotation status (enquiry pipeline sync)",
      };
    }
    const existing = repositories.quotationRepository.getById(command.payload.quotationId);
    if (!existing) {
      return { ok: false, errorCode: "QUOTATION_NOT_FOUND", message: "Quotation not found" };
    }
    const terminalReject = rejectQuotationTerminalEdit(existing, command.payload.updates);
    if (!terminalReject.ok) {
      return {
        ok: false,
        errorCode: terminalReject.code,
        message: terminalReject.message,
      };
    }
    const applied = applyQuotationPatch(existing, command.payload.updates);
    if (!applied.ok) {
      return {
        ok: false,
        errorCode: (applied as any).code,
        message: (applied as any).message,
      };
    }
    repositories.quotationRepository.update(applied.quotation.id, applied.quotation);

    const linkedCustomerId = applied.quotation.customerId;
    if (
      linkedCustomerId &&
      (applied.quotation.status === "approved" || applied.quotation.status === "converted_to_project")
    ) {
      const customer = repositories.customerRepository.getById(linkedCustomerId);
      if (customer) {
        repositories.customerRepository.update(
          linkedCustomerId,
          enrichCustomerFromQuotation(customer, applied.quotation),
        );
      }
    }

    auditService.writeFieldDiff(
      command,
      "Quotation",
      applied.quotation.id,
      applied.quotation.quotationNumber,
      existing as unknown as Record<string, unknown>,
      command.payload.updates as unknown as Record<string, unknown>,
    );
    return {
      ok: true,
      result: { quotationId: applied.quotation.id },
      domainEvents: ["QuotationUpdated"],
    };
  });
};
