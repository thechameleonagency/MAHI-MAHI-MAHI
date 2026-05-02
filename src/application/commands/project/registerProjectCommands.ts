import type { CommandBus } from "@/application/commands/CommandBus";
import type { Command } from "@/application/commands/types";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import type { PermissionService } from "@/application/services/PermissionService";
import type { AuditService } from "@/application/services/AuditService";
import { ProjectKindService, type ProjectIntakePayload } from "@/application/services/ProjectKindService";
import { commercialBaselineFromIntake, commercialBaselineFromQuotation } from "@/domain/project/commercialBaseline";
import { projectKindConfigSnapshot } from "@/lib/projectNormalize";
import type { Project } from "@/types/project";

type CreateProjectFromQuotationPayload = {
  quotationId: string;
  intake: ProjectIntakePayload;
  projectName: string;
  /** When provided (e.g. UI-built project), persisted as-is after quotation checks. */
  project?: Project;
};

type CreateDirectProjectExceptionPayload = {
  projectName: string;
  intake: ProjectIntakePayload;
  reason: string;
  customerId?: string;
};

/** Create project with full `project` + intake; `quotationId` optional (required for SOLO_EPC). */
type CreateProjectIntakePayload = {
  project: Project;
  intake: ProjectIntakePayload;
  quotationId?: string;
};

export const CREATE_PROJECT_FROM_QUOTATION_COMMAND = "project.create_from_quotation";
export const CREATE_DIRECT_PROJECT_EXCEPTION_COMMAND = "project.create_direct_exception";
export const CREATE_PROJECT_INTAKE_COMMAND = "project.create_intake";

const makeProjectId = () => `P-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

export const registerProjectCommands = (
  commandBus: CommandBus,
  repositories: AppRepositoryContext,
  permissionService: PermissionService,
  auditService: AuditService,
): void => {
  const projectKindService = new ProjectKindService();

  commandBus.register<Command<CreateProjectFromQuotationPayload>, { projectId: string }>(CREATE_PROJECT_FROM_QUOTATION_COMMAND, (command) => {
    permissionService.assertCanPerformAction(command.actorRole, "project:create_from_quote");

    const quotation = repositories.quotationRepository.getById(command.payload.quotationId);
    if (!quotation) {
      return { ok: false, errorCode: "QUOTATION_NOT_FOUND", message: "Quotation not found" };
    }
    if (quotation.status !== "confirmed") {
      return { ok: false, errorCode: "QUOTATION_NOT_CONFIRMED", message: "Project can only be created from confirmed quotation" };
    }
    if (quotation.isConverted) {
      return { ok: false, errorCode: "QUOTATION_ALREADY_CONVERTED", message: "This quotation is already converted to a project" };
    }

    const intakeValidation = projectKindService.validateIntake(command.payload.intake);
    if (!intakeValidation.ok) {
      return { ok: false, errorCode: "PROJECT_INTAKE_INVALID", message: intakeValidation.errors.join(", ") };
    }

    if (command.payload.project) {
      const p = command.payload.project;
      if (p.quotationId !== command.payload.quotationId) {
        return { ok: false, errorCode: "QUOTATION_PROJECT_MISMATCH", message: "Project quotationId must match command quotationId" };
      }
      if (repositories.projectRepository.getById(p.id)) {
        return { ok: false, errorCode: "PROJECT_ID_EXISTS", message: "A project with this id already exists" };
      }
      const { baseline, executionLineItems } = commercialBaselineFromQuotation(quotation);
      repositories.projectRepository.add({
        ...p,
        customerId: p.customerId || quotation.customerId || "",
        commercialBaseline: p.commercialBaseline ?? baseline,
        executionLineItems: p.executionLineItems?.length ? p.executionLineItems : executionLineItems,
      });
      repositories.quotationRepository.update(quotation.id, { isConverted: true, convertedToProjectId: p.id });
      auditService.write(command, {
        action: "create",
        entityType: "Project",
        entityId: p.id,
        entityName: p.name,
      });
      return {
        ok: true,
        result: { projectId: p.id },
        domainEvents: ["ProjectCreated"],
      };
    }

    const projectId = makeProjectId();
    const { baseline, executionLineItems } = commercialBaselineFromQuotation(quotation);
    repositories.projectRepository.add({
      id: projectId,
      name: command.payload.projectName,
      type: "EPC",
      projectType: "Residential",
      projectCategory: "solar",
      ownerType: "solo",
      lifecycleStatus: "Active",
      executionPhase: "Intake",
      status: "Ongoing",
      progressStage: "new",
      projectKind: "SOLO_EPC",
      projectKindConfigSnapshot: projectKindConfigSnapshot("SOLO_EPC"),
      client: quotation.clientName,
      customerId: quotation.customerId,
      capacity: quotation.systemCapacity || "N/A",
      location: `${quotation.clientCity}, ${quotation.clientState}`,
      assignees: [],
      onSite: 0,
      contractAmount: quotation.clientAgreedAmount || quotation.totalAmount,
      totalCost: 0,
      amountReceived: 0,
      quotationId: quotation.id,
      photos: 0,
      startDate: new Date().toISOString().split("T")[0],
      endDate: null,
      createdAt: new Date().toISOString().split("T")[0],
      commercialBaseline: baseline,
      executionLineItems,
    });

    repositories.quotationRepository.update(quotation.id, { isConverted: true, convertedToProjectId: projectId });
    auditService.write(command, {
      action: "create",
      entityType: "Project",
      entityId: projectId,
      entityName: command.payload.projectName,
    });

    return {
      ok: true,
      result: { projectId },
      domainEvents: ["ProjectCreated"],
    };
  });

  commandBus.register<Command<CreateProjectIntakePayload>, { projectId: string }>(CREATE_PROJECT_INTAKE_COMMAND, (command) => {
    permissionService.assertCanPerformAction(command.actorRole, "project:create_from_quote");
    const { project, intake, quotationId } = command.payload;
    const kind = project.projectKind ?? "SOLO_EPC";

    if ((project.partners?.length ?? 0) > 1) {
      return {
        ok: false,
        errorCode: "PARTNER_COUNT",
        message: "At most one external partner per project.",
      };
    }

    if (!quotationId) {
      if (kind === "SOLO_EPC") {
        return {
          ok: false,
          errorCode: "QUOTATION_REQUIRED",
          message: "Solo EPC projects require a confirmed quotation. Choose another project kind to proceed without a quotation.",
        };
      }
      const intakeValidation = projectKindService.validateIntake(intake);
      if (!intakeValidation.ok) {
        return { ok: false, errorCode: "PROJECT_INTAKE_INVALID", message: intakeValidation.errors.join(", ") };
      }
      if (repositories.projectRepository.getById(project.id)) {
        return { ok: false, errorCode: "PROJECT_ID_EXISTS", message: "A project with this id already exists" };
      }
      let toAdd = project;
      if ((!project.commercialBaseline || !project.executionLineItems?.length) && project.customerId) {
        const { baseline, executionLineItems } = commercialBaselineFromIntake({
          projectId: project.id,
          contractAmount: project.contractAmount ?? 0,
          summaryLine: `Scope — ${project.name}`,
          customerId: project.customerId,
        });
        toAdd = {
          ...project,
          commercialBaseline: project.commercialBaseline ?? baseline,
          executionLineItems: project.executionLineItems?.length ? project.executionLineItems : executionLineItems,
        };
      }
      repositories.projectRepository.add(toAdd);
      auditService.write(command, {
        action: "create",
        entityType: "Project",
        entityId: project.id,
        entityName: project.name,
      });
      return { ok: true, result: { projectId: project.id }, domainEvents: ["ProjectCreated"] };
    }

    const quotation = repositories.quotationRepository.getById(quotationId);
    if (!quotation) {
      return { ok: false, errorCode: "QUOTATION_NOT_FOUND", message: "Quotation not found" };
    }
    if (quotation.status !== "confirmed") {
      return { ok: false, errorCode: "QUOTATION_NOT_CONFIRMED", message: "Project can only be created from confirmed quotation" };
    }
    if (quotation.isConverted) {
      return { ok: false, errorCode: "QUOTATION_ALREADY_CONVERTED", message: "This quotation is already converted to a project" };
    }
    const intakeValidation = projectKindService.validateIntake(intake);
    if (!intakeValidation.ok) {
      return { ok: false, errorCode: "PROJECT_INTAKE_INVALID", message: intakeValidation.errors.join(", ") };
    }
    if (project.quotationId && project.quotationId !== quotationId) {
      return { ok: false, errorCode: "QUOTATION_PROJECT_MISMATCH", message: "Project quotationId must match command quotationId" };
    }
    if (repositories.projectRepository.getById(project.id)) {
      return { ok: false, errorCode: "PROJECT_ID_EXISTS", message: "A project with this id already exists" };
    }
    const { baseline, executionLineItems } = commercialBaselineFromQuotation(quotation);
    const withQuote: Project = {
      ...project,
      quotationId,
      customerId: project.customerId || quotation.customerId || "",
      commercialBaseline: project.commercialBaseline ?? baseline,
      executionLineItems: project.executionLineItems?.length ? project.executionLineItems : executionLineItems,
    };
    repositories.projectRepository.add(withQuote);
    repositories.quotationRepository.update(quotation.id, { isConverted: true, convertedToProjectId: project.id });
    auditService.write(command, {
      action: "create",
      entityType: "Project",
      entityId: project.id,
      entityName: project.name,
    });
    return { ok: true, result: { projectId: project.id }, domainEvents: ["ProjectCreated"] };
  });

  commandBus.register<Command<CreateDirectProjectExceptionPayload>, { projectId: string }>(CREATE_DIRECT_PROJECT_EXCEPTION_COMMAND, (command) => {
    permissionService.assertCanPerformAction(command.actorRole, "project:create_direct_exception");

    const intakeValidation = projectKindService.validateIntake(command.payload.intake);
    if (!intakeValidation.ok) {
      return { ok: false, errorCode: "PROJECT_INTAKE_INVALID", message: intakeValidation.errors.join(", ") };
    }
    if (!command.payload.reason?.trim()) {
      return { ok: false, errorCode: "REASON_REQUIRED", message: "Direct project exception requires reason" };
    }

    const projectId = makeProjectId();
    const cid = command.payload.customerId || "";
    const { baseline, executionLineItems } =
      cid ?
        commercialBaselineFromIntake({
          projectId,
          contractAmount: Number(command.payload.intake.commercial.contractAmount || 0),
          summaryLine: `Direct exception — ${command.payload.projectName}`,
          customerId: cid,
        })
      : { baseline: undefined, executionLineItems: undefined };
    repositories.projectRepository.add({
      id: projectId,
      name: command.payload.projectName,
      type: "EPC",
      projectType: "Commercial",
      projectCategory: "solar",
      ownerType: "solo",
      lifecycleStatus: "Active",
      executionPhase: "Intake",
      status: "On Hold",
      progressStage: "exception_review",
      client: command.payload.intake.parties.customer || "Unknown",
      customerId: cid || "C001",
      capacity: "N/A",
      location: "Pending",
      assignees: [],
      onSite: 0,
      contractAmount: Number(command.payload.intake.commercial.contractAmount || 0),
      totalCost: 0,
      amountReceived: 0,
      photos: 0,
      startDate: new Date().toISOString().split("T")[0],
      endDate: null,
      createdAt: new Date().toISOString().split("T")[0],
      directCreationReason: command.payload.reason,
      commercialBaseline: baseline,
      executionLineItems,
    });

    auditService.write(command, {
      action: "create",
      entityType: "Project",
      entityId: projectId,
      entityName: command.payload.projectName,
      field: "directExceptionReason",
      newValue: command.payload.reason,
    });

    return {
      ok: true,
      result: { projectId },
      domainEvents: ["ProjectCreatedWithoutQuotation"],
    };
  });
};
