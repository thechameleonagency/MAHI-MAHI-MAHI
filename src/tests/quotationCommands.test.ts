import { beforeEach, describe, expect, it } from "vitest";
import { CommandBus } from "@/application/commands/CommandBus";
import {
  CREATE_QUOTATION_COMMAND,
  UPDATE_QUOTATION_COMMAND,
  registerQuotationCommands,
} from "@/application/commands/quotation/registerQuotationCommands";
import { PermissionService } from "@/application/services/PermissionService";
import { AuditService } from "@/application/services/AuditService";
import { LocalStorageJsonRepository } from "@/infrastructure/repositories/localStorage/LocalStorageJsonRepository";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import type { AuditLogEntry, Customer, Invoice } from "@/types/finance";
import type { Enquiry, InventoryItem, Project, Quotation, Employee } from "@/types/project";

const emptyRepos = (): AppRepositoryContext => ({
  projectRepository: new LocalStorageJsonRepository<Project>("mss.test.quotecmd.projects", []),
  quotationRepository: new LocalStorageJsonRepository<Quotation>("mss.test.quotecmd.quotations", []),
  enquiryRepository: new LocalStorageJsonRepository<Enquiry>("mss.test.quotecmd.enquiries", []),
  customerRepository: new LocalStorageJsonRepository<Customer>("mss.test.quotecmd.customers", []),
  invoiceRepository: new LocalStorageJsonRepository<Invoice>("mss.test.quotecmd.invoices", []),
  employeeRepository: new LocalStorageJsonRepository<Employee>("mss.test.quotecmd.employees", []),
  inventoryItemRepository: new LocalStorageJsonRepository<InventoryItem>("mss.test.quotecmd.inventory", []),
  auditRepository: new LocalStorageJsonRepository<AuditLogEntry>("mss.test.quotecmd.audit", []),
});

const draftQuotation = (id: string): Quotation => ({
  id,
  quotationNumber: "Q-NEW",
  status: "draft",
  quotationType: "solar",
  clientName: "A",
  clientPhone: "1",
  clientEmail: "a@a.com",
  clientCity: "Jaipur",
  clientState: "Rajasthan",
  customerId: "C001",
  paymentType: "cash",
  totalAmount: 1000,
  isConverted: false,
  createdAt: "2026-01-01",
});

describe("CreateQuotation command", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("adds quotation and rejects duplicate id", async () => {
    const repositories = emptyRepos();
    const bus = new CommandBus();
    registerQuotationCommands(
      bus,
      repositories,
      new PermissionService(),
      new AuditService({ auditRepository: repositories.auditRepository }),
    );
    const q = draftQuotation("Q-X1");
    const r1 = await bus.execute({
      type: CREATE_QUOTATION_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { quotation: q },
    });
    expect(r1.ok).toBe(true);
    const r2 = await bus.execute({
      type: CREATE_QUOTATION_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { quotation: q },
    });
    expect(r2.ok).toBe(false);
  });
});

describe("UpdateQuotation command (field patch)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("updates draft quotation fields", async () => {
    const repositories = emptyRepos();
    const bus = new CommandBus();
    registerQuotationCommands(
      bus,
      repositories,
      new PermissionService(),
      new AuditService({ auditRepository: repositories.auditRepository }),
    );
    const q = draftQuotation("Q-PATCH");
    await bus.execute({
      type: CREATE_QUOTATION_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { quotation: q },
    });
    const r = await bus.execute({
      type: UPDATE_QUOTATION_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { quotationId: "Q-PATCH", updates: { notes: "Updated note" } },
    });
    expect(r.ok).toBe(true);
    const stored = repositories.quotationRepository.getById("Q-PATCH");
    expect(stored?.notes).toBe("Updated note");
  });

  it("rejects locked commercial fields when approved", async () => {
    const repositories = emptyRepos();
    const bus = new CommandBus();
    registerQuotationCommands(
      bus,
      repositories,
      new PermissionService(),
      new AuditService({ auditRepository: repositories.auditRepository }),
    );
    const q: Quotation = {
      ...draftQuotation("Q-LOCK"),
      status: "approved",
    };
    repositories.quotationRepository.add(q);
    const r = await bus.execute({
      type: UPDATE_QUOTATION_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: { quotationId: "Q-LOCK", updates: { clientName: "Changed" } },
    });
    expect(r.ok).toBe(false);
    expect((r as any).errorCode).toBe("LOCKED_FIELD");
  });
});
