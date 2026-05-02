import type { Command } from "@/application/commands/types";
import type { CommandBus } from "@/application/commands/CommandBus";
import type { PermissionService } from "@/application/services/PermissionService";
import type { AuditService } from "@/application/services/AuditService";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import { canTransitionQuotationStatus, type QuotationStatus } from "@/domain/stateMachines/quotationStateMachine";
import type { AppAction } from "@/domain/policies/permissionMatrix";
import type { Quotation } from "@/types/project";
import { applyQuotationPatch } from "@/domain/quotation/applyQuotationPatch";

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
    permissionService.assertCanPerformAction(command.actorRole, "quotation:create");
    const { quotation } = command.payload;
    if (repositories.quotationRepository.getById(quotation.id)) {
      return {
        ok: false,
        errorCode: "QUOTATION_ID_EXISTS",
        message: "A quotation with this id already exists",
      };
    }
    repositories.quotationRepository.add(quotation);
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
      const action: AppAction =
        command.payload.nextStatus === "confirmed" ? "quotation:confirm" : "quotation:create";
      permissionService.assertCanPerformAction(command.actorRole, action);
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

      if (nextStatus === "confirmed") {
        if (!quotation.paymentType) {
          return {
            ok: false,
            errorCode: "QUOTATION_CONFIRM_VALIDATION_FAILED",
            message: "Confirmed quotation requires payment type",
          };
        }
      }

      repositories.quotationRepository.update(quotation.id, {
        status: nextStatus,
        ...(nextStatus === "sent" ? { sentAt: new Date().toISOString().split("T")[0] } : {}),
        ...(nextStatus === "approved" ? { approvedAt: new Date().toISOString().split("T")[0] } : {}),
        ...(nextStatus === "confirmed" ? { confirmedAt: new Date().toISOString().split("T")[0] } : {}),
      });

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
    permissionService.assertCanPerformAction(command.actorRole, "quotation:create");
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
