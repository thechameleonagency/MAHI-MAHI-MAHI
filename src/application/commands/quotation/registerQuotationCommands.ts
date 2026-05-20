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
import { buildEnquiryQuotationLinkUpdate } from "@/lib/enquiryQuotationHistory";
import { assertCanLinkNewQuotationToEnquiry } from "@/lib/enquiryQuotationCreateGate";
import {
  buildCustomerFromQuotation,
  enrichCustomerFromQuotation,
  validateQuotationClientForApproval,
} from "@/lib/quotationApproveCustomer";
import { createNextCustomerId } from "@/lib/idFactory";

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

    let enquiryLink:
      | {
          enquiryId: string;
          enquiry: NonNullable<ReturnType<typeof repositories.enquiryRepository.getById>>;
          nextStatus: "quotation_sent";
        }
      | undefined;

    if (quotation.enquiryId) {
      const enquiry = repositories.enquiryRepository.getById(quotation.enquiryId);
      if (!enquiry) {
        return { ok: false, errorCode: "ENQUIRY_NOT_FOUND", message: `Enquiry ${quotation.enquiryId} not found` };
      }
      const gate = assertCanLinkNewQuotationToEnquiry(enquiry, command.actorRole);
      if (!gate.ok) {
        return {
          ok: false,
          errorCode: "ENQUIRY_TERMINAL_FOR_QUOTATION",
          message: gate.message,
        };
      }
      enquiryLink = { enquiryId: quotation.enquiryId, enquiry, nextStatus: gate.nextStatus };
    }

    repositories.quotationRepository.add(quotation);

    if (enquiryLink) {
      repositories.enquiryRepository.update(enquiryLink.enquiryId, {
        ...buildEnquiryQuotationLinkUpdate(enquiryLink.enquiry, quotation.id),
        status: enquiryLink.nextStatus,
        updatedAt: new Date().toISOString(),
      });
    }

    auditService.write(command, {
      action: "create",
      entityType: "Quotation",
      entityId: quotation.id,
      entityName: quotation.quotationNumber,
      newValue: quotation.status,
    });
    return {
      ok: true,
      result: { quotationId: quotation.id },
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
      }

      if (nextStatus === "converted_to_project") {
        if (!quotation.paymentType) {
          return {
            ok: false,
            errorCode: "QUOTATION_CONVERT_VALIDATION_FAILED",
            message: "Converting a quotation to a project requires a payment type",
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
    const existing = repositories.quotationRepository.getById(command.payload.quotationId);
    if (!existing) {
      return { ok: false, errorCode: "QUOTATION_NOT_FOUND", message: "Quotation not found" };
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
    auditService.write(command, {
      action: "update",
      entityType: "Quotation",
      entityId: applied.quotation.id,
      entityName: applied.quotation.quotationNumber,
      field: "patch",
      newValue: JSON.stringify(Object.keys(command.payload.updates)),
    });
    return {
      ok: true,
      result: { quotationId: applied.quotation.id },
      domainEvents: ["QuotationUpdated"],
    };
  });
};
