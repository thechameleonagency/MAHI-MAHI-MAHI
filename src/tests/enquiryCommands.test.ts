import { beforeEach, describe, expect, it } from "vitest";
import { CommandBus } from "@/application/commands/CommandBus";
import { CREATE_ENQUIRY_COMMAND, registerEnquiryCommands } from "@/application/commands/enquiry/registerEnquiryCommands";
import { PermissionService } from "@/application/services/PermissionService";
import { AuditService } from "@/application/services/AuditService";
import { LocalStorageJsonRepository } from "@/infrastructure/repositories/localStorage/LocalStorageJsonRepository";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import type { AuditLogEntry, Customer, Invoice } from "@/types/finance";
import type { Enquiry, InventoryItem, Project, Quotation, Employee } from "@/types/project";

const emptyRepos = (): AppRepositoryContext => ({
  projectRepository: new LocalStorageJsonRepository<Project>("mss.test.enquiry.projects", []),
  quotationRepository: new LocalStorageJsonRepository<Quotation>("mss.test.enquiry.quotations", []),
  enquiryRepository: new LocalStorageJsonRepository<Enquiry>("mss.test.enquiry.enquiries", []),
  customerRepository: new LocalStorageJsonRepository<Customer>("mss.test.enquiry.customers", []),
  invoiceRepository: new LocalStorageJsonRepository<Invoice>("mss.test.enquiry.invoices", []),
  employeeRepository: new LocalStorageJsonRepository<Employee>("mss.test.enquiry.employees", []),
  inventoryItemRepository: new LocalStorageJsonRepository<InventoryItem>("mss.test.enquiry.inventory", []),
  auditRepository: new LocalStorageJsonRepository<AuditLogEntry>("mss.test.enquiry.audit", []),
});

const baseEnquiry = (): Enquiry => ({
  id: "ENQ-TEST-001",
  customerName: "Test User",
  customerPhone: "999",
  customerEmail: "t@x.com",
  customerAddress: "Addr",
  customerType: "individual",
  source: "phone",
  systemCapacity: "5kW",
  estimatedBudget: 0,
  requirements: "—",
  status: "new",
  priority: "medium",
  assignedTo: "",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  notes: [],
});

describe("Enquiry commands", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("CreateEnquiry adds entity, audit, and rejects duplicate id", async () => {
    const repositories = emptyRepos();
    const bus = new CommandBus();
    registerEnquiryCommands(
      bus,
      repositories,
      new PermissionService(),
      new AuditService({ auditRepository: repositories.auditRepository }),
    );
    const enquiry = baseEnquiry();

    const r1 = await bus.execute({
      type: CREATE_ENQUIRY_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { enquiry },
    });
    expect(r1.ok).toBe(true);
    expect(repositories.enquiryRepository.getById("ENQ-TEST-001")).toBeDefined();
    expect(repositories.auditRepository.getAll().length).toBeGreaterThan(0);

    const r2 = await bus.execute({
      type: CREATE_ENQUIRY_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { enquiry },
    });
    expect(r2.ok).toBe(false);
  });
});
