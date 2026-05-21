import type { INCGiverCompany } from "@/types/finance";
import type { Project } from "@/types/project";

/** Resolve INC work-source id from project scope, synthetic customer id, or project kind. */
export function resolveIncGiverCompanyIdForProject(
  project: Project,
  companies: INCGiverCompany[],
): string | undefined {
  const fromScope = project.scope?.incGiverCompanyId?.trim();
  if (fromScope) return fromScope;

  const customerId = project.customerId?.trim();
  if (customerId?.startsWith("inc-")) {
    const id = customerId.slice(4);
    if (companies.some((c) => c.id === id)) return id;
  }

  if (project.projectKind === "INC_GIVEN" || project.projectMode === "INC_GIVEN_TO_US") {
    return companies[0]?.id;
  }

  return undefined;
}

export function filterProjectsForIncGiverCompany(
  projects: Project[],
  companyId: string,
  companies: INCGiverCompany[],
): Project[] {
  const id = companyId.trim();
  return projects.filter((p) => resolveIncGiverCompanyIdForProject(p, companies) === id);
}

export function isIncGiverSyntheticCustomerId(customerId: string | undefined): boolean {
  return Boolean(customerId?.trim().startsWith("inc-"));
}
