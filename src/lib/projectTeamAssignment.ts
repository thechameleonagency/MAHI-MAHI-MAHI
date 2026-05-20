import type { Project } from "@/types/project";

/** Captured on project confirmation — primary assignee + optional target end date. */
export type ProjectTeamAssignmentDraft = {
  primaryAssigneeId?: string;
  targetEndDate?: string;
};

export function projectNeedsTeamAssignment(project: Pick<Project, "assignees">): boolean {
  return (project.assignees?.length ?? 0) === 0;
}

/** Apply confirmation-step team fields onto a project shell before persist. */
export function applyTeamAssignmentToProject(
  project: Project,
  draft: ProjectTeamAssignmentDraft,
): Project {
  const assignees = draft.primaryAssigneeId?.trim() ? [draft.primaryAssigneeId.trim()] : [];
  const endDate = draft.targetEndDate?.trim() || null;
  return {
    ...project,
    assignees,
    endDate,
  };
}

export type ProjectConfirmationViewModel = {
  name: string;
  type: "EPC" | "INC";
  projectType: string;
  ownerType: "solo" | "partnership" | "outsourced";
  client: string;
  location: string;
  capacity: string;
  contractAmount: number;
  referredBy?: string;
  quotationId?: string;
  quotationNumber?: string;
};

export function buildProjectConfirmationData(
  project: Project,
  opts?: { quotationNumber?: string },
): ProjectConfirmationViewModel {
  return {
    name: project.name,
    type: project.type === "INC" ? "INC" : "EPC",
    projectType: project.projectType,
    ownerType: project.ownerType ?? "solo",
    client: project.client,
    location: project.location || project.clientAddress || "—",
    capacity: project.capacity,
    contractAmount: project.contractAmount,
    referredBy: project.agentName,
    quotationId: project.quotationId,
    quotationNumber: opts?.quotationNumber,
  };
}
