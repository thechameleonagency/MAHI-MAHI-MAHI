import type { Project } from "@/types/project";

/** Resolve subcontractor id from project outsource attachment. */
export function resolveSubcontractorIdForProject(project: Project): string | undefined {
  return project.outsource?.partyId?.trim() || undefined;
}

export function filterProjectsForSubcontractor(projects: Project[], subcontractorId: string): Project[] {
  const id = subcontractorId.trim();
  return projects.filter((p) => resolveSubcontractorIdForProject(p) === id);
}
