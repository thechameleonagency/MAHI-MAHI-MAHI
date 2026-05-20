import { beforeEach, describe, expect, it } from "vitest";
import { CommandBus } from "@/application/commands/CommandBus";
import {
  registerQuotationCommands,
  TRANSITION_QUOTATION_STATUS_COMMAND,
} from "@/application/commands/quotation/registerQuotationCommands";
import { PermissionService } from "@/application/services/PermissionService";
import { AuditService } from "@/application/services/AuditService";
import { LocalStorageJsonRepository } from "@/infrastructure/repositories/localStorage/LocalStorageJsonRepository";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import type { AuditLogEntry } from "@/types/finance";
import type { Enquiry, InventoryItem, Project, Quotation } from "@/types/project";

const createRepositories = (quotationSeed: Quotation[]): AppRepositoryContext => {
  const projectsRepository = new LocalStorageJsonRepository<Project>("mss.test.phase2.projects", []);
  const quotationsRepository = new LocalStorageJsonRepository<Quotation>("mss.test.phase2.quotations", quotationSeed);
  const enquiryRepository = new LocalStorageJsonRepository<Enquiry>("mss.test.phase2.enquiries", []);
  const customerRepository = new LocalStorageJsonRepository<any>("mss.test.phase2.customers", []);
  const invoiceRepository = new LocalStorageJsonRepository<any>("mss.test.phase2.invoices", []);
  const employeeRepository = new LocalStorageJsonRepository<any>("mss.test.phase2.employees", []);
  const inventoryItemRepository = new LocalStorageJsonRepository<InventoryItem>("mss.test.phase2.inventory", []);
  const auditRepository = new LocalStorageJsonRepository<AuditLogEntry>("mss.test.phase2.audit", []);

  return {
    projectRepository: projectsRepository,
    quotationRepository: quotationsRepository,
    enquiryRepository,
    customerRepository,
    invoiceRepository,
    employeeRepository,
    inventoryItemRepository,
    auditRepository,
  };
};

describe("Quotation lifecycle command", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("allows draft -> sent when customer and lines exist", async () => {
    const repositories = createRepositories([
      {
        id: "Q1",
        quotationNumber: "Q-001",
        status: "draft",
        quotationType: "solar",
        clientName: "A",
        clientPhone: "1",
        clientEmail: "a@a.com",
        clientCity: "Jaipur",
        clientState: "Rajasthan",
        paymentType: "cash",
        totalAmount: 1000,
        isConverted: false,
        createdAt: "2026-01-01",
        presetSnapshot: [{ id: 1, name: "Panel", quantity: 1, unit: "pcs", rate: 1000 }],
      },
    ] as Quotation[]);

    const commandBus = new CommandBus();
    registerQuotationCommands(commandBus, repositories, new PermissionService(), new AuditService({ auditRepository: repositories.auditRepository }));

    const result = await commandBus.execute({
      type: TRANSITION_QUOTATION_STATUS_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { quotationId: "Q1", nextStatus: "sent" },
    });

    expect(result.ok).toBe(true);
  });

  it("blocks draft -> sent when total amount is zero", async () => {
    const repositories = createRepositories([
      {
        id: "Q0",
        quotationNumber: "Q-000",
        status: "draft",
        quotationType: "solar",
        clientName: "Zero Co",
        clientPhone: "1",
        clientEmail: "z@a.com",
        clientCity: "Jaipur",
        clientState: "Rajasthan",
        paymentType: "cash",
        totalAmount: 0,
        isConverted: false,
        createdAt: "2026-01-01",
        presetSnapshot: [{ id: 1, name: "Panel", quantity: 1, unit: "pcs", rate: 0 }],
      },
    ] as Quotation[]);

    const commandBus = new CommandBus();
    registerQuotationCommands(
      commandBus,
      repositories,
      new PermissionService(),
      new AuditService({ auditRepository: repositories.auditRepository }),
    );

    const result = await commandBus.execute({
      type: TRANSITION_QUOTATION_STATUS_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { quotationId: "Q0", nextStatus: "sent" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("QUOTATION_ZERO_AMOUNT");
    }
  });

  it("blocks sent -> approved when total amount is zero", async () => {
    const repositories = createRepositories([
      {
        id: "Q0S",
        quotationNumber: "Q-001S",
        status: "sent",
        quotationType: "solar",
        clientName: "Zero Co",
        clientPhone: "1",
        clientEmail: "z@a.com",
        clientCity: "Jaipur",
        clientState: "Rajasthan",
        paymentType: "cash",
        totalAmount: 0,
        isConverted: false,
        createdAt: "2026-01-01",
        presetSnapshot: [{ id: 1, name: "Panel", quantity: 1, unit: "pcs", rate: 0 }],
      },
    ] as Quotation[]);

    const commandBus = new CommandBus();
    registerQuotationCommands(
      commandBus,
      repositories,
      new PermissionService(),
      new AuditService({ auditRepository: repositories.auditRepository }),
    );

    const result = await commandBus.execute({
      type: TRANSITION_QUOTATION_STATUS_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { quotationId: "Q0S", nextStatus: "approved" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("QUOTATION_ZERO_AMOUNT");
    }
  });

  it("blocks direct draft -> converted_to_project transition", async () => {
    const repositories = createRepositories([
      {
        id: "Q2",
        quotationNumber: "Q-002",
        status: "draft",
        quotationType: "solar",
        clientName: "B",
        clientPhone: "2",
        clientEmail: "b@b.com",
        clientCity: "Jaipur",
        clientState: "Rajasthan",
        paymentType: "cash",
        totalAmount: 1000,
        isConverted: false,
        createdAt: "2026-01-01",
      },
    ] as Quotation[]);

    const commandBus = new CommandBus();
    registerQuotationCommands(commandBus, repositories, new PermissionService(), new AuditService({ auditRepository: repositories.auditRepository }));

    const result = await commandBus.execute({
      type: TRANSITION_QUOTATION_STATUS_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { quotationId: "Q2", nextStatus: "converted_to_project" },
    });

    expect(result.ok).toBe(false);
  });
});
