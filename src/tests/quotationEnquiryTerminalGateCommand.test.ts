import { beforeEach, describe, expect, it } from "vitest";
import { CommandBus } from "@/application/commands/CommandBus";
import {
  CREATE_QUOTATION_COMMAND,
  registerQuotationCommands,
} from "@/application/commands/quotation/registerQuotationCommands";
import { PermissionService } from "@/application/services/PermissionService";
import { AuditService } from "@/application/services/AuditService";
import { LocalStorageJsonRepository } from "@/infrastructure/repositories/localStorage/LocalStorageJsonRepository";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import type { AuditLogEntry, Customer, Invoice } from "@/types/finance";
import type { Enquiry, InventoryItem, Project, Quotation, Employee } from "@/types/project";

const repos = (enquiry: Enquiry): AppRepositoryContext => ({
  projectRepository: new LocalStorageJsonRepository<Project>("mss.test.term.projects", []),
  quotationRepository: new LocalStorageJsonRepository<Quotation>("mss.test.term.quotations", []),
  enquiryRepository: new LocalStorageJsonRepository<Enquiry>("mss.test.term.enquiries", [enquiry]),
  customerRepository: new LocalStorageJsonRepository<Customer>("mss.test.term.customers", []),
  invoiceRepository: new LocalStorageJsonRepository<Invoice>("mss.test.term.invoices", []),
  employeeRepository: new LocalStorageJsonRepository<Employee>("mss.test.term.employees", []),
  inventoryItemRepository: new LocalStorageJsonRepository<InventoryItem>("mss.test.term.inventory", []),
  auditRepository: new LocalStorageJsonRepository<AuditLogEntry>("mss.test.term.audit", []),
});

const quotePayload = (enquiryId: string, id: string): Quotation =>
  ({
    id,
    quotationNumber: id,
    status: "draft",
    quotationType: "solar",
    clientName: "Test",
    clientPhone: "1",
    clientEmail: "a@a.com",
    clientCity: "Jaipur",
    clientState: "Rajasthan",
    paymentType: "cash",
    totalAmount: 100000,
    enquiryId,
    createdAt: "2026-05-10",
  }) as Quotation;

describe("CREATE_QUOTATION terminal enquiry gate", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("rejects create linked to lost enquiry without adding quotation", async () => {
    const enquiry: Enquiry = {
      id: "ENQ-L",
      customerName: "Test",
      customerPhone: "1",
      customerEmail: "a@a.com",
      customerAddress: "X",
      customerType: "individual",
      source: "phone",
      systemCapacity: "5",
      estimatedBudget: 100000,
      requirements: "",
      status: "lost",
      priority: "medium",
      assignedTo: "",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
      notes: [],
    };
    const repositories = repos(enquiry);
    const bus = new CommandBus();
    registerQuotationCommands(
      bus,
      repositories,
      new PermissionService(),
      new AuditService({ auditRepository: repositories.auditRepository }),
    );

    const result = await bus.execute({
      type: CREATE_QUOTATION_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { quotation: quotePayload("ENQ-L", "Q-LOST") },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("ENQUIRY_TERMINAL_FOR_QUOTATION");
    }
    expect(repositories.quotationRepository.getAll()).toHaveLength(0);
    expect(repositories.enquiryRepository.getById("ENQ-L")?.status).toBe("lost");
  });

  it("rejects create linked to converted enquiry", async () => {
    const enquiry: Enquiry = {
      id: "ENQ-C",
      customerName: "Test",
      customerPhone: "1",
      customerEmail: "a@a.com",
      customerAddress: "X",
      customerType: "individual",
      source: "phone",
      systemCapacity: "5",
      estimatedBudget: 100000,
      requirements: "",
      status: "converted",
      priority: "medium",
      assignedTo: "",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
      notes: [],
    };
    const repositories = repos(enquiry);
    const bus = new CommandBus();
    registerQuotationCommands(
      bus,
      repositories,
      new PermissionService(),
      new AuditService({ auditRepository: repositories.auditRepository }),
    );

    const result = await bus.execute({
      type: CREATE_QUOTATION_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { quotation: quotePayload("ENQ-C", "Q-CONV") },
    });

    expect(result.ok).toBe(false);
    expect(repositories.enquiryRepository.getById("ENQ-C")?.status).toBe("converted");
    expect(repositories.quotationRepository.getAll()).toHaveLength(0);
  });
});
