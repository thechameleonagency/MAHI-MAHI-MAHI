import { beforeEach, describe, expect, it } from "vitest";
import { CommandBus } from "@/application/commands/CommandBus";
import { registerProjectCommands, CREATE_PROJECT_FROM_QUOTATION_COMMAND, CREATE_PROJECT_INTAKE_COMMAND } from "@/application/commands/project/registerProjectCommands";
import { PermissionService } from "@/application/services/PermissionService";
import { AuditService } from "@/application/services/AuditService";
import { LocalStorageJsonRepository } from "@/infrastructure/repositories/localStorage/LocalStorageJsonRepository";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import type { AuditLogEntry, Customer, Invoice } from "@/types/finance";
import type { Enquiry, InventoryItem, Project, Quotation, Employee } from "@/types/project";

const setupRepositories = (quotation: Quotation): AppRepositoryContext => {
  return {
    projectRepository: new LocalStorageJsonRepository<Project>("mss.test.projectcmd.projects", []),
    quotationRepository: new LocalStorageJsonRepository<Quotation>("mss.test.projectcmd.quotations", [quotation]),
    enquiryRepository: new LocalStorageJsonRepository<Enquiry>("mss.test.projectcmd.enquiries", []),
    customerRepository: new LocalStorageJsonRepository<Customer>("mss.test.projectcmd.customers", []),
    invoiceRepository: new LocalStorageJsonRepository<Invoice>("mss.test.projectcmd.invoices", []),
    employeeRepository: new LocalStorageJsonRepository<Employee>("mss.test.projectcmd.employees", []),
    inventoryItemRepository: new LocalStorageJsonRepository<InventoryItem>("mss.test.projectcmd.inventory", []),
    auditRepository: new LocalStorageJsonRepository<AuditLogEntry>("mss.test.projectcmd.audit", []),
  };
};

describe("Project commands", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates project only from approved/converted quotation", async () => {
    const confirmedQuotation: Quotation = {
      id: "Q-CNF",
      quotationNumber: "Q-CNF",
      status: "approved",
      quotationType: "solar",
      clientName: "Client 1",
      clientPhone: "999",
      clientEmail: "c@x.com",
      clientCity: "Jaipur",
      clientState: "Rajasthan",
      paymentType: "cash",
      totalAmount: 100000,
      isConverted: false,
      createdAt: "2026-01-01",
      customerId: "C-1",
    };

    const repositories = setupRepositories(confirmedQuotation);
    const bus = new CommandBus();
    registerProjectCommands(bus, repositories, new PermissionService(), new AuditService({ auditRepository: repositories.auditRepository }));

    const result = await bus.execute({
      type: CREATE_PROJECT_FROM_QUOTATION_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: {
        quotationId: "Q-CNF",
        projectName: "Project One",
        intake: {
          kind: "SOLO_EPC",
          parties: { customer: "C1", vendorOrDiscom: "V1" },
          commercial: { contractAmount: 100000, paymentType: "cash", internalCostEstimate: 70000 },
        },
      },
    });

    expect(result.ok).toBe(true);
  });

  it("persists UI-built project when payload.project is set", async () => {
    const confirmedQuotation: Quotation = {
      id: "Q-RICH",
      quotationNumber: "Q-RICH",
      status: "approved",
      quotationType: "solar",
      clientName: "Client 1",
      clientPhone: "999",
      clientEmail: "c@x.com",
      clientCity: "Jaipur",
      clientState: "Rajasthan",
      paymentType: "cash",
      totalAmount: 100000,
      isConverted: false,
      createdAt: "2026-01-01",
      customerId: "C-1",
    };

    const repositories = setupRepositories(confirmedQuotation);
    const bus = new CommandBus();
    registerProjectCommands(bus, repositories, new PermissionService(), new AuditService({ auditRepository: repositories.auditRepository }));

    const richProject: Project = {
      id: "P-RICH-1",
      name: "Rich Name",
      type: "EPC",
      projectType: "Residential",
      projectCategory: "solar",
      ownerType: "solo",
      progressStage: "new",
      client: "Client 1",
      capacity: "5 kW",
      location: "Jaipur",
      assignees: [],
      onSite: 0,
      contractAmount: 100000,
      totalCost: 0,
      amountReceived: 0,
      photos: 0,
      startDate: "2026-01-01",
      endDate: null,
      createdAt: "2026-01-01",
      customerId: "C-1",
      lifecycleStatus: "Active",
      executionPhase: "execution",
      quotationId: "Q-RICH",
    };

    const result = await bus.execute({
      type: CREATE_PROJECT_FROM_QUOTATION_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: {
        quotationId: "Q-RICH",
        projectName: "ignored when project set",
        intake: {
          kind: "SOLO_EPC",
          parties: { customer: "C1", vendorOrDiscom: "V1" },
          commercial: { contractAmount: 100000, paymentType: "cash", internalCostEstimate: 0 },
        },
        project: richProject,
      },
    });

    expect(result.ok).toBe(true);
    expect(repositories.projectRepository.getById("P-RICH-1")?.name).toBe("Rich Name");
    const q = repositories.quotationRepository.getById("Q-RICH");
    expect(q?.linkedProjectId).toBe("P-RICH-1");
    expect(q?.status).toBe("converted_to_project");
  });

  it("rejects SOLO_EPC intake without quotation", async () => {
    const bus = new CommandBus();
    const repositories = setupRepositories({
      id: "Q-X",
      quotationNumber: "Q-X",
      status: "approved",
      quotationType: "solar",
      clientName: "C",
      clientPhone: "1",
      clientEmail: "c@x.com",
      clientCity: "J",
      clientState: "R",
      paymentType: "cash",
      totalAmount: 1,
      isConverted: false,
      createdAt: "2026-01-01",
      customerId: "C-1",
    });
    registerProjectCommands(bus, repositories, new PermissionService(), new AuditService({ auditRepository: repositories.auditRepository }));

    const p: Project = {
      id: "P-INT-1",
      name: "Solo",
      type: "EPC",
      projectType: "Residential",
      projectCategory: "solar",
      ownerType: "solo",
      projectKind: "SOLO_EPC",
      progressStage: "new",
      client: "C",
      capacity: "5 kW",
      location: "J",
      assignees: [],
      onSite: 0,
      contractAmount: 1,
      totalCost: 0,
      amountReceived: 0,
      photos: 0,
      startDate: "2026-01-01",
      endDate: null,
      createdAt: "2026-01-01",
      customerId: "C-1",
      lifecycleStatus: "Active",
      executionPhase: "execution",
    };

    const r = await bus.execute({
      type: CREATE_PROJECT_INTAKE_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: {
        project: p,
        intake: {
          kind: "SOLO_EPC",
          parties: { customer: "C", vendorOrDiscom: "V" },
          commercial: { contractAmount: 1, paymentType: "cash", internalCostEstimate: 0 },
        },
      },
    });
    expect(r.ok).toBe(false);
  });

  it("allows direct INC project create without quotation when intake is valid", async () => {
    const bus = new CommandBus();
    const repositories: AppRepositoryContext = {
      projectRepository: new LocalStorageJsonRepository<Project>("mss.test.intake.projects", []),
      quotationRepository: new LocalStorageJsonRepository<Quotation>("mss.test.intake.quotations", []),
      enquiryRepository: new LocalStorageJsonRepository<Enquiry>("mss.test.intake.enquiries", []),
      customerRepository: new LocalStorageJsonRepository<Customer>("mss.test.intake.customers", []),
      invoiceRepository: new LocalStorageJsonRepository<Invoice>("mss.test.intake.invoices", []),
      employeeRepository: new LocalStorageJsonRepository<Employee>("mss.test.intake.employees", []),
      inventoryItemRepository: new LocalStorageJsonRepository<InventoryItem>("mss.test.intake.inventory", []),
      auditRepository: new LocalStorageJsonRepository<AuditLogEntry>("mss.test.intake.audit", []),
    };
    registerProjectCommands(bus, repositories, new PermissionService(), new AuditService({ auditRepository: repositories.auditRepository }));

    const p: Project = {
      id: "P-INC-1",
      name: "INC work",
      type: "INC",
      projectType: "Residential",
      projectCategory: "solar",
      ownerType: "solo",
      projectKind: "INC",
      progressStage: "new",
      client: "Client",
      capacity: "N/A",
      location: "Jaipur",
      assignees: [],
      onSite: 0,
      contractAmount: 50000,
      totalCost: 0,
      amountReceived: 0,
      photos: 0,
      startDate: "2026-01-01",
      endDate: null,
      createdAt: "2026-01-01",
      customerId: "C-1",
      lifecycleStatus: "Active",
      executionPhase: "execution",
    };

    const r = await bus.execute({
      type: CREATE_PROJECT_INTAKE_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: {
        project: p,
        intake: {
          kind: "INC",
          parties: { customer: "Client" },
          commercial: { contractAmount: 50000, paymentType: "cash" },
        },
      },
    });
    expect(r.ok).toBe(true);
  });
});
