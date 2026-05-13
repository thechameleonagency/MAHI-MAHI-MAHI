import type { CommandBus } from "@/application/commands/CommandBus";
import type { Command } from "@/application/commands/types";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import type { PermissionService } from "@/application/services/PermissionService";
import type { AuditService } from "@/application/services/AuditService";
import { InventoryMovementService, type MovementType } from "@/application/services/InventoryMovementService";
import type { Project } from "@/types/project";

export type WarehouseOnlyMovementType = "PurchaseIn" | "ScrapWarehouse";

export type WarehouseInventoryMovementPayload = {
  itemId: number;
  movementType: WarehouseOnlyMovementType;
  quantity: number;
};

export const WAREHOUSE_INVENTORY_MOVEMENT_COMMAND = "inventory.warehouse_movement";

export type MaterialMovementAtProjectPayload = {
  projectId: string;
  itemId: number;
  movementType: MovementType;
  quantity: number;
  allowNegativeSiteBalanceOverride?: boolean;
  /** When set, ties issue to `ExecutionLineItem.id` and increments `issuedQty`. */
  baselineLineId?: string;
  /** Idempotency: duplicate key within project is ignored (no-op success). */
  clientRequestId?: string;
};

export const MATERIAL_MOVEMENT_AT_PROJECT_COMMAND = "inventory.material_movement_at_project";

export const registerInventoryCommands = (
  commandBus: CommandBus,
  repositories: AppRepositoryContext,
  permissionService: PermissionService,
  auditService: AuditService,
): void => {
  const inventoryMovementService = new InventoryMovementService();

  const emptySiteLedger = {
    openingQty: 0,
    issuedQty: 0,
    returnedQty: 0,
    scrapAtSiteQty: 0,
    consumedQty: 0,
  };

  commandBus.register<Command<WarehouseInventoryMovementPayload>, { itemId: number }>(
    WAREHOUSE_INVENTORY_MOVEMENT_COMMAND,
    (command) => {
      permissionService.assertCanPerformAction(command.actorRole, "inventory:material_movement");
      const { itemId, movementType, quantity } = command.payload;
      if (quantity <= 0) {
        return { ok: false, errorCode: "INVALID_QTY", message: "Quantity must be greater than zero" };
      }
      const inventoryItem = repositories.inventoryItemRepository.getById(itemId);
      if (!inventoryItem) {
        return { ok: false, errorCode: "INVENTORY_NOT_FOUND", message: "Inventory item not found" };
      }
      const movementResult = inventoryMovementService.applyMovement(
        { warehouseQty: inventoryItem.stock, siteLedger: { ...emptySiteLedger, materialId: itemId } },
        movementType as MovementType,
        quantity,
      );
      if (!movementResult.ok || !movementResult.nextState) {
        return {
          ok: false,
          errorCode: "MOVEMENT_INVALID",
          message: movementResult.error || "Unable to apply warehouse movement",
        };
      }
      const nextStock = movementResult.nextState.warehouseQty;
      repositories.inventoryItemRepository.update(itemId, { ...inventoryItem, stock: nextStock });
      auditService.write(command, {
        action: "update",
        entityType: "InventoryItem",
        entityId: String(itemId),
        entityName: inventoryItem.name,
        field: "stock",
        newValue: `${movementType} qty ${quantity} => ${nextStock}`,
      });
      return {
        ok: true,
        result: { itemId },
        domainEvents: ["WarehouseInventoryMovement"],
      };
    },
  );

  commandBus.register<Command<MaterialMovementAtProjectPayload>, { projectId: string; itemId: number }>(
    MATERIAL_MOVEMENT_AT_PROJECT_COMMAND,
    (command) => {
      permissionService.assertCanPerformAction(command.actorRole, "inventory:material_movement");
      const { projectId, itemId, movementType, quantity, allowNegativeSiteBalanceOverride, baselineLineId } =
        command.payload;

      const project = repositories.projectRepository.getById(projectId) as Project | undefined;
      if (!project) {
        return { ok: false, errorCode: "PROJECT_NOT_FOUND", message: "Project not found" };
      }

      const dedupeKey = command.payload.clientRequestId?.trim();
      if (dedupeKey) {
        const seen = project.materialMovementDedupeIds ?? [];
        if (seen.includes(dedupeKey)) {
          return {
            ok: true,
            result: { projectId, itemId },
            domainEvents: [],
          };
        }
      }

      const inventoryItem = repositories.inventoryItemRepository.getById(itemId);
      if (!inventoryItem) {
        return { ok: false, errorCode: "INVENTORY_NOT_FOUND", message: "Inventory item not found" };
      }

      const existingLedger = project.siteMaterialLedger?.find((ledgerItem) => ledgerItem.itemId === itemId);
      const ledger = existingLedger || {
        itemId,
        openingQty: 0,
        issuedQty: 0,
        returnedQty: 0,
        scrapAtSiteQty: 0,
        consumedQty: 0,
        updatedAt: new Date().toISOString(),
      };

      const movementResult = inventoryMovementService.applyMovement(
        {
          warehouseQty: inventoryItem.stock,
          siteLedger: {
            materialId: itemId,
            openingQty: ledger.openingQty,
            issuedQty: ledger.issuedQty,
            returnedQty: ledger.returnedQty,
            scrapAtSiteQty: ledger.scrapAtSiteQty,
            consumedQty: ledger.consumedQty,
          },
        },
        movementType,
        quantity,
        { allowNegativeSiteBalanceOverride },
      );

      if (!movementResult.ok || !movementResult.nextState) {
        return {
          ok: false,
          errorCode: "MOVEMENT_INVALID",
          message: movementResult.error || "Unable to apply inventory movement",
        };
      }

      const nextLedgerEntry = {
        ...ledger,
        ...movementResult.nextState.siteLedger,
        updatedAt: new Date().toISOString(),
        ...(baselineLineId ? { baselineLineId } : {}),
      };

      const nextItemStock = movementResult.nextState.warehouseQty;
      const materialsSent = [...(project.materialsSent || [])];
      const materialIndex = materialsSent.findIndex((entry) => entry.itemId === itemId);

      if (movementType === "IssueToProject" || movementType === "IssueToSite") {
        if (materialIndex >= 0) {
          materialsSent[materialIndex] = {
            ...materialsSent[materialIndex],
            quantity: materialsSent[materialIndex].quantity + quantity,
            dateIssued: new Date().toISOString().split("T")[0],
          };
        } else {
          materialsSent.push({
            itemId,
            itemName: inventoryItem.name,
            quantity,
            dateIssued: new Date().toISOString().split("T")[0],
            unitPrice: inventoryItem.buyPrice,
          });
        }
      }
      if (
        movementType === "ReturnToWarehouse" ||
        movementType === "ScrapSite" ||
        movementType === "ConsumptionAtSite"
      ) {
        if (materialIndex >= 0) {
          materialsSent[materialIndex] = {
            ...materialsSent[materialIndex],
            quantity: Math.max(0, materialsSent[materialIndex].quantity - quantity),
          };
        }
      }

      const existingLedgers = project.siteMaterialLedger || [];
      const ledgerIndex = existingLedgers.findIndex((entry) => entry.itemId === itemId);
      const nextLedgers = [...existingLedgers];
      if (ledgerIndex >= 0) {
        nextLedgers[ledgerIndex] = nextLedgerEntry;
      } else {
        nextLedgers.push(nextLedgerEntry);
      }

      let execLines = project.executionLineItems ? [...project.executionLineItems] : [];
      if (
        baselineLineId &&
        (movementType === "IssueToProject" || movementType === "IssueToSite")
      ) {
        execLines = execLines.map((line) =>
          line.id === baselineLineId ? { ...line, issuedQty: line.issuedQty + quantity } : line,
        );
      }
      if (
        baselineLineId &&
        (movementType === "ReturnToWarehouse" ||
          movementType === "ScrapSite" ||
          movementType === "ConsumptionAtSite")
      ) {
        execLines = execLines.map((line) =>
          line.id === baselineLineId ? { ...line, issuedQty: Math.max(0, line.issuedQty - quantity) } : line,
        );
      }

      const updatedProject: Project = {
        ...project,
        materialsSent: materialsSent.filter((entry) => entry.quantity > 0),
        siteMaterialLedger: nextLedgers,
        executionLineItems: execLines.length ? execLines : project.executionLineItems,
        materialMovementDedupeIds: dedupeKey
          ? [...(project.materialMovementDedupeIds ?? []), dedupeKey].slice(-200)
          : project.materialMovementDedupeIds,
      };

      repositories.projectRepository.update(projectId, updatedProject);
      repositories.inventoryItemRepository.update(itemId, { ...inventoryItem, stock: nextItemStock });

      auditService.write(command, {
        action: "update",
        entityType: "ProjectMaterial",
        entityId: projectId,
        entityName: project.name,
        field: "inventoryMovement",
        newValue: `${movementType} item ${itemId} qty ${quantity}`,
      });

      return {
        ok: true,
        result: { projectId, itemId },
        domainEvents: ["MaterialMovementAtProject"],
      };
    },
  );
};
