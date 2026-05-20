import { beforeEach, describe, expect, it } from "vitest";
import { CommandBus } from "@/application/commands/CommandBus";
import {
  MATERIAL_MOVEMENT_AT_PROJECT_COMMAND,
  WAREHOUSE_INVENTORY_MOVEMENT_COMMAND,
  registerInventoryCommands,
} from "@/application/commands/inventory/registerInventoryCommands";
import { PermissionService } from "@/application/services/PermissionService";
import { AuditService } from "@/application/services/AuditService";
import { LocalStorageJsonRepository } from "@/infrastructure/repositories/localStorage/LocalStorageJsonRepository";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import type { AuditLogEntry, Customer, Invoice } from "@/types/finance";
import type { Enquiry, InventoryItem, Project, Quotation, Employee } from "@/types/project";
import { dummyInventoryItems } from "@/data/inventoryData";

const makeCtx = (project: Project, items: InventoryItem[]): AppRepositoryContext => ({
  projectRepository: new LocalStorageJsonRepository<Project>("mss.test.invcmd.projects", [project]),
  quotationRepository: new LocalStorageJsonRepository<Quotation>("mss.test.invcmd.quotations", []),
  enquiryRepository: new LocalStorageJsonRepository<Enquiry>("mss.test.invcmd.enquiries", []),
  customerRepository: new LocalStorageJsonRepository<Customer>("mss.test.invcmd.customers", []),
  invoiceRepository: new LocalStorageJsonRepository<Invoice>("mss.test.invcmd.invoices", []),
  employeeRepository: new LocalStorageJsonRepository<Employee>("mss.test.invcmd.employees", []),
  inventoryItemRepository: new LocalStorageJsonRepository<InventoryItem>("mss.test.invcmd.inventory", items),
  auditRepository: new LocalStorageJsonRepository<AuditLogEntry>("mss.test.invcmd.audit", []),
});

describe("Material movement at project", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("issues from warehouse to site and updates stock", async () => {
    const project: Project = {
      id: "P-MOV",
      name: "Test",
      type: "EPC",
      projectType: "Residential",
      projectCategory: "solar",
      ownerType: "solo",
      status: "Ongoing",
      progressStage: "new",
      client: "C",
      capacity: "5",
      location: "L",
      assignees: [],
      onSite: 0,
      contractAmount: 1,
      totalCost: 0,
      amountReceived: 0,
      photos: 0,
      startDate: "2026-01-01",
      endDate: null,
      createdAt: "2026-01-01",
      customerId: "C-1",
      lifecycleStatus: "In Progress",
      executionPhase: "execution",
    };
    const item1 = { ...dummyInventoryItems[0] };
    const beforeStock = item1.stock;
    const repositories = makeCtx(project, [item1]);
    const bus = new CommandBus();
    registerInventoryCommands(
      bus,
      repositories,
      new PermissionService(),
      new AuditService({ auditRepository: repositories.auditRepository }),
    );
    const result = await bus.execute({
      type: MATERIAL_MOVEMENT_AT_PROJECT_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: {
        projectId: "P-MOV",
        itemId: item1.id,
        movementType: "IssueToSite",
        quantity: 2,
      },
    });
    expect(result.ok).toBe(true);
    const after = repositories.inventoryItemRepository.getById(item1.id);
    expect(after?.stock).toBe(beforeStock - 2);
  });

  it("PurchaseIn increases warehouse stock only", async () => {
    const item1 = { ...dummyInventoryItems[0] };
    const beforeStock = item1.stock;
    const project: Project = {
      id: "P-IGNORE",
      name: "X",
      type: "EPC",
      projectType: "Residential",
      projectCategory: "solar",
      ownerType: "solo",
      status: "Ongoing",
      progressStage: "new",
      client: "C",
      capacity: "5",
      location: "L",
      assignees: [],
      onSite: 0,
      contractAmount: 1,
      totalCost: 0,
      amountReceived: 0,
      photos: 0,
      startDate: "2026-01-01",
      endDate: null,
      createdAt: "2026-01-01",
      customerId: "C-1",
      lifecycleStatus: "In Progress",
      executionPhase: "execution",
    };
    const repositories = makeCtx(project, [item1]);
    const bus = new CommandBus();
    registerInventoryCommands(
      bus,
      repositories,
      new PermissionService(),
      new AuditService({ auditRepository: repositories.auditRepository }),
    );
    const wh = await bus.execute({
      type: WAREHOUSE_INVENTORY_MOVEMENT_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: {
        itemId: item1.id,
        movementType: "PurchaseIn",
        quantity: 10,
      },
    });
    expect(wh.ok).toBe(true);
    expect(repositories.inventoryItemRepository.getById(item1.id)?.stock).toBe(beforeStock + 10);
  });
});
