import { beforeEach, describe, expect, it } from "vitest";
import {
  buildCustomerFromQuotation,
  buildPaymentTermsSummary,
  buildQuotationApprovalCustomerPreview,
  enrichCustomerFromQuotation,
  formatQuotationClientAddress,
  validateQuotationClientForApproval,
} from "@/lib/quotationApproveCustomer";
import type { Customer } from "@/types/finance";
import type { Quotation } from "@/types/project";
import { CommandBus } from "@/application/commands/CommandBus";
import { PermissionService } from "@/application/services/PermissionService";
import { AuditService } from "@/application/services/AuditService";
import {
  registerQuotationCommands,
  TRANSITION_QUOTATION_STATUS_COMMAND,
} from "@/application/commands/quotation/registerQuotationCommands";
import { LocalStorageJsonRepository } from "@/infrastructure/repositories/localStorage/LocalStorageJsonRepository";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import type { AuditLogEntry } from "@/types/finance";
import type { Enquiry, InventoryItem, Project } from "@/types/project";

const createRepositories = (quotationSeed: Quotation[]): AppRepositoryContext => {
  const projectsRepository = new LocalStorageJsonRepository<Project>("mss.test.m13.projects", []);
  const quotationsRepository = new LocalStorageJsonRepository<Quotation>(
    "mss.test.m13.quotations",
    quotationSeed,
  );
  const enquiryRepository = new LocalStorageJsonRepository<Enquiry>("mss.test.m13.enquiries", []);
  const customerRepository = new LocalStorageJsonRepository<Customer>("mss.test.m13.customers", []);
  const invoiceRepository = new LocalStorageJsonRepository<any>("mss.test.m13.invoices", []);
  const employeeRepository = new LocalStorageJsonRepository<any>("mss.test.m13.employees", []);
  const inventoryItemRepository = new LocalStorageJsonRepository<InventoryItem>("mss.test.m13.inventory", []);
  const auditRepository = new LocalStorageJsonRepository<AuditLogEntry>("mss.test.m13.audit", []);

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

const richQuotation = {
  id: "Q-APPROVE",
  quotationNumber: "Q-900",
  status: "sent" as const,
  quotationType: "solar" as const,
  clientName: "Solar Client Pvt Ltd",
  clientPhone: "9876543210",
  clientEmail: "billing@solar.com",
  clientAddress: "12 MG Road",
  clientCity: "Jaipur",
  clientState: "Rajasthan",
  clientPincode: "302001",
  clientGstin: "08AABCU9603R1ZM",
  clientPan: "AABCU9603R",
  clientType: "company" as const,
  paymentTermsSummary: "Booking 20% · Design approval 30%",
  paymentType: "cash" as const,
  totalAmount: 250000,
  isConverted: false,
  createdAt: "2026-01-01",
  presetSnapshot: [{ id: 1, name: "Panel", quantity: 1, unit: "pcs", rate: 250000 }],
};

describe("quotationApproveCustomer", () => {
  it("formats composite client address", () => {
    expect(formatQuotationClientAddress(richQuotation)).toBe(
      "12 MG Road, Jaipur, Rajasthan, PIN 302001",
    );
  });

  it("preview describes new customer on approve when no link", () => {
    const result = buildQuotationApprovalCustomerPreview(richQuotation, {
      existingCustomer: undefined,
      existingCustomerIds: ["C018"],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.preview.mode).toBe("create");
      expect(result.preview.customerId).toBe("CUST-0019");
      expect(result.preview.displayName).toBe("Solar Client Pvt Ltd");
    }
  });

  it("preview describes link + enrichments for existing customer", () => {
    const thin: Customer = {
      id: "C010",
      name: "Legacy",
      phone: "9000000010",
      email: "",
      address: "",
      type: "individual",
      itemsBought: [],
      totalPurchases: 0,
      createdAt: "2026-01-01",
    };
    const result = buildQuotationApprovalCustomerPreview(
      { ...richQuotation, customerId: "C010" },
      { existingCustomer: thin, existingCustomerIds: ["C010"] },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.preview.mode).toBe("link_existing");
      expect(result.preview.enrichments.length).toBeGreaterThan(0);
      expect(result.preview.gstin).toBe("08AABCU9603R1ZM");
    }
  });

  it("preview rejects missing linked customer", () => {
    const result = buildQuotationApprovalCustomerPreview(
      { ...richQuotation, customerId: "C-MISSING" },
      { existingCustomer: undefined, existingCustomerIds: [] },
    );
    expect(result.ok).toBe(false);
  });

  it("builds payment terms summary from milestone fields", () => {
    expect(
      buildPaymentTermsSummary({
        booking: "20%",
        designApproval: "30%",
        beforeDispatch: "40%",
        postInstallation: "10%",
      }),
    ).toBe("Booking 20% · Design approval 30% · Before dispatch 40% · Post installation 10%");
  });

  it("requires name and valid phone before approval", () => {
    expect(validateQuotationClientForApproval({ ...richQuotation, clientPhone: "" }).ok).toBe(false);
    expect(validateQuotationClientForApproval({ ...richQuotation, clientName: "  " }).ok).toBe(false);
    expect(validateQuotationClientForApproval({ ...richQuotation, clientPhone: "12" }).ok).toBe(false);
    expect(validateQuotationClientForApproval(richQuotation).ok).toBe(true);
  });

  it("builds a billing-ready customer from quotation fields", () => {
    const customer = buildCustomerFromQuotation(richQuotation, "CUST-TEST-1");
    expect(customer.name).toBe("Solar Client Pvt Ltd");
    expect(customer.phone).toBe("9876543210");
    expect(customer.gstin).toBe("08AABCU9603R1ZM");
    expect(customer.pan).toBe("AABCU9603R");
    expect(customer.state).toBe("08");
    expect(customer.paymentTerms).toBe("Booking 20% · Design approval 30%");
    expect(customer.address).toContain("Jaipur");
    expect(customer.type).toBe("company");
  });

  it("enriches a thin existing customer without wiping populated fields", () => {
    const thin: Customer = {
      id: "C001",
      name: "Legacy",
      phone: "9000000001",
      email: "",
      address: "",
      type: "individual",
      itemsBought: [],
      totalPurchases: 0,
      createdAt: "2026-01-01",
    };
    const enriched = enrichCustomerFromQuotation(thin, richQuotation);
    expect(enriched.name).toBe("Legacy");
    expect(enriched.gstin).toBe("08AABCU9603R1ZM");
    expect(enriched.paymentTerms).toBe("Booking 20% · Design approval 30%");
  });
});

describe("quotation approve command", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates a rich customer on sent → approved", async () => {
    const repositories = createRepositories([richQuotation] as Quotation[]);
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
      payload: { quotationId: "Q-APPROVE", nextStatus: "approved" },
    });

    expect(result.ok).toBe(true);
    const updated = repositories.quotationRepository.getById("Q-APPROVE");
    expect(updated?.customerId).toBeTruthy();
    const customer = repositories.customerRepository.getById(updated!.customerId!);
    expect(customer?.gstin).toBe("08AABCU9603R1ZM");
    expect(customer?.pan).toBe("AABCU9603R");
    expect(customer?.paymentTerms).toContain("Booking");
    expect(customer?.id).toMatch(/^CUST-\d{4}$/);
  });

  it("uses next sequential CUST id after legacy seeds", async () => {
    const repositories = createRepositories([richQuotation] as Quotation[]);
    repositories.customerRepository.add({
      id: "C018",
      name: "Seed",
      phone: "9000000018",
      email: "",
      address: "",
      type: "individual",
      itemsBought: [],
      totalPurchases: 0,
      createdAt: "2026-01-01",
    });
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
      payload: { quotationId: "Q-APPROVE", nextStatus: "approved" },
    });

    expect(result.ok).toBe(true);
    const customer = repositories.customerRepository.getById(
      repositories.quotationRepository.getById("Q-APPROVE")!.customerId!,
    );
    expect(customer?.id).toBe("CUST-0019");
  });

  it("blocks approval when client phone is missing", async () => {
    const repositories = createRepositories([
      { ...richQuotation, id: "Q-NOPHONE", clientPhone: "" },
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
      payload: { quotationId: "Q-NOPHONE", nextStatus: "approved" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("QUOTATION_APPROVE_VALIDATION_FAILED");
    }
  });
});
