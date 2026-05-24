import { beforeEach, describe, expect, it } from "vitest";
import { CommandBus } from "@/application/commands/CommandBus";
import {
  CONVERT_ENQUIRY_COMMAND,
  registerEnquiryCommands,
} from "@/application/commands/enquiry/registerEnquiryCommands";
import {
  TRANSITION_QUOTATION_STATUS_COMMAND,
  registerQuotationCommands,
} from "@/application/commands/quotation/registerQuotationCommands";
import { PermissionService } from "@/application/services/PermissionService";
import { AuditService } from "@/application/services/AuditService";
import { LocalStorageJsonRepository } from "@/infrastructure/repositories/localStorage/LocalStorageJsonRepository";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import type { AuditLogEntry, Customer, Invoice } from "@/types/finance";
import type { Enquiry, InventoryItem, Project, Quotation, Employee } from "@/types/project";
import {
  advanceEnquiryToQuotationSentBeforeConvert,
  isOpenEnquiryAwaitingPipelineWinClosure,
} from "@/lib/enquiryConversionAtProjectWin";

const emptyRepos = (enquiry: Enquiry, quotation: Quotation): AppRepositoryContext => ({
  projectRepository: new LocalStorageJsonRepository<Project>("mss.test.ecl.projects", []),
  quotationRepository: new LocalStorageJsonRepository<Quotation>("mss.test.ecl.quotations", [quotation]),
  enquiryRepository: new LocalStorageJsonRepository<Enquiry>("mss.test.ecl.enquiries", [enquiry]),
  customerRepository: new LocalStorageJsonRepository<Customer>("mss.test.ecl.customers", []),
  invoiceRepository: new LocalStorageJsonRepository<Invoice>("mss.test.ecl.invoices", []),
  employeeRepository: new LocalStorageJsonRepository<Employee>("mss.test.ecl.employees", []),
  inventoryItemRepository: new LocalStorageJsonRepository<InventoryItem>("mss.test.ecl.inventory", []),
  auditRepository: new LocalStorageJsonRepository<AuditLogEntry>("mss.test.ecl.audit", []),
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
  paymentType: "cash",
  totalAmount: 100000,
  isConverted: false,
  enquiryId: "ENQ-1",
  createdAt: "2026-01-01",
  presetSnapshot: [{ id: "line-1", name: "Panel", quantity: 1, unitPrice: 100000 }],
});

describe("enquiry conversion lifecycle", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("isOpenEnquiryAwaitingPipelineWinClosure covers open pipeline stages only", () => {
    expect(isOpenEnquiryAwaitingPipelineWinClosure("new")).toBe(true);
    expect(isOpenEnquiryAwaitingPipelineWinClosure("meeting_scheduled")).toBe(true);
    expect(isOpenEnquiryAwaitingPipelineWinClosure("quotation_sent")).toBe(true);
    expect(isOpenEnquiryAwaitingPipelineWinClosure("converted")).toBe(false);
    expect(isOpenEnquiryAwaitingPipelineWinClosure("lost")).toBe(false);
  });

  it("advanceEnquiryToQuotationSentBeforeConvert moves meeting_scheduled to quotation_sent", () => {
    const enquiry = baseEnquiry("meeting_scheduled");
    const repositories = emptyRepos(enquiry, sentQuotation());
    const audit = new AuditService({ auditRepository: repositories.auditRepository });
    const command = { type: "test", actorUserId: "admin", actorRole: "admin" as const, payload: {} };

    const result = advanceEnquiryToQuotationSentBeforeConvert(
      repositories,
      audit,
      command,
      enquiry.id,
      sentQuotation(),
    );

    expect(result.ok).toBe(true);
    expect(repositories.enquiryRepository.getById("ENQ-1")?.status).toBe("quotation_sent");
  });

  it("quotation approve advances meeting_scheduled enquiry through quotation_sent to converted", async () => {
    const enquiry = baseEnquiry("meeting_scheduled");
    const quotation = { ...sentQuotation(), customerId: undefined };
    const repositories = emptyRepos(enquiry, quotation);
    const bus = new CommandBus();
    const audit = new AuditService({ auditRepository: repositories.auditRepository });
    registerQuotationCommands(bus, repositories, new PermissionService(), audit);
    registerEnquiryCommands(bus, repositories, new PermissionService(), audit);

    const result = await bus.execute({
      type: TRANSITION_QUOTATION_STATUS_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { quotationId: "Q-1", nextStatus: "approved" },
    });

    expect(result.ok).toBe(true);
    expect(repositories.enquiryRepository.getById("ENQ-1")?.status).toBe("converted");
    const statusAudit = repositories.auditRepository
      .getAll()
      .filter((row) => row.entityType === "Enquiry" && row.field === "status");
    expect(statusAudit.some((row) => row.newValue === "quotation_sent")).toBe(true);
    expect(statusAudit.some((row) => row.newValue === "converted")).toBe(true);
  });

  it("manual convert still requires quotation_sent", async () => {
    const enquiry = baseEnquiry("meeting_scheduled");
    const repositories = emptyRepos(enquiry, sentQuotation());
    const bus = new CommandBus();
    registerEnquiryCommands(
      bus,
      repositories,
      new PermissionService(),
      new AuditService({ auditRepository: repositories.auditRepository }),
    );

    const result = await bus.execute({
      type: CONVERT_ENQUIRY_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { enquiryId: "ENQ-1" },
    });

    expect(result.ok).toBe(false);
    expect(repositories.enquiryRepository.getById("ENQ-1")?.status).toBe("meeting_scheduled");
  });
});
