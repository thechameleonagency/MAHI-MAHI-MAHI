import { beforeEach, describe, expect, it } from "vitest";
import { CommandBus } from "@/application/commands/CommandBus";
import {
  CONVERT_ENQUIRY_COMMAND,
  CREATE_ENQUIRY_COMMAND,
  UPDATE_ENQUIRY_COMMAND,
  registerEnquiryCommands,
} from "@/application/commands/enquiry/registerEnquiryCommands";
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

const baseEnquiry = (overrides: Partial<Enquiry> = {}): Enquiry => ({
  id: "ENQ-TEST-001",
  customerName: "Test User",
  customerPhone: "9876543210",
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
  ...overrides,
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

  it("ConvertEnquiry creates customer, links enquiry, and rejects invalid status", async () => {
    const repositories = emptyRepos();
    const bus = new CommandBus();
    registerEnquiryCommands(
      bus,
      repositories,
      new PermissionService(),
      new AuditService({ auditRepository: repositories.auditRepository }),
    );

    const enquiry = baseEnquiry({ status: "quotation_sent" });
    repositories.enquiryRepository.add(enquiry);

    const converted = await bus.execute({
      type: CONVERT_ENQUIRY_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { enquiryId: "ENQ-TEST-001" },
    });
    expect(converted.ok).toBe(true);
    if (!converted.ok) return;

    expect(converted.result.customerId).toMatch(/^CUST-/);
    const storedEnquiry = repositories.enquiryRepository.getById("ENQ-TEST-001");
    expect(storedEnquiry?.status).toBe("converted");
    expect(storedEnquiry?.customerId).toBe(converted.result.customerId);
    expect(repositories.customerRepository.getById(converted.result.customerId)?.name).toBe(
      "Test User",
    );

    const duplicate = baseEnquiry({ id: "ENQ-TEST-002", status: "new" });
    repositories.enquiryRepository.add(duplicate);
    const blocked = await bus.execute({
      type: CONVERT_ENQUIRY_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { enquiryId: "ENQ-TEST-002" },
    });
    expect(blocked.ok).toBe(false);
  });

  it("UpdateEnquiry writes field-diff audit rows and rejects status in patch", async () => {
    const repositories = emptyRepos();
    const bus = new CommandBus();
    const teamMembers = [
      { id: "SAL-001", name: "Priya Nair", email: "p@mss.solar", role: "salesperson", status: "Active" },
    ];
    registerEnquiryCommands(
      bus,
      repositories,
      new PermissionService(),
      new AuditService({ auditRepository: repositories.auditRepository }),
      { getTeamMembers: () => teamMembers },
    );
    repositories.enquiryRepository.add(baseEnquiry({ assignedTo: "", priority: "low" }));

    const updated = await bus.execute({
      type: UPDATE_ENQUIRY_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: {
        enquiryId: "ENQ-TEST-001",
        patch: {
          assignedToMemberId: "SAL-001",
          assignedTo: "Priya Nair",
          priority: "high",
        },
      },
    });
    expect(updated.ok).toBe(true);
    const stored = repositories.enquiryRepository.getById("ENQ-TEST-001");
    expect(stored?.assignedToMemberId).toBe("SAL-001");
    expect(stored?.assignedTo).toBe("Priya Nair");
    expect(stored?.priority).toBe("high");
    const audits = repositories.auditRepository.getAll();
    expect(audits.some((a) => a.field === "assignedTo")).toBe(true);
    expect(audits.some((a) => a.field === "priority")).toBe(true);

    const blocked = await bus.execute({
      type: UPDATE_ENQUIRY_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { enquiryId: "ENQ-TEST-001", patch: { status: "lost" } },
    });
    expect(blocked.ok).toBe(false);
  });

  it("ConvertEnquiry reuses existing customer by phone instead of duplicating", async () => {
    const repositories = emptyRepos();
    const bus = new CommandBus();
    registerEnquiryCommands(
      bus,
      repositories,
      new PermissionService(),
      new AuditService({ auditRepository: repositories.auditRepository }),
    );

    repositories.customerRepository.add({
      id: "CUST-EXIST",
      name: "Existing",
      phone: "9876543210",
      email: "",
      address: "",
      type: "individual",
      itemsBought: [],
      totalPurchases: 0,
      createdAt: "2026-01-01",
    });
    repositories.enquiryRepository.add(baseEnquiry({ status: "quotation_sent" }));

    const result = await bus.execute({
      type: CONVERT_ENQUIRY_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { enquiryId: "ENQ-TEST-001" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.result.customerId).toBe("CUST-EXIST");
    expect(repositories.customerRepository.getAll()).toHaveLength(1);
  });
});
