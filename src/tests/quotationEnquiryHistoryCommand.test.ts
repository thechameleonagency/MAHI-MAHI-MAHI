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

const emptyRepos = (enquiry: Enquiry, priorQuote?: Quotation): AppRepositoryContext => ({
  projectRepository: new LocalStorageJsonRepository<Project>("mss.test.qhist.projects", []),
  quotationRepository: new LocalStorageJsonRepository<Quotation>(
    "mss.test.qhist.quotations",
    priorQuote ? [priorQuote] : [],
  ),
  enquiryRepository: new LocalStorageJsonRepository<Enquiry>("mss.test.qhist.enquiries", [enquiry]),
  customerRepository: new LocalStorageJsonRepository<Customer>("mss.test.qhist.customers", []),
  invoiceRepository: new LocalStorageJsonRepository<Invoice>("mss.test.qhist.invoices", []),
  employeeRepository: new LocalStorageJsonRepository<Employee>("mss.test.qhist.employees", []),
  inventoryItemRepository: new LocalStorageJsonRepository<InventoryItem>("mss.test.qhist.inventory", []),
  auditRepository: new LocalStorageJsonRepository<AuditLogEntry>("mss.test.qhist.audit", []),
});

describe("CREATE_QUOTATION enquiry quotation history", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("appends quotationIds instead of overwriting prior quote", async () => {
    const enquiry: Enquiry = {
      id: "ENQ-1",
      customerName: "Test",
      customerPhone: "1",
      customerEmail: "a@a.com",
      customerAddress: "Jaipur",
      customerType: "individual",
      source: "phone",
      systemCapacity: "5",
      estimatedBudget: 100000,
      requirements: "",
      status: "quotation_rejected",
      priority: "medium",
      assignedTo: "",
      quotationId: "Q-1",
      quotationIds: ["Q-1"],
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
      notes: [],
    };
    const prior: Quotation = {
      id: "Q-1",
      quotationNumber: "Q-001",
      status: "rejected",
      quotationType: "solar",
      clientName: "Test",
      clientPhone: "1",
      clientEmail: "a@a.com",
      clientCity: "Jaipur",
      clientState: "Rajasthan",
      paymentType: "cash",
      totalAmount: 500000,
      enquiryId: "ENQ-1",
      createdAt: "2026-05-01",
    };
    const repositories = emptyRepos(enquiry, prior);
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
      payload: {
        quotation: {
          ...prior,
          id: "Q-2",
          quotationNumber: "Q-002",
          status: "draft",
          totalAmount: 450000,
          createdAt: "2026-05-07",
        },
      },
    });

    expect(result.ok).toBe(true);
    const updated = repositories.enquiryRepository.getById("ENQ-1");
    expect(updated?.quotationIds).toEqual(["Q-1", "Q-2"]);
    expect(updated?.quotationId).toBe("Q-2");
  });
});
