import { beforeEach, describe, expect, it } from "vitest";
import { CommandBus } from "@/application/commands/CommandBus";
import {
  CREATE_QUOTATION_COMMAND,
  TRANSITION_QUOTATION_STATUS_COMMAND,
  UPDATE_QUOTATION_COMMAND,
  registerQuotationCommands,
} from "@/application/commands/quotation/registerQuotationCommands";
import { PermissionService } from "@/application/services/PermissionService";
import { AuditService } from "@/application/services/AuditService";
import { LocalStorageJsonRepository } from "@/infrastructure/repositories/localStorage/LocalStorageJsonRepository";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import type { AuditLogEntry, Customer, Invoice } from "@/types/finance";
import type { Enquiry, InventoryItem, Project, Quotation, Employee } from "@/types/project";

const emptyRepos = (enquiry: Enquiry, quotation: Quotation): AppRepositoryContext => ({
  projectRepository: new LocalStorageJsonRepository<Project>("mss.test.qep.projects", []),
  quotationRepository: new LocalStorageJsonRepository<Quotation>("mss.test.qep.quotations", [quotation]),
  enquiryRepository: new LocalStorageJsonRepository<Enquiry>("mss.test.qep.enquiries", [enquiry]),
  customerRepository: new LocalStorageJsonRepository<Customer>("mss.test.qep.customers", []),
  invoiceRepository: new LocalStorageJsonRepository<Invoice>("mss.test.qep.invoices", []),
  employeeRepository: new LocalStorageJsonRepository<Employee>("mss.test.qep.employees", []),
  inventoryItemRepository: new LocalStorageJsonRepository<InventoryItem>("mss.test.qep.inventory", []),
  auditRepository: new LocalStorageJsonRepository<AuditLogEntry>("mss.test.qep.audit", []),
});

const baseEnquiry = (status: Enquiry["status"]): Enquiry => ({
  id: "ENQ-1",
  customerName: "Test Customer",
  customerPhone: "9999999999",
  customerEmail: "t@test.com",
  customerAddress: "Jaipur",
  customerType: "individual",
  source: "phone",
  systemCapacity: "5kW",
  estimatedBudget: 100000,
  requirements: "Solar",
  status,
  priority: "medium",
  assignedTo: "",
  quotationId: "Q-1",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  notes: [],
});

const sentQuotation = (): Quotation => ({
  id: "Q-1",
  quotationNumber: "Q-001",
  status: "sent",
  quotationType: "solar",
  clientName: "Test Customer",
  clientPhone: "9999999999",
  clientEmail: "t@test.com",
  clientCity: "Jaipur",
  clientState: "Rajasthan",
  customerId: "C001",
  paymentType: "cash",
  totalAmount: 100000,
  isConverted: false,
  enquiryId: "ENQ-1",
  createdAt: "2026-01-01",
  presetSnapshot: [{ id: "line-1", name: "Panel", quantity: 1, unitPrice: 100000 }],
});

describe("Quotation approve → enquiry converted (FC2 / MD1)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("marks linked enquiry converted when quotation is approved", async () => {
    const enquiry = baseEnquiry("quotation_sent");
    const quotation = {
      ...sentQuotation(),
      status: "sent" as const,
      customerId: undefined,
    };
    const repositories = emptyRepos(enquiry, quotation);
    const bus = new CommandBus();
    registerQuotationCommands(
      bus,
      repositories,
      new PermissionService(),
      new AuditService({ auditRepository: repositories.auditRepository }),
    );

    const result = await bus.execute({
      type: TRANSITION_QUOTATION_STATUS_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { quotationId: "Q-1", nextStatus: "approved" },
    });

    expect(result.ok).toBe(true);
    const updated = repositories.enquiryRepository.getById("ENQ-1");
    expect(updated?.status).toBe("converted");
    expect(updated?.customerId).toBeTruthy();
    expect(repositories.quotationRepository.getById("Q-1")?.status).toBe("approved");
  });

  it("converts meeting_scheduled enquiry when quotation is approved", async () => {
    const enquiry = baseEnquiry("meeting_scheduled");
    const quotation = {
      ...sentQuotation(),
      status: "sent" as const,
      customerId: undefined,
    };
    const repositories = emptyRepos(enquiry, quotation);
    const bus = new CommandBus();
    registerQuotationCommands(
      bus,
      repositories,
      new PermissionService(),
      new AuditService({ auditRepository: repositories.auditRepository }),
    );

    const result = await bus.execute({
      type: TRANSITION_QUOTATION_STATUS_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { quotationId: "Q-1", nextStatus: "approved" },
    });

    expect(result.ok).toBe(true);
    expect(repositories.enquiryRepository.getById("ENQ-1")?.status).toBe("converted");
  });

  it("rejects status change via update_fields so enquiry conversion cannot be skipped", async () => {
    const enquiry = baseEnquiry("quotation_sent");
    const quotation = { ...sentQuotation(), status: "sent" as const };
    const repositories = emptyRepos(enquiry, quotation);
    const bus = new CommandBus();
    registerQuotationCommands(
      bus,
      repositories,
      new PermissionService(),
      new AuditService({ auditRepository: repositories.auditRepository }),
    );

    const result = await bus.execute({
      type: UPDATE_QUOTATION_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { quotationId: "Q-1", updates: { status: "approved" } },
    });

    expect(result.ok).toBe(false);
    expect((result as { errorCode?: string }).errorCode).toBe("QUOTATION_STATUS_USE_TRANSITION");
    expect(repositories.enquiryRepository.getById("ENQ-1")?.status).toBe("quotation_sent");
  });

  it("does not convert enquiry when already lost", async () => {
    const repositories = emptyRepos(baseEnquiry("lost"), sentQuotation());
    const bus = new CommandBus();
    registerQuotationCommands(
      bus,
      repositories,
      new PermissionService(),
      new AuditService({ auditRepository: repositories.auditRepository }),
    );

    const result = await bus.execute({
      type: TRANSITION_QUOTATION_STATUS_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { quotationId: "Q-1", nextStatus: "approved" },
    });

    expect(result.ok).toBe(true);
    expect(repositories.enquiryRepository.getById("ENQ-1")?.status).toBe("lost");
  });
});

describe("Quotation reject/withdraw → enquiry propagation (C2)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("marks linked enquiry quotation_rejected when quotation is rejected", async () => {
    const repositories = emptyRepos(baseEnquiry("quotation_sent"), sentQuotation());
    const bus = new CommandBus();
    registerQuotationCommands(
      bus,
      repositories,
      new PermissionService(),
      new AuditService({ auditRepository: repositories.auditRepository }),
    );

    const result = await bus.execute({
      type: TRANSITION_QUOTATION_STATUS_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { quotationId: "Q-1", nextStatus: "rejected" },
    });

    expect(result.ok).toBe(true);
    expect(repositories.enquiryRepository.getById("ENQ-1")?.status).toBe("quotation_rejected");
    expect(repositories.quotationRepository.getById("Q-1")?.status).toBe("rejected");
  });

  it("marks linked enquiry quotation_rejected when quotation is withdrawn", async () => {
    const repositories = emptyRepos(baseEnquiry("quotation_sent"), sentQuotation());
    const bus = new CommandBus();
    registerQuotationCommands(
      bus,
      repositories,
      new PermissionService(),
      new AuditService({ auditRepository: repositories.auditRepository }),
    );

    const result = await bus.execute({
      type: TRANSITION_QUOTATION_STATUS_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { quotationId: "Q-1", nextStatus: "withdrawn" },
    });

    expect(result.ok).toBe(true);
    expect(repositories.enquiryRepository.getById("ENQ-1")?.status).toBe("quotation_rejected");
    expect(repositories.quotationRepository.getById("Q-1")?.withdrawnAt).toBeTruthy();
  });

  it("does not change enquiry when already lost or converted", async () => {
    const lostRepos = emptyRepos(baseEnquiry("lost"), sentQuotation());
    const bus = new CommandBus();
    registerQuotationCommands(
      bus,
      lostRepos,
      new PermissionService(),
      new AuditService({ auditRepository: lostRepos.auditRepository }),
    );

    await bus.execute({
      type: TRANSITION_QUOTATION_STATUS_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { quotationId: "Q-1", nextStatus: "rejected" },
    });

    expect(lostRepos.enquiryRepository.getById("ENQ-1")?.status).toBe("lost");
  });

  it("create quotation on quotation_rejected enquiry moves back to quotation_sent", async () => {
    const enquiry = baseEnquiry("quotation_rejected");
    const repositories = emptyRepos(enquiry, {
      ...sentQuotation(),
      status: "rejected",
    });
    const bus = new CommandBus();
    registerQuotationCommands(
      bus,
      repositories,
      new PermissionService(),
      new AuditService({ auditRepository: repositories.auditRepository }),
    );

    const newQuote: Quotation = {
      ...sentQuotation(),
      id: "Q-2",
      quotationNumber: "Q-002",
      status: "draft",
    };

    const result = await bus.execute({
      type: CREATE_QUOTATION_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { quotation: newQuote },
    });

    expect(result.ok).toBe(true);
    expect(repositories.enquiryRepository.getById("ENQ-1")?.status).toBe("quotation_sent");
    const updated = repositories.enquiryRepository.getById("ENQ-1");
    expect(updated?.quotationId).toBe("Q-2");
    expect(updated?.quotationIds).toEqual(["Q-1", "Q-2"]);
  });
});
