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
import {
  QUOTATION_PAYMENT_TYPE_REQUIRED_MESSAGE,
  validateQuotationPaymentTypeForSend,
} from "@/domain/quotation/quotationPaymentType";

const createRepositories = (quotationSeed: Quotation[]): AppRepositoryContext => ({
  projectRepository: new LocalStorageJsonRepository<Project>("mss.test.paytype.projects", []),
  quotationRepository: new LocalStorageJsonRepository<Quotation>("mss.test.paytype.quotations", quotationSeed),
  enquiryRepository: new LocalStorageJsonRepository<Enquiry>("mss.test.paytype.enquiries", []),
  customerRepository: new LocalStorageJsonRepository<any>("mss.test.paytype.customers", []),
  invoiceRepository: new LocalStorageJsonRepository<any>("mss.test.paytype.invoices", []),
  employeeRepository: new LocalStorageJsonRepository<any>("mss.test.paytype.employees", []),
  inventoryItemRepository: new LocalStorageJsonRepository<InventoryItem>("mss.test.paytype.inventory", []),
  auditRepository: new LocalStorageJsonRepository<AuditLogEntry>("mss.test.paytype.audit", []),
});

const baseQuotation = (overrides: Partial<Quotation> = {}): Quotation =>
  ({
    id: "Q1",
    quotationNumber: "Q-001",
    status: "draft",
    quotationType: "solar",
    clientName: "A",
    clientPhone: "1",
    clientEmail: "a@a.com",
    clientCity: "Jaipur",
    clientState: "Rajasthan",
    totalAmount: 1000,
    isConverted: false,
    createdAt: "2026-01-01",
    presetSnapshot: [{ id: 1, name: "Panel", quantity: 1, unit: "pcs", rate: 1000 }],
    ...overrides,
  }) as Quotation;

describe("quotationPaymentType", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("validateQuotationPaymentTypeForSend rejects missing and invalid values", () => {
    expect(validateQuotationPaymentTypeForSend({})).toEqual({
      ok: false,
      message: QUOTATION_PAYMENT_TYPE_REQUIRED_MESSAGE,
    });
    expect(validateQuotationPaymentTypeForSend({ paymentType: "" as "cash" })).toEqual({
      ok: false,
      message: QUOTATION_PAYMENT_TYPE_REQUIRED_MESSAGE,
    });
    expect(validateQuotationPaymentTypeForSend({ paymentType: "cash" })).toEqual({ ok: true });
  });

  it("blocks draft -> sent when payment type is missing", async () => {
    const repositories = createRepositories([baseQuotation({ paymentType: undefined })]);
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
      payload: { quotationId: "Q1", nextStatus: "sent" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("QUOTATION_PAYMENT_TYPE_REQUIRED");
      expect(result.message).toBe(QUOTATION_PAYMENT_TYPE_REQUIRED_MESSAGE);
    }
  });

  it("allows draft -> sent when payment type is set", async () => {
    const repositories = createRepositories([baseQuotation({ paymentType: "loan" })]);
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
      payload: { quotationId: "Q1", nextStatus: "sent" },
    });

    expect(result.ok).toBe(true);
  });
});
