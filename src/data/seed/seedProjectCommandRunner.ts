import { CommandBus } from "@/application/commands/CommandBus";
import type { Command, CommandResult } from "@/application/commands/types";
import {
  CREATE_DIRECT_PROJECT_EXCEPTION_COMMAND,
  CREATE_PROJECT_FROM_QUOTATION_COMMAND,
  CREATE_PROJECT_INTAKE_COMMAND,
  registerProjectCommands,
} from "@/application/commands/project/registerProjectCommands";
import { AuditService } from "@/application/services/AuditService";
import { PermissionService } from "@/application/services/PermissionService";
import type { AppState } from "@/contexts/AppDataContext";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import { syncPrototypeRepositoriesFromAppState } from "@/infrastructure/repositories/syncPrototypeRepositories";
import type { ProjectIntakePayload } from "@/application/services/ProjectTypeService";
import type { Customer } from "@/types/finance";
import type { Enquiry, Project, Quotation } from "@/types/project";
import { normalizeProject } from "@/lib/projectNormalize";
import { SeedMemoryRepository } from "./seedMemoryRepository";

type CommandBusWithHandlers = CommandBus & {
  handlers: Map<string, (command: Command) => CommandResult>;
};

function executeCommandSync(bus: CommandBus, command: Command): CommandResult {
  const handler = (bus as CommandBusWithHandlers).handlers.get(command.type);
  if (!handler) {
    return {
      ok: false,
      errorCode: "COMMAND_HANDLER_NOT_FOUND",
      message: `No handler for ${command.type}`,
    };
  }
  return handler(command);
}

function createMemoryRepositoryContext(state: AppState): AppRepositoryContext {
  return {
    projectRepository: new SeedMemoryRepository<Project>(state.projects),
    quotationRepository: new SeedMemoryRepository<Quotation>(state.quotations),
    enquiryRepository: new SeedMemoryRepository<Enquiry>(state.enquiries),
    customerRepository: new SeedMemoryRepository<Customer>(state.customers),
    invoiceRepository: new SeedMemoryRepository([...state.invoices, ...state.saleBills]),
    employeeRepository: new SeedMemoryRepository(state.employees),
    inventoryItemRepository: new SeedMemoryRepository(state.inventoryItems),
    auditRepository: new SeedMemoryRepository(state.auditLogs),
    siteRepository: new SeedMemoryRepository(state.sites),
    taskRepository: new SeedMemoryRepository(state.tasks),
    vendorRepository: new SeedMemoryRepository(state.vendors),
  };
}

const SEED_ACTOR = { actorUserId: "ADM-001", actorRole: "admin" as const };

export class SeedProjectCommandRunner {
  private readonly repositories: AppRepositoryContext;
  private readonly bus: CommandBus;
  private working: AppState;

  constructor(state: AppState) {
    this.working = state;
    this.repositories = createMemoryRepositoryContext(state);
    this.bus = new CommandBus();
    registerProjectCommands(
      this.bus,
      this.repositories,
      new PermissionService(),
      new AuditService({ auditRepository: this.repositories.auditRepository }),
    );
    this.syncRepos();
  }

  getState(): AppState {
    return this.working;
  }

  syncRepos(): void {
    syncPrototypeRepositoriesFromAppState(this.working, this.repositories);
  }

  mergeFromRepos(): void {
    this.working = {
      ...this.working,
      projects: this.repositories.projectRepository.getAll().map((p) => normalizeProject(p)),
      quotations: this.repositories.quotationRepository.getAll(),
      enquiries: this.repositories.enquiryRepository.getAll(),
      customers: this.repositories.customerRepository.getAll(),
      auditLogs: this.repositories.auditRepository.getAll(),
    };
  }

  addCustomer(customer: Customer): void {
    this.working = {
      ...this.working,
      customers: [...this.working.customers.filter((c) => c.id !== customer.id), customer],
    };
    this.syncRepos();
  }

  runCreateFromQuotation(payload: {
    quotationId: string;
    projectName: string;
    intake: ProjectIntakePayload;
    project?: Project;
  }): CommandResult<{ projectId: string }> {
    this.syncRepos();
    const result = executeCommandSync(this.bus, {
      type: CREATE_PROJECT_FROM_QUOTATION_COMMAND,
      ...SEED_ACTOR,
      payload,
    }) as CommandResult<{ projectId: string }>;
    this.mergeFromRepos();
    return result;
  }

  runCreateIntake(payload: {
    project: Project;
    intake: ProjectIntakePayload;
    quotationId?: string;
  }): CommandResult<{ projectId: string }> {
    this.syncRepos();
    const result = executeCommandSync(this.bus, {
      type: CREATE_PROJECT_INTAKE_COMMAND,
      ...SEED_ACTOR,
      payload,
    }) as CommandResult<{ projectId: string }>;
    this.mergeFromRepos();
    return result;
  }

  runCreateDirectException(payload: {
    projectName: string;
    intake: ProjectIntakePayload;
    reason: string;
    customerId?: string;
  }): CommandResult<{ projectId: string }> {
    this.syncRepos();
    const result = executeCommandSync(this.bus, {
      type: CREATE_DIRECT_PROJECT_EXCEPTION_COMMAND,
      ...SEED_ACTOR,
      payload,
    }) as CommandResult<{ projectId: string }>;
    this.mergeFromRepos();
    return result;
  }

  patchProject(projectId: string, patch: Partial<Project>): void {
    const project = this.working.projects.find((p) => p.id === projectId);
    if (!project) return;
    const updated = normalizeProject({ ...project, ...patch });
    this.working = {
      ...this.working,
      projects: this.working.projects.map((p) => (p.id === projectId ? updated : p)),
    };
    this.syncRepos();
  }
}
