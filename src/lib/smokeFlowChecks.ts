/**
 * Pure helpers mirroring list-page filters for automated manual-smoke verification.
 */
import type { Project } from "@/types/project";
import type { Customer, Invoice } from "@/types/finance";
import { isActiveSiteProject } from "@/lib/activeSiteProjects";
import { isProjectCompleted, isProjectOpen } from "@/lib/agingHelpers";
import { filterCustomersForList, type CustomerKindFilter } from "@/lib/customerListFilters";
import { isCustomerArchived } from "@/lib/selectors";

export function sortProjectsOpenFirst(projects: Project[]): Project[] {
  const open = projects.filter(isProjectOpen);
  const completed = projects.filter(isProjectCompleted);
  return [...open, ...completed];
}

export function filterProjectsForList(
  projects: Project[],
  opts: { hideCompleted: boolean; includeArchived?: boolean },
): Project[] {
  const includeArchived = opts.includeArchived ?? false;
  const archiveFiltered = includeArchived ? projects : projects.filter((p) => !p.archivedAt);
  const base = opts.hideCompleted ? archiveFiltered.filter(isProjectOpen) : archiveFiltered;
  return sortProjectsOpenFirst(base);
}

export function completedDividerIndex(projects: Project[], hideCompleted: boolean): number {
  if (hideCompleted) return -1;
  const idx = projects.findIndex(isProjectCompleted);
  return idx > 0 ? idx : -1;
}

export function filterActiveSiteProjects(projects: Project[]): Project[] {
  return projects.filter((p) => isActiveSiteProject(p));
}

export type { CustomerKindFilter } from "@/lib/customerListFilters";

/** @deprecated Use filterCustomersForList — kept for smoke tests. */
export function filterCustomersByKind(
  customers: Customer[],
  kindFilter: CustomerKindFilter | "archived",
): Customer[] {
  if (kindFilter === "archived") {
    return filterCustomersForList(customers, { showArchived: true });
  }
  return filterCustomersForList(customers, { kindFilter });
}

export function canVoidInvoice(inv: Invoice): { ok: boolean; reason?: string } {
  if (inv.status === "voided") return { ok: false, reason: "already_voided" };
  if ((inv.amountReceived ?? 0) > 0) return { ok: false, reason: "has_payments" };
  return { ok: true };
}
