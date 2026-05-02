import type { CommandBus } from "@/application/commands/CommandBus";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import { canTransitionEnquiryStatus, type EnquiryStatus } from "@/domain/stateMachines/enquiryStateMachine";
import type { PermissionService } from "@/application/services/PermissionService";
import type { AuditService } from "@/application/services/AuditService";
import type { Command } from "@/application/commands/types";
import type { Enquiry } from "@/types/project";
import type { Customer } from "@/types/finance";

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

export const UPDATE_ENQUIRY_STATUS_COMMAND = "enquiry.update_status";
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
      permissionService.assertCanPerformAction(command.actorRole, "enquiry:create");
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

  commandBus.register<Command<UpdateEnquiryStatusPayload>, { enquiryId: string; nextStatus: EnquiryStatus }>(
    UPDATE_ENQUIRY_STATUS_COMMAND,
    (command) => {
      permissionService.assertCanPerformAction(command.actorRole, "enquiry:create");

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

  commandBus.register<Command<ConvertEnquiryPayload>, { customerId: string }>(
    CONVERT_ENQUIRY_COMMAND,
    (command) => {
      permissionService.assertCanPerformAction(command.actorRole, "enquiry:create");
      const { enquiryId } = command.payload;
      const enquiry = repositories.enquiryRepository.getById(enquiryId);
      if (!enquiry) {
        return { ok: false, errorCode: "ENQUIRY_NOT_FOUND", message: "Enquiry not found" };
      }

      // 1. Create Customer
      const year = new Date().getFullYear();
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const customerId = `CUST-${year}-${randomSuffix}`;
      
      const newCustomer: Customer = {
        id: customerId,
        name: enquiry.customerName,
        phone: enquiry.customerPhone,
        email: enquiry.customerEmail || "",
        address: enquiry.customerAddress || "",
        type: enquiry.customerType || "individual",
        itemsBought: [],
        totalPurchases: 0,
        createdAt: new Date().toISOString(),
      };
      repositories.customerRepository.add(newCustomer);

      // 2. Update Enquiry Status
      repositories.enquiryRepository.update(enquiryId, {
        status: "converted",
        updatedAt: new Date().toISOString(),
      });

      auditService.write(command, {
        action: "update",
        entityType: "Enquiry",
        entityId: enquiryId,
        entityName: enquiry.customerName,
        field: "status",
        newValue: "converted",
      });

      return {
        ok: true,
        result: { customerId },
        domainEvents: ["EnquiryConverted", "CustomerCreated"],
      };
    }
  );
};
