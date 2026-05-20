/**
 * Pure helpers mirroring list-page filters for automated manual-smoke verification.
 */
import type { Project } from "@/types/project";
import type { Customer, Invoice } from "@/types/finance";
import { isProjectCompleted, isProjectOpen } from "@/lib/agingHelpers";
import { getCustomerKind, isCustomerArchived } from "@/lib/selectors";

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
  return projects.filter((p) => {
    if (p.lifecycleStatus === "Completed") return false;
    if (p.status === "Completed" || p.status === "Closed") return false;
    return (
      p.status === "Ongoing" ||
      p.lifecycleStatus === "Active" ||
      p.lifecycleStatus === "In Progress" ||
      p.lifecycleStatus === "On Hold"
    );
  });
}

export type CustomerKindFilter = "all" | "project" | "inventory" | "both" | "archived";

export function filterCustomersByKind(
  customers: Customer[],
  kindFilter: CustomerKindFilter,
): Customer[] {
  return customers.filter((c) => {
    const kind = getCustomerKind(c);
    if (kindFilter === "all") return true;
    if (kindFilter === "archived") return isCustomerArchived(c);
    return !isCustomerArchived(c) && (kind === kindFilter || kind === "both");
  });
}

export function canVoidInvoice(inv: Invoice): { ok: boolean; reason?: string } {
  if (inv.status === "voided") return { ok: false, reason: "already_voided" };
  if ((inv.amountReceived ?? 0) > 0) return { ok: false, reason: "has_payments" };
  return { ok: true };
}
