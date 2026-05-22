import type { CommandBus } from "@/application/commands/CommandBus";
import type { Command } from "@/application/commands/types";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import type { PermissionService } from "@/application/services/PermissionService";
import { assertCommandPermission } from "@/application/commands/commandPermission";
import type { AuditService } from "@/application/services/AuditService";
import { ProjectKindService, type ProjectIntakePayload } from "@/application/services/ProjectKindService";
import { buildProjectShellFromDirectException } from "@/domain/project/buildProjectShellFromDirectException";
import { buildProjectShellFromQuotation } from "@/domain/project/buildProjectShellFromQuotation";
import { commercialBaselineFromIntake, commercialBaselineFromQuotation } from "@/domain/project/commercialBaseline";
import { withResolvedExecutionLineItems } from "@/domain/project/executionLineItems";
import { isProjectPaymentType } from "@/domain/project/projectPaymentType";
import {
  ProjectInvariantService,
  type ProjectCreateInvariantInput,
  type ProjectInvariantValidationResult,
} from "@/domain/project/ProjectInvariantService";
import { projectKindConfigSnapshot } from "@/lib/projectNormalize";
import type { ExecutionLineItem, Project } from "@/types/project";
import { freezeProjectClientFieldsFromQuotation } from "@/lib/customerPipelineIdentity";
import { rejectSecondProjectFromQuotation } from "@/lib/quotationProjectConversionPolicy";
import { buildQuotationProjectLinkPatch } from "@/lib/quotationProjectLink";
import { ensureProjectPartnerEconomics } from "@/lib/projectPartnerEconomics";
import { convertLinkedEnquiryAfterProjectFromQuotation } from "@/lib/enquiryConversionAtProjectWin";

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

const makeProjectId = () =>
  `P-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();

const projectInvariantService = new ProjectInvariantService();

type CommandReject = { ok: false; errorCode: string; message: string };

function rejectInvalidIntakePaymentType(intake: ProjectIntakePayload): CommandReject | null {
  const raw = intake.commercial?.paymentType;
  if (raw === undefined || raw === null || raw === "") {
    return null;
  }
  if (!isProjectPaymentType(raw)) {
    return {
      ok: false,
      errorCode: "PROJECT_PAYMENT_TYPE_INVALID",
      message: `Invalid payment type "${String(raw)}". Must be cash, loan, or cash-and-loan.`,
    };
  }
  return null;
}

function rejectInvalidProjectPaymentType(project: Project | undefined): CommandReject | null {
  if (!project?.paymentType) {
    return null;
  }
  if (!isProjectPaymentType(project.paymentType)) {
    return {
      ok: false,
      errorCode: "PROJECT_PAYMENT_TYPE_INVALID",
      message: `Invalid payment type "${String(project.paymentType)}". Must be cash, loan, or cash-and-loan.`,
    };
  }
  return null;
}

function rejectProjectCreateInvariants(
  input: ProjectCreateInvariantInput,
): ProjectInvariantValidationResult | null {
  const check = projectInvariantService.validateProjectCreate(input);
  return check.ok ? null : check;
}

export const registerProjectCommands = (
  commandBus: CommandBus,
  repositories: AppRepositoryContext,
  permissionService: PermissionService,
  auditService: AuditService,
): void => {
  const projectKindService = new ProjectKindService();

  commandBus.register<Command<CreateProjectFromQuotationPayload>, { projectId: string }>(CREATE_PROJECT_FROM_QUOTATION_COMMAND, (command) => {
    assertCommandPermission(permissionService, command, "project:create_from_quote");

    const intakePaymentReject = rejectInvalidIntakePaymentType(command.payload.intake);
    if (intakePaymentReject) {
      return intakePaymentReject;
    }

    const quotation = repositories.quotationRepository.getById(command.payload.quotationId);
    if (!quotation) {
      return { ok: false, errorCode: "QUOTATION_NOT_FOUND", message: "Quotation not found" };
    }
    const convertReject = rejectSecondProjectFromQuotation(quotation);
    if (!convertReject.ok) {
      return {
        ok: false,
        errorCode: convertReject.code,
        message: convertReject.message,
      };
    }
    if (quotation.status !== "approved") {
      return { ok: false, errorCode: "QUOTATION_NOT_APPROVED", message: "Project can only be created from an approved quotation" };
    }

    const intakeValidation = projectKindService.validateIntake(command.payload.intake);
    if (!intakeValidation.ok) {
      return { ok: false, errorCode: "PROJECT_INTAKE_INVALID", message: intakeValidation.errors.join(", ") };
    }

    if (command.payload.project) {
      const createInvariant = rejectProjectCreateInvariants({
        project: command.payload.project,
        quotationId: command.payload.quotationId,
      });
      if (createInvariant) {
        return createInvariant;
      }
      const p = command.payload.project;
      const projectPaymentReject = rejectInvalidProjectPaymentType(p);
      if (projectPaymentReject) {
        return projectPaymentReject;
      }
      if (p.quotationId !== command.payload.quotationId) {
        return { ok: false, errorCode: "QUOTATION_PROJECT_MISMATCH", message: "Project quotationId must match command quotationId" };
      }
      if (repositories.projectRepository.getById(p.id)) {
        return { ok: false, errorCode: "PROJECT_ID_EXISTS", message: "A project with this id already exists" };
      }
      const { baseline, executionLineItems } = commercialBaselineFromQuotation(quotation);
      repositories.projectRepository.add(
        withResolvedExecutionLineItems(
          ensureProjectPartnerEconomics(
            {
              ...freezeProjectClientFieldsFromQuotation(p, quotation),
              commercialBaseline: p.commercialBaseline ?? baseline,
              executionLineItems: p.executionLineItems?.length ? p.executionLineItems : executionLineItems,
            },
            { intake: command.payload.intake },
          ),
        ),
      );
      repositories.quotationRepository.update(quotation.id, buildQuotationProjectLinkPatch(p.id));
      auditService.write(command, {
        action: "create",
        entityType: "Project",
        entityId: p.id,
        entityName: p.name,
      });
      convertLinkedEnquiryAfterProjectFromQuotation(repositories, auditService, command, {
        ...quotation,
        ...buildQuotationProjectLinkPatch(p.id),
      });
      return {
        ok: true,
        result: { projectId: p.id },
        domainEvents: ["ProjectCreated"],
      };
    }

    const projectId = makeProjectId();
    const built = buildProjectShellFromQuotation({
      quotation,
      intake: command.payload.intake,
      projectName: command.payload.projectName,
      projectId,
    });
    if (!built.ok) {
      return {
        ok: false,
        errorCode: built.errorCode,
        message: built.message,
      };
    }

    const shellInvariant = rejectProjectCreateInvariants({
      project: built.project,
      quotationId: command.payload.quotationId,
    });
    if (shellInvariant) {
      return shellInvariant;
    }

    const { baseline, executionLineItems } = commercialBaselineFromQuotation(quotation);
    repositories.projectRepository.add(
      withResolvedExecutionLineItems(
        ensureProjectPartnerEconomics(
          {
            ...freezeProjectClientFieldsFromQuotation(built.project, quotation),
            commercialBaseline: baseline,
            executionLineItems,
          },
          { intake: command.payload.intake },
        ),
      ),
    );

    repositories.quotationRepository.update(quotation.id, buildQuotationProjectLinkPatch(projectId));
    auditService.write(command, {
      action: "create",
      entityType: "Project",
      entityId: projectId,
      entityName: command.payload.projectName,
    });
    convertLinkedEnquiryAfterProjectFromQuotation(repositories, auditService, command, {
      ...quotation,
      ...buildQuotationProjectLinkPatch(projectId),
    });

    return {
      ok: true,
      result: { projectId },
      domainEvents: ["ProjectCreated"],
    };
  });

  commandBus.register<Command<CreateProjectIntakePayload>, { projectId: string }>(CREATE_PROJECT_INTAKE_COMMAND, (command) => {
    assertCommandPermission(permissionService, command, "project:create_from_quote");
    const { project, intake, quotationId } = command.payload;

    const intakePaymentReject = rejectInvalidIntakePaymentType(intake);
    if (intakePaymentReject) {
      return intakePaymentReject;
    }
    const projectPaymentReject = rejectInvalidProjectPaymentType(project);
    if (projectPaymentReject) {
      return projectPaymentReject;
    }

    const createInvariant = rejectProjectCreateInvariants({ project, quotationId });
    if (createInvariant) {
      return createInvariant;
    }

    if (!quotationId) {
      const intakeValidation = projectKindService.validateIntake(intake);
      if (!intakeValidation.ok) {
        return { ok: false, errorCode: "PROJECT_INTAKE_INVALID", message: intakeValidation.errors.join(", ") };
      }
      if (repositories.projectRepository.getById(project.id)) {
        return { ok: false, errorCode: "PROJECT_ID_EXISTS", message: "A project with this id already exists" };
      }
      let toAdd: Project = project;
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
      repositories.projectRepository.add(
        withResolvedExecutionLineItems(
          ensureProjectPartnerEconomics(toAdd, { intake }),
        ),
      );
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
    const convertReject = rejectSecondProjectFromQuotation(quotation);
    if (!convertReject.ok) {
      return {
        ok: false,
        errorCode: convertReject.code,
        message: convertReject.message,
      };
    }
    if (quotation.status !== "approved") {
      return { ok: false, errorCode: "QUOTATION_NOT_APPROVED", message: "Project can only be created from an approved quotation" };
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
    repositories.projectRepository.add(
      withResolvedExecutionLineItems(
        ensureProjectPartnerEconomics(withQuote, { intake }),
      ),
    );
    repositories.quotationRepository.update(quotation.id, buildQuotationProjectLinkPatch(project.id));
    auditService.write(command, {
      action: "create",
      entityType: "Project",
      entityId: project.id,
      entityName: project.name,
    });
    convertLinkedEnquiryAfterProjectFromQuotation(repositories, auditService, command, {
      ...quotation,
      ...buildQuotationProjectLinkPatch(project.id),
    });
    return { ok: true, result: { projectId: project.id }, domainEvents: ["ProjectCreated"] };
  });

  commandBus.register<Command<CreateDirectProjectExceptionPayload>, { projectId: string }>(CREATE_DIRECT_PROJECT_EXCEPTION_COMMAND, (command) => {
    assertCommandPermission(permissionService, command, "project:create_direct_exception");

    const intakePaymentReject = rejectInvalidIntakePaymentType(command.payload.intake);
    if (intakePaymentReject) {
      return intakePaymentReject;
    }

    const intakeValidation = projectKindService.validateIntake(command.payload.intake);
    if (!intakeValidation.ok) {
      return { ok: false, errorCode: "PROJECT_INTAKE_INVALID", message: intakeValidation.errors.join(", ") };
    }

    const createInvariant = rejectProjectCreateInvariants({
      directExceptionReason: command.payload.reason,
    });
    if (createInvariant) {
      return createInvariant;
    }

    const projectId = makeProjectId();
    const intake = command.payload.intake;
    const cid = command.payload.customerId?.trim() || "";

    const built = buildProjectShellFromDirectException({
      intake,
      projectName: command.payload.projectName,
      projectId,
      reason: command.payload.reason,
      customerId: cid,
    });
    if (!built.ok) {
      return {
        ok: false,
        errorCode: built.errorCode,
        message: built.message,
      };
    }

    const shellInvariant = rejectProjectCreateInvariants({
      project: built.project,
      directExceptionReason: command.payload.reason,
    });
    if (shellInvariant) {
      return shellInvariant;
    }

    const contractAmt = built.project.contractAmount ?? 0;
    const { baseline, executionLineItems } = cid
      ? commercialBaselineFromIntake({
          projectId,
          contractAmount: contractAmt,
          summaryLine: `Direct exception — ${command.payload.projectName}`,
          customerId: cid,
        })
      : { baseline: undefined, executionLineItems: [] as ExecutionLineItem[] };

    repositories.projectRepository.add(
      withResolvedExecutionLineItems({
        ...built.project,
        commercialBaseline: baseline,
        executionLineItems: executionLineItems ?? [],
      }),
    );

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
