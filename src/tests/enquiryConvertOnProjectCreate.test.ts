import { beforeEach, describe, expect, it } from "vitest";
import { CommandBus } from "@/application/commands/CommandBus";
import { registerEnquiryCommands } from "@/application/commands/enquiry/registerEnquiryCommands";
import {
  CREATE_PROJECT_FROM_QUOTATION_COMMAND,
  registerProjectCommands,
} from "@/application/commands/project/registerProjectCommands";
import { PermissionService } from "@/application/services/PermissionService";
import { AuditService } from "@/application/services/AuditService";
import { LocalStorageJsonRepository } from "@/infrastructure/repositories/localStorage/LocalStorageJsonRepository";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import type { AuditLogEntry, Customer } from "@/types/finance";
import type { Enquiry, Project, Quotation } from "@/types/project";
import { reconcileEnquiriesConvertedOnProjectLink } from "@/lib/reconcileEnquiryConvertedOnProjectLink";
import type { AppState } from "@/contexts/AppDataContext";
import type { ProjectIntakePayload } from "@/application/services/ProjectKindService";

const emptyRepos = (): AppRepositoryContext => ({
  projectRepository: new LocalStorageJsonRepository<Project>("mss.test.projwin.projects", []),
  quotationRepository: new LocalStorageJsonRepository<Quotation>("mss.test.projwin.quotations", []),
  enquiryRepository: new LocalStorageJsonRepository<Enquiry>("mss.test.projwin.enquiries", []),
  customerRepository: new LocalStorageJsonRepository<Customer>("mss.test.projwin.customers", []),
  invoiceRepository: new LocalStorageJsonRepository("mss.test.projwin.invoices", []),
  employeeRepository: new LocalStorageJsonRepository("mss.test.projwin.employees", []),
  inventoryItemRepository: new LocalStorageJsonRepository("mss.test.projwin.inventory", []),
  auditRepository: new LocalStorageJsonRepository<AuditLogEntry>("mss.test.projwin.audit", []),
});

const intake: ProjectIntakePayload = {
  kind: "SOLO_EPC",
  parties: { customer: "Pipeline Client", vendorOrDiscom: "DISCOM Jaipur" },
  commercial: {
    contractAmount: 400000,
    paymentType: "cash",
    internalCostEstimate: 0,
  },
};

describe("enquiry convert on project create (C1)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("CREATE_PROJECT_FROM_QUOTATION closes linked enquiry in quotation_sent", async () => {
    const repositories = emptyRepos();
    const bus = new CommandBus();
    const audit = new AuditService({ auditRepository: repositories.auditRepository });
    registerEnquiryCommands(bus, repositories, new PermissionService(), audit);
    registerProjectCommands(bus, repositories, new PermissionService(), audit);

    const enquiry: Enquiry = {
      id: "ENQ-C1",
      customerName: "Pipeline Client",
      customerPhone: "9000000001",
      customerEmail: "c@test.com",
      customerAddress: "Jaipur",
      customerType: "individual",
      source: "referral",
      systemCapacity: "8 kW",
      estimatedBudget: 400000,
      requirements: "Rooftop",
      status: "quotation_sent",
      priority: "high",
      assignedTo: "1",
      createdAt: "2026-05-01",
      updatedAt: "2026-05-02",
      notes: [],
    };
    repositories.enquiryRepository.add(enquiry);

    const quotation: Quotation = {
      id: "Q-C1",
      quotationNumber: "Q-2026-C1",
      status: "approved",
      quotationType: "solar",
      enquiryId: "ENQ-C1",
      clientName: enquiry.customerName,
      clientPhone: enquiry.customerPhone,
      clientEmail: enquiry.customerEmail,
      clientCity: "Jaipur",
      clientState: "Rajasthan",
      clientAddress: enquiry.customerAddress,
      systemCategory: "residential",
      systemCapacity: "8",
      totalAmount: 420000,
      clientAgreedAmount: 410000,
      paymentType: "cash",
      createdAt: "2026-05-03",
      customerId: "C-existing",
    };
    repositories.quotationRepository.add(quotation);

    const project: Project = {
      id: "P-C1",
      name: "Pipeline Client 8kW",
      client: enquiry.customerName,
      customerId: "C-existing",
      quotationId: "Q-C1",
      lifecycleStatus: "New",
      projectType: "Residential",
      projectCategory: "solar",
      capacity: "8",
      location: "Jaipur",
      contractAmount: 410000,
      amountReceived: 0,
      startDate: "2026-05-10",
      type: "EPC",
      projectKind: "SOLO_EPC",
      assignees: [],
      onSite: 0,
      totalCost: 0,
      photos: 0,
      createdAt: "2026-05-10",
    } as Project;

    repositories.customerRepository.add({
      id: "C-existing",
      name: enquiry.customerName,
      phone: enquiry.customerPhone,
      email: enquiry.customerEmail,
      address: enquiry.customerAddress,
      type: "individual",
      itemsBought: [],
      totalPurchases: 0,
      createdAt: "2026-05-01",
    });

    const result = await bus.execute({
      type: CREATE_PROJECT_FROM_QUOTATION_COMMAND,
      actorUserId: "admin",
      actorRole: "admin",
      payload: {
        quotationId: "Q-C1",
        projectName: project.name,
        intake,
        project,
      },
    });

    expect(result.ok).toBe(true);
    const updatedEnquiry = repositories.enquiryRepository.getById("ENQ-C1");
    expect(updatedEnquiry?.status).toBe("converted");
    expect(updatedEnquiry?.customerId).toBeTruthy();
    expect(repositories.quotationRepository.getById("Q-C1")?.status).toBe("converted_to_project");
  });

  it("reconcileEnquiriesConvertedOnProjectLink repairs seed-style mismatch", () => {
    const state = {
      enquiries: [
        {
          id: "ENQ-SEED",
          customerName: "Seed Client",
          customerPhone: "9111111111",
          customerEmail: "",
          customerAddress: "",
          customerType: "individual",
          source: "phone",
          systemCapacity: "5",
          estimatedBudget: 0,
          requirements: "",
          status: "quotation_sent",
          priority: "medium",
          assignedTo: "",
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
          notes: [],
        },
      ],
      quotations: [
        {
          id: "Q-SEED",
          quotationNumber: "Q-1",
          status: "converted_to_project",
          linkedProjectId: "P-SEED",
          enquiryId: "ENQ-SEED",
          customerId: "C-SEED",
          clientName: "Seed Client",
          clientPhone: "9111111111",
          clientCity: "Jaipur",
          clientState: "RJ",
          systemCapacity: "5",
          totalAmount: 100000,
          paymentType: "cash",
          createdAt: "2026-02-01",
        },
      ],
      projects: [
        {
          id: "P-SEED",
          name: "Seed Project",
          client: "Seed Client",
          customerId: "C-SEED",
          quotationId: "Q-SEED",
          lifecycleStatus: "In Progress",
        } as Project,
      ],
      customers: [
        {
          id: "C-SEED",
          name: "Seed Client",
          phone: "9111111111",
          email: "",
          address: "",
          type: "individual",
          itemsBought: [],
          totalPurchases: 0,
          createdAt: "2026-01-01",
        },
      ],
    } as unknown as AppState;

    const next = reconcileEnquiriesConvertedOnProjectLink(state);
    expect(next.enquiries[0].status).toBe("converted");
    expect(next.enquiries[0].customerId).toBe("C-SEED");
  });
});
