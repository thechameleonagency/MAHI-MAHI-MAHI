import { beforeEach, describe, expect, it } from "vitest";
import { CommandBus } from "@/application/commands/CommandBus";
import {
  UPDATE_ENQUIRY_STATUS_COMMAND,
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
  hasEnquirySentQuotationPipeline,
  pickQuotationToSendOnEnquiryMark,
} from "@/lib/enquirySendQuotation";

const emptyRepos = (enquiry: Enquiry, quotation: Quotation): AppRepositoryContext => ({
  projectRepository: new LocalStorageJsonRepository<Project>("mss.test.esq.projects", []),
  quotationRepository: new LocalStorageJsonRepository<Quotation>("mss.test.esq.quotations", [quotation]),
  enquiryRepository: new LocalStorageJsonRepository<Enquiry>("mss.test.esq.enquiries", [enquiry]),
  customerRepository: new LocalStorageJsonRepository<Customer>("mss.test.esq.customers", []),
  invoiceRepository: new LocalStorageJsonRepository<Invoice>("mss.test.esq.invoices", []),
  employeeRepository: new LocalStorageJsonRepository<Employee>("mss.test.esq.employees", []),
  inventoryItemRepository: new LocalStorageJsonRepository<InventoryItem>("mss.test.esq.inventory", []),
  auditRepository: new LocalStorageJsonRepository<AuditLogEntry>("mss.test.esq.audit", []),
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

const draftQuotation = (): Quotation => ({
  id: "Q-1",
  quotationNumber: "Q-001",
  status: "draft",
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

describe("enquirySendQuotation helpers", () => {
  it("picks current draft quotation to send", () => {
    const enquiry = baseEnquiry("new");
    const quotation = draftQuotation();
    expect(pickQuotationToSendOnEnquiryMark(enquiry, [quotation])?.id).toBe("Q-1");
    expect(hasEnquirySentQuotationPipeline(enquiry, [quotation])).toBe(false);
  });

  it("skips send when quotation is already sent", () => {
    const enquiry = baseEnquiry("meeting_scheduled");
    const quotation = { ...draftQuotation(), status: "sent" as const };
    expect(pickQuotationToSendOnEnquiryMark(enquiry, [quotation])).toBeUndefined();
    expect(hasEnquirySentQuotationPipeline(enquiry, [quotation])).toBe(true);
  });
});

describe("UPDATE_ENQUIRY_STATUS quotation_sent cascade", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("marks linked draft quotation as sent when enquiry moves to quotation_sent", async () => {
    const enquiry = baseEnquiry("meeting_scheduled");
    const repositories = emptyRepos(enquiry, draftQuotation());
    const bus = new CommandBus();
    const audit = new AuditService({ auditRepository: repositories.auditRepository });
    registerQuotationCommands(bus, repositories, new PermissionService(), audit);
    registerEnquiryCommands(bus, repositories, new PermissionService(), audit);

    const result = await bus.execute({
      type: UPDATE_ENQUIRY_STATUS_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { enquiryId: "ENQ-1", nextStatus: "quotation_sent" },
    });

    expect(result.ok).toBe(true);
    expect(repositories.enquiryRepository.getById("ENQ-1")?.status).toBe("quotation_sent");
    expect(repositories.quotationRepository.getById("Q-1")?.status).toBe("sent");
  });

  it("rejects enquiry send when draft quotation fails send validation", async () => {
    const enquiry = baseEnquiry("new");
    const invalidQuote = { ...draftQuotation(), presetSnapshot: [], totalAmount: 0 };
    const repositories = emptyRepos(enquiry, invalidQuote);
    const bus = new CommandBus();
    const audit = new AuditService({ auditRepository: repositories.auditRepository });
    registerQuotationCommands(bus, repositories, new PermissionService(), audit);
    registerEnquiryCommands(bus, repositories, new PermissionService(), audit);

    const result = await bus.execute({
      type: UPDATE_ENQUIRY_STATUS_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { enquiryId: "ENQ-1", nextStatus: "quotation_sent" },
    });

    expect(result.ok).toBe(false);
    expect(repositories.enquiryRepository.getById("ENQ-1")?.status).toBe("new");
    expect(repositories.quotationRepository.getById("Q-1")?.status).toBe("draft");
  });
});
