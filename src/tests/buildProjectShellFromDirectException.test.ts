import { describe, expect, it } from "vitest";
import { CommandBus } from "@/application/commands/CommandBus";
import {
  CREATE_DIRECT_PROJECT_EXCEPTION_COMMAND,
  registerProjectCommands,
} from "@/application/commands/project/registerProjectCommands";
import { buildProjectShellFromDirectException } from "@/domain/project/buildProjectShellFromDirectException";
import { validateDirectExceptionSite } from "@/domain/project/directExceptionSite";
import { PermissionService } from "@/application/services/PermissionService";
import { AuditService } from "@/application/services/AuditService";
import { LocalStorageJsonRepository } from "@/infrastructure/repositories/localStorage/LocalStorageJsonRepository";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import type { AuditLogEntry, Customer, Invoice } from "@/types/finance";
import type { Enquiry, InventoryItem, Project, Quotation, Employee } from "@/types/project";

const validSite = {
  projectType: "Industrial" as const,
  projectCategory: "solar" as const,
  capacity: "500",
  location: "MIDC Pune, Maharashtra",
};

const validIntake = {
  kind: "SOLO_EPC" as const,
  parties: { customer: "Factory Ltd", vendorOrDiscom: "DISCOM Pune" },
  commercial: { contractAmount: 2_000_000, paymentType: "cash", internalCostEstimate: 0 },
  site: validSite,
};

describe("validateDirectExceptionSite", () => {
  it("rejects missing site and sentinel placeholders", () => {
    expect(validateDirectExceptionSite(undefined).ok).toBe(false);
    expect(validateDirectExceptionSite({ ...validSite, location: "Pending" }).ok).toBe(false);
    expect(validateDirectExceptionSite({ ...validSite, capacity: "N/A" }).ok).toBe(false);
  });
});

describe("buildProjectShellFromDirectException", () => {
  it("uses intake.site instead of Commercial / Pending defaults", () => {
    const result = buildProjectShellFromDirectException({
      intake: validIntake,
      projectName: "Factory 500kW",
      projectId: "P-DEX-1",
      reason: "Urgent mobilization",
      customerId: "C-99",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.projectType).toBe("Industrial");
    expect(result.project.projectCategory).toBe("solar");
    expect(result.project.location).toBe("MIDC Pune, Maharashtra");
    expect(result.project.capacity).toBe("500 kW");
    expect(result.project.projectKind).toBe("SOLO_EPC");
    expect(result.project.lifecycleStatus).toBe("New");
    expect(result.project.directCreationReason).toBe("Urgent mobilization");
  });
});

describe("CREATE_DIRECT_PROJECT_EXCEPTION command", () => {
  it("persists classification from intake.site via command bus", async () => {
    localStorage.clear();
    const repositories: AppRepositoryContext = {
      projectRepository: new LocalStorageJsonRepository<Project>("mss.test.dex.projects", []),
      quotationRepository: new LocalStorageJsonRepository<Quotation>("mss.test.dex.quotations", []),
      enquiryRepository: new LocalStorageJsonRepository<Enquiry>("mss.test.dex.enquiries", []),
      customerRepository: new LocalStorageJsonRepository<Customer>("mss.test.dex.customers", []),
      invoiceRepository: new LocalStorageJsonRepository<Invoice>("mss.test.dex.invoices", []),
      employeeRepository: new LocalStorageJsonRepository<Employee>("mss.test.dex.employees", []),
      inventoryItemRepository: new LocalStorageJsonRepository<InventoryItem>("mss.test.dex.inventory", []),
      auditRepository: new LocalStorageJsonRepository<AuditLogEntry>("mss.test.dex.audit", []),
    };
    const bus = new CommandBus();
    registerProjectCommands(
      bus,
      repositories,
      new PermissionService(),
      new AuditService({ auditRepository: repositories.auditRepository }),
    );

    const result = await bus.execute({
      type: CREATE_DIRECT_PROJECT_EXCEPTION_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: {
        projectName: "Warehouse Rooftop",
        reason: "Board-approved exception",
        customerId: "C-1",
        intake: {
          kind: "PARTNER_EPC",
          parties: { customer: "Warehouse Co", partner: "Channel A" },
          commercial: {
            contractAmount: 1_500_000,
            paymentType: "cash",
            internalCostEstimate: 0,
          },
          site: {
            projectType: "Commercial",
            projectCategory: "solar",
            capacity: "120",
            location: "Jaipur, Rajasthan",
          },
        },
      },
    });

    expect(result.ok).toBe(true);
    const p = repositories.projectRepository.getAll()[0];
    expect(p.projectType).toBe("Commercial");
    expect(p.ownerType).toBe("partnership");
    expect(p.location).toBe("Jaipur, Rajasthan");
    expect(p.capacity).toBe("120 kW");
    expect(p.location).not.toBe("Pending");
  });

  it("fails when intake.site is omitted", async () => {
    localStorage.clear();
    const repositories: AppRepositoryContext = {
      projectRepository: new LocalStorageJsonRepository<Project>("mss.test.dex2.projects", []),
      quotationRepository: new LocalStorageJsonRepository<Quotation>("mss.test.dex2.quotations", []),
      enquiryRepository: new LocalStorageJsonRepository<Enquiry>("mss.test.dex2.enquiries", []),
      customerRepository: new LocalStorageJsonRepository<Customer>("mss.test.dex2.customers", []),
      invoiceRepository: new LocalStorageJsonRepository<Invoice>("mss.test.dex2.invoices", []),
      employeeRepository: new LocalStorageJsonRepository<Employee>("mss.test.dex2.employees", []),
      inventoryItemRepository: new LocalStorageJsonRepository<InventoryItem>("mss.test.dex2.inventory", []),
      auditRepository: new LocalStorageJsonRepository<AuditLogEntry>("mss.test.dex2.audit", []),
    };
    const bus = new CommandBus();
    registerProjectCommands(
      bus,
      repositories,
      new PermissionService(),
      new AuditService({ auditRepository: repositories.auditRepository }),
    );

    const result = await bus.execute({
      type: CREATE_DIRECT_PROJECT_EXCEPTION_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: {
        projectName: "Bad",
        reason: "Test",
        intake: {
          kind: "VENDORSHIP_ONLY",
          parties: { externalNetwork: "OEM Network" },
          commercial: { contractAmount: 50_000, vendorshipFeeReceivable: 50_000 },
        },
      },
    });

    expect(result.ok).toBe(false);
    expect((result as { errorCode: string }).errorCode).toBe("DIRECT_EXCEPTION_SITE_REQUIRED");
  });
});
