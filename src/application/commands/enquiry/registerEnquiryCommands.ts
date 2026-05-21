import type { CommandBus } from "@/application/commands/CommandBus";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import { canTransitionEnquiryStatus, type EnquiryStatus } from "@/domain/stateMachines/enquiryStateMachine";
import { getEnquiryQuotationIds } from "@/lib/enquiryQuotationHistory";
import type { PermissionService } from "@/application/services/PermissionService";
import { assertCommandPermission } from "@/application/commands/commandPermission";
import type { AuditService } from "@/application/services/AuditService";
import type { Command } from "@/application/commands/types";
import type { Enquiry } from "@/types/project";
import { executeEnquiryConversion } from "@/lib/enquiryConversionAtProjectWin";
import { sanitizeEnquiryPatch } from "@/lib/enquiryPatchPolicy";

type UpdateEnquiryStatusPayload = {
  enquiryId: string;
  nextStatus: EnquiryStatus;
  reason?: string;
};

type CreateEnquiryPayload = {
  enquiry: Enquiry;
};

export type ConvertEnquiryPayload = {
  enquiryId: string;
};

export type UpdateEnquiryPayload = {
  enquiryId: string;
  patch: Partial<Enquiry>;
};

export const UPDATE_ENQUIRY_STATUS_COMMAND = "enquiry.update_status";
export const UPDATE_ENQUIRY_COMMAND = "enquiry.update";
export const CREATE_ENQUIRY_COMMAND = "enquiry.create";
export const CONVERT_ENQUIRY_COMMAND = "enquiry.convert";

export const registerEnquiryCommands = (
  commandBus: CommandBus,
  repositories: AppRepositoryContext,
  permissionService: PermissionService,
  auditService: AuditService,
): void => {
  commandBus.register<Command<CreateEnquiryPayload>, { enquiryId: string }>(
    CREATE_ENQUIRY_COMMAND,
    (command) => {
      assertCommandPermission(permissionService, command, "enquiry:create");
      const { enquiry } = command.payload;
      if (repositories.enquiryRepository.getById(enquiry.id)) {
        return {
          ok: false,
          errorCode: "ENQUIRY_ID_EXISTS",
          message: "An enquiry with this id already exists",
        };
      }
      repositories.enquiryRepository.add(enquiry);
      auditService.write(command, {
        action: "create",
        entityType: "Enquiry",
        entityId: enquiry.id,
        entityName: enquiry.customerName,
        newValue: enquiry.status,
      });
      return {
        ok: true,
        result: { enquiryId: enquiry.id },
        domainEvents: ["EnquiryCreated"],
      };
    },
  );

  commandBus.register<Command<UpdateEnquiryPayload>, { enquiryId: string }>(
    UPDATE_ENQUIRY_COMMAND,
    (command) => {
      assertCommandPermission(permissionService, command, "enquiry:create");

      const sanitized = sanitizeEnquiryPatch(command.payload.patch);
      if (!sanitized.ok) {
        return {
          ok: false,
          errorCode: "ENQUIRY_PATCH_FORBIDDEN",
          message: sanitized.message,
        };
      }

      const enquiry = repositories.enquiryRepository.getById(command.payload.enquiryId);
      if (!enquiry) {
        return {
          ok: false,
          errorCode: "ENQUIRY_NOT_FOUND",
          message: "Enquiry not found",
        };
      }

      const patch = {
        ...sanitized.patch,
        updatedAt: sanitized.patch.updatedAt ?? new Date().toISOString(),
      };

      repositories.enquiryRepository.update(enquiry.id, patch);

      auditService.writeFieldDiff(
        command,
        "Enquiry",
        enquiry.id,
        enquiry.customerName,
        enquiry as unknown as Record<string, unknown>,
        patch as unknown as Record<string, unknown>,
      );

      return {
        ok: true,
        result: { enquiryId: enquiry.id },
        domainEvents: ["EnquiryUpdated"],
      };
    },
  );

  commandBus.register<Command<UpdateEnquiryStatusPayload>, { enquiryId: string; nextStatus: EnquiryStatus }>(
    UPDATE_ENQUIRY_STATUS_COMMAND,
    (command) => {
      assertCommandPermission(permissionService, command, "enquiry:create");

      const enquiry = repositories.enquiryRepository.getById(command.payload.enquiryId);
      if (!enquiry) {
        return {
          ok: false,
          errorCode: "ENQUIRY_NOT_FOUND",
          message: "Enquiry not found",
        };
      }

      if (!canTransitionEnquiryStatus(enquiry.status, command.payload.nextStatus, command.actorRole, command.payload.reason)) {
        return {
          ok: false,
          errorCode: "INVALID_ENQUIRY_TRANSITION",
          message: `Cannot move enquiry from ${enquiry.status} to ${command.payload.nextStatus}`,
        };
      }

      if (command.payload.nextStatus === "quotation_sent") {
        const hasLinked =
          getEnquiryQuotationIds(enquiry).some((id) => repositories.quotationRepository.getById(id)) ||
          repositories.quotationRepository.getAll().some((q) => q.enquiryId === enquiry.id);
        if (!hasLinked) {
          return {
            ok: false,
            errorCode: "ENQUIRY_MISSING_QUOTATION",
            message: "Create and link a quotation before marking enquiry as Quotation Sent",
          };
        }
      }

      repositories.enquiryRepository.update(enquiry.id, {
        status: command.payload.nextStatus,
        updatedAt: new Date().toISOString(),
      });

      auditService.write(command, {
        action: "update",
        entityType: "Enquiry",
        entityId: enquiry.id,
        entityName: enquiry.customerName,
        field: "status",
        oldValue: enquiry.status,
        newValue: command.payload.nextStatus,
      });

      return {
        ok: true,
        result: {
          enquiryId: enquiry.id,
          nextStatus: command.payload.nextStatus,
        },
        domainEvents: ["EnquiryStatusUpdated"],
      };
    },
  );

  commandBus.register<Command<ConvertEnquiryPayload>, { enquiryId: string; customerId: string }>(
    CONVERT_ENQUIRY_COMMAND,
    (command) => {
      assertCommandPermission(permissionService, command, "enquiry:create");
      const { enquiryId } = command.payload;
      const result = executeEnquiryConversion(repositories, auditService, command, enquiryId);
      if (!result.ok) {
        return {
          ok: false,
          errorCode: result.errorCode,
          message: result.message,
        };
      }
      if (!result.converted && result.previousStatus !== "converted") {
        return {
          ok: false,
          errorCode: "INVALID_ENQUIRY_TRANSITION",
          message: "Enquiry could not be converted",
        };
      }
      const customerId =
        result.customerId ??
        repositories.enquiryRepository.getById(enquiryId)?.customerId ??
        "";
      return {
        ok: true,
        result: { enquiryId, customerId },
        domainEvents: ["EnquiryConverted"],
      };
    },
  );
};
